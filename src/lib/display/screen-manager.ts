/**
 * Screen Manager — Multi-display detection and window placement.
 *
 * Wraps the Window Management API (formerly Multi-Screen Window Placement),
 * available in Chromium 100+. Provides graceful fallbacks for unsupported
 * browsers and exposes a small, testable surface used by the projector
 * launcher and the Display Diagnostics panel.
 *
 * Browser support matrix:
 *  - Chrome / Edge 100+ : full (getScreenDetails + window-management perm)
 *  - Opera 86+          : full
 *  - Safari             : not supported (single-screen window.screen only)
 *  - Firefox            : not supported as of writing
 *
 * Critical OS caveat: When Windows is in "Duplicate" display mode, the OS
 * exposes only ONE logical screen to the browser — no API can fix this.
 * The user must press Win+P → Extend (or macOS: System Settings →
 * Displays → Use as Extended Display).
 */
import { logger } from "@/lib/logger";

export interface ScreenInfo {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary: boolean;
  isInternal: boolean;
  devicePixelRatio: number;
}

export interface DisplayDiagnostics {
  supported: boolean;
  permission: "granted" | "denied" | "prompt" | "unknown";
  screenCount: number;
  primary: ScreenInfo | null;
  secondaries: ScreenInfo[];
  all: ScreenInfo[];
  userAgent: string;
  warnings: string[];
}

interface ScreenDetailedLike {
  label?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary: boolean;
  isInternal: boolean;
  devicePixelRatio: number;
}

interface ScreenDetailsLike {
  screens: ScreenDetailedLike[];
  currentScreen?: ScreenDetailedLike;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
}

function hasScreenDetailsApi(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { getScreenDetails?: unknown }).getScreenDetails === "function";
}

function toInfo(s: ScreenDetailedLike, index: number): ScreenInfo {
  return {
    id: `${s.label || "screen"}-${index}-${s.left}x${s.top}`,
    label: s.label || (s.isPrimary ? "Primary Display" : `Display ${index + 1}`),
    left: s.left,
    top: s.top,
    width: s.width,
    height: s.height,
    availLeft: s.availLeft,
    availTop: s.availTop,
    availWidth: s.availWidth,
    availHeight: s.availHeight,
    isPrimary: !!s.isPrimary,
    isInternal: !!s.isInternal,
    devicePixelRatio: s.devicePixelRatio || 1,
  };
}

/** Query window-management permission without triggering a prompt. */
export async function queryWindowManagementPermission(): Promise<DisplayDiagnostics["permission"]> {
  if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
  try {
    // The spec name is "window-management"; older Chromium used "window-placement".
    const names: PermissionName[] = ["window-management" as PermissionName, "window-placement" as PermissionName];
    for (const name of names) {
      try {
        const status = await navigator.permissions.query({ name });
        return status.state as DisplayDiagnostics["permission"];
      } catch {
        /* try next */
      }
    }
  } catch (e) {
    logger.warn("permissions.query window-management failed", e);
  }
  return "unknown";
}

let cachedDetails: ScreenDetailsLike | null = null;

/**
 * Calls `getScreenDetails()` which both requests permission (on first call,
 * must be from a user gesture) and returns the live multi-screen layout.
 * Subsequent calls reuse the cached handle so listeners remain attached.
 */
export async function requestScreenDetails(): Promise<ScreenDetailsLike | null> {
  if (!hasScreenDetailsApi()) return null;
  if (cachedDetails) return cachedDetails;
  try {
    const fn = (window as unknown as { getScreenDetails: () => Promise<ScreenDetailsLike> }).getScreenDetails;
    cachedDetails = await fn.call(window);
    logger.info("Window Management permission granted", {
      screens: cachedDetails?.screens?.length ?? 0,
    });
    return cachedDetails;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("getScreenDetails() rejected", msg);
    return null;
  }
}

/**
 * Collect a full diagnostics snapshot. Safe to call without a user gesture
 * — only queries cached state. Use `requestScreenDetails()` (from a click)
 * if `supported` is true but `screenCount === 1` and permission is "prompt".
 */
export async function getDisplayDiagnostics(): Promise<DisplayDiagnostics> {
  const supported = hasScreenDetailsApi();
  const permission = await queryWindowManagementPermission();
  const warnings: string[] = [];
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  if (!supported) {
    warnings.push("This browser does not expose multi-screen details. Use Chrome, Edge, or Opera (v100+) for full projector support.");
    const w = typeof window !== "undefined" ? window : null;
    const single: ScreenInfo | null = w
      ? {
          id: "primary",
          label: "Primary Display",
          left: 0,
          top: 0,
          width: w.screen.width,
          height: w.screen.height,
          availLeft: 0,
          availTop: 0,
          availWidth: w.screen.availWidth,
          availHeight: w.screen.availHeight,
          isPrimary: true,
          isInternal: true,
          devicePixelRatio: w.devicePixelRatio || 1,
        }
      : null;
    return {
      supported,
      permission,
      screenCount: single ? 1 : 0,
      primary: single,
      secondaries: [],
      all: single ? [single] : [],
      userAgent,
      warnings,
    };
  }

  // Reuse cache if available; never prompt the user from a passive read.
  const details = cachedDetails;
  if (!details) {
    warnings.push("Permission not yet granted. Click \"Detect Displays\" to enable multi-screen detection.");
    return {
      supported,
      permission,
      screenCount: 0,
      primary: null,
      secondaries: [],
      all: [],
      userAgent,
      warnings,
    };
  }

  const all = details.screens.map(toInfo);
  const primary = all.find((s) => s.isPrimary) ?? all[0] ?? null;
  const secondaries = all.filter((s) => !s.isPrimary);

  if (all.length === 1) {
    warnings.push("Only one display detected. If a TV/projector is connected via HDMI, switch Windows to Extend mode (Win+P → Extend) — Duplicate mode hides the second screen from the browser.");
  }

  return {
    supported,
    permission,
    screenCount: all.length,
    primary,
    secondaries,
    all,
    userAgent,
    warnings,
  };
}

/**
 * Pick the best target screen for the projector. Preference order:
 *   1. Explicit `preferredId` if the user picked one previously
 *   2. First external (non-internal) screen
 *   3. First non-primary screen
 *   4. Primary screen (fallback — single-monitor setups)
 */
export function pickProjectorScreen(diag: DisplayDiagnostics, preferredId?: string | null): ScreenInfo | null {
  if (preferredId) {
    const match = diag.all.find((s) => s.id === preferredId);
    if (match) return match;
  }
  const external = diag.secondaries.find((s) => !s.isInternal);
  if (external) return external;
  if (diag.secondaries[0]) return diag.secondaries[0];
  return diag.primary;
}

/**
 * Build `window.open` features string that places + sizes the popup on the
 * target screen. Chrome respects left/top across screens only when the
 * window-management permission is granted.
 */
export function buildPopupFeatures(screen: ScreenInfo | null): string {
  if (!screen) return "popup=yes,width=1280,height=720";
  return [
    "popup=yes",
    `left=${Math.round(screen.availLeft)}`,
    `top=${Math.round(screen.availTop)}`,
    `width=${Math.round(screen.availWidth)}`,
    `height=${Math.round(screen.availHeight)}`,
  ].join(",");
}

/**
 * Move + size an already-open popup onto the target screen. Useful after a
 * fallback open landed on the wrong monitor.
 */
export function moveWindowToScreen(win: Window | null, screen: ScreenInfo | null): boolean {
  if (!win || win.closed || !screen) return false;
  try {
    win.moveTo(screen.availLeft, screen.availTop);
    win.resizeTo(screen.availWidth, screen.availHeight);
    return true;
  } catch (e) {
    logger.warn("moveWindowToScreen failed", e);
    return false;
  }
}
