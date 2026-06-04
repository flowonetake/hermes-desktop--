use tauri::App;

pub fn configure_security(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let _ = app;
    Ok(())
}

pub fn validate_path_for_read(path: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let hermes_dir = std::path::PathBuf::from(
        dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join(".hermes"),
    );
    let canonical_path = std::fs::canonicalize(path)?;
    let canonical_hermes = std::fs::canonicalize(&hermes_dir)?;
    if !canonical_path.starts_with(&canonical_hermes) {
        return Err(format!("Access denied: path {:?} is outside ~/.hermes", path).into());
    }
    if !path.exists() {
        return Err(format!("Path {:?} does not exist", path).into());
    }
    Ok(())
}

pub fn validate_path_for_write(path: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let hermes_dir = std::path::PathBuf::from(
        dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join(".hermes"),
    );
    let canonical_path = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let canonical_hermes = std::fs::canonicalize(&hermes_dir)?;
    if !canonical_path.starts_with(&canonical_hermes) {
        return Err(format!("Access denied: path {:?} is outside ~/.hermes", path).into());
    }
    Ok(())
}

pub fn sanitize_input(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_ascii_punctuation() || c.is_ascii_whitespace())
        .collect()
}

pub fn sanitize_filename(input: &str) -> String {
    let invalid_chars = &['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0'];
    input
        .chars()
        .filter(|c| !invalid_chars.contains(c))
        .collect::<String>()
        .trim()
        .to_string()
}
