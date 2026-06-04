use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub version: String,
    pub os: String,
    pub hermes_installed: bool,
    pub active_profile: Option<String>,
    pub sessions_count: u32,
}

pub fn get_app_info(app: &tauri::AppHandle) -> Result<AppInfo, Box<dyn std::error::Error>> {
    let os = if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macos".to_string()
    } else if cfg!(target_os = "linux") {
        "linux".to_string()
    } else {
        "unknown".to_string()
    };

    let hermes_installed = crate::hermes::is_hermes_installed(app).unwrap_or(false);
    let active_profile = crate::profile::get_active_profile(app).unwrap_or(None);

    let sessions_count = match crate::session::get_session_count(app) {
        Ok(c) => c as u32,
        Err(_) => 0,
    };

    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        os,
        hermes_installed,
        active_profile,
        sessions_count,
    })
}

pub fn backup_data(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let hermes_dir = utils::get_hermes_path();
    let backup_dir = hermes_dir.join("backups");
    std::fs::create_dir_all(&backup_dir)?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("hermes_backup_{}", timestamp);
    let backup_path = backup_dir.join(&backup_name);
    std::fs::create_dir_all(&backup_path)?;

    // Copy config
    let config_path = hermes_dir.join("config.yaml");
    if config_path.exists() {
        std::fs::copy(&config_path, backup_path.join("config.yaml"))?;
    }

    // Copy env
    let env_path = hermes_dir.join(".env");
    if env_path.exists() {
        std::fs::copy(&env_path, backup_path.join(".env"))?;
    }

    // Copy state db
    let db_path = hermes_dir.join("state.db");
    if db_path.exists() {
        std::fs::copy(&db_path, backup_path.join("state.db"))?;
    }

    // Copy profiles
    let profiles_dir = hermes_dir.join("profiles");
    if profiles_dir.exists() {
        copy_dir_recursive(&profiles_dir, &backup_path.join("profiles"))?;
    }

    // Copy other data files
    for filename in &["models.json", "memory.json", "memory_providers.json", "tools.json", "skills.json", "cron_jobs.json", "gateways.json", "kanban.json"] {
        let src = hermes_dir.join(filename);
        if src.exists() {
            std::fs::copy(&src, backup_path.join(filename))?;
        }
    }

    Ok(backup_path.to_string_lossy().to_string())
}

pub fn import_data(_app: &tauri::AppHandle, backup_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let backup_path = PathBuf::from(backup_path);
    if !backup_path.exists() {
        return Err(format!("Backup path '{}' does not exist", backup_path.display()).into());
    }

    let hermes_dir = utils::get_hermes_path();

    let files = ["config.yaml", ".env", "state.db", "models.json", "memory.json", "tools.json", "skills.json", "cron_jobs.json", "gateways.json", "kanban.json"];
    for file in &files {
        let src = backup_path.join(file);
        if src.exists() {
            std::fs::copy(&src, hermes_dir.join(file))?;
        }
    }

    let profiles_src = backup_path.join("profiles");
    if profiles_src.exists() {
        let profiles_dst = hermes_dir.join("profiles");
        if profiles_dst.exists() {
            std::fs::remove_dir_all(&profiles_dst)?;
        }
        copy_dir_recursive(&profiles_src, &profiles_dst)?;
    }

    Ok(())
}

pub fn open_logs(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = utils::get_hermes_path().join("logs");
    std::fs::create_dir_all(&log_dir)?;

    if cfg!(target_os = "windows") {
        std::process::Command::new("explorer")
            .arg(&log_dir)
            .spawn()?;
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open")
            .arg(&log_dir)
            .spawn()?;
    } else {
        std::process::Command::new("xdg-open")
            .arg(&log_dir)
            .spawn()?;
    }

    Ok(())
}

pub fn check_update(_app: &tauri::AppHandle) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let result = tauri::async_runtime::block_on(async {
        let client = reqwest::Client::new();
        match client.get("https://api.github.com/repos/fathah/hermes-desktop/releases/latest")
            .header("User-Agent", "hermes-desktop")
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => {
                        let latest = json["tag_name"].as_str().unwrap_or("").to_string();
                        let current = env!("CARGO_PKG_VERSION");
                        if latest.trim_start_matches('v') != current {
                            Ok(Some(latest))
                        } else {
                            Ok(None)
                        }
                    }
                    Err(_) => Ok(None),
                }
            }
            _ => Ok(None),
        }
    });
    result
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let entry_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if entry_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}
