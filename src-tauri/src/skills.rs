use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

fn skills_file() -> PathBuf {
    utils::get_hermes_path().join("skills.json")
}

fn read_skills() -> Result<Vec<SkillEntry>, Box<dyn std::error::Error>> {
    let path = skills_file();
    if !path.exists() { return Ok(Vec::new()); }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_skills(skills: &[SkillEntry]) -> Result<(), Box<dyn std::error::Error>> {
    let path = skills_file();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(skills)?)?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillEntry {
    pub name: String,
    pub description: String,
    pub source: String,
    pub enabled: bool,
}

pub fn list_skills(_app: &tauri::AppHandle) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let skills = read_skills()?;
    Ok(skills.into_iter().map(|s| s.name).collect())
}

pub fn get_skill(_app: &tauri::AppHandle, name: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let skills = read_skills()?;
    Ok(skills.into_iter().find(|s| s.name == name).map(|s| {
        serde_json::to_string(&s).unwrap_or_default()
    }))
}

pub fn activate_skill(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut skills = read_skills()?;
    if let Some(skill) = skills.iter_mut().find(|s| s.name == name) {
        skill.enabled = true;
    }
    write_skills(&skills)
}

pub fn deactivate_skill(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut skills = read_skills()?;
    if let Some(skill) = skills.iter_mut().find(|s| s.name == name) {
        skill.enabled = false;
    }
    write_skills(&skills)
}

pub fn install_skill(_app: &tauri::AppHandle, name: &str, source: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut skills = read_skills()?;
    if !skills.iter().any(|s| s.name == name) {
        skills.push(SkillEntry {
            name: name.to_string(),
            description: format!("Installed from {}", source),
            source: source.to_string(),
            enabled: true,
        });
    }
    write_skills(&skills)
}

pub fn uninstall_skill(_app: &tauri::AppHandle, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut skills = read_skills()?;
    skills.retain(|s| s.name != name);
    write_skills(&skills)
}

pub fn list_skill_names() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    Ok(read_skills()?.into_iter().map(|s| s.name).collect())
}
