/**
 * Custom Templates — operator-saved themes captured from the current
 * Reference / Tamil / English style groups + background + logo. Persisted
 * to localStorage so they survive reloads and appear in the Theme Gallery
 * alongside built-in presets.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TemplatePreset } from "@/lib/templates/presets";
import { useTextFormat } from "@/lib/text-format/store";
import { useLogo } from "@/stores/logo.store";

interface CustomTemplatesStore {
  templates: TemplatePreset[];
  saveCurrent: (name: string, description?: string) => TemplatePreset;
  duplicate: (source: TemplatePreset, name?: string) => TemplatePreset;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
}

export const useCustomTemplates = create<CustomTemplatesStore>()(
  persist(
    (set) => ({
      templates: [],
      saveCurrent: (name, description = "Custom saved theme.") => {
        const groups = useTextFormat.getState().groups;
        const logo = useLogo.getState();
        const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const preset: TemplatePreset = {
          id,
          name: name.trim() || "Untitled Theme",
          description,
          category: "Animated Themes",
          text: { ...groups.english },
          perGroup: {
            reference: { ...groups.reference },
            tamil: { ...groups.tamil },
            english: { ...groups.english },
          },
          background: { ...groups.background },
          logo: { enabled: logo.enabled, settings: { ...logo.settings } },
        };
        set((s) => ({ templates: [preset, ...s.templates] }));
        return preset;
      },
      duplicate: (source, name) => {
        const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const preset: TemplatePreset = {
          ...source,
          id,
          name: (name?.trim() || `${source.name} (Copy)`),
          description: source.description,
          category: "Animated Themes",
        };
        set((s) => ({ templates: [preset, ...s.templates] }));
        return preset;
      },
      remove: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      rename: (id, name) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, name } : t)) })),
    }),
    { name: "vision-custom-templates", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
