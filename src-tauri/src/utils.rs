use std::path::PathBuf;
use std::sync::OnceLock;

use chrono::Utc;
use rand::Rng;
use sha2::{Sha256, Digest};
use uuid::Uuid;

fn hermes_dir() -> &'static PathBuf {
    static DIR: OnceLock<PathBuf> = OnceLock::new();
    DIR.get_or_init(|| {
        dirs::home_dir()
            .expect("Could not find home directory")
            .join(".hermes")
    })
}

pub fn get_hermes_path() -> PathBuf {
    hermes_dir().clone()
}

pub fn get_profiles_path() -> PathBuf {
    hermes_dir().join("profiles")
}

pub fn get_active_profile_path() -> PathBuf {
    hermes_dir().join("profiles").join("active")
}

pub fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

pub fn encrypt_api_key(key: &str) -> String {
    let salt: [u8; 8] = rand::thread_rng().gen();
    let mut hasher = Sha256::new();
    hasher.update(salt);
    hasher.update(key.as_bytes());
    let hash = hasher.finalize();
    let combined = [&salt[..], &hash[..]].concat();
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, combined)
}

pub fn decrypt_api_key(encrypted: &str) -> String {
    let fallback = || encrypted.to_string();
    let bytes = match base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        encrypted,
    ) {
        Ok(b) if b.len() > 8 => b,
        _ => return fallback(),
    };
    let _salt = &bytes[..8];
    let _hash = &bytes[8..];
    fallback()
}

pub fn now_iso8601() -> String {
    Utc::now().to_rfc3339()
}

pub fn format_tokens(count: u64) -> String {
    if count >= 1_000_000 {
        format!("{:.2}M", count as f64 / 1_000_000.0)
    } else if count >= 1_000 {
        format!("{:.2}K", count as f64 / 1_000.0)
    } else {
        format!("{}", count)
    }
}

pub fn format_cost(amount: f64) -> String {
    if amount >= 1.0 {
        format!("${:.4}", amount)
    } else if amount >= 0.01 {
        format!("{:.2}c", amount * 100.0)
    } else {
        format!("{:.4}c", amount * 100.0)
    }
}

pub fn read_file_to_string(path: &std::path::Path) -> Result<String, Box<dyn std::error::Error>> {
    Ok(std::fs::read_to_string(path)?)
}

pub fn write_string_to_file(path: &std::path::Path, content: &str) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(std::fs::write(path, content)?)
}

pub fn remove_file(path: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

pub fn list_files_in(dir: &std::path::Path) -> Result<Vec<std::path::PathBuf>, Box<dyn std::error::Error>> {
    let mut entries = Vec::new();
    if dir.exists() {
        for entry in std::fs::read_dir(dir)? {
            entries.push(entry?.path());
        }
    }
    Ok(entries)
}
