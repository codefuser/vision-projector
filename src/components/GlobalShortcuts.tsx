import { useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { shortcutManager } from "@/lib/shortcuts/manager";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { useWorkspace, type WorkspaceTab } from "@/features/workspace/workspace.store";
import { useProjection } from "@/stores/projection.store";
import { projectionEngine } from "@/projection/engine";

/**
 * GlobalShortcuts — mounted once near the application root. Installs the
 * shortcut manager and registers every "always on" shortcut. Module-specific
 * shortcuts (Bible, Playlist Editor, Service Mode) register themselves from
 * inside their own components.
 */
export function GlobalShortcuts() {
  const navigate = useNavigate();
  const router = useRouter();
  const setActiveTab = useWorkspace((s) => s.setActiveTab);
  const projectorOpen = useProjection((s) => s.projectorOpen);
  const openProjector = useProjection((s) => s.openProjector);
  const closeProjector = useProjection((s) => s.closeProjector);
  const send = useProjection((s) => s.send);
  const state = useProjection((s) => s.state);

  useEffect(() => {
    shortcutManager.install();
    return () => shortcutManager.uninstall();
  }, []);

  // ── Tab navigation (1..4 plain) — also navigate to /project so the user sees the panel.
  const tabShortcut = (id: WorkspaceTab) => () => {
    setActiveTab(id);
    if (router.state.location.pathname !== "/project") {
      void navigate({ to: "/project" });
    }
  };
  useShortcut({ id: "tab.media",  label: "Open Media tab",  category: "navigation", keys: ["1"], handler: tabShortcut("media") });
  useShortcut({ id: "tab.bible",  label: "Open Bible tab",  category: "navigation", keys: ["2"], handler: tabShortcut("bible") });
  useShortcut({ id: "tab.songs",  label: "Open Songs tab",  category: "navigation", keys: ["3"], handler: tabShortcut("songs") });
  useShortcut({ id: "tab.text",   label: "Open Text tab",   category: "navigation", keys: ["4"], handler: tabShortcut("text") });

  // ── Search focus (Alt+1..4) — switches to the tab and emits a focus-search event
  // that the relevant panel listens for. Operator-friendly: one keypress goes
  // straight to the search input no matter which module is in front.
  const focusSearch = (id: WorkspaceTab) => () => {
    setActiveTab(id);
    if (router.state.location.pathname !== "/project") {
      void navigate({ to: "/project" });
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("workspace:focus-search", { detail: { tab: id } }));
    }, 60);
  };
  useShortcut({ id: "search.media", label: "Focus Media search", category: "navigation", keys: ["Alt+1"], handler: focusSearch("media") });
  useShortcut({ id: "search.bible", label: "Focus Bible search", category: "navigation", keys: ["Alt+2"], handler: focusSearch("bible") });
  useShortcut({ id: "search.songs", label: "Focus Songs search", category: "navigation", keys: ["Alt+3"], handler: focusSearch("songs") });
  useShortcut({ id: "search.text",  label: "Focus Text search",  category: "navigation", keys: ["Alt+4"], handler: focusSearch("text") });

  // ── Sidebar navigation — jump directly to a route from anywhere.
  // Avoid browser-reserved combos (Mod+P prints, Mod+Shift+P opens private window,
  // Mod+Shift+L opens downloads in some browsers). Use Alt+Letter + F-keys.
  const goTo = (to: string) => () => { void navigate({ to }); };
  useShortcut({ id: "nav.library",   label: "Go to Library",   category: "navigation", keys: ["Alt+L"], handler: goTo("/library") });
  useShortcut({ id: "nav.playlists", label: "Go to Playlists", category: "navigation", keys: ["Alt+Y"], handler: goTo("/playlists") });
  useShortcut({ id: "nav.project",   label: "Go to Project",   category: "navigation", keys: ["Alt+J"], handler: goTo("/project") });
  useShortcut({ id: "nav.settings",  label: "Go to Settings",  category: "navigation", keys: ["Alt+,"], handler: goTo("/settings") });
  useShortcut({ id: "nav.shortcuts", label: "Open Shortcut Center", category: "navigation", keys: ["F1"], handler: goTo("/shortcuts") });

  // ── Projector lifecycle (F9 toggles — Mod+P is reserved for browser print).
  useShortcut({
    id: "projector.toggle",
    label: "Open / Close Projector",
    category: "projector",
    keys: ["F9"],
    handler: () => { if (projectorOpen) closeProjector(); else void openProjector(); },
  });
  useShortcut({
    id: "projector.stop",
    label: "Stop Projection",
    category: "projector",
    keys: ["Escape"],
    handler: () => projectionEngine.stop(),
  });
  useShortcut({
    id: "projector.play-pause",
    label: "Play / Pause video",
    category: "projector",
    keys: ["Space"],
    handler: () => {
      if (!state) return;
      if (state.playing) send({ type: "PAUSE" });
      else send({ type: "PLAY" });
    },
  });
  useShortcut({
    id: "projector.next",
    label: "Next media",
    category: "media",
    keys: ["ArrowRight"],
    handler: () => send({ type: "NEXT" }),
  });
  useShortcut({
    id: "projector.prev",
    label: "Previous media",
    category: "media",
    keys: ["ArrowLeft"],
    handler: () => send({ type: "PREV" }),
  });
  useShortcut({
    id: "projector.black",
    label: "Toggle black screen",
    category: "projector",
    keys: ["B"],
    handler: () => send({ type: "BLACK", value: !state?.black }),
  });

  return null;
}
