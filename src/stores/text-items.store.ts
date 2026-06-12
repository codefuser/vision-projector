/**
 * Text Items store — user-authored plain text items (announcements, notices,
 * Bible study notes, prayer points, custom messages). Each item splits into
 * slides on blank lines for the projection adapter.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TextItem {
  id: string;
  title: string;
  content: string;
  collection?: string | null;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface RecentEntry {
  itemId: string;
  slideIndex: number;
  at: number;
}

interface TextStore {
  items: TextItem[];
  recents: RecentEntry[];
  create: (init?: Partial<Pick<TextItem, "title" | "content" | "collection">>) => string;
  update: (id: string, patch: Partial<Omit<TextItem, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  toggleFavorite: (id: string) => void;
  pushRecent: (itemId: string, slideIndex: number) => void;
}

const newId = () => `txt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const RECENT_MAX = 30;

export const useTextItems = create<TextStore>()(
  persist(
    (set) => ({
      items: [],
      recents: [],
      create: (init) => {
        const id = newId();
        const now = Date.now();
        set((s) => ({
          items: [
            {
              id,
              title: init?.title?.trim() || "Untitled",
              content: init?.content ?? "",
              collection: init?.collection ?? null,
              favorite: false,
              createdAt: now,
              updatedAt: now,
            },
            ...s.items,
          ],
        }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it,
          ),
        })),
      remove: (id) =>
        set((s) => ({
          items: s.items.filter((it) => it.id !== id),
          recents: s.recents.filter((r) => r.itemId !== id),
        })),
      duplicate: (id) => {
        let newId2: string | null = null;
        set((s) => {
          const src = s.items.find((it) => it.id === id);
          if (!src) return s;
          newId2 = `txt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
          const now = Date.now();
          return {
            ...s,
            items: [
              { ...src, id: newId2, title: `${src.title} (copy)`, createdAt: now, updatedAt: now },
              ...s.items,
            ],
          };
        });
        return newId2;
      },
      toggleFavorite: (id) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, favorite: !it.favorite, updatedAt: Date.now() } : it,
          ),
        })),
      pushRecent: (itemId, slideIndex) =>
        set((s) => {
          const filtered = s.recents.filter(
            (r) => !(r.itemId === itemId && r.slideIndex === slideIndex),
          );
          return {
            recents: [{ itemId, slideIndex, at: Date.now() }, ...filtered].slice(0, RECENT_MAX),
          };
        }),
    }),
    { name: "vision-text-items", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

/** Split arbitrary text into slides on blank lines. Single \n stays inside
 *  the same slide; one or more blank lines starts a new slide. */
export function splitTextSlides(content: string): string[] {
  const trimmed = (content ?? "").replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
