import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Lightweight focus manager for the workspace.
 * Tracks which panel currently has logical focus so future modules
 * (Bible, Songs, Text) can wire keyboard navigation (Arrows / Enter / Space / Tab)
 * without conflicting with each other.
 *
 * No actions are implemented yet — this is architecture only.
 */
export type FocusZone = "preview" | "text-format" | "media" | "bible" | "songs" | "text" | null;

interface FocusContextValue {
  active: FocusZone;
  focus: (zone: FocusZone) => void;
  registerHandler: (zone: Exclude<FocusZone, null>, handler: (e: KeyboardEvent) => void) => () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusManagerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<FocusZone>(null);
  const handlersRef = useRef<Map<string, (e: KeyboardEvent) => void>>(new Map());

  const focus = useCallback((zone: FocusZone) => setActive(zone), []);
  const registerHandler = useCallback(
    (zone: Exclude<FocusZone, null>, handler: (e: KeyboardEvent) => void) => {
      handlersRef.current.set(zone, handler);
      return () => {
        handlersRef.current.delete(zone);
      };
    },
    [],
  );

  const value = useMemo<FocusContextValue>(() => ({ active, focus, registerHandler }), [active, focus, registerHandler]);
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusManager() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocusManager must be used inside FocusManagerProvider");
  return ctx;
}

/** Hook for a panel to mark itself as focused on click / focus. */
export function useFocusZone(zone: Exclude<FocusZone, null>) {
  const { active, focus } = useFocusManager();
  return {
    isActive: active === zone,
    onFocus: () => focus(zone),
    tabIndex: 0 as const,
  };
}
