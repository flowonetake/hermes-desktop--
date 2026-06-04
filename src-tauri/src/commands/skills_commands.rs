use crate::skills;

#[tauri::command]
pub fn list_skills(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    skills::list_skills(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_skill(app: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    skills::get_skill(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn activate_skill(app: tauri::AppHandle, name: String) -> Result<(), String> {
    skills::activate_skill(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn deactivate_skill(app: tauri::AppHandle, name: String) -> Result<(), String> {
    skills::deactivate_skill(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_skill(
    app: tauri::AppHandle,
    name: String,
    source: String,
) -> Result<(), String> {
    skills::install_skill(&app, &name, &source).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn uninstall_skill(app: tauri::AppHandle, name: String) -> Result<(), String> {
    skills::uninstall_skill(&app, &name).map_err(|e| e.to_string())
}
