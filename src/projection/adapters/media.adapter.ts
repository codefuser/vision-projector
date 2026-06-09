/**
 * Media Adapter.
 *
 * Maps the existing MediaRecord / PlaylistRecord domain objects into the
 * universal `ProjectionContent` model and hands them to the Projection
 * Engine. This is the one place where "media-shaped" data crosses into
 * the unified engine; every future module ships its own adapter and the
 * rest of the system stays untouched.
 */
import type { MediaRecord, PlaylistRecord } from "@/db/schema";
import { getPlaylist, touchMedia, getMedia, getSettings } from "@/db/repo";
import type {
  ImageBody,
  ProjectionContent,
  ProjectionStyle,
  VideoBody,
} from "../content.types";
import { projectionEngine } from "../engine";

function styleFromMedia(media: MediaRecord, override?: Partial<ProjectionStyle>): ProjectionStyle {
  return {
    background: "#000",
    transition: override?.transition,
    durationMs: override?.durationMs ?? media.durationMs,
    ...override,
  };
}

export function mediaToContent(media: MediaRecord): ProjectionContent<ImageBody | VideoBody> {
  const now = Date.now();
  const base = {
    id: `media:${media.id}`,
    title: media.name,
    source: { module: "media" as const, refId: media.id },
    metadata: {
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      folderId: media.folderId,
    },
    style: styleFromMedia(media),
    createdAt: media.createdAt ?? now,
    updatedAt: media.updatedAt ?? now,
  };
  if (media.type === "video") {
    return {
      ...base,
      type: "video",
      body: { mediaId: media.id, blobId: media.blobId, loop: false },
    };
  }
  return {
    ...base,
    type: "image",
    body: { mediaId: media.id, blobId: media.blobId },
  };
}

/**
 * Single-click "Selection = Projection" entry point for any media tile.
 * Auto-opens the projector window if needed (handled inside the engine).
 */
export async function projectMedia(media: MediaRecord): Promise<ProjectionContent> {
  void touchMedia(media.id).catch(() => undefined);
  return projectionEngine.project(mediaToContent(media));
}

export async function projectMediaById(mediaId: string): Promise<ProjectionContent | null> {
  const m = await getMedia(mediaId);
  if (!m) return null;
  return projectMedia(m);
}

/**
 * Project a playlist starting at `startIndex`. The existing
 * `LOAD_PLAYLIST` wire command resolves blobs inside the projector
 * window — this adapter just hands the engine a normalised queue and a
 * `source.refId` pointing at the playlist so the engine can preserve
 * the legacy behavior.
 */
export async function projectPlaylist(
  playlist: PlaylistRecord,
  startIndex = 0,
): Promise<ProjectionContent | null> {
  if (!playlist.items.length) return null;
  const settings = await getSettings();
  const items: ProjectionContent[] = [];
  for (const item of playlist.items) {
    const m = await getMedia(item.mediaId);
    if (!m) continue;
    const content = mediaToContent(m);
    content.id = `media:${m.id}#${item.id}`;
    content.style = {
      ...content.style,
      transition: item.transition || settings.defaultTransition,
      durationMs: item.durationMs || settings.defaultImageDurationMs,
    };
    content.source = { module: "media", refId: playlist.id };
    items.push(content);
  }
  if (!items.length) return null;
  const safeIndex = Math.min(Math.max(0, startIndex), items.length - 1);
  void touchMedia(playlist.items[safeIndex].mediaId).catch(() => undefined);
  return projectionEngine.projectQueue(items, safeIndex);
}

export async function projectPlaylistById(
  playlistId: string,
  startIndex = 0,
): Promise<ProjectionContent | null> {
  const p = await getPlaylist(playlistId);
  if (!p) return null;
  return projectPlaylist(p, startIndex);
}
