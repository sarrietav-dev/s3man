use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use rand::RngCore;
use std::path::PathBuf;

use crate::models::Connection;

fn data_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("s3man")
}

fn key_path() -> PathBuf {
    data_dir().join(".key")
}

fn connections_path() -> PathBuf {
    data_dir().join("connections.enc")
}

fn load_or_create_key() -> [u8; 32] {
    let path = key_path();
    std::fs::create_dir_all(path.parent().unwrap()).ok();

    if path.exists() {
        if let Ok(bytes) = std::fs::read(&path) {
            if bytes.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                return key;
            }
        }
    }

    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    std::fs::write(&path, &key).ok();
    key
}

fn encrypt(plaintext: &[u8]) -> Vec<u8> {
    let key_bytes = load_or_create_key();
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .expect("encryption failed");
    let mut out = nonce.to_vec();
    out.extend_from_slice(&ciphertext);
    out
}

fn decrypt(data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < 12 {
        return Err("invalid encrypted data".into());
    }
    let key_bytes = load_or_create_key();
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&data[..12]);
    cipher
        .decrypt(nonce, &data[12..])
        .map_err(|e| e.to_string())
}

pub fn load_connections() -> Vec<Connection> {
    let path = connections_path();
    if !path.exists() {
        return vec![];
    }
    let encrypted = match std::fs::read(&path) {
        Ok(b) => b,
        Err(_) => return vec![],
    };
    let plaintext = match decrypt(&encrypted) {
        Ok(p) => p,
        Err(_) => return vec![],
    };
    serde_json::from_slice(&plaintext).unwrap_or_default()
}

pub fn save_connections(connections: &[Connection]) -> Result<(), String> {
    std::fs::create_dir_all(data_dir()).map_err(|e| e.to_string())?;
    let json = serde_json::to_vec(connections).map_err(|e| e.to_string())?;
    let encrypted = encrypt(&json);
    std::fs::write(connections_path(), encrypted).map_err(|e| e.to_string())
}
