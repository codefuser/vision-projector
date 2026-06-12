import Dexie, { type Table } from "dexie";

export type MediaType = "image" | "video";
export type TransitionType = "fade" | "crossfade" | "zoom" | "dissolve" | "none";
export type LoopMode = "single" | "playlist" | "none";
export type ThemeMode = "light" | "dark" | "system";

export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MediaRecord {
  id: string;
  name: string;
  type: MediaType;
  mime: string;
  size: number;
  durationMs?: number;
  width?: number;
  height?: number;
  folderId: string | null;
  blobId: string;
  thumbBlobId: string | null;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
}

export interface BlobRecord {
  id: string;
  blob: Blob;
  kind: "original" | "thumb";
}

export interface PlaylistItem {
  id: string;
  mediaId: string;
  durationMs: number; // image duration; for videos uses video's own length unless overridden
  transition: TransitionType;
  muted?: boolean;
  /** Operator notes shown in Service Mode (cue sheet). */
  notes?: string;
  /** Optional title override for the cue list. */
  label?: string;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  defaultImageDurationMs: number;
  defaultTransition: TransitionType;
  defaultLoopMode: LoopMode;
  defaultVolume: number; // 0..1
  autoplayVideo: boolean;
  muteOnStart: boolean;
  language: string;
}

export interface SettingsRecord {
  key: "app";
  value: AppSettings;
}

export interface LogRecord {
  id?: number;
  level: "info" | "warn" | "error";
  message: string;
  ctx?: string;
  ts: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  defaultImageDurationMs: 5000,
  defaultTransition: "fade",
  defaultLoopMode: "none",
  defaultVolume: 0.8,
  autoplayVideo: true,
  muteOnStart: false,
  language: "en",
};

export class ChurchMediaDB extends Dexie {
  folders!: Table<FolderRecord, string>;
  media!: Table<MediaRecord, string>;
  blobs!: Table<BlobRecord, string>;
  playlists!: Table<PlaylistRecord, string>;
  settings!: Table<SettingsRecord, "app">;
  logs!: Table<LogRecord, number>;

  constructor() {
    super("church-media-db");
    this.version(1).stores({
      folders: "id, parentId, name, updatedAt",
      media: "id, folderId, type, name, createdAt, lastUsedAt, updatedAt",
      blobs: "id, kind",
      playlists: "id, name, updatedAt",
      settings: "key",
      logs: "++id, ts, level",
    });
  }
}

let _db: ChurchMediaDB | null = null;
export function db(): ChurchMediaDB {
  if (typeof window === "undefined") {
    // SSR safety: return a stub that throws if used during render
    throw new Error("DB is browser-only");
  }
  if (!_db) _db = new ChurchMediaDB();
  return _db;
}
