/**
 * Theme Favorites / Recents / Most-Used — persisted per-operator quick
 * access lists shown at the top of the Theme Gallery.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface State {
  favorites: string[];
  recents: string[];                // most recent first, max 12
  usage: Record<string, number>;    // id -> apply count
  toggleFavorite: (id: string) => void;
  pushRecent: (id: string) => void;
  isFavorite: (id: string) => boolean;
  mostUsed: (limit?: number) => string[];
}

const MAX_RECENT = 12;

export const useThemeFavorites = create<State>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],
      usage: {},
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [id, ...s.favorites],
        })),
      pushRecent: (id) =>
        set((s) => ({
          recents: [id, ...s.recents.filter((x) => x !== id)].slice(0, MAX_RECENT),
          usage: { ...s.usage, [id]: (s.usage[id] ?? 0) + 1 },
        })),
      isFavorite: (id) => get().favorites.includes(id),
      mostUsed: (limit = 8) =>
        Object.entries(get().usage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => id),
    }),
    { name: "vision-theme-favorites", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
