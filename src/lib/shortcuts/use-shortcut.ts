import { useEffect, useRef, useSyncExternalStore } from "react";
import { shortcutManager, type ShortcutDef, type ShortcutScope } from "./manager";

/**
 * Register a shortcut for the lifetime of a component. The handler ref
 * is updated on every render so closures stay fresh without re-registering.
 */
export function useShortcut(def: Omit<ShortcutDef, "handler"> & { handler: ShortcutDef["handler"] }) {
  const handlerRef = useRef(def.handler);
  handlerRef.current = def.handler;
  useEffect(() => {
    const unregister = shortcutManager.register({
      ...def,
      handler: (e) => handlerRef.current(e),
    });
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, def.scope, def.allowInInput, def.priority, def.keys.join("|")]);
}

/** Mount a logical scope while the component is mounted. */
export function useShortcutScope(scope: ShortcutScope, active = true) {
  useEffect(() => {
    if (!active) return;
    shortcutManager.setScopeActive(scope, true);
    return () => shortcutManager.setScopeActive(scope, false);
  }, [scope, active]);
}

const EMPTY_SHORTCUTS: ShortcutDef[] = [];

/** Re-render whenever the shortcut registry changes. */
export function useRegisteredShortcuts() {
  return useSyncExternalStore(
    (cb) => shortcutManager.subscribe(cb),
    () => shortcutManager.list(),
    () => EMPTY_SHORTCUTS,
  );
}
