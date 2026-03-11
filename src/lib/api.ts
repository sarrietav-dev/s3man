import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Connection, ConnectionInput, S3Object } from "../types";

type BulkUploadItem = {
  key: string;
  filePath: string;
};

export const api = {
  getConnections: (): Promise<Connection[]> => invoke("get_connections"),

  createConnection: (input: ConnectionInput): Promise<Connection> =>
    invoke("create_connection", { input }),

  updateConnection: (id: string, input: ConnectionInput): Promise<Connection> =>
    invoke("update_connection", { id, input }),

  deleteConnection: (id: string): Promise<void> =>
    invoke("delete_connection", { id }),

  testConnection: (id: string): Promise<boolean> =>
    invoke("test_connection", { id }),

  listObjects: (connectionId: string, prefix: string): Promise<S3Object[]> =>
    invoke("list_objects", { connectionId, prefix }),

  uploadFile: (connectionId: string, key: string, filePath: string): Promise<void> =>
    invoke("upload_file", { connectionId, key, filePath }),

  bulkUploadFiles: (connectionId: string, files: BulkUploadItem[]): Promise<void> =>
    invoke("bulk_upload_files", { connectionId, files }),

  downloadFile: (connectionId: string, key: string, savePath: string): Promise<void> =>
    invoke("download_file", { connectionId, key, savePath }),

  bulkDownloadFiles: (
    connectionId: string,
    keys: string[],
    savePath: string,
    basePrefix: string
  ): Promise<void> => invoke("bulk_download_files", { connectionId, keys, savePath, basePrefix }),

  deleteObject: (connectionId: string, key: string): Promise<void> =>
    invoke("delete_object", { connectionId, key }),

  deleteObjects: (connectionId: string, keys: string[]): Promise<void> =>
    invoke("delete_objects", { connectionId, keys }),

  createFolder: (connectionId: string, key: string): Promise<void> =>
    invoke("create_folder", { connectionId, key }),
};

export async function pickFilesToUpload(): Promise<string[] | null> {
  const result = await open({ multiple: true });
  if (!result) return null;
  return Array.isArray(result) ? result : [result];
}

export async function pickSavePath(filename: string): Promise<string | null> {
  return save({ defaultPath: filename });
}
