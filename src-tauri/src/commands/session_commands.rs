use crate::session;

#[tauri::command]
pub fn list_sessions(
    app: tauri::AppHandle,
    limit: u32,
    offset: u32,
) -> Result<Vec<session::Session>, String> {
    session::list_sessions(&app, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_session(app: tauri::AppHandle, id: String) -> Result<Option<session::Session>, String> {
    session::get_session(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_sessions(app: tauri::AppHandle, query: String) -> Result<Vec<session::Session>, String> {
    session::search_sessions(&app, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_session(app: tauri::AppHandle, session_json: String) -> Result<(), String> {
    session::create_session(&app, &session_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_session(app: tauri::AppHandle, id: String) -> Result<(), String> {
    session::delete_session(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_messages(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<Vec<session::Message>, String> {
    session::get_messages(&app, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_message(app: tauri::AppHandle, msg_json: String) -> Result<(), String> {
    session::add_message(&app, &msg_json).map_err(|e| e.to_string())
}
