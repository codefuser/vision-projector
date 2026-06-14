import { create } from "zustand";
import { DEFAULT_GROUPED_STYLES, getChannel, type ProjectionCommand, type ProjectionState } from "@/lib/broadcast";
import {
  buildPopupFeatures,
  getDisplayDiagnostics,
  moveWindowToScreen,
  pickProjectorScreen,
  requestScreenDetails,
  type ScreenInfo,
} from "@/lib/display/screen-manager";
import { logger } from "@/lib/logger";

const PREFERRED_SCREEN_KEY = "projector.preferredScreenId";

export interface OpenProjectorResult {
  ok: boolean;
  window: Window | null;
  screen: ScreenInfo | null;
  reason?: "popup-blocked" | "no-screens" | "permission-denied" | "unsupported" | "already-open";
  message?: string;
}

interface ProjectionStore {
  projectorOpen: boolean;
  windowRef: Window | null;
  channel: BroadcastChannel | null;
  state: ProjectionState | null;
  lastScreen: ScreenInfo | null;
  init: () => void;
  openProjector: (preferredScreenId?: string | null) => Promise<OpenProjectorResult>;
  closeProjector: () => void;
  send: (cmd: ProjectionCommand) => void;
}

export const useProjection = create<ProjectionStore>((set, get) => ({
  projectorOpen: false,
  windowRef: null,
  channel: null,
  state: null,
  init: () => {
    if (get().channel) return;
    const ch = getChannel();
    ch.onmessage = (ev) => {
      const data = ev.data;
      if (data?.type === "STATE") set({ state: data as ProjectionState });
      if (data?.type === "PROJECTOR_OPEN") set({ projectorOpen: true });
      if (data?.type === "PROJECTOR_CLOSED") set({ projectorOpen: false, windowRef: null, state: null });
    };
    set({ channel: ch });
  },
  openProjector: () => {
    const existing = get().windowRef;
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    // Try multi-screen API for second monitor
    let features = "popup,width=1280,height=720";
    try {
      const screenDetails = (window as unknown as { getScreenDetails?: () => Promise<{ screens: { left: number; top: number; availWidth: number; availHeight: number; isPrimary: boolean }[] }> }).getScreenDetails;
      if (screenDetails) {
        screenDetails().then((details) => {
          const ext = details.screens.find((s) => !s.isPrimary);
          if (ext && get().windowRef) {
            get().windowRef?.moveTo(ext.left, ext.top);
            get().windowRef?.resizeTo(ext.availWidth, ext.availHeight);
          }
        }).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
    const w = window.open("/project", "church-projector", features);
    if (w) {
      set({ windowRef: w, projectorOpen: true });
      // poll close
      const timer = setInterval(() => {
        if (w.closed) {
          clearInterval(timer);
          set({ projectorOpen: false, windowRef: null, state: null });
        }
      }, 500);
    }
  },
  closeProjector: () => {
    get().windowRef?.close();
    set({ projectorOpen: false, windowRef: null, state: null });
  },
  send: (cmd) => {
    // Optimistically reflect transport commands in the local state so the
    // Preview window reacts instantly without waiting for the projector to
    // echo back a STATE frame. The authoritative STATE follow-up will
    // overwrite this within a frame or two.
    const cur = get().state;
    if (cur) {
      let next = cur;
      switch (cmd.type) {
        case "LOAD_TEXT":
          next = {
            ...cur,
            mode: "text",
            currentMediaId: null,
            index: 0,
            total: 0,
            playing: false,
            black: false,
            textOverlay: cmd.overlay,
            textStyle: cmd.style ?? cur.textStyle,
            groupedStyles: cmd.styles ?? cur.groupedStyles,
          };
          break;
        case "UPDATE_TEXT_STYLE": next = { ...cur, textStyle: cmd.style }; break;
        case "UPDATE_STYLES": next = { ...cur, groupedStyles: cmd.styles }; break;
        case "UPDATE_BACKGROUND": next = { ...cur, groupedStyles: { ...(cur.groupedStyles ?? DEFAULT_GROUPED_STYLES), background: cmd.background } }; break;
        case "UPDATE_LOGO": next = { ...cur, logo: cmd.logo }; break;
        case "PLAY":  next = { ...cur, playing: true }; break;
        case "PAUSE": next = { ...cur, playing: false }; break;
        case "STOP":  next = { ...cur, playing: false, mode: "idle", currentMediaId: null, index: 0, total: 0, textOverlay: null }; break;
        case "BLACK": next = { ...cur, black: cmd.value }; break;
        case "MUTE":  next = { ...cur, muted: cmd.value }; break;
        case "VOLUME":next = { ...cur, volume: cmd.value }; break;
        case "RATE":  next = { ...cur, playbackRate: cmd.value }; break;
        case "LOOP":  next = { ...cur, loop: cmd.value }; break;
      }
      if (next !== cur) set({ state: next });
    }
    get().channel?.postMessage(cmd);
  },
}));
