import { create } from "zustand";
import type { FolderRecord, MediaRecord, MediaType } from "@/db/schema";
import { listFolders, listMediaInFolder, listAllMedia } from "@/db/repo";

export type LibraryFilter = "all" | "images" | "videos" | "recent-added" | "recent-used";

interface LibraryStore {
  folders: FolderRecord[];
  media: MediaRecord[];
  currentFolderId: string | null;
  selection: Set<string>;
  search: string;
  filter: LibraryFilter;
  loading: boolean;
  refreshFolders: () => Promise<void>;
  refreshMedia: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setFolder: (id: string | null) => Promise<void>;
  setSearch: (s: string) => void;
  setFilter: (f: LibraryFilter) => void;
  toggleSelect: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
}

export const useLibrary = create<LibraryStore>((set, get) => ({
  folders: [],
  media: [],
  currentFolderId: null,
  selection: new Set(),
  search: "",
  filter: "all",
  loading: false,
  refreshFolders: async () => {
    set({ folders: await listFolders() });
  },
  refreshMedia: async () => {
    set({ loading: true });
    const { currentFolderId, filter } = get();
    let media: MediaRecord[];
    if (filter === "recent-added") {
      media = (await listAllMedia()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
    } else if (filter === "recent-used") {
      media = (await listAllMedia()).filter((m) => m.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)).slice(0, 200);
    } else if (currentFolderId === null) {
      // "All Media" = master view of every uploaded file, regardless of folder.
      media = await listAllMedia();
    } else {
      media = await listMediaInFolder(currentFolderId);
    }
    set({ media, loading: false });
  },
  refreshAll: async () => {
    await get().refreshFolders();
    await get().refreshMedia();
  },
  setFolder: async (id) => {
    set({ currentFolderId: id, selection: new Set() });
    await get().refreshMedia();
  },
  setSearch: (s) => set({ search: s }),
  setFilter: (f) => {
    set({ filter: f, selection: new Set() });
    void get().refreshMedia();
  },
  toggleSelect: (id, additive = false) => {
    const sel = new Set(additive ? get().selection : []);
    if (sel.has(id)) sel.delete(id);
    else sel.add(id);
    set({ selection: sel });
  },
  clearSelection: () => set({ selection: new Set() }),
  selectAll: (ids) => set({ selection: new Set(ids) }),
}));

export function filterMedia(items: MediaRecord[], search: string, filter: LibraryFilter): MediaRecord[] {
  let out = items;
  if (filter === "images") out = out.filter((m) => m.type === "image");
  else if (filter === "videos") out = out.filter((m) => m.type === "video");
  const q = search.trim().toLowerCase();
  if (q) out = out.filter((m) => m.name.toLowerCase().includes(q));
  return out;
}

export type { MediaRecord, FolderRecord, MediaType };
