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
  setActiveTab: (t: WorkspaceTab) => void;
  togglePanel: (key: keyof PanelVisibility) => void;
  showPanel: (key: keyof PanelVisibility) => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeTab: "media",
      visible: { preview: true, textFormat: true, tabs: true },
      setActiveTab: (t) => set({ activeTab: t }),
      togglePanel: (key) =>
        set((s) => ({ visible: { ...s.visible, [key]: !s.visible[key] } })),
      showPanel: (key) =>
        set((s) => ({ visible: { ...s.visible, [key]: true } })),
    }),
    {
      name: "church-media-workspace",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
