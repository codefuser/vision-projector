import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Star, StarOff, Send, Languages } from "lucide-react";
import { useBibleStore } from "@/lib/bible/store";
import { getBible, getVerse, type BibleLang } from "@/lib/bible/loader";
import { search, type VerseHit } from "@/lib/bible/search";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { projectVerse } from "@/projection/adapters/bible.adapter";
import { Input } from "@/components/ui/input";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BiblePanel() {
  const { lang, query, loading, loaded, error, favorites, setLang, setQuery, ensureLoaded, addFavorite, removeFavorite } =
    useBibleStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<VerseHit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchMs, setSearchMs] = useState<number | null>(null);

  // Lazy load on mount.
  useEffect(() => {
    void ensureLoaded(lang);
  }, [ensureLoaded, lang]);

  // Live search (debounced via microtask + effect on query/loaded/lang).
  useEffect(() => {
    if (!loaded[lang]) {
      setResults([]);
      return;
    }
    if (!query.trim()) {
      // Show a small "Featured" preview when idle: John 3:16, Psalm 23:1.
      const data = getBible(lang);
      if (!data) return setResults([]);
      const featured: VerseHit[] = [];
      const j316 = getVerse(lang, 42, 3, 16);
      if (j316) {
        const b = BIBLE_BOOKS[42];
        featured.push({
          book: 42, bookName: b.name, bookNameLocal: lang === "ta" ? b.nameTa : b.name,
          chapter: 3, verse: 16, text: j316, score: 0,
        });
      }
      const ps23 = getVerse(lang, 18, 23, 1);
      if (ps23) {
        const b = BIBLE_BOOKS[18];
        featured.push({
          book: 18, bookName: b.name, bookNameLocal: lang === "ta" ? b.nameTa : b.name,
          chapter: 23, verse: 1, text: ps23, score: 0,
        });
      }
      setResults(featured);
      setSearchMs(null);
      setActiveIdx(0);
      return;
    }
    const data = getBible(lang);
    if (!data) return;
    const start = performance.now();
    const hits = search(query, data, lang, 80);
    setSearchMs(performance.now() - start);
    setResults(hits);
    setActiveIdx(0);
  }, [query, loaded, lang]);

  const project = (h: VerseHit) => {
    projectVerse({
      reference: `${h.bookNameLocal} ${h.chapter}:${h.verse}`,
      text: h.text,
      translation: lang === "ta" ? "தமிழ்" : "KJV",
      book: h.book,
      chapter: h.chapter,
      verse: h.verse,
    });
    toast.success(`Projecting ${h.bookName} ${h.chapter}:${h.verse}`);
  };

  // Bible-scoped shortcuts (active while panel is mounted).
  useShortcut({
    id: "bible.focus-search",
    label: "Focus Bible search",
    category: "bible",
    keys: ["/"],
    scope: "bible",
    handler: () => inputRef.current?.focus(),
  });
  useShortcut({
    id: "bible.next-result",
    label: "Next verse result",
    category: "bible",
    keys: ["ArrowDown"],
    scope: "bible",
    allowInInput: true,
    handler: () => setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1))),
  });
  useShortcut({
    id: "bible.prev-result",
    label: "Previous verse result",
    category: "bible",
    keys: ["ArrowUp"],
    scope: "bible",
    allowInInput: true,
    handler: () => setActiveIdx((i) => Math.max(0, i - 1)),
  });
  useShortcut({
    id: "bible.project-selected",
    label: "Project selected verse",
    category: "bible",
    keys: ["Enter"],
    scope: "bible",
    allowInInput: true,
    handler: () => {
      const h = results[activeIdx];
      if (h) project(h);
    },
  });

  const fav = useMemo(() => new Set(favorites.map((f) => `${f.lang}:${f.book}:${f.chapter}:${f.verse}`)), [favorites]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Bible</div>
        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-border bg-background text-[11px]">
          {(["en", "ta"] as BibleLang[]).map((l) => (
            <button
              key={l}
              onClick={() => void setLang(l)}
              className={cn(
                "cursor-pointer px-2 py-1 transition",
                lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {l === "en" ? "English" : "தமிழ்"}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border p-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "jn 3:16", "psalm 23", "love your enemies"'
          className="h-8 text-sm"
          autoFocus
        />
        <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span>
            {loading
              ? "Loading bible…"
              : !loaded[lang]
                ? "Loading on demand"
                : `${results.length} result${results.length === 1 ? "" : "s"}${searchMs != null ? ` · ${searchMs.toFixed(1)}ms` : ""}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3 w-3" />
            {lang === "en" ? "KJV" : "தமிழ்"}
          </span>
        </div>
        {error && <div className="mt-1 text-[11px] text-destructive">{error}</div>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !loaded[lang] && (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {lang === "en" ? "English" : "Tamil"} Bible…
          </div>
        )}
        {!loading && !results.length && loaded[lang] && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No matches. Try a book name, abbreviation, or any phrase.
          </div>
        )}
        <ul className="divide-y divide-border">
          {results.map((h, i) => {
            const key = `${lang}:${h.book}:${h.chapter}:${h.verse}`;
            const isFav = fav.has(key);
            return (
              <li
                key={key}
                onClick={() => setActiveIdx(i)}
                onDoubleClick={() => project(h)}
                className={cn(
                  "group cursor-pointer px-3 py-2 transition",
                  activeIdx === i ? "bg-primary/10" : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {h.bookNameLocal} {h.chapter}:{h.verse}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFav) removeFavorite(key);
                        else
                          addFavorite({
                            lang, book: h.book, chapter: h.chapter, verse: h.verse,
                            ref: `${h.bookName} ${h.chapter}:${h.verse}`, text: h.text,
                          });
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={isFav ? "Remove favorite" : "Add favorite"}
                    >
                      {isFav ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        project(h);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                      title="Project verse"
                    >
                      <Send className="h-3 w-3" /> Project
                    </button>
                  </div>
                </div>
                <div className="mt-0.5 line-clamp-3 text-sm leading-snug text-foreground">{h.text}</div>
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
                .filter((f) => f.lang === lang)
                .slice(0, 30)
                .map((f) => (
                  <li
                    key={f.id}
                    onDoubleClick={() => {
                      const data = getBible(lang);
                      if (!data) return;
                      const txt = data[f.book]?.[f.chapter - 1]?.[f.verse - 1];
                      if (!txt) return;
                      const b = BIBLE_BOOKS[f.book];
                      project({
                        book: f.book, bookName: b.name,
                        bookNameLocal: lang === "ta" ? b.nameTa : b.name,
                        chapter: f.chapter, verse: f.verse, text: txt, score: 0,
                      });
                    }}
                    className="cursor-pointer px-3 py-1.5 text-xs hover:bg-accent/40"
                  >
                    <span className="font-semibold text-primary">{f.ref}</span>
                    <span className="ml-2 text-muted-foreground line-clamp-1">{f.text}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
