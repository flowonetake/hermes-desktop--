use crate::soul;

#[tauri::command]
pub fn get_soul_config(app: tauri::AppHandle) -> Result<String, String> {
    soul::get_soul_config(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_soul_config(app: tauri::AppHandle, config_json: String) -> Result<(), String> {
    soul::update_soul_config(&app, &config_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_soul_status(app: tauri::AppHandle) -> Result<String, String> {
    soul::get_soul_status(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reload_soul(app: tauri::AppHandle) -> Result<(), String> {
    soul::reload_soul(&app).map_err(|e| e.to_string())
}
