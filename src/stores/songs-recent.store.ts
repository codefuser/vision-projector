/**
 * Recently-projected songs (slide-level). Persisted, cap most-recent first.
 * Also tracks per-song usage counts so "Most Used" / "Recently Added" filters
 * can sort the library without keeping a separate analytics layer.
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
  /** songId → total projection count (across all slides) */
  counts: Record<number, number>;
  push: (v: Omit<RecentSong, "at">) => void;
  clear: () => void;
}

const MAX = 30;

export const useSongsRecent = create<RecentStore>()(
  persist(
    (set) => ({
      items: [],
      counts: {},
      push: (v) =>
        set((s) => {
          const key = `${v.songId}:${v.slideIndex}`;
          const filtered = s.items.filter(
            (x) => `${x.songId}:${x.slideIndex}` !== key,
          );
          return {
            items: [{ ...v, at: Date.now() }, ...filtered].slice(0, MAX),
            counts: { ...s.counts, [v.songId]: (s.counts[v.songId] ?? 0) + 1 },
          };
        }),
      clear: () => set({ items: [], counts: {} }),
    }),
    { name: "vision-songs-recent", storage: createJSONStorage(() => localStorage), version: 2 },
  ),
);
