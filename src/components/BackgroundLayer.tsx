/**
 * BackgroundLayer — renders a color / image / video underlay for projected
 * text. Resolves library media to a blob URL via the existing acquireUrl
 * ref-counting helpers and releases on unmount / change. Videos always
 * autoplay, loop, and stay muted with no controls.
 *
 * Applies the BackgroundConfig visual controls (opacity, blur, brightness,
 * zoom, position, fit) so Preview and Projector match exactly.
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

function withDefaults(bg: BackgroundConfig): Required<BackgroundConfig> {
  return {
    kind: bg.kind,
    color: bg.color,
    mediaId: bg.mediaId,
    fit: bg.fit ?? "cover",
    opacity: bg.opacity ?? 1,
    blur: bg.blur ?? 0,
    brightness: bg.brightness ?? 1,
    zoom: bg.zoom ?? 1,
    positionX: bg.positionX ?? 50,
    positionY: bg.positionY ?? 50,
  };
}

export function BackgroundLayer({ background }: Props) {
  const bg = withDefaults(background);
  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (bg.kind !== "media" || !bg.mediaId) {
      setMedia(null);
      return;
    }
    (async () => {
      const m = await getMedia(bg.mediaId!);
      if (!cancelled) setMedia(m ?? null);
    })();
    return () => { cancelled = true; };
  }, [bg.kind, bg.mediaId]);

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

  if (bg.kind === "none") return null;
  if (bg.kind === "color") {
    return <div className="absolute inset-0" style={{ background: bg.color }} />;
  }
  if (!media || !url) {
    return <div className="absolute inset-0" style={{ background: bg.color }} />;
  }
  const objectFit: React.CSSProperties["objectFit"] =
    bg.fit === "contain" ? "contain" : bg.fit === "stretch" ? "fill" : "cover";
  const style: React.CSSProperties = {
    objectFit,
    objectPosition: `${bg.positionX}% ${bg.positionY}%`,
    opacity: bg.opacity,
    transform: `scale(${bg.zoom})`,
    transformOrigin: `${bg.positionX}% ${bg.positionY}%`,
    filter: `blur(${bg.blur}px) brightness(${bg.brightness})`,
  };
  if (media.type === "video") {
    return (
      <video
        src={url}
        className="absolute inset-0 h-full w-full"
        style={style}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return <img src={url} alt="" className="absolute inset-0 h-full w-full" style={style} draggable={false} />;
}
