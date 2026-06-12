/**
 * Apply a template preset across every style group + background + logo.
 * Operators can still tweak any field afterwards — templates are a starting
 * point, not a lock. Custom (operator-saved) templates are supported via the
 * custom-templates store and merged with built-ins when resolving by id.
 */
import { useTextFormat, type StyleGroup } from "@/lib/text-format/store";
import { useLogo } from "@/stores/logo.store";
import { useCustomTemplates } from "@/stores/custom-templates.store";
import { useThemeFavorites } from "@/stores/theme-favorites.store";
import { TEMPLATE_PRESETS, type TemplatePreset } from "./presets";

export function resolvePreset(id: string): TemplatePreset | null {
  const builtin = TEMPLATE_PRESETS.find((t) => t.id === id);
  if (builtin) return builtin;
  return useCustomTemplates.getState().templates.find((t) => t.id === id) ?? null;
}

export function applyTemplate(id: string): TemplatePreset | null {
  const preset = resolvePreset(id);
  if (!preset) return null;
  const groups: StyleGroup[] = ["reference", "tamil", "english"];
  const tf = useTextFormat.getState();
  for (const g of groups) {
    const merged = { ...preset.text, ...(preset.perGroup?.[g] ?? {}) };
    if (Object.keys(merged).length > 0) tf.patchGroup(g, merged);
  }
  if (preset.background) {
    // Reset gradient/animation explicitly so a non-animated template never
    // inherits a previous template's animation/gradient.
    tf.setBackground({
      gradient: preset.background.gradient ?? null,
      animation: preset.background.animation ?? "none",
      ...preset.background,
    });
  }
  if (preset.logo) {
    const logo = useLogo.getState();
    logo.setEnabled(preset.logo.enabled);
    if (preset.logo.settings) logo.patch(preset.logo.settings);
  }
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem("vision-active-template", id); } catch { /* ignore */ }
  }
  return preset;
}

export function activeTemplateId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem("vision-active-template"); } catch { return null; }
}
