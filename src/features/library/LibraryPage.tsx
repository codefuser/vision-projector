import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, Trash2, FolderInput, Copy, ListPlus, Pencil, Info, Eye, PanelLeftClose, FolderTree as FolderTreeIcon, Star } from "lucide-react";
import { FolderTree } from "@/components/FolderTree";
import { Dropzone } from "@/components/Dropzone";
import { Thumb } from "@/components/Thumb";
import { useLibrary, filterMedia, type LibraryFilter } from "@/stores/library.store";
import { useMediaFavorites } from "@/stores/media-favorites.store";
import { addMediaToPlaylist, deleteMedia, duplicateMedia, listPlaylists, moveMedia, renameMedia } from "@/db/repo";
import type { MediaRecord, PlaylistRecord } from "@/db/schema";
import { formatBytes, formatDuration } from "@/lib/files";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaAdapter } from "@/projection";
import { MediaPreview } from "./MediaPreview";
import { RenameDialog } from "@/components/RenameDialog";
import { MediaDeleteDialog } from "@/components/MediaDeleteDialog";
import { MoveMediaDialog } from "@/components/MoveMediaDialog";
import { MediaDetailsDialog } from "@/components/MediaDetailsDialog";

const FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
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
  const favIds = useMediaFavorites((s) => s.ids);
  const toggleFav = useMediaFavorites((s) => s.toggle);
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const [preview, setPreview] = useState<MediaRecord | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [showAddTo, setShowAddTo] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MediaRecord | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<MediaRecord | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<MediaRecord[] | null>(null);
  const [showMove, setShowMove] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [foldersCollapsed, setFoldersCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("church-media-folders-collapsed-v1") === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("church-media-folders-collapsed-v1", foldersCollapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [foldersCollapsed]);

  const anchorIndexRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const visible = useMemo(() => filterMedia(media, search, filter), [media, search, filter]);
  const selectedIds = useMemo(() => Array.from(selection), [selection]);

  useEffect(() => {
    if (selectionMode && selection.size === 0) setSelectionMode(false);
  }, [selection, selectionMode]);

  const projectOne = useCallback(async (m: MediaRecord) => {
    await MediaAdapter.projectMedia(m);
  }, []);

  const handleTileClick = useCallback(
    (e: React.MouseEvent, m: MediaRecord, index: number) => {
      if (selectionMode) {
        if (e.shiftKey) {
          const anchor = anchorIndexRef.current ?? index;
          const [start, end] = anchor <= index ? [anchor, index] : [index, anchor];
          const ids = visible.slice(start, end + 1).map((x) => x.id);
          selectAll(ids);
          return;
        }
        anchorIndexRef.current = index;
        toggleSelect(m.id, true);
        return;
      }
      anchorIndexRef.current = index;
      void projectOne(m);
    },
    [projectOne, selectAll, selectionMode, toggleSelect, visible],
  );

  const enterSelectionWith = useCallback(
    (m: MediaRecord, index: number) => {
      setSelectionMode(true);
      anchorIndexRef.current = index;
      toggleSelect(m.id, true);
    },
    [toggleSelect],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        const grid = gridRef.current;
        if (!grid) return;
        e.preventDefault();
        selectAll(visible.map((m) => m.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectAll, visible]);

  const requestDeleteSelection = () => {
    if (!selectedIds.length) return;
    const items = visible.filter((m) => selection.has(m.id));
    if (items.length) setDeleteTargets(items);
  };

  const confirmDelete = async () => {
    if (!deleteTargets) return;
    await deleteMedia(deleteTargets.map((m) => m.id));
    setDeleteTargets(null);
    clearSelection();
    await refreshMedia();
    toast.success("Deleted");
  };

  const onDuplicate = async () => {
    await duplicateMedia(selectedIds);
    await refreshMedia();
    toast.success("Duplicated");
  };

  const confirmMove = async (folderId: string | null) => {
    await moveMedia(selectedIds, folderId);
    setShowMove(false);
    clearSelection();
    await refreshMedia();
    toast.success("Moved");
  };

  const onAddToPlaylist = async () => {
    setPlaylists(await listPlaylists());
    setShowAddTo(true);
  };

  const onRenameSubmit = async (name: string) => {
    if (!renameTarget) return;
    await renameMedia(renameTarget.id, name);
    setRenameTarget(null);
    await refreshMedia();
    toast.success("Renamed");
  };

  // Group "All" and "Recently Added" by upload date (Today / Yesterday / Last Week / explicit date).
  const grouped = useMemo(() => {
    if (filter !== "all" && filter !== "recent-added") return null;
    const sorted = [...visible].sort((a, b) => b.createdAt - a.createdAt);
    const groups = new Map<string, MediaRecord[]>();
    const order: string[] = [];
    const today = startOfDay(Date.now());
    const yesterday = today - 86400000;
    const lastWeekStart = today - 7 * 86400000;
    for (const m of sorted) {
      const day = startOfDay(m.createdAt);
      let label: string;
      if (day === today) label = "Today";
      else if (day === yesterday) label = "Yesterday";
      else if (day >= lastWeekStart) label = "Last Week";
      else label = new Date(day).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      if (!groups.has(label)) {
        groups.set(label, []);
        order.push(label);
      }
      groups.get(label)!.push(m);
    }
    return order.map((label) => ({ label, items: groups.get(label)! }));
  }, [filter, visible]);

  const renderCard = (m: MediaRecord, idx: number) => {
    const selected = selection.has(m.id);
    return (
      <div
        key={m.id}
        draggable
        onDragStart={(e) => {
          const ids = selected ? selectedIds : [m.id];
          e.dataTransfer.setData("application/x-media-ids", JSON.stringify(ids));
        }}
        onClick={(e) => handleTileClick(e, m, idx)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!selectionMode) setPreview(m);
        }}
        title={
          selectionMode
            ? "Click to select · Shift-click range"
            : "Click to project · Double-click to preview"
        }
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50",
        )}
      >
        {/* Thumbnail area — badges live on the image; hover actions float at bottom-right of the thumbnail (never the metadata) */}
        <div className="relative">
          <Thumb media={m} className="aspect-video" />

          {/* Top-left checkbox */}
          <div
            className={cn(
              "absolute left-1.5 top-1.5 transition",
              selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                if (!selectionMode) enterSelectionWith(m, idx);
                else {
                  anchorIndexRef.current = idx;
                  toggleSelect(m.id, true);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
              title={selectionMode ? "Toggle selection" : "Enter selection mode"}
            />
          </div>

          {/* Persistent video badge — top-right */}
          {m.type === "video" && (
            <div className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              <span>VIDEO</span>
              <span className="opacity-70">·</span>
              <span className="tabular-nums">{formatDuration(m.durationMs)}</span>
            </div>
          )}

          {/* Favorite star — persistent. Always visible when favorited; appears
              on hover otherwise. Offset below the video badge when present. */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(m.id);
            }}
            title={favSet.has(m.id) ? "Unfavorite" : "Favorite"}
            aria-label={favSet.has(m.id) ? "Unfavorite" : "Favorite"}
            className={cn(
              "absolute right-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur transition hover:bg-background",
              m.type === "video" ? "top-9" : "top-1.5",
              favSet.has(m.id) ? "text-amber-500 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100",
            )}
          >
            <Star className={cn("h-3.5 w-3.5", favSet.has(m.id) && "fill-current")} />
          </button>

          {/* Hover actions — anchored to the thumbnail bottom-right so they never cover filename/size metadata */}
          {!selectionMode && (
            <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center justify-end gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
              <CardAction label="Preview" onClick={() => setPreview(m)}>
                <Eye className="h-3 w-3" />
              </CardAction>
              <CardAction label="Details" onClick={() => setDetailsTarget(m)}>
                <Info className="h-3 w-3" />
              </CardAction>
              <CardAction label="Rename" onClick={() => setRenameTarget(m)}>
                <Pencil className="h-3 w-3" />
              </CardAction>
              <CardAction label="Delete" variant="danger" onClick={() => setDeleteTargets([m])}>
                <Trash2 className="h-3 w-3" />
              </CardAction>
            </div>
          )}
        </div>

        {/* Metadata — slightly taller for breathing room; never covered by hover actions */}
        <div className="px-3 py-2.5">
          <div className="truncate text-[13px] font-medium text-foreground" title={m.name}>
            {m.name}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
            {m.type === "video" ? (
              <>
                <span className="rounded bg-muted px-1 text-[9px] font-bold uppercase tracking-wide">Video</span>
                <span className="tabular-nums">{formatDuration(m.durationMs)}</span>
                <span className="tabular-nums">{formatBytes(m.size)}</span>
              </>
            ) : (
              <>
                <span className="rounded bg-muted px-1 text-[9px] font-bold uppercase tracking-wide">Image</span>
                <span className="tabular-nums">{formatBytes(m.size)}</span>
              </>
            )}
          </div>
        </div>

      </div>
    );
  };


  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative max-w-md flex-1">
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
                "cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition",
                filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside
          style={{ width: foldersCollapsed ? 36 : 180, willChange: "width" }}
          className="relative flex shrink-0 flex-col overflow-hidden border-r border-border bg-card/30 transition-[width] duration-200 ease-out"
        >
          {foldersCollapsed ? (
            <button
              onClick={() => setFoldersCollapsed(false)}
              title="Expand folders"
              aria-label="Expand folders"
              className="mt-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center self-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <FolderTreeIcon className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setFoldersCollapsed(true)}
                title="Collapse folders"
                aria-label="Collapse folders"
                className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
              <FolderTree />
            </>
          )}
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          {(selectionMode || selectedIds.length > 0) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-accent/40 px-4 py-2 text-sm">
              <span className="font-medium">
                {selectedIds.length} selected
                <span className="ml-2 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  Selection mode
                </span>
              </span>
              <button onClick={onAddToPlaylist} className="ml-3 inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent">
                <ListPlus className="h-3.5 w-3.5" /> Add to playlist
              </button>
              <button onClick={() => setShowMove(true)} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent">
                <FolderInput className="h-3.5 w-3.5" /> Move
              </button>
              <button onClick={onDuplicate} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              {selectedIds.length === 1 && (
                <button
                  onClick={() => {
                    const m = visible.find((x) => x.id === selectedIds[0]);
                    if (m) setRenameTarget(m);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
              )}
              <button onClick={requestDeleteSelection} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-destructive hover:bg-destructive/20">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button
                onClick={() => {
                  clearSelection();
                  setSelectionMode(false);
                }}
                className="ml-auto cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              >
                Exit selection
              </button>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) clearSelection();
            }}
          >
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
                    {!selectionMode && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        Click to project
                      </span>
                    )}
                  </div>
                  {!selectionMode ? (
                    <button
                      onClick={() => setSelectionMode(true)}
                      className="cursor-pointer hover:text-foreground"
                    >
                      Select
                    </button>
                  ) : (
                    <button
                      onClick={() => selectAll(visible.map((m) => m.id))}
                      className="cursor-pointer hover:text-foreground"
                    >
                      Select all
                    </button>
                  )}
                </div>

                <div ref={gridRef}>
                  {grouped ? (
                    grouped.map((g) => (
                      <section key={g.label} className="mb-5">
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {g.label}
                          <span className="ml-2 text-[10px] font-normal opacity-70">{g.items.length}</span>
                        </h3>
                        <div
                          className="grid gap-3"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}
                        >
                          {g.items.map((m) => renderCard(m, visible.indexOf(m)))}
                        </div>
                      </section>
                    ))
                  ) : (
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}
                    >
                      {visible.map((m, idx) => renderCard(m, idx))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
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

      <RenameDialog
        open={!!renameTarget}
        initialName={renameTarget?.name ?? ""}
        title="File"
        onCancel={() => setRenameTarget(null)}
        onSubmit={onRenameSubmit}
      />

      <MediaDetailsDialog
        open={!!detailsTarget}
        media={detailsTarget}
        folders={folders}
        onClose={() => setDetailsTarget(null)}
      />

      <MediaDeleteDialog
        open={!!deleteTargets}
        items={deleteTargets ?? []}
        folders={folders}
        onCancel={() => setDeleteTargets(null)}
        onConfirm={confirmDelete}
      />

      <MoveMediaDialog
        open={showMove}
        count={selectedIds.length}
        folders={folders}
        currentFolderId={currentFolderId}
        onCancel={() => setShowMove(false)}
        onConfirm={confirmMove}
      />

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

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function CardAction({
  children,
  label,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "danger";
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur transition hover:bg-background",
        variant === "danger" ? "text-destructive hover:bg-destructive/10" : "text-foreground",
      )}
    >
      {children}
    </button>
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
              className="flex w-full cursor-pointer items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span>{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.items.length} items</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
