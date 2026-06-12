import { useEffect, useMemo, useState } from "react";
import { Folder, FolderOpen, FolderPlus, Home, Pencil, Plus, Trash2 } from "lucide-react";
import { useLibrary } from "@/stores/library.store";
import { createFolder, renameFolder, deleteFolderDeep, deleteFolderOnly, moveMedia } from "@/db/repo";
import type { FolderRecord } from "@/db/schema";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RenameDialog } from "@/components/RenameDialog";
import { FolderCreateDialog } from "@/components/FolderCreateDialog";
import { FolderDeleteDialog, type FolderDeleteMode } from "@/components/FolderDeleteDialog";


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
  const [renameTarget, setRenameTarget] = useState<FolderRecord | null>(null);
  const [createFor, setCreateFor] = useState<{ parentId: string | null; parentLabel?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderRecord | null>(null);

  useEffect(() => {
    void refreshFolders();
  }, [refreshFolders]);

  const siblingNamesFor = (parentId: string | null) =>
    folders.filter((f) => f.parentId === parentId).map((f) => f.name);

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
            "group flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs",
            active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
          style={{ paddingLeft: depth * 10 + 6 }}
          title={n.folder.name}
        >
          {active ? <FolderOpen className="h-3.5 w-3.5 shrink-0" /> : <Folder className="h-3.5 w-3.5 shrink-0" />}
          <span className="flex-1 truncate">{n.folder.name}</span>
          <div className="invisible flex items-center gap-0.5 group-hover:visible">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreateFor({ parentId: n.folder.id, parentLabel: n.folder.name });
              }}
              className="cursor-pointer rounded p-0.5 hover:bg-background"
              aria-label="New subfolder"
              title="New subfolder"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenameTarget(n.folder);
              }}
              className="cursor-pointer rounded p-0.5 hover:bg-background"
              aria-label="Rename folder"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(n.folder);
              }}
              className="cursor-pointer rounded p-0.5 hover:bg-background"
              aria-label="Delete folder"
              title="Delete"
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
      <div className="flex shrink-0 items-center justify-between gap-1 px-2 py-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Folders</div>
        <button
          onClick={() =>
            setCreateFor({
              parentId: currentFolderId,
              parentLabel:
                currentFolderId === null
                  ? "All Media"
                  : folders.find((f) => f.id === currentFolderId)?.name,
            })
          }
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-accent"
          aria-label="New folder"
          title="New folder"
        >
          <FolderPlus className="h-3 w-3" />
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        <div
          onClick={() => setFolder(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropMedia(e, null)}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs",
            currentFolderId === null ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
        >
          <Home className="h-3.5 w-3.5" />
          <span className="truncate">All Media</span>
          {selection.size > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground">{selection.size}</span>
          )}
        </div>
        {tree.map((n) => renderNode(n, 0))}
      </div>

      <RenameDialog
        open={!!renameTarget}
        initialName={renameTarget?.name ?? ""}
        title="Folder"
        onCancel={() => setRenameTarget(null)}
        onSubmit={async (name) => {
          if (!renameTarget) return;
          await renameFolder(renameTarget.id, name);
          setRenameTarget(null);
          await refreshFolders();
          toast.success("Folder renamed");
        }}
      />

      <FolderCreateDialog
        open={!!createFor}
        siblingNames={createFor ? siblingNamesFor(createFor.parentId) : []}
        parentLabel={createFor?.parentLabel}
        onCancel={() => setCreateFor(null)}
        onSubmit={async (name) => {
          const parentId = createFor?.parentId ?? null;
          const rec = await createFolder(name, parentId);
          setCreateFor(null);
          await refreshFolders();
          await setFolder(rec.id);
          toast.success(`Folder "${rec.name}" created`);
        }}
      />

      <FolderDeleteDialog
        open={!!deleteTarget}
        folderName={deleteTarget?.name ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async (mode: FolderDeleteMode) => {
          if (!deleteTarget) return;
          if (mode === "folder-and-files") {
            await deleteFolderDeep(deleteTarget.id);
            toast.success("Folder and files deleted");
          } else {
            await deleteFolderOnly(deleteTarget.id);
            toast.success("Folder deleted · files moved to All Media");
          }
          if (currentFolderId === deleteTarget.id) await setFolder(null);
          setDeleteTarget(null);
          await refreshFolders();
          await refreshMedia();
        }}
      />
    </div>
  );
}
