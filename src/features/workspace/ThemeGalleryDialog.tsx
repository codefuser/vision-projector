/**
 * Theme Gallery — full-screen browser for 200+ built-in + custom themes.
 *
 * Performance:
 *  • Thumbnails are lazy-mounted via IntersectionObserver — only visible
 *    cards render the live ProjectionTextStage preview. Off-screen cards
 *    show a lightweight color/gradient placeholder so 200+ themes stay
 *    smooth and avoid memory spikes.
 *  • Filter & search are pure in-memory ops over a tiny preset array
 *    (~200 plain objects, no runtime cost).
 *
 * Operator UX:
 *  • Sidebar: All / Favorites / Recents / Most Used / Custom / each category
 *  • Each card: live preview, name, category, ★ favourite toggle, ⧉ duplicate
 *  • Click → large 16:9 preview dialog with Apply / Cancel
 *  • "Save Current as Template" captures the current style as a custom theme
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Save, Check, X, Sparkles, Star, Copy, Search } from "lucide-react";
import { ProjectionTextStage } from "@/components/ProjectionTextStage";
import {
  DEFAULT_TAMIL_STYLE, DEFAULT_ENGLISH_STYLE, DEFAULT_REFERENCE_STYLE,
  DEFAULT_BACKGROUND, DEFAULT_TEXT_STYLE,
  type GroupedStyles, type LogoBroadcast, type TextOverlay,
} from "@/lib/broadcast";
import { TEMPLATE_PRESETS, TEMPLATE_CATEGORIES, type TemplatePreset, type TemplateCategory } from "@/lib/templates/presets";
import { useCustomTemplates } from "@/stores/custom-templates.store";
import { useThemeFavorites } from "@/stores/theme-favorites.store";
import { applyTemplate, activeTemplateId } from "@/lib/templates/apply";
import { useLogo } from "@/stores/logo.store";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Bucket = "All" | "Favorites" | "Recents" | "Most Used" | "Custom" | TemplateCategory;

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
  return {
    reference: { ...DEFAULT_REFERENCE_STYLE, ...baseText, ...(preset.perGroup?.reference ?? {}) },
    tamil: { ...DEFAULT_TAMIL_STYLE, ...baseText, ...(preset.perGroup?.tamil ?? {}) },
    english: { ...DEFAULT_ENGLISH_STYLE, ...baseText, ...(preset.perGroup?.english ?? {}) },
    background: {
      ...DEFAULT_BACKGROUND, ...preset.background,
      animation: preset.background.animation ?? "none",
      gradient: preset.background.gradient ?? null,
    },
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
  const duplicateCustom = useCustomTemplates((s) => s.duplicate);
  const logo = useLogo();

  const favorites = useThemeFavorites((s) => s.favorites);
  const recents = useThemeFavorites((s) => s.recents);
  const toggleFavorite = useThemeFavorites((s) => s.toggleFavorite);
  const mostUsedFn = useThemeFavorites((s) => s.mostUsed);

  const [bucket, setBucket] = useState<Bucket>("All");
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<TemplatePreset | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(activeTemplateId());
  const [saveOpen, setSaveOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const all = useMemo(() => [...custom, ...TEMPLATE_PRESETS], [custom]);
  const byId = useMemo(() => new Map(all.map((t) => [t.id, t])), [all]);
  const mostUsedIds = useMemo(() => mostUsedFn(12), [mostUsedFn, recents, favorites]);

  const bucketList = useMemo(() => {
    let list: TemplatePreset[];
    if (bucket === "All") list = all;
    else if (bucket === "Custom") list = custom;
    else if (bucket === "Favorites") list = favorites.map((id) => byId.get(id)).filter(Boolean) as TemplatePreset[];
    else if (bucket === "Recents") list = recents.map((id) => byId.get(id)).filter(Boolean) as TemplatePreset[];
    else if (bucket === "Most Used") list = mostUsedIds.map((id) => byId.get(id)).filter(Boolean) as TemplatePreset[];
    else list = all.filter((t) => t.category === bucket);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q),
    );
  }, [bucket, all, custom, favorites, recents, mostUsedIds, byId, query]);

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
    setBucket("Custom");
  };

  const sideButtons: Array<{ key: Bucket; label: string; count: number }> = [
    { key: "All", label: "All", count: all.length },
    { key: "Favorites", label: "★ Favorites", count: favorites.length },
    { key: "Recents", label: "Recents", count: recents.length },
    { key: "Most Used", label: "Most Used", count: mostUsedIds.length },
    { key: "Custom", label: "Custom", count: custom.length },
    ...TEMPLATE_CATEGORIES.map((c) => ({ key: c as Bucket, label: c, count: all.filter((t) => t.category === c).length })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[1320px] h-[90vh] flex flex-col gap-0 p-0">
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
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search themes…"
                  className="h-8 w-56 pl-7 text-xs"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)}>
                <Save className="h-3.5 w-3.5" /> Save Current as Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="w-48 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-2 text-[12px]">
            {sideButtons.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setBucket(key)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition",
                  bucket === key ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <span className="truncate">{label}</span>
                <span className={cn("ml-1 rounded px-1 text-[10px]", bucket === key ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>{count}</span>
              </button>
            ))}
          </aside>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {bucketList.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                {bucket === "Custom" ? "No saved themes yet. Use “Save Current as Template”."
                  : bucket === "Favorites" ? "No favourite themes yet. Tap ★ on any theme."
                  : bucket === "Recents" ? "No recently applied themes yet."
                  : bucket === "Most Used" ? "No usage data yet."
                  : "No themes match this filter."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bucketList.map((preset) => (
                  <ThumbCard
                    key={preset.id}
                    preset={preset}
                    isActive={appliedId === preset.id}
                    isCustom={preset.id.startsWith("custom-")}
                    isFavorite={favorites.includes(preset.id)}
                    onClick={() => setPreviewing(preset)}
                    onToggleFavorite={() => toggleFavorite(preset.id)}
                    onDuplicate={() => duplicateCustom(preset)}
                    onDelete={() => { removeCustom(preset.id); if (appliedId === preset.id) setAppliedId(null); }}
                    logoBase={logo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Large preview */}
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
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => duplicateCustom(previewing)}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate as Custom
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setPreviewing(null)}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button onClick={() => onApply(previewing)}>
                      <Check className="h-3.5 w-3.5" /> Apply Theme
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Save as custom */}
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
  preset, isActive, isCustom, isFavorite, onClick, onToggleFavorite, onDuplicate, onDelete, logoBase,
}: {
  preset: TemplatePreset;
  isActive: boolean;
  isCustom: boolean;
  isFavorite: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  logoBase: ReturnType<typeof useLogo.getState>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setVisible(true); io.disconnect(); break; }
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const groups = useMemo(() => (visible ? presetToGroups(preset) : null), [visible, preset]);
  const logo = useMemo(() => (visible ? presetToLogo(preset, logoBase) : null), [visible, preset, logoBase]);
  const placeholderBg = preset.background.gradient ?? preset.background.color ?? "#000";

  return (
    <div
      ref={ref}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition",
        isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60",
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "240px 180px" } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="relative" style={{ aspectRatio: "16 / 9" }}>

        {visible && groups && logo ? (
          <ProjectionTextStage
            overlay={SAMPLE_OVERLAY}
            textStyle={DEFAULT_TEXT_STYLE}
            groupedStyles={groups}
            logo={logo}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: placeholderBg }} />
        )}

        {isActive && (
          <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
            <Check className="h-2.5 w-2.5" /> Active
          </span>
        )}

        {/* Top-left actions */}
        <div className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            title={isFavorite ? "Remove from favourites" : "Add to favourites"}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 transition hover:bg-black/80",
              isFavorite ? "text-yellow-300 opacity-100" : "text-white opacity-0 group-hover:opacity-100",
            )}
          >
            <Star className={cn("h-3 w-3", isFavorite && "fill-current")} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicate as custom theme"
            className="inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
          >
            <Copy className="h-3 w-3" />
          </button>
          {isCustom && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete custom theme"
              className="inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
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
