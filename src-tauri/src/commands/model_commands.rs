use crate::model;

#[tauri::command]
pub fn list_saved_models(app: tauri::AppHandle) -> Result<Vec<model::ModelConfig>, String> {
    model::list_saved_models(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_model(app: tauri::AppHandle, model_json: String) -> Result<(), String> {
    model::save_model(&app, &model_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_model(app: tauri::AppHandle, name: String) -> Result<(), String> {
    model::delete_model(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn discover_models(
    app: tauri::AppHandle,
    provider: String,
) -> Result<Vec<String>, String> {
    model::discover_models(&app, &provider).map_err(|e| e.to_string())
}
