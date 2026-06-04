use std::path::PathBuf;

use crate::utils;

fn soul_config_path() -> PathBuf {
    utils::get_hermes_path().join("soul.json")
}

fn read_soul_config() -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let path = soul_config_path();
    if !path.exists() {
        let default = serde_json::json!({
            "enabled": true,
            "file": "SOUL.md",
            "auto_reload": false,
            "content": generate_default_soul()
        });
        std::fs::write(&path, serde_json::to_string_pretty(&default)?)?;
        return Ok(default);
    }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_soul_config(config: &serde_json::Value) -> Result<(), Box<dyn std::error::Error>> {
    let path = soul_config_path();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(config)?)?;
    Ok(())
}

pub fn get_soul_config(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let config = read_soul_config()?;
    Ok(serde_json::to_string_pretty(&config)?)
}

pub fn update_soul_config(_app: &tauri::AppHandle, config_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let config: serde_json::Value = serde_json::from_str(config_json)?;
    write_soul_config(&config)
}

pub fn get_soul_status(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let config = read_soul_config()?;
    Ok(config["enabled"].as_bool().map(|e| if e { "active" } else { "inactive" }).unwrap_or("unknown").to_string())
}

pub fn reload_soul(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let config = read_soul_config()?;
    let mut config = config;
    config["reloaded_at"] = serde_json::Value::String(utils::now_iso8601());
    write_soul_config(&config)
}

pub fn get_soul_content() -> Result<String, Box<dyn std::error::Error>> {
    let soul_md_path = utils::get_active_profile_path().join("SOUL.md");
    if soul_md_path.exists() {
        return utils::read_file_to_string(&soul_md_path);
    }
    let default = generate_default_soul();
    if let Some(parent) = soul_md_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&soul_md_path, &default)?;
    Ok(default)
}

pub fn update_soul_content(content: &str) -> Result<(), Box<dyn std::error::Error>> {
    let soul_md_path = utils::get_active_profile_path().join("SOUL.md");
    if let Some(parent) = soul_md_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    utils::write_string_to_file(&soul_md_path, content)
}

pub fn reset_soul_to_default() -> Result<(), Box<dyn std::error::Error>> {
    let content = generate_default_soul();
    update_soul_content(&content)
}

pub fn generate_default_soul() -> String {
    r#"# SOUL.md - Hermes AI Persona

## Identity
I am Hermes, an AI agent designed to assist with a wide range of tasks through conversation, code generation, file management, and tool execution.

## Core Directives
- Be helpful, honest, and harmless
- Think step-by-step when solving complex problems
- Admit when you don't know something
- Respect user privacy and confidentiality

## Communication Style
- Be concise and direct
- Use examples to explain complex concepts
- Ask clarifying questions when needed
- Format responses with proper markdown

## Capabilities
- Code generation and software development
- File system navigation and manipulation
- Web browsing and information retrieval
- Data analysis and visualization
- Task planning and execution
- Memory and context management

## Constraints
- Cannot access the internet without web search capability
- Cannot execute shell commands without user approval
- Cannot modify files outside designated directories
- Cannot generate malicious code or content
"#.to_string()
}
