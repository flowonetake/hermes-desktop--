use crate::kanban;

#[tauri::command]
pub fn list_boards(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    kanban::list_boards(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_board(app: tauri::AppHandle, name: String) -> Result<(), String> {
    kanban::create_board(&app, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_board(app: tauri::AppHandle, id: String) -> Result<(), String> {
    kanban::delete_board(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_board(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    kanban::get_board(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_card(
    app: tauri::AppHandle,
    board_id: String,
    card_json: String,
) -> Result<(), String> {
    kanban::add_card(&app, &board_id, &card_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_card(
    app: tauri::AppHandle,
    card_id: String,
    target_column: String,
) -> Result<(), String> {
    kanban::move_card(&app, &card_id, &target_column).map_err(|e| e.to_string())
}
