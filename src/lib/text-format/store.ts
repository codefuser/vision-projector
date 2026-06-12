/**
 * Shared Text Formatting store.
 *
 * Drives the formatting controls in TextFormattingPanel and the rendering
 * of every projected text overlay (Bible, Songs, free Text). Each setter
 * also broadcasts an UPDATE_TEXT_STYLE command so the projector window and
 * Live Preview mirror update instantly with no perceptible lag.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_TEXT_STYLE, type TextStyle } from "@/lib/broadcast";
import { useProjection } from "@/stores/projection.store";

interface TextFormatStore {
  style: TextStyle;
  set: <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => void;
  patch: (partial: Partial<TextStyle>) => void;
  reset: () => void;
}

function broadcast(style: TextStyle) {
  try {
    useProjection.getState().send({ type: "UPDATE_TEXT_STYLE", style });
  } catch {
    // store may not be initialised yet during boot — first projection will
    // include the style payload anyway.
  }
}

export const useTextFormat = create<TextFormatStore>()(
  persist(
    (set, get) => ({
      style: { ...DEFAULT_TEXT_STYLE },
      set: (key, value) => {
        set((s) => ({ style: { ...s.style, [key]: value } }));
        broadcast(get().style);
      },
      patch: (partial) => {
        set((s) => ({ style: { ...s.style, ...partial } }));
        broadcast(get().style);
      },
      reset: () => {
        set({ style: { ...DEFAULT_TEXT_STYLE } });
        broadcast(get().style);
      },
    }),
    {
      name: "vision-text-format",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
