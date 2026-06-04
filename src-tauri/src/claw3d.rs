use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

use crate::utils;

static SCENE_LOADED: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneObject {
    pub id: String,
    pub name: String,
    pub object_type: String,
    pub position: (f64, f64, f64),
    pub rotation: (f64, f64, f64),
    pub scale: (f64, f64, f64),
    pub properties: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub objects: Vec<SceneObject>,
    pub camera_position: (f64, f64, f64),
    pub background_color: String,
}

fn scenes_dir() -> PathBuf {
    utils::get_hermes_path().join("office").join("scenes")
}

fn read_scene(path: &PathBuf) -> Result<Scene, Box<dyn std::error::Error>> {
    Ok(serde_json::from_str(&std::fs::read_to_string(path)?)?)
}

fn write_scene(scene: &Scene) -> Result<(), Box<dyn std::error::Error>> {
    let dir = scenes_dir();
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join(format!("{}.json", scene.id)), serde_json::to_string_pretty(scene)?)?;
    Ok(())
}

pub fn get_scene(_app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    let dir = scenes_dir();
    std::fs::create_dir_all(&dir)?;

    let scenes: Vec<Scene> = if dir.exists() {
        let mut s = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            if entry.path().extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(scene) = read_scene(&entry.path()) {
                    s.push(scene);
                }
            }
        }
        s
    } else {
        Vec::new()
    };

    if scenes.is_empty() {
        let default_scene = Scene {
            id: utils::generate_uuid(),
            name: "Default Scene".to_string(),
            objects: Vec::new(),
            camera_position: (0.0, 5.0, 10.0),
            background_color: "#1a1a2e".to_string(),
        };
        write_scene(&default_scene)?;
        return Ok(serde_json::to_string_pretty(&default_scene)?);
    }

    Ok(serde_json::to_string_pretty(&scenes[0])?)
}

pub fn load_scene(_app: &tauri::AppHandle, path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let scene_path = PathBuf::from(path);
    if !scene_path.exists() {
        return Err(format!("Scene file not found: {}", path).into());
    }
    let _scene = read_scene(&scene_path)?;
    SCENE_LOADED.store(true, Ordering::SeqCst);
    Ok(())
}

pub fn get_objects(app: &tauri::AppHandle) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let scene_json = get_scene(app)?;
    let scene: Scene = serde_json::from_str(&scene_json)?;
    Ok(scene.objects.into_iter().map(|o| o.name).collect())
}

pub fn select_object(_app: &tauri::AppHandle, _id: &str) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

pub fn transform_object(_app: &tauri::AppHandle, id: &str, transform_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let dir = scenes_dir();
    std::fs::create_dir_all(&dir)?;

    let transform: serde_json::Value = serde_json::from_str(transform_json)?;

    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        if entry.path().extension().map(|e| e == "json").unwrap_or(false) {
            if let Ok(mut scene) = read_scene(&entry.path()) {
                if let Some(obj) = scene.objects.iter_mut().find(|o| o.id == id) {
                    if let Some(pos) = transform.get("position").and_then(|p| p.as_array()) {
                        if pos.len() == 3 {
                            obj.position = (pos[0].as_f64().unwrap_or(0.0), pos[1].as_f64().unwrap_or(0.0), pos[2].as_f64().unwrap_or(0.0));
                        }
                    }
                    if let Some(rot) = transform.get("rotation").and_then(|r| r.as_array()) {
                        if rot.len() == 3 {
                            obj.rotation = (rot[0].as_f64().unwrap_or(0.0), rot[1].as_f64().unwrap_or(0.0), rot[2].as_f64().unwrap_or(0.0));
                        }
                    }
                    if let Some(scl) = transform.get("scale").and_then(|s| s.as_array()) {
                        if scl.len() == 3 {
                            obj.scale = (scl[0].as_f64().unwrap_or(1.0), scl[1].as_f64().unwrap_or(1.0), scl[2].as_f64().unwrap_or(1.0));
                        }
                    }
                    write_scene(&scene)?;
                    return Ok(());
                }
            }
        }
    }

    Err(format!("Object '{}' not found in any scene", id).into())
}

pub fn start_office_server() -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

pub fn stop_office_server() -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

pub fn get_office_status() -> String {
    if SCENE_LOADED.load(Ordering::SeqCst) { "running".to_string() } else { "stopped".to_string() }
}

pub fn list_adapters() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let adapters_dir = utils::get_hermes_path().join("office").join("adapters");
    std::fs::create_dir_all(&adapters_dir)?;
    let default_adapters = vec!["terminal", "filesystem", "web", "database", "memory"];
    for adapter in &default_adapters {
        let path = adapters_dir.join(format!("{}.json", adapter));
        if !path.exists() {
            std::fs::write(&path, serde_json::to_string_pretty(&serde_json::json!({
                "name": adapter, "enabled": true, "version": "1.0.0"
            }))?)?;
        }
    }
    let mut adapters = Vec::new();
    for entry in std::fs::read_dir(&adapters_dir)? {
        let entry = entry?;
        if let Some(name) = entry.path().file_stem() {
            adapters.push(name.to_string_lossy().to_string());
        }
    }
    adapters.sort();
    Ok(adapters)
}
