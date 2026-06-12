/**
 * Apply a template preset across every style group + background + logo.
 * Operators can still tweak any field afterwards — templates are a starting
 * point, not a lock. Custom (operator-saved) templates are supported via the
 * custom-templates store and merged with built-ins when resolving by id.
 */
import { useTextFormat, type StyleGroup } from "@/lib/text-format/store";
import { useLogo } from "@/stores/logo.store";
import { useBackground, canThemeWriteBackground } from "@/stores/background.store";
import { useCustomTemplates } from "@/stores/custom-templates.store";
import { useThemeFavorites } from "@/stores/theme-favorites.store";
import { TEMPLATE_PRESETS, type TemplatePreset } from "./presets";

export function resolvePreset(id: string): TemplatePreset | null {
  const builtin = TEMPLATE_PRESETS.find((t) => t.id === id);
  if (builtin) return builtin;
  return useCustomTemplates.getState().templates.find((t) => t.id === id) ?? null;
}

/**
 * Apply a template preset.
 *
 * Theme is now strictly a TYPOGRAPHY + STYLING layer. Background and logo
 * are independent layers and only get written when the operator has
 * explicitly opted in via the Background panel toggles:
 *
 *  • Background: written only when `themeBackgroundEnabled` is ON AND
 *    `customBackgroundEnabled` is OFF.
 *  • Logo: written only when the logo layer is enabled.
 *
 * Callers can override per-call with the `opts` argument (the Theme Gallery
 * "Apply Theme + Background" affordance uses `{ background: "force" }`).
 */
export interface ApplyTemplateOpts {
  /** "auto" (default) respects toggles. "force" applies regardless. "skip" never applies. */
  background?: "auto" | "force" | "skip";
  logo?: "auto" | "force" | "skip";
}

export function applyTemplate(id: string, opts: ApplyTemplateOpts = {}): TemplatePreset | null {
  const preset = resolvePreset(id);
  if (!preset) return null;
  const groups: StyleGroup[] = ["reference", "tamil", "english"];
  const tf = useTextFormat.getState();
  for (const g of groups) {
    const merged = { ...preset.text, ...(preset.perGroup?.[g] ?? {}) };
    if (Object.keys(merged).length > 0) tf.patchGroup(g, merged);
  }

  const bgMode = opts.background ?? "auto";
  const shouldWriteBg =
    preset.background && (bgMode === "force" || (bgMode === "auto" && canThemeWriteBackground()));
  if (shouldWriteBg) {
    tf.setBackground({
      gradient: preset.background.gradient ?? null,
      animation: preset.background.animation ?? "none",
      ...preset.background,
    });
  }

  const logoMode = opts.logo ?? "auto";
  const logoEnabled = useBackground.getState().logoEnabled;
  const shouldWriteLogo =
    preset.logo && (logoMode === "force" || (logoMode === "auto" && logoEnabled));
  if (shouldWriteLogo) {
    const logo = useLogo.getState();
    logo.setEnabled(preset.logo!.enabled);
    if (preset.logo!.settings) logo.patch(preset.logo!.settings);
  }

  if (typeof window !== "undefined") {
    try { window.localStorage.setItem("vision-active-template", id); } catch { /* ignore */ }
    try { useThemeFavorites.getState().pushRecent(id); } catch { /* ignore */ }
  }
  return preset;
}


export function activeTemplateId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem("vision-active-template"); } catch { return null; }
}
