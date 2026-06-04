
use tokio::process::Command;
use tokio::sync::Mutex;

use once_cell::sync::Lazy;

static MANAGER: Lazy<SshManager> = Lazy::new(|| SshManager::new());

pub struct SshManager {
    connected: Mutex<bool>,
    tunnel_process: Mutex<Option<tokio::process::Child>>,
    current_host: Mutex<Option<String>>,
}

impl SshManager {
    fn new() -> Self {
        Self {
            connected: Mutex::new(false),
            tunnel_process: Mutex::new(None),
            current_host: Mutex::new(None),
        }
    }
}

pub fn connect(app: &tauri::AppHandle, config_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let _cfg: serde_json::Value = serde_json::from_str(config_json)?;
    let _app = app.clone();
    let config_json = config_json.to_string();

    tauri::async_runtime::spawn(async move {
        if let Ok(cfg) = serde_json::from_str::<SshConfig>(&config_json) {
            let mut connected = MANAGER.connected.lock().await;
            let mut host = MANAGER.current_host.lock().await;
            *connected = true;
            *host = Some(format!("{}@{}:{}", cfg.username, cfg.host, cfg.port));
        }
    });

    Ok(())
}

pub fn disconnect(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let _app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut tunnel = MANAGER.tunnel_process.lock().await;
        if let Some(ref mut child) = *tunnel {
            let _ = child.kill().await;
            let _ = child.wait().await;
        }
        *tunnel = None;
        let mut connected = MANAGER.connected.lock().await;
        *connected = false;
        let mut host = MANAGER.current_host.lock().await;
        *host = None;
    });
    Ok(())
}

pub fn is_connected(app: &tauri::AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    let _app = app.clone();
    let result = tauri::async_runtime::block_on(async move {
        *MANAGER.connected.lock().await
    });
    Ok(result)
}

pub fn execute(app: &tauri::AppHandle, command: &str) -> Result<String, Box<dyn std::error::Error>> {
    let _app = app.clone();
    let command = command.to_string();

    let result = tauri::async_runtime::block_on(async move {
        let host = MANAGER.current_host.lock().await;
        let host_str = host.clone().ok_or_else(|| "Not connected to any host".to_string())?;

        let ssh_cmd = if cfg!(target_os = "windows") {
            format!("ssh {} {}", host_str, command)
        } else {
            format!("ssh {} '{}'", host_str, command.replace('\'', "'\\''"))
        };

        let output = if cfg!(target_os = "windows") {
            Command::new("cmd").args(&["/C", &ssh_cmd]).output().await
                .map_err(|e| e.to_string())?
        } else {
            Command::new("sh").args(&["-c", &ssh_cmd]).output().await
                .map_err(|e| e.to_string())?
        };

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("SSH command failed: {}", stderr))
        }
    });

    result.map_err(|e: String| e.into())
}

pub async fn tunnel_forward(remote_port: u16, local_port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let config = crate::config::read_config_raw()?;
    let ssh_config = config.ssh.ok_or("SSH not configured")?;

    let host = ssh_config.host.ok_or("SSH host not configured")?;
    let port = ssh_config.port.unwrap_or(22);
    let username = ssh_config.username.ok_or("SSH username not configured")?;
    let key_path = ssh_config.key_path;

    let mut cmd = Command::new("ssh");
    cmd.arg("-N")
        .arg("-L")
        .arg(format!("127.0.0.1:{}:127.0.0.1:{}", local_port, remote_port))
        .arg("-p").arg(port.to_string());
    if let Some(ref key) = key_path { cmd.arg("-i").arg(key); }
    cmd.arg(format!("{}@{}", username, host));
    cmd.stdout(std::process::Stdio::null());
    cmd.stderr(std::process::Stdio::null());

    let child = cmd.spawn()?;
    let mut tunnel = MANAGER.tunnel_process.lock().await;
    *tunnel = Some(child);
    Ok(())
}

pub async fn test_connection(config_json: &str) -> Result<bool, Box<dyn std::error::Error>> {
    let cfg: SshConfig = serde_json::from_str(config_json)?;

    let mut args = vec![
        "-p".to_string(), cfg.port.to_string(),
        "-o".to_string(), "ConnectTimeout=5".to_string(),
        "-o".to_string(), "StrictHostKeyChecking=no".to_string(),
        format!("{}@{}", cfg.username, cfg.host),
        "echo connected".to_string(),
    ];
    if let Some(ref key) = cfg.key_path {
        args.splice(2..2, vec!["-i".to_string(), key.clone()]);
    }

    let output = Command::new("ssh").args(&args).output().await?;
    Ok(output.status.success())
}

pub async fn list_tunnels() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd").args(&["/C", "netstat -ano | findstr :8642"]).output().await?
    } else {
        Command::new("sh").args(&["-c", "ss -tlnp | grep ssh"]).output().await?
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.lines().map(|l| l.to_string()).collect())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SshConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub key_path: Option<String>,
    pub password: Option<String>,
}
