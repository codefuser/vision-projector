import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CollectionVerse {
  id: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
  ref: string;
  addedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  verses: CollectionVerse[];
  createdAt: number;
}

interface CollectionsStore {
  collections: Collection[];
  create: (name: string) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addVerse: (collectionId: string, v: Omit<CollectionVerse, "addedAt">) => void;
  removeVerse: (collectionId: string, verseId: string) => void;
}

const DEFAULTS = ["Salvation", "Faith", "Prayer", "Healing", "Worship"];

export const useBibleCollections = create<CollectionsStore>()(
  persist(
    (set) => ({
      collections: DEFAULTS.map((name, i) => ({
        id: `default-${i}`,
        name,
        verses: [],
        createdAt: Date.now() + i,
      })),
      create: (name) => {
        const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
          collections: [
            ...s.collections,
            { id, name: name.trim() || "Untitled", verses: [], createdAt: Date.now() },
          ],
        }));
        return id;
      },
      rename: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
      remove: (id) =>
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
      addVerse: (collectionId, v) =>
        set((s) => ({
          collections: s.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (c.verses.some((x) => x.id === v.id)) return c;
            return { ...c, verses: [...c.verses, { ...v, addedAt: Date.now() }] };
          }),
        })),
      removeVerse: (collectionId, verseId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId ? { ...c, verses: c.verses.filter((v) => v.id !== verseId) } : c,
          ),
        })),
    }),
    {
      name: "vision-bible-collections",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
