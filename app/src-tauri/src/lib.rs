// Streetlifting OS — Tauri backend
//
// V1 (Sprint 1–3): minimal — just window + filesystem plugin for save/load.
// V2: license manager (license.rs), Ed25519 crypto (crypto.rs).
// V3: broadcast publisher local HTTP server (publisher/).

use serde::Serialize;
use serde_json::Value;

const ISF_FINAL_PROTOCOL_ENDPOINT: &str = "https://streetlifting.app/api/isf/v1/protocols/final";
const MAX_PROTOCOL_BYTES: usize = 5 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FinalProtocolUploadResponse {
    status: u16,
    body: Value,
}

/// The service token stays in the native process; browser-origin calls are prohibited.
#[tauri::command]
async fn upload_final_protocol(
    service_token: String,
    envelope: Value,
) -> Result<FinalProtocolUploadResponse, String> {
    let token = service_token.trim();
    if token.len() < 24 || !token.starts_with("slisf_") {
        return Err("A valid ISF service token is required".to_string());
    }

    let encoded = serde_json::to_vec(&envelope)
        .map_err(|_| "The signed protocol cannot be encoded".to_string())?;
    if encoded.len() > MAX_PROTOCOL_BYTES {
        return Err("The signed protocol exceeds the 5 MB upload limit".to_string());
    }

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|_| "Unable to initialize the secure ISF transport".to_string())?;
    let response = client
        .post(ISF_FINAL_PROTOCOL_ENDPOINT)
        .bearer_auth(token)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(encoded)
        .send()
        .await
        .map_err(|_| "ISF protocol upload could not reach the federation service".to_string())?;
    let status = response.status().as_u16();
    let body = response.json::<Value>().await.unwrap_or(Value::Null);

    Ok(FinalProtocolUploadResponse { status, body })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![upload_final_protocol])
        .run(tauri::generate_context!())
        .expect("error while running Streetlifting OS");
}
