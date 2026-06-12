/**
 * Helper hooks to retrieve a registered shortcut by id and produce a
 * tooltip-ready label. Re-renders when the shortcut registry changes so
 * remapped shortcuts update tooltips automatically.
 */
import { useRegisteredShortcuts } from "./use-shortcut";
import { formatCombo, type ShortcutDef } from "./manager";

export function useShortcutFor(id: string): ShortcutDef | undefined {
  const all = useRegisteredShortcuts();
  return all.find((s) => s.id === id);
}

/** "Label · Ctrl+K" — safe to drop into `title={...}`. */
export function useShortcutTooltip(id: string, fallback: string): string {
  const s = useShortcutFor(id);
  if (!s || !s.keys.length) return fallback;
  const combo = s.keys.map(formatCombo).join(" or ");
  return `${fallback} · ${combo}`;
}
