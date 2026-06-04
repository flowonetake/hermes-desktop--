use crate::hermes;

#[tauri::command]
pub fn start_hermes(app: tauri::AppHandle, config_dir: String, port: u16) -> Result<(), String> {
    hermes::start_hermes(&app, &config_dir, port).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_hermes(app: tauri::AppHandle) -> Result<(), String> {
    hermes::stop_hermes(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restart_hermes(app: tauri::AppHandle) -> Result<(), String> {
    hermes::restart_hermes(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_hermes_status(app: tauri::AppHandle) -> Result<String, String> {
    hermes::get_hermes_status(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_hermes_installed(app: tauri::AppHandle) -> Result<bool, String> {
    hermes::is_hermes_installed(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_hermes_version(app: tauri::AppHandle) -> Result<Option<String>, String> {
    hermes::get_hermes_version(&app).map_err(|e| e.to_string())
}
