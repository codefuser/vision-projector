import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, GripVertical, Play, Trash2 } from "lucide-react";
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
import { getPlaylist, updatePlaylistItems, listAllMedia } from "@/db/repo";
import type { MediaRecord, PlaylistItem, PlaylistRecord, TransitionType } from "@/db/schema";
import { Thumb } from "@/components/Thumb";
import { useProjection } from "@/stores/projection.store";
import { toast } from "sonner";
import { formatDuration } from "@/lib/files";

const TRANSITIONS: TransitionType[] = ["fade", "crossfade", "zoom", "dissolve", "none"];

export function PlaylistEditor({ id }: { id: string }) {
  const [playlist, setPlaylist] = useState<PlaylistRecord | null>(null);
  const [mediaMap, setMediaMap] = useState<Map<string, MediaRecord>>(new Map());
  const { send, openProjector, projectorOpen } = useProjection();

  const refresh = async () => {
    const p = await getPlaylist(id);
    if (!p) return;
    setPlaylist(p);
    const all = await listAllMedia();
    setMediaMap(new Map(all.map((m) => [m.id, m])));
  };

  useEffect(() => {
    void refresh();
  }, [id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!playlist || !e.over || e.active.id === e.over.id) return;
    const oldIdx = playlist.items.findIndex((it) => it.id === e.active.id);
    const newIdx = playlist.items.findIndex((it) => it.id === e.over!.id);
    const next = arrayMove(playlist.items, oldIdx, newIdx);
    setPlaylist({ ...playlist, items: next });
    await updatePlaylistItems(playlist.id, next);
  };

  const updateItem = async (itemId: string, patch: Partial<PlaylistItem>) => {
    if (!playlist) return;
    const next = playlist.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    setPlaylist({ ...playlist, items: next });
    await updatePlaylistItems(playlist.id, next);
  };

  const removeItem = async (itemId: string) => {
    if (!playlist) return;
    const next = playlist.items.filter((it) => it.id !== itemId);
    setPlaylist({ ...playlist, items: next });
    await updatePlaylistItems(playlist.id, next);
  };

  const project = (startIndex = 0) => {
    if (!playlist?.items.length) return toast.error("Playlist is empty");
    if (!projectorOpen) openProjector();
    setTimeout(() => send({ type: "LOAD_PLAYLIST", playlistId: playlist.id, startIndex }), projectorOpen ? 0 : 400);
  };

  if (!playlist) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/playlists" className="rounded-md p-1.5 hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{playlist.name}</h1>
            <p className="text-xs text-muted-foreground">{playlist.items.length} items</p>
          </div>
        </div>
        <button
          onClick={() => project(0)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Play className="h-4 w-4" /> Project from start
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {playlist.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Add media from the <Link to="/library" className="text-primary underline">Library</Link> to get started.
            </div>
          ) : (
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
                        onChange={(patch) => updateItem(item.id, patch)}
                        onRemove={() => removeItem(item.id)}
                        onPlay={() => project(idx)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableRow({
  item,
  media,
  index,
  onChange,
  onRemove,
  onPlay,
}: {
  item: PlaylistItem;
  media: MediaRecord | undefined;
  index: number;
  onChange: (patch: Partial<PlaylistItem>) => void;
  onRemove: () => void;
  onPlay: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
    >
      <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" aria-label="Drag">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-6 text-center text-xs text-muted-foreground">{index + 1}</div>
      {media ? <Thumb media={media} className="h-12 w-20 rounded" /> : <div className="h-12 w-20 rounded bg-muted" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{media?.name ?? "Missing media"}</div>
        <div className="text-xs text-muted-foreground">
          {media?.type === "video" ? `Video · ${formatDuration(media.durationMs)}` : "Image"}
        </div>
      </div>
      {media?.type === "image" && (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
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
        className="h-8 rounded border border-input bg-background px-2 text-xs"
      >
        {TRANSITIONS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <button onClick={onPlay} className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90" aria-label="Project from here">
        <Play className="h-3.5 w-3.5" />
      </button>
      <button onClick={onRemove} className="rounded-md border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20" aria-label="Remove">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
