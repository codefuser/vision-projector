import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loadSongs } from "./loader";

export type SongLang = "ta" | "en" | "both";

export interface SongFavorite {
  id: number;
  title: string;
  addedAt: number;
}

interface SongStore {
  lang: SongLang;
  query: string;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  favorites: SongFavorite[];
  setLang: (l: SongLang) => void;
  setQuery: (q: string) => void;
  ensureLoaded: () => Promise<void>;
  addFavorite: (fav: Omit<SongFavorite, "addedAt">) => void;
  removeFavorite: (id: number) => void;
}

export const useSongsStore = create<SongStore>()(
  persist(
    (set, get) => ({
      lang: "ta",
      query: "",
      loading: false,
      loaded: false,
      error: null,
      favorites: [],
      setLang: (l) => set({ lang: l }),
      setQuery: (q) => set({ query: q }),
      ensureLoaded: async () => {
        if (get().loaded || get().loading) return;
        set({ loading: true, error: null });
        try {
          await loadSongs();
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
          ].slice(0, 200),
        })),
      removeFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
    }),
    {
      name: "vision-songs-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lang: s.lang, favorites: s.favorites }),
      version: 1,
    },
  ),
);
