use aws_credential_types::Credentials;
use aws_sdk_s3::{
    config::{BehaviorVersion, Region},
    primitives::ByteStream,
    Config,
};

use crate::models::{Connection, S3Object};

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
                last_modified: obj.last_modified.map(|t| t.fmt(aws_sdk_s3::primitives::DateTimeFormat::DateTime).unwrap_or_default()),
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

pub async fn download_file(conn: &Connection, key: &str, save_path: &str) -> Result<(), String> {
    let client = build_client(conn);
    let resp = client
        .get_object()
        .bucket(&conn.bucket)
        .key(key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let bytes = resp
        .body
        .collect()
        .await
        .map_err(|e| e.to_string())?
        .into_bytes();

    tokio::fs::write(save_path, bytes)
        .await
        .map_err(|e| e.to_string())
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
