import { useEffect, useState } from "react";
import { X, Play } from "lucide-react";
import { db } from "@/db/schema";
import type { MediaRecord } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import { formatBytes, formatDuration } from "@/lib/files";

export function MediaPreview({
  media,
  onClose,
  onProject,
}: {
  media: MediaRecord;
  onClose: () => void;
  onProject: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rec = await db().blobs.get(media.blobId);
      if (rec && !cancelled) setUrl(acquireUrl(media.blobId, rec.blob));
    })();
    const key = media.blobId;
    return () => {
      cancelled = true;
      releaseUrl(key);
    };
  }, [media.blobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium" title={media.name}>{media.name}</div>
            <div className="text-xs text-muted-foreground">
              {media.type === "video" ? formatDuration(media.durationMs) : `${media.width ?? "?"}×${media.height ?? "?"}`} ·{" "}
              {formatBytes(media.size)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onProject}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5" /> Project
            </button>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-black">
          {url ? (
            media.type === "image" ? (
              <img src={url} alt={media.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <video src={url} controls autoPlay className="max-h-full max-w-full" />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
