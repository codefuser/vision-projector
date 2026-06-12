/**
 * Projection logo store — persists a small gallery of logos (max 5) plus the
 * currently-active logo and its placement settings. The logo overlay is
 * rendered globally on top of every projector content type (Bible/Songs/
 * Text/Image/Video) by <LogoLayer />.
 *
 * Logos are stored as data-URLs in localStorage (capped at ~256KB each).
 * That keeps the cross-window broadcast cheap and survives reload without
 * touching the existing IndexedDB schema.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useProjection } from "@/stores/projection.store";

export type LogoPosition =
  | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom";

export interface LogoItem {
  id: string;
  dataUrl: string;
  name: string;
}

export interface LogoSettings {
  widthPct: number;     // % of stage width
  opacity: number;      // 0..1
  radius: number;       // px
  shadow: boolean;
  position: LogoPosition;
  xPct: number;         // when custom
  yPct: number;         // when custom
}

export const DEFAULT_LOGO_SETTINGS: LogoSettings = {
  widthPct: 10,
  opacity: 1,
  radius: 0,
  shadow: false,
  position: "top-right",
  xPct: 80,
  yPct: 5,
};

export interface LogoConfig {
  enabled: boolean;
  current: LogoItem | null;
  settings: LogoSettings;
}

interface LogoStore {
  enabled: boolean;
  current: LogoItem | null;
  gallery: LogoItem[];
  settings: LogoSettings;
  setEnabled: (v: boolean) => void;
  addFromFile: (file: File) => Promise<void>;
  selectFromGallery: (id: string) => void;
  removeFromGallery: (id: string) => void;
  patch: (partial: Partial<LogoSettings>) => void;
  clearCurrent: () => void;
}

const MAX_LOGOS = 5;
const MAX_DIM = 512;

async function fileToDownscaledDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function broadcast(s: LogoStore) {
  try {
    const cfg: LogoConfig = { enabled: s.enabled, current: s.current, settings: s.settings };
    useProjection.getState().send({ type: "UPDATE_LOGO", logo: cfg });
  } catch { /* */ }
}

export const useLogo = create<LogoStore>()(
  persist(
    (set, get) => ({
      enabled: false,
      current: null,
      gallery: [],
      settings: DEFAULT_LOGO_SETTINGS,
      setEnabled: (v) => { set({ enabled: v }); broadcast(get()); },
      addFromFile: async (file) => {
        const dataUrl = await fileToDownscaledDataUrl(file);
        const item: LogoItem = { id: crypto.randomUUID(), dataUrl, name: file.name };
        set((s) => {
          const gallery = [item, ...s.gallery].slice(0, MAX_LOGOS);
          return { gallery, current: item, enabled: true };
        });
        broadcast(get());
      },
      selectFromGallery: (id) => {
        const item = get().gallery.find((g) => g.id === id);
        if (!item) return;
        set({ current: item, enabled: true });
        broadcast(get());
      },
      removeFromGallery: (id) => {
        set((s) => {
          const gallery = s.gallery.filter((g) => g.id !== id);
          const current = s.current?.id === id ? (gallery[0] ?? null) : s.current;
          return { gallery, current };
        });
        broadcast(get());
      },
      patch: (partial) => {
        set((s) => ({ settings: { ...s.settings, ...partial } }));
        broadcast(get());
      },
      clearCurrent: () => { set({ current: null }); broadcast(get()); },
    }),
    {
      name: "vision-logo",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
