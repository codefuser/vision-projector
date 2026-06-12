/**
 * Centralised application-wide keyboard shortcut manager.
 *
 * Modules never bind `window.addEventListener("keydown", ...)` directly.
 * They `register(shortcut)` and the manager dispatches matching events
 * exactly once, respecting active scopes / priorities and ignoring keys
 * typed into text inputs unless `allowInInput` is set.
 *
 * Future Settings UI can list/edit every registered shortcut by reading
 * `listShortcuts()` — no per-module wiring required.
 */
export type ShortcutCategory =
  | "general"
  | "navigation"
  | "media"
  | "playlist"
  | "playlists"
  | "projector"
  | "bible"
  | "songs"
  | "text"
  | "favorites";

/** Logical scope under which a shortcut is active. */
export type ShortcutScope = "global" | "workspace" | "playlist-editor" | "service-mode" | "bible" | "songs";

export interface ShortcutDef {
  /** Stable id, e.g. "tabs.media". */
  id: string;
  /** Human-readable label for help dialog. */
  label: string;
  category: ShortcutCategory;
  /**
   * Key combo descriptor. Multiple combos can map to the same id.
   *   "Alt+1" | "Ctrl+Enter" | "Escape" | "ArrowLeft" | "Space" | "Delete"
   * Modifiers: Ctrl, Meta (Cmd), Alt, Shift. `Mod` matches Ctrl OR Meta.
   */
  keys: string[];
  scope?: ShortcutScope;
  /** Defaults to false. Set true for shortcuts you want active inside <input>. */
  allowInInput?: boolean;
  /** Called when matched. Return false to allow further handlers; default: stop. */
  handler: (e: KeyboardEvent) => void | boolean;
  /** Higher runs first. Default 0. */
  priority?: number;
}

interface ParsedCombo {
  key: string;
  ctrl: boolean;
  meta: boolean;
  mod: boolean; // Ctrl OR Meta
  alt: boolean;
  shift: boolean;
}

function normaliseKey(k: string): string {
  const v = k.trim();
  const map: Record<string, string> = {
    space: " ",
    spacebar: " ",
    esc: "escape",
    del: "delete",
    return: "enter",
    left: "arrowleft",
    right: "arrowright",
    up: "arrowup",
    down: "arrowdown",
  };
  const lower = v.toLowerCase();
  return map[lower] ?? lower;
}

function parseCombo(combo: string): ParsedCombo {
  const parts = combo.split("+").map((p) => p.trim());
  const out: ParsedCombo = { key: "", ctrl: false, meta: false, mod: false, alt: false, shift: false };
  for (const p of parts) {
    const lp = p.toLowerCase();
    if (lp === "ctrl" || lp === "control") out.ctrl = true;
    else if (lp === "meta" || lp === "cmd" || lp === "command" || lp === "win") out.meta = true;
    else if (lp === "mod") out.mod = true;
    else if (lp === "alt" || lp === "option") out.alt = true;
    else if (lp === "shift") out.shift = true;
    else out.key = normaliseKey(p);
  }
  return out;
}

function eventMatches(e: KeyboardEvent, c: ParsedCombo): boolean {
  if (normaliseKey(e.key) !== c.key) return false;
  if (c.alt !== e.altKey) return false;
  if (c.shift !== e.shiftKey) return false;
  if (c.mod) {
    if (!(e.ctrlKey || e.metaKey)) return false;
  } else {
    if (c.ctrl !== e.ctrlKey) return false;
    if (c.meta !== e.metaKey) return false;
  }
  return true;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

class ShortcutManagerImpl {
  private shortcuts = new Map<string, ShortcutDef>();
  private parsed = new Map<string, ParsedCombo[]>();
  private activeScopes = new Set<ShortcutScope>(["global", "workspace"]);
  private installed = false;
  private listeners = new Set<() => void>();
  private snapshot: ShortcutDef[] = [];

  install(): void {
    if (this.installed || typeof window === "undefined") return;
    this.installed = true;
    window.addEventListener("keydown", this.onKey, { capture: true });
  }
  uninstall(): void {
    if (!this.installed || typeof window === "undefined") return;
    this.installed = false;
    window.removeEventListener("keydown", this.onKey, { capture: true } as never);
  }

  register(def: ShortcutDef): () => void {
    this.shortcuts.set(def.id, def);
    this.parsed.set(def.id, def.keys.map(parseCombo));
    this.refreshSnapshot();
    return () => this.unregister(def.id);
  }
  unregister(id: string): void {
    this.shortcuts.delete(id);
    this.parsed.delete(id);
    this.refreshSnapshot();
  }
  list(): ShortcutDef[] {
    return this.snapshot;
  }

  setScopeActive(scope: ShortcutScope, active: boolean): void {
    if (active) this.activeScopes.add(scope);
    else this.activeScopes.delete(scope);
  }
  isScopeActive(scope: ShortcutScope): boolean {
    return this.activeScopes.has(scope);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private refreshSnapshot(): void {
    this.snapshot = Array.from(this.shortcuts.values());
    for (const l of this.listeners) l();
  }

  private onKey = (e: KeyboardEvent): void => {
    const typing = isTypingTarget(e.target);
    const ordered = this.list().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const def of ordered) {
      const scope = def.scope ?? "global";
      if (!this.activeScopes.has(scope)) continue;
      if (typing && !def.allowInInput) continue;
      const combos = this.parsed.get(def.id) ?? [];
      for (const c of combos) {
        if (eventMatches(e, c)) {
          const res = def.handler(e);
          if (res !== false) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }
    }
  };
}

export const shortcutManager = new ShortcutManagerImpl();

/** Pretty-print a combo for the help dialog. */
export function formatCombo(combo: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return combo
    .split("+")
    .map((p) => {
      const lp = p.trim().toLowerCase();
      if (lp === "mod") return isMac ? "⌘" : "Ctrl";
      if (lp === "ctrl" || lp === "control") return isMac ? "⌃" : "Ctrl";
      if (lp === "meta" || lp === "cmd" || lp === "command") return isMac ? "⌘" : "Win";
      if (lp === "alt" || lp === "option") return isMac ? "⌥" : "Alt";
      if (lp === "shift") return isMac ? "⇧" : "Shift";
      if (lp === "space" || lp === " ") return "Space";
      if (lp === "arrowleft") return "←";
      if (lp === "arrowright") return "→";
      if (lp === "arrowup") return "↑";
      if (lp === "arrowdown") return "↓";
      if (lp === "escape" || lp === "esc") return "Esc";
      if (lp === "enter" || lp === "return") return "Enter";
      if (lp === "delete" || lp === "del") return "Del";
      return p.trim().length === 1 ? p.trim().toUpperCase() : p.trim();
    })
    .join(" + ");
}
