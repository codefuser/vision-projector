import { useEffect, useRef, useState } from "react";
import { db } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import type { RendererProps } from "./index";
import { isVideoContent } from "../content.types";

/**
 * Video renderer. In `preview` mode it is always muted regardless of
 * projection volume so the operator hears audio only from the projector
 * window. Volume/muted props are applied to the projector instance.
 */
export function VideoRenderer({ content, mode, playing, muted, volume }: RendererProps) {
  const [url, setUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isVideoContent(content)) return;
    const { blobId } = content.body;
    let cancelled = false;
    let acquired = false;
    (async () => {
      const rec = await db().blobs.get(blobId);
      if (!rec || cancelled) return;
      const u = acquireUrl(blobId, rec.blob);
      acquired = true;
      if (cancelled) {
        releaseUrl(blobId);
        return;
      }
      setUrl(u);
    })();
    return () => {
      cancelled = true;
      if (acquired) releaseUrl(blobId);
    };
  }, [content]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (mode === "preview") {
      v.muted = true;
    } else {
      v.muted = !!muted;
      if (typeof volume === "number") v.volume = volume;
    }
  }, [mode, muted, volume, url]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing ?? true) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [playing, url]);

  if (!isVideoContent(content) || !url) return null;
  return (
    <video
      ref={videoRef}
      src={url}
      className="absolute inset-0 h-full w-full object-contain"
      playsInline
      loop={mode === "preview" ? true : !!content.body.loop}
      autoPlay
    />
  );
}
