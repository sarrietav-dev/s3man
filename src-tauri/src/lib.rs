mod models;
mod s3ops;
mod storage;

use models::{BulkUploadItem, Connection, ConnectionInput, S3Object};
use std::sync::Mutex;
use uuid::Uuid;

pub struct AppState {
    pub connections: Mutex<Vec<Connection>>,
}

#[tauri::command]
fn get_connections(state: tauri::State<'_, AppState>) -> Vec<Connection> {
    state.connections.lock().unwrap().clone()
}

#[tauri::command]
fn create_connection(
    input: ConnectionInput,
    state: tauri::State<'_, AppState>,
) -> Result<Connection, String> {
    let conn = Connection {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        access_key_id: input.access_key_id,
        region: input.region,
        secret_access_key: input.secret_access_key,
        bucket: input.bucket,
        endpoint_url: input.endpoint_url,
    };
    let mut connections = state.connections.lock().unwrap();
    connections.push(conn.clone());
    storage::save_connections(&connections)?;
    Ok(conn)
}

#[tauri::command]
fn update_connection(
    id: String,
    input: ConnectionInput,
    state: tauri::State<'_, AppState>,
) -> Result<Connection, String> {
    let mut connections = state.connections.lock().unwrap();
    let pos = connections
        .iter()
        .position(|c| c.id == id)
        .ok_or_else(|| "connection not found".to_string())?;

    connections[pos].name = input.name;
    connections[pos].access_key_id = input.access_key_id;
    connections[pos].region = input.region;
    connections[pos].secret_access_key = input.secret_access_key;
    connections[pos].bucket = input.bucket;
    connections[pos].endpoint_url = input.endpoint_url;

    let updated = connections[pos].clone();
    storage::save_connections(&connections)?;
    Ok(updated)
}

#[tauri::command]
fn delete_connection(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut connections = state.connections.lock().unwrap();
    connections.retain(|c| c.id != id);
    storage::save_connections(&connections)
}

#[tauri::command]
async fn test_connection(id: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::test_connection(&conn).await
}

#[tauri::command]
async fn list_objects(
    connection_id: String,
    prefix: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<S3Object>, String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::list_objects(&conn, &prefix).await
}

#[tauri::command]
async fn upload_file(
    connection_id: String,
    key: String,
    file_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::upload_file(&conn, &key, &file_path).await
}

#[tauri::command]
async fn bulk_upload_files(
    connection_id: String,
    files: Vec<BulkUploadItem>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::upload_files(&conn, files).await
}

#[tauri::command]
async fn download_file(
    connection_id: String,
    key: String,
    save_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::download_file(&conn, &key, &save_path).await
}

#[tauri::command]
async fn bulk_download_files(
    connection_id: String,
    keys: Vec<String>,
    save_path: String,
    base_prefix: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::download_files(&conn, keys, &save_path, &base_prefix).await
}

#[tauri::command]
async fn delete_object(
    connection_id: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::delete_object(&conn, &key).await
}

#[tauri::command]
async fn delete_objects(
    connection_id: String,
    keys: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::delete_objects(&conn, keys).await
}

#[tauri::command]
async fn create_folder(
    connection_id: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let conn = {
        let connections = state.connections.lock().unwrap();
        connections
            .iter()
            .find(|c| c.id == connection_id)
            .cloned()
            .ok_or_else(|| "connection not found".to_string())?
    };
    s3ops::create_folder(&conn, &key).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let connections = storage::load_connections();
    let state = AppState {
        connections: Mutex::new(connections),
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_connections,
            create_connection,
            update_connection,
            delete_connection,
            test_connection,
            list_objects,
            upload_file,
            bulk_upload_files,
            download_file,
            bulk_download_files,
            delete_object,
            delete_objects,
            create_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
