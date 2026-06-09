import { useEffect, useState } from "react";
import { db } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import type { RendererProps } from "./index";
import { isImageContent } from "../content.types";

/**
 * Image renderer. Resolves the blob through the ref-counted URL cache so
 * preview and projector windows share a single ObjectURL per blob.
 */
export function ImageRenderer({ content }: RendererProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImageContent(content)) return;
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

  if (!isImageContent(content) || !url) return null;
  return (
    <img
      src={url}
      alt={content.title}
      className="absolute inset-0 h-full w-full object-contain"
      draggable={false}
    />
  );
}
