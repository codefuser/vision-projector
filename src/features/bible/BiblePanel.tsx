import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Loader2, Star, Send, Languages, Search, Hash,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBibleStore, type DisplayMode } from "@/lib/bible/store";
import { getBible, type BibleLang } from "@/lib/bible/loader";
import { search, parseReference, getChapterVerses, type VerseHit } from "@/lib/bible/search";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { projectVerse } from "@/projection/adapters/bible.adapter";
import { projectVerseAt } from "@/lib/bible/project-ref";
import { Input } from "@/components/ui/input";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { useProjection } from "@/stores/projection.store";
import { useBibleRecent } from "@/stores/bible-recent.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SearchMode = "reference" | "verse";

interface DisplayHit {
  hit: VerseHit;
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
  const selectedKeyRef = useRef<string | null>(null);
  const lastQueryRef = useRef<string>("");

  const recent = useBibleRecent((s) => s.items);
  const pushRecent = useBibleRecent((s) => s.push);

  // Load required databases for current mode.
  useEffect(() => {
    if (displayMode === "both") void ensureBoth();
    else void ensureLoaded(displayMode);
  }, [displayMode, ensureBoth, ensureLoaded]);

  // Auto-detect reference mode.
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
      // Recent verses first; fall back to a couple of featured defaults.
      const out: DisplayHit[] = [];
      const seen = new Set<string>();
      for (const r of recent) {
        const t = dataPrimary[r.book]?.[r.chapter - 1]?.[r.verse - 1];
        if (!t) continue;
        const meta = BIBLE_BOOKS[r.book];
        const hit: VerseHit = {
          book: r.book, bookName: meta.name,
          bookNameLocal: primary === "ta" ? meta.nameTa : meta.name,
          chapter: r.chapter, verse: r.verse, text: t, score: 0,
        };
        out.push({ hit, pair: buildPair(hit) });
        seen.add(favKey(r.book, r.chapter, r.verse));
      }
      if (out.length === 0) {
        const fHits = [{ b: 42, c: 3, v: 16 }, { b: 18, c: 23, v: 1 }, { b: 0, c: 1, v: 1 }];
        for (const f of fHits) {
          const t = dataPrimary[f.b]?.[f.c - 1]?.[f.v - 1];
          if (!t) continue;
          const meta = BIBLE_BOOKS[f.b];
          const hit: VerseHit = {
            book: f.b, bookName: meta.name,
            bookNameLocal: primary === "ta" ? meta.nameTa : meta.name,
            chapter: f.c, verse: f.v, text: t, score: 0,
          };
          out.push({ hit, pair: buildPair(hit) });
        }
      }
      setResults(out);
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
        primaryHits = search(q, dataPrimary, primary, 80);
        setChapterCtx(null);
      }
    } else {
      // Verse text search — includes fuzzy/Tanglish via search().
      primaryHits = search(q, dataPrimary, primary, 200);
      setChapterCtx(null);
    }

    const list: DisplayHit[] = primaryHits.map((h) => ({ hit: h, pair: buildPair(h) }));
    setSearchMs(performance.now() - start);
    setResults(list);

    if (queryChanged) {
      setActiveIdx(0);
      selectedKeyRef.current = list[0] ? favKey(list[0].hit.book, list[0].hit.chapter, list[0].hit.verse) : null;
    } else if (selectedKeyRef.current) {
      const idx = list.findIndex((d) => favKey(d.hit.book, d.hit.chapter, d.hit.verse) === selectedKeyRef.current);
      if (idx >= 0) setActiveIdx(idx);
    }
  }, [query, loaded, displayMode, lang, searchMode, recent]);

  // ───────── projection ─────────
  const project = (dh: DisplayHit) => {
    const h = dh.hit;
    const pair = dh.pair;
    const primaryLabel = displayMode === "ta" || (displayMode === "both" && lang === "ta") ? "தமிழ்" : "KJV";
    const metaPrimary = BIBLE_BOOKS[h.book];
    const refPrimary = `${h.bookNameLocal} ${h.chapter}:${h.verse}`;
    const refSecondary = pair ? `${pair.bookNameLocal} ${pair.chapter}:${pair.verse}` : null;
    const reference = displayMode === "both" && refSecondary ? `${refPrimary} / ${refSecondary}` : refPrimary;
    const refEn = `${metaPrimary.name} ${h.chapter}:${h.verse}`;
    const refTa = `${metaPrimary.nameTa} ${h.chapter}:${h.verse}`;
    const primary: BibleLang = displayMode === "ta" ? "ta" : "en";
    const enTxt = primary === "en" ? h.text : (pair?.text ?? "");
    const taTxt = primary === "ta" ? h.text : (pair?.text ?? "");
    projectVerse({
      reference, text: h.text, translation: primaryLabel,
      subtext: pair?.text,
      subtranslation: pair ? (primaryLabel === "KJV" ? "தமிழ்" : "KJV") : undefined,
      referenceEn: refEn, referenceTa: refTa,
      textEn: enTxt, textTa: taTxt,
      mode: displayMode === "both" ? "both" : (primary === "ta" ? "ta" : "en"),
      book: h.book, chapter: h.chapter, verse: h.verse,
    });
    selectedKeyRef.current = favKey(h.book, h.chapter, h.verse);
    pushRecent({
      book: h.book, chapter: h.chapter, verse: h.verse,
      ref: `${metaPrimary.name} ${h.chapter}:${h.verse}`, text: h.text,
    });
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

  // ───────── chapter navigation ─────────
  const navigateChapter = (delta: number) => {
    const ctx = chapterCtx;
    if (!ctx) return;
    const meta = BIBLE_BOOKS[ctx.book];
    if (!meta) return;
    const next = Math.max(1, Math.min(meta.chapters, ctx.chapter + delta));
    if (next === ctx.chapter) return;
    setQuery(`${meta.name} ${next}`);
  };

  const navigateVerse = (delta: number) => {
    const projected = useProjection.getState().state?.textOverlay;
    if (projected?.kind === "bible_verse") {
      const cur = results[activeIdx]?.hit;
      let book = cur?.book, chapter = cur?.chapter, verse = cur?.verse;
      if (book == null || chapter == null || verse == null) {
        if (chapterCtx) { book = chapterCtx.book; chapter = chapterCtx.chapter; verse = 1; }
      }
      if (book != null && chapter != null && verse != null) {
        const meta = BIBLE_BOOKS[book];
        const chData = getBible((displayMode === "ta" ? "ta" : "en"))?.[book]?.[chapter - 1];
        if (meta && chData) {
          let nv = verse + delta;
          let nc = chapter;
          if (nv < 1) {
            nc = Math.max(1, chapter - 1);
            const prevCh = getBible((displayMode === "ta" ? "ta" : "en"))?.[book]?.[nc - 1];
            nv = prevCh?.length ?? 1;
          } else if (nv > chData.length) {
            nc = Math.min(meta.chapters, chapter + 1);
            nv = 1;
          }
          if (projectVerseAt({ book, chapter: nc, verse: nv })) {
            const idx = results.findIndex((r) => r.hit.book === book && r.hit.chapter === nc && r.hit.verse === nv);
            if (idx >= 0) selectIdx(idx);
          }
          return;
        }
      }
    }
    navigateChapter(delta);
  };

  // ───────── keyboard shortcuts ─────────
  useShortcut({
    id: "bible.focus-search", label: "Focus Bible search", category: "bible",
    keys: ["/"], scope: "bible", handler: () => { inputRef.current?.focus(); },
  });
  useShortcut({
    id: "bible.next-verse", label: "Next verse in list", category: "bible",
    keys: ["ArrowDown"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => selectIdx(Math.min(activeIdx + 1, Math.max(0, results.length - 1))),
  });
  useShortcut({
    id: "bible.prev-verse", label: "Previous verse in list", category: "bible",
    keys: ["ArrowUp"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => selectIdx(Math.max(0, activeIdx - 1)),
  });
  useShortcut({
    id: "bible.next", label: "Next (chapter)", category: "bible",
    keys: ["ArrowRight"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => navigateVerse(+1),
  });
  useShortcut({
    id: "bible.prev", label: "Previous (chapter)", category: "bible",
    keys: ["ArrowLeft"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => navigateVerse(-1),
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

  const fav = useMemo(
    () => new Set(favorites.map((f) => favKey(f.book, f.chapter, f.verse))),
    [favorites],
  );

  const primaryLang: BibleLang = displayMode === "ta" ? "ta" : "en";
  const showingRecent = !query.trim() && recent.length > 0;

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      {/* Single-row toolbar — search + language modes */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-2 py-1.5">
        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
        <Select value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
          <SelectTrigger className="h-8 w-[130px] shrink-0 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reference"><Hash className="mr-2 inline h-3 w-3" /> Reference</SelectItem>
            <SelectItem value="verse"><Search className="mr-2 inline h-3 w-3" /> Verse Text</SelectItem>
          </SelectContent>
        </Select>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchMode === "reference"
              ? "John 3:16, யோவான் 3, PSA 23"
              : "yesu, anbu, grace, vaazhvu, ஆதியிலே"
          }
          className="h-8 min-w-[160px] flex-1 text-sm"
          autoFocus
        />
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-background text-[11px]">
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

      <div className="flex items-center justify-between border-b border-border px-2.5 py-1 text-[10px] text-muted-foreground">
        <span>
          {loading
            ? "Loading bible…"
            : showingRecent
              ? `Recent verses · ${results.length}`
              : `${results.length} result${results.length === 1 ? "" : "s"}${searchMs != null ? ` · ${searchMs.toFixed(1)}ms` : ""}`}
          {chapterCtx && <span className="ml-2 opacity-70">· Chapter · ← prev · → next</span>}
        </span>
        <span className="inline-flex items-center gap-1">
          <Languages className="h-3 w-3" />
          {displayMode === "both" ? "Bilingual" : primaryLang === "en" ? "KJV" : "தமிழ்"}
        </span>
      </div>
      {error && <div className="border-b border-border px-2 py-1 text-[11px] text-destructive">{error}</div>}

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

        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
          {results.map((dh, i) => {
            const h = dh.hit;
            const pair = dh.pair;
            const stableKey = favKey(h.book, h.chapter, h.verse);
            const isFav = fav.has(stableKey);
            const refPrimary = `${h.bookNameLocal} ${h.chapter}:${h.verse}`;
            const refSecondary = pair ? `${pair.bookNameLocal} ${pair.chapter}:${pair.verse}` : null;
            const isProjected = (projectedRef ?? "").includes(refPrimary);
            const isActive = activeIdx === i;
            return (
              <div
                key={stableKey + ":" + i}
                onClick={() => { selectIdx(i); project(dh); }}
                className={cn(
                  "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-card/80 backdrop-blur-sm transition-all",
                  "hover:-translate-y-px hover:border-primary/70 hover:bg-card hover:shadow-lg hover:shadow-primary/10",
                  isProjected
                    ? "border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/25"
                    : isActive
                      ? "border-primary/70 ring-1 ring-primary/20"
                      : "border-border",
                )}
              >
                {/* Header — single-line bilingual reference */}
                <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 py-1">
                  <span className="truncate text-[11px] font-bold tracking-tight text-primary">
                    {refSecondary ? `${refPrimary} / ${refSecondary}` : refPrimary}
                  </span>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {isFav && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                    {isProjected && (
                      <span className="inline-flex items-center gap-1 rounded bg-primary px-1 py-px text-[9px] font-bold uppercase text-primary-foreground">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" />
                        Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Verse text */}
                <div className="flex-1 space-y-1.5 px-2.5 py-2">
                  <p className="line-clamp-3 text-[12.5px] leading-snug text-foreground/95">
                    {h.text}
                  </p>
                  {pair && (
                    <div className="border-t border-dashed border-border/50 pt-1.5">
                      <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                        {pair.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer — favorite + project only */}
                <div className="flex items-center gap-0.5 border-t border-border/40 bg-muted/20 px-1.5 py-1">
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
                    className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground transition hover:opacity-90"
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
                  onClick={() => projectVerseAt({ book: f.book, chapter: f.chapter, verse: f.verse })}
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
