/**
 * Recently-projected songs (slide-level). Persisted, capped, most-recent first.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface RecentSong {
  songId: number;
  slideIndex: number;
  title: string;
  preview: string;
  at: number;
}

interface RecentStore {
  items: RecentSong[];
  push: (v: Omit<RecentSong, "at">) => void;
  clear: () => void;
}

const MAX = 30;

export const useSongsRecent = create<RecentStore>()(
  persist(
    (set) => ({
      items: [],
      push: (v) =>
        set((s) => {
          const key = `${v.songId}:${v.slideIndex}`;
          const filtered = s.items.filter(
            (x) => `${x.songId}:${x.slideIndex}` !== key,
          );
          return { items: [{ ...v, at: Date.now() }, ...filtered].slice(0, MAX) };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "vision-songs-recent", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
