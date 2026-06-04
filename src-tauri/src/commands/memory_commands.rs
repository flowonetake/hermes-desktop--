use std::collections::HashMap;

use crate::memory;

#[tauri::command]
pub fn store_memory(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    memory::store_memory(&app, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn recall_memory(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    memory::recall_memory(&app, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_memories(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<(String, String)>, String> {
    memory::search_memories(&app, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_memory(app: tauri::AppHandle, key: String) -> Result<(), String> {
    memory::delete_memory(&app, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_memories(app: tauri::AppHandle) -> Result<(), String> {
    memory::clear_memories(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_memory_stats(
    app: tauri::AppHandle,
) -> Result<HashMap<String, u64>, String> {
    memory::get_memory_stats(&app).map_err(|e| e.to_string())
}
