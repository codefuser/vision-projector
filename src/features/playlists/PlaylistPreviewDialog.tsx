import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Play, Film, Image as ImageIcon, ListVideo } from "lucide-react";
import type { PlaylistRecord, MediaRecord } from "@/db/schema";
import { getMedia } from "@/db/repo";
import { Thumb } from "@/components/Thumb";
import { MediaAdapter } from "@/projection";

export function PlaylistPreviewDialog({
  playlist,
  onClose,
}: {
  playlist: PlaylistRecord | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Array<{ id: string; media: MediaRecord | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!playlist) {
        setItems([]);
        return;
      }
      const resolved = await Promise.all(
        playlist.items.map(async (it) => ({
          id: it.id,
          media: (await getMedia(it.mediaId)) ?? null,
        })),
      );
      if (!cancelled) setItems(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [playlist]);

  return (
    <Dialog open={!!playlist} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListVideo className="h-5 w-5 text-primary" />
            {playlist?.name}
          </DialogTitle>
          <DialogDescription>
            {playlist?.items.length ?? 0} item{(playlist?.items.length ?? 0) === 1 ? "" : "s"}
            {playlist && (
              <> · Updated {formatRelative(playlist.updatedAt)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            This playlist is empty.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <ul className="divide-y divide-border">
              {items.map((it, idx) => (
                <li key={it.id} className="flex items-center gap-3 py-2">
                  <span className="w-6 text-right font-mono text-xs text-muted-foreground">
                    {idx + 1}
                  </span>
                  {it.media ? (
                    <Thumb media={it.media} className="h-12 w-16 shrink-0 rounded" />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      ?
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {it.media?.name ?? "Missing media"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {it.media?.type === "video" ? (
                        <><Film className="h-3 w-3" /> Video</>
                      ) : it.media?.type === "image" ? (
                        <><ImageIcon className="h-3 w-3" /> Image</>
                      ) : (
                        "Unknown"
                      )}
                    </div>
                  </div>
                  {playlist && it.media && (
                    <button
                      onClick={() => MediaAdapter.projectPlaylist(playlist, idx)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                      title="Project from here"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
