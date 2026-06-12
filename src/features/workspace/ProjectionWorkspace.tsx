import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator, type Layout, type PanelImperativeHandle } from "react-resizable-panels";
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
 *   │  (collapsible)       │    Songs / Text)     │
 *   └──────────────────────┴──────────────────────┘
 *
 * • Every divider is drag-resizable.
 * • Layout (panel sizes) persists via localStorage on every drag commit.
 * • Panel visibility, active tab, and the bottom-panel collapsed state
 *   persist via the workspace zustand store.
 * • The bottom Text Formatting panel is collapsible — when collapsed it
 *   shrinks to its header strip, handing all extra vertical space to the
 *   Live Preview while remaining one click from re-expansion.
 */
const LAYOUT_KEYS = {
  leftWidth: "church-media-ws-left-width-v3",
  left: "church-media-ws-left-v2",
};
// Header strip is h-9 (36px). Expressed as a fraction of a typical workspace
// height (~700px) for the resizable-panels percentage model.
const TEXT_FORMAT_COLLAPSED_SIZE = 6;
const TEXT_FORMAT_DEFAULT_SIZE = 40;

// Pixel-based sizing for the left column (Preview + Text Formatting).
// The workspace must never auto-balance on load: use the saved operator width
// or exactly 250px on first run. The right Media workspace consumes the rest.
const LEFT_DEFAULT_WIDTH = 250;
const LEFT_MIN_WIDTH = 200;
const RIGHT_MIN_WIDTH = 320;
const TABS_COLLAPSED_WIDTH = 48;

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

function readSavedLeftWidth(): number | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEYS.leftWidth);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeLeftWidth(width: number) {
  try {
    localStorage.setItem(LAYOUT_KEYS.leftWidth, String(Math.round(width)));
  } catch {
    /* quota / private mode */
  }
}

export function ProjectionWorkspace() {
  const { visible, togglePanel, showPanel } = useWorkspace();
  const textFormatCollapsed = useWorkspace((s) => s.textFormatCollapsed);
  const setTextFormatCollapsed = useWorkspace((s) => s.setTextFormatCollapsed);
  const tabsCollapsed = useWorkspace((s) => s.tabsCollapsed);
  const [resetNonce, setResetNonce] = useState(0);
  const [leftWidthDefault, setLeftWidthDefault] = useState(() => readSavedLeftWidth() ?? LEFT_DEFAULT_WIDTH);
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const init = useProjection((s) => s.init);
  const send = useProjection((s) => s.send);

  useEffect(() => {
    init();
    send({ type: "PING" });
  }, [init, send]);

  const savedLeft = useMemo(() => readLayout(LAYOUT_KEYS.left), []);

  const allHidden = !visible.preview && !visible.textFormat && !visible.tabs;
  const leftVisible = visible.preview || visible.textFormat;

  const leftLayout = visible.preview && visible.textFormat ? savedLeft : undefined;

  const outerKey = `outer-${leftVisible ? 1 : 0}-${visible.tabs ? 1 : 0}-${tabsCollapsed ? "c" : "o"}`;
  const leftKey = `left-${visible.preview ? 1 : 0}-${visible.textFormat ? 1 : 0}-${resetNonce}`;
  const rightWidth = visible.tabs && tabsCollapsed ? TABS_COLLAPSED_WIDTH : undefined;

  // Drive the bottom panel size from the persisted collapsed flag.
  // CRITICAL: skip the very first reconcile pass. On mount, react-resizable-panels
  // applies our saved `defaultLayout` (e.g. preview 50%, text-format 50%). If we
  // immediately call expand()/collapse() here we override that saved geometry and
  // snap to defaultSize (text-format 40 / preview 60) — which manifested as
  // "Preview collapses, Text Formatting expands" on reload. We only act on
  // subsequent user-initiated toggles.
  const textFormatPanelRef = useRef<PanelImperativeHandle | null>(null);
  const didHydrateRef = useRef(false);
  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    const p = textFormatPanelRef.current;
    if (!p) return;
    try {
      if (textFormatCollapsed && !p.isCollapsed()) p.collapse();
      if (!textFormatCollapsed && p.isCollapsed()) p.expand();
    } catch {
      /* panel handle not ready yet — next layout pass will reconcile */
    }
  }, [textFormatCollapsed, visible.textFormat, visible.preview]);

  const startHorizontalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingHorizontal(true);

    const updateWidth = (clientX: number) => {
      const workspace = workspaceRef.current;
      if (!workspace) return;
      const bounds = workspace.getBoundingClientRect();
      const reservedRightWidth = visible.tabs && tabsCollapsed ? TABS_COLLAPSED_WIDTH : visible.tabs ? RIGHT_MIN_WIDTH : 0;
      const maxLeftWidth = Math.max(LEFT_MIN_WIDTH, bounds.width - reservedRightWidth);
      const nextWidth = Math.min(Math.max(clientX - bounds.left, LEFT_MIN_WIDTH), maxLeftWidth);
      setLeftWidthDefault(nextWidth);
      writeLeftWidth(nextWidth);
    };

    updateWidth(event.clientX);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (moveEvent: PointerEvent) => updateWidth(moveEvent.clientX);
    const stopDragging = () => {
      setIsDraggingHorizontal(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  };




  const resetLayout = () => {
    try {
      localStorage.removeItem(LAYOUT_KEYS.leftWidth);
      localStorage.removeItem("church-media-ws-outer-v2");
      localStorage.removeItem(LAYOUT_KEYS.left);
    } catch {
      /* ignore */
    }
    useWorkspace.setState({
      visible: { preview: true, textFormat: true, tabs: true },
      textFormatCollapsed: false,
      tabsCollapsed: false,
    });
    setLeftWidthDefault(LEFT_DEFAULT_WIDTH);
    // Force remount so panels re-read their pixel-based defaults.
    setResetNonce((n: number) => n + 1);
  };

  return (
    <FocusManagerProvider>
      <div className="flex h-full min-h-0 flex-col bg-background">
        {/* Workspace dock controls — original inline toolbar (Preview / Text / Tabs). */}
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-2 pr-44">
          <DockButton label="Preview" icon={MonitorPlay} active={visible.preview} onClick={() => togglePanel("preview")} />
          <DockButton label="Text" icon={TypeIcon} active={visible.textFormat} onClick={() => togglePanel("textFormat")} />
          <DockButton label="Tabs" icon={LayoutGrid} active={visible.tabs} onClick={() => togglePanel("tabs")} />
          <div className="ml-auto">
            <button
              onClick={resetLayout}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Reset Workspace Layout to defaults"
            >
              Reset Layout
            </button>
          </div>
        </div>


        <div className="min-h-0 flex-1">
          {allHidden ? (
            <EmptyDock onShow={showPanel} visible={visible} />
          ) : (
            <div
              key={outerKey}
              ref={workspaceRef}
              className="flex h-full min-w-0 overflow-hidden"
            >
              {leftVisible && (
                <div
                  data-workspace-left-panel
                  style={visible.tabs ? { width: leftWidthDefault, minWidth: LEFT_MIN_WIDTH } : { minWidth: LEFT_MIN_WIDTH }}
                  className={cn("min-h-0 min-w-0", visible.tabs ? "shrink-0" : "flex-1")}
                >
                  <Group
                    key={leftKey}
                    orientation="vertical"
                    className="h-full"
                    defaultLayout={leftLayout}
                    onLayoutChanged={(l) => {
                      if (visible.preview && visible.textFormat) writeLayout(LAYOUT_KEYS.left, l);
                    }}
                  >

                    {visible.preview && (
                      <Panel id="preview" defaultSize={60} minSize={8} className="min-h-0">
                        <LivePreviewPanel />
                      </Panel>
                    )}
                    {visible.preview && visible.textFormat && <VHandle />}
                    {visible.textFormat && (
                      <Panel
                        id="text-format"
                        panelRef={(handle) => {
                          textFormatPanelRef.current = handle as typeof textFormatPanelRef.current;
                        }}
                        defaultSize={textFormatCollapsed ? TEXT_FORMAT_COLLAPSED_SIZE : TEXT_FORMAT_DEFAULT_SIZE}
                        minSize={6}
                        collapsible
                        collapsedSize={TEXT_FORMAT_COLLAPSED_SIZE}
                        onResize={(size) => {
                          const isCollapsed = size.asPercentage <= TEXT_FORMAT_COLLAPSED_SIZE + 0.5;
                          if (isCollapsed !== textFormatCollapsed) {
                            setTextFormatCollapsed(isCollapsed);
                          }
                        }}
                        className="min-h-0"
                      >
                        <TextFormattingPanel />
                      </Panel>
                    )}
                  </Group>
                </div>
              )}
              {leftVisible && visible.tabs && <HHandle onPointerDown={startHorizontalDrag} active={isDraggingHorizontal} />}
              {visible.tabs && (
                <div
                  data-workspace-right-panel
                  style={rightWidth ? { width: rightWidth, minWidth: rightWidth } : { minWidth: RIGHT_MIN_WIDTH }}
                  className={cn("min-h-0 min-w-0 overflow-hidden", rightWidth ? "shrink-0" : "flex-1")}
                >
                  <WorkspaceTabsPanel />
                </div>
              )}

            </div>
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
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition",
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

function HHandle({ onPointerDown, active }: { onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void; active: boolean }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className={cn(
        "relative w-1.5 shrink-0 cursor-col-resize bg-transparent transition hover:bg-primary/40",
        active && "bg-primary/60",
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
    </div>
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
          <button onClick={() => onShow("preview")} className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            Show Preview
          </button>
        )}
        {!visible.textFormat && (
          <button onClick={() => onShow("textFormat")} className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            Show Text Formatting
          </button>
        )}
        {!visible.tabs && (
          <button onClick={() => onShow("tabs")} className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
            Show Workspace Tabs
          </button>
        )}
      </div>
    </div>
  );
}
