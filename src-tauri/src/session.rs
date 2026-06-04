use std::path::PathBuf;

use rusqlite::{params, Connection, OpenFlags};
use serde::{Deserialize, Serialize};

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub profile_name: String,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: u32,
    pub tokens_used: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub tokens: u64,
    pub created_at: String,
    pub metadata: Option<String>,
}

fn db_path() -> PathBuf {
    utils::get_hermes_path().join("state.db")
}

fn get_connection() -> Result<Connection, Box<dyn std::error::Error>> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open_with_flags(
        &path,
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            profile_name TEXT NOT NULL DEFAULT '',
            model TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0,
            tokens_used INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
            content TEXT NOT NULL,
            tokens INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            metadata TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_msgs_created ON messages(created_at);
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            content, role, session_id UNINDEXED, content=messages, content_rowid=rowid
        );
        CREATE TRIGGER IF NOT EXISTS msgs_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content, role, session_id) VALUES (new.rowid, new.content, new.role, new.session_id);
        END;
        CREATE TRIGGER IF NOT EXISTS msgs_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content, role, session_id) VALUES ('delete', old.rowid, old.content, old.role, old.session_id);
        END;
        CREATE TRIGGER IF NOT EXISTS msgs_au AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content, role, session_id) VALUES ('delete', old.rowid, old.content, old.role, old.session_id);
            INSERT INTO messages_fts(rowid, content, role, session_id) VALUES (new.rowid, new.content, new.role, new.session_id);
        END;",
    )?;

    Ok(conn)
}

fn map_session(row: &rusqlite::Row) -> rusqlite::Result<Session> {
    Ok(Session {
        id: row.get(0)?,
        title: row.get(1)?,
        profile_name: row.get(2)?,
        model: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        message_count: row.get::<_, i64>(6)? as u32,
        tokens_used: row.get::<_, i64>(7)? as u64,
    })
}

fn map_message(row: &rusqlite::Row) -> rusqlite::Result<Message> {
    Ok(Message {
        id: row.get(0)?,
        session_id: row.get(1)?,
        role: row.get(2)?,
        content: row.get(3)?,
        tokens: row.get::<_, i64>(4)? as u64,
        created_at: row.get(5)?,
        metadata: row.get(6)?,
    })
}

fn with_conn<F, T>(f: F) -> Result<T, Box<dyn std::error::Error>>
where
    F: FnOnce(&Connection) -> Result<T, Box<dyn std::error::Error>>,
{
    let conn = get_connection()?;
    f(&conn)
}

pub fn list_sessions(_app: &tauri::AppHandle, limit: u32, offset: u32) -> Result<Vec<Session>, Box<dyn std::error::Error>> {
    with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, profile_name, model, created_at, updated_at, message_count, tokens_used
             FROM sessions ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2",
        )?;
        let rows = stmt.query_map(params![limit, offset], map_session)?;
        let mut sessions = Vec::new();
        for row in rows { sessions.push(row?); }
        Ok(sessions)
    })
}

pub fn get_session(_app: &tauri::AppHandle, id: &str) -> Result<Option<Session>, Box<dyn std::error::Error>> {
    with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, profile_name, model, created_at, updated_at, message_count, tokens_used
             FROM sessions WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], map_session)?;
        match rows.next() {
            Some(Ok(s)) => Ok(Some(s)),
            _ => Ok(None),
        }
    })
}

pub fn search_sessions(_app: &tauri::AppHandle, query: &str) -> Result<Vec<Session>, Box<dyn std::error::Error>> {
    with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT s.id, s.title, s.profile_name, s.model, s.created_at, s.updated_at,
                    s.message_count, s.tokens_used
             FROM sessions s
             JOIN messages m ON m.session_id = s.id
             JOIN messages_fts fts ON fts.rowid = m.rowid
             WHERE messages_fts MATCH ?1
             ORDER BY s.updated_at DESC LIMIT 50",
        )?;
        let rows = stmt.query_map(params![query], map_session)?;
        let mut sessions = Vec::new();
        for row in rows { sessions.push(row?); }
        Ok(sessions)
    })
}

pub fn create_session(_app: &tauri::AppHandle, session_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let session: Session = serde_json::from_str(session_json)?;
    with_conn(|conn| {
        conn.execute(
            "INSERT INTO sessions (id, title, profile_name, model, created_at, updated_at, message_count, tokens_used)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![session.id, session.title, session.profile_name, session.model,
                    session.created_at, session.updated_at, session.message_count as i64, session.tokens_used as i64],
        )?;
        Ok(())
    })
}

pub fn update_session(_app: &tauri::AppHandle, session_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let session: Session = serde_json::from_str(session_json)?;
    with_conn(|conn| {
        conn.execute(
            "UPDATE sessions SET title=?1, profile_name=?2, model=?3, updated_at=?4, message_count=?5, tokens_used=?6 WHERE id=?7",
            params![session.title, session.profile_name, session.model, session.updated_at,
                    session.message_count as i64, session.tokens_used as i64, session.id],
        )?;
        Ok(())
    })
}

pub fn delete_session(_app: &tauri::AppHandle, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    with_conn(|conn| {
        conn.execute("DELETE FROM messages WHERE session_id = ?1", params![id])?;
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    })
}

pub fn get_messages(_app: &tauri::AppHandle, session_id: &str) -> Result<Vec<Message>, Box<dyn std::error::Error>> {
    with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, session_id, role, content, tokens, created_at, metadata
             FROM messages WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![session_id], map_message)?;
        let mut messages = Vec::new();
        for row in rows { messages.push(row?); }
        Ok(messages)
    })
}

pub fn add_message(_app: &tauri::AppHandle, msg_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let msg: Message = serde_json::from_str(msg_json)?;
    with_conn(|conn| {
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, tokens, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![msg.id, msg.session_id, msg.role, msg.content, msg.tokens as i64, msg.created_at, msg.metadata],
        )?;
        conn.execute(
            "UPDATE sessions SET message_count = message_count + 1, tokens_used = tokens_used + ?1, updated_at = ?2 WHERE id = ?3",
            params![msg.tokens as i64, msg.created_at, msg.session_id],
        )?;
        Ok(())
    })
}

pub fn get_session_count(_app: &tauri::AppHandle) -> Result<u64, Box<dyn std::error::Error>> {
    with_conn(|conn| {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM sessions", [], |r| r.get(0))?;
        Ok(count as u64)
    })
}

pub fn get_total_tokens(_app: &tauri::AppHandle) -> Result<u64, Box<dyn std::error::Error>> {
    with_conn(|conn| {
        let total: i64 = conn.query_row("SELECT COALESCE(SUM(tokens_used), 0) FROM sessions", [], |r| r.get(0))?;
        Ok(total as u64)
    })
}
