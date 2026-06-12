import { Image as ImageIcon, BookOpen, Music, Type, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useWorkspace, type WorkspaceTab } from "./workspace.store";
import { LibraryPage } from "@/features/library/LibraryPage";
import { BiblePanel } from "@/features/bible/BiblePanel";
import { SongsPanel } from "@/features/songs/SongsPanel";
import { TextPanel } from "@/features/text/TextPanel";
import { useFocusZone, type FocusZone } from "./focus-manager";
import { useShortcutScope } from "@/lib/shortcuts/use-shortcut";
import { useShortcutTooltip } from "@/lib/shortcuts/use-shortcut-for";
import { cn } from "@/lib/utils";


const TABS: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }>; focus: Exclude<FocusZone, null>; shortcutId: string }[] = [
  { id: "media", label: "Media", icon: ImageIcon, focus: "media", shortcutId: "tab.media" },
  { id: "bible", label: "Bible", icon: BookOpen, focus: "bible", shortcutId: "tab.bible" },
  { id: "songs", label: "Songs", icon: Music, focus: "songs", shortcutId: "tab.songs" },
  { id: "text", label: "Text", icon: Type, focus: "text", shortcutId: "tab.text" },
];

export function WorkspaceTabsPanel() {
  const { activeTab, setActiveTab } = useWorkspace();
  const collapsed = useWorkspace((s) => s.tabsCollapsed);
  const toggleCollapsed = useWorkspace((s) => s.toggleTabsCollapsed);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const focus = useFocusZone(active.focus);
  // Activate the "bible" shortcut scope only while the bible tab is showing.
  useShortcutScope("bible", activeTab === "bible");
  useShortcutScope("songs", activeTab === "songs");

  // Collapsed icon-rail
  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center gap-1 border-l border-border bg-card py-2">
        <button
          onClick={toggleCollapsed}
          title="Expand workspace"
          aria-label="Expand workspace"
          className="mb-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        {TABS.map((t) => (
          <TabRailButton
            key={t.id}
            tab={t}
            isActive={t.id === activeTab}
            onClick={() => { setActiveTab(t.id); toggleCollapsed(); }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col bg-card", focus.isActive && "ring-1 ring-primary/40")}
      onFocus={focus.onFocus}
      onMouseDown={focus.onFocus}
      tabIndex={focus.tabIndex}
    >
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-border bg-muted/30 px-1">
        {TABS.map((t) => (
          <TabBarButton
            key={t.id}
            tab={t}
            isActive={t.id === activeTab}
            onClick={() => setActiveTab(t.id)}
          />
        ))}
        <button
          onClick={toggleCollapsed}
          title="Collapse workspace"
          aria-label="Collapse workspace"
          className="ml-auto inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "media" && (
          <div className="h-full overflow-hidden">
            <LibraryPage />
          </div>
        )}
        {activeTab === "bible" && (
          <div className="h-full overflow-hidden">
            <BiblePanel />
          </div>
        )}
        {activeTab === "songs" && (
          <div className="h-full overflow-hidden">
            <SongsPanel />
          </div>
        )}
        {activeTab === "text" && (
          <div className="h-full overflow-hidden">
            <TextPanel />
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-base font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        <div className="mt-4 inline-block rounded-full border border-dashed border-border px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Module reserved
        </div>
      </div>
    </div>
  );
}

type TabDef = (typeof TABS)[number];

function TabRailButton({ tab, isActive, onClick }: { tab: TabDef; isActive: boolean; onClick: () => void }) {
  const tooltip = useShortcutTooltip(tab.shortcutId, tab.label);
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function TabBarButton({ tab, isActive, onClick }: { tab: TabDef; isActive: boolean; onClick: () => void }) {
  const tooltip = useShortcutTooltip(tab.shortcutId, tab.label);
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
        isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {tab.label}
    </button>
  );
}

