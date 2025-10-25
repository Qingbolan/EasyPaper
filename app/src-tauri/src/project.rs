use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub version: u32,
    pub name: String,
    pub main: String,
    pub engine: EngineConfig,
    pub compile: CompileConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineConfig {
    #[serde(rename = "type")]
    pub engine_type: String, // "tectonic" or "latexmk"
    #[serde(default)]
    pub args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompileConfig {
    #[serde(default = "default_true")]
    pub synctex: bool,
    #[serde(default)]
    pub shell_escape: bool,
    #[serde(default = "default_outdir")]
    pub outdir: String,
    #[serde(default = "default_min_interval")]
    pub min_interval_ms: u64,
}

fn default_true() -> bool {
    true
}

fn default_outdir() -> String {
    "out".to_string()
}

fn default_min_interval() -> u64 {
    600
}

impl Default for ProjectConfig {
    fn default() -> Self {
        ProjectConfig {
            version: 1,
            name: "My Paper".to_string(),
            main: "main.tex".to_string(),
            engine: EngineConfig {
                engine_type: "tectonic".to_string(),
                args: vec![],
            },
            compile: CompileConfig {
                synctex: true,
                shell_escape: false,
                outdir: "out".to_string(),
                min_interval_ms: 600,
            },
        }
    }
}

impl ProjectConfig {
    pub fn load(project_dir: &str) -> Result<Self, String> {
        let config_path = PathBuf::from(project_dir)
            .join(".easypaper")
            .join("project.yml");

        if !config_path.exists() {
            return Ok(ProjectConfig::default());
        }

        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read project config: {}", e))?;

        serde_yaml::from_str(&content)
            .map_err(|e| format!("Failed to parse project config: {}", e))
    }

    pub fn save(&self, project_dir: &str) -> Result<(), String> {
        let easypaper_dir = PathBuf::from(project_dir).join(".easypaper");
        std::fs::create_dir_all(&easypaper_dir)
            .map_err(|e| format!("Failed to create .easypaper directory: {}", e))?;

        let config_path = easypaper_dir.join("project.yml");
        let content = serde_yaml::to_string(self)
            .map_err(|e| format!("Failed to serialize project config: {}", e))?;

        std::fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write project config: {}", e))
    }
}
