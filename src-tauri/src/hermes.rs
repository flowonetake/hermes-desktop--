use std::path::PathBuf;

use tokio::process::Command;
use tokio::sync::Mutex;

use once_cell::sync::Lazy;

use crate::utils;

static MANAGER: Lazy<HermesManager> = Lazy::new(|| HermesManager::new());

pub struct HermesManager {
    running: std::sync::atomic::AtomicBool,
    child: Mutex<Option<tokio::process::Child>>,
}

impl HermesManager {
    fn new() -> Self {
        Self {
            running: std::sync::atomic::AtomicBool::new(false),
            child: Mutex::new(None),
        }
    }

    fn hermes_binary() -> PathBuf {
        utils::get_hermes_path().join("hermes-agent")
    }

    fn hermes_cli() -> PathBuf {
        utils::get_hermes_path().join("hermes")
    }

    pub fn is_installed() -> bool {
        Self::hermes_binary().exists() || Self::hermes_cli().exists()
    }

    pub fn get_hermes_dir() -> PathBuf {
        utils::get_hermes_path()
    }
}

pub fn start_hermes(app: &tauri::AppHandle, config_dir: &str, port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let binary = HermesManager::hermes_binary();
    if !binary.exists() {
        return Err(format!("Hermes agent not found at {:?}", binary).into());
    }

    let _app = app.clone();
    let config_dir = config_dir.to_string();

    tauri::async_runtime::spawn(async move {
        match Command::new(&binary)
            .arg("--config-dir")
            .arg(&config_dir)
            .arg("--port")
            .arg(port.to_string())
            .arg("serve")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
        {
            Ok(child) => {
                let mut guard = MANAGER.child.lock().await;
                *guard = Some(child);
                MANAGER.running.store(true, std::sync::atomic::Ordering::SeqCst);
            }
            Err(e) => {
                log::error!("Failed to start hermes agent: {}", e);
            }
        }
    });

    Ok(())
}

pub fn stop_hermes(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let _app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut guard = MANAGER.child.lock().await;
        if let Some(ref mut child) = *guard {
            let _ = child.kill().await;
            let _ = child.wait().await;
        }
        *guard = None;
        MANAGER.running.store(false, std::sync::atomic::Ordering::SeqCst);
    });
    Ok(())
}

pub fn restart_hermes(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let config = crate::config::read_config_raw()?;
    let port = config.port.unwrap_or(8642);
    let config_dir = utils::get_hermes_path().to_string_lossy().to_string();

    stop_hermes(app)?;
    std::thread::sleep(std::time::Duration::from_millis(500));
    start_hermes(app, &config_dir, port)?;
    Ok(())
}

pub fn get_hermes_status(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    if MANAGER.running.load(std::sync::atomic::Ordering::SeqCst) {
        Ok("running".to_string())
    } else {
        Ok("stopped".to_string())
    }
}

pub fn is_hermes_installed(_app: &tauri::AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    Ok(HermesManager::is_installed())
}

pub fn get_hermes_version(app: &tauri::AppHandle) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let cli = HermesManager::hermes_cli();
    if !cli.exists() {
        return Ok(None);
    }
    let _app = app.clone();
    let result = tauri::async_runtime::block_on(async move {
        let output = Command::new(&cli)
            .arg("--version")
            .output()
            .await
            .ok()?;
        if output.status.success() {
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            None
        }
    });
    Ok(result)
}

pub async fn run_cli_command(args: &[&str]) -> Result<String, Box<dyn std::error::Error>> {
    let cli = HermesManager::hermes_cli();
    if !cli.exists() {
        return Err("Hermes CLI not found".into());
    }
    let output = Command::new(&cli).args(args).output().await?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Hermes CLI error: {}", stderr).into())
    }
}

pub async fn health_check() -> Result<bool, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let config = crate::config::read_config_raw()?;
    let host = config.host.as_deref().unwrap_or("127.0.0.1");
    let port = config.port.unwrap_or(8642);
    let resp = client
        .get(&format!("http://{}:{}/health", host, port))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await?;
    Ok(resp.status().is_success())
}
