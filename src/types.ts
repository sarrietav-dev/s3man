export interface Connection {
  id: string;
  name: string;
  access_key_id: string;
  region: string;
  secret_access_key: string;
  bucket: string;
  endpoint_url?: string;
}

export interface ConnectionInput {
  name: string;
  access_key_id: string;
  region: string;
  secret_access_key: string;
  bucket: string;
  endpoint_url?: string;
}

export interface S3Object {
  key: string;
  size?: number;
  last_modified?: string;
  is_prefix: boolean;
  etag?: string;
}
