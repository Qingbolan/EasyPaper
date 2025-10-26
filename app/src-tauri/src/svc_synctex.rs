use serde::{Deserialize, Serialize};
use std::process::Command;
use crate::svc_file::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTexResult {
    pub file: String,
    pub line: i32,
    pub column: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTexPdfPos {
    pub page: i32,
    pub x: f64,
    pub y: f64,
}

/// Query synctex to find the source location from PDF coordinates
/// Uses synctex view command: synctex view -i page:x:y:pdffile
#[tauri::command]
pub fn synctex_forward(
    pdf_path: String,
    page: i32,
    x: f64,
    y: f64,
) -> ApiResponse<SyncTexResult> {
    // Try to find synctex in common locations
    let synctex_paths = vec![
        "synctex",                           // In PATH
        "/opt/homebrew/bin/synctex",        // Homebrew ARM Mac
        "/usr/local/bin/synctex",           // Homebrew Intel Mac
        "/Library/TeX/texbin/synctex",      // MacTeX default
        "/usr/local/texlive/2025/bin/universal-darwin/synctex",
        "/usr/local/texlive/2024/bin/universal-darwin/synctex",
        "/usr/local/texlive/2023/bin/universal-darwin/synctex",
    ];

    let mut synctex_cmd = None;
    for path in synctex_paths {
        if std::path::Path::new(path).exists() || path == "synctex" {
            synctex_cmd = Some(path);
            break;
        }
    }

    let synctex_bin = match synctex_cmd {
        Some(cmd) => cmd,
        None => {
            // SyncTeX not available - return a helpful error but don't spam console
            return ApiResponse::error("SyncTeX not installed. Please install MacTeX or TeX Live.".to_string());
        }
    };

    // Build synctex command
    // synctex view -i "page:x:y:pdffile"
    let query = format!("{}:{}:{}:{}", page, x, y, pdf_path);

    let output = match Command::new(synctex_bin)
        .arg("view")
        .arg("-i")
        .arg(&query)
        .output()
    {
        Ok(output) => output,
        Err(e) => {
            return ApiResponse::error(format!("Failed to run synctex: {}", e));
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return ApiResponse::error(format!("Synctex command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse synctex output
    // Output format:
    // SyncTeX result begin
    // Output:path/to/file.tex
    // Line:123
    // Column:45
    // ...

    let mut file = String::new();
    let mut line = 0;
    let mut column = 0;

    for line_str in stdout.lines() {
        if line_str.starts_with("Output:") {
            file = line_str.trim_start_matches("Output:").to_string();
        } else if line_str.starts_with("Line:") {
            if let Ok(l) = line_str.trim_start_matches("Line:").parse() {
                line = l;
            }
        } else if line_str.starts_with("Column:") {
            if let Ok(c) = line_str.trim_start_matches("Column:").parse() {
                column = c;
            }
        }
    }

    if file.is_empty() {
        return ApiResponse::error("Could not find source location".to_string());
    }

    ApiResponse::success(SyncTexResult { file, line, column })
}

/// Query synctex to find the PDF location from source line/column
/// synctex view -i "line:column:sourcefile" -o pdffile
#[tauri::command]
pub fn synctex_backward(
    source_path: String,
    line: i32,
    column: i32,
    pdf_path: String,
) -> ApiResponse<SyncTexPdfPos> {
    // Try to find synctex in common locations
    let synctex_paths = vec![
        "synctex",                           // In PATH
        "/opt/homebrew/bin/synctex",        // Homebrew ARM Mac
        "/usr/local/bin/synctex",           // Homebrew Intel Mac
        "/Library/TeX/texbin/synctex",      // MacTeX default
        "/usr/local/texlive/2025/bin/universal-darwin/synctex",
        "/usr/local/texlive/2024/bin/universal-darwin/synctex",
        "/usr/local/texlive/2023/bin/universal-darwin/synctex",
    ];

    let mut synctex_cmd = None;
    for path in synctex_paths {
        if std::path::Path::new(path).exists() || path == "synctex" {
            synctex_cmd = Some(path);
            break;
        }
    }

    let synctex_bin = match synctex_cmd {
        Some(cmd) => cmd,
        None => {
            return ApiResponse::error("SyncTeX not installed. Please install MacTeX or TeX Live.".to_string());
        }
    };

    let input = format!("{}:{}:{}", line, column, source_path);

    let output = match Command::new(synctex_bin)
        .arg("view")
        .arg("-i")
        .arg(&input)
        .arg("-o")
        .arg(&pdf_path)
        .output()
    {
        Ok(output) => output,
        Err(e) => {
            return ApiResponse::error(format!("Failed to run synctex: {}", e));
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return ApiResponse::error(format!("Synctex command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse output looking for Page, x, y
    let mut page: i32 = 1;
    let mut x: f64 = 0.0;
    let mut y: f64 = 0.0;

    for line in stdout.lines() {
        if let Some(v) = line.strip_prefix("Page:") {
            if let Ok(p) = v.trim().parse() { page = p; }
        } else if let Some(v) = line.strip_prefix("x:") {
            if let Ok(val) = v.trim().parse() { x = val; }
        } else if let Some(v) = line.strip_prefix("y:") {
            if let Ok(val) = v.trim().parse() { y = val; }
        }
    }

    ApiResponse::success(SyncTexPdfPos { page, x, y })
}
