use aws_credential_types::Credentials;
use aws_sdk_s3::{
    config::{BehaviorVersion, Region},
    primitives::ByteStream,
    Config,
};
use std::collections::HashSet;
use std::io::Write;
use std::path::{Component, Path};
use tokio::io::AsyncWriteExt;
use zip::write::FileOptions;

use crate::models::{BulkUploadItem, Connection, S3Object};

fn build_client(conn: &Connection) -> aws_sdk_s3::Client {
    let creds = Credentials::new(
        &conn.access_key_id,
        &conn.secret_access_key,
        None,
        None,
        "s3man",
    );

    let has_custom_endpoint = conn
        .endpoint_url
        .as_deref()
        .map(|e| !e.is_empty())
        .unwrap_or(false);

    let mut builder = Config::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(Region::new(conn.region.clone()))
        .credentials_provider(creds);

    if has_custom_endpoint {
        builder = builder
            .endpoint_url(conn.endpoint_url.as_deref().unwrap())
            .force_path_style(true);
    }

    aws_sdk_s3::Client::from_conf(builder.build())
}

pub async fn test_connection(conn: &Connection) -> Result<bool, String> {
    let client = build_client(conn);
    client
        .head_bucket()
        .bucket(&conn.bucket)
        .send()
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

pub async fn list_objects(conn: &Connection, prefix: &str) -> Result<Vec<S3Object>, String> {
    let client = build_client(conn);
    let mut objects: Vec<S3Object> = Vec::new();
    let mut continuation_token: Option<String> = None;

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(&conn.bucket)
            .prefix(prefix)
            .delimiter("/");

        if let Some(ref token) = continuation_token {
            req = req.continuation_token(token);
        }

        let resp = req.send().await.map_err(|e| e.to_string())?;

        for cp in resp.common_prefixes.unwrap_or_default() {
            if let Some(p) = cp.prefix {
                objects.push(S3Object {
                    key: p,
                    size: None,
                    last_modified: None,
                    is_prefix: true,
                    etag: None,
                });
            }
        }

        for obj in resp.contents.unwrap_or_default() {
            let key = obj.key.unwrap_or_default();
            if key == prefix {
                continue;
            }
            objects.push(S3Object {
                key,
                size: obj.size,
                last_modified: obj.last_modified.map(|t| {
                    t.fmt(aws_sdk_s3::primitives::DateTimeFormat::DateTime)
                        .unwrap_or_default()
                }),
                is_prefix: false,
                etag: obj.e_tag,
            });
        }

        if resp.next_continuation_token.is_none() {
            break;
        }
        continuation_token = resp.next_continuation_token;
    }

    Ok(objects)
}

pub async fn upload_file(conn: &Connection, key: &str, file_path: &str) -> Result<(), String> {
    let client = build_client(conn);
    let body = ByteStream::from_path(std::path::Path::new(file_path))
        .await
        .map_err(|e| e.to_string())?;

    client
        .put_object()
        .bucket(&conn.bucket)
        .key(key)
        .body(body)
        .send()
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub async fn upload_files(conn: &Connection, files: Vec<BulkUploadItem>) -> Result<(), String> {
    for file in files {
        upload_file(conn, &file.key, &file.file_path)
            .await
            .map_err(|e| format!("failed to upload '{}': {}", file.key, e))?;
    }
    Ok(())
}

pub async fn download_file(conn: &Connection, key: &str, save_path: &str) -> Result<(), String> {
    let client = build_client(conn);
    let resp = client
        .get_object()
        .bucket(&conn.bucket)
        .key(key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut output = tokio::fs::File::create(save_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut body = resp.body;

    while let Some(chunk) = body.try_next().await.map_err(|e| e.to_string())? {
        output.write_all(&chunk).await.map_err(|e| e.to_string())?;
    }

    output.flush().await.map_err(|e| e.to_string())
}

async fn list_keys_by_prefix(
    client: &aws_sdk_s3::Client,
    bucket: &str,
    prefix: &str,
) -> Result<Vec<String>, String> {
    let mut keys = Vec::new();
    let mut continuation_token: Option<String> = None;

    loop {
        let mut req = client.list_objects_v2().bucket(bucket).prefix(prefix);

        if let Some(ref token) = continuation_token {
            req = req.continuation_token(token);
        }

        let resp = req.send().await.map_err(|e| e.to_string())?;

        for obj in resp.contents.unwrap_or_default() {
            if let Some(key) = obj.key {
                if !key.ends_with('/') {
                    keys.push(key);
                }
            }
        }

        if resp.next_continuation_token.is_none() {
            break;
        }
        continuation_token = resp.next_continuation_token;
    }

    Ok(keys)
}

fn safe_archive_path(key: &str, base_prefix: &str) -> Result<String, String> {
    let rel = key
        .strip_prefix(base_prefix)
        .unwrap_or(key)
        .trim_start_matches('/');
    let rel = if rel.is_empty() { key } else { rel };
    let normalized_rel = rel.replace('\\', "/");
    let rel_path = Path::new(&normalized_rel);
    let unsafe_rel = rel_path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    });

    if unsafe_rel {
        return Err(format!("refusing unsafe archive path for key '{}'", key));
    }

    Ok(normalized_rel)
}

pub async fn download_files(
    conn: &Connection,
    keys: Vec<String>,
    save_path: &str,
    base_prefix: &str,
) -> Result<(), String> {
    if !base_prefix.is_empty() && !base_prefix.ends_with('/') {
        return Err("base_prefix must be empty or end with '/'".to_string());
    }

    let client = build_client(conn);
    let mut expanded_keys = Vec::new();
    let mut selected_folders = Vec::new();

    for key in keys {
        if key.ends_with('/') {
            selected_folders.push(key.clone());
            let mut nested_keys = list_keys_by_prefix(&client, &conn.bucket, &key).await?;
            expanded_keys.append(&mut nested_keys);
        } else {
            expanded_keys.push(key);
        }
    }

    let mut seen = HashSet::new();
    let mut unique_keys = Vec::new();
    for key in expanded_keys {
        if seen.insert(key.clone()) {
            unique_keys.push(key);
        }
    }

    let zip_file = std::fs::File::create(save_path)
        .map_err(|e| format!("failed to create zip file '{}': {}", save_path, e))?;
    let mut zip_writer = zip::ZipWriter::new(zip_file);
    let zip_options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let mut archive_entries = HashSet::new();

    for folder in selected_folders {
        let mut folder_entry = safe_archive_path(&folder, base_prefix)?;
        if !folder_entry.ends_with('/') {
            folder_entry.push('/');
        }

        if archive_entries.insert(folder_entry.clone()) {
            zip_writer
                .add_directory(folder_entry, zip_options)
                .map_err(|e| format!("failed to create zip folder entry '{}': {}", folder, e))?;
        }
    }

    for key in unique_keys {
        let normalized_rel = safe_archive_path(&key, base_prefix)?;

        if !archive_entries.insert(normalized_rel.clone()) {
            return Err(format!(
                "duplicate archive path '{}' generated from key '{}'",
                normalized_rel, key
            ));
        }

        let resp = client
            .get_object()
            .bucket(&conn.bucket)
            .key(&key)
            .send()
            .await
            .map_err(|e| format!("failed to fetch '{}': {}", key, e))?;

        zip_writer
            .start_file(normalized_rel, zip_options)
            .map_err(|e| format!("failed to create zip entry '{}': {}", key, e))?;

        let mut body = resp.body;
        while let Some(chunk) = body
            .try_next()
            .await
            .map_err(|e| format!("failed to read '{}': {}", key, e))?
        {
            zip_writer
                .write_all(&chunk)
                .map_err(|e| format!("failed to write zip entry '{}': {}", key, e))?;
        }
    }

    zip_writer
        .finish()
        .map_err(|e| format!("failed to finalize zip file '{}': {}", save_path, e))?;

    Ok(())
}

pub async fn delete_object(conn: &Connection, key: &str) -> Result<(), String> {
    let client = build_client(conn);
    client
        .delete_object()
        .bucket(&conn.bucket)
        .key(key)
        .send()
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub async fn delete_objects(conn: &Connection, keys: Vec<String>) -> Result<(), String> {
    let client = build_client(conn);
    let objects: Vec<aws_sdk_s3::types::ObjectIdentifier> = keys
        .into_iter()
        .filter_map(|k| {
            aws_sdk_s3::types::ObjectIdentifier::builder()
                .key(k)
                .build()
                .ok()
        })
        .collect();

    let delete = aws_sdk_s3::types::Delete::builder()
        .set_objects(Some(objects))
        .build()
        .map_err(|e| e.to_string())?;

    client
        .delete_objects()
        .bucket(&conn.bucket)
        .delete(delete)
        .send()
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub async fn create_folder(conn: &Connection, key: &str) -> Result<(), String> {
    let client = build_client(conn);
    let folder_key = if key.ends_with('/') {
        key.to_string()
    } else {
        format!("{}/", key)
    };

    client
        .put_object()
        .bucket(&conn.bucket)
        .key(folder_key)
        .body(ByteStream::from_static(b""))
        .send()
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}
