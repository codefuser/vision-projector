import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy as CopyIcon,
  Download,
  Eye,
  Film,
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addMediaToPlaylist,
  getPlaylist,
  listAllMedia,
  renameMedia,
  updatePlaylistItems,
} from "@/db/repo";
import type {
  MediaRecord,
  PlaylistItem,
  PlaylistRecord,
  TransitionType,
} from "@/db/schema";
import { Thumb } from "@/components/Thumb";
import { MediaAdapter } from "@/projection";
import { useProjection } from "@/stores/projection.store";
import { MediaPreview } from "@/features/library/MediaPreview";
import { RenameDialog } from "@/components/RenameDialog";
import { toast } from "sonner";
import { formatBytes, formatDuration } from "@/lib/files";
import { uid } from "@/lib/uid";
import { cn } from "@/lib/utils";

const TRANSITIONS: TransitionType[] = ["fade", "crossfade", "zoom", "dissolve", "none"];
type Filter = "all" | "image" | "video";

const STORAGE_PREFIX = "vp-playlist-editor-v1";
function storageKey(playlistId: string, k: string) {
  return `${STORAGE_PREFIX}:${playlistId}:${k}`;
}
function loadString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function saveString(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function PlaylistEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const projectionState = useProjection((s) => s.state);

  const [playlist, setPlaylist] = useState<PlaylistRecord | null>(null);
  const [allMedia, setAllMedia] = useState<MediaRecord[]>([]);

  // Persisted UI state — restored from localStorage per playlist.
  const [libSearch, setLibSearch] = useState(() => loadString(storageKey(id, "libSearch"), ""));
  const [libFilter, setLibFilter] = useState<Filter>(() => (loadString(storageKey(id, "libFilter"), "all") as Filter));
  const [tlSearch, setTlSearch] = useState(() => loadString(storageKey(id, "tlSearch"), ""));
  const [tlFilter, setTlFilter] = useState<Filter>(() => (loadString(storageKey(id, "tlFilter"), "all") as Filter));
  const [showInfo, setShowInfo] = useState(() => loadString(storageKey(id, "showInfo"), "1") === "1");
  const [showLibrary, setShowLibrary] = useState(() => loadString(storageKey(id, "showLibrary"), "1") === "1");

  useEffect(() => { saveString(storageKey(id, "libSearch"), libSearch); }, [id, libSearch]);
  useEffect(() => { saveString(storageKey(id, "libFilter"), libFilter); }, [id, libFilter]);
  useEffect(() => { saveString(storageKey(id, "tlSearch"), tlSearch); }, [id, tlSearch]);
  useEffect(() => { saveString(storageKey(id, "tlFilter"), tlFilter); }, [id, tlFilter]);
  useEffect(() => { saveString(storageKey(id, "showInfo"), showInfo ? "1" : "0"); }, [id, showInfo]);
  useEffect(() => { saveString(storageKey(id, "showLibrary"), showLibrary ? "1" : "0"); }, [id, showLibrary]);

  // Selection — a Set of PlaylistItem ids; persisted per playlist.
  const [selection, setSelection] = useState<Set<string>>(() => {
    const raw = loadString(storageKey(id, "selection"), "");
    if (!raw) return new Set();
    try { return new Set(JSON.parse(raw) as string[]); } catch { return new Set(); }
  });
  useEffect(() => {
    saveString(storageKey(id, "selection"), JSON.stringify(Array.from(selection)));
  }, [id, selection]);

  // Focused row for keyboard nav (also acts as the shift-click anchor).
  const [focusId, setFocusId] = useState<string | null>(() => loadString(storageKey(id, "focusId"), "") || null);
  useEffect(() => { saveString(storageKey(id, "focusId"), focusId ?? ""); }, [id, focusId]);

  const [renameTarget, setRenameTarget] = useState<MediaRecord | null>(null);
  const [previewTarget, setPreviewTarget] = useState<MediaRecord | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  const playlistRef = useRef<PlaylistRecord | null>(null);
  playlistRef.current = playlist;

  const refresh = useCallback(async () => {
    const p = await getPlaylist(id);
    if (!p) return;
    setPlaylist(p);
    setAllMedia(await listAllMedia());
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mediaMap = useMemo(() => new Map(allMedia.map((m) => [m.id, m])), [allMedia]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // ───────── persistence helpers ─────────
  const persistItems = async (items: PlaylistItem[]) => {
    if (!playlistRef.current) return;
    setPlaylist({ ...playlistRef.current, items, updatedAt: Date.now() });
    await updatePlaylistItems(playlistRef.current.id, items);
  };

  // ───────── timeline view (filtered) ─────────
  const visibleItems = useMemo(() => {
    if (!playlist) return [] as PlaylistItem[];
    const q = tlSearch.trim().toLowerCase();
    return playlist.items.filter((it) => {
      const m = mediaMap.get(it.mediaId);
      if (tlFilter !== "all" && m?.type !== tlFilter) return false;
      if (!q) return true;
      const hay = (it.label ?? m?.name ?? "").toLowerCase();
      return hay.includes(q) || (m?.type ?? "").includes(q);
    });
  }, [playlist, mediaMap, tlSearch, tlFilter]);

  // Ensure selection only contains existing item ids.
  useEffect(() => {
    if (!playlist) return;
    const valid = new Set(playlist.items.map((i) => i.id));
    setSelection((prev) => {
      const next = new Set<string>();
      for (const s of prev) if (valid.has(s)) next.add(s);
      return next.size === prev.size ? prev : next;
    });
  }, [playlist]);

  // ───────── actions ─────────
  const addMedia = async (mediaIds: string[], insertAt?: number) => {
    if (!playlist || !mediaIds.length) return;
    if (insertAt == null) {
      await addMediaToPlaylist(playlist.id, mediaIds);
    } else {
      const newItems: PlaylistItem[] = [];
      for (const mid of mediaIds) {
        const m = mediaMap.get(mid);
        if (!m) continue;
        newItems.push({
          id: uid(),
          mediaId: mid,
          durationMs: m.type === "video" ? m.durationMs ?? 5000 : 5000,
          transition: "fade",
        });
      }
      const items = [
        ...playlist.items.slice(0, insertAt),
        ...newItems,
        ...playlist.items.slice(insertAt),
      ];
      await persistItems(items);
    }
    await refresh();
    toast.success(`Added ${mediaIds.length} item${mediaIds.length > 1 ? "s" : ""}`);
  };

  const removeItems = async (ids: string[]) => {
    if (!playlist || !ids.length) return;
    const set = new Set(ids);
    await persistItems(playlist.items.filter((it) => !set.has(it.id)));
    setSelection((prev) => {
      const next = new Set(prev);
      for (const x of ids) next.delete(x);
      return next;
    });
  };

  const duplicateItems = async (ids: string[]) => {
    if (!playlist || !ids.length) return;
    const orderedIds = playlist.items.filter((it) => ids.includes(it.id)).map((it) => it.id);
    const idToCopyId = new Map<string, string>();
    const next: PlaylistItem[] = [];
    for (const it of playlist.items) {
      next.push(it);
      if (orderedIds.includes(it.id)) {
        const copyId = uid();
        idToCopyId.set(it.id, copyId);
        next.push({ ...it, id: copyId });
      }
    }
    await persistItems(next);
    setSelection(new Set(Array.from(idToCopyId.values())));
  };

  const updateItem = async (itemId: string, patch: Partial<PlaylistItem>) => {
    if (!playlist) return;
    await persistItems(playlist.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
  };

  const moveSelection = async (dir: -1 | 1) => {
    if (!playlist) return;
    const items = playlist.items.slice();
    const indices = items
      .map((it, i) => (selection.has(it.id) ? i : -1))
      .filter((i) => i >= 0);
    if (!indices.length) return;
    if (dir === -1) {
      if (indices[0] === 0) return;
      for (const i of indices) [items[i - 1], items[i]] = [items[i], items[i - 1]];
    } else {
      if (indices[indices.length - 1] === items.length - 1) return;
      for (let k = indices.length - 1; k >= 0; k--) {
        const i = indices[k];
        [items[i + 1], items[i]] = [items[i], items[i + 1]];
      }
    }
    await persistItems(items);
  };

  const projectIndex = (i: number) => {
    if (!playlist) return;
    void MediaAdapter.projectPlaylist(playlist, i);
  };

  const projectSelected = async () => {
    if (!playlist || !selection.size) return;
    const items = playlist.items.filter((it) => selection.has(it.id));
    if (!items.length) return;
    const tmp: PlaylistRecord = { ...playlist, items };
    await MediaAdapter.projectPlaylist(tmp, 0);
  };

  const exportPlaylist = () => {
    if (!playlist) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      playlist: { id: playlist.id, name: playlist.name },
      items: playlist.items.map((it) => {
        const m = mediaMap.get(it.mediaId);
        return {
          order: playlist.items.indexOf(it) + 1,
          mediaId: it.mediaId,
          mediaName: m?.name ?? null,
          mediaType: m?.type ?? null,
          durationMs: it.durationMs,
          transition: it.transition,
          label: it.label ?? null,
          notes: it.notes ?? null,
        };
      }),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${playlist.name.replace(/[^a-z0-9-_ ]/gi, "_")}.playlist.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Playlist exported");
  };

  // ───────── selection ─────────
  const handleRowClick = (e: React.MouseEvent, itemId: string) => {
    if (!playlist) return;
    const ids = visibleItems.map((it) => it.id);
    if (e.shiftKey && focusId) {
      const a = ids.indexOf(focusId);
      const b = ids.indexOf(itemId);
      if (a >= 0 && b >= 0) {
        const [s, t] = a <= b ? [a, b] : [b, a];
        const range = ids.slice(s, t + 1);
        const next = new Set(e.ctrlKey || e.metaKey ? selection : []);
        for (const rid of range) next.add(rid);
        setSelection(next);
        setFocusId(itemId);
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      const next = new Set(selection);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      setSelection(next);
      setFocusId(itemId);
      return;
    }
    setSelection(new Set([itemId]));
    setFocusId(itemId);
  };

  // ───────── DnD reorder ─────────
  const onDragEnd = async (e: DragEndEvent) => {
    if (!playlist || !e.over || e.active.id === e.over.id) return;
    const oldIdx = playlist.items.findIndex((it) => it.id === e.active.id);
    const newIdx = playlist.items.findIndex((it) => it.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    await persistItems(arrayMove(playlist.items, oldIdx, newIdx));
  };

  // ───────── DnD from library → timeline ─────────
  const onTimelineDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-media-ids");
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      await addMedia(ids);
    } catch { /* ignore */ }
  };

  // ───────── keyboard shortcuts (editor-scoped) ─────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const p = playlistRef.current;
      if (!p) return;
      const ids = visibleItems.map((it) => it.id);
      const cur = focusId ? ids.indexOf(focusId) : -1;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelection(new Set(ids));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selection.size) {
        e.preventDefault();
        void duplicateItems(Array.from(selection));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const n = Math.min(ids.length - 1, cur < 0 ? 0 : cur + 1);
        if (ids[n]) {
          setFocusId(ids[n]);
          if (!e.shiftKey) setSelection(new Set([ids[n]]));
          else setSelection((prev) => new Set(prev).add(ids[n]));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const n = Math.max(0, cur < 0 ? 0 : cur - 1);
        if (ids[n]) {
          setFocusId(ids[n]);
          if (!e.shiftKey) setSelection(new Set([ids[n]]));
          else setSelection((prev) => new Set(prev).add(ids[n]));
        }
      } else if ((e.altKey) && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        void moveSelection(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Enter" && cur >= 0) {
        e.preventDefault();
        const realIdx = p.items.findIndex((it) => it.id === ids[cur]);
        if (realIdx >= 0) projectIndex(realIdx);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selection.size) {
        e.preventDefault();
        void removeItems(Array.from(selection));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, selection, visibleItems]);

  // ───────── derived stats ─────────
  const stats = useMemo(() => {
    if (!playlist) return null;
    let videos = 0, images = 0, totalMs = 0, videoMs = 0, largestSize = 0;
    let largest: MediaRecord | null = null;
    for (const it of playlist.items) {
      const m = mediaMap.get(it.mediaId);
      if (!m) continue;
      if (m.type === "video") {
        videos++;
        const ms = m.durationMs ?? it.durationMs ?? 0;
        videoMs += ms;
        totalMs += ms;
      } else {
        images++;
        totalMs += it.durationMs ?? 0;
      }
      if ((m.size ?? 0) > largestSize) {
        largestSize = m.size ?? 0;
        largest = m;
      }
    }
    return {
      total: playlist.items.length,
      videos,
      images,
      totalMs,
      avgVideoMs: videos > 0 ? Math.round(videoMs / videos) : 0,
      largest,
    };
  }, [playlist, mediaMap]);

  const currentMediaId = projectionState?.currentMediaId ?? null;
  const currentItemIndex = useMemo(() => {
    if (!playlist || !currentMediaId) return -1;
    return playlist.items.findIndex((it) => it.mediaId === currentMediaId);
  }, [playlist, currentMediaId]);

  if (!playlist) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const selectionCount = selection.size;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/playlists" className="rounded-md p-1.5 hover:bg-accent" title="Back to playlists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{playlist.name}</h1>
            <p className="text-[11px] text-muted-foreground">
              {playlist.items.length} cue{playlist.items.length === 1 ? "" : "s"}
              {stats && stats.totalMs > 0 && <span> · est. {formatDuration(stats.totalMs)}</span>}
              <span> · updated {new Date(playlist.updatedAt).toLocaleString()}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowLibrary((v) => !v)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs",
              showLibrary ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background hover:bg-accent",
            )}
            title="Toggle media library"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Library
          </button>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs",
              showInfo ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background hover:bg-accent",
            )}
            title="Toggle info panel"
          >
            <StickyNote className="h-3.5 w-3.5" /> Info
          </button>
          <button
            onClick={exportPlaylist}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs hover:bg-accent"
            title="Export playlist as JSON"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => projectIndex(0)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs hover:bg-accent"
            title="Project from start"
          >
            <Play className="h-3.5 w-3.5" /> Project
          </button>
          <button
            onClick={() => {
              if (!playlist.items.length) return toast.error("Add at least one cue before starting Service Mode");
              navigate({ to: "/service/$id", params: { id: playlist.id } });
            }}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
            title="Start Service Mode"
          >
            <Radio className="h-3.5 w-3.5" /> Service Mode
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: media library */}
        {showLibrary && (
          <LibraryPanel
            media={allMedia}
            search={libSearch}
            setSearch={setLibSearch}
            filter={libFilter}
            setFilter={setLibFilter}
            onAdd={(ids) => addMedia(ids)}
          />
        )}

        {/* CENTER: timeline */}
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={(e) => {
            if (Array.from(e.dataTransfer.types).includes("application/x-media-ids")) {
              e.preventDefault();
            }
          }}
          onDrop={onTimelineDrop}
        >
          {/* Timeline toolbar */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={tlSearch}
                onChange={(e) => setTlSearch(e.target.value)}
                placeholder="Search in playlist…"
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-0.5 rounded-md border border-input bg-background p-0.5">
              {(["all", "image", "video"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTlFilter(f)}
                  className={cn(
                    "cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium capitalize",
                    tlFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "all" ? "All" : f + "s"}
                </button>
              ))}
            </div>
            <div className="ml-auto text-[11px] text-muted-foreground">
              {visibleItems.length} of {playlist.items.length} shown
              {tlSearch && <button onClick={() => setTlSearch("")} className="ml-2 cursor-pointer underline">clear</button>}
            </div>
          </div>

          {/* Bulk action bar */}
          {selectionCount > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-accent/40 px-4 py-2 text-xs">
              <span className="font-medium">{selectionCount} item{selectionCount === 1 ? "" : "s"} selected</span>
              <button onClick={() => moveSelection(-1)} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:bg-accent">
                <ChevronUp className="h-3 w-3" /> Move up
              </button>
              <button onClick={() => moveSelection(1)} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:bg-accent">
                <ChevronDown className="h-3 w-3" /> Move down
              </button>
              <button onClick={() => duplicateItems(Array.from(selection))} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:bg-accent">
                <CopyIcon className="h-3 w-3" /> Duplicate
              </button>
              <button onClick={projectSelected} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:bg-accent">
                <Play className="h-3 w-3" /> Project selected
              </button>
              <button onClick={() => removeItems(Array.from(selection))} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
              <button onClick={() => setSelection(new Set())} className="ml-auto cursor-pointer text-muted-foreground hover:text-foreground">
                Clear selection
              </button>
            </div>
          )}

          {/* Timeline body */}
          <div
            className="flex-1 overflow-y-auto p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelection(new Set());
            }}
          >
            {playlist.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                Drag media from the library on the left, or click <Plus className="inline h-3.5 w-3.5" /> on any item to add it.
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                No cues match the current search or filter.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={visibleItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {visibleItems.map((item) => {
                      const realIdx = playlist.items.findIndex((it) => it.id === item.id);
                      const media = mediaMap.get(item.mediaId);
                      const selected = selection.has(item.id);
                      const isCurrent = realIdx === currentItemIndex;
                      const isNext = currentItemIndex >= 0 && realIdx === currentItemIndex + 1;
                      const isUpcoming = currentItemIndex >= 0 && realIdx > currentItemIndex + 1;
                      return (
                        <SortableRow
                          key={item.id}
                          item={item}
                          media={media}
                          index={realIdx}
                          selected={selected}
                          focused={focusId === item.id}
                          isCurrent={isCurrent}
                          isNext={isNext}
                          isUpcoming={isUpcoming}
                          notesOpen={notesFor === item.id}
                          onClick={(e) => handleRowClick(e, item.id)}
                          onChange={(patch) => updateItem(item.id, patch)}
                          onProject={() => projectIndex(realIdx)}
                          onPreview={() => media && setPreviewTarget(media)}
                          onRename={() => media && setRenameTarget(media)}
                          onDuplicate={() => duplicateItems([item.id])}
                          onRemove={() => removeItems([item.id])}
                          onToggleNotes={() => setNotesFor((c) => (c === item.id ? null : item.id))}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* RIGHT: info panel */}
        {showInfo && stats && (
          <InfoPanel
            playlist={playlist}
            stats={stats}
            mediaMap={mediaMap}
            currentIndex={currentItemIndex}
          />
        )}
      </div>

      {previewTarget && (
        <MediaPreview
          media={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onProject={() => {
            void MediaAdapter.projectMedia(previewTarget);
            setPreviewTarget(null);
          }}
        />
      )}
      <RenameDialog
        open={!!renameTarget}
        initialName={renameTarget?.name ?? ""}
        title="File"
        onCancel={() => setRenameTarget(null)}
        onSubmit={async (name) => {
          if (!renameTarget) return;
          await renameMedia(renameTarget.id, name);
          setRenameTarget(null);
          await refresh();
          toast.success("Renamed");
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// LEFT panel — available media library
// ────────────────────────────────────────────────────────────────────
function LibraryPanel({
  media,
  search,
  setSearch,
  filter,
  setFilter,
  onAdd,
}: {
  media: MediaRecord[];
  search: string;
  setSearch: (v: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  onAdd: (ids: string[]) => void;
}) {
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media
      .filter((m) => (filter === "all" ? true : m.type === filter))
      .filter((m) => (!q ? true : m.name.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [media, search, filter]);

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-card/30">
      <div className="shrink-0 border-b border-border p-2">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Media Library
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media…"
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-0.5 rounded-md border border-input bg-background p-0.5">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : f + "s"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {visible.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">No media.</div>
        ) : (
          <div className="space-y-1">
            {visible.map((m) => (
              <div
                key={m.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("application/x-media-ids", JSON.stringify([m.id]))}
                onDoubleClick={() => onAdd([m.id])}
                className="group flex cursor-grab items-center gap-2 rounded-md border border-transparent p-1 hover:border-border hover:bg-accent/50"
                title="Drag into timeline or double-click to add"
              >
                <Thumb media={m} className="h-9 w-14 shrink-0 rounded" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-medium" title={m.name}>{m.name}</div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {m.type === "video" ? (
                      <>
                        <Film className="h-3 w-3" />
                        <span>{formatDuration(m.durationMs)}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3" />
                        <span>{formatBytes(m.size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onAdd([m.id]); }}
                  className="invisible inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground group-hover:visible"
                  title="Add to playlist"
                  aria-label="Add"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────
// RIGHT panel — info & stats
// ────────────────────────────────────────────────────────────────────
function InfoPanel({
  playlist,
  stats,
  mediaMap,
  currentIndex,
}: {
  playlist: PlaylistRecord;
  stats: {
    total: number;
    videos: number;
    images: number;
    totalMs: number;
    avgVideoMs: number;
    largest: MediaRecord | null;
  };
  mediaMap: Map<string, MediaRecord>;
  currentIndex: number;
}) {
  const items = playlist.items;
  const current = currentIndex >= 0 ? items[currentIndex] : null;
  const next = currentIndex >= 0 ? items[currentIndex + 1] : items[0] ?? null;
  const upcoming = currentIndex >= 0 ? items[currentIndex + 2] : items[1] ?? null;

  const renderCueRow = (label: string, item: PlaylistItem | null, tone: "live" | "next" | "upcoming") => {
    const m = item ? mediaMap.get(item.mediaId) : null;
    return (
      <div
        className={cn(
          "rounded-md border p-2",
          tone === "live"
            ? "border-primary/60 bg-primary/10"
            : tone === "next"
              ? "border-primary/30 bg-accent/40"
              : "border-border bg-background",
        )}
      >
        <div
          className={cn(
            "mb-1 text-[9px] font-bold uppercase tracking-widest",
            tone === "live" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {label}
        </div>
        {item && m ? (
          <div className="flex items-center gap-2">
            <Thumb media={m} className="h-9 w-14 shrink-0 rounded" />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium">{item.label || m.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {m.type === "video" ? `Video · ${formatDuration(m.durationMs)}` : `Image · ${Math.round(item.durationMs / 1000)}s`}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">—</div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-card/30">
      <div className="space-y-3 overflow-y-auto p-3">
        <section>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Up Now</div>
          <div className="space-y-1.5">
            {renderCueRow("Current", current, "live")}
            {renderCueRow("Next", next, "next")}
            {renderCueRow("Upcoming", upcoming, "upcoming")}
          </div>
        </section>

        <section>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Statistics</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <StatTile label="Total items" value={String(stats.total)} />
            <StatTile label="Total duration" value={formatDuration(stats.totalMs)} />
            <StatTile label="Videos" value={String(stats.videos)} icon={<Film className="h-3 w-3" />} />
            <StatTile label="Images" value={String(stats.images)} icon={<ImageIcon className="h-3 w-3" />} />
            <StatTile label="Avg video" value={stats.avgVideoMs ? formatDuration(stats.avgVideoMs) : "—"} />
            <StatTile label="Largest file" value={stats.largest ? formatBytes(stats.largest.size) : "—"} title={stats.largest?.name} />
          </div>
        </section>

        <section className="text-[11px] text-muted-foreground">
          <div>Created {new Date(playlist.createdAt).toLocaleString()}</div>
          <div>Updated {new Date(playlist.updatedAt).toLocaleString()}</div>
        </section>
      </div>
    </aside>
  );
}

function StatTile({ label, value, icon, title }: { label: string; value: string; icon?: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2" title={title}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sortable timeline row
// ────────────────────────────────────────────────────────────────────
function SortableRow({
  item,
  media,
  index,
  selected,
  focused,
  isCurrent,
  isNext,
  isUpcoming,
  notesOpen,
  onClick,
  onChange,
  onProject,
  onPreview,
  onRename,
  onDuplicate,
  onRemove,
  onToggleNotes,
}: {
  item: PlaylistItem;
  media: MediaRecord | undefined;
  index: number;
  selected: boolean;
  focused: boolean;
  isCurrent: boolean;
  isNext: boolean;
  isUpcoming: boolean;
  notesOpen: boolean;
  onClick: (e: React.MouseEvent) => void;
  onChange: (patch: Partial<PlaylistItem>) => void;
  onProject: () => void;
  onPreview: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleNotes: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group rounded-md border bg-card p-1.5 transition",
        isCurrent
          ? "border-primary ring-2 ring-primary/60"
          : selected
            ? "border-primary/60 ring-1 ring-primary/40"
            : isNext
              ? "border-primary/30"
              : "border-border",
        focused && !selected && "ring-1 ring-ring",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab p-1 text-muted-foreground"
          aria-label="Drag"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="w-6 shrink-0 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
          {index + 1}
        </div>
        {media ? <Thumb media={media} className="h-10 w-16 shrink-0 rounded" /> : <div className="h-10 w-16 shrink-0 rounded bg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="truncate text-[13px] font-medium">{item.label || media?.name || "Missing media"}</div>
            {isCurrent && (
              <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                Currently Projecting
              </span>
            )}
            {isNext && !isCurrent && (
              <span className="shrink-0 rounded border border-primary/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                Next
              </span>
            )}
            {isUpcoming && (
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                Upcoming
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {media?.type === "video" ? (
              <>
                <span className="inline-flex items-center gap-0.5"><Film className="h-3 w-3" /> Video</span>
                <span>·</span>
                <span className="tabular-nums">{formatDuration(media.durationMs)}</span>
                <span>·</span>
                <span>{formatBytes(media.size)}</span>
              </>
            ) : media?.type === "image" ? (
              <>
                <span className="inline-flex items-center gap-0.5"><ImageIcon className="h-3 w-3" /> Image</span>
                <span>·</span>
                <span>{formatBytes(media.size)}</span>
              </>
            ) : (
              <span className="text-destructive">Missing</span>
            )}
            {item.notes && <span className="ml-1 italic opacity-80">· note</span>}
          </div>
        </div>

        {media?.type === "image" && (
          <label className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min={1}
              max={3600}
              step={1}
              value={Math.round(item.durationMs / 1000)}
              onChange={(e) => onChange({ durationMs: Math.max(1, Number(e.target.value)) * 1000 })}
              className="h-7 w-14 rounded border border-input bg-background px-1.5 text-xs"
              aria-label="Image duration in seconds"
            />
            <span>s</span>
          </label>
        )}
        <select
          value={item.transition}
          onChange={(e) => onChange({ transition: e.target.value as TransitionType })}
          onClick={(e) => e.stopPropagation()}
          className="hidden h-7 rounded border border-input bg-background px-1.5 text-[11px] md:block"
        >
          {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <RowAction label="Preview" onClick={(e) => { e.stopPropagation(); onPreview(); }}>
            <Eye className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction label="Project" onClick={(e) => { e.stopPropagation(); onProject(); }} variant="primary">
            <Play className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction label="Notes" onClick={(e) => { e.stopPropagation(); onToggleNotes(); }} active={notesOpen || !!item.notes}>
            <StickyNote className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction label="Rename" onClick={(e) => { e.stopPropagation(); onRename(); }}>
            <Pencil className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction label="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
            <CopyIcon className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction label="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} variant="danger">
            <X className="h-3.5 w-3.5" />
          </RowAction>
        </div>
      </div>

      {notesOpen && (
        <div className="mt-1.5 space-y-1.5 border-t border-border pt-1.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={item.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={media?.name ?? "Cue label"}
            className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
          />
          <textarea
            value={item.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Operator notes for this cue…"
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
          />
        </div>
      )}
    </div>
  );
}

function RowAction({
  children,
  onClick,
  label,
  variant,
  active,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  variant?: "primary" | "danger";
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border",
        variant === "primary"
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : variant === "danger"
            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
            : active
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
