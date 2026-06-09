import { useEffect, useMemo } from "react";
import { Group, Panel, Separator, type Layout } from "react-resizable-panels";
import { ChevronUp, ChevronDown, MonitorPlay, Type as TypeIcon, LayoutGrid } from "lucide-react";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { TextFormattingPanel } from "./TextFormattingPanel";
import { WorkspaceTabsPanel } from "./WorkspaceTabsPanel";
import { FocusManagerProvider } from "./focus-manager";
import { useWorkspace, type PanelVisibility } from "./workspace.store";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";

/**
 * Dockable, resizable workspace for the Project page.
 *
 *   ┌──────────────────────┬──────────────────────┐
 *   │  Live Preview        │                      │
 *   ├──────────────────────┤   Workspace Tabs     │
 *   │  Text Formatting     │   (Media / Bible /   │
 *   │  (UI only)           │    Songs / Text)     │
 *   └──────────────────────┴──────────────────────┘
 *
 * Layout (panel sizes) persists via localStorage on every drag commit.
 * Panel visibility and active tab persist via the workspace zustand store.
 */
const LAYOUT_KEYS = {
  outer: "church-media-ws-outer-v1",
  left: "church-media-ws-left-v1",
};

function readLayout(key: string): Layout | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Layout) : undefined;
  } catch {
    return undefined;
  }
}
function writeLayout(key: string, layout: Layout) {
  try {
    localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    /* quota / private mode */
  }
}

export function ProjectionWorkspace() {
  const { visible, togglePanel, showPanel } = useWorkspace();
  const init = useProjection((s) => s.init);
  const send = useProjection((s) => s.send);

  useEffect(() => {
    init();
    send({ type: "PING" });
  }, [init, send]);

  const savedOuter = useMemo(() => readLayout(LAYOUT_KEYS.outer), []);
  const savedLeft = useMemo(() => readLayout(LAYOUT_KEYS.left), []);

  const allHidden = !visible.preview && !visible.textFormat && !visible.tabs;
  const leftVisible = visible.preview || visible.textFormat;

  return (
    <FocusManagerProvider>
      <div className="flex h-full min-h-0 flex-col bg-background">
        {/* Workspace toolbar */}
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-2">
          <div className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </div>
          <DockButton label="Preview" icon={MonitorPlay} active={visible.preview} onClick={() => togglePanel("preview")} />
          <DockButton label="Text" icon={TypeIcon} active={visible.textFormat} onClick={() => togglePanel("textFormat")} />
          <DockButton label="Tabs" icon={LayoutGrid} active={visible.tabs} onClick={() => togglePanel("tabs")} />
          <div className="ml-auto text-[10px] text-muted-foreground">
            Drag dividers to resize · Click chips to dock / undock
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {allHidden ? (
            <EmptyDock onShow={showPanel} visible={visible} />
          ) : (
            <Group
              orientation="horizontal"
              className="h-full"
              defaultLayout={savedOuter}
              onLayoutChanged={(l) => writeLayout(LAYOUT_KEYS.outer, l)}
            >
              {leftVisible && (
                <Panel id="left" defaultSize={50} minSize={20} className="min-h-0 min-w-0">
                  <Group
                    orientation="vertical"
                    className="h-full"
                    defaultLayout={savedLeft}
                    onLayoutChanged={(l) => writeLayout(LAYOUT_KEYS.left, l)}
                  >
                    {visible.preview && (
                      <Panel id="preview" defaultSize={60} minSize={15} className="min-h-0">
                        <LivePreviewPanel />
                      </Panel>
                    )}
                    {visible.preview && visible.textFormat && <VHandle />}
                    {visible.textFormat && (
                      <Panel id="text-format" defaultSize={40} minSize={15} className="min-h-0">
                        <TextFormattingPanel />
                      </Panel>
                    )}
                  </Group>
                </Panel>
              )}
              {leftVisible && visible.tabs && <HHandle />}
              {visible.tabs && (
                <Panel id="right" defaultSize={50} minSize={25} className="min-h-0 min-w-0">
                  <WorkspaceTabsPanel />
                </Panel>
              )}
            </Group>
          )}
        </div>
      </div>
    </FocusManagerProvider>
  );
}

function DockButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      title={active ? `Hide ${label}` : `Show ${label}`}
    >
      <Icon className="h-3 w-3" />
      {label}
      {active ? <ChevronUp className="h-3 w-3 opacity-60" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
    </button>
  );
}

function HHandle() {
  return (
    <Separator className="relative w-1.5 bg-transparent transition data-[separator-state=hover]:bg-primary/40 data-[separator-state=drag]:bg-primary/60 hover:bg-primary/40">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
    </Separator>
  );
}
function VHandle() {
  return (
    <Separator className="relative h-1.5 bg-transparent transition data-[separator-state=hover]:bg-primary/40 data-[separator-state=drag]:bg-primary/60 hover:bg-primary/40">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
    </Separator>
  );
}

function EmptyDock({ onShow, visible }: { onShow: (k: keyof PanelVisibility) => void; visible: PanelVisibility }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
      <div>All panels are collapsed.</div>
      <div className="flex flex-wrap justify-center gap-2">
        {!visible.preview && (
          <button onClick={() => onShow("preview")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            Show Preview
          </button>
        )}
        {!visible.textFormat && (
          <button onClick={() => onShow("textFormat")} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            Show Text Formatting
          </button>
        )}
        {!visible.tabs && (
          <button onClick={() => onShow("tabs")} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            Show Workspace Tabs
          </button>
        )}
      </div>
    </div>
  );
}
