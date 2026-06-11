import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WorkspaceTab = "media" | "bible" | "songs" | "text";

export interface PanelVisibility {
  preview: boolean;
  textFormat: boolean;
  tabs: boolean;
}

interface WorkspaceState {
  activeTab: WorkspaceTab;
  visible: PanelVisibility;
  /** True when the bottom formatting panel is collapsed to its header strip. */
  textFormatCollapsed: boolean;
  setActiveTab: (t: WorkspaceTab) => void;
  togglePanel: (key: keyof PanelVisibility) => void;
  showPanel: (key: keyof PanelVisibility) => void;
  setTextFormatCollapsed: (v: boolean) => void;
  toggleTextFormatCollapsed: () => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeTab: "media",
      visible: { preview: true, textFormat: true, tabs: true },
      textFormatCollapsed: false,
      setActiveTab: (t) => set({ activeTab: t }),
      togglePanel: (key) =>
        set((s) => ({ visible: { ...s.visible, [key]: !s.visible[key] } })),
      showPanel: (key) =>
        set((s) => ({ visible: { ...s.visible, [key]: true } })),
      setTextFormatCollapsed: (v) => set({ textFormatCollapsed: v }),
      toggleTextFormatCollapsed: () =>
        set((s) => ({ textFormatCollapsed: !s.textFormatCollapsed })),
    }),
    {
      name: "church-media-workspace",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
