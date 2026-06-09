import { useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ChevronDown, ChevronUp, MonitorPlay, Type as TypeIcon, LayoutGrid } from "lucide-react";
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
 * Layout
 * ──────
 * ┌────────────────────────┬───────────────────────┐
 * │  Live Preview          │                       │
 * ├────────────────────────┤   Workspace Tabs      │
 * │  Text Formatting       │   (Media / Bible /    │
 * │  (UI only)             │    Songs / Text)      │
 * └────────────────────────┴───────────────────────┘
 *
 * Panel sizes are persisted automatically by react-resizable-panels via the
 * `autoSaveId` prop (localStorage). Panel visibility / active tab persist
 * via the workspace store (zustand + persist middleware).
 */
export function ProjectionWorkspace() {
  const { visible, togglePanel, showPanel } = useWorkspace();
  const init = useProjection((s) => s.init);
  const send = useProjection((s) => s.send);

  useEffect(() => {
    init();
    // Ask the projector to broadcast its current state so the preview syncs immediately.
    send({ type: "PING" });
  }, [init, send]);

  const allHidden = !visible.preview && !visible.textFormat && !visible.tabs;

  return (
    <FocusManagerProvider>
      <div className="flex h-full min-h-0 flex-col bg-background">
        {/* Workspace toolbar — collapse / restore controls */}
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-2">
          <div className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </div>
          <DockButton
            label="Preview"
            icon={MonitorPlay}
            active={visible.preview}
            onClick={() => togglePanel("preview")}
          />
          <DockButton
            label="Text"
            icon={TypeIcon}
            active={visible.textFormat}
            onClick={() => togglePanel("textFormat")}
          />
          <DockButton
            label="Tabs"
            icon={LayoutGrid}
            active={visible.tabs}
            onClick={() => togglePanel("tabs")}
          />
          <div className="ml-auto text-[10px] text-muted-foreground">
            Drag dividers to resize · Click chips to dock / undock
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {allHidden ? (
            <EmptyDock onShow={showPanel} visible={visible} />
          ) : (
            <PanelGroup
              direction="horizontal"
              autoSaveId="church-media-workspace-h"
              className="h-full"
            >
              {/* LEFT COLUMN: Preview (top) + Text Formatting (bottom) */}
              {(visible.preview || visible.textFormat) && (
                <>
                  <Panel
                    id="left"
                    order={1}
                    defaultSize={50}
                    minSize={20}
                    className="min-h-0"
                  >
                    <PanelGroup
                      direction="vertical"
                      autoSaveId="church-media-workspace-left-v"
                      className="h-full"
                    >
                      {visible.preview && (
                        <>
                          <Panel id="preview" order={1} defaultSize={60} minSize={15} className="min-h-0">
                            <CollapsibleShell
                              title="Preview"
                              icon={MonitorPlay}
                              onCollapse={() => togglePanel("preview")}
                            >
                              <LivePreviewPanel />
                            </CollapsibleShell>
                          </Panel>
                          {visible.textFormat && <VHandle />}
                        </>
                      )}
                      {visible.textFormat && (
                        <Panel id="text-format" order={2} defaultSize={40} minSize={15} className="min-h-0">
                          <CollapsibleShell
                            title="Text Formatting"
                            icon={TypeIcon}
                            onCollapse={() => togglePanel("textFormat")}
                          >
                            <TextFormattingPanel />
                          </CollapsibleShell>
                        </Panel>
                      )}
                    </PanelGroup>
                  </Panel>
                  {visible.tabs && <HHandle />}
                </>
              )}

              {/* RIGHT COLUMN: Tabs */}
              {visible.tabs && (
                <Panel id="right" order={2} defaultSize={50} minSize={25} className="min-h-0">
                  <CollapsibleShell
                    title="Workspace"
                    icon={LayoutGrid}
                    onCollapse={() => togglePanel("tabs")}
                  >
                    <WorkspaceTabsPanel />
                  </CollapsibleShell>
                </Panel>
              )}
            </PanelGroup>
          )}
        </div>
      </div>
    </FocusManagerProvider>
  );
}

function CollapsibleShell({
  title,
  icon: Icon,
  onCollapse,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-sm border border-border/60 bg-card">
      <button
        onClick={onCollapse}
        className="absolute right-1 top-1 z-20 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground/70 opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        title={`Collapse ${title}`}
        aria-label={`Collapse ${title}`}
        style={{ opacity: 1 }}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <div className="flex h-full min-h-0 flex-col">
        {/* sr-only icon ref to satisfy unused warnings if any */}
        <Icon className="hidden" />
        {children}
      </div>
    </div>
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
    <PanelResizeHandle className="group relative w-1.5 bg-transparent transition hover:bg-primary/40 data-[resize-handle-state=drag]:bg-primary/60">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
    </PanelResizeHandle>
  );
}
function VHandle() {
  return (
    <PanelResizeHandle className="group relative h-1.5 bg-transparent transition hover:bg-primary/40 data-[resize-handle-state=drag]:bg-primary/60">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
    </PanelResizeHandle>
  );
}

function EmptyDock({ onShow, visible }: { onShow: (k: keyof PanelVisibility) => void; visible: PanelVisibility }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
      <div>All panels are collapsed.</div>
      <div className="flex flex-wrap justify-center gap-2">
        {(!visible.preview) && (
          <button onClick={() => onShow("preview")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            Show Preview
          </button>
        )}
        {(!visible.textFormat) && (
          <button onClick={() => onShow("textFormat")} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            Show Text Formatting
          </button>
        )}
        {(!visible.tabs) && (
          <button onClick={() => onShow("tabs")} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            Show Workspace Tabs
          </button>
        )}
      </div>
    </div>
  );
}
