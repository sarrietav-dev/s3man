import { useState, useEffect } from "react";
import "./App.css";
import { Toaster } from "./components/ui/sonner";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { ConnectionSidebar } from "./components/ConnectionSidebar";
import { FileBrowser } from "./components/FileBrowser";
import { api } from "./lib/api";
import { Connection } from "./types";

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.getConnections().then(setConnections);
  }, []);

  const selectedConnection = connections.find((c) => c.id === selectedId) ?? null;

  return (
    <SidebarProvider>
      <ConnectionSidebar
        connections={connections}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onConnectionsChange={setConnections}
      />
      <SidebarInset>
        {selectedConnection ? (
          <FileBrowser connection={selectedConnection} />
        ) : (
          <EmptyState hasConnections={connections.length > 0} />
        )}
      </SidebarInset>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}

function EmptyState({ hasConnections }: { hasConnections: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-2">
        <div className="text-4xl">🪣</div>
        <p className="text-muted-foreground text-sm">
          {hasConnections
            ? "Select a connection to browse files"
            : "Add a connection to get started"}
        </p>
      </div>
    </div>
  );
}

export default App;
