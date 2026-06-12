/**
 * BackgroundLayer — renders a color / image / video underlay for projected
 * text. Resolves library media to a blob URL via the existing acquireUrl
 * ref-counting helpers and releases on unmount / change. Videos always
 * autoplay, loop, and stay muted with no controls.
 */
import { useEffect, useState } from "react";
import type { BackgroundConfig } from "@/lib/broadcast";
import { db } from "@/db/schema";
import type { MediaRecord } from "@/db/schema";
import { getMedia } from "@/db/repo";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";

interface Props {
  background: BackgroundConfig;
}

export function BackgroundLayer({ background }: Props) {
  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (background.kind !== "media" || !background.mediaId) {
      setMedia(null);
      return;
    }
    (async () => {
      const m = await getMedia(background.mediaId!);
      if (!cancelled) setMedia(m ?? null);
    })();
    return () => { cancelled = true; };
  }, [background.kind, background.mediaId]);

  useEffect(() => {
    let cancelled = false;
    let key: string | null = null;
    (async () => {
      if (!media) { setUrl(null); return; }
      const rec = await db().blobs.get(media.blobId);
      if (!rec || cancelled) return;
      key = media.blobId;
      setUrl(acquireUrl(key, rec.blob));
    })();
    return () => { cancelled = true; if (key) releaseUrl(key); };
  }, [media]);

  if (background.kind === "none") return null;
  if (background.kind === "color") {
    return <div className="absolute inset-0" style={{ background: background.color }} />;
  }
  if (!media || !url) {
    return <div className="absolute inset-0" style={{ background: background.color }} />;
  }
  const fitClass = background.fit === "contain" ? "object-contain" : "object-cover";
  if (media.type === "video") {
    return (
      <video
        src={url}
        className={`absolute inset-0 h-full w-full ${fitClass}`}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return <img src={url} alt="" className={`absolute inset-0 h-full w-full ${fitClass}`} draggable={false} />;
}
