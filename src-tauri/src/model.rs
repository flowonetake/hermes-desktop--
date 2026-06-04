use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub name: String,
    pub provider: String,
    pub model_id: String,
    pub base_url: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
}

fn models_file() -> PathBuf {
    utils::get_hermes_path().join("models.json")
}

fn read_models() -> Result<Vec<ModelConfig>, Box<dyn std::error::Error>> {
    let path = models_file();
    if !path.exists() { return Ok(Vec::new()); }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_models(models: &[ModelConfig]) -> Result<(), Box<dyn std::error::Error>> {
    let path = models_file();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(models)?)?;
    Ok(())
}

pub fn list_saved_models(_app: &tauri::AppHandle) -> Result<Vec<ModelConfig>, Box<dyn std::error::Error>> {
    read_models()
}

pub fn save_model(_app: &tauri::AppHandle, model_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let model: ModelConfig = serde_json::from_str(model_json)?;
    let mut models = read_models()?;
    if let Some(existing) = models.iter_mut().find(|m| m.name == model.name) {
        *existing = model;
    } else {
        models.push(model);
    }
    write_models(&models)
}

pub fn delete_model(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut models = read_models()?;
    models.retain(|m| m.name != name);
    write_models(&models)
}

pub fn discover_models(_app: &tauri::AppHandle, provider: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let result = tauri::async_runtime::block_on(async {
        let client = reqwest::Client::new();
        match provider.to_lowercase().as_str() {
            "openai" => {
                let resp = client.get("https://api.openai.com/v1/models")
                    .timeout(std::time::Duration::from_secs(15)).send().await?;
                let json: serde_json::Value = resp.json().await?;
                Ok(json["data"].as_array().map(|arr| {
                    arr.iter().filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
                        .filter(|id| id.contains("gpt") || id.contains("o1") || id.contains("o3"))
                        .collect()
                }).unwrap_or_default())
            }
            "anthropic" => {
                let resp = client.get("https://api.anthropic.com/v1/models")
                    .timeout(std::time::Duration::from_secs(15)).send().await?;
                let json: serde_json::Value = resp.json().await?;
                Ok(json["data"].as_array().map(|arr| {
                    arr.iter().filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
                        .filter(|id| id.contains("claude")).collect()
                }).unwrap_or_default())
            }
            "ollama" => {
                let resp = client.get("http://127.0.0.1:11434/api/tags")
                    .timeout(std::time::Duration::from_secs(5)).send().await?;
                let json: serde_json::Value = resp.json().await?;
                Ok(json["models"].as_array().map(|arr| {
                    arr.iter().filter_map(|m| m["name"].as_str().map(|s| s.to_string())).collect()
                }).unwrap_or_default())
            }
            "openrouter" => {
                let resp = client.get("https://openrouter.ai/api/v1/models")
                    .timeout(std::time::Duration::from_secs(15)).send().await?;
                let json: serde_json::Value = resp.json().await?;
                Ok(json["data"].as_array().map(|arr| {
                    arr.iter().filter_map(|m| m["id"].as_str().map(|s| s.to_string())).collect()
                }).unwrap_or_default())
            }
            "google" | "gemini" => Ok(vec![
                "gemini-2.0-flash".into(), "gemini-2.0-pro".into(),
                "gemini-1.5-flash".into(), "gemini-1.5-pro".into(),
            ]),
            _ => Ok(vec![format!("{}/default-model", provider)]),
        }
    });
    result
}
