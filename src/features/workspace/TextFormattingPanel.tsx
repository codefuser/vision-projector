/**
 * TextFormattingPanel — controls that mutate the shared text-formatting
 * store. Every change broadcasts an UPDATE_TEXT_STYLE command so the
 * projector window and Live Preview update instantly.
 */
import { Type, Palette, AlignLeft, Bold, Sun, Square as SquareIcon, Move, Sparkles, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useFocusZone } from "./focus-manager";
import { useWorkspace } from "./workspace.store";
import { useTextFormat } from "@/lib/text-format/store";
import type { TextStyle } from "@/lib/broadcast";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = ["Inter", "Roboto", "Georgia", "Times New Roman", "Arial", "Verdana", "Tahoma", "Latha", "Nirmala UI"];
const WEIGHTS: { label: string; value: number }[] = [
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semibold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Black", value: 900 },
];

export function TextFormattingPanel() {
  const focus = useFocusZone("text-format");
  const collapsed = useWorkspace((s) => s.textFormatCollapsed);
  const toggle = useWorkspace((s) => s.toggleTextFormatCollapsed);
  const style = useTextFormat((s) => s.style);
  const setVal = useTextFormat((s) => s.set);
  const reset = useTextFormat((s) => s.reset);

  return (
    <div
      className={cn(
        "@container flex h-full min-h-0 flex-col bg-card",
        focus.isActive && "ring-1 ring-primary/40",
      )}
      onFocus={focus.onFocus}
      onMouseDown={focus.onFocus}
      tabIndex={focus.tabIndex}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide">Text Formatting</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {collapsed ? "Collapsed — click to expand" : "Applies to Bible / Songs / Text"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            title="Reset to defaults"
            className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
          <button
            onClick={toggle}
            title={collapsed ? "Expand" : "Collapse"}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4">
            <Group icon={Type} title="Typography">
              <Field label="Font Family">
                <Select value={style.fontFamily} onChange={(v) => setVal("fontFamily", v)}
                        options={FONT_FAMILIES.map((f) => ({ label: f, value: f }))} />
              </Field>
              <Row>
                <Field label="Size">
                  <NumberInput value={style.fontSizeVw} step={0.2} min={1} max={20}
                               suffix="vw" onChange={(v) => setVal("fontSizeVw", v)} />
                </Field>
                <Field label="Weight">
                  <Select value={String(style.fontWeight)}
                          onChange={(v) => setVal("fontWeight", Number(v))}
                          options={WEIGHTS.map((w) => ({ label: w.label, value: String(w.value) }))} />
                </Field>
              </Row>
              <Row>
                <Field label="Line Height">
                  <NumberInput value={style.lineHeight} step={0.05} min={0.8} max={3}
                               onChange={(v) => setVal("lineHeight", v)} />
                </Field>
                <Field label="Letter Spacing">
                  <NumberInput value={style.letterSpacing} step={0.1} min={-5} max={20} suffix="px"
                               onChange={(v) => setVal("letterSpacing", v)} />
                </Field>
              </Row>
            </Group>

            <Group icon={Palette} title="Color">
              <Row>
                <Field label="Color"><ColorInput value={style.color} onChange={(v) => setVal("color", v)} /></Field>
                <Field label="Opacity">
                  <NumberInput value={Math.round(style.textOpacity * 100)} step={1} min={0} max={100} suffix="%"
                               onChange={(v) => setVal("textOpacity", v / 100)} />
                </Field>
              </Row>
            </Group>

            <Group icon={Bold} title="Style">
              <div className="flex flex-wrap gap-1.5">
                <Toggle label="B" active={style.fontWeight >= 700}
                        onClick={() => setVal("fontWeight", style.fontWeight >= 700 ? 500 : 700)} />
                <Toggle label="I" active={style.italic} onClick={() => setVal("italic", !style.italic)} />
                <Toggle label="U" active={style.underline} onClick={() => setVal("underline", !style.underline)} />
              </div>
            </Group>

            <Group icon={AlignLeft} title="Alignment">
              <Row>
                <Field label="Horizontal">
                  <div className="flex gap-1">
                    {(["left","center","right"] as const).map((a) => (
                      <Toggle key={a} label={a[0].toUpperCase()+a.slice(1)} active={style.align === a}
                              onClick={() => setVal("align", a)} />
                    ))}
                  </div>
                </Field>
                <Field label="Vertical">
                  <div className="flex gap-1">
                    {(["top","middle","bottom"] as const).map((a) => (
                      <Toggle key={a} label={a[0].toUpperCase()+a.slice(1)} active={style.vAlign === a}
                              onClick={() => setVal("vAlign", a)} />
                    ))}
                  </div>
                </Field>
              </Row>
            </Group>

            <Group icon={Sparkles} title="Shadow">
              <Row>
                <Field label="Enabled">
                  <Toggle label={style.shadow ? "On" : "Off"} active={style.shadow}
                          onClick={() => setVal("shadow", !style.shadow)} />
                </Field>
                <Field label="Blur">
                  <NumberInput value={style.shadowBlur} step={1} min={0} max={80} suffix="px"
                               onChange={(v) => setVal("shadowBlur", v)} />
                </Field>
              </Row>
              <Field label="Color"><ColorInput value={style.shadowColor} onChange={(v) => setVal("shadowColor", v)} /></Field>
            </Group>

            <Group icon={Sun} title="Outline">
              <Row>
                <Field label="Width">
                  <NumberInput value={style.outlineWidth} step={0.5} min={0} max={10} suffix="px"
                               onChange={(v) => setVal("outlineWidth", v)} />
                </Field>
                <Field label="Color"><ColorInput value={style.outlineColor} onChange={(v) => setVal("outlineColor", v)} /></Field>
              </Row>
            </Group>

            <Group icon={SquareIcon} title="Background">
              <Row>
                <Field label="Color"><ColorInput value={style.background} onChange={(v) => setVal("background", v)} /></Field>
                <Field label="Opacity">
                  <NumberInput value={Math.round(style.bgOpacity * 100)} step={1} min={0} max={100} suffix="%"
                               onChange={(v) => setVal("bgOpacity", v / 100)} />
                </Field>
              </Row>
            </Group>

            <Group icon={Move} title="Position">
              <Field label="Margin">
                <NumberInput value={style.paddingVw} step={0.5} min={0} max={30} suffix="%"
                             onChange={(v) => setVal("paddingVw", v)} />
              </Field>
            </Group>
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
function NumberInput({ value, onChange, step = 1, min, max, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="flex h-7 items-center rounded border border-border bg-background px-2 text-xs">
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="w-full bg-transparent outline-none"
      />
      {suffix && <span className="ml-1 text-[10px] opacity-60">{suffix}</span>}
    </div>
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full cursor-pointer rounded border border-border bg-background px-1.5 text-xs"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-7 items-center gap-2 rounded border border-border bg-background px-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-6 cursor-pointer rounded border-none bg-transparent p-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xs outline-none"
      />
    </div>
  );
}
function Toggle({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded border px-2 text-xs transition",
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

// Re-export TextStyle type for downstream consumers that import from this file.
export type { TextStyle };
