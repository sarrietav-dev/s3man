use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub access_key_id: String,
    pub region: String,
    pub secret_access_key: String,
    pub bucket: String,
    pub endpoint_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInput {
    pub name: String,
    pub access_key_id: String,
    pub region: String,
    pub secret_access_key: String,
    pub bucket: String,
    pub endpoint_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: Option<i64>,
    pub last_modified: Option<String>,
    pub is_prefix: bool,
    pub etag: Option<String>,
}
