use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KanbanCard {
    pub id: String,
    pub title: String,
    pub description: String,
    pub column: String,
    pub position: u32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KanbanBoard {
    pub id: String,
    pub name: String,
    pub columns: Vec<String>,
    pub cards: Vec<KanbanCard>,
    pub created_at: String,
}

fn kanban_dir() -> PathBuf {
    utils::get_hermes_path().join("kanban")
}

fn board_path(id: &str) -> PathBuf {
    kanban_dir().join(format!("{}.json", id))
}

fn read_boards_index() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let path = kanban_dir().join("index.json");
    if !path.exists() { return Ok(Vec::new()); }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_boards_index(ids: &[String]) -> Result<(), Box<dyn std::error::Error>> {
    let dir = kanban_dir();
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join("index.json"), serde_json::to_string_pretty(ids)?)?;
    Ok(())
}

pub fn list_boards(_app: &tauri::AppHandle) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let ids = read_boards_index()?;
    let mut boards = Vec::new();
    for id in &ids {
        let path = board_path(id);
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                boards.push(content);
            }
        }
    }
    Ok(boards)
}

pub fn create_board(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let id = utils::generate_uuid();
    let now = utils::now_iso8601();
    let board = KanbanBoard {
        id: id.clone(),
        name: name.to_string(),
        columns: vec!["backlog".into(), "todo".into(), "in_progress".into(), "done".into()],
        cards: Vec::new(),
        created_at: now,
    };
    let mut ids = read_boards_index()?;
    ids.push(id.clone());
    write_boards_index(&ids)?;
    std::fs::write(board_path(&id), serde_json::to_string_pretty(&board)?)?;
    Ok(())
}

pub fn delete_board(_app: &tauri::AppHandle, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut ids = read_boards_index()?;
    ids.retain(|i| i != id);
    write_boards_index(&ids)?;
    let path = board_path(id);
    if path.exists() { std::fs::remove_file(&path)?; }
    Ok(())
}

pub fn get_board(_app: &tauri::AppHandle, id: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let path = board_path(id);
    if !path.exists() { return Ok(None); }
    Ok(Some(std::fs::read_to_string(&path)?))
}

pub fn add_card(_app: &tauri::AppHandle, board_id: &str, card_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut card: KanbanCard = serde_json::from_str(card_json)?;
    let path = board_path(board_id);
    let mut board: KanbanBoard = serde_json::from_str(&std::fs::read_to_string(&path)?)?;
    if card.id.is_empty() { card.id = utils::generate_uuid(); }
    if card.created_at.is_empty() { card.created_at = utils::now_iso8601(); }
    board.cards.push(card);
    std::fs::write(&path, serde_json::to_string_pretty(&board)?)?;
    Ok(())
}

pub fn move_card(_app: &tauri::AppHandle, card_id: &str, target_column: &str) -> Result<(), Box<dyn std::error::Error>> {
    let ids = read_boards_index()?;
    for id in &ids {
        let path = board_path(id);
        if !path.exists() { continue; }
        let mut board: KanbanBoard = serde_json::from_str(&std::fs::read_to_string(&path)?)?;
        if let Some(card) = board.cards.iter_mut().find(|c| c.id == card_id) {
            card.column = target_column.to_string();
            std::fs::write(&path, serde_json::to_string_pretty(&board)?)?;
            return Ok(());
        }
    }
    Err(format!("Card '{}' not found in any board", card_id).into())
}
