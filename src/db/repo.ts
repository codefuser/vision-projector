import { db, DEFAULT_SETTINGS, type AppSettings, type FolderRecord, type MediaRecord, type PlaylistRecord, type PlaylistItem, type MediaType } from "./schema";
import { uid } from "@/lib/uid";
import { classifyMime, detectMime } from "@/lib/files";
import { generateImageThumb, generateVideoThumb } from "@/lib/thumbnails";
import { logger } from "@/lib/logger";

// ---------- Settings ----------
export async function getSettings(): Promise<AppSettings> {
  const row = await db().settings.get("app");
  if (!row) {
    await db().settings.put({ key: "app", value: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...row.value };
}
export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db().settings.put({ key: "app", value: next });
  return next;
}

// ---------- Folders ----------
export async function listFolders(): Promise<FolderRecord[]> {
  return db().folders.orderBy("name").toArray();
}
export async function createFolder(name: string, parentId: string | null = null): Promise<FolderRecord> {
  const now = Date.now();
  const rec: FolderRecord = { id: uid(), name: name.trim() || "Untitled", parentId, createdAt: now, updatedAt: now };
  await db().folders.add(rec);
  return rec;
}
export async function renameFolder(id: string, name: string) {
  await db().folders.update(id, { name: name.trim() || "Untitled", updatedAt: Date.now() });
}
export async function moveFolder(id: string, parentId: string | null) {
  if (id === parentId) return;
  // prevent cycles
  let cur = parentId;
  while (cur) {
    if (cur === id) return;
    const p: FolderRecord | undefined = await db().folders.get(cur);
    cur = p?.parentId ?? null;
  }
  await db().folders.update(id, { parentId, updatedAt: Date.now() });
}
export async function deleteFolderDeep(id: string) {
  const all = await listFolders();
  const toDelete = new Set<string>();
  const collect = (fid: string) => {
    toDelete.add(fid);
    for (const f of all) if (f.parentId === fid) collect(f.id);
  };
  collect(id);
  await db().transaction("rw", db().folders, db().media, db().blobs, db().playlists, async () => {
    for (const fid of toDelete) {
      const items = await db().media.where("folderId").equals(fid).toArray();
      for (const m of items) await deleteMediaInternal(m);
      await db().folders.delete(fid);
    }
  });
}

/**
 * Delete a folder but keep its files. Any media inside this folder (or its
 * descendants) is moved back to "All Media" (folderId = null). Child folders
 * are also removed, but their files are preserved likewise.
 */
export async function deleteFolderOnly(id: string) {
  const all = await listFolders();
  const toDelete = new Set<string>();
  const collect = (fid: string) => {
    toDelete.add(fid);
    for (const f of all) if (f.parentId === fid) collect(f.id);
  };
  collect(id);
  await db().transaction("rw", db().folders, db().media, async () => {
    for (const fid of toDelete) {
      const items = await db().media.where("folderId").equals(fid).toArray();
      for (const m of items) {
        await db().media.update(m.id, { folderId: null, updatedAt: Date.now() });
      }
      await db().folders.delete(fid);
    }
  });
}


// ---------- Media ----------
export async function listMediaInFolder(folderId: string | null): Promise<MediaRecord[]> {
  // dexie can't index null directly; use a sentinel filter
  if (folderId === null) {
    return db().media.filter((m) => m.folderId === null).toArray();
  }
  return db().media.where("folderId").equals(folderId).toArray();
}
export async function listAllMedia(): Promise<MediaRecord[]> {
  return db().media.toArray();
}
export async function getMedia(id: string) {
  return db().media.get(id);
}
export async function getBlob(id: string) {
  return db().blobs.get(id);
}

export type ImportProgress = { done: number; total: number; current?: string };

export async function importFiles(
  files: File[],
  folderId: string | null,
  onProgress?: (p: ImportProgress) => void,
): Promise<{ imported: MediaRecord[]; skipped: { name: string; reason: string }[] }> {
  const imported: MediaRecord[] = [];
  const skipped: { name: string; reason: string }[] = [];
  let done = 0;
  for (const file of files) {
    try {
      onProgress?.({ done, total: files.length, current: file.name });
      const mime = detectMime(file);
      const type = classifyMime(mime);
      if (!type) {
        skipped.push({ name: file.name, reason: "Unsupported format" });
        done++;
        continue;
      }
      const blobId = uid();
      let thumbBlobId: string | null = null;
      let width: number | undefined;
      let height: number | undefined;
      let durationMs: number | undefined;
      try {
        if (type === "image") {
          const t = await generateImageThumb(file);
          thumbBlobId = uid();
          await db().blobs.add({ id: thumbBlobId, blob: t.blob, kind: "thumb" });
          width = t.width;
          height = t.height;
        } else {
          const t = await generateVideoThumb(file);
          thumbBlobId = uid();
          await db().blobs.add({ id: thumbBlobId, blob: t.blob, kind: "thumb" });
          width = t.width;
          height = t.height;
          durationMs = t.durationMs;
        }
      } catch (e) {
        logger.warn(`Thumb generation failed for ${file.name}`, e);
      }
      await db().blobs.add({ id: blobId, blob: file, kind: "original" });
      const now = Date.now();
      const rec: MediaRecord = {
        id: uid(),
        name: file.name,
        type,
        mime,
        size: file.size,
        durationMs,
        width,
        height,
        folderId,
        blobId,
        thumbBlobId,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: null,
      };
      await db().media.add(rec);
      imported.push(rec);
    } catch (e) {
      logger.error(`Import failed: ${file.name}`, e);
      skipped.push({ name: file.name, reason: (e as Error).message });
    } finally {
      done++;
      onProgress?.({ done, total: files.length, current: file.name });
    }
  }
  return { imported, skipped };
}

export async function renameMedia(id: string, name: string) {
  await db().media.update(id, { name: name.trim() || "Untitled", updatedAt: Date.now() });
}
export async function moveMedia(ids: string[], folderId: string | null) {
  await db().transaction("rw", db().media, async () => {
    for (const id of ids) await db().media.update(id, { folderId, updatedAt: Date.now() });
  });
}
export async function touchMedia(id: string) {
  await db().media.update(id, { lastUsedAt: Date.now() });
}

async function deleteMediaInternal(m: MediaRecord) {
  if (m.blobId) await db().blobs.delete(m.blobId);
  if (m.thumbBlobId) await db().blobs.delete(m.thumbBlobId);
  await db().media.delete(m.id);
  // also remove from any playlist
  const playlists = await db().playlists.toArray();
  for (const p of playlists) {
    const filtered = p.items.filter((it) => it.mediaId !== m.id);
    if (filtered.length !== p.items.length) {
      await db().playlists.update(p.id, { items: filtered, updatedAt: Date.now() });
    }
  }
}
export async function deleteMedia(ids: string[]) {
  await db().transaction("rw", db().media, db().blobs, db().playlists, async () => {
    for (const id of ids) {
      const m = await db().media.get(id);
      if (m) await deleteMediaInternal(m);
    }
  });
}
export async function duplicateMedia(ids: string[]): Promise<MediaRecord[]> {
  const out: MediaRecord[] = [];
  for (const id of ids) {
    const m = await db().media.get(id);
    if (!m) continue;
    const now = Date.now();
    const copy: MediaRecord = {
      ...m,
      id: uid(),
      name: `${m.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
    };
    await db().media.add(copy);
    out.push(copy);
  }
  return out;
}

// ---------- Playlists ----------
export async function listPlaylists(): Promise<PlaylistRecord[]> {
  return db().playlists.orderBy("updatedAt").reverse().toArray();
}
export async function getPlaylist(id: string) {
  return db().playlists.get(id);
}
export async function createPlaylist(name: string): Promise<PlaylistRecord> {
  const now = Date.now();
  const rec: PlaylistRecord = { id: uid(), name: name.trim() || "Untitled Playlist", items: [], createdAt: now, updatedAt: now };
  await db().playlists.add(rec);
  return rec;
}
export async function renamePlaylist(id: string, name: string) {
  await db().playlists.update(id, { name: name.trim() || "Untitled Playlist", updatedAt: Date.now() });
}
export async function deletePlaylist(id: string) {
  await db().playlists.delete(id);
}
export async function duplicatePlaylist(id: string): Promise<PlaylistRecord | null> {
  const p = await db().playlists.get(id);
  if (!p) return null;
  const now = Date.now();
  const copy: PlaylistRecord = {
    ...p,
    id: uid(),
    name: `${p.name} (copy)`,
    items: p.items.map((it) => ({ ...it, id: uid() })),
    createdAt: now,
    updatedAt: now,
  };
  await db().playlists.add(copy);
  return copy;
}
export async function updatePlaylistItems(id: string, items: PlaylistItem[]) {
  await db().playlists.update(id, { items, updatedAt: Date.now() });
}
export async function addMediaToPlaylist(playlistId: string, mediaIds: string[]) {
  const p = await db().playlists.get(playlistId);
  if (!p) return;
  const settings = await getSettings();
  const allMedia = await db().media.bulkGet(mediaIds);
  const newItems: PlaylistItem[] = allMedia
    .filter((m): m is MediaRecord => !!m)
    .map((m) => ({
      id: uid(),
      mediaId: m.id,
      durationMs: m.type === "video" ? m.durationMs ?? settings.defaultImageDurationMs : settings.defaultImageDurationMs,
      transition: settings.defaultTransition,
    }));
  await db().playlists.update(playlistId, { items: [...p.items, ...newItems], updatedAt: Date.now() });
}

// helper: media type guard for editor-side typing
export function isVideo(m: MediaRecord | undefined | null): boolean {
  return m?.type === "video";
}
export type { MediaType };
