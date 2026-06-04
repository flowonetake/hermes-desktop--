use std::path::PathBuf;

use crate::utils;

fn tools_file() -> PathBuf {
    utils::get_hermes_path().join("tools.json")
}

fn read_tools() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let path = tools_file();
    if !path.exists() {
        return Ok(get_default_tools());
    }
    let content = std::fs::read_to_string(&path)?;
    let tools: Vec<String> = serde_json::from_str(&content)?;
    Ok(tools)
}

fn write_tools(tools: &[String]) -> Result<(), Box<dyn std::error::Error>> {
    let path = tools_file();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(tools)?)?;
    Ok(())
}

fn get_default_tools() -> Vec<String> {
    vec![
        "web_search".into(),
        "web_fetch".into(),
        "file_reader".into(),
        "file_writer".into(),
        "memory".into(),
    ]
}

pub fn list_tools(_app: &tauri::AppHandle) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    read_tools()
}

pub fn run_tool(_app: &tauri::AppHandle, name: &str, input: &str) -> Result<String, Box<dyn std::error::Error>> {
    let config = crate::config::read_config_raw()?;
    let host = config.host.as_deref().unwrap_or("127.0.0.1");
    let port = config.port.unwrap_or(8642);

    let result = tauri::async_runtime::block_on(async {
        let client = reqwest::Client::new();
        let resp = client
            .post(&format!("http://{}:{}/api/tools/{}/run", host, port, name))
            .json(&serde_json::json!({"input": input}))
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .await?;

        let text = resp.text().await?;
        Ok(text)
    });
    result
}

pub fn install_tool(_app: &tauri::AppHandle, name: &str, _source: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut tools = read_tools()?;
    if !tools.contains(&name.to_string()) {
        tools.push(name.to_string());
        write_tools(&tools)?;
    }
    Ok(())
}

pub fn uninstall_tool(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut tools = read_tools()?;
    tools.retain(|t| t != name);
    write_tools(&tools)
}

pub fn toggle_tool(name: &str, enabled: bool) -> Result<(), Box<dyn std::error::Error>> {
    let mut tools = read_tools()?;
    if enabled && !tools.contains(&name.to_string()) {
        tools.push(name.to_string());
    } else if !enabled {
        tools.retain(|t| t != name);
    }
    write_tools(&tools)
}
