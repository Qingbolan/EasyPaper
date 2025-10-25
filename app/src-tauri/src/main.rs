// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Delegate to the library entrypoint where all commands/plugins are registered.
    // This ensures commands like `template_apply` are available at runtime.
    easy_paper_lib::run();
}
