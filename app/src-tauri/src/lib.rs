// Streetlifting OS — Tauri backend
//
// V1 (Sprint 1–3): minimal — just window + filesystem plugin for save/load.
// V2: license manager (license.rs), Ed25519 crypto (crypto.rs).
// V3: broadcast publisher local HTTP server (publisher/).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running Streetlifting OS");
}
