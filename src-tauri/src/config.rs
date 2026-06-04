use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

const CONFIG_FILE: &str = "config.yaml";
const ENV_FILE: &str = ".env";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub models: Option<Vec<String>>,
    pub default_model: Option<String>,
    pub extra_params: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelSettings {
    pub provider: String,
    pub model: String,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub top_p: Option<f64>,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileDefaults {
    pub name: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryConfig {
    pub enabled: bool,
    pub provider: Option<String>,
    pub max_entries: Option<u32>,
    pub vector_store_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub enabled: bool,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub auth_type: Option<String>,
    pub key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolsConfig {
    pub enabled_tools: Option<Vec<String>>,
    pub allow_code_execution: Option<bool>,
    pub sandbox: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronConfig {
    pub enabled: bool,
    pub jobs_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayConfig {
    pub enabled: bool,
    #[serde(rename = "type")]
    pub gateway_type: Option<String>,
    pub webhook_port: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KanbanConfig {
    pub enabled: bool,
    pub board_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HermesConfig {
    pub version: Option<String>,
    pub debug: Option<bool>,
    pub port: Option<u16>,
    pub host: Option<String>,
    pub provider: Option<ProviderConfig>,
    pub model: Option<ModelSettings>,
    pub profile: Option<ProfileDefaults>,
    pub memory: Option<MemoryConfig>,
    pub ssh: Option<SshConfig>,
    pub tools: Option<ToolsConfig>,
    pub cron: Option<CronConfig>,
    pub gateway: Option<GatewayConfig>,
    pub kanban: Option<KanbanConfig>,
    pub api_keys: Option<HashMap<String, String>>,
    pub extra: Option<HashMap<String, serde_json::Value>>,
}

impl Default for HermesConfig {
    fn default() -> Self {
        Self {
            version: Some("1.0".to_string()),
            debug: Some(false),
            port: Some(8642),
            host: Some("127.0.0.1".to_string()),
            provider: Some(ProviderConfig {
                name: "openai".to_string(),
                api_key: None,
                base_url: None,
                models: None,
                default_model: Some("gpt-4o".to_string()),
                extra_params: None,
            }),
            model: Some(ModelSettings {
                provider: "openai".to_string(),
                model: "gpt-4o".to_string(),
                temperature: Some(0.7),
                max_tokens: Some(4096),
                top_p: Some(1.0),
                stream: Some(true),
            }),
            profile: Some(ProfileDefaults { name: None, model: None, provider: None }),
            memory: Some(MemoryConfig { enabled: true, provider: Some("local".to_string()), max_entries: Some(1000), vector_store_path: None }),
            ssh: Some(SshConfig { enabled: false, host: None, port: Some(22), username: None, auth_type: Some("key".to_string()), key_path: None }),
            tools: Some(ToolsConfig { enabled_tools: None, allow_code_execution: Some(false), sandbox: Some(true) }),
            cron: Some(CronConfig { enabled: false, jobs_path: None }),
            gateway: Some(GatewayConfig { enabled: false, gateway_type: None, webhook_port: Some(8643) }),
            kanban: Some(KanbanConfig { enabled: true, board_path: None }),
            api_keys: None,
            extra: None,
        }
    }
}

fn config_path() -> PathBuf {
    utils::get_hermes_path().join(CONFIG_FILE)
}

fn env_path() -> PathBuf {
    utils::get_hermes_path().join(ENV_FILE)
}

pub fn read_config_raw() -> Result<HermesConfig, Box<dyn std::error::Error>> {
    let path = config_path();
    if !path.exists() {
        let default = HermesConfig::default();
        write_config_inner(&default)?;
        return Ok(default);
    }
    let content = std::fs::read_to_string(&path)?;
    let config: HermesConfig = serde_yaml::from_str(&content)?;
    Ok(config)
}

pub fn write_config_inner(config: &HermesConfig) -> Result<(), Box<dyn std::error::Error>> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = serde_yaml::to_string(config)?;
    std::fs::write(&path, content)?;
    Ok(())
}

pub fn get_config(_app: &tauri::AppHandle, path: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let config = read_config_raw()?;
    let json = serde_json::to_value(&config)?;
    let segments: Vec<String> = path.split('.').map(|s| s.to_string()).collect();
    let value = walk_value(&json, &segments);
    match value {
        Some(v) => match v {
            serde_json::Value::String(s) => Ok(Some(s.clone())),
            serde_json::Value::Null => Ok(None),
            other => Ok(Some(other.to_string())),
        },
        None => Ok(None),
    }
}

pub fn set_config(_app: &tauri::AppHandle, path: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut config = read_config_raw()?;
    let mut json = serde_json::to_value(&config)?;
    let segments: Vec<String> = path.split('.').map(|s| s.to_string()).collect();
    let parsed: serde_json::Value = serde_json::from_str(value)
        .unwrap_or(serde_json::Value::String(value.to_string()));
    set_value(&mut json, &segments, parsed);
    config = serde_json::from_value(json)?;
    write_config_inner(&config)?;
    Ok(())
}

pub fn read_config(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let config = read_config_raw()?;
    let json = serde_json::to_value(&config)?;
    Ok(serde_json::to_string_pretty(&json)?)
}

pub fn write_config(_app: &tauri::AppHandle, config_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let config: HermesConfig = serde_json::from_str(config_json)?;
    write_config_inner(&config)?;
    Ok(())
}

pub fn get_env(_app: &tauri::AppHandle, key: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let env = read_env_inner()?;
    Ok(env.get(key).cloned())
}

pub fn set_env(_app: &tauri::AppHandle, key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut env = read_env_inner()?;
    env.insert(key.to_string(), value.to_string());
    write_env_inner(&env)?;
    Ok(())
}

pub fn get_all_env(_app: &tauri::AppHandle) -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
    read_env_inner()
}

pub fn check_config_health(app: &tauri::AppHandle) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let config = read_config_raw()?;
    let has_provider = config.provider.is_some();
    let has_model = config.model.is_some();
    let has_api_key = config.provider.as_ref().and_then(|p| p.api_key.as_ref()).map(|k| !k.is_empty()).unwrap_or(false)
        || config.api_keys.as_ref().map(|k| !k.is_empty()).unwrap_or(false);
    let warnings: Vec<String> = {
        let mut w = Vec::new();
        if !has_api_key { w.push("No API key configured".to_string()); }
        if !has_model { w.push("No model configured".to_string()); }
        w
    };
    Ok(serde_json::json!({
        "provider_configured": has_provider,
        "model_configured": has_model,
        "api_key_set": has_api_key,
        "hermes_installed": crate::hermes::is_hermes_installed(app).unwrap_or(false),
        "warnings": warnings,
    }))
}

fn walk_value<'a>(root: &'a serde_json::Value, path: &[String]) -> Option<&'a serde_json::Value> {
    let mut current = root;
    for segment in path {
        match current {
            serde_json::Value::Object(map) => { current = map.get(segment)?; }
            _ => return None,
        }
    }
    Some(current)
}

fn set_value(root: &mut serde_json::Value, path: &[String], value: serde_json::Value) {
    let mut current = root;
    for (i, segment) in path.iter().enumerate() {
        if i == path.len() - 1 {
            if let serde_json::Value::Object(map) = current {
                map.insert(segment.clone(), value.clone());
            }
        } else if let serde_json::Value::Object(map) = current {
            if !map.contains_key(segment) {
                map.insert(segment.clone(), serde_json::Value::Object(serde_json::Map::new()));
            }
            current = map.get_mut(segment).unwrap();
        }
    }
}

pub fn read_env_inner() -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
    let path = env_path();
    let mut env = HashMap::new();
    if !path.exists() { return Ok(env); }
    let content = std::fs::read_to_string(&path)?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') { continue; }
        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim().to_string();
            let value = trimmed[eq_pos + 1..].trim().trim_matches(|c| c == '"' || c == '\'').to_string();
            env.insert(key, value);
        }
    }
    Ok(env)
}

pub fn write_env_inner(env: &HashMap<String, String>) -> Result<(), Box<dyn std::error::Error>> {
    let path = env_path();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    let mut content = String::new();
    let mut keys: Vec<&String> = env.keys().collect();
    keys.sort();
    for key in keys {
        if let Some(value) = env.get(key) {
            content.push_str(&format!("{}={}\n", key, value));
        }
    }
    std::fs::write(&path, content)?;
    Ok(())
}

pub fn get_env_var(key: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let env = read_env_inner()?;
    Ok(env.get(key).cloned())
}

pub fn set_env_var(key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut env = read_env_inner()?;
    env.insert(key.to_string(), value.to_string());
    write_env_inner(&env)?;
    Ok(())
}

pub fn get_config_value(path: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let config = read_config_raw()?;
    let json = serde_json::to_value(&config)?;
    let segments: Vec<String> = path.split('.').map(|s| s.to_string()).collect();
    let value = walk_value(&json, &segments);
    match value {
        Some(serde_json::Value::String(s)) => Ok(Some(s.clone())),
        Some(serde_json::Value::Null) => Ok(None),
        Some(other) => Ok(Some(other.to_string())),
        None => Ok(None),
    }
}

pub fn set_config_value(path: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut config = read_config_raw()?;
    let mut json = serde_json::to_value(&config)?;
    let segments: Vec<String> = path.split('.').map(|s| s.to_string()).collect();
    let parsed: serde_json::Value = serde_json::from_str(value).unwrap_or(serde_json::Value::String(value.to_string()));
    set_value(&mut json, &segments, parsed);
    config = serde_json::from_value(json)?;
    write_config_inner(&config)?;
    Ok(())
}

pub fn read_env() -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
    read_env_inner()
}

pub fn write_env(env: &HashMap<String, String>) -> Result<(), Box<dyn std::error::Error>> {
    write_env_inner(env)
}
