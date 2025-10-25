// Module declarations
mod project;
mod svc_build;
mod svc_file;
mod svc_template;

use svc_build::{build_clean, build_compile};
use svc_file::{create_dir, file_delete, file_exists, file_list, file_read, file_rename, file_write};
use svc_template::{template_apply, template_get_content, template_list};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // File operations
            file_read,
            file_write,
            file_list,
            file_delete,
            file_rename,
            file_exists,
            create_dir,
            // Build operations
            build_compile,
            build_clean,
            // Template operations
            template_list,
            template_apply,
            template_get_content,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
