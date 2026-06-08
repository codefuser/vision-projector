import { create } from "zustand";
import { getChannel, type ProjectionCommand, type ProjectionState } from "@/lib/broadcast";

interface ProjectionStore {
  projectorOpen: boolean;
  windowRef: Window | null;
  channel: BroadcastChannel | null;
  state: ProjectionState | null;
  init: () => void;
  openProjector: () => void;
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
    get().channel?.postMessage(cmd);
  },
}));
