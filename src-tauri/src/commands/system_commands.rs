use crate::system;

#[tauri::command]
pub fn get_app_info(app: tauri::AppHandle) -> Result<system::AppInfo, String> {
    system::get_app_info(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn backup_data(app: tauri::AppHandle) -> Result<String, String> {
    system::backup_data(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_data(app: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    system::import_data(&app, &backup_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_logs(app: tauri::AppHandle) -> Result<(), String> {
    system::open_logs(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    system::check_update(&app).map_err(|e| e.to_string())
}
