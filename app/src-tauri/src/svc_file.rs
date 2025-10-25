use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(msg: String) -> Self {
        ApiResponse {
            ok: false,
            data: None,
            error: Some(msg),
        }
    }
}

#[tauri::command]
pub fn file_read(path: String) -> ApiResponse<String> {
    match fs::read_to_string(&path) {
        Ok(content) => ApiResponse::success(content),
        Err(e) => ApiResponse::error(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
pub fn file_write(path: String, content: String, create: Option<bool>) -> ApiResponse<()> {
    let should_create = create.unwrap_or(false);

    if !should_create && !Path::new(&path).exists() {
        return ApiResponse::error("File does not exist".to_string());
    }

    // Create parent directories if needed
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return ApiResponse::error(format!("Failed to create parent directories: {}", e));
            }
        }
    }

    match fs::write(&path, content) {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(format!("Failed to write file: {}", e)),
    }
}

#[tauri::command]
pub fn file_list(dir: String, recursive: Option<bool>) -> ApiResponse<Vec<FileInfo>> {
    let is_recursive = recursive.unwrap_or(false);
    let mut files = Vec::new();

    if is_recursive {
        for entry in WalkDir::new(&dir)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            let relative_path = path
                .strip_prefix(&dir)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string();

            if relative_path.is_empty() {
                continue;
            }

            files.push(FileInfo {
                name: entry.file_name().to_string_lossy().to_string(),
                path: relative_path,
                is_dir: path.is_dir(),
                size: entry.metadata().map(|m| m.len()).unwrap_or(0),
            });
        }
    } else {
        match fs::read_dir(&dir) {
            Ok(entries) => {
                for entry in entries.filter_map(|e| e.ok()) {
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();

                    files.push(FileInfo {
                        name: name.clone(),
                        path: name,
                        is_dir: path.is_dir(),
                        size: entry.metadata().map(|m| m.len()).unwrap_or(0),
                    });
                }
            }
            Err(e) => return ApiResponse::error(format!("Failed to read directory: {}", e)),
        }
    }

    ApiResponse::success(files)
}

#[tauri::command]
pub fn file_delete(path: String) -> ApiResponse<()> {
    let file_path = Path::new(&path);

    let result = if file_path.is_dir() {
        fs::remove_dir_all(file_path)
    } else {
        fs::remove_file(file_path)
    };

    match result {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(format!("Failed to delete: {}", e)),
    }
}

#[tauri::command]
pub fn file_rename(old_path: String, new_path: String) -> ApiResponse<()> {
    match fs::rename(&old_path, &new_path) {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(format!("Failed to rename: {}", e)),
    }
}

#[tauri::command]
pub fn file_exists(path: String) -> ApiResponse<bool> {
    ApiResponse::success(Path::new(&path).exists())
}

#[tauri::command]
pub fn create_dir(path: String) -> ApiResponse<()> {
    match fs::create_dir_all(&path) {
        Ok(_) => ApiResponse::success(()),
        Err(e) => ApiResponse::error(format!("Failed to create directory: {}", e)),
    }
}
