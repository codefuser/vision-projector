import { useEffect, useMemo, useState } from "react";
import { Folder, FolderOpen, FolderPlus, Home, Pencil, Trash2 } from "lucide-react";
import { useLibrary } from "@/stores/library.store";
import { createFolder, renameFolder, deleteFolderDeep, moveMedia } from "@/db/repo";
import type { FolderRecord } from "@/db/schema";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Node {
  folder: FolderRecord;
  children: Node[];
}

function buildTree(folders: FolderRecord[]): Node[] {
  const byParent = new Map<string | null, FolderRecord[]>();
  for (const f of folders) {
    const arr = byParent.get(f.parentId) ?? [];
    arr.push(f);
    byParent.set(f.parentId, arr);
  }
  const make = (parentId: string | null): Node[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({ folder, children: make(folder.id) }));
  return make(null);
}

export function FolderTree() {
  const folders = useLibrary((s) => s.folders);
  const currentFolderId = useLibrary((s) => s.currentFolderId);
  const setFolder = useLibrary((s) => s.setFolder);
  const refreshFolders = useLibrary((s) => s.refreshFolders);
  const refreshMedia = useLibrary((s) => s.refreshMedia);
  const selection = useLibrary((s) => s.selection);
  const clearSelection = useLibrary((s) => s.clearSelection);

  const tree = useMemo(() => buildTree(folders), [folders]);

  useEffect(() => {
    void refreshFolders();
  }, [refreshFolders]);

  const onCreate = async (parentId: string | null) => {
    const name = prompt("Folder name");
    if (!name) return;
    await createFolder(name, parentId);
    await refreshFolders();
  };

  const onDropMedia = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const ids = e.dataTransfer.getData("application/x-media-ids");
    if (!ids) return;
    const parsed = JSON.parse(ids) as string[];
    await moveMedia(parsed, folderId);
    clearSelection();
    await refreshMedia();
    toast.success(`Moved ${parsed.length} item${parsed.length > 1 ? "s" : ""}`);
  };

  const renderNode = (n: Node, depth: number) => {
    const active = currentFolderId === n.folder.id;
    return (
      <div key={n.folder.id}>
        <div
          onClick={() => setFolder(n.folder.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropMedia(e, n.folder.id)}
          className={cn(
            "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
            active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {active ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
          <span className="flex-1 truncate">{n.folder.name}</span>
          <div className="invisible flex items-center gap-1 group-hover:visible">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const name = prompt("Rename folder", n.folder.name);
                if (name) renameFolder(n.folder.id, name).then(refreshFolders);
              }}
              className="rounded p-0.5 hover:bg-background"
              aria-label="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${n.folder.name}" and all its contents?`)) {
                  deleteFolderDeep(n.folder.id).then(() => {
                    if (currentFolderId === n.folder.id) setFolder(null);
                    refreshFolders();
                    refreshMedia();
                  });
                }
              }}
              className="rounded p-0.5 hover:bg-background"
              aria-label="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {n.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folders</div>
        <button
          onClick={() => onCreate(currentFolderId)}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="New folder"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        <div
          onClick={() => setFolder(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropMedia(e, null)}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm",
            currentFolderId === null ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
        >
          <Home className="h-4 w-4" />
          <span>All Media</span>
          {selection.size > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{selection.size} selected</span>
          )}
        </div>
        {tree.map((n) => renderNode(n, 0))}
      </div>
    </div>
  );
}
