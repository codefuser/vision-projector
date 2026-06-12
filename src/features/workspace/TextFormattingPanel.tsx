/**
 * TextFormattingPanel — Phase 4.
 *
 * Three independent groups (Reference / Tamil / English) selectable via a
 * segmented tab strip, plus a dedicated Background section pinned at the
 * bottom. Every field writes to useTextFormat which broadcasts to the
 * projector + Live Preview in real time.
 */
import { useEffect, useRef, useState } from "react";
import { Type, Palette, AlignLeft, Bold, Sun, Square as SquareIcon, Move, Sparkles, ChevronDown, ChevronUp, RotateCcw, Eye, EyeOff, ImageIcon, X, Upload, Image as LogoIcon, Trash2 } from "lucide-react";
import { useFocusZone } from "./focus-manager";
import { useWorkspace } from "./workspace.store";
import { useTextFormat, type StyleGroup } from "@/lib/text-format/store";
import type { SectionStyle, TextStyle } from "@/lib/broadcast";
import { cn } from "@/lib/utils";
import { MediaPickerDialog } from "@/features/playlists/MediaPickerDialog";
import { getMedia } from "@/db/repo";
import { db } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import { useLogo, type LogoPosition } from "@/stores/logo.store";
import { useBackgroundGallery, type BackgroundItem } from "@/stores/background-gallery.store";

const FONT_FAMILIES = [
  "Inter", "Roboto", "Georgia", "Times New Roman", "Arial", "Verdana", "Tahoma",
  "Latha", "Nirmala UI",
  "Noto Sans Tamil", "Noto Serif Tamil", "Mukta Malar", "Catamaran",
  "Hind Madurai", "Meera Inimai", "Pavanam",
];
const WEIGHTS: { label: string; value: number }[] = [
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semibold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Black", value: 900 },
];

const GROUP_LABELS: Record<StyleGroup, string> = {
  reference: "Reference",
  tamil: "Tamil",
  english: "English",
};

export function TextFormattingPanel() {
  const focus = useFocusZone("text-format");
  const collapsed = useWorkspace((s) => s.textFormatCollapsed);
  const toggle = useWorkspace((s) => s.toggleTextFormatCollapsed);
  const groups = useTextFormat((s) => s.groups);
  const setField = useTextFormat((s) => s.setField);
  const patchGroup = useTextFormat((s) => s.patchGroup);
  const setBackground = useTextFormat((s) => s.setBackground);
  const resetGroup = useTextFormat((s) => s.resetGroup);
  const reset = useTextFormat((s) => s.reset);
  const [active, setActive] = useState<StyleGroup>("reference");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bgName, setBgName] = useState<string | null>(null);

  const style = groups[active];

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
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <div className="shrink-0 text-[11px] font-semibold uppercase tracking-wide">Text Formatting</div>
          <div className="hidden truncate text-[10px] text-muted-foreground @sm:block">
            {collapsed ? "Collapsed — click to expand" : "Per-group · Reference / Tamil / English / BG / Logo"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={reset}
            title="Reset all groups"
            className="inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> <span className="hidden @sm:inline">Reset all</span>
          </button>
          <button
            onClick={toggle}
            title={collapsed ? "Expand" : "Collapse"}
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          {/* Group selector — wraps on narrow widths so Reset/Visibility never clip. */}
          <div className="mb-3 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-0.5">
            {(Object.keys(GROUP_LABELS) as StyleGroup[]).map((g) => (
              <button
                key={g}
                onClick={() => setActive(g)}
                className={cn(
                  "min-w-[60px] flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition",
                  active === g
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
            <button
              onClick={() => patchGroup(active, { visible: !style.visible })}
              title={style.visible ? "Hide this section in projection" : "Show this section in projection"}
              className={cn(
                "ml-1 inline-flex h-6 w-7 shrink-0 cursor-pointer items-center justify-center rounded border text-[10px]",
                style.visible ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
              )}
            >
              {style.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button
              onClick={() => resetGroup(active)}
              title={`Reset ${GROUP_LABELS[active]}`}
              className="ml-1 inline-flex h-6 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-background text-[10px] text-muted-foreground hover:bg-accent"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
            <Group icon={Type} title="Typography">
              <Field label="Font Family">
                <Select value={style.fontFamily} onChange={(v) => setField(active, "fontFamily", v)}
                        options={FONT_FAMILIES.map((f) => ({ label: f, value: f }))} />
              </Field>
              <Row>
                <Field label="Size">
                  <NumberInput value={style.fontSizeVw} step={0.2} min={1} max={20}
                               suffix="vw" onChange={(v) => setField(active, "fontSizeVw", v)} />
                </Field>
                <Field label="Weight">
                  <Select value={String(style.fontWeight)}
                          onChange={(v) => setField(active, "fontWeight", Number(v))}
                          options={WEIGHTS.map((w) => ({ label: w.label, value: String(w.value) }))} />
                </Field>
              </Row>
              <Row>
                <Field label="Line Height">
                  <NumberInput value={style.lineHeight} step={0.05} min={0.8} max={3}
                               onChange={(v) => setField(active, "lineHeight", v)} />
                </Field>
                <Field label="Letter Spacing">
                  <NumberInput value={style.letterSpacing} step={0.1} min={-5} max={20} suffix="px"
                               onChange={(v) => setField(active, "letterSpacing", v)} />
                </Field>
              </Row>
            </Group>

            <Group icon={Palette} title="Color">
              <Row>
                <Field label="Color"><ColorInput value={style.color} onChange={(v) => setField(active, "color", v)} /></Field>
                <Field label="Opacity">
                  <NumberInput value={Math.round(style.textOpacity * 100)} step={1} min={0} max={100} suffix="%"
                               onChange={(v) => setField(active, "textOpacity", v / 100)} />
                </Field>
              </Row>
            </Group>

            <Group icon={Bold} title="Style">
              <div className="flex flex-wrap gap-1.5">
                <Toggle label="B" active={style.fontWeight >= 700}
                        onClick={() => setField(active, "fontWeight", style.fontWeight >= 700 ? 500 : 700)} />
                <Toggle label="I" active={style.italic} onClick={() => setField(active, "italic", !style.italic)} />
                <Toggle label="U" active={style.underline} onClick={() => setField(active, "underline", !style.underline)} />
              </div>
            </Group>

            <Group icon={AlignLeft} title="Alignment">
              <Row>
                <Field label="Horizontal">
                  <div className="flex gap-1">
                    {(["left","center","right"] as const).map((a) => (
                      <Toggle key={a} label={a[0].toUpperCase()+a.slice(1)} active={style.align === a}
                              onClick={() => setField(active, "align", a)} />
                    ))}
                  </div>
                </Field>
                <Field label="Vertical">
                  <div className="flex gap-1">
                    {(["top","middle","bottom"] as const).map((a) => (
                      <Toggle key={a} label={a[0].toUpperCase()+a.slice(1)} active={style.vAlign === a}
                              onClick={() => setField(active, "vAlign", a)} />
                    ))}
                  </div>
                </Field>
              </Row>
            </Group>

            <Group icon={Sparkles} title="Shadow">
              <Row>
                <Field label="Enabled">
                  <Toggle label={style.shadow ? "On" : "Off"} active={style.shadow}
                          onClick={() => setField(active, "shadow", !style.shadow)} />
                </Field>
                <Field label="Blur">
                  <NumberInput value={style.shadowBlur} step={1} min={0} max={80} suffix="px"
                               onChange={(v) => setField(active, "shadowBlur", v)} />
                </Field>
              </Row>
              <Field label="Color"><ColorInput value={style.shadowColor} onChange={(v) => setField(active, "shadowColor", v)} /></Field>
            </Group>

            <Group icon={Sun} title="Outline">
              <Row>
                <Field label="Width">
                  <NumberInput value={style.outlineWidth} step={0.5} min={0} max={10} suffix="px"
                               onChange={(v) => setField(active, "outlineWidth", v)} />
                </Field>
                <Field label="Color"><ColorInput value={style.outlineColor} onChange={(v) => setField(active, "outlineColor", v)} /></Field>
              </Row>
            </Group>

            <Group icon={Move} title="Position">
              <Field label="Margin">
                <NumberInput value={style.paddingVw} step={0.5} min={0} max={30} suffix="%"
                             onChange={(v) => setField(active, "paddingVw", v)} />
              </Field>
            </Group>

            <Group icon={SquareIcon} title={`${GROUP_LABELS[active]} background tint`}>
              <Row>
                <Field label="Color"><ColorInput value={style.background} onChange={(v) => setField(active, "background", v)} /></Field>
                <Field label="Opacity">
                  <NumberInput value={Math.round(style.bgOpacity * 100)} step={1} min={0} max={100} suffix="%"
                               onChange={(v) => setField(active, "bgOpacity", v / 100)} />
                </Field>
              </Row>
            </Group>
          </div>

          {/* Background engine — global, sits at the bottom. Only relevant
              controls render per selected kind. */}
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Projection Background</div>
              <div className="ml-auto text-[10px] text-muted-foreground">None · Color · Media</div>
            </div>

            <div className="mb-2 flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
              {(["none", "color", "media"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setBackground({ kind: k })}
                  className={cn(
                    "flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition",
                    groups.background.kind === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>

            {groups.background.kind === "color" && (
              <div className="rounded border border-border bg-background p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Background color</div>
                <ColorInput value={groups.background.color} onChange={(v) => setBackground({ color: v })} />
              </div>
            )}

            {groups.background.kind === "media" && (
              <div className="rounded border border-border bg-background p-2">
                <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Library media</span>
                  <span className="flex items-center gap-1">
                    <Toggle label="Cover" active={groups.background.fit === "cover"} onClick={() => setBackground({ fit: "cover" })} />
                    <Toggle label="Contain" active={groups.background.fit === "contain"} onClick={() => setBackground({ fit: "contain" })} />
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-border bg-background px-2 text-[11px] hover:bg-accent"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {bgName ?? (groups.background.mediaId ? "Library media set" : "Select from library")}
                  </button>
                  {groups.background.mediaId && (
                    <button
                      onClick={() => { setBackground({ mediaId: null }); setBgName(null); }}
                      title="Clear background media"
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Pulls from your Media Library — images, videos, GIFs supported.
                </div>
              </div>
            )}

            {groups.background.kind === "none" && (
              <div className="rounded border border-dashed border-border bg-background/40 p-2 text-[10px] text-muted-foreground">
                No background. The projector stage will be transparent (black) behind text.
              </div>
            )}

            {/* Background gallery — thumbnails of saved backgrounds. */}
            <BackgroundGallerySection onPickFromLibrary={() => setPickerOpen(true)} />
          </div>

          {/* Logo manager */}
          <LogoSection />
        </div>
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onAdd={async (ids) => {
          const id = ids[0];
          if (!id) return;
          const m = await getMedia(id);
          setBackground({ mediaId: id, kind: "media" });
          setBgName(m?.name ?? null);
          // Also push into the saved gallery for one-click recall.
          useBackgroundGallery.getState().addMedia(id, m?.name);
          setPickerOpen(false);
        }}
      />
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
        onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="w-full bg-transparent outline-none"
      />
      {suffix && <span className="ml-1 text-[10px] opacity-60">{suffix}</span>}
    </div>
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full cursor-pointer rounded border border-border bg-background px-1.5 text-xs">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-7 items-center gap-2 rounded border border-border bg-background px-1.5">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-5 w-6 cursor-pointer rounded border-none bg-transparent p-0" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xs outline-none" />
    </div>
  );
}
function Toggle({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded border px-2 text-xs transition",
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent",
      )}>
      {label}
    </button>
  );
}

export type { TextStyle, SectionStyle };
