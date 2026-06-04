use crate::tools;

#[tauri::command]
pub fn list_tools(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    tools::list_tools(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_tool(
    app: tauri::AppHandle,
    name: String,
    input: String,
) -> Result<String, String> {
    tools::run_tool(&app, &name, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_tool(
    app: tauri::AppHandle,
    name: String,
    source: String,
) -> Result<(), String> {
    tools::install_tool(&app, &name, &source).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn uninstall_tool(app: tauri::AppHandle, name: String) -> Result<(), String> {
    tools::uninstall_tool(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_tool(_app: tauri::AppHandle, name: String, enabled: bool) -> Result<(), String> {
    tools::toggle_tool(&name, enabled).map_err(|e| e.to_string())
}
