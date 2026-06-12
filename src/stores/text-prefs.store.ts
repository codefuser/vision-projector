/**
 * Per-item split rule + format toolbar preferences. Kept separate from the
 * text-items store so existing item schema (and broadcast contracts) stay
 * untouched.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_SPLIT, type SplitRule } from "@/lib/text/split-rules";

interface TextPrefsState {
  rules: Record<string, SplitRule>;
  reveal: Record<string, boolean>;
  setRule: (itemId: string, rule: SplitRule) => void;
  setReveal: (itemId: string, on: boolean) => void;
  getRule: (itemId: string | null | undefined) => SplitRule;
}

export const useTextPrefs = create<TextPrefsState>()(
  persist(
    (set, get) => ({
      rules: {},
      reveal: {},
      setRule: (itemId, rule) =>
        set((s) => ({ rules: { ...s.rules, [itemId]: rule } })),
      setReveal: (itemId, on) =>
        set((s) => ({ reveal: { ...s.reveal, [itemId]: on } })),
      getRule: (itemId) => (itemId ? get().rules[itemId] ?? DEFAULT_SPLIT : DEFAULT_SPLIT),
    }),
    { name: "vision-text-prefs", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
