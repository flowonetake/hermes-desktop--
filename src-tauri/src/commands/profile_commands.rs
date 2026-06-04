use crate::profile;

#[tauri::command]
pub fn list_profiles(app: tauri::AppHandle) -> Result<Vec<profile::Profile>, String> {
    profile::list_profiles(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_profile(app: tauri::AppHandle, name: String) -> Result<profile::Profile, String> {
    profile::create_profile(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_profile(app: tauri::AppHandle, name: String) -> Result<(), String> {
    profile::delete_profile(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn switch_profile(app: tauri::AppHandle, name: String) -> Result<(), String> {
    profile::switch_profile(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_profile(app: tauri::AppHandle) -> Result<Option<String>, String> {
    profile::get_active_profile(&app).map_err(|e| e.to_string())
}
