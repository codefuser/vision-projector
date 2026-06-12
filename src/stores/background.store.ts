/**
 * Background / Effects toggle store.
 *
 * These toggles are deliberately decoupled from the actual `BackgroundConfig`
 * data (which still lives in `useTextFormat.groups.background` for projector
 * wire-format compatibility). The role of this store is to gate behaviour:
 *
 *  • `themeBackgroundEnabled` — when a theme is applied, should its bundled
 *    background overwrite the current one? When OFF, the operator's custom
 *    background is preserved across theme switches.
 *  • `customBackgroundEnabled` — explicit "I'm using a custom background"
 *    intent. When ON, theme backgrounds are always skipped regardless of the
 *    above toggle.
 *  • Master toggles for the projection layers (background / logo /
 *    motion / particles / text shadow / text stroke).
 *
 * All state is persisted to localStorage so projector and operator windows
 * agree across reloads.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface BackgroundToggleState {
  /** Master: render any background layer at all. */
  backgroundEnabled: boolean;
  /** Master: render the logo overlay. */
  logoEnabled: boolean;
  /** Allow theme application to write the background. */
  themeBackgroundEnabled: boolean;
  /** Operator has opted into a custom background; locks the theme out. */
  customBackgroundEnabled: boolean;
  /** Render the animated decorative overlay (`BackgroundConfig.animation`). */
  motionEnabled: boolean;
  /** Render particle-style animations specifically. */
  particlesEnabled: boolean;
  /** Master: apply text shadow effect across all text groups. */
  textShadowEnabled: boolean;
  /** Master: apply text stroke/outline effect across all text groups. */
  textStrokeEnabled: boolean;

  set: <K extends keyof Omit<BackgroundToggleState, "set" | "setMany">>(
    key: K,
    value: BackgroundToggleState[K],
  ) => void;
  setMany: (partial: Partial<Omit<BackgroundToggleState, "set" | "setMany">>) => void;
}

export const useBackground = create<BackgroundToggleState>()(
  persist(
    (set) => ({
      backgroundEnabled: true,
      logoEnabled: true,
      themeBackgroundEnabled: true,
      customBackgroundEnabled: false,
      motionEnabled: true,
      particlesEnabled: true,
      textShadowEnabled: true,
      textStrokeEnabled: true,

      set: (key, value) => set({ [key]: value } as Partial<BackgroundToggleState>),
      setMany: (partial) => set(partial as Partial<BackgroundToggleState>),
    }),
    {
      name: "vision-background-toggles",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/**
 * Returns true when `applyTemplate` should write the preset's background.
 * Theme writes background only when both toggles agree:
 *   themeBackgroundEnabled === true AND customBackgroundEnabled === false.
 */
export function canThemeWriteBackground(): boolean {
  const s = useBackground.getState();
  return s.themeBackgroundEnabled && !s.customBackgroundEnabled;
}
