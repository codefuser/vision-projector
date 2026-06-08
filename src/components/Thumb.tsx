import { useEffect, useState } from "react";
import { Image as ImageIcon, Film } from "lucide-react";
import { db } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import type { MediaRecord } from "@/db/schema";

export function Thumb({ media, className }: { media: MediaRecord; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let key: string | null = null;
    (async () => {
      const id = media.thumbBlobId ?? media.blobId;
      if (!id) return;
      const rec = await db().blobs.get(id);
      if (!rec || cancelled) return;
      key = id;
      setUrl(acquireUrl(id, rec.blob));
    })();
    return () => {
      cancelled = true;
      if (key) releaseUrl(key);
    };
  }, [media.thumbBlobId, media.blobId]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-muted ${className ?? ""}`}>
      {url ? (
        <img src={url} alt={media.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="text-muted-foreground">
          {media.type === "video" ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
        </div>
      )}
      {media.type === "video" && (
        <div className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          VIDEO
        </div>
      )}
    </div>
  );
}
