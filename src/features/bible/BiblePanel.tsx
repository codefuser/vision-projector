import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Star, Send, Languages, Search, Hash } from "lucide-react";
import { useBibleStore, type DisplayMode } from "@/lib/bible/store";
import { getBible, type BibleLang } from "@/lib/bible/loader";
import { search, parseReference, getChapterVerses, type VerseHit } from "@/lib/bible/search";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { projectVerse } from "@/projection/adapters/bible.adapter";
import { Input } from "@/components/ui/input";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SearchMode = "reference" | "verse";

interface DisplayHit {
  hit: VerseHit;
  /** Tamil counterpart when displayMode === "both". */
  pair?: VerseHit;
}

function favKey(book: number, chapter: number, verse: number) {
  return `${book}:${chapter}:${verse}`;
}

export function BiblePanel() {
  const {
    lang, displayMode, query, loading, loaded, error, favorites,
    setLang, setDisplayMode, setQuery, ensureLoaded, ensureBoth,
    addFavorite, removeFavorite,
  } = useBibleStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<DisplayHit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const [chapterCtx, setChapterCtx] = useState<{ book: number; chapter: number } | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("reference");
  const projectedRef = useProjection((s) => s.state?.textOverlay?.reference ?? null);
  // Stable id of the selected verse — survives language / mode switches.
  const selectedKeyRef = useRef<string | null>(null);
  const lastQueryRef = useRef<string>("");

  // Load required databases for current mode.
  useEffect(() => {
    if (displayMode === "both") void ensureBoth();
    else void ensureLoaded(displayMode);
  }, [displayMode, ensureBoth, ensureLoaded]);

  // Auto-detect mode from query content (when user types a clear reference, jump to ref mode).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    if (searchMode === "verse") return;
    const ref = parseReference(q);
    if (ref && ref.chapter != null) setSearchMode("reference");
  }, [query, searchMode]);

  // Build display list whenever query / lang / mode / data change.
  useEffect(() => {
    const primary: BibleLang = displayMode === "ta" ? "ta" : "en";
    const other: BibleLang | null = displayMode === "both" ? (primary === "en" ? "ta" : "en") : null;
    if (!loaded[primary] || (other && !loaded[other])) return;

    const dataPrimary = getBible(primary);
    const dataOther = other ? getBible(other) : null;
    if (!dataPrimary) return;

    const buildPair = (h: VerseHit): VerseHit | undefined => {
      if (!dataOther || !other) return undefined;
      const t = dataOther[h.book]?.[h.chapter - 1]?.[h.verse - 1];
      if (!t) return undefined;
      const meta = BIBLE_BOOKS[h.book];
      return {
        book: h.book, bookName: meta.name,
        bookNameLocal: other === "ta" ? meta.nameTa : meta.name,
        chapter: h.chapter, verse: h.verse, text: t, score: 0,
      };
    };

    const q = query.trim();
    const queryChanged = q !== lastQueryRef.current;
    lastQueryRef.current = q;

    if (!q) {
      const fHits = [{ b: 42, c: 3, v: 16 }, { b: 18, c: 23, v: 1 }];
      const featured: DisplayHit[] = [];
      for (const f of fHits) {
        const t = dataPrimary[f.b]?.[f.c - 1]?.[f.v - 1];
        if (!t) continue;
        const meta = BIBLE_BOOKS[f.b];
        const hit: VerseHit = {
          book: f.b, bookName: meta.name,
          bookNameLocal: primary === "ta" ? meta.nameTa : meta.name,
          chapter: f.c, verse: f.v, text: t, score: 0,
        };
        featured.push({ hit, pair: buildPair(hit) });
      }
      setResults(featured);
      setSearchMs(null);
      setChapterCtx(null);
      if (queryChanged) { setActiveIdx(0); selectedKeyRef.current = null; }
      return;
    }

    const start = performance.now();
    let primaryHits: VerseHit[];

    if (searchMode === "reference") {
      const ref = parseReference(q);
      if (ref && ref.chapter != null && ref.verse == null) {
        primaryHits = getChapterVerses(ref.book.index, ref.chapter, dataPrimary, primary);
        setChapterCtx({ book: ref.book.index, chapter: ref.chapter });
      } else if (ref) {
        primaryHits = search(q, dataPrimary, primary, 200);
        setChapterCtx(ref.chapter != null ? { book: ref.book.index, chapter: ref.chapter } : null);
      } else {
        // Fall back to text search so the user always sees something useful.
        primaryHits = search(q, dataPrimary, primary, 80);
        setChapterCtx(null);
      }
    } else {
      // Pure verse-content search — ignore parseReference.
      const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits: VerseHit[] = [];
      for (let b = 0; b < dataPrimary.length; b++) {
        const meta = BIBLE_BOOKS[b];
        if (!meta) continue;
        const chapters = dataPrimary[b];
        for (let c = 0; c < chapters.length; c++) {
          const verses = chapters[c];
          for (let v = 0; v < verses.length; v++) {
            const text = verses[v];
            const lower = text.toLowerCase();
            let ok = true;
            for (const t of tokens) if (!lower.includes(t)) { ok = false; break; }
            if (!ok) continue;
            hits.push({
              book: b, bookName: meta.name,
              bookNameLocal: primary === "ta" ? meta.nameTa : meta.name,
              chapter: c + 1, verse: v + 1, text, score: 0,
            });
            if (hits.length >= 300) break;
          }
          if (hits.length >= 300) break;
        }
        if (hits.length >= 300) break;
      }
      primaryHits = hits;
      setChapterCtx(null);
    }

    const list: DisplayHit[] = primaryHits.map((h) => ({ hit: h, pair: buildPair(h) }));
    setSearchMs(performance.now() - start);
    setResults(list);

    // Restore selection by stable id if possible — keeps the same verse
    // highlighted when the user only changed language / display mode.
    if (queryChanged) {
      setActiveIdx(0);
      selectedKeyRef.current = list[0] ? favKey(list[0].hit.book, list[0].hit.chapter, list[0].hit.verse) : null;
    } else if (selectedKeyRef.current) {
      const idx = list.findIndex((d) => favKey(d.hit.book, d.hit.chapter, d.hit.verse) === selectedKeyRef.current);
      if (idx >= 0) setActiveIdx(idx);
    }
  }, [query, loaded, displayMode, lang, searchMode]);

  // ───────── projection ─────────
  const project = (dh: DisplayHit) => {
    const h = dh.hit;
    const pair = dh.pair;
    const primaryLabel = displayMode === "ta" || (displayMode === "both" && lang === "ta") ? "தமிழ்" : "KJV";
    // Build a unified reference matching the active display mode.
    const metaPrimary = BIBLE_BOOKS[h.book];
    const refPrimary = `${h.bookNameLocal} ${h.chapter}:${h.verse}`;
    const refSecondary = pair
      ? `${pair.bookNameLocal} ${pair.chapter}:${pair.verse}`
      : null;
    const reference = displayMode === "both" && refSecondary
      ? `${refPrimary} | ${refSecondary}`
      : refPrimary;
    projectVerse({
      reference,
      text: h.text,
      translation: primaryLabel,
      subtext: pair?.text,
      subtranslation: pair ? (primaryLabel === "KJV" ? "தமிழ்" : "KJV") : undefined,
      book: h.book,
      chapter: h.chapter,
      verse: h.verse,
    });
    selectedKeyRef.current = favKey(h.book, h.chapter, h.verse);
    toast.success(`Projecting ${metaPrimary.name} ${h.chapter}:${h.verse}`);
  };

  const projectAt = (i: number) => {
    const dh = results[i];
    if (dh) project(dh);
  };

  const selectIdx = (i: number) => {
    setActiveIdx(i);
    const dh = results[i];
    if (dh) selectedKeyRef.current = favKey(dh.hit.book, dh.hit.chapter, dh.hit.verse);
  };

  // ───────── keyboard navigation ─────────
  useShortcut({
    id: "bible.focus-search", label: "Focus Bible search", category: "bible",
    keys: ["/"], scope: "bible", handler: () => inputRef.current?.focus(),
  });
  useShortcut({
    id: "bible.next-verse", label: "Next verse", category: "bible",
    keys: ["ArrowDown"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => selectIdx(Math.min(activeIdx + 1, Math.max(0, results.length - 1))),
  });
  useShortcut({
    id: "bible.prev-verse", label: "Previous verse", category: "bible",
    keys: ["ArrowUp"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => selectIdx(Math.max(0, activeIdx - 1)),
  });
  useShortcut({
    id: "bible.next-chapter", label: "Next chapter", category: "bible",
    keys: ["ArrowRight"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => navigateChapter(+1),
  });
  useShortcut({
    id: "bible.prev-chapter", label: "Previous chapter", category: "bible",
    keys: ["ArrowLeft"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => navigateChapter(-1),
  });
  useShortcut({
    id: "bible.project-selected", label: "Project selected verse",
    category: "bible", keys: ["Enter"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => { if (results.length > 0) projectAt(activeIdx); },
  });
  useShortcut({
    id: "bible.reproject", label: "Re-project current verse", category: "bible",
    keys: ["Space"], scope: "bible", allowInInput: false, priority: 20,
    handler: () => projectAt(activeIdx),
  });
  // Language shortcuts — keep current verse selected.
  useShortcut({
    id: "bible.lang.tamil", label: "Switch to Tamil", category: "bible",
    keys: ["Alt+T"], scope: "bible", allowInInput: true, priority: 15,
    handler: () => { void setDisplayMode("ta"); void setLang("ta"); },
  });
  useShortcut({
    id: "bible.lang.english", label: "Switch to English", category: "bible",
    keys: ["Alt+E"], scope: "bible", allowInInput: true, priority: 15,
    handler: () => { void setDisplayMode("en"); void setLang("en"); },
  });
  useShortcut({
    id: "bible.lang.bilingual", label: "Switch to Bilingual", category: "bible",
    keys: ["Alt+B"], scope: "bible", allowInInput: true, priority: 15,
    handler: () => { void setDisplayMode("both"); },
  });
  // Search-mode shortcuts.
  useShortcut({
    id: "bible.mode.reference", label: "Reference search mode", category: "bible",
    keys: ["Alt+R"], scope: "bible", allowInInput: true, priority: 15,
    handler: () => { setSearchMode("reference"); inputRef.current?.focus(); },
  });
  useShortcut({
    id: "bible.mode.verse", label: "Verse content search mode", category: "bible",
    keys: ["Alt+F"], scope: "bible", allowInInput: true, priority: 15,
    handler: () => { setSearchMode("verse"); inputRef.current?.focus(); },
  });

  const navigateChapter = (delta: number) => {
    const ctx = chapterCtx;
    if (!ctx) return;
    const meta = BIBLE_BOOKS[ctx.book];
    if (!meta) return;
    const next = Math.max(1, Math.min(meta.chapters, ctx.chapter + delta));
    if (next === ctx.chapter) return;
    setQuery(`${meta.name} ${next}`);
  };

  const fav = useMemo(
    () => new Set(favorites.map((f) => favKey(f.book, f.chapter, f.verse))),
    [favorites],
  );

  const primaryLang: BibleLang = displayMode === "ta" ? "ta" : "en";

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Bible</div>
        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-border bg-background text-[11px]">
          {(["en", "ta", "both"] as DisplayMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                void setDisplayMode(m);
                if (m !== "both") void setLang(m);
              }}
              className={cn(
                "cursor-pointer px-2 py-1 transition",
                displayMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
              title={m === "en" ? "English (Alt+E)" : m === "ta" ? "Tamil (Alt+T)" : "Bilingual (Alt+B)"}
            >
              {m === "en" ? "EN" : m === "ta" ? "தமிழ்" : "EN+தமிழ்"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-b border-border p-2">
        {/* Mode toggle */}
        <div className="inline-flex w-full overflow-hidden rounded-md border border-border bg-background text-[11px]">
          <button
            onClick={() => setSearchMode("reference")}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1 px-2 py-1 transition",
              searchMode === "reference" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
            title="Reference Search (Alt+R)"
          >
            <Hash className="h-3 w-3" /> Reference
          </button>
          <button
            onClick={() => setSearchMode("verse")}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1 px-2 py-1 transition",
              searchMode === "verse" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
            title="Verse Content Search (Alt+F)"
          >
            <Search className="h-3 w-3" /> Verse Text
          </button>
        </div>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchMode === "reference"
              ? 'Search Genesis 1:1, John 3:16, யோவான் 3'
              : 'Search grace, love, faith, ஆதியிலே'
          }
          className="h-8 text-sm"
          autoFocus
        />
        <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span>
            {loading
              ? "Loading bible…"
              : `${results.length} result${results.length === 1 ? "" : "s"}${searchMs != null ? ` · ${searchMs.toFixed(1)}ms` : ""}`}
            {chapterCtx && <span className="ml-2 opacity-70">· Chapter · ← prev · → next</span>}
          </span>
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3 w-3" />
            {displayMode === "both" ? "Bilingual" : primaryLang === "en" ? "KJV" : "தமிழ்"}
          </span>
        </div>
        {error && <div className="text-[11px] text-destructive">{error}</div>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bible…
          </div>
        )}
        {!loading && !results.length && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No matches. Try a book name, abbreviation, Tamil, or any phrase.
          </div>
        )}

        {/* Responsive media-card grid */}
        <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
          {results.map((dh, i) => {
            const h = dh.hit;
            const pair = dh.pair;
            const stableKey = favKey(h.book, h.chapter, h.verse);
            const isFav = fav.has(stableKey);
            // Reference shown at the top of every card, bilingual when applicable.
            const refPrimary = `${h.bookNameLocal} ${h.chapter}:${h.verse}`;
            const refSecondary = pair ? `${pair.bookNameLocal} ${pair.chapter}:${pair.verse}` : null;
            const headerRef = displayMode === "both" && refSecondary
              ? `${refPrimary} | ${refSecondary}`
              : refPrimary;
            const projectedKey = projectedRef ?? "";
            const isProjected = projectedKey.includes(refPrimary);
            const isActive = activeIdx === i;
            return (
              <div
                key={stableKey + ":" + i}
                onClick={() => { selectIdx(i); project(dh); }}
                className={cn(
                  "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md",
                  isActive ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40",
                  isProjected && "ring-2 ring-primary",
                )}
              >
                {/* Header: reference centered, smaller typography */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-2.5 py-1.5">
                  <span className="inline-flex h-5 items-center rounded bg-primary/15 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                    {displayMode === "both" ? "EN+TA" : primaryLang === "ta" ? "தமிழ்" : "KJV"}
                  </span>
                  <div className="min-w-0 flex-1 truncate text-center text-[11px] font-semibold tracking-wide text-primary">
                    {headerRef}
                  </div>
                  {isProjected ? (
                    <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Live
                    </span>
                  ) : (
                    <span className="h-5 w-8" />
                  )}
                </div>

                {/* Verse preview */}
                <div className="flex-1 px-3 py-2.5">
                  <p className="text-sm leading-snug text-foreground">{h.text}</p>
                  {pair && (
                    <p className="mt-2 border-t border-border/40 pt-2 text-sm leading-snug text-muted-foreground">
                      {pair.text}
                    </p>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-2 py-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFav) removeFavorite(stableKey);
                      else
                        addFavorite({
                          lang: primaryLang, book: h.book, chapter: h.chapter, verse: h.verse,
                          ref: `${h.bookName} ${h.chapter}:${h.verse}`, text: h.text,
                        });
                    }}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded transition",
                      isFav
                        ? "text-amber-500 hover:bg-amber-500/10"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    title={isFav ? "Remove favorite" : "Add favorite"}
                  >
                    <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); selectIdx(i); project(dh); }}
                    className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                    title="Project verse (Enter)"
                  >
                    <Send className="h-3 w-3" /> Project
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!query.trim() && favorites.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Favorites
            </div>
            <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
              {favorites.slice(0, 30).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    const data = getBible(primaryLang);
                    if (!data) return;
                    const txt = data[f.book]?.[f.chapter - 1]?.[f.verse - 1];
                    if (!txt) return;
                    const meta = BIBLE_BOOKS[f.book];
                    const hit: VerseHit = {
                      book: f.book, bookName: meta.name,
                      bookNameLocal: primaryLang === "ta" ? meta.nameTa : meta.name,
                      chapter: f.chapter, verse: f.verse, text: txt, score: 0,
                    };
                    let pair: VerseHit | undefined;
                    if (displayMode === "both") {
                      const other: BibleLang = primaryLang === "en" ? "ta" : "en";
                      const od = getBible(other);
                      const pt = od?.[f.book]?.[f.chapter - 1]?.[f.verse - 1];
                      if (pt) pair = {
                        book: f.book, bookName: meta.name,
                        bookNameLocal: other === "ta" ? meta.nameTa : meta.name,
                        chapter: f.chapter, verse: f.verse, text: pt, score: 0,
                      };
                    }
                    project({ hit, pair });
                  }}
                  className="flex cursor-pointer flex-col gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-left hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="text-[11px] font-semibold text-primary">{f.ref}</div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">{f.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
