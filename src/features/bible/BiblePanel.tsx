import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Star, StarOff, Send, Languages } from "lucide-react";
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

interface DisplayHit {
  hit: VerseHit;
  /** Tamil counterpart when displayMode === "both". */
  pair?: VerseHit;
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
  const projectedRef = useProjection((s) => s.state?.textOverlay?.reference ?? null);

  // Load required databases for current mode.
  useEffect(() => {
    if (displayMode === "both") void ensureBoth();
    else void ensureLoaded(displayMode);
  }, [displayMode, ensureBoth, ensureLoaded]);

  // Build display list whenever query / lang / mode / data change.
  useEffect(() => {
    const primary: BibleLang = displayMode === "ta" ? "ta" : "en";
    const other: BibleLang | null = displayMode === "both" ? (primary === "en" ? "ta" : "en") : null;
    if (!loaded[primary] || (other && !loaded[other])) return;

    const dataPrimary = getBible(primary);
    const dataOther = other ? getBible(other) : null;
    if (!dataPrimary) return;

    const q = query.trim();
    if (!q) {
      // Idle: surface John 3:16 / Psalm 23:1 as gentle defaults.
      const featured: DisplayHit[] = [];
      const fHits = [
        { b: 42, c: 3, v: 16 },
        { b: 18, c: 23, v: 1 },
      ];
      for (const f of fHits) {
        const ch = dataPrimary[f.b]?.[f.c - 1];
        if (!ch) continue;
        const t = ch[f.v - 1];
        if (!t) continue;
        const meta = BIBLE_BOOKS[f.b];
        const hit: VerseHit = {
          book: f.b, bookName: meta.name,
          bookNameLocal: primary === "ta" ? meta.nameTa : meta.name,
          chapter: f.c, verse: f.v, text: t, score: 0,
        };
        let pair: VerseHit | undefined;
        if (dataOther) {
          const pt = dataOther[f.b]?.[f.c - 1]?.[f.v - 1];
          if (pt) {
            pair = {
              book: f.b, bookName: meta.name,
              bookNameLocal: other === "ta" ? meta.nameTa : meta.name,
              chapter: f.c, verse: f.v, text: pt, score: 0,
            };
          }
        }
        featured.push({ hit, pair });
      }
      setResults(featured);
      setSearchMs(null);
      setActiveIdx(0);
      setChapterCtx(null);
      return;
    }

    const start = performance.now();
    const ref = parseReference(q);
    let primaryHits: VerseHit[];
    if (ref && ref.chapter != null && ref.verse == null) {
      primaryHits = getChapterVerses(ref.book.index, ref.chapter, dataPrimary, primary);
      setChapterCtx({ book: ref.book.index, chapter: ref.chapter });
    } else {
      primaryHits = search(q, dataPrimary, primary, 80);
      setChapterCtx(ref && ref.chapter != null ? { book: ref.book.index, chapter: ref.chapter } : null);
    }
    const list: DisplayHit[] = primaryHits.map((h) => {
      let pair: VerseHit | undefined;
      if (dataOther) {
        const t = dataOther[h.book]?.[h.chapter - 1]?.[h.verse - 1];
        if (t) {
          const meta = BIBLE_BOOKS[h.book];
          pair = {
            book: h.book, bookName: meta.name,
            bookNameLocal: other === "ta" ? meta.nameTa : meta.name,
            chapter: h.chapter, verse: h.verse, text: t, score: 0,
          };
        }
      }
      return { hit: h, pair };
    });
    setSearchMs(performance.now() - start);
    setResults(list);
    setActiveIdx(0);
  }, [query, loaded, displayMode, lang]);

  // ───────── projection ─────────
  const project = (dh: DisplayHit) => {
    const h = dh.hit;
    const pair = dh.pair;
    // Reference in the *primary* language for clean display.
    const reference = `${h.bookNameLocal} ${h.chapter}:${h.verse}`;
    const primaryLabel = displayMode === "ta" || (displayMode === "both" && lang === "ta") ? "தமிழ்" : "KJV";
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
    toast.success(`Projecting ${h.bookName} ${h.chapter}:${h.verse}`);
  };

  const projectAt = (i: number) => {
    const dh = results[i];
    if (dh) project(dh);
  };

  // ───────── keyboard navigation ─────────
  useShortcut({
    id: "bible.focus-search", label: "Focus Bible search", category: "bible",
    keys: ["/"], scope: "bible", handler: () => inputRef.current?.focus(),
  });
  useShortcut({
    id: "bible.next-verse", label: "Next verse", category: "bible",
    keys: ["ArrowDown"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1))),
  });
  useShortcut({
    id: "bible.prev-verse", label: "Previous verse", category: "bible",
    keys: ["ArrowUp"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => setActiveIdx((i) => Math.max(0, i - 1)),
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
    id: "bible.project-selected", label: "Project selected verse / Search → project best result",
    category: "bible", keys: ["Enter"], scope: "bible", allowInInput: true, priority: 20,
    handler: () => {
      if (results.length > 0) projectAt(activeIdx);
    },
  });
  useShortcut({
    id: "bible.reproject", label: "Re-project current verse", category: "bible",
    keys: ["Space"], scope: "bible", allowInInput: false, priority: 20,
    handler: () => projectAt(activeIdx),
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
    () => new Set(favorites.map((f) => `${f.lang}:${f.book}:${f.chapter}:${f.verse}`)),
    [favorites],
  );

  const primaryLang: BibleLang = displayMode === "ta" ? "ta" : "en";

  return (
    <div className="flex h-full min-h-0 flex-col">
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
              title={m === "en" ? "English" : m === "ta" ? "Tamil" : "Bilingual"}
            >
              {m === "en" ? "EN" : m === "ta" ? "தமிழ்" : "EN+தமிழ்"}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border p-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "jn 3:16", "psalm 23", "யோவான் 3", "sangeetham 23"'
          className="h-8 text-sm"
          autoFocus
        />
        <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span>
            {loading
              ? "Loading bible…"
              : `${results.length} result${results.length === 1 ? "" : "s"}${searchMs != null ? ` · ${searchMs.toFixed(1)}ms` : ""}`}
            {chapterCtx && (
              <span className="ml-2 opacity-70">
                · Chapter mode · ← prev · → next
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3 w-3" />
            {displayMode === "both" ? "Bilingual" : primaryLang === "en" ? "KJV" : "தமிழ்"}
          </span>
        </div>
        {error && <div className="mt-1 text-[11px] text-destructive">{error}</div>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
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
        <ul className="divide-y divide-border">
          {results.map((dh, i) => {
            const h = dh.hit;
            const pair = dh.pair;
            const key = `${primaryLang}:${h.book}:${h.chapter}:${h.verse}`;
            const isFav = fav.has(key);
            const reference = `${h.bookNameLocal} ${h.chapter}:${h.verse}`;
            const isProjected = projectedRef === reference;
            const isActive = activeIdx === i;
            return (
              <li
                key={key + ":" + i}
                onClick={() => { setActiveIdx(i); project(dh); }}
                className={cn(
                  "group cursor-pointer px-3 py-2 transition",
                  isActive ? "bg-primary/10" : "hover:bg-accent/50",
                  isProjected && "border-l-2 border-primary bg-primary/15",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded bg-primary/20 px-1 text-[10px] font-bold text-primary">
                      {h.verse}
                    </span>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {h.bookNameLocal} {h.chapter}:{h.verse}
                    </div>
                    {isProjected && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFav) removeFavorite(key);
                        else
                          addFavorite({
                            lang: primaryLang, book: h.book, chapter: h.chapter, verse: h.verse,
                            ref: `${h.bookName} ${h.chapter}:${h.verse}`, text: h.text,
                          });
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={isFav ? "Remove favorite" : "Add favorite"}
                    >
                      {isFav ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); project(dh); }}
                      className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                      title="Project verse"
                    >
                      <Send className="h-3 w-3" /> Project
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-sm leading-snug text-foreground">{h.text}</div>
                {pair && (
                  <div className="mt-1 border-t border-border/40 pt-1 text-sm leading-snug text-muted-foreground">
                    {pair.text}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!query.trim() && favorites.length > 0 && (
          <div className="border-t border-border">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Favorites
            </div>
            <ul className="divide-y divide-border">
              {favorites
                .filter((f) => f.lang === primaryLang)
                .slice(0, 30)
                .map((f) => (
                  <li
                    key={f.id}
                    onClick={() => {
                      const data = getBible(primaryLang);
                      if (!data) return;
                      const txt = data[f.book]?.[f.chapter - 1]?.[f.verse - 1];
                      if (!txt) return;
                      const meta = BIBLE_BOOKS[f.book];
                      project({
                        hit: {
                          book: f.book, bookName: meta.name,
                          bookNameLocal: primaryLang === "ta" ? meta.nameTa : meta.name,
                          chapter: f.chapter, verse: f.verse, text: txt, score: 0,
                        },
                      });
                    }}
                    className="cursor-pointer px-3 py-1.5 text-xs hover:bg-accent/40"
                  >
                    <span className="font-semibold text-primary">{f.ref}</span>
                    <span className="ml-2 line-clamp-1 text-muted-foreground">{f.text}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
