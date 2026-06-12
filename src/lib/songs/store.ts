/**
 * Songs store — Tamil-only. Persists favorites, user-created songs, and the
 * current query / selection. User-created songs are merged into the
 * searchable library via `setUserSongs(...)` whenever they change.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSong, loadSongs, setUserSongs, type Song } from "./loader";

export interface SongFavorite {
  id: number;
  title: string;
  addedAt: number;
}

/** Minimal persisted shape — full Song objects are rebuilt on hydration so
 *  search indexes always match the current normalization rules. */
interface PersistedUserSong {
  id: number;
  title: string;
  content: string;
  artist?: string;
  album?: string;
  scale?: string;
}

interface SongStore {
  query: string;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  favorites: SongFavorite[];
  userSongs: PersistedUserSong[];
  /** Currently opened song (drives the right-side slide pane). */
  selectedSongId: number | null;
  setQuery: (q: string) => void;
  ensureLoaded: () => Promise<void>;
  addFavorite: (fav: Omit<SongFavorite, "addedAt">) => void;
  removeFavorite: (id: number) => void;
  selectSong: (id: number | null) => void;
  /** Create a new song. Returns the new id. */
  addUserSong: (s: Omit<PersistedUserSong, "id">) => number;
  /** Create OR override an existing song by id (used to edit library songs). */
  upsertUserSong: (s: PersistedUserSong) => void;
  updateUserSong: (id: number, patch: Partial<PersistedUserSong>) => void;
  removeUserSong: (id: number) => void;
}

function syncUserSongs(list: PersistedUserSong[]) {
  setUserSongs(list.map((u) => buildSong({ ...u, userCreated: true })));
}

// IDs for user songs start way above any library id to avoid collisions.
const USER_ID_BASE = 9_000_000;

export const useSongsStore = create<SongStore>()(
  persist(
    (set, get) => ({
      query: "",
      loading: false,
      loaded: false,
      error: null,
      favorites: [],
      userSongs: [],
      selectedSongId: null,
      setQuery: (q) => set({ query: q }),
      ensureLoaded: async () => {
        if (get().loaded || get().loading) return;
        set({ loading: true, error: null });
        try {
          await loadSongs();
          // Re-register user songs once the library cache exists.
          syncUserSongs(get().userSongs);
          set({ loaded: true, loading: false });
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
        }
      },
      addFavorite: (fav) =>
        set((s) => ({
          favorites: [
            { ...fav, addedAt: Date.now() },
            ...s.favorites.filter((f) => f.id !== fav.id),
          ].slice(0, 500),
        })),
      removeFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
      selectSong: (id) => set({ selectedSongId: id }),
      addUserSong: (s) => {
        const id = (get().userSongs.reduce((m, x) => Math.max(m, x.id), USER_ID_BASE)) + 1;
        const next = [...get().userSongs, { ...s, id }];
        set({ userSongs: next });
        syncUserSongs(next);
        return id;
      },
      upsertUserSong: (s) => {
        const exists = get().userSongs.some((u) => u.id === s.id);
        const next = exists
          ? get().userSongs.map((u) => (u.id === s.id ? s : u))
          : [...get().userSongs, s];
        set({ userSongs: next });
        syncUserSongs(next);
      },
      updateUserSong: (id, patch) => {
        const next = get().userSongs.map((u) => (u.id === id ? { ...u, ...patch } : u));
        set({ userSongs: next });
        syncUserSongs(next);
      },
      removeUserSong: (id) => {
        const next = get().userSongs.filter((u) => u.id !== id);
        set({ userSongs: next });
        syncUserSongs(next);
        if (get().selectedSongId === id) set({ selectedSongId: null });
      },
    }),
    {
      name: "vision-songs-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ favorites: s.favorites, userSongs: s.userSongs }),
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (state?.userSongs?.length) syncUserSongs(state.userSongs);
      },
    },
  ),
);
