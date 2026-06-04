use serde::{Deserialize, Serialize};
use tokio::process::Command;

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyStatus {
    pub git_installed: bool,
    pub uv_installed: bool,
    pub python_installed: bool,
    pub python_version: Option<String>,
    pub wsl_available: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstallStage {
    CheckingDependencies,
    Downloading,
    InstallingAgent,
    SettingUpEnvironment,
    Configuring,
    Complete,
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgress {
    pub stage: InstallStage,
    pub message: String,
    pub progress_pct: u8,
}

pub struct HermesInstaller;

impl HermesInstaller {
    async fn check_command(cmd: &str, args: &[&str]) -> bool {
        Command::new(cmd).args(args).output().await.map(|o| o.status.success()).unwrap_or(false)
    }

    async fn check_python() -> (bool, Option<String>) {
        for cmd in &["python3", "python"] {
            if let Ok(output) = Command::new(cmd).args(&["--version"]).output().await {
                if output.status.success() {
                    let v = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    let v = v.trim_start_matches("Python ").to_string();
                    let parts: Vec<&str> = v.split('.').collect();
                    if parts.len() >= 2 && parts[0].parse::<u32>().unwrap_or(0) >= 3 {
                        return (true, Some(v));
                    }
                    return (true, Some(v));
                }
            }
        }
        (false, None)
    }
}

pub fn check_dependencies(_app: &tauri::AppHandle) -> Result<DependencyStatus, Box<dyn std::error::Error>> {
    let result = tauri::async_runtime::block_on(async {
        let git = HermesInstaller::check_command("git", &["--version"]).await;
        let uv = HermesInstaller::check_command("uv", &["--version"]).await;
        let (py, pyv) = HermesInstaller::check_python().await;

        let wsl = if cfg!(target_os = "windows") {
            HermesInstaller::check_command("wsl", &["--status"]).await
        } else {
            false
        };

        DependencyStatus {
            git_installed: git,
            uv_installed: uv,
            python_installed: py,
            python_version: pyv,
            wsl_available: if cfg!(target_os = "windows") { Some(wsl) } else { None },
        }
    });
    Ok(result)
}

pub fn install_hermes(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let hermes_dir = utils::get_hermes_path();

    tauri::async_runtime::block_on(async {
        std::fs::create_dir_all(&hermes_dir)?;

        let install_script_url = "https://raw.githubusercontent.com/fathah/hermes/main/install.sh";
        let install_script_path = hermes_dir.join("install.sh");

        let client = reqwest::Client::new();
        let response = client.get(install_script_url)
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err::<String, Box<dyn std::error::Error>>(
                format!("Failed to download install script: HTTP {}", response.status()).into()
            );
        }

        let script_content = response.text().await?;
        std::fs::write(&install_script_path, &script_content)?;

        let output = Command::new("bash")
            .arg(&install_script_path)
            .arg("--target-dir")
            .arg(&hermes_dir)
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Installation failed: {}", stderr).into());
        }

        let env_path = hermes_dir.join(".env");
        if !env_path.exists() {
            std::fs::write(&env_path, "# Hermes Environment Configuration\n")?;
        }

        let default_config = crate::config::HermesConfig::default();
        let config_yaml = serde_yaml::to_string(&default_config)?;
        std::fs::write(hermes_dir.join("config.yaml"), config_yaml)?;

        std::fs::create_dir_all(hermes_dir.join("profiles"))?;
        let _ = std::fs::remove_file(&install_script_path);

        Ok::<String, Box<dyn std::error::Error>>("Hermes agent installed successfully".to_string())
    })
}

pub fn get_install_status(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let hermes_dir = utils::get_hermes_path();
    if !hermes_dir.exists() {
        return Ok("not_installed".to_string());
    }
    let has_binary = hermes_dir.join("hermes-agent").exists();
    let has_config = hermes_dir.join("config.yaml").exists();
    if has_binary && has_config {
        Ok("installed".to_string())
    } else if has_binary || has_config {
        Ok("partial".to_string())
    } else {
        Ok("not_installed".to_string())
    }
}

pub async fn is_wsl_available() -> bool {
    if cfg!(target_os = "windows") {
        Command::new("wsl")
            .args(&["--status"])
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        false
    }
}
