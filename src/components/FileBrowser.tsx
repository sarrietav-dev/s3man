import { useState, useEffect, useCallback } from "react";
import {
  Folder,
  File,
  Upload,
  Download,
  Trash2,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  Home,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Connection, S3Object } from "../types";
import { api, pickFilesToUpload, pickSavePath } from "../lib/api";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
  connection: Connection;
}

export function FileBrowser({ connection }: Props) {
  const [prefix, setPrefix] = useState("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteKeys, setDeleteKeys] = useState<string[] | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const items = await api.listObjects(connection.id, prefix);
      setObjects(items);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [connection.id, prefix]);

  useEffect(() => {
    setPrefix("");
    setObjects([]);
    setSelected(new Set());
  }, [connection.id]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(newPrefix: string) {
    setPrefix(newPrefix);
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === objects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(objects.map((o) => o.key)));
    }
  }

  async function handleUpload() {
    const paths = await pickFilesToUpload();
    if (!paths || paths.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const filePath of paths) {
      const filename = filePath.split("/").pop() ?? filePath.split("\\").pop() ?? filePath;
      const key = prefix + filename;
      try {
        await api.uploadFile(connection.id, key, filePath);
        successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${filename}: ${String(err)}`);
      }
    }
    setUploading(false);
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
      load();
    }
  }

  async function handleDownload(key: string) {
    const filename = key.split("/").pop() ?? key;
    const savePath = await pickSavePath(filename);
    if (!savePath) return;
    setDownloadingKey(key);
    try {
      await api.downloadFile(connection.id, key, savePath);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(`Download failed: ${String(err)}`);
    } finally {
      setDownloadingKey(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteKeys) return;
    try {
      if (deleteKeys.length === 1) {
        await api.deleteObject(connection.id, deleteKeys[0]);
      } else {
        await api.deleteObjects(connection.id, deleteKeys);
      }
      toast.success(`Deleted ${deleteKeys.length} item${deleteKeys.length > 1 ? "s" : ""}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(`Delete failed: ${String(err)}`);
    } finally {
      setDeleteKeys(null);
    }
  }

  const breadcrumbs = buildBreadcrumbs(prefix);
  const folders = objects.filter((o) => o.is_prefix);
  const files = objects.filter((o) => !o.is_prefix);

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        connection={connection}
        breadcrumbs={breadcrumbs}
        selected={selected}
        uploading={uploading}
        onNavigate={navigate}
        onUpload={handleUpload}
        onRefresh={load}
        onCreateFolder={() => setFolderDialogOpen(true)}
        onDeleteSelected={() => setDeleteKeys(Array.from(selected))}
      />

      <Separator />

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Folder className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">This folder is empty</p>
            <Button variant="outline" size="sm" onClick={handleUpload} disabled={uploading}>
              <Upload className="h-4 w-4" />
              Upload files
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b border-border">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={selected.size > 0 && selected.size === objects.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left px-2 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground w-28">Size</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground w-44">Modified</th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {folders.map((obj) => (
                <ObjectRow
                  key={obj.key}
                  object={obj}
                  isSelected={selected.has(obj.key)}
                  prefix={prefix}
                  isDownloading={false}
                  onToggle={() => toggleSelect(obj.key)}
                  onNavigate={() => navigate(obj.key)}
                  onDownload={() => handleDownload(obj.key)}
                  onDelete={() => setDeleteKeys([obj.key])}
                />
              ))}
              {files.map((obj) => (
                <ObjectRow
                  key={obj.key}
                  object={obj}
                  isSelected={selected.has(obj.key)}
                  prefix={prefix}
                  isDownloading={downloadingKey === obj.key}
                  onToggle={() => toggleSelect(obj.key)}
                  onNavigate={() => navigate(obj.key)}
                  onDownload={() => handleDownload(obj.key)}
                  onDelete={() => setDeleteKeys([obj.key])}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={!!deleteKeys} onOpenChange={(o) => !o && setDeleteKeys(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteKeys?.length === 1 ? "item" : `${deleteKeys?.length} items`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes from S3. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateFolderDialog
        open={folderDialogOpen}
        prefix={prefix}
        connectionId={connection.id}
        onClose={() => setFolderDialogOpen(false)}
        onCreated={load}
      />
    </div>
  );
}

function Toolbar({
  connection,
  breadcrumbs,
  selected,
  uploading,
  onNavigate,
  onUpload,
  onRefresh,
  onCreateFolder,
  onDeleteSelected,
}: {
  connection: Connection;
  breadcrumbs: { label: string; prefix: string }[];
  selected: Set<string>;
  uploading: boolean;
  onNavigate: (prefix: string) => void;
  onUpload: () => void;
  onRefresh: () => void;
  onCreateFolder: () => void;
  onDeleteSelected: () => void;
}) {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-semibold truncate">{connection.name}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
            <button
              onClick={() => onNavigate("")}
              className="hover:text-foreground transition-colors shrink-0"
              title="Root"
            >
              <Home className="h-3.5 w-3.5" />
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.prefix} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 shrink-0" />
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-foreground font-medium truncate">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => onNavigate(crumb.prefix)}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteSelected}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onCreateFolder}>
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
          <Button variant="outline" size="sm" onClick={onUpload} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </Button>
          <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ObjectRow({
  object,
  isSelected,
  prefix,
  isDownloading,
  onToggle,
  onNavigate,
  onDownload,
  onDelete,
}: {
  object: S3Object;
  isSelected: boolean;
  prefix: string;
  isDownloading: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const displayName = object.key.slice(prefix.length).replace(/\/$/, "");

  return (
    <tr
      className={`group border-b border-border/50 hover:bg-muted/40 transition-colors ${
        isSelected ? "bg-muted/60" : ""
      }`}
    >
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      </td>
      <td className="px-2 py-2">
        <button
          className="flex items-center gap-2 w-full text-left hover:underline"
          onClick={object.is_prefix ? onNavigate : undefined}
        >
          {object.is_prefix ? (
            <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
          ) : (
            <File className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{displayName || object.key}</span>
        </button>
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
        {object.is_prefix ? "—" : formatSize(object.size)}
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground text-xs">
        {object.last_modified ? formatDate(object.last_modified) : "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!object.is_prefix && (
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Download"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CreateFolderDialog({
  open,
  prefix,
  connectionId,
  onClose,
  onCreated,
}: {
  open: boolean;
  prefix: string;
  connectionId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await api.createFolder(connectionId, prefix + trimmed);
      toast.success(`Folder "${trimmed}" created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(`Failed to create folder: ${String(err)}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="folder-name">Folder name</Label>
          <Input
            id="folder-name"
            placeholder="my-folder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildBreadcrumbs(prefix: string): { label: string; prefix: string }[] {
  if (!prefix) return [];
  const parts = prefix.split("/").filter(Boolean);
  return parts.map((part, i) => ({
    label: part,
    prefix: parts.slice(0, i + 1).join("/") + "/",
  }));
}

function formatSize(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
