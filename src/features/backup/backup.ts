import { zip, unzip, strToU8, strFromU8 } from "fflate";
import { db, DEFAULT_SETTINGS, type FolderRecord, type MediaRecord, type PlaylistRecord, type SettingsRecord } from "@/db/schema";
import { useSongsStore } from "@/lib/songs/store";

const BACKUP_VERSION = 2;

interface UserSongRecord {
  id: number;
  title: string;
  content: string;
  artist?: string;
  album?: string;
  scale?: string;
}

interface Manifest {
  version: number;
  exportedAt: number;
  folders: FolderRecord[];
  media: Array<MediaRecord & { blobFile?: string; thumbFile?: string }>;
  playlists: PlaylistRecord[];
  settings: SettingsRecord["value"];
  /** v2+ — user-created songs persisted by the Songs module. */
  userSongs?: UserSongRecord[];
}

export async function exportBackup(): Promise<Blob> {
  const [folders, media, playlists, settingsRow, blobs] = await Promise.all([
    db().folders.toArray(),
    db().media.toArray(),
    db().playlists.toArray(),
    db().settings.get("app"),
    db().blobs.toArray(),
  ]);

  const blobIndex = new Map(blobs.map((b) => [b.id, b]));
  const files: Record<string, Uint8Array> = {};
  const mediaWithRefs = await Promise.all(
    media.map(async (m) => {
      const orig = blobIndex.get(m.blobId);
      const thumb = m.thumbBlobId ? blobIndex.get(m.thumbBlobId) : undefined;
      let blobFile: string | undefined;
      let thumbFile: string | undefined;
      if (orig) {
        blobFile = `blobs/${m.blobId}.bin`;
        files[blobFile] = new Uint8Array(await orig.blob.arrayBuffer());
      }
      if (thumb) {
        thumbFile = `blobs/${m.thumbBlobId}.bin`;
        files[thumbFile] = new Uint8Array(await thumb.blob.arrayBuffer());
      }
      return { ...m, blobFile, thumbFile };
    }),
  );

  const manifest: Manifest = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    folders,
    media: mediaWithRefs,
    playlists,
    settings: settingsRow?.value ?? DEFAULT_SETTINGS,
    userSongs: useSongsStore.getState().userSongs,
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest));

  const zipped: Uint8Array = await new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)));
  });
  return new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
}

export async function importBackup(file: Blob, opts: { mode: "merge" | "replace" }): Promise<void> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries: Record<string, Uint8Array> = await new Promise((resolve, reject) => {
    unzip(buf, (err, data) => (err ? reject(err) : resolve(data)));
  });
  const manifestRaw = entries["manifest.json"];
  if (!manifestRaw) throw new Error("Invalid backup: missing manifest.json");
  const manifest = JSON.parse(strFromU8(manifestRaw)) as Manifest;
  if (manifest.version > BACKUP_VERSION) throw new Error(`Backup version ${manifest.version} is newer than supported (${BACKUP_VERSION})`);

  await db().transaction("rw", [db().folders, db().media, db().blobs, db().playlists, db().settings], async () => {
    if (opts.mode === "replace") {
      await db().folders.clear();
      await db().media.clear();
      await db().blobs.clear();
      await db().playlists.clear();
    }
    // folders
    for (const f of manifest.folders) await db().folders.put(f);
    // media + blobs
    for (const m of manifest.media) {
      if (m.blobFile && entries[m.blobFile]) {
        const u8 = entries[m.blobFile];
        await db().blobs.put({ id: m.blobId, blob: new Blob([u8.buffer as ArrayBuffer], { type: m.mime }), kind: "original" });
      }
      if (m.thumbBlobId && m.thumbFile && entries[m.thumbFile]) {
        const u8 = entries[m.thumbFile];
        await db().blobs.put({ id: m.thumbBlobId, blob: new Blob([u8.buffer as ArrayBuffer], { type: "image/webp" }), kind: "thumb" });
      }
      const { blobFile: _b, thumbFile: _t, ...clean } = m;
      void _b; void _t;
      await db().media.put(clean as MediaRecord);
    }
    for (const p of manifest.playlists) await db().playlists.put(p);
    await db().settings.put({ key: "app", value: manifest.settings });
  });

  // User songs live in localStorage via zustand-persist — restore them
  // outside the Dexie transaction.
  if (manifest.userSongs && manifest.userSongs.length) {
    const store = useSongsStore.getState();
    if (opts.mode === "replace") {
      for (const u of store.userSongs) store.removeUserSong(u.id);
    }
    for (const u of manifest.userSongs) store.upsertUserSong(u);
  }
}
