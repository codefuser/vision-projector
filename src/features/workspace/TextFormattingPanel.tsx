import { Type, Palette, AlignLeft, Bold, Sun, Square as SquareIcon, Move, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useFocusZone } from "./focus-manager";
import { useWorkspace } from "./workspace.store";
import { cn } from "@/lib/utils";

/**
 * Text Formatting Panel — UI scaffold only.
 * No controls are wired to projection yet. Future modules (Bible / Songs /
 * Text) will read these values from a shared formatting store.
 *
 * Supports a collapsed state where only the header strip is visible, so the
 * preview and right workspace get maximum vertical room.
 */
export function TextFormattingPanel() {
  const focus = useFocusZone("text-format");
  const collapsed = useWorkspace((s) => s.textFormatCollapsed);
  const toggle = useWorkspace((s) => s.toggleTextFormatCollapsed);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-card",
        focus.isActive && "ring-1 ring-primary/40",
      )}
      onFocus={focus.onFocus}
      onMouseDown={focus.onFocus}
      tabIndex={focus.tabIndex}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide">Text Formatting</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {collapsed ? "Collapsed — click to expand" : "Reserved for future text modules"}
          </div>
        </div>
        <button
          onClick={toggle}
          title={collapsed ? "Expand formatting panel" : "Collapse formatting panel"}
          aria-label={collapsed ? "Expand formatting panel" : "Collapse formatting panel"}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Group icon={Type} title="Typography">
              <Field label="Font Family">
                <FauxSelect placeholder="Inter" />
              </Field>
              <Row>
                <Field label="Size">
                  <FauxInput placeholder="48" suffix="px" />
                </Field>
                <Field label="Weight">
                  <FauxSelect placeholder="Regular" />
                </Field>
              </Row>
            </Group>

            <Group icon={Palette} title="Color">
              <Row>
                <Field label="Color">
                  <FauxSwatch color="#ffffff" />
                </Field>
                <Field label="Opacity">
                  <FauxInput placeholder="100" suffix="%" />
                </Field>
              </Row>
            </Group>

            <Group icon={Bold} title="Style">
              <div className="flex flex-wrap gap-1.5">
                <FauxToggle label="B" />
                <FauxToggle label="I" />
                <FauxToggle label="U" />
                <FauxToggle label="S" />
              </div>
            </Group>

            <Group icon={AlignLeft} title="Alignment">
              <div className="flex flex-wrap gap-1.5">
                <FauxToggle label="Left" />
                <FauxToggle label="Center" />
                <FauxToggle label="Right" />
                <FauxToggle label="Justify" />
              </div>
            </Group>

            <Group icon={Sparkles} title="Shadow">
              <Row>
                <Field label="Offset">
                  <FauxInput placeholder="0" suffix="px" />
                </Field>
                <Field label="Blur">
                  <FauxInput placeholder="8" suffix="px" />
                </Field>
              </Row>
              <Field label="Color">
                <FauxSwatch color="#000000" />
              </Field>
            </Group>

            <Group icon={Sun} title="Outline">
              <Row>
                <Field label="Width">
                  <FauxInput placeholder="0" suffix="px" />
                </Field>
                <Field label="Color">
                  <FauxSwatch color="#000000" />
                </Field>
              </Row>
            </Group>

            <Group icon={SquareIcon} title="Background">
              <Row>
                <Field label="Color">
                  <FauxSwatch color="#000000" />
                </Field>
                <Field label="Opacity">
                  <FauxInput placeholder="50" suffix="%" />
                </Field>
              </Row>
            </Group>

            <Group icon={Move} title="Position">
              <Row>
                <Field label="X">
                  <FauxInput placeholder="50" suffix="%" />
                </Field>
                <Field label="Y">
                  <FauxInput placeholder="50" suffix="%" />
                </Field>
              </Row>
            </Group>
          </div>

          <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 p-3 text-center text-[11px] text-muted-foreground">
            Controls are disabled. Will activate when Bible, Songs and Text modules ship.
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function FauxInput({ placeholder, suffix }: { placeholder?: string; suffix?: string }) {
  return (
    <div aria-disabled className="flex h-7 items-center rounded border border-border bg-background/60 px-2 text-xs text-muted-foreground/70">
      <span className="flex-1 truncate">{placeholder}</span>
      {suffix && <span className="ml-1 text-[10px] opacity-60">{suffix}</span>}
    </div>
  );
}
function FauxSelect({ placeholder }: { placeholder?: string }) {
  return (
    <div aria-disabled className="flex h-7 items-center justify-between rounded border border-border bg-background/60 px-2 text-xs text-muted-foreground/70">
      <span>{placeholder}</span>
      <span className="opacity-50">▾</span>
    </div>
  );
}
function FauxSwatch({ color }: { color: string }) {
  return (
    <div className="flex h-7 items-center gap-2 rounded border border-border bg-background/60 px-2">
      <span className="h-4 w-4 rounded border border-border" style={{ background: color }} />
      <span className="text-xs text-muted-foreground/70">{color}</span>
    </div>
  );
}
function FauxToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex h-7 min-w-7 cursor-not-allowed items-center justify-center rounded border border-border bg-background/60 px-2 text-xs text-muted-foreground/70"
    >
      {label}
    </button>
  );
}
