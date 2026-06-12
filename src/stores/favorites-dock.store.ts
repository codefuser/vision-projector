import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FavoritesGroup = "bible" | "songs" | "media" | "text";

interface DockStore {
  open: boolean;
  group: FavoritesGroup;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  setGroup: (g: FavoritesGroup) => void;
}

export const useFavoritesDock = create<DockStore>()(
  persist(
    (set) => ({
      open: true,
      group: "bible",
      toggle: () => set((s) => ({ open: !s.open })),
      setOpen: (v) => set({ open: v }),
      setGroup: (g) => set({ group: g }),
    }),
    { name: "vision-favorites-dock", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
