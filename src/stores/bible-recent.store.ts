/**
 * Recently-projected Bible verses. Persisted, capped, most-recent first.
 * Surfaced in the Bible panel when the search box is empty.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface RecentVerse {
  book: number;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
  at: number;
}

interface RecentStore {
  items: RecentVerse[];
  push: (v: Omit<RecentVerse, "at">) => void;
  clear: () => void;
}

const MAX = 30;

export const useBibleRecent = create<RecentStore>()(
  persist(
    (set) => ({
      items: [],
      push: (v) =>
        set((s) => {
          const key = `${v.book}:${v.chapter}:${v.verse}`;
          const filtered = s.items.filter(
            (x) => `${x.book}:${x.chapter}:${x.verse}` !== key,
          );
          return { items: [{ ...v, at: Date.now() }, ...filtered].slice(0, MAX) };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "vision-bible-recent", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
