use crate::ssh;

#[tauri::command]
pub fn ssh_connect(app: tauri::AppHandle, config_json: String) -> Result<(), String> {
    ssh::connect(&app, &config_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ssh_disconnect(app: tauri::AppHandle) -> Result<(), String> {
    ssh::disconnect(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ssh_is_connected(app: tauri::AppHandle) -> Result<bool, String> {
    ssh::is_connected(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ssh_execute(app: tauri::AppHandle, command: String) -> Result<String, String> {
    ssh::execute(&app, &command).map_err(|e| e.to_string())
}
