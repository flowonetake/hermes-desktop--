use crate::installer;

#[tauri::command]
pub fn check_dependencies(app: tauri::AppHandle) -> Result<installer::DependencyStatus, String> {
    installer::check_dependencies(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_hermes(app: tauri::AppHandle) -> Result<String, String> {
    installer::install_hermes(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_install_status(app: tauri::AppHandle) -> Result<String, String> {
    installer::get_install_status(&app).map_err(|e| e.to_string())
}
