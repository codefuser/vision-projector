/**
 * Compact strip surfacing a few popular templates + a "Browse Gallery"
 * launcher and "Save current as template" shortcut. The full visual
 * gallery (with 50+ themes, live thumbnails, categories, large preview
 * and custom themes) lives in <ThemeGalleryDialog />.
 */
import { useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check, LayoutGrid, Save } from "lucide-react";
import { TEMPLATE_PRESETS } from "@/lib/templates/presets";
import { applyTemplate, activeTemplateId } from "@/lib/templates/apply";
import { useCustomTemplates } from "@/stores/custom-templates.store";
import { ThemeGalleryDialog } from "./ThemeGalleryDialog";
import { cn } from "@/lib/utils";

const QUICK_IDS = [
  "cw-navy", "mw-indigo", "pr-candle", "ys-violet",
  "bs-scholar", "rv-glory", "an-clouds", "mn-dark",
];

export function TemplatesStrip() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<string | null>(activeTemplateId());
  const [galleryOpen, setGalleryOpen] = useState(false);
  const saveCurrent = useCustomTemplates((s) => s.saveCurrent);
  const customCount = useCustomTemplates((s) => s.templates.length);

  const quick = useMemo(
    () => QUICK_IDS.map((id) => TEMPLATE_PRESETS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t),
    [],
  );

  const onSaveQuick = () => {
    const name = window.prompt("Theme name:", "My Theme");
    if (!name || !name.trim()) return;
    saveCurrent(name.trim());
  };

  return (
    <div className="border-b border-border bg-muted/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/40"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Themes</span>
        <span className="ml-1 rounded bg-muted px-1 text-[9px] normal-case tracking-normal">
          {TEMPLATE_PRESETS.length}{customCount > 0 ? ` +${customCount}` : ""}
        </span>
        {active && (
          <span className="ml-2 truncate text-[10px] font-medium normal-case tracking-normal text-primary">
            {TEMPLATE_PRESETS.find((t) => t.id === active)?.name ?? "Custom"}
          </span>
        )}
        <span className="ml-auto">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 px-3 pb-2.5 pt-1">
          <div className="flex gap-2 overflow-x-auto">
            {quick.map((t) => {
              const isActive = active === t.id;
              const bgStyle: React.CSSProperties = {
                background: t.background.gradient ?? t.background.color ?? "#000",
              };
              const textColor = t.text.color ?? "#ffffff";
              return (
                <button
                  key={t.id}
                  onClick={() => { applyTemplate(t.id); setActive(t.id); }}
                  title={`${t.name} — ${t.description}`}
                  className={cn(
                    "group relative flex w-[112px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-md border text-left transition",
                    isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60",
                  )}
                >
                  <div className="relative flex h-12 items-center justify-center" style={bgStyle}>
                    {t.background.animation && t.background.animation !== "none" && (
                      <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-anim-${t.background.animation}`} />
                    )}
                    <span
                      className="relative z-10 text-[18px] font-bold leading-none"
                      style={{ color: textColor, fontFamily: t.text.fontFamily, textShadow: t.text.shadow ? "0 1px 3px rgba(0,0,0,.6)" : undefined }}
                    >
                      Aa
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-card px-1.5 py-1 text-[10px] font-medium">
                    <span className="truncate">{t.name}</span>
                    {isActive && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setGalleryOpen(true)}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/15"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Browse All Themes
            </button>
            <button
              onClick={onSaveQuick}
              title="Save current style as a custom template"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] hover:bg-accent"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      )}
      <ThemeGalleryDialog open={galleryOpen} onOpenChange={(v) => { setGalleryOpen(v); if (!v) setActive(activeTemplateId()); }} />
    </div>
  );
}
