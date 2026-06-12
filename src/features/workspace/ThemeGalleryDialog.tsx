/**
 * Theme Gallery — full-screen dialog showing every built-in and custom
 * template as a live mini preview card. Each thumbnail renders the actual
 * background, sample Tamil + English lyrics, reference label, and logo
 * exactly as it will appear on the projector — operators understand the
 * theme at a glance before applying.
 *
 * Workflow: browse → click → large preview with Apply / Cancel.
 * Custom themes can be saved from the operator's current style and deleted
 * from the gallery. Applying a theme updates Reference / Tamil / English
 * groups + background + logo globally, so Bible / Songs / Text all change
 * with one click.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Save, Check, X, Sparkles } from "lucide-react";
import { ProjectionTextStage } from "@/components/ProjectionTextStage";
import {
  DEFAULT_GROUPED_STYLES, DEFAULT_TAMIL_STYLE, DEFAULT_ENGLISH_STYLE,
  DEFAULT_REFERENCE_STYLE, DEFAULT_BACKGROUND, DEFAULT_TEXT_STYLE,
  type GroupedStyles, type LogoBroadcast, type TextOverlay,
} from "@/lib/broadcast";
import { TEMPLATE_PRESETS, TEMPLATE_CATEGORIES, type TemplatePreset, type TemplateCategory } from "@/lib/templates/presets";
import { useCustomTemplates } from "@/stores/custom-templates.store";
import { applyTemplate, activeTemplateId } from "@/lib/templates/apply";
import { useLogo } from "@/stores/logo.store";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const SAMPLE_OVERLAY: TextOverlay = {
  reference: "சங்கீதம் 23:1",
  text: "கர்த்தர் என் மேய்ப்பராயிருக்கிறார்",
  subtext: "The Lord is my shepherd",
  translation: "தமிழ்",
  subtranslation: "ENG",
  kind: "song_slide",
};

function presetToGroups(preset: TemplatePreset): GroupedStyles {
  const baseText = preset.text ?? {};
  const refMerged = { ...DEFAULT_REFERENCE_STYLE, ...baseText, ...(preset.perGroup?.reference ?? {}) };
  const taMerged = { ...DEFAULT_TAMIL_STYLE, ...baseText, ...(preset.perGroup?.tamil ?? {}) };
  const enMerged = { ...DEFAULT_ENGLISH_STYLE, ...baseText, ...(preset.perGroup?.english ?? {}) };
  return {
    reference: refMerged,
    tamil: taMerged,
    english: enMerged,
    background: { ...DEFAULT_BACKGROUND, ...preset.background, animation: preset.background.animation ?? "none", gradient: preset.background.gradient ?? null },
  };
}

function presetToLogo(preset: TemplatePreset, fallback: ReturnType<typeof useLogo.getState>): LogoBroadcast {
  if (preset.logo) {
    return {
      enabled: preset.logo.enabled,
      current: fallback.current,
      settings: { ...fallback.settings, ...(preset.logo.settings ?? {}) },
    };
  }
  return { enabled: false, current: fallback.current, settings: fallback.settings };
}

export function ThemeGalleryDialog({ open, onOpenChange }: Props) {
  const custom = useCustomTemplates((s) => s.templates);
  const removeCustom = useCustomTemplates((s) => s.remove);
  const saveCurrent = useCustomTemplates((s) => s.saveCurrent);
  const logo = useLogo();
  const [activeCat, setActiveCat] = useState<TemplateCategory | "All" | "Custom">("All");
  const [previewing, setPreviewing] = useState<TemplatePreset | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(activeTemplateId());
  const [saveOpen, setSaveOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const all = useMemo(() => [...custom, ...TEMPLATE_PRESETS], [custom]);
  const filtered = useMemo(() => {
    if (activeCat === "All") return all;
    if (activeCat === "Custom") return custom;
    return all.filter((t) => t.category === activeCat);
  }, [all, custom, activeCat]);

  const onApply = (preset: TemplatePreset) => {
    applyTemplate(preset.id);
    setAppliedId(preset.id);
    setPreviewing(null);
    onOpenChange(false);
  };

  const onSave = () => {
    if (!newName.trim()) return;
    saveCurrent(newName.trim());
    setNewName("");
    setSaveOpen(false);
    setActiveCat("Custom");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1280px] h-[88vh] flex flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Theme Gallery
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {TEMPLATE_PRESETS.length + custom.length} themes
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)}>
                <Save className="h-3.5 w-3.5" /> Save Current as Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Category sidebar */}
          <aside className="w-44 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-2 text-[12px]">
            {(["All", "Custom", ...TEMPLATE_CATEGORIES] as const).map((cat) => {
              const count = cat === "All" ? all.length
                : cat === "Custom" ? custom.length
                : all.filter((t) => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition",
                    activeCat === cat ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  <span className="truncate">{cat}</span>
                  <span className={cn("ml-1 rounded px-1 text-[10px]", activeCat === cat ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>{count}</span>
                </button>
              );
            })}
          </aside>

          {/* Thumbnail grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                {activeCat === "Custom" ? "No saved themes yet. Use “Save Current as Template”." : "No themes in this category."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((preset) => (
                  <ThumbCard
                    key={preset.id}
                    preset={preset}
                    isActive={appliedId === preset.id}
                    isCustom={preset.id.startsWith("custom-")}
                    onClick={() => setPreviewing(preset)}
                    onDelete={() => { removeCustom(preset.id); if (appliedId === preset.id) setAppliedId(null); }}
                    logoBase={logo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview dialog */}
        <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
          <DialogContent className="!max-w-[1100px] gap-3 p-4">
            {previewing && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base">{previewing.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{previewing.description}</p>
                </DialogHeader>
                <div className="overflow-hidden rounded-lg border border-border bg-black" style={{ aspectRatio: "16 / 9" }}>
                  <ProjectionTextStage
                    overlay={SAMPLE_OVERLAY}
                    textStyle={DEFAULT_TEXT_STYLE}
                    groupedStyles={presetToGroups(previewing)}
                    logo={presetToLogo(previewing, logo)}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setPreviewing(null)}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                  <Button onClick={() => onApply(previewing)}>
                    <Check className="h-3.5 w-3.5" /> Apply Theme
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Save current dialog */}
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent className="!max-w-md gap-3">
            <DialogHeader>
              <DialogTitle className="text-base">Save current style as template</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Theme name (e.g. Sunday Worship)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSave(); }}
            />
            <p className="text-[11px] text-muted-foreground">
              Captures current Reference / Tamil / English styles, background, animation and logo settings.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button onClick={onSave} disabled={!newName.trim()}><Save className="h-3.5 w-3.5" /> Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function ThumbCard({
  preset, isActive, isCustom, onClick, onDelete, logoBase,
}: {
  preset: TemplatePreset;
  isActive: boolean;
  isCustom: boolean;
  onClick: () => void;
  onDelete: () => void;
  logoBase: ReturnType<typeof useLogo.getState>;
}) {
  const groups = useMemo(() => presetToGroups(preset), [preset]);
  const logo = useMemo(() => presetToLogo(preset, logoBase), [preset, logoBase]);

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition",
        isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60",
      )}
      onClick={onClick}
    >
      <div className="relative" style={{ aspectRatio: "16 / 9" }}>
        <ProjectionTextStage
          overlay={SAMPLE_OVERLAY}
          textStyle={DEFAULT_TEXT_STYLE}
          groupedStyles={groups}
          logo={logo}
        />
        {isActive && (
          <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
            <Check className="h-2.5 w-2.5" /> Active
          </span>
        )}
        {isCustom && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete custom theme"
            className="absolute left-1.5 top-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="border-t border-border p-2">
        <div className="flex items-center justify-between gap-1">
          <div className="truncate text-[12px] font-semibold">{preset.name}</div>
          <span className="shrink-0 rounded bg-muted px-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            {isCustom ? "Custom" : preset.category}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{preset.description}</div>
      </div>
    </div>
  );
}
