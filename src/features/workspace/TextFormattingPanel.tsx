/**
 * TextFormattingPanel — Phase 4.
 *
 * Three independent groups (Reference / Tamil / English) selectable via a
 * segmented tab strip, plus a dedicated Background section pinned at the
 * bottom. Every field writes to useTextFormat which broadcasts to the
 * projector + Live Preview in real time.
 */
import { useEffect, useRef, useState } from "react";
import { Type, Palette, AlignLeft, Bold, Sun, Square as SquareIcon, Move, Sparkles, ChevronDown, ChevronUp, RotateCcw, Eye, EyeOff, ImageIcon, X, Upload, Image as LogoIcon, Trash2, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useBackground } from "@/stores/background.store";

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
import { TemplatesStrip } from "./TemplatesStrip";

const FONT_FAMILIES = [
  "Inter", "Roboto", "Georgia", "Times New Roman", "Arial", "Verdana", "Tahoma",
  // Tamil presentation fonts
  "Latha", "Nirmala UI", "Vijaya", "Akshar Unicode",
  "Noto Sans Tamil", "Noto Serif Tamil", "Noto Sans Tamil UI",
  "Mukta Malar", "Catamaran", "Hind Madurai", "Meera Inimai", "Pavanam",
  "Arima Madurai", "Anek Tamil", "Kavivanar", "Pathway Gothic One",
  "Tiro Tamil", "Mukta", "Baloo Thambi 2", "Cousine",
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
  const activeTab = useWorkspace((s) => s.activeTab);
  const groups = useTextFormat((s) => s.groups);
  const setField = useTextFormat((s) => s.setField);
  const patchGroup = useTextFormat((s) => s.patchGroup);
  const setBackground = useTextFormat((s) => s.setBackground);
  const resetGroup = useTextFormat((s) => s.resetGroup);
  const reset = useTextFormat((s) => s.reset);
  // When Songs tab is active, only Tamil + Background are meaningful.
  const songsMode = activeTab === "songs";
  const visibleGroups: StyleGroup[] = songsMode ? ["tamil"] : (Object.keys(GROUP_LABELS) as StyleGroup[]);
  const [activeRaw, setActive] = useState<StyleGroup>("reference");
  const active: StyleGroup = songsMode ? "tamil" : activeRaw;
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
            {collapsed ? "Collapsed — click to expand" : songsMode ? "Songs · Tamil + Background" : "Per-group · Reference / Tamil / English / BG / Logo"}
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

      {!collapsed && <TemplatesStrip />}

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          {/* Group selector — wraps on narrow widths so Reset/Visibility never clip. */}
          <div className="mb-3 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-0.5">
            {visibleGroups.map((g) => (
              <button
                key={g}
                onClick={() => setActive(g)}
                disabled={songsMode}
                className={cn(
                  "min-w-[60px] flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition",
                  active === g
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {songsMode ? "Tamil Song" : GROUP_LABELS[g]}
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
                  <NumberInput value={style.fontSizeVw} step={0.2} min={0.5}
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

          {/* Layer master toggles — themes never overwrite backgrounds when
              "Custom Background" is on or "Theme Background" is off. */}
          <LayerSwitchesPanel />

          {/* Background engine — global, sits at the bottom. Only relevant
              controls render per selected kind. */}
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
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
              <div className="space-y-2 rounded border border-border bg-background p-2">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Library media</span>
                  <span className="flex items-center gap-1">
                    <Toggle label="Cover" active={groups.background.fit === "cover"} onClick={() => setBackground({ fit: "cover" })} />
                    <Toggle label="Contain" active={groups.background.fit === "contain"} onClick={() => setBackground({ fit: "contain" })} />
                    <Toggle label="Stretch" active={groups.background.fit === "stretch"} onClick={() => setBackground({ fit: "stretch" })} />
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

                {/* Visual adjustments */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Field label="Opacity">
                    <NumberInput value={Math.round((groups.background.opacity ?? 1) * 100)} step={1} min={0} max={100} suffix="%"
                                 onChange={(v) => setBackground({ opacity: v / 100 })} />
                  </Field>
                  <Field label="Brightness">
                    <NumberInput value={Math.round((groups.background.brightness ?? 1) * 100)} step={1} min={0} max={200} suffix="%"
                                 onChange={(v) => setBackground({ brightness: v / 100 })} />
                  </Field>
                  <Field label="Blur">
                    <NumberInput value={groups.background.blur ?? 0} step={1} min={0} max={60} suffix="px"
                                 onChange={(v) => setBackground({ blur: v })} />
                  </Field>
                  <Field label="Zoom">
                    <NumberInput value={Math.round((groups.background.zoom ?? 1) * 100)} step={5} min={50} max={300} suffix="%"
                                 onChange={(v) => setBackground({ zoom: v / 100 })} />
                  </Field>
                  <Field label="Position X">
                    <NumberInput value={groups.background.positionX ?? 50} step={1} min={0} max={100} suffix="%"
                                 onChange={(v) => setBackground({ positionX: v })} />
                  </Field>
                  <Field label="Position Y">
                    <NumberInput value={groups.background.positionY ?? 50} step={1} min={0} max={100} suffix="%"
                                 onChange={(v) => setBackground({ positionY: v })} />
                  </Field>
                  <Field label="Contrast">
                    <NumberInput value={Math.round((groups.background.contrast ?? 1) * 100)} step={1} min={0} max={200} suffix="%"
                                 onChange={(v) => setBackground({ contrast: v / 100 })} />
                  </Field>
                </div>

                {/* Overlay tint */}
                <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
                  <Field label="Overlay Color">
                    <ColorInput value={groups.background.overlayColor ?? "#000000"}
                                onChange={(v) => setBackground({ overlayColor: v })} />
                  </Field>
                  <Field label="Overlay Opacity">
                    <NumberInput value={Math.round((groups.background.overlayOpacity ?? 0) * 100)} step={1} min={0} max={100} suffix="%"
                                 onChange={(v) => setBackground({ overlayOpacity: v / 100 })} />
                  </Field>
                </div>

                {/* Video controls — only meaningful for video media. */}
                <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-2">
                  <SwitchRow label="Loop video"
                             checked={groups.background.videoLoop ?? true}
                             onChange={(v) => setBackground({ videoLoop: v })} />
                  <SwitchRow label="Mute video"
                             checked={groups.background.videoMuted ?? true}
                             onChange={(v) => setBackground({ videoMuted: v })} />
                  <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    Speed
                    <NumberInput value={groups.background.videoSpeed ?? 1} step={0.25} min={0.25} max={4} suffix="x"
                                 onChange={(v) => setBackground({ videoSpeed: v })} />
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground">
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
  // Browser color-picker extensions (e.g. ColorPick Eyedropper) inject an
  // <img> overlay into the native color input which trips React's
  // hydration check. Suppress the warning at the wrapper level and render
  // the input only on the client so SSR markup stays inert.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="flex h-7 items-center gap-2 rounded border border-border bg-background px-1.5" suppressHydrationWarning>
      {mounted ? (
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-5 w-6 cursor-pointer rounded border-none bg-transparent p-0" suppressHydrationWarning />
      ) : (
        <span className="inline-block h-5 w-6 rounded" style={{ background: value }} />
      )}
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

function SwitchRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn(
      "flex items-center gap-2 text-[11px]",
      disabled ? "opacity-50" : "cursor-pointer",
    )}>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Master toggles for the projection layers. These are deliberately
 * decoupled from theme styling — toggling "Custom Background" off does NOT
 * change the active theme's typography. Real <Switch> controls (not text
 * buttons) per the design spec.
 */
function LayerSwitchesPanel() {
  const bg = useBackground();
  return (
    <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-primary" />
        <div className="text-[11px] font-semibold uppercase tracking-wide">Layers</div>
        <div className="ml-auto text-[10px] text-muted-foreground">Themes never overwrite layers below</div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 @md:grid-cols-3">
        <SwitchRow label="Background"
                   checked={bg.backgroundEnabled}
                   onChange={(v) => bg.set("backgroundEnabled", v)} />
        <SwitchRow label="Logo"
                   checked={bg.logoEnabled}
                   onChange={(v) => bg.set("logoEnabled", v)} />
        <SwitchRow label="Theme Background"
                   checked={bg.themeBackgroundEnabled}
                   disabled={bg.customBackgroundEnabled}
                   onChange={(v) => bg.set("themeBackgroundEnabled", v)} />
        <SwitchRow label="Custom Background"
                   checked={bg.customBackgroundEnabled}
                   onChange={(v) => bg.set("customBackgroundEnabled", v)} />
        <SwitchRow label="Motion Effects"
                   checked={bg.motionEnabled}
                   onChange={(v) => bg.set("motionEnabled", v)} />
        <SwitchRow label="Particles"
                   checked={bg.particlesEnabled}
                   disabled={!bg.motionEnabled}
                   onChange={(v) => bg.set("particlesEnabled", v)} />
        <SwitchRow label="Text Shadow"
                   checked={bg.textShadowEnabled}
                   onChange={(v) => bg.set("textShadowEnabled", v)} />
        <SwitchRow label="Text Stroke"
                   checked={bg.textStrokeEnabled}
                   onChange={(v) => bg.set("textStrokeEnabled", v)} />
      </div>
      {bg.customBackgroundEnabled && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300">
          Custom Background is ON — applying a theme will NOT change your background.
        </div>
      )}
    </div>
  );
}

export type { TextStyle, SectionStyle };


// ─────────────────────────── Background gallery ────────────────────────────
function BackgroundGallerySection({ onPickFromLibrary }: { onPickFromLibrary: () => void }) {
  const items = useBackgroundGallery((s) => s.items);
  const remove = useBackgroundGallery((s) => s.remove);
  const addColor = useBackgroundGallery((s) => s.addColor);
  const setBackground = useTextFormat((s) => s.setBackground);
  const bgColor = useTextFormat((s) => s.groups.background.color);
  if (items.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-1">
        <button onClick={onPickFromLibrary} className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-border bg-background px-2 text-[11px] hover:bg-accent">
          <ImageIcon className="h-3 w-3" /> Add background from library
        </button>
        <button onClick={() => addColor(bgColor)} className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-border bg-background px-2 text-[11px] hover:bg-accent">
          + Color
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Saved backgrounds ({items.length})</span>
        <button onClick={onPickFromLibrary} className="cursor-pointer text-primary hover:underline">+ Add</button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 @md:grid-cols-6">
        {items.map((it) => (
          <BackgroundThumb
            key={it.id}
            item={it}
            onSelect={() => {
              if (it.kind === "color") setBackground({ kind: "color", color: it.color! });
              else setBackground({ kind: "media", mediaId: it.mediaId! });
            }}
            onRemove={() => remove(it.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BackgroundThumb({ item, onSelect, onRemove }: { item: BackgroundItem; onSelect: () => void; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (item.kind !== "media" || !item.mediaId) return;
    let cancelled = false;
    let key: string | null = null;
    (async () => {
      const m = await getMedia(item.mediaId!);
      if (!m) return;
      const rec = await db().blobs.get(m.thumbBlobId ?? m.blobId);
      if (!rec || cancelled) return;
      key = (m.thumbBlobId ?? m.blobId);
      setUrl(acquireUrl(key, rec.blob));
    })();
    return () => { cancelled = true; if (key) releaseUrl(key); };
  }, [item]);
  return (
    <div className="group relative aspect-video overflow-hidden rounded border border-border bg-background">
      <button onClick={onSelect} className="absolute inset-0 cursor-pointer" title={item.name ?? item.color ?? ""}>
        {item.kind === "color" ? (
          <div className="h-full w-full" style={{ background: item.color }} />
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] text-muted-foreground">…</div>
        )}
      </button>
      <button onClick={onRemove} className="absolute right-0.5 top-0.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded bg-black/60 text-white group-hover:flex" title="Remove">
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ──────────────────────────────── Logo manager ─────────────────────────────
function LogoSection() {
  const enabled = useLogo((s) => s.enabled);
  const current = useLogo((s) => s.current);
  const gallery = useLogo((s) => s.gallery);
  const settings = useLogo((s) => s.settings);
  const setEnabled = useLogo((s) => s.setEnabled);
  const addFromFile = useLogo((s) => s.addFromFile);
  const selectFromGallery = useLogo((s) => s.selectFromGallery);
  const removeFromGallery = useLogo((s) => s.removeFromGallery);
  const patch = useLogo((s) => s.patch);
  const [open, setOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const POSITIONS: { id: LogoPosition; label: string }[] = [
    { id: "top-left", label: "TL" }, { id: "top-right", label: "TR" },
    { id: "bottom-left", label: "BL" }, { id: "bottom-right", label: "BR" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <LogoIcon className="h-3.5 w-3.5 text-primary" />
        <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Projection Logo</div>
        <label className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {enabled ? "Enabled" : "Disabled"}
        </label>
        <button onClick={() => setOpen((v) => !v)} className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {open && enabled && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void addFromFile(f); e.currentTarget.value = ""; }}
            />
            <button onClick={() => fileRef.current?.click()} className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-border bg-background px-2 text-[11px] hover:bg-accent">
              <Upload className="h-3 w-3" /> Upload logo
            </button>
          </div>

          {gallery.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Gallery ({gallery.length}/5)</div>
              <div className="grid grid-cols-5 gap-1.5">
                {gallery.map((g) => (
                  <div key={g.id} className={cn("group relative aspect-square overflow-hidden rounded border bg-background", current?.id === g.id ? "border-primary ring-1 ring-primary/40" : "border-border")}>
                    <button onClick={() => selectFromGallery(g.id)} className="absolute inset-0 cursor-pointer" title={g.name}>
                      <img src={g.dataUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                    </button>
                    <button onClick={() => removeFromGallery(g.id)} className="absolute right-0.5 top-0.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded bg-black/60 text-white group-hover:flex" title="Remove">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Row>
            <Field label="Width %">
              <NumberInput value={settings.widthPct} step={1} min={2} max={80} suffix="%" onChange={(v) => patch({ widthPct: v })} />
            </Field>
            <Field label="Opacity">
              <NumberInput value={Math.round(settings.opacity * 100)} step={1} min={0} max={100} suffix="%" onChange={(v) => patch({ opacity: v / 100 })} />
            </Field>
          </Row>
          <Row>
            <Field label="Radius">
              <NumberInput value={settings.radius} step={1} min={0} max={200} suffix="px" onChange={(v) => patch({ radius: v })} />
            </Field>
            <Field label="Shadow">
              <Toggle label={settings.shadow ? "On" : "Off"} active={settings.shadow} onClick={() => patch({ shadow: !settings.shadow })} />
            </Field>
          </Row>
          <Field label="Position">
            <div className="flex flex-wrap gap-1">
              {POSITIONS.map((p) => (
                <Toggle key={p.id} label={p.label} active={settings.position === p.id} onClick={() => patch({ position: p.id })} />
              ))}
            </div>
          </Field>
          {settings.position === "custom" && (
            <Row>
              <Field label="X %"><NumberInput value={settings.xPct} step={1} min={0} max={100} suffix="%" onChange={(v) => patch({ xPct: v })} /></Field>
              <Field label="Y %"><NumberInput value={settings.yPct} step={1} min={0} max={100} suffix="%" onChange={(v) => patch({ yPct: v })} /></Field>
            </Row>
          )}
        </div>
      )}
      {open && !enabled && (
        <div className="rounded border border-dashed border-border bg-background/40 p-2 text-[10px] text-muted-foreground">
          Logo is disabled. Toggle Enabled above to configure and project it.
        </div>
      )}
    </div>
  );
}
