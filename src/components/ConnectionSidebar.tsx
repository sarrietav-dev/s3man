import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  Database,
  Search,
  Command,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Connection } from "../types";
import { api } from "../lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarInput,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from "./ui/sidebar";
import { ConnectionForm } from "@/components/ConnectionForm";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  connections: Connection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onConnectionsChange: (connections: Connection[]) => void;
}

export function ConnectionSidebar({
  connections,
  selectedId,
  onSelect,
  onConnectionsChange,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { setOpenMobile } = useSidebar();

  const filteredConnections = connections.filter((conn) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return (
      conn.name.toLowerCase().includes(search) ||
      conn.bucket.toLowerCase().includes(search)
    );
  });

  function openCreate() {
    setEditingConnection(null);
    setFormOpen(true);
  }

  function openEdit(conn: Connection) {
    setEditingConnection(conn);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.deleteConnection(deleteId);
      const next = connections.filter((c) => c.id !== deleteId);
      onConnectionsChange(next);
      if (selectedId === deleteId && next.length > 0) {
        onSelect(next[0].id);
      } else if (selectedId === deleteId) {
        onSelect(null);
      }
      toast.success("Connection deleted");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleteId(null);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const ok = await api.testConnection(id);
      toast[ok ? "success" : "error"](
        ok ? "Connection successful" : "Connection failed"
      );
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTestingId(null);
    }
  }

  function handleSaved(conn: Connection, isNew: boolean) {
    const next = isNew
      ? [...connections, conn]
      : connections.map((c) => (c.id === conn.id ? conn : c));
    onConnectionsChange(next);
    onSelect(conn.id);
    setFormOpen(false);
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-between px-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-sidebar-primary/15 text-sidebar-primary flex items-center justify-center shrink-0">
                <Database className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-wide truncate group-data-[collapsible=icon]:hidden">
                s3man
              </span>
            </div>
          </div>

          <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <SidebarInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search connections"
                className="pl-8"
                aria-label="Search connections"
              />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Connections</SidebarGroupLabel>
            <SidebarGroupAction onClick={openCreate} title="Add connection">
              <Plus />
            </SidebarGroupAction>

            {connections.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No connections yet. Click + to add one.
              </p>
            ) : filteredConnections.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
                No connections match your search.
              </p>
            ) : (
              <SidebarMenu>
                {filteredConnections.map((conn) => (
                  <SidebarMenuItem key={conn.id}>
                    <SidebarMenuButton
                      isActive={conn.id === selectedId}
                      onClick={() => {
                        onSelect(conn.id);
                        setOpenMobile(false);
                      }}
                      className="h-auto py-2"
                      tooltip={conn.name}
                      aria-label={`Open ${conn.name}`}
                    >
                      <div className="h-6 w-6 rounded bg-sidebar-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-sidebar-primary uppercase">
                        {conn.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium truncate leading-tight">{conn.name}</p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">{conn.bucket}</p>
                      </div>
                    </SidebarMenuButton>

                    <SidebarMenuAction showOnHover>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center justify-center">
                          {testingId === conn.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem onClick={() => handleTest(conn.id)}>
                            <CheckCircle2 className="h-4 w-4" />
                            Test connection
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(conn)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(conn.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-2 py-1 text-[11px] text-muted-foreground flex items-center gap-1.5 group-data-[collapsible=icon]:justify-center">
            <Command className="h-3 w-3" />
            <span className="group-data-[collapsible=icon]:hidden">Ctrl/Cmd + B to toggle</span>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <ConnectionForm
        open={formOpen}
        connection={editingConnection}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the connection config. Your actual S3 data is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
