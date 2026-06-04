use crate::gateway;

#[tauri::command]
pub fn get_gateway_status(app: tauri::AppHandle) -> Result<String, String> {
    gateway::get_gateway_status(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_gateway(app: tauri::AppHandle) -> Result<(), String> {
    gateway::start_gateway(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_gateway(app: tauri::AppHandle) -> Result<(), String> {
    gateway::stop_gateway(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restart_gateway(app: tauri::AppHandle) -> Result<(), String> {
    gateway::restart_gateway(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_gateway_config(app: tauri::AppHandle) -> Result<String, String> {
    gateway::get_gateway_config(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_gateway_config(
    app: tauri::AppHandle,
    config_json: String,
) -> Result<(), String> {
    gateway::update_gateway_config(&app, &config_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_gateways() -> Result<Vec<crate::config::GatewayConfig>, String> {
    gateway::list_gateways().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn configure_gateway(gateway_json: String) -> Result<(), String> {
    let gateway: crate::config::GatewayConfig = serde_json::from_str(&gateway_json).map_err(|e| e.to_string())?;
    gateway::configure_gateway(&gateway).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_gateway(name: String) -> Result<bool, String> {
    gateway::test_gateway(&name).await.map_err(|e| e.to_string())
}
