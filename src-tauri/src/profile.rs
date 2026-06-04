use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub provider: String,
    pub model: String,
    pub created_at: String,
}

fn profiles_dir() -> PathBuf {
    utils::get_profiles_path()
}

fn profile_dir(name: &str) -> PathBuf {
    profiles_dir().join(name)
}

fn active_symlink() -> PathBuf {
    profiles_dir().join("active")
}

fn read_active_name() -> Option<String> {
    let active = active_symlink();
    if !active.exists() {
        return None;
    }
    #[cfg(unix)]
    {
        std::fs::read_link(&active).ok()?
            .file_name()?
            .to_str()
            .map(|s| s.to_string())
    }
    #[cfg(not(unix))]
    {
        std::fs::read_to_string(&active).ok().map(|s| s.trim().to_string())
    }
}

fn write_active_name(name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let active = active_symlink();
    let _ = std::fs::remove_file(&active);
    let _ = std::fs::remove_dir_all(&active);
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(profile_dir(name), &active)?;
    }
    #[cfg(not(unix))]
    {
        utils::write_string_to_file(&active, name)?;
    }
    Ok(())
}

pub fn list_profiles(_app: &tauri::AppHandle) -> Result<Vec<Profile>, Box<dyn std::error::Error>> {
    let dir = profiles_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
        return Ok(Vec::new());
    }
    let mut profiles = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() && entry.file_name() != "active" {
            let name = entry.file_name().to_string_lossy().to_string();
            let config_path = path.join("config.yaml");
            let (model, provider) = if config_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&config_path) {
                    if let Ok(cfg) = serde_yaml::from_str::<serde_json::Value>(&content) {
                        let m = cfg.get("model").and_then(|m| m.get("model")).and_then(|m| m.as_str()).unwrap_or("unknown").to_string();
                        let p = cfg.get("model").and_then(|m| m.get("provider")).and_then(|m| m.as_str()).unwrap_or("unknown").to_string();
                        (m, p)
                    } else { ("unknown".to_string(), "unknown".to_string()) }
                } else { ("unknown".to_string(), "unknown".to_string()) }
            } else { ("unknown".to_string(), "unknown".to_string()) };

            let created_at = utils::read_file_to_string(&path.join(".created_at"))
                .unwrap_or_else(|_| utils::now_iso8601());

            profiles.push(Profile { name, created_at, model, provider });
        }
    }
    profiles.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(profiles)
}

pub fn create_profile(_app: &tauri::AppHandle, name: &str) -> Result<Profile, Box<dyn std::error::Error>> {
    let sanitized: String = name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let dir = profile_dir(&sanitized);
    if dir.exists() {
        return Err(format!("Profile '{}' already exists", sanitized).into());
    }
    std::fs::create_dir_all(&dir)?;

    let now = utils::now_iso8601();
    let default_cfg = crate::config::HermesConfig::default();
    std::fs::write(dir.join("config.yaml"), serde_yaml::to_string(&default_cfg)?)?;
    std::fs::write(dir.join(".created_at"), &now)?;
    std::fs::write(dir.join("SOUL.md"), format!(
        "# SOUL.md - {}\n\n## Identity\nI am {}, a Hermes AI agent.\n\n## Purpose\nTo assist users efficiently.\n\n## Personality\nHelpful, concise, and professional.\n",
        sanitized, sanitized
    ))?;

    write_active_name(&sanitized)?;

    Ok(Profile {
        name: sanitized,
        created_at: now,
        model: default_cfg.model.as_ref().map(|m| m.model.clone()).unwrap_or_default(),
        provider: default_cfg.provider.as_ref().map(|p| p.name.clone()).unwrap_or_default(),
    })
}

pub fn delete_profile(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let dir = profile_dir(name);
    if !dir.exists() {
        return Err(format!("Profile '{}' not found", name).into());
    }
    if read_active_name().as_deref() == Some(name) {
        let _ = std::fs::remove_file(&active_symlink());
        let _ = std::fs::remove_dir_all(&active_symlink());
    }
    std::fs::remove_dir_all(&dir)?;
    Ok(())
}

pub fn switch_profile(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let dir = profile_dir(name);
    if !dir.exists() {
        return Err(format!("Profile '{}' not found", name).into());
    }
    write_active_name(name)?;
    Ok(())
}

pub fn get_active_profile(_app: &tauri::AppHandle) -> Result<Option<String>, Box<dyn std::error::Error>> {
    Ok(read_active_name())
}
