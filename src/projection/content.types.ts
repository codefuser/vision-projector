/**
 * Universal Projection Content Model.
 *
 * Every projectable item — image, video, Bible verse, song slide, live text,
 * announcement, sermon point — is normalised into this shape before it
 * reaches the Projection Engine. New modules add a new `type` literal and a
 * matching renderer; the engine, store, preview, and projector code never
 * need to change.
 */
import type { TransitionType } from "@/db/schema";

export type ProjectionContentType =
  | "image"
  | "video"
  | "bible_verse"
  | "song_slide"
  | "live_text"
  | "announcement"
  | "sermon_point"
  | "service_item";

export type SourceModule =
  | "media"
  | "bible"
  | "songs"
  | "text"
  | "announcements"
  | "sermon"
  | "service"
  | "system";

export interface ProjectionStyle {
  background?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  padding?: number;
  shadow?: boolean;
  transition?: TransitionType;
  durationMs?: number;
}

export interface ProjectionSource {
  module: SourceModule;
  refId?: string;
}

/** Type-safe body payloads per content type. */
export interface ImageBody {
  blobId: string;
  mediaId: string;
}
export interface VideoBody {
  blobId: string;
  mediaId: string;
  loop?: boolean;
}
export interface BibleVerseBody {
  reference: string;
  text: string;
  translation: string;
}
export interface SongSlideBody {
  songId: string;
  slideIndex: number;
  lines: string[];
}
export interface LiveTextBody {
  text: string;
}
export interface AnnouncementBody {
  title: string;
  text?: string;
}
export interface SermonPointBody {
  heading: string;
  body?: string;
}
export interface ServiceItemBody {
  serviceId: string;
  itemId: string;
}

export type ProjectionBody =
  | ImageBody
  | VideoBody
  | BibleVerseBody
  | SongSlideBody
  | LiveTextBody
  | AnnouncementBody
  | SermonPointBody
  | ServiceItemBody;

export interface ProjectionContent<TBody extends ProjectionBody = ProjectionBody> {
  id: string;
  type: ProjectionContentType;
  title: string;
  source: ProjectionSource;
  metadata: Record<string, unknown>;
  style: ProjectionStyle;
  body: TBody;
  createdAt: number;
  updatedAt: number;
}

/** Narrowing helpers for renderers. */
export function isImageContent(c: ProjectionContent): c is ProjectionContent<ImageBody> {
  return c.type === "image";
}
export function isVideoContent(c: ProjectionContent): c is ProjectionContent<VideoBody> {
  return c.type === "video";
}

export interface HistoryEntry {
  id: string;
  contentId: string;
  type: ProjectionContentType;
  title: string;
  sourceModule: SourceModule;
  projectedAt: number;
}
