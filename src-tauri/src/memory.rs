use std::collections::HashMap;
use std::path::PathBuf;

use crate::utils;

fn memory_file() -> PathBuf {
    utils::get_hermes_path().join("memory.json")
}

fn read_memory_map() -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
    let path = memory_file();
    if !path.exists() { return Ok(HashMap::new()); }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_memory_map(map: &HashMap<String, String>) -> Result<(), Box<dyn std::error::Error>> {
    let path = memory_file();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(map)?)?;
    Ok(())
}

pub fn store_memory(_app: &tauri::AppHandle, key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut map = read_memory_map()?;
    map.insert(key.to_string(), value.to_string());
    write_memory_map(&map)
}

pub fn recall_memory(_app: &tauri::AppHandle, key: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let map = read_memory_map()?;
    Ok(map.get(key).cloned())
}

pub fn search_memories(_app: &tauri::AppHandle, query: &str) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
    let map = read_memory_map()?;
    let q = query.to_lowercase();
    let mut results = Vec::new();
    for (k, v) in &map {
        if k.to_lowercase().contains(&q) || v.to_lowercase().contains(&q) {
            results.push((k.clone(), v.clone()));
        }
    }
    results.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(results)
}

pub fn delete_memory(_app: &tauri::AppHandle, key: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut map = read_memory_map()?;
    map.remove(key);
    write_memory_map(&map)
}

pub fn clear_memories(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    write_memory_map(&HashMap::new())
}

pub fn get_memory_stats(_app: &tauri::AppHandle) -> Result<HashMap<String, u64>, Box<dyn std::error::Error>> {
    let map = read_memory_map()?;
    let mut stats = HashMap::new();
    stats.insert("total_entries".to_string(), map.len() as u64);
    let total_chars: usize = map.values().map(|v| v.len()).sum();
    stats.insert("total_chars".to_string(), total_chars as u64);
    Ok(stats)
}

pub struct MemoryEntry {
    pub id: String,
    pub content: String,
    pub category: String,
    pub created_at: String,
    pub tags: Vec<String>,
}

pub struct MemoryProvider {
    pub name: String,
    pub provider_type: String,
    pub enabled: bool,
    pub config: HashMap<String, String>,
}
