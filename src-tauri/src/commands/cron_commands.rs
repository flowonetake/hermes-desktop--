use crate::cron;

#[tauri::command]
pub fn list_cron_jobs(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    cron::list_cron_jobs(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_cron_job(app: tauri::AppHandle, job_json: String) -> Result<(), String> {
    cron::create_cron_job(&app, &job_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_cron_job(app: tauri::AppHandle, id: String) -> Result<(), String> {
    cron::delete_cron_job(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pause_cron_job(app: tauri::AppHandle, id: String) -> Result<(), String> {
    cron::pause_cron_job(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resume_cron_job(app: tauri::AppHandle, id: String) -> Result<(), String> {
    cron::resume_cron_job(&app, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_cron_job(app: tauri::AppHandle, job_json: String) -> Result<(), String> {
    cron::update_cron_job(&app, &job_json).map_err(|e| e.to_string())
}
