use crate::claw3d;

#[tauri::command]
pub fn get_scene(app: tauri::AppHandle) -> Result<String, String> {
    claw3d::get_scene(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_scene(app: tauri::AppHandle, path: String) -> Result<(), String> {
    claw3d::load_scene(&app, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_objects(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    claw3d::get_objects(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn select_object(app: tauri::AppHandle, id: String) -> Result<(), String> {
    claw3d::select_object(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn transform_object(
    app: tauri::AppHandle,
    id: String,
    transform_json: String,
) -> Result<(), String> {
    claw3d::transform_object(&app, &id, &transform_json).map_err(|e| e.to_string())
}
