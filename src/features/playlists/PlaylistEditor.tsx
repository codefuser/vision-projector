import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  GripVertical,
  Play,
  Plus,
  StickyNote,
  Trash2,
  Radio,
  Copy as CopyIcon,

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
  updatePlaylistItems,
  listAllMedia,
} from "@/db/repo";
import type {
  MediaRecord,
  PlaylistItem,
  PlaylistRecord,
  TransitionType,
} from "@/db/schema";
import { Thumb } from "@/components/Thumb";
import { MediaAdapter } from "@/projection";
import { toast } from "sonner";
import { formatDuration } from "@/lib/files";
import { uid } from "@/lib/uid";
import { cn } from "@/lib/utils";
import { MediaPickerDialog } from "./MediaPickerDialog";

const TRANSITIONS: TransitionType[] = ["fade", "crossfade", "zoom", "dissolve", "none"];

export function PlaylistEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistRecord | null>(null);
  const [mediaMap, setMediaMap] = useState<Map<string, MediaRecord>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const playlistRef = useRef<PlaylistRecord | null>(null);
  playlistRef.current = playlist;

  const refresh = useCallback(async () => {
    const p = await getPlaylist(id);
    if (!p) return;
    setPlaylist(p);
    const all = await listAllMedia();
    setMediaMap(new Map(all.map((m) => [m.id, m])));
    setSelectedId((cur) => cur && p.items.some((it) => it.id === cur) ? cur : p.items[0]?.id ?? null);
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const persist = async (items: PlaylistItem[]) => {
    if (!playlistRef.current) return;
    setPlaylist({ ...playlistRef.current, items });
    await updatePlaylistItems(playlistRef.current.id, items);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    if (!playlist || !e.over || e.active.id === e.over.id) return;
    const oldIdx = playlist.items.findIndex((it) => it.id === e.active.id);
    const newIdx = playlist.items.findIndex((it) => it.id === e.over!.id);
    await persist(arrayMove(playlist.items, oldIdx, newIdx));
  };

  const updateItem = async (itemId: string, patch: Partial<PlaylistItem>) => {
    if (!playlist) return;
    await persist(playlist.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
  };

  const removeItem = async (itemId: string) => {
    if (!playlist) return;
    await persist(playlist.items.filter((it) => it.id !== itemId));
  };

  const duplicateItem = async (itemId: string) => {
    if (!playlist) return;
    const idx = playlist.items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const copy: PlaylistItem = { ...playlist.items[idx], id: uid() };
    const next = [...playlist.items.slice(0, idx + 1), copy, ...playlist.items.slice(idx + 1)];
    await persist(next);
    setSelectedId(copy.id);
  };

  const moveSelected = async (dir: -1 | 1) => {
    if (!playlist || !selectedId) return;
    const idx = playlist.items.findIndex((it) => it.id === selectedId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= playlist.items.length) return;
    await persist(arrayMove(playlist.items, idx, target));
  };

  const project = (startIndex = 0) => {
    if (!playlist?.items.length) return toast.error("Playlist is empty");
    void MediaAdapter.projectPlaylist(playlist, startIndex);
  };

  const startService = () => {
    if (!playlist?.items.length) return toast.error("Add at least one item before starting Service Mode");
    navigate({ to: "/service/$id", params: { id: playlist.id } });
  };

  const handleAddMedia = async (mediaIds: string[]) => {
    if (!playlist || !mediaIds.length) return;
    await addMediaToPlaylist(playlist.id, mediaIds);
    setPickerOpen(false);
    await refresh();
    toast.success(`Added ${mediaIds.length} item${mediaIds.length > 1 ? "s" : ""}`);
  };

  // Keyboard shortcuts — only inside the editor route
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const p = playlistRef.current;
      if (!p || !p.items.length) return;
      const idx = selectedId ? p.items.findIndex((it) => it.id === selectedId) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(p.items.length - 1, (idx < 0 ? 0 : idx + 1));
        setSelectedId(p.items[next].id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, (idx < 0 ? 0 : idx - 1));
        setSelectedId(p.items[next].id);
      } else if ((e.altKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault();
        void moveSelected(1);
      } else if ((e.altKey || e.metaKey) && e.key === "ArrowUp") {
        e.preventDefault();
        void moveSelected(-1);
      } else if (e.key === "Enter" && idx >= 0) {
        e.preventDefault();
        project(idx);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        void removeItem(selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        void duplicateItem(selectedId);
      } else if (e.key.toLowerCase() === "a" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPickerOpen(true);
      } else if (e.key.toLowerCase() === "s" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        startService();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const totalMs = useMemo(() => {
    if (!playlist) return 0;
    let sum = 0;
    for (const it of playlist.items) {
      const m = mediaMap.get(it.mediaId);
      if (m?.type === "video") sum += m.durationMs ?? it.durationMs ?? 0;
      else sum += it.durationMs ?? 0;
    }
    return sum;
  }, [playlist, mediaMap]);

  if (!playlist) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/playlists" className="rounded-md p-1.5 hover:bg-accent" title="Back to playlists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{playlist.name}</h1>
            <p className="text-xs text-muted-foreground">
              {playlist.items.length} cue{playlist.items.length === 1 ? "" : "s"}
              {totalMs > 0 && <span> · est. {formatDuration(totalMs)}</span>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            title="Add media (A)"
          >
            <Plus className="h-4 w-4" /> Add media
          </button>
          <button
            onClick={() => project(0)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            title="Project from start (Enter)"
          >
            <Play className="h-4 w-4" /> Project
          </button>
          <button
            onClick={startService}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            title="Start Service Mode (S)"
          >
            <Radio className="h-4 w-4" /> Start Service Mode
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          {playlist.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-sm text-foreground">This service flow is empty.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add media from your library to build the running order.
              </p>
              <button
                onClick={() => setPickerOpen(true)}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add first item
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <div>
                  Shortcuts: <kbd className="rounded border px-1">↑↓</kbd> select ·{" "}
                  <kbd className="rounded border px-1">Alt+↑↓</kbd> move ·{" "}
                  <kbd className="rounded border px-1">Enter</kbd> project ·{" "}
                  <kbd className="rounded border px-1">Del</kbd> remove ·{" "}
                  <kbd className="rounded border px-1">A</kbd> add ·{" "}
                  <kbd className="rounded border px-1">S</kbd> service mode
                </div>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={playlist.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {playlist.items.map((item, idx) => {
                      const media = mediaMap.get(item.mediaId);
                      return (
                        <SortableRow
                          key={item.id}
                          item={item}
                          media={media}
                          index={idx}
                          selected={selectedId === item.id}
                          notesOpen={notesFor === item.id}
                          onSelect={() => setSelectedId(item.id)}
                          onToggleNotes={() => setNotesFor((cur) => (cur === item.id ? null : item.id))}
                          onChange={(patch) => updateItem(item.id, patch)}
                          onRemove={() => removeItem(item.id)}
                          onDuplicate={() => duplicateItem(item.id)}
                          onPlay={() => project(idx)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </div>

      <MediaPickerDialog open={pickerOpen} onCancel={() => setPickerOpen(false)} onAdd={handleAddMedia} />
    </div>
  );
}

function SortableRow({
  item,
  media,
  index,
  selected,
  notesOpen,
  onSelect,
  onToggleNotes,
  onChange,
  onRemove,
  onDuplicate,
  onPlay,
}: {
  item: PlaylistItem;
  media: MediaRecord | undefined;
  index: number;
  selected: boolean;
  notesOpen: boolean;
  onSelect: () => void;
  onToggleNotes: () => void;
  onChange: (patch: Partial<PlaylistItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onPlay: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-2 transition",
        selected ? "border-primary ring-2 ring-primary/40" : "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" aria-label="Drag" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="w-6 text-center text-xs font-medium tabular-nums text-muted-foreground">{index + 1}</div>
        {media ? <Thumb media={media} className="h-12 w-20 rounded" /> : <div className="h-12 w-20 rounded bg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {item.label || media?.name || "Missing media"}
          </div>
          <div className="text-xs text-muted-foreground">
            {media?.type === "video"
              ? `Video · ${formatDuration(media.durationMs)}`
              : media?.type === "image"
                ? `Image · ${Math.round(item.durationMs / 1000)}s`
                : "Missing media"}
            {item.notes && <span className="ml-2 italic opacity-80">· note</span>}
          </div>
        </div>
        {media?.type === "image" && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            Duration
            <input
              type="number"
              min={1}
              max={3600}
              step={1}
              value={Math.round(item.durationMs / 1000)}
              onChange={(e) => onChange({ durationMs: Math.max(1, Number(e.target.value)) * 1000 })}
              className="h-8 w-16 rounded border border-input bg-background px-2 text-sm"
            />
            s
          </label>
        )}
        <select
          value={item.transition}
          onChange={(e) => onChange({ transition: e.target.value as TransitionType })}
          onClick={(e) => e.stopPropagation()}
          className="h-8 rounded border border-input bg-background px-2 text-xs"
        >
          {TRANSITIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleNotes(); }}
          className={cn(
            "rounded-md border p-1.5",
            notesOpen || item.notes
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-accent",
          )}
          aria-label="Notes"
          title="Cue notes"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Duplicate"
          title="Duplicate cue"
        >
          <CopyIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90"
          aria-label="Project from here"
          title="Project from here"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded-md border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
          aria-label="Remove"
          title="Remove cue"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {notesOpen && (
        <div className="mt-2 space-y-2 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block text-muted-foreground">Cue label (optional)</span>
              <input
                type="text"
                value={item.label ?? ""}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder={media?.name ?? "Cue title"}
                className="h-8 w-full rounded border border-input bg-background px-2 text-sm"
              />
            </label>
            <div className="hidden sm:block" />
          </div>
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">Operator notes</span>
            <textarea
              value={item.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="e.g. Lower volume during prayer · fade out at 0:45"
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// Re-export tiny stubs for legacy imports
export { ArrowUp as _AU, ArrowDown as _AD };
