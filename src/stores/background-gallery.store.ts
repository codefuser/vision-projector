/**
 * Saved backgrounds gallery (persisted). Each item references either a
 * solid color or a media file from the existing library (by id). We don't
 * duplicate blobs — removing an item from the gallery never deletes the
 * library media itself.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface BackgroundItem {
  id: string;
  kind: "color" | "media";
  color?: string;
  mediaId?: string;
  name?: string;
}

interface BgGalleryStore {
  items: BackgroundItem[];
  addColor: (color: string) => void;
  addMedia: (mediaId: string, name?: string) => void;
  remove: (id: string) => void;
}

export const useBackgroundGallery = create<BgGalleryStore>()(
  persist(
    (set) => ({
      items: [],
      addColor: (color) =>
        set((s) => ({
          items: [{ id: crypto.randomUUID(), kind: "color" as const, color }, ...s.items].slice(0, 50),
        })),
      addMedia: (mediaId, name) =>
        set((s) => {
          if (s.items.some((i) => i.kind === "media" && i.mediaId === mediaId)) return s;
          return {
            items: [{ id: crypto.randomUUID(), kind: "media" as const, mediaId, name }, ...s.items].slice(0, 50),
          };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: "vision-bg-gallery", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
