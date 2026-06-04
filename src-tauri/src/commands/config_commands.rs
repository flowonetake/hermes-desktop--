use std::collections::HashMap;

use crate::config;

#[tauri::command]
pub fn get_config(app: tauri::AppHandle, path: String) -> Result<Option<String>, String> {
    config::get_config(&app, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_config(app: tauri::AppHandle, path: String, value: String) -> Result<(), String> {
    config::set_config(&app, &path, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_config(app: tauri::AppHandle) -> Result<String, String> {
    config::read_config(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_config(app: tauri::AppHandle, config_json: String) -> Result<(), String> {
    config::write_config(&app, &config_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_env(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    config::get_env(&app, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_env(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    config::set_env(&app, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_env(app: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    config::get_all_env(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_config_health(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    config::check_config_health(&app).map_err(|e| e.to_string())
}
