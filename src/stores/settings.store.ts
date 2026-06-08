import { create } from "zustand";
import { DEFAULT_SETTINGS, type AppSettings } from "@/db/schema";
import { getSettings, saveSettings } from "@/db/repo";

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettings = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const s = await getSettings();
    set({ settings: s, loaded: true });
    applyTheme(s.theme);
  },
  update: async (patch) => {
    const next = await saveSettings(patch);
    set({ settings: next });
    if (patch.theme) applyTheme(next.theme);
  },
}));

export function applyTheme(mode: AppSettings["theme"]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}
