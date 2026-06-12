import type { ComponentType } from "react";
import { Image as ImageIcon, BookOpen, Music, Type } from "lucide-react";
import type { WorkspaceTab } from "./workspace.store";

/**
 * Future-ready workspace module registry.
 *
 * The right-hand workspace tab panel renders whichever module is registered
 * for the active tab id. New modules (Bible, Songs, Text, …) plug in by
 * calling `registerWorkspaceModule(...)` from their own bootstrap file —
 * no layout changes required.
 *
 * Today only the `media` module has a real component; the rest render the
 * built-in "coming soon" placeholder. Replacing them later is a one-line
 * change at the module's entry point.
 */
export interface WorkspaceModule {
  id: WorkspaceTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Render the module body. `null` → placeholder will render instead. */
  component: ComponentType | null;
  /** Optional badge shown next to the tab label (e.g. "Soon"). */
  badge?: string;
}

const registry = new Map<WorkspaceTab, WorkspaceModule>();

export function registerWorkspaceModule(mod: WorkspaceModule): void {
  registry.set(mod.id, mod);
}

export function getWorkspaceModule(id: WorkspaceTab): WorkspaceModule | undefined {
  return registry.get(id);
}

export function listWorkspaceModules(): WorkspaceModule[] {
  return Array.from(registry.values());
}

// ---- Default modules ---------------------------------------------------
// `media` resolves lazily to avoid an import cycle with WorkspaceTabsPanel.
registerWorkspaceModule({
  id: "media",
  label: "Media",
  icon: ImageIcon,
  component: null, // host renders <LibraryPage /> directly for media
});
registerWorkspaceModule({
  id: "bible",
  label: "Bible",
  icon: BookOpen,
  component: null,
  badge: "Soon",
});
registerWorkspaceModule({
  id: "songs",
  label: "Songs",
  icon: Music,
  component: null,
});
registerWorkspaceModule({
  id: "text",
  label: "Text",
  icon: Type,
  component: null,
  badge: "Soon",
});
