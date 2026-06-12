import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Loader2, Star, Send, Search, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { useSongsStore, type SongLang } from "@/lib/songs/store";
import { useSongsRecent } from "@/stores/songs-recent.store";
import { getSongs, type Song } from "@/lib/songs/loader";
import { searchSongs, type SongHit } from "@/lib/songs/search";
import { projectSongSlide } from "@/projection/adapters/song.adapter";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function slideKey(songId: number, slide: number) {
  return `${songId}:${slide}`;
}

export function SongsPanel() {
  const { lang, query, loading, loaded, error, favorites, setLang, setQuery, ensureLoaded, addFavorite, removeFavorite } = useSongsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<SongHit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState<Record<number, number>>({});
  const projectedRef = useProjection((s) => s.state?.textOverlay?.reference ?? null);
  const recent = useSongsRecent((s) => s.items);
  const pushRecent = useSongsRecent((s) => s.push);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  // Build results when query / loaded changes.
  useEffect(() => {
    if (!loaded) return;
    const songs = getSongs();
    if (!songs) return;
    const q = query.trim();
    if (!q) {
      // show recents, then a few popular fallback songs
      const out: SongHit[] = [];
      const seen = new Set<number>();
      for (const r of recent) {
        const s = songs.find((x) => x.id === r.songId);
        if (s && !seen.has(s.id)) {
          out.push({ song: s, score: 0, slideIndex: r.slideIndex, matched: [] });
          seen.add(s.id);
        }
      }
      if (out.length < 20) {
        for (let i = 0; i < songs.length && out.length < 20; i++) {
          if (seen.has(songs[i].id)) continue;
          out.push({ song: songs[i], score: 0, slideIndex: 0, matched: [] });
        }
      }
      setResults(out);
      setSearchMs(null);
      setActiveIdx(0);
      return;
    }
    const start = performance.now();
    const hits = searchSongs(q, songs, 80);
    setSearchMs(performance.now() - start);
    setResults(hits);
    setActiveIdx(0);
  }, [query, loaded, recent]);

  const project = (song: Song, slideIndex: number) => {
    const text = song.slides[slideIndex] ?? song.content;
    projectSongSlide({
      songId: song.id,
      slideIndex,
      totalSlides: song.slides.length || 1,
      title: song.title,
      text,
      mode: lang,
    });
    setActiveSlide((m) => ({ ...m, [song.id]: slideIndex }));
    pushRecent({
      songId: song.id,
      slideIndex,
      title: song.title,
      preview: text.slice(0, 80),
    });
    toast.success(`Projecting ${song.title} · slide ${slideIndex + 1}`);
  };

  const projectAt = (i: number) => {
    const h = results[i];
    if (!h) return;
    const slide = activeSlide[h.song.id] ?? h.slideIndex ?? 0;
    project(h.song, slide);
  };

  // ───────── shortcuts ─────────
  useShortcut({ id: "songs.focus-search", label: "Focus song search", category: "songs", keys: ["/"], scope: "songs", handler: () => inputRef.current?.focus() });
  useShortcut({ id: "songs.next", label: "Next song", category: "songs", keys: ["ArrowDown"], scope: "songs", allowInInput: true, priority: 20, handler: () => setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1))) });
  useShortcut({ id: "songs.prev", label: "Previous song", category: "songs", keys: ["ArrowUp"], scope: "songs", allowInInput: true, priority: 20, handler: () => setActiveIdx((i) => Math.max(0, i - 1)) });
  useShortcut({ id: "songs.project", label: "Project selected song", category: "songs", keys: ["Enter"], scope: "songs", allowInInput: true, priority: 20, handler: () => projectAt(activeIdx) });
  useShortcut({ id: "songs.next-slide", label: "Next slide", category: "songs", keys: ["ArrowRight"], scope: "songs", allowInInput: true, priority: 20, handler: () => {
    const h = results[activeIdx]; if (!h) return;
    const cur = activeSlide[h.song.id] ?? 0;
    const next = Math.min(cur + 1, Math.max(0, h.song.slides.length - 1));
    if (next !== cur) project(h.song, next);
  } });
  useShortcut({ id: "songs.prev-slide", label: "Previous slide", category: "songs", keys: ["ArrowLeft"], scope: "songs", allowInInput: true, priority: 20, handler: () => {
    const h = results[activeIdx]; if (!h) return;
    const cur = activeSlide[h.song.id] ?? 0;
    const prev = Math.max(0, cur - 1);
    if (prev !== cur) project(h.song, prev);
  } });

  const favSet = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-2 py-1.5">
        <Music className="h-4 w-4 shrink-0 text-primary" />
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="yesu, anbu, vaazhvu, ஆதியிலே, song title, any lyric…"
            className="h-8 pl-7 text-sm"
            autoFocus
          />
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-background text-[11px]">
          {(["ta", "en", "both"] as SongLang[]).map((m) => (
            <button
              key={m}
              onClick={() => setLang(m)}
              className={cn(
                "cursor-pointer px-2 py-1 transition",
                lang === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {m === "ta" ? "தமிழ்" : m === "en" ? "EN" : "EN+தமிழ்"}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1 text-[10px] text-muted-foreground">
        <span>
          {loading
            ? "Loading songs…"
            : !query.trim()
              ? `${results.length} song${results.length === 1 ? "" : "s"}${recent.length ? " · recent + library" : ""}`
              : `${results.length} match${results.length === 1 ? "" : "es"}${searchMs != null ? ` · ${searchMs.toFixed(1)}ms` : ""}`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Languages className="h-3 w-3" />
          {lang === "ta" ? "தமிழ்" : lang === "en" ? "English" : "Bilingual"}
        </span>
      </div>
      {error && <div className="border-b border-border px-2 py-1 text-[11px] text-destructive">{error}</div>}

      {/* Results */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading song library…
          </div>
        )}
        {!loading && !results.length && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No matches. Try a Tamil word, Tanglish (yesu, anbu, vaazhvu), or a title.
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
          {results.map((h, i) => {
            const song = h.song;
            const slideIdx = activeSlide[song.id] ?? h.slideIndex ?? 0;
            const slide = song.slides[slideIdx] ?? song.content;
            const isProjected = (projectedRef ?? "").startsWith(song.title);
            const isActive = activeIdx === i;
            const isFav = favSet.has(song.id);
            const expanded = expandedId === song.id;
            return (
              <div
                key={song.id}
                onClick={() => { setActiveIdx(i); project(song, slideIdx); }}
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
                <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 py-1">
                  <span className="truncate text-[11px] font-bold tracking-tight text-primary">
                    {song.title}
                  </span>
                  {song.scale && (
                    <span className="rounded bg-muted px-1 py-px text-[9px] text-muted-foreground">{song.scale}</span>
                  )}
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

                <div className="flex-1 space-y-1.5 px-2.5 py-2">
                  <pre className="line-clamp-4 whitespace-pre-wrap font-sans text-[12.5px] leading-snug text-foreground/95">
                    {slide}
                  </pre>
                  {(song.artist || song.album) && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {[song.artist, song.album].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                {/* Slide chips */}
                {song.slides.length > 1 && (
                  <div className="flex flex-wrap gap-1 border-t border-border/40 bg-muted/10 px-1.5 py-1">
                    {(expanded ? song.slides : song.slides.slice(0, 6)).map((_, j) => (
                      <button
                        key={j}
                        onClick={(e) => { e.stopPropagation(); setActiveIdx(i); project(song, j); }}
                        className={cn(
                          "h-5 min-w-[20px] rounded px-1 text-[10px] font-semibold transition",
                          j === slideIdx
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                        title={`Slide ${j + 1}`}
                      >
                        {j + 1}
                      </button>
                    ))}
                    {!expanded && song.slides.length > 6 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(song.id); }}
                        className="h-5 rounded bg-muted px-1.5 text-[10px] text-muted-foreground hover:bg-accent"
                      >
                        +{song.slides.length - 6}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-0.5 border-t border-border/40 bg-muted/20 px-1.5 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFav) removeFavorite(song.id);
                      else addFavorite({ id: song.id, title: song.title });
                    }}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded transition",
                      isFav ? "text-amber-500 hover:bg-amber-500/10" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    title={isFav ? "Remove favorite" : "Add favorite"}
                  >
                    <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                  </button>
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {song.slides.length || 1} slide{song.slides.length === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveIdx(i); project(song, slideIdx); }}
                    className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground transition hover:opacity-90"
                    title="Project slide (Enter)"
                  >
                    <Send className="h-3 w-3" /> Project
                  </button>
                </div>
                {/* slideKey used as a stable id helper for future range ops. */}
                <span className="hidden">{slideKey(song.id, slideIdx)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
