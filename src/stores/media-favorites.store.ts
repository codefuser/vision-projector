/**
 * Media favorites — lightweight id-only store, persisted to localStorage.
 * The actual MediaRecord is resolved at click-time via getMedia().
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface MediaFavoritesStore {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}

export const useMediaFavorites = create<MediaFavoritesStore>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [id, ...s.ids].slice(0, 200) })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      toggle: (id) =>
        set((s) =>
          s.ids.includes(id)
            ? { ids: s.ids.filter((x) => x !== id) }
            : { ids: [id, ...s.ids].slice(0, 200) },
        ),
      has: (id) => get().ids.includes(id),
    }),
    { name: "vision-media-favorites", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
