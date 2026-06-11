import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  ListVideo,
  Copy,
  Trash2,
  Pencil,
  Play,
  Eye,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import {
  createPlaylist,
  deletePlaylist,
  duplicatePlaylist,
  getMedia,
  listPlaylists,
  renamePlaylist,
} from "@/db/repo";
import type { MediaRecord, PlaylistRecord } from "@/db/schema";
import { MediaAdapter } from "@/projection";
import { toast } from "sonner";
import { RenameDialog } from "@/components/RenameDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Thumb } from "@/components/Thumb";
import { PlaylistPreviewDialog } from "./PlaylistPreviewDialog";

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [renameTarget, setRenameTarget] = useState<PlaylistRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlaylistRecord | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PlaylistRecord | null>(null);

  const refresh = async () => setPlaylists(await listPlaylists());

  useEffect(() => {
    void refresh();
  }, []);

  const projectPlaylist = async (p: PlaylistRecord) => {
    if (!p.items.length) return toast.error("Playlist is empty");
    await MediaAdapter.projectPlaylist(p, 0);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Playlists</h1>
            <p className="text-sm text-muted-foreground">
              Organize media into ordered sequences for services.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Playlist
          </button>
        </div>

        {playlists.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <ListVideo className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-foreground">No playlists yet</p>
            <p className="text-xs text-muted-foreground">
              Create one to group media for a service.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playlists.map((p) => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onProject={() => projectPlaylist(p)}
                onPreview={() => setPreviewTarget(p)}
                onRename={() => setRenameTarget(p)}
                onDuplicate={async () => {
                  await duplicatePlaylist(p.id);
                  await refresh();
                }}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}
          </div>
        )}

        <RenameDialog
          open={!!renameTarget}
          initialName={renameTarget?.name ?? ""}
          title="Playlist"
          onCancel={() => setRenameTarget(null)}
          onSubmit={async (name) => {
            if (!renameTarget) return;
            await renamePlaylist(renameTarget.id, name);
            setRenameTarget(null);
            await refresh();
            toast.success("Playlist renamed");
          }}
        />
        <RenameDialog
          open={creating}
          initialName=""
          title="New playlist"
          label="Playlist name"
          onCancel={() => setCreating(false)}
          onSubmit={async (name) => {
            await createPlaylist(name);
            setCreating(false);
            await refresh();
          }}
        />
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Playlist"
          description={
            deleteTarget
              ? `Delete playlist "${deleteTarget.name}" only? The playlist is removed. Media files remain untouched.`
              : ""
          }
          confirmLabel="Delete Playlist"
          destructive
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            await deletePlaylist(deleteTarget.id);
            setDeleteTarget(null);
            await refresh();
            toast.success("Playlist deleted");
          }}
        />
        <PlaylistPreviewDialog
          playlist={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      </div>
    </div>
  );
}

function PlaylistCard({
  playlist,
  onProject,
  onPreview,
  onRename,
  onDuplicate,
  onDelete,
}: {
  playlist: PlaylistRecord;
  onProject: () => void;
  onPreview: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [thumbs, setThumbs] = useState<MediaRecord[]>([]);
  const [allItems, setAllItems] = useState<MediaRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const records = await Promise.all(playlist.items.map((i) => getMedia(i.mediaId)));
      const filtered = records.filter((m): m is MediaRecord => !!m);
      if (!cancelled) {
        setAllItems(filtered);
        setThumbs(filtered.slice(0, 4));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playlist.items]);

  const counts = useMemo(() => {
    let videos = 0;
    let images = 0;
    for (const t of allItems) {
      if (t.type === "video") videos++;
      else if (t.type === "image") images++;
    }
    return { videos, images };
  }, [allItems]);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      {/* Thumbnail mosaic */}
      <button
        onClick={onPreview}
        className="relative block aspect-video w-full cursor-pointer overflow-hidden bg-muted"
        title="Preview playlist"
      >
        {thumbs.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ListVideo className="h-8 w-8 opacity-50" />
          </div>
        ) : (
          <ThumbMosaic items={thumbs} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur opacity-0 transition-opacity group-hover:opacity-100">
          <Eye className="h-3 w-3" /> Preview
        </div>
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          <ListVideo className="h-3 w-3" />
          {playlist.items.length}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-3">
        <Link
          to="/playlists/$id"
          params={{ id: playlist.id }}
          className="cursor-pointer truncate text-sm font-semibold leading-tight hover:text-primary"
          title={playlist.name}
        >
          {playlist.name}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Updated {formatRelative(playlist.updatedAt)}</span>
          {(counts.videos > 0 || counts.images > 0) && (
            <span className="inline-flex items-center gap-1.5">
              {counts.videos > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Film className="h-3 w-3" />
                  {counts.videos}
                </span>
              )}
              {counts.images > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <ImageIcon className="h-3 w-3" />
                  {counts.images}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1">
          <button
            onClick={onProject}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            title="Project playlist"
          >
            <Play className="h-3 w-3" /> Project
          </button>
          <IconAction onClick={onPreview} label="Preview">
            <Eye className="h-3.5 w-3.5" />
          </IconAction>
          <IconAction onClick={onRename} label="Rename">
            <Pencil className="h-3.5 w-3.5" />
          </IconAction>
          <IconAction onClick={onDuplicate} label="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </IconAction>
          <IconAction onClick={onDelete} label="Delete" destructive>
            <Trash2 className="h-3.5 w-3.5" />
          </IconAction>
        </div>
      </div>
    </div>
  );
}

function ThumbMosaic({ items }: { items: MediaRecord[] }) {
  const slots = items.slice(0, 4);
  if (slots.length === 1) {
    return <Thumb media={slots[0]} className="h-full w-full" />;
  }
  if (slots.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-px bg-border">
        {slots.map((m) => (
          <Thumb key={m.id} media={m} className="h-full w-full" />
        ))}
      </div>
    );
  }
  if (slots.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
        <Thumb media={slots[0]} className="row-span-2 h-full w-full" />
        <Thumb media={slots[1]} className="h-full w-full" />
        <Thumb media={slots[2]} className="h-full w-full" />
      </div>
    );
  }
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
      {slots.map((m) => (
        <Thumb key={m.id} media={m} className="h-full w-full" />
      ))}
    </div>
  );
}

function IconAction({
  children,
  onClick,
  label,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition " +
        (destructive
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
