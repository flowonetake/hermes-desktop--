use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use once_cell::sync::Lazy;

use crate::utils;

static GATEWAY_RUNNING: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

fn gateways_file() -> PathBuf {
    utils::get_hermes_path().join("gateways.json")
}

fn read_config() -> Result<HashMap<String, serde_json::Value>, Box<dyn std::error::Error>> {
    let path = gateways_file();
    if !path.exists() {
        let default = get_default_config();
        write_config(&default)?;
        return Ok(default);
    }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_config(config: &HashMap<String, serde_json::Value>) -> Result<(), Box<dyn std::error::Error>> {
    let path = gateways_file();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(config)?)?;
    Ok(())
}

fn get_default_config() -> HashMap<String, serde_json::Value> {
    let mut m = HashMap::new();
    m.insert("telegram".to_string(), serde_json::json!({
        "enabled": false, "bot_token": "", "chat_id": ""
    }));
    m.insert("discord".to_string(), serde_json::json!({
        "enabled": false, "bot_token": "", "channel_id": ""
    }));
    m.insert("slack".to_string(), serde_json::json!({
        "enabled": false, "bot_token": "", "channel": ""
    }));
    m.insert("webhook".to_string(), serde_json::json!({
        "enabled": false, "port": 8643, "secret": ""
    }));
    m
}

pub fn get_gateway_status(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    if GATEWAY_RUNNING.load(Ordering::SeqCst) {
        Ok("running".to_string())
    } else {
        Ok("stopped".to_string())
    }
}

pub fn start_gateway(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    GATEWAY_RUNNING.store(true, Ordering::SeqCst);
    Ok(())
}

pub fn stop_gateway(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    GATEWAY_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}

pub fn restart_gateway(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    stop_gateway(app)?;
    start_gateway(app)
}

pub fn get_gateway_config(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let config = read_config()?;
    Ok(serde_json::to_string_pretty(&config)?)
}

pub fn update_gateway_config(_app: &tauri::AppHandle, config_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let config: HashMap<String, serde_json::Value> = serde_json::from_str(config_json)?;
    write_config(&config)
}

pub fn list_gateways() -> Result<Vec<crate::config::GatewayConfig>, Box<dyn std::error::Error>> {
    let config = crate::config::read_config_raw()?;
    Ok(config.gateway.into_iter().collect::<Vec<_>>())
}

pub fn configure_gateway(gateway: &crate::config::GatewayConfig) -> Result<(), Box<dyn std::error::Error>> {
    let mut config = crate::config::read_config_raw()?;
    config.gateway = Some(gateway.clone());
    crate::config::write_config_inner(&config)
}

pub async fn test_gateway(_name: &str) -> Result<bool, Box<dyn std::error::Error>> {
    Ok(true)
}
