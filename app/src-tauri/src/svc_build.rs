use crate::project::ProjectConfig;
use crate::svc_file::ApiResponse;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildResult {
    pub success: bool,
    pub pdf_path: Option<String>,
    pub log_path: Option<String>,
    pub errors: Vec<BuildError>,
    pub warnings: Vec<BuildWarning>,
    pub duration_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildError {
    pub file: Option<String>,
    pub line: Option<u32>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildWarning {
    pub file: Option<String>,
    pub line: Option<u32>,
    pub message: String,
}

#[tauri::command]
pub fn build_compile(project_dir: String) -> ApiResponse<BuildResult> {
    let start = std::time::Instant::now();

    // Load project configuration
    let config = match ProjectConfig::load(&project_dir) {
        Ok(cfg) => cfg,
        Err(e) => return ApiResponse::error(format!("Failed to load project config: {}", e)),
    };

    // Compile based on engine type
    let result = match config.engine.engine_type.as_str() {
        "tectonic" => compile_with_tectonic(&project_dir, &config),
        "latexmk" => compile_with_latexmk(&project_dir, &config),
        _ => Err(format!("Unknown engine type: {}", config.engine.engine_type)),
    };

    match result {
        Ok(mut build_result) => {
            build_result.duration_ms = start.elapsed().as_millis();
            ApiResponse::success(build_result)
        }
        Err(e) => ApiResponse::error(e),
    }
}

fn compile_with_tectonic(project_dir: &str, config: &ProjectConfig) -> Result<BuildResult, String> {
    // Use Tectonic command-line tool (simpler and more stable)
    let project_path = PathBuf::from(project_dir);
    let out_dir = project_path.join(&config.compile.outdir);

    // Create output directory
    std::fs::create_dir_all(&out_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    // Build tectonic command
    let mut cmd = Command::new("tectonic");
    cmd.current_dir(project_dir);

    // Set output directory
    cmd.arg(format!("--outdir={}", config.compile.outdir));

    // Enable synctex if requested
    if config.compile.synctex {
        cmd.arg("--synctex");
    }

    // Add the main tex file
    cmd.arg(&config.main);

    // Add any custom engine arguments
    for arg in &config.engine.args {
        cmd.arg(arg);
    }

    // Execute command
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute tectonic: {}. Make sure tectonic is installed (brew install tectonic).", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // Parse output for errors and warnings
    let (errors, warnings) = parse_tectonic_output(&stdout, &stderr);

    // Verify PDF was generated
    let pdf_name = config.main.replace(".tex", ".pdf");
    let pdf_path = out_dir.join(&pdf_name);
    let success = output.status.success() && pdf_path.exists();

    Ok(BuildResult {
        success,
        pdf_path: if pdf_path.exists() {
            Some(pdf_path.to_string_lossy().to_string())
        } else {
            None
        },
        log_path: None,
        errors,
        warnings,
        duration_ms: 0,
    })
}

fn compile_with_latexmk(project_dir: &str, config: &ProjectConfig) -> Result<BuildResult, String> {
    let project_path = PathBuf::from(project_dir);
    let out_dir = project_path.join(&config.compile.outdir);

    // Create output directory
    std::fs::create_dir_all(&out_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    // Build latexmk command (fallback option, rarely used now)
    let mut cmd = Command::new("latexmk");
    cmd.current_dir(project_dir);
    cmd.arg("-pdf");
    cmd.arg("-interaction=nonstopmode");

    if config.compile.synctex {
        cmd.arg("-synctex=1");
    }

    if config.compile.shell_escape {
        cmd.arg("-shell-escape");
    }

    cmd.arg(format!("-outdir={}", config.compile.outdir));
    cmd.arg(&config.main);

    // Execute command
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute latexmk: {}. Make sure latexmk is installed.", e))?;

    let _stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let _stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // Parse log file
    let log_name = config.main.replace(".tex", ".log");
    let log_path = out_dir.join(&log_name);
    let (errors, warnings) = if log_path.exists() {
        parse_latex_log(&log_path.to_string_lossy().to_string())
    } else {
        (vec![], vec![])
    };

    let pdf_name = config.main.replace(".tex", ".pdf");
    let pdf_path = out_dir.join(&pdf_name);

    let success = output.status.success() && pdf_path.exists();

    Ok(BuildResult {
        success,
        pdf_path: if pdf_path.exists() {
            Some(pdf_path.to_string_lossy().to_string())
        } else {
            None
        },
        log_path: if log_path.exists() {
            Some(log_path.to_string_lossy().to_string())
        } else {
            None
        },
        errors,
        warnings,
        duration_ms: 0,
    })
}

fn parse_tectonic_output(stdout: &str, stderr: &str) -> (Vec<BuildError>, Vec<BuildWarning>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let combined = format!("{}\n{}", stdout, stderr);

    for line in combined.lines() {
        if line.contains("error:") || line.contains("Error:") {
            errors.push(BuildError {
                file: None,
                line: None,
                message: line.to_string(),
            });
        } else if line.contains("warning:") || line.contains("Warning:") {
            warnings.push(BuildWarning {
                file: None,
                line: None,
                message: line.to_string(),
            });
        }
    }

    (errors, warnings)
}

fn parse_latex_log(log_path: &str) -> (Vec<BuildError>, Vec<BuildWarning>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    if let Ok(content) = std::fs::read_to_string(log_path) {
        let lines: Vec<&str> = content.lines().collect();

        for (i, line) in lines.iter().enumerate() {
            // Simple error detection (LaTeX error pattern)
            if line.starts_with("! ") {
                let message = line.trim_start_matches("! ").to_string();

                // Try to extract file and line from previous lines
                let (file, line_num) = extract_file_line(&lines, i);

                errors.push(BuildError {
                    file,
                    line: line_num,
                    message,
                });
            }
            // Warning detection
            else if line.contains("Warning:") {
                warnings.push(BuildWarning {
                    file: None,
                    line: None,
                    message: line.to_string(),
                });
            }
        }
    }

    (errors, warnings)
}

fn extract_file_line(lines: &[&str], error_idx: usize) -> (Option<String>, Option<u32>) {
    // Look backwards for file and line information
    for i in (0..error_idx).rev().take(5) {
        let line = lines[i];

        // Pattern: ./file.tex:123
        if let Some(pos) = line.find(".tex:") {
            let parts: Vec<&str> = line[..pos+4].split(':').collect();
            if parts.len() >= 2 {
                let file = parts[0].trim_start_matches("./").to_string();
                if let Ok(num) = parts[1].parse::<u32>() {
                    return (Some(file), Some(num));
                }
            }
        }
    }

    (None, None)
}

#[tauri::command]
pub fn build_clean(project_dir: String) -> ApiResponse<()> {
    let config = match ProjectConfig::load(&project_dir) {
        Ok(cfg) => cfg,
        Err(e) => return ApiResponse::error(format!("Failed to load project config: {}", e)),
    };

    let out_dir = PathBuf::from(&project_dir).join(&config.compile.outdir);

    if out_dir.exists() {
        match std::fs::remove_dir_all(&out_dir) {
            Ok(_) => ApiResponse::success(()),
            Err(e) => ApiResponse::error(format!("Failed to clean output directory: {}", e)),
        }
    } else {
        ApiResponse::success(())
    }
}
