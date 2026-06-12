/**
 * Text Panel — three-pane workspace:
 *   Left:   list of saved text items (favorites, recents, all)
 *   Center: title + content editor (auto-saves on blur / debounce)
 *   Right:  live slide preview generated from blank-line splitting
 *
 * Uses the same projection pipeline as Bible/Songs so theming, fonts,
 * background and animation render identically on the projector.
 */
import { useEffect, useMemo, useState } from "react";
import { Type, Plus, Star, Trash2, Copy, Send, Search, FileText, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTextItems, splitTextSlides, type TextItem } from "@/stores/text-items.store";
import { projectTextSlide } from "@/projection/adapters/text.adapter";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TextFilter = "all" | "favorites" | "recent";
const FILTER_LABELS: Record<TextFilter, string> = {
  all: "All Texts",
  favorites: "Favorites",
  recent: "Recently Used",
};

const STARTER_SAMPLES = [
  { title: "Welcome", content: "Welcome to our service\n\nMay God bless you abundantly" },
  { title: "Prayer Points", content: "Pray for the sick\n\nPray for the nation\n\nPray for revival" },
];

export function TextPanel() {
  const items = useTextItems((s) => s.items);
  const recents = useTextItems((s) => s.recents);
  const create = useTextItems((s) => s.create);
  const update = useTextItems((s) => s.update);
  const remove = useTextItems((s) => s.remove);
  const duplicate = useTextItems((s) => s.duplicate);
  const toggleFavorite = useTextItems((s) => s.toggleFavorite);
  const pushRecent = useTextItems((s) => s.pushRecent);
  const projectedText = useProjection((s) => s.state?.textOverlay?.text ?? null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TextFilter>("all");
  const [activeSlide, setActiveSlide] = useState(0);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  // Sync editor drafts when the selection changes.
  useEffect(() => {
    if (selected) {
      setDraftTitle(selected.title);
      setDraftContent(selected.content);
      setActiveSlide(0);
    } else {
      setDraftTitle("");
      setDraftContent("");
    }
  }, [selectedId]);

  // Debounced autosave.
  useEffect(() => {
    if (!selected) return;
    if (draftTitle === selected.title && draftContent === selected.content) return;
    const t = setTimeout(() => {
      update(selected.id, { title: draftTitle.trim() || "Untitled", content: draftContent });
    }, 400);
    return () => clearTimeout(t);
  }, [draftTitle, draftContent, selected, update]);

  const visible = useMemo(() => {
    const recentIds = new Set(recents.map((r) => r.itemId));
    let list = items;
    if (filter === "favorites") list = list.filter((it) => it.favorite);
    else if (filter === "recent") list = list.filter((it) => recentIds.has(it.id));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(q) || it.content.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, recents, filter, query]);

  const slides = useMemo(() => splitTextSlides(draftContent), [draftContent]);

  const handleNew = () => {
    const id = create({ title: "Untitled", content: "" });
    setSelectedId(id);
  };
  const handleStarter = (sample: { title: string; content: string }) => {
    const id = create(sample);
    setSelectedId(id);
  };
  const handleDuplicate = () => {
    if (!selected) return;
    const id = duplicate(selected.id);
    if (id) setSelectedId(id);
  };
  const handleDelete = (it: TextItem) => {
    if (!confirm(`Delete "${it.title}"?`)) return;
    remove(it.id);
    if (selectedId === it.id) setSelectedId(null);
  };
  const project = (i: number) => {
    if (!selected) return;
    const text = slides[i];
    if (!text) return;
    projectTextSlide({
      itemId: selected.id,
      slideIndex: i,
      totalSlides: slides.length,
      title: selected.title,
      text,
    });
    setActiveSlide(i);
    pushRecent(selected.id, i);
    toast.success(`${selected.title} · slide ${i + 1}`);
  };

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/20 px-2 py-1.5">
        <Type className="h-4 w-4 shrink-0 text-primary" />
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text items…"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Filter"
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2 text-xs font-medium transition hover:bg-accent",
                filter !== "all" && "border-primary/50 bg-primary/10 text-primary",
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden @sm:inline">{FILTER_LABELS[filter]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Filters
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["all", "favorites", "recent"] as TextFilter[]).map((f) => (
              <DropdownMenuItem
                key={f}
                onClick={() => setFilter(f)}
                className={cn("text-xs", filter === f && "bg-accent font-semibold text-primary")}
              >
                {FILTER_LABELS[f]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={handleNew}
          title="New text"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 @lg:grid-cols-[minmax(220px,1fr)_minmax(280px,1.4fr)_minmax(260px,1.2fr)]">
          {/* LEFT — list */}
          <div className="min-h-0 overflow-y-auto border-r border-border">
            {visible.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
                <FileText className="h-7 w-7 opacity-40" />
                <div className="text-foreground/70">No text items yet.</div>
                <div>Create one or start from a sample:</div>
                <div className="flex flex-col gap-1 pt-1">
                  {STARTER_SAMPLES.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => handleStarter(s)}
                      className="cursor-pointer rounded border border-dashed border-border px-2 py-1 text-[11px] text-foreground/80 hover:bg-accent"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {visible.map((it) => {
                  const isSel = selectedId === it.id;
                  const slidesCount = splitTextSlides(it.content).length || 1;
                  return (
                    <li
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "group cursor-pointer px-3 py-2 transition hover:bg-accent/60",
                        isSel ? "bg-primary/10 border-l-[3px] border-l-primary pl-[9px]"
                          : "border-l-[3px] border-l-transparent",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn("truncate text-[13px] font-semibold", isSel ? "text-primary" : "text-foreground")}>
                          {it.title}
                        </span>
                        {it.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {it.content.split("\n").find((l) => l.trim()) ?? "Empty"}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{slidesCount} slide{slidesCount === 1 ? "" : "s"}</span>
                        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(it.id); }}
                            title={it.favorite ? "Unfavorite" : "Favorite"}
                            className={cn("inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded", it.favorite ? "text-amber-500" : "text-muted-foreground hover:bg-accent")}
                          >
                            <Star className={cn("h-3 w-3", it.favorite && "fill-current")} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); const id = duplicate(it.id); if (id) setSelectedId(id); }}
                            title="Duplicate"
                            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(it); }}
                            title="Delete"
                            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* CENTER — editor */}
          <div className="flex h-full min-h-0 flex-col border-r border-border">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Type className="h-8 w-8 opacity-40" />
                <div className="text-sm font-medium text-foreground/70">No text selected</div>
                <div className="text-xs">Select an item on the left or create a new one.</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-2 py-1.5">
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Title"
                    className="h-8 flex-1 text-sm font-semibold"
                  />
                  <button
                    onClick={handleDuplicate}
                    title="Duplicate"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(selected.id)}
                    title={selected.favorite ? "Unfavorite" : "Favorite"}
                    className={cn(
                      "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md",
                      selected.favorite ? "text-amber-500" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Star className={cn("h-3.5 w-3.5", selected.favorite && "fill-current")} />
                  </button>
                </div>
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder={"Type or paste content…\n\nSeparate slides with a blank line."}
                  className="flex-1 resize-none rounded-none border-0 font-sans text-[14px] leading-relaxed focus-visible:ring-0"
                />
                <div className="border-t border-border bg-muted/10 px-2 py-1 text-[10px] text-muted-foreground">
                  {slides.length} slide{slides.length === 1 ? "" : "s"} · blank line = new slide
                </div>
              </>
            )}
          </div>

          {/* RIGHT — slide preview */}
          <div className="flex h-full min-h-0 flex-col">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 opacity-40" />
                <div className="text-sm font-medium text-foreground/70">No slides yet</div>
                <div className="text-xs">Slide previews appear here.</div>
              </div>
            ) : slides.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 opacity-40" />
                <div className="text-xs">Start typing to generate slides.</div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
                <div className="grid grid-cols-1 gap-3">
                  {slides.map((s, i) => {
                    const isActive = activeSlide === i;
                    const isProjected = !!projectedText && projectedText.startsWith(s.slice(0, 24));
                    const lineCount = s.split("\n").length;
                    return (
                      <div
                        key={i}
                        onClick={() => { setActiveSlide(i); project(i); }}
                        className={cn(
                          "group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-card/80 transition-all",
                          "hover:-translate-y-px hover:border-primary/70 hover:shadow-md",
                          isProjected ? "border-primary ring-2 ring-primary/40"
                            : isActive ? "border-primary/60" : "border-border",
                        )}
                      >
                        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          <span>Slide {i + 1}</span>
                          <span className="text-muted-foreground/60">· {lineCount} line{lineCount === 1 ? "" : "s"}</span>
                          {isProjected && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-1.5 py-px text-[9px] text-primary-foreground">
                              <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Live
                            </span>
                          )}
                        </div>
                        <pre className="flex-1 whitespace-pre-wrap break-words px-3 py-2.5 font-sans text-[14px] leading-relaxed">
                          {s}
                        </pre>
                        <div className="flex items-center justify-end border-t border-border/40 bg-muted/20 px-2 py-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); project(i); }}
                            className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                          >
                            <Send className="h-3 w-3" /> Project
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
