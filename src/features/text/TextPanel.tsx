/**
 * Text Panel — three-pane workspace:
 *   Left:   list of saved text items (favorites, recents, all)
 *   Center: title + editor with Tanglish smart typing + suggestion dropdown
 *   Right:  live slide preview generated from blank-line splitting
 *
 * Phase A upgrade adds: church-dictionary suggestion dropdown while typing
 * Tanglish, a quick-insert side strip of common worship words, an autosave
 * indicator, and project shortcuts (Ctrl+Enter / Ctrl+Shift+Enter / Ctrl+D /
 * Ctrl+Alt+N).
 *
 * Uses the same projection pipeline as Bible/Songs so theming, fonts,
 * background and animation render identically on the projector.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Type, Plus, Star, Trash2, Copy, Send, Search, FileText, Filter, Languages,
  Sparkles, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTextItems, splitTextSlides, type TextItem } from "@/stores/text-items.store";
import { projectTextSlide } from "@/projection/adapters/text.adapter";
import { useProjection } from "@/stores/projection.store";
import { convertCompleted, suggestTanglish, type Suggestion } from "@/lib/text/tanglish";
import { QUICK_INSERT_WORDS } from "@/lib/text/church-dictionary";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TextFilter = "all" | "favorites" | "recent";
const FILTER_LABELS: Record<TextFilter, string> = {
  all: "All Texts",
  favorites: "Favorites",
  recent: "Recently Used",
};

type TypingMode = "english" | "tamil" | "tanglish";
const MODE_LABELS: Record<TypingMode, string> = {
  english: "English",
  tamil: "Tamil",
  tanglish: "Tanglish → தமிழ்",
};
const MODE_SHORT: Record<TypingMode, string> = {
  english: "EN",
  tamil: "தமிழ்",
  tanglish: "Tang→த",
};

const BOUNDARY_RE = /[\s.,;:!?()[\]{}"'\u0964\u0965/\\-]/;

function readingTime(words: number): string {
  if (words === 0) return "0 sec";
  const sec = Math.round((words / 150) * 60);
  if (sec < 60) return `${sec} sec`;
  const min = Math.round(sec / 60);
  return `${min} min`;
}
function countWords(text: string): number {
  const matches = text.match(/[A-Za-z\u0B80-\u0BFF']+/g);
  return matches ? matches.length : 0;
}
function formatAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

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
  const [typingMode, setTypingMode] = useState<TypingMode>("english");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [savingPending, setSavingPending] = useState(false);
  const [, forceTick] = useState(0); // re-render for "saved 5s ago"
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Suggestion state ───────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [currentWord, setCurrentWord] = useState<{ start: number; end: number; text: string } | null>(null);

  /** Find the in-flight Roman word at the caret (no trailing boundary char). */
  const updateSuggestionsFor = (value: string, caret: number) => {
    if (typingMode !== "tanglish") {
      setSuggestions([]);
      setCurrentWord(null);
      return;
    }
    // Walk backwards from caret to find the start of the word.
    let start = caret;
    while (start > 0 && /[A-Za-z']/.test(value.charAt(start - 1))) start--;
    const wordText = value.slice(start, caret);
    if (wordText.length < 2 || !/^[A-Za-z]/.test(wordText)) {
      setSuggestions([]);
      setCurrentWord(null);
      return;
    }
    const sugg = suggestTanglish(wordText, 6);
    setSuggestions(sugg);
    setActiveSuggestion(0);
    setCurrentWord({ start, end: caret, text: wordText });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const caret = e.target.selectionStart ?? next.length;
    setSavingPending(true);

    if (typingMode !== "tanglish") {
      setDraftContent(next);
      return;
    }
    const tailFromCaret = next.length - caret;
    const justTypedBoundary =
      caret > 0 && BOUNDARY_RE.test(next.charAt(caret - 1)) &&
      next.length >= draftContent.length;
    if (!justTypedBoundary) {
      setDraftContent(next);
      // Defer suggestion compute to next frame so the textarea is updated.
      requestAnimationFrame(() => updateSuggestionsFor(next, caret));
      return;
    }
    // Convert completed word behind caret.
    const head = next.slice(0, caret);
    const tail = next.slice(caret);
    const { converted, trailing } = convertCompleted(head);
    const newHead = converted + trailing;
    const newValue = newHead + tail;
    setDraftContent(newValue);
    setSuggestions([]);
    setCurrentWord(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = newValue.length - tailFromCaret;
      el.setSelectionRange(pos, pos);
    });
  };

  /** Replace the current in-flight word with a Tamil candidate. */
  const acceptSuggestion = (s: Suggestion) => {
    if (!currentWord) return;
    const el = textareaRef.current;
    const value = draftContent;
    const before = value.slice(0, currentWord.start);
    const after = value.slice(currentWord.end);
    const newValue = before + s.tamil + after;
    setDraftContent(newValue);
    setSuggestions([]);
    setCurrentWord(null);
    setSavingPending(true);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = (before + s.tamil).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  /** Insert arbitrary text at caret (quick-insert side panel). */
  const insertAtCaret = (text: string) => {
    const el = textareaRef.current;
    const value = draftContent;
    const caret = el?.selectionStart ?? value.length;
    const newValue = value.slice(0, caret) + text + value.slice(caret);
    setDraftContent(newValue);
    setSavingPending(true);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = caret + text.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        acceptSuggestion(suggestions[activeSuggestion]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions([]);
        setCurrentWord(null);
        return;
      }
    }
  };

  // Live counters
  const counters = useMemo(() => {
    const text = draftContent;
    const chars = text.length;
    const words = countWords(text);
    const lines = text === "" ? 0 : text.split("\n").length;
    return { chars, words, lines, reading: readingTime(words) };
  }, [draftContent]);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  // Sync editor drafts when selection changes.
  useEffect(() => {
    if (selected) {
      setDraftTitle(selected.title);
      setDraftContent(selected.content);
      setActiveSlide(0);
      setSavedAt(selected.updatedAt);
      setSavingPending(false);
      setSuggestions([]);
      setCurrentWord(null);
    } else {
      setDraftTitle("");
      setDraftContent("");
      setSavedAt(null);
      setSavingPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Debounced autosave (2 s idle per spec).
  useEffect(() => {
    if (!selected) return;
    if (draftTitle === selected.title && draftContent === selected.content) {
      setSavingPending(false);
      return;
    }
    const t = setTimeout(() => {
      update(selected.id, { title: draftTitle.trim() || "Untitled", content: draftContent });
      setSavedAt(Date.now());
      setSavingPending(false);
    }, 2000);
    return () => clearTimeout(t);
  }, [draftTitle, draftContent, selected, update]);

  // Refresh "saved Ns ago" label every 15s.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

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
  const projectAll = async () => {
    if (!selected || slides.length === 0) return;
    for (let i = 0; i < slides.length; i++) {
      project(i);
      // Brief delay so each LOAD_TEXT settles in the projector channel.
      await new Promise((r) => setTimeout(r, 80));
    }
    toast.success(`Queued ${slides.length} slides`);
  };
  const insertSlideBreak = () => {
    const el = textareaRef.current;
    const value = draftContent;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    // Ensure surrounding blank line.
    const sep =
      (before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n") +
      (after.startsWith("\n") ? "" : "\n");
    const newValue = before + sep + after;
    setDraftContent(newValue);
    setSavingPending(true);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = before.length + sep.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  // ── Shortcuts ────────────────────────────────────────────────────────
  useShortcut({
    id: "text.project-current",
    label: "Project current text slide",
    category: "text",
    keys: ["Ctrl+Enter", "Meta+Enter"],
    scope: "workspace",
    allowInInput: true,
    handler: () => { if (selected && slides.length) project(activeSlide); },
  });
  useShortcut({
    id: "text.project-all",
    label: "Project all text slides in sequence",
    category: "text",
    keys: ["Ctrl+Shift+Enter", "Meta+Shift+Enter"],
    scope: "workspace",
    allowInInput: true,
    handler: () => { void projectAll(); },
  });
  useShortcut({
    id: "text.duplicate",
    label: "Duplicate current text item",
    category: "text",
    keys: ["Ctrl+D", "Meta+D"],
    scope: "workspace",
    allowInInput: true,
    handler: () => { if (selected) handleDuplicate(); },
  });
  useShortcut({
    id: "text.new-slide-break",
    label: "Insert new slide break at caret",
    category: "text",
    keys: ["Ctrl+Alt+N", "Meta+Alt+N"],
    scope: "workspace",
    allowInInput: true,
    handler: () => { if (selected) insertSlideBreak(); },
  });

  const saveLabel = !selected
    ? null
    : savingPending
      ? "Saving…"
      : savedAt
        ? `Saved · ${formatAgo(savedAt)}`
        : "Saved";

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
                    onChange={(e) => { setDraftTitle(e.target.value); setSavingPending(true); }}
                    placeholder="Title"
                    className="h-8 flex-1 text-sm font-semibold"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        title={`Typing mode: ${MODE_LABELS[typingMode]}`}
                        className={cn(
                          "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2 text-[11px] font-semibold transition hover:bg-accent",
                          typingMode === "tanglish" && "border-primary/60 bg-primary/10 text-primary",
                        )}
                      >
                        <Languages className="h-3.5 w-3.5" />
                        <span>{MODE_SHORT[typingMode]}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Typing mode
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(["english", "tamil", "tanglish"] as TypingMode[]).map((m) => (
                        <DropdownMenuItem
                          key={m}
                          onClick={() => { setTypingMode(m); setSuggestions([]); }}
                          className={cn("text-xs", typingMode === m && "bg-accent font-semibold text-primary")}
                        >
                          {MODE_LABELS[m]}
                          {m === "tanglish" && (
                            <span className="ml-auto text-[10px] text-muted-foreground">auto-convert</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={handleDuplicate}
                    title="Duplicate (Ctrl+D)"
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

                {/* Editor body + suggestion dropdown */}
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <Textarea
                    ref={textareaRef}
                    value={draftContent}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(() => setSuggestions([]), 120)}
                    placeholder={
                      typingMode === "tanglish"
                        ? "Type Tanglish — e.g. yesu, karthar, jebam.\nSuggestions appear; press Tab/Enter to accept.\n\nBlank line = new slide."
                        : "Type or paste content…\n\nSeparate slides with a blank line."
                    }
                    className={cn(
                      "flex-1 resize-none rounded-none border-0 font-sans text-[14px] leading-relaxed focus-visible:ring-0",
                      typingMode === "tamil" && "text-[15px]",
                    )}
                    lang={typingMode === "english" ? "en" : "ta"}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 z-20 max-h-[200px] overflow-y-auto rounded-lg border border-border bg-popover/95 p-1 shadow-xl backdrop-blur">
                      <div className="mb-1 flex items-center gap-1.5 px-2 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Suggestions for
                        <code className="rounded bg-muted px-1 font-mono text-[10px] text-foreground/80">
                          {currentWord?.text}
                        </code>
                        <span className="ml-auto opacity-60">Tab / ↵ to accept · Esc to dismiss</span>
                      </div>
                      <ul className="flex flex-col">
                        {suggestions.map((s, i) => (
                          <li key={`${s.tamil}-${i}`}>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); acceptSuggestion(s); }}
                              onMouseEnter={() => setActiveSuggestion(i)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition",
                                i === activeSuggestion ? "bg-primary/15" : "hover:bg-accent",
                              )}
                            >
                              <span className="text-[15px] font-medium text-foreground">{s.tamil}</span>
                              <span className="text-[10px] text-muted-foreground">{s.key}</span>
                              {s.score === 0 && (
                                <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-primary">
                                  <Check className="h-3 w-3" /> exact
                                </span>
                              )}
                              {s.score > 0 && s.score <= 1 && (
                                <span className="ml-auto text-[10px] text-muted-foreground">prefix</span>
                              )}
                              {s.score > 1 && (
                                <span className="ml-auto text-[10px] text-amber-500">fuzzy</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quick-insert strip */}
                <div className="border-t border-border bg-muted/10 px-2 py-1.5">
                  <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" /> Quick insert
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_INSERT_WORDS.map((w) => (
                      <button
                        key={w.tamil}
                        onClick={() => insertAtCaret(w.tamil)}
                        title={w.label}
                        className="inline-flex cursor-pointer items-center rounded-md border border-border bg-card px-2 py-0.5 text-[13px] text-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                      >
                        {w.tamil}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border bg-muted/10 px-2 py-1 text-[10px] text-muted-foreground">
                  <span><b className="text-foreground/80">{counters.chars}</b> chars</span>
                  <span><b className="text-foreground/80">{counters.words}</b> words</span>
                  <span><b className="text-foreground/80">{counters.lines}</b> lines</span>
                  <span><b className="text-foreground/80">{slides.length}</b> slide{slides.length === 1 ? "" : "s"}</span>
                  <span>~{counters.reading} read</span>
                  {saveLabel && (
                    <span className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded px-1.5 py-px",
                      savingPending ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-600",
                    )}>
                      {!savingPending && <Check className="h-3 w-3" />}
                      {saveLabel}
                    </span>
                  )}
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
