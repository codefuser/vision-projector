import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Trash2, FolderInput, Copy, Plus, Play, ListPlus } from "lucide-react";
import { FolderTree } from "@/components/FolderTree";
import { Dropzone } from "@/components/Dropzone";
import { Thumb } from "@/components/Thumb";
import { useLibrary, filterMedia, type LibraryFilter } from "@/stores/library.store";
import { useProjection } from "@/stores/projection.store";
import { addMediaToPlaylist, deleteMedia, duplicateMedia, listPlaylists, moveMedia, renameMedia, touchMedia } from "@/db/repo";
import type { MediaRecord, PlaylistRecord } from "@/db/schema";
import { formatBytes, formatDuration } from "@/lib/files";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaPreview } from "./MediaPreview";

const FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
  { value: "recent-added", label: "Recently Added" },
  { value: "recent-used", label: "Recently Used" },
];

export function LibraryPage() {
  const {
    media,
    search,
    filter,
    selection,
    currentFolderId,
    folders,
    setSearch,
    setFilter,
    toggleSelect,
    clearSelection,
    selectAll,
    refreshAll,
    refreshMedia,
  } = useLibrary();
  const { send, openProjector, projectorOpen } = useProjection();
  const [preview, setPreview] = useState<MediaRecord | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [showAddTo, setShowAddTo] = useState(false);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const visible = useMemo(() => filterMedia(media, search, filter), [media, search, filter]);
  const selectedIds = useMemo(() => Array.from(selection), [selection]);

  const projectOne = async (m: MediaRecord) => {
    await touchMedia(m.id);
    if (!projectorOpen) openProjector();
    setTimeout(() => send({ type: "LOAD", mediaId: m.id }), projectorOpen ? 0 : 400);
  };

  const onRename = async (m: MediaRecord) => {
    const name = prompt("Rename", m.name);
    if (!name) return;
    await renameMedia(m.id, name);
    await refreshMedia();
  };

  const onDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} item${selectedIds.length > 1 ? "s" : ""}?`)) return;
    await deleteMedia(selectedIds);
    clearSelection();
    await refreshMedia();
    toast.success("Deleted");
  };

  const onDuplicate = async () => {
    await duplicateMedia(selectedIds);
    await refreshMedia();
    toast.success("Duplicated");
  };

  const onMoveTo = async () => {
    const target = prompt(
      "Move to folder name (leave empty for All Media). Available: " + folders.map((f) => f.name).join(", "),
    );
    if (target === null) return;
    if (target === "") {
      await moveMedia(selectedIds, null);
    } else {
      const f = folders.find((f) => f.name.toLowerCase() === target.toLowerCase());
      if (!f) return toast.error("Folder not found");
      await moveMedia(selectedIds, f.id);
    }
    clearSelection();
    await refreshMedia();
  };

  const onAddToPlaylist = async () => {
    setPlaylists(await listPlaylists());
    setShowAddTo(true);
  };

  return (
    <div className="flex h-full">
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-card/30">
        <FolderTree />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-input bg-background p-0.5">
            <Filter className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition",
                  filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-accent/40 px-4 py-2 text-sm">
            <span className="font-medium">{selectedIds.length} selected</span>
            <button onClick={onAddToPlaylist} className="ml-3 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent">
              <ListPlus className="h-3.5 w-3.5" /> Add to playlist
            </button>
            <button onClick={onMoveTo} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent">
              <FolderInput className="h-3.5 w-3.5" /> Move
            </button>
            <button onClick={onDuplicate} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-destructive hover:bg-destructive/20">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button onClick={clearSelection} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <Dropzone folderId={currentFolderId} onDone={refreshMedia} className="mb-4" />

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <p className="text-sm">No media here yet.</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {visible.length} item{visible.length !== 1 ? "s" : ""}
                </div>
                <button
                  onClick={() => selectAll(visible.map((m) => m.id))}
                  className="hover:text-foreground"
                >
                  Select all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {visible.map((m) => {
                  const selected = selection.has(m.id);
                  return (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={(e) => {
                        const ids = selected ? selectedIds : [m.id];
                        e.dataTransfer.setData("application/x-media-ids", JSON.stringify(ids));
                      }}
                      onClick={(e) => {
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                          toggleSelect(m.id, true);
                        } else {
                          setPreview(m);
                        }
                      }}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition",
                        selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50",
                      )}
                    >
                      <Thumb media={m} className="aspect-video" />
                      <div className="p-2">
                        <div className="truncate text-xs font-medium text-foreground" title={m.name}>
                          {m.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {m.type === "video" ? formatDuration(m.durationMs) : formatBytes(m.size)}
                        </div>
                      </div>
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5 opacity-0 transition group-hover:opacity-100">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(m.id, true);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void projectOne(m);
                          }}
                          className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground shadow"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void onRename(m);
                        }}
                        className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
                      >
                        Rename
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {preview && (
        <MediaPreview
          media={preview}
          onClose={() => setPreview(null)}
          onProject={() => {
            void projectOne(preview);
            setPreview(null);
          }}
        />
      )}

      {showAddTo && (
        <AddToPlaylistDialog
          playlists={playlists}
          mediaIds={selectedIds}
          onClose={() => setShowAddTo(false)}
          onDone={() => {
            setShowAddTo(false);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}

function AddToPlaylistDialog({
  playlists,
  mediaIds,
  onClose,
  onDone,
}: {
  playlists: PlaylistRecord[];
  mediaIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold">Add {mediaIds.length} item(s) to playlist</h3>
        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
          {playlists.length === 0 && <p className="text-sm text-muted-foreground">No playlists yet. Create one first.</p>}
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={async () => {
                await addMediaToPlaylist(p.id, mediaIds);
                toast.success(`Added to ${p.name}`);
                onDone();
              }}
              className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span>{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.items.length} items</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
