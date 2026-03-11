import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Connection, ConnectionInput } from "../types";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";

interface Props {
  open: boolean;
  connection: Connection | null;
  onClose: () => void;
  onSaved: (conn: Connection, isNew: boolean) => void;
}

const EMPTY_FORM: ConnectionInput = {
  name: "",
  access_key_id: "",
  region: "",
  secret_access_key: "",
  bucket: "",
  endpoint_url: "",
};

export function ConnectionForm({ open, connection, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ConnectionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const isNew = !connection;

  useEffect(() => {
    if (open) {
      setForm(
        connection
          ? {
              name: connection.name,
              access_key_id: connection.access_key_id,
              region: connection.region,
              secret_access_key: connection.secret_access_key,
              bucket: connection.bucket,
              endpoint_url: connection.endpoint_url ?? "",
            }
          : EMPTY_FORM
      );
    }
  }, [open, connection]);

  function set(field: keyof ConnectionInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function normalizedForm(): ConnectionInput {
    return {
      ...form,
      endpoint_url: form.endpoint_url?.trim() || undefined,
    };
  }

  async function handleSave() {
    if (!form.name || !form.access_key_id || !form.secret_access_key || !form.bucket || !form.region) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const input = normalizedForm();
      const saved = isNew
        ? await api.createConnection(input)
        : await api.updateConnection(connection!.id, input);
      toast.success(isNew ? "Connection created" : "Connection updated");
      onSaved(saved, isNew);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!form.name || !form.access_key_id || !form.secret_access_key || !form.bucket || !form.region) {
      toast.error("Please fill in all required fields before testing");
      return;
    }
    if (isNew) {
      toast.info("Save the connection first, then test it from the sidebar");
      return;
    }
    setTesting(true);
    try {
      const ok = await api.testConnection(connection!.id);
      toast[ok ? "success" : "error"](ok ? "Connection successful" : "Connection failed");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "New Connection" : "Edit Connection"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <FormField label="Name *" htmlFor="name">
            <Input
              id="name"
              placeholder="My Bucket"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Access Key ID *" htmlFor="access_key_id">
              <Input
                id="access_key_id"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={form.access_key_id}
                onChange={(e) => set("access_key_id", e.target.value)}
              />
            </FormField>
            <FormField label="Secret Access Key *" htmlFor="secret_access_key">
              <Input
                id="secret_access_key"
                type="password"
                placeholder="••••••••"
                value={form.secret_access_key}
                onChange={(e) => set("secret_access_key", e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Region *" htmlFor="region">
              <Input
                id="region"
                placeholder="us-east-1"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
              />
            </FormField>
            <FormField label="Bucket *" htmlFor="bucket">
              <Input
                id="bucket"
                placeholder="my-bucket-name"
                value={form.bucket}
                onChange={(e) => set("bucket", e.target.value)}
              />
            </FormField>
          </div>

          <FormField
            label="Endpoint URL"
            htmlFor="endpoint_url"
            hint="Leave empty for AWS S3. Set for MinIO or compatible."
          >
            <Input
              id="endpoint_url"
              placeholder="https://minio.example.com"
              value={form.endpoint_url ?? ""}
              onChange={(e) => set("endpoint_url", e.target.value)}
            />
          </FormField>
        </div>

        <DialogFooter className="gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              Test
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
