use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJob {
    pub id: String,
    pub name: String,
    pub cron_expression: String,
    pub command: String,
    pub target: String,
    pub enabled: bool,
    pub last_run: Option<String>,
    pub next_run: Option<String>,
}

fn cron_file() -> PathBuf {
    utils::get_hermes_path().join("cron_jobs.json")
}

fn read_jobs() -> Result<Vec<CronJob>, Box<dyn std::error::Error>> {
    let path = cron_file();
    if !path.exists() { return Ok(Vec::new()); }
    Ok(serde_json::from_str(&std::fs::read_to_string(&path)?)?)
}

fn write_jobs(jobs: &[CronJob]) -> Result<(), Box<dyn std::error::Error>> {
    let path = cron_file();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    std::fs::write(&path, serde_json::to_string_pretty(jobs)?)?;
    Ok(())
}

pub fn list_cron_jobs(_app: &tauri::AppHandle) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let jobs = read_jobs()?;
    Ok(jobs.into_iter().map(|j| serde_json::to_string(&j).unwrap_or_default()).collect())
}

pub fn create_cron_job(_app: &tauri::AppHandle, job_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut job: CronJob = serde_json::from_str(job_json)?;
    if job.id.is_empty() { job.id = utils::generate_uuid(); }
    let mut jobs = read_jobs()?;
    jobs.push(job);
    write_jobs(&jobs)
}

pub fn delete_cron_job(_app: &tauri::AppHandle, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut jobs = read_jobs()?;
    jobs.retain(|j| j.id != id);
    write_jobs(&jobs)
}

pub fn pause_cron_job(_app: &tauri::AppHandle, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut jobs = read_jobs()?;
    if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
        job.enabled = false;
    }
    write_jobs(&jobs)
}

pub fn resume_cron_job(_app: &tauri::AppHandle, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut jobs = read_jobs()?;
    if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
        job.enabled = true;
    }
    write_jobs(&jobs)
}

pub fn update_cron_job(_app: &tauri::AppHandle, job_json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let job: CronJob = serde_json::from_str(job_json)?;
    let mut jobs = read_jobs()?;
    if let Some(existing) = jobs.iter_mut().find(|j| j.id == job.id) {
        *existing = job;
    } else {
        return Err(format!("Cron job '{}' not found", job.id).into());
    }
    write_jobs(&jobs)
}
