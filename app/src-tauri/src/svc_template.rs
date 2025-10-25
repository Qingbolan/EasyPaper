use crate::project::ProjectConfig;
use crate::svc_file::ApiResponse;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: Option<String>,
}

const ARTICLE_TEMPLATE: &str = r#"\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}
\usepackage{graphicx}

\title{Your Paper Title}
\author{Your Name}
\date{\today}

\begin{document}

\maketitle

\begin{abstract}
Your abstract goes here.
\end{abstract}

\section{Introduction}
Write your introduction here.

\section{Related Work}
Discuss related work.

\section{Methodology}
Describe your methodology.

\section{Results}
Present your results.

\section{Conclusion}
Conclude your paper.

\bibliographystyle{plain}
\bibliography{refs}

\end{document}
"#;

const IEEE_TEMPLATE: &str = r#"\documentclass[conference]{IEEEtran}
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}

\begin{document}

\title{Conference Paper Title}

\author{\IEEEauthorblockN{Author Name}
\IEEEauthorblockA{\textit{Dept. of Computer Science} \\
\textit{University Name}\\
City, Country \\
email@university.edu}}

\maketitle

\begin{abstract}
This document is a template for IEEE conference papers.
\end{abstract}

\begin{IEEEkeywords}
keyword1, keyword2, keyword3
\end{IEEEkeywords}

\section{Introduction}
Write your introduction here.

\section{Related Work}
Discuss related work.

\section{Proposed Method}
Describe your method.

\section{Experimental Results}
Present your results.

\section{Conclusion}
Conclude your paper.

\bibliographystyle{IEEEtran}
\bibliography{refs}

\end{document}
"#;

const ACM_TEMPLATE: &str = r#"\documentclass[sigconf]{acmart}

\begin{document}

\title{Your Paper Title}

\author{Author Name}
\affiliation{%
  \institution{University Name}
  \city{City}
  \country{Country}
}
\email{email@university.edu}

\begin{abstract}
Your abstract goes here.
\end{abstract}

\keywords{keyword1, keyword2, keyword3}

\maketitle

\section{Introduction}
Write your introduction here.

\section{Related Work}
Discuss related work.

\section{Approach}
Describe your approach.

\section{Evaluation}
Present your evaluation.

\section{Conclusion}
Conclude your paper.

\bibliographystyle{ACM-Reference-Format}
\bibliography{refs}

\end{document}
"#;

const BIB_TEMPLATE: &str = r#"@article{example2024,
  title={Example Paper Title},
  author={Author, First and Author, Second},
  journal={Journal Name},
  year={2024},
  volume={1},
  number={1},
  pages={1--10}
}
"#;

#[tauri::command]
pub fn template_list() -> ApiResponse<Vec<Template>> {
    let templates = vec![
        Template {
            id: "article".to_string(),
            name: "Article".to_string(),
            description: "Basic LaTeX article template".to_string(),
            author: Some("LaTeX".to_string()),
        },
        Template {
            id: "ieeetran".to_string(),
            name: "IEEE Conference".to_string(),
            description: "IEEE conference paper template".to_string(),
            author: Some("IEEE".to_string()),
        },
        Template {
            id: "acmart".to_string(),
            name: "ACM Article".to_string(),
            description: "ACM conference/journal template".to_string(),
            author: Some("ACM".to_string()),
        },
    ];

    ApiResponse::success(templates)
}

#[tauri::command]
pub fn template_apply(project_dir: String, template_id: String, project_name: String) -> ApiResponse<()> {
    let project_path = PathBuf::from(&project_dir);

    // Create project directory
    if let Err(e) = fs::create_dir_all(&project_path) {
        return ApiResponse::error(format!("Failed to create project directory: {}", e));
    }

    // Select template content
    let main_content = match template_id.as_str() {
        "article" => ARTICLE_TEMPLATE,
        "ieeetran" => IEEE_TEMPLATE,
        "acmart" => ACM_TEMPLATE,
        _ => return ApiResponse::error(format!("Unknown template: {}", template_id)),
    };

    // Write main.tex
    let main_path = project_path.join("main.tex");
    if let Err(e) = fs::write(&main_path, main_content) {
        return ApiResponse::error(format!("Failed to write main.tex: {}", e));
    }

    // Write refs.bib
    let bib_path = project_path.join("refs.bib");
    if let Err(e) = fs::write(&bib_path, BIB_TEMPLATE) {
        return ApiResponse::error(format!("Failed to write refs.bib: {}", e));
    }

    // Create figures directory
    let figures_dir = project_path.join("figures");
    if let Err(e) = fs::create_dir_all(&figures_dir) {
        return ApiResponse::error(format!("Failed to create figures directory: {}", e));
    }

    // Create sections directory
    let sections_dir = project_path.join("sections");
    if let Err(e) = fs::create_dir_all(&sections_dir) {
        return ApiResponse::error(format!("Failed to create sections directory: {}", e));
    }

    // Create .easypaper directory
    let easypaper_dir = project_path.join(".easypaper");
    if let Err(e) = fs::create_dir_all(&easypaper_dir) {
        return ApiResponse::error(format!("Failed to create .easypaper directory: {}", e));
    }

    // Create project config
    let config = ProjectConfig {
        version: 1,
        name: project_name,
        main: "main.tex".to_string(),
        ..Default::default()
    };

    if let Err(e) = config.save(&project_dir) {
        return ApiResponse::error(format!("Failed to save project config: {}", e));
    }

    // Create output directory
    let out_dir = project_path.join("out");
    if let Err(e) = fs::create_dir_all(&out_dir) {
        return ApiResponse::error(format!("Failed to create output directory: {}", e));
    }

    // Create .gitignore
    let gitignore_content = r#"# Output files
out/
*.pdf
*.aux
*.log
*.synctex.gz
*.fdb_latexmk
*.fls
*.toc
*.bbl
*.blg

# OS files
.DS_Store
Thumbs.db

# Editor files
*.swp
*.swo
*~

# EasyPaper cache
.easypaper/cache/
"#;
    let gitignore_path = project_path.join(".gitignore");
    if let Err(e) = fs::write(&gitignore_path, gitignore_content) {
        return ApiResponse::error(format!("Failed to write .gitignore: {}", e));
    }

    ApiResponse::success(())
}

#[tauri::command]
pub fn template_get_content(template_id: String) -> ApiResponse<String> {
    let content = match template_id.as_str() {
        "article" => ARTICLE_TEMPLATE,
        "ieeetran" => IEEE_TEMPLATE,
        "acmart" => ACM_TEMPLATE,
        _ => return ApiResponse::error(format!("Unknown template: {}", template_id)),
    };

    ApiResponse::success(content.to_string())
}
