import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface QueuedVerse {
  id: string; // "book:chapter:verse"
  book: number;
  chapter: number;
  verse: number;
  text: string;
  ref: string; // canonical English ref ("John 3:16")
  addedAt: number;
}

interface QueueStore {
  items: QueuedVerse[];
  currentIndex: number;
  sermonMode: boolean;
  panelOpen: boolean;

  enqueue: (v: Omit<QueuedVerse, "addedAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
  move: (from: number, to: number) => void;
  setCurrentIndex: (i: number) => void;
  next: () => QueuedVerse | null;
  prev: () => QueuedVerse | null;
  current: () => QueuedVerse | null;

  toggleSermon: () => void;
  setPanelOpen: (v: boolean) => void;
}

export const useBibleQueue = create<QueueStore>()(
  persist(
    (set, get) => ({
      items: [],
      currentIndex: -1,
      sermonMode: false,
      panelOpen: false,

      enqueue: (v) =>
        set((s) => {
          if (s.items.some((i) => i.id === v.id)) return s;
          return { items: [...s.items, { ...v, addedAt: Date.now() }] };
        }),
      remove: (id) =>
        set((s) => {
          const idx = s.items.findIndex((i) => i.id === id);
          if (idx < 0) return s;
          const items = s.items.filter((i) => i.id !== id);
          let ci = s.currentIndex;
          if (idx < ci) ci -= 1;
          else if (idx === ci) ci = Math.min(ci, items.length - 1);
          return { items, currentIndex: ci };
        }),
      clear: () => set({ items: [], currentIndex: -1 }),
      move: (from, to) =>
        set((s) => {
          const items = s.items.slice();
          const [it] = items.splice(from, 1);
          if (!it) return s;
          items.splice(to, 0, it);
          return { items };
        }),
      setCurrentIndex: (i) => set({ currentIndex: i }),
      next: () => {
        const s = get();
        const ni = Math.min(s.items.length - 1, s.currentIndex + 1);
        if (ni < 0 || ni === s.currentIndex) return null;
        set({ currentIndex: ni });
        return s.items[ni] ?? null;
      },
      prev: () => {
        const s = get();
        const pi = Math.max(0, s.currentIndex - 1);
        if (s.currentIndex <= 0) return null;
        set({ currentIndex: pi });
        return s.items[pi] ?? null;
      },
      current: () => {
        const s = get();
        return s.items[s.currentIndex] ?? null;
      },

      toggleSermon: () => set((s) => ({ sermonMode: !s.sermonMode, panelOpen: !s.sermonMode ? true : s.panelOpen })),
      setPanelOpen: (v) => set({ panelOpen: v }),
    }),
    {
      name: "vision-bible-queue",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, sermonMode: s.sermonMode }),
      version: 1,
    },
  ),
);
