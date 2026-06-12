/**
 * Shared Text Formatting store.
 *
 * Phase 4 — split into three independent groups (Reference / Tamil / English)
 * plus a dedicated Background layer. Every mutation broadcasts both the
 * grouped payload (new renderer path) and a legacy UPDATE_TEXT_STYLE that
 * carries the English group so older listeners keep working.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_GROUPED_STYLES,
  type BackgroundConfig,
  type GroupedStyles,
  type SectionStyle,
  type TextStyle,
} from "@/lib/broadcast";
import { useProjection } from "@/stores/projection.store";

export type StyleGroup = "reference" | "tamil" | "english";

interface TextFormatStore {
  groups: GroupedStyles;
  /** Legacy alias mirroring the english group — keeps existing imports compiling. */
  style: TextStyle;
  setField: <K extends keyof SectionStyle>(group: StyleGroup, key: K, value: SectionStyle[K]) => void;
  /** Legacy single-group setter (writes to english) — preserved for compatibility. */
  set: <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => void;
  patchGroup: (group: StyleGroup, partial: Partial<SectionStyle>) => void;
  setBackground: (partial: Partial<BackgroundConfig>) => void;
  reset: () => void;
  resetGroup: (group: StyleGroup) => void;
}

let rafHandle: number | null = null;
function broadcastSoon(groups: GroupedStyles) {
  if (typeof window === "undefined") return;
  if (rafHandle != null) return;
  rafHandle = window.requestAnimationFrame(() => {
    rafHandle = null;
    try {
      const proj = useProjection.getState();
      proj.send({ type: "UPDATE_STYLES", styles: groups });
      proj.send({ type: "UPDATE_TEXT_STYLE", style: stripSection(groups.english) });
    } catch {
      /* projection store not ready yet */
    }
  });
}

function stripSection(s: SectionStyle): TextStyle {
  const { visible: _v, ...rest } = s;
  void _v;
  return rest;
}

export const useTextFormat = create<TextFormatStore>()(
  persist(
    (set, get) => ({
      groups: { ...DEFAULT_GROUPED_STYLES },
      style: stripSection(DEFAULT_GROUPED_STYLES.english),
      setField: (group, key, value) => {
        set((s) => {
          const next: GroupedStyles = {
            ...s.groups,
            [group]: { ...s.groups[group], [key]: value },
          };
          return { groups: next, style: stripSection(next.english) };
        });
        broadcastSoon(get().groups);
      },
      set: (key, value) => {
        set((s) => {
          const next: GroupedStyles = {
            ...s.groups,
            english: { ...s.groups.english, [key]: value },
          };
          return { groups: next, style: stripSection(next.english) };
        });
        broadcastSoon(get().groups);
      },
      patchGroup: (group, partial) => {
        set((s) => {
          const next: GroupedStyles = {
            ...s.groups,
            [group]: { ...s.groups[group], ...partial },
          };
          return { groups: next, style: stripSection(next.english) };
        });
        broadcastSoon(get().groups);
      },
      setBackground: (partial) => {
        set((s) => {
          const next: GroupedStyles = {
            ...s.groups,
            background: { ...s.groups.background, ...partial },
          };
          return { groups: next, style: s.style };
        });
        // Background can also be sent on its own for a cheap update path.
        try {
          useProjection.getState().send({
            type: "UPDATE_BACKGROUND",
            background: get().groups.background,
          });
        } catch { /* */ }
        broadcastSoon(get().groups);
      },
      reset: () => {
        set({
          groups: { ...DEFAULT_GROUPED_STYLES },
          style: stripSection(DEFAULT_GROUPED_STYLES.english),
        });
        broadcastSoon(get().groups);
      },
      resetGroup: (group) => {
        set((s) => {
          const next: GroupedStyles = {
            ...s.groups,
            [group]: { ...DEFAULT_GROUPED_STYLES[group] as SectionStyle },
          };
          return { groups: next, style: stripSection(next.english) };
        });
        broadcastSoon(get().groups);
      },
    }),
    {
      name: "vision-text-format",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: unknown) => {
        const p = persisted as { style?: TextStyle; groups?: GroupedStyles } | undefined;
        if (p?.groups) return p as never;
        if (p?.style) {
          const base: SectionStyle = { ...p.style, visible: true };
          const groups: GroupedStyles = {
            reference: { ...DEFAULT_GROUPED_STYLES.reference },
            tamil: { ...base, fontFamily: "Latha" },
            english: base,
            background: { ...DEFAULT_GROUPED_STYLES.background, color: p.style.background },
          };
          return { groups, style: stripSection(groups.english) } as never;
        }
        return { groups: DEFAULT_GROUPED_STYLES, style: stripSection(DEFAULT_GROUPED_STYLES.english) } as never;
      },
    },
  ),
);
