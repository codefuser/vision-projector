/**
 * Apply a template preset across every style group + background + logo.
 * Operators can still tweak any field afterwards — templates are a starting
 * point, not a lock.
 */
import { useTextFormat, type StyleGroup } from "@/lib/text-format/store";
import { useLogo } from "@/stores/logo.store";
import { TEMPLATE_PRESETS, type TemplatePreset } from "./presets";

export function applyTemplate(id: string): TemplatePreset | null {
  const preset = TEMPLATE_PRESETS.find((t) => t.id === id);
  if (!preset) return null;
  const groups: StyleGroup[] = ["reference", "tamil", "english"];
  const tf = useTextFormat.getState();
  for (const g of groups) {
    const merged = { ...preset.text, ...(preset.perGroup?.[g] ?? {}) };
    if (Object.keys(merged).length > 0) tf.patchGroup(g, merged);
  }
  if (preset.background) tf.setBackground(preset.background);
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
