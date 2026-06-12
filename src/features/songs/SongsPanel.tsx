/**
 * Songs panel — Tamil-only.
 *
 * Layout:
 *   • No song selected → single column of compact song cards.
 *   • Song selected     → split view: search results on the left, slide
 *                         preview cards on the right. The operator sees
 *                         the library and the song's slides at the same time.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Loader2, Star, Send, Search, Plus, X, Pencil, Trash2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { useSongsStore } from "@/lib/songs/store";
import { useSongsRecent } from "@/stores/songs-recent.store";
import { getSongs, type Song } from "@/lib/songs/loader";
import { searchSongs, type SongHit } from "@/lib/songs/search";
import { songStem } from "@/lib/songs/normalize";
import { projectSongSlide } from "@/projection/adapters/song.adapter";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SongEditorDialog } from "./SongEditorDialog";

/** First non-empty lyric line — shown on every result card. */
function firstLineOf(song: Song): string {
  const src = song.slides[0] ?? song.content ?? "";
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return song.title;
}

/** Find a lyric line that actually contains the query — for "Search Match" preview. */
function matchedLineOf(song: Song, query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const qStem = songStem(q);
  const lines = (song.content ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const titleLine = song.title.trim();
  for (const line of lines) {
    if (line === titleLine) continue;
    const lower = line.toLowerCase();
    if (tokens.some((t) => t && lower.includes(t))) return line;
  }
  if (qStem.length >= 2) {
    for (const line of lines) {
      if (line === titleLine) continue;
      if (songStem(line).includes(qStem)) return line;
    }
  }
  return null;
}

type SongFilter = "all" | "favorites" | "recent" | "added" | "most" | "mine" | "author";
const FILTER_LABELS: Record<SongFilter, string> = {
  all: "All Songs",
  favorites: "Favorites",
  recent: "Recently Used",
  added: "Recently Added",
  most: "Most Used",
  mine: "My Songs",
  author: "Author",
};

export function SongsPanel() {
  const {
    query, loading, loaded, error, favorites,
    selectedSongId, userSongs,
    setQuery, ensureLoaded, addFavorite, removeFavorite,
    selectSong, removeUserSong,
  } = useSongsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<SongHit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const [activeSlideById, setActiveSlideById] = useState<Record<number, number>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<SongFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<Song[]>([]);
  const projectedRef = useProjection((s) => s.state?.textOverlay?.text ?? null);
  const recent = useSongsRecent((s) => s.items);
  const counts = useSongsRecent((s) => s.counts);
  const pushRecent = useSongsRecent((s) => s.push);

  useEffect(() => { void ensureLoaded(); }, [ensureLoaded]);

  // Distinct author list (built from the loaded library + user songs).
  const authors = useMemo(() => {
    if (!loaded) return [] as string[];
    const songs = getSongs();
    if (!songs) return [];
    const set = new Set<string>();
    for (const s of songs) {
      const a = (s.artist || "").trim();
      if (a) set.add(a);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [loaded, userSongs]);

  useEffect(() => {
    if (!loaded) return;
    const songs = getSongs();
    if (!songs) return;
    const q = query.trim();
    const favIds = new Set(favorites.map((f) => f.id));
    const userIds = new Set(userSongs.map((u) => u.id));
    const recentIds = new Set(recent.map((r) => r.songId));
    const applyFilter = (s: Song) => {
      if (filter === "favorites") return favIds.has(s.id);
      if (filter === "mine") return userIds.has(s.id);
      if (filter === "recent") return recentIds.has(s.id);
      if (filter === "added") return userIds.has(s.id);
      if (filter === "most") return (counts[s.id] ?? 0) > 0;
      if (filter === "author") return !!authorFilter && (s.artist || "").trim() === authorFilter;
      return true;
    };

    if (!q) {
      const out: SongHit[] = [];
      const seen = new Set<number>();
      const push = (s: Song, slideIndex = 0) => {
        if (seen.has(s.id) || !applyFilter(s)) return;
        out.push({ song: s, score: 0, slideIndex, matched: [] });
        seen.add(s.id);
      };
      if (filter === "all" || filter === "mine" || filter === "added") {
        const list = filter === "added"
          ? [...userSongs].sort((a, b) => b.id - a.id) // higher id = newer
          : userSongs;
        for (const u of list) {
          const s = songs.find((x) => x.id === u.id);
          if (s) push(s);
        }
      }
      if (filter === "all" || filter === "recent") {
        for (const r of recent) {
          const s = songs.find((x) => x.id === r.songId);
          if (s) push(s, r.slideIndex);
        }
      }
      if (filter === "most") {
        const ranked = Object.entries(counts)
          .map(([id, n]) => ({ id: Number(id), n }))
          .sort((a, b) => b.n - a.n);
        for (const r of ranked) {
          const s = songs.find((x) => x.id === r.id);
          if (s) push(s);
        }
      }
      if (filter === "favorites") {
        for (const f of favorites) {
          const s = songs.find((x) => x.id === f.id);
          if (s) push(s);
        }
      }
      if (filter === "author" && authorFilter) {
        for (const s of songs) push(s);
      }
      const limit = filter === "all" ? 80 : 500;
      if (filter === "all") {
        for (let i = 0; i < songs.length && out.length < limit; i++) push(songs[i]);
      }
      setResults(out);
      setSearchMs(null);
      setActiveIdx(0);
      return;
    }
    const t0 = performance.now();
    const hits = searchSongs(q, songs, 200).filter((h) => applyFilter(h.song)).slice(0, 120);
    setSearchMs(performance.now() - t0);
    setResults(hits);
    setActiveIdx(0);
  }, [query, loaded, recent, userSongs, favorites, filter, authorFilter, counts]);

  // Live title suggestions while typing.
  useEffect(() => {
    if (!loaded) return;
    const q = query.trim();
    if (q.length < 1) { setTitleSuggestions([]); return; }
    const songs = getSongs();
    if (!songs) return;
    const hits = searchSongs(q, songs, 8);
    setTitleSuggestions(hits.map((h) => h.song));
  }, [query, loaded]);

  const selectedSong: Song | null = useMemo(() => {
    if (!selectedSongId) return null;
    const songs = getSongs();
    return songs?.find((s) => s.id === selectedSongId) ?? null;
  }, [selectedSongId, userSongs, loaded]);

  const project = (song: Song, slideIndex: number) => {
    const text = song.slides[slideIndex] ?? song.content;
    projectSongSlide({
      songId: song.id,
      slideIndex,
      totalSlides: song.slides.length || 1,
      title: song.title,
      text,
    });
    setActiveSlideById((m) => ({ ...m, [song.id]: slideIndex }));
    pushRecent({ songId: song.id, slideIndex, title: song.title, preview: text.slice(0, 80) });
    toast.success(`${song.title} · slide ${slideIndex + 1}`);
  };

  const openSong = (song: Song) => {
    selectSong(song.id);
    setActiveSlideById((m) => ({ ...m, [song.id]: m[song.id] ?? 0 }));
  };

  // ── shortcuts ── (skipped while the editor dialog is open so the textarea
  // behaves like a plain editor — Enter / Arrow / Esc are all owned by it).
  const guarded = <T extends (...a: any[]) => any>(fn: T) =>
    ((...a: Parameters<T>) => { if (editorOpen) return false; return fn(...a); }) as T;
  useShortcut({ id: "songs.focus-search", label: "Focus song search", category: "songs", keys: ["/"], scope: "songs", handler: guarded(() => inputRef.current?.focus()) });
  useShortcut({ id: "songs.next", label: "Next song", category: "songs", keys: ["ArrowDown"], scope: "songs", allowInInput: true, priority: 20, handler: guarded(() => setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)))) });
  useShortcut({ id: "songs.prev", label: "Previous song", category: "songs", keys: ["ArrowUp"], scope: "songs", allowInInput: true, priority: 20, handler: guarded(() => setActiveIdx((i) => Math.max(0, i - 1))) });
  useShortcut({ id: "songs.open", label: "Open selected song", category: "songs", keys: ["Enter"], scope: "songs", allowInInput: true, priority: 20, handler: guarded(() => {
    const h = results[activeIdx]; if (!h) return;
    if (selectedSongId === h.song.id) project(h.song, activeSlideById[h.song.id] ?? 0);
    else openSong(h.song);
  }) });
  useShortcut({ id: "songs.next-slide", label: "Next slide", category: "songs", keys: ["ArrowRight"], scope: "songs", allowInInput: true, priority: 20, handler: guarded(() => {
    if (!selectedSong) return;
    const cur = activeSlideById[selectedSong.id] ?? 0;
    const next = Math.min(cur + 1, selectedSong.slides.length - 1);
    if (next !== cur) project(selectedSong, next);
  }) });
  useShortcut({ id: "songs.prev-slide", label: "Previous slide", category: "songs", keys: ["ArrowLeft"], scope: "songs", allowInInput: true, priority: 20, handler: guarded(() => {
    if (!selectedSong) return;
    const cur = activeSlideById[selectedSong.id] ?? 0;
    const prev = Math.max(0, cur - 1);
    if (prev !== cur) project(selectedSong, prev);
  }) });
  useShortcut({ id: "songs.close", label: "Close song", category: "songs", keys: ["Escape"], scope: "songs", allowInInput: true, handler: guarded(() => selectSong(null)) });

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
            onChange={(e) => { setQuery(e.target.value); setSuggestionsOpen(true); }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
            placeholder="yesu · anbu · vaazhvu · இயேசு · title · lyric…"
            className="h-8 pl-7 text-sm"
            autoFocus
          />
          {suggestionsOpen && query.trim() && titleSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
              {titleSuggestions.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => { e.preventDefault(); openSong(s); setQuery(s.title); setSuggestionsOpen(false); }}
                  className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-accent"
                >
                  <Music className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{s.title}</span>
                  {s.artist && <span className="ml-auto truncate text-[10px] text-muted-foreground">{s.artist}</span>}
                </button>
              ))}
            </div>
          )}
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
              <span className="hidden max-w-[140px] truncate @sm:inline">{filter === "author" && authorFilter ? authorFilter : FILTER_LABELS[filter]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["all", "favorites", "recent", "added", "most", "mine"] as SongFilter[]).map((f) => (
              <DropdownMenuItem
                key={f}
                onClick={() => { setFilter(f); setAuthorFilter(null); }}
                className={cn("text-xs", filter === f && "bg-accent font-semibold text-primary")}
              >
                {FILTER_LABELS[f]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Author {authorFilter ? `· ${authorFilter}` : ""}
            </DropdownMenuLabel>
            {authors.length === 0 && (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">No authors</div>
            )}
            {authors.slice(0, 200).map((a) => (
              <DropdownMenuItem
                key={a}
                onClick={() => { setFilter("author"); setAuthorFilter(a); }}
                className={cn("text-xs", filter === "author" && authorFilter === a && "bg-accent font-semibold text-primary")}
              >
                <span className="truncate">{a}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => { setEditingId(null); setEditorOpen(true); }}
          title="New song"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1 text-[10px] text-muted-foreground">
        <span>
          {loading
            ? "Loading songs…"
            : !query.trim()
              ? `${results.length} song${results.length === 1 ? "" : "s"} · ${userSongs.length} mine`
              : `${results.length} match${results.length === 1 ? "" : "es"}${searchMs != null ? ` · ${searchMs.toFixed(1)}ms` : ""}`}
        </span>
        <span>தமிழ் • Tanglish · fuzzy · sound-alike</span>
      </div>
      {error && <div className="border-b border-border px-2 py-1 text-[11px] text-destructive">{error}</div>}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading song library…
          </div>
        ) : selectedSong ? (
          <div className="grid h-full min-h-0 grid-cols-1 @lg:grid-cols-[minmax(260px,1fr)_1.4fr]">
            <SongList
              results={results}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              onOpen={openSong}
              onProject={(song) => project(song, activeSlideById[song.id] ?? 0)}
              projectedText={projectedRef}
              favSet={favSet}
              addFav={addFavorite}
              removeFav={removeFavorite}
              activeSlideById={activeSlideById}
              selectedId={selectedSong.id}
              userSongs={userSongs}
              onEdit={(id) => { setEditingId(id); setEditorOpen(true); }}
              onDelete={removeUserSong}
              compact
            />
            <SlidePane
              song={selectedSong}
              activeSlide={activeSlideById[selectedSong.id] ?? 0}
              onSelect={(i) => setActiveSlideById((m) => ({ ...m, [selectedSong.id]: i }))}
              onProject={(i) => project(selectedSong, i)}
              onEdit={() => { setEditingId(selectedSong.id); setEditorOpen(true); }}
              onClose={() => selectSong(null)}
              projectedText={projectedRef}
            />
          </div>
        ) : (
          <SongList
            results={results}
            activeIdx={activeIdx}
            setActiveIdx={setActiveIdx}
            onOpen={openSong}
            onProject={(song) => project(song, activeSlideById[song.id] ?? 0)}
            projectedText={projectedRef}
            favSet={favSet}
            addFav={addFavorite}
            removeFav={removeFavorite}
            activeSlideById={activeSlideById}
            selectedId={null}
            userSongs={userSongs}
            onEdit={(id) => { setEditingId(id); setEditorOpen(true); }}
            onDelete={removeUserSong}
          />
        )}
      </div>

      <SongEditorDialog open={editorOpen} onOpenChange={setEditorOpen} editingId={editingId} />
    </div>
  );
}

/* ───────── List ───────── */

interface ListProps {
  results: SongHit[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onOpen: (song: Song) => void;
  onProject: (song: Song) => void;
  projectedText: string | null;
  favSet: Set<number>;
  addFav: (f: { id: number; title: string }) => void;
  removeFav: (id: number) => void;
  activeSlideById: Record<number, number>;
  selectedId: number | null;
  userSongs: { id: number }[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  compact?: boolean;
}

function SongList(p: ListProps) {
  const userIds = useMemo(() => new Set(p.userSongs.map((u) => u.id)), [p.userSongs]);

  if (!p.results.length) {
    return (
      <div className={cn("min-h-0 overflow-y-auto", p.compact && "border-r border-border")}>
        <div className="px-3 py-8 text-center text-xs text-muted-foreground">
          No matches. Try Tamil, Tanglish, a misspelling, or any lyric.
        </div>
      </div>
    );
  }

  // Compact mode (split-view left column) keeps the dense single-column row list.
  if (p.compact) {
    return (
      <div className="min-h-0 overflow-y-auto border-r border-border">
        <ul className="divide-y divide-border/60">
          {p.results.map((h, i) => {
            const song = h.song;
            const slideIdx = p.activeSlideById[song.id] ?? h.slideIndex ?? 0;
            const slide = song.slides[slideIdx] ?? song.content;
            const isSelected = p.selectedId === song.id;
            const isActive = p.activeIdx === i;
            const isProjected = !!p.projectedText && slide && p.projectedText.startsWith(slide.slice(0, 24));
            const isFav = p.favSet.has(song.id);
            const isMine = userIds.has(song.id);
            return (
              <li
                key={song.id}
                onClick={() => { p.setActiveIdx(i); p.onOpen(song); }}
                onDoubleClick={(e) => { e.stopPropagation(); p.onProject(song); }}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-2 px-3 py-2 transition hover:bg-accent/60",
                  isSelected
                    ? "bg-primary/10 border-l-[3px] border-l-primary pl-[9px]"
                    : isActive
                      ? "bg-accent/40 border-l-[3px] border-l-transparent"
                      : "border-l-[3px] border-l-transparent",
                )}
              >
                {/* Slide count chip — at-a-glance density */}
                <div className={cn(
                  "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border text-[10px] font-bold leading-none transition",
                  isSelected ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-muted/50 text-muted-foreground",
                )}>
                  <span className="text-[13px]">{song.slides.length || 1}</span>
                  <span className="mt-0.5 text-[8px] uppercase tracking-wide opacity-70">slide{song.slides.length === 1 ? "" : "s"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("truncate text-[13px] font-semibold leading-tight", isSelected ? "text-primary" : "text-foreground")}>
                      {song.title}
                    </span>
                    {isMine && <span className="shrink-0 rounded bg-emerald-500/15 px-1 text-[9px] font-bold text-emerald-500">MINE</span>}
                    {isFav && <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />}
                    {isProjected && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-1.5 py-px text-[9px] font-bold uppercase text-primary-foreground">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Live
                      </span>
                    )}
                  </div>
                  {song.artist && (
                    <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{song.artist}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); isFav ? p.removeFav(song.id) : p.addFav({ id: song.id, title: song.title }); }}
                    title={isFav ? "Unfavorite" : "Favorite"}
                    className={cn("inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded transition", isFav ? "text-amber-500" : "text-muted-foreground hover:bg-accent")}
                  >
                    <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); p.onEdit(song.id); }} title="Edit lyrics" className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isMine && (
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${song.title}"?`)) p.onDelete(song.id); }} title="Delete" className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Full mode → responsive 2-column wide cards.
  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 gap-2 p-2 @2xl:grid-cols-2">
        {p.results.map((h, i) => {
          const song = h.song;
          const slideIdx = p.activeSlideById[song.id] ?? h.slideIndex ?? 0;
          const slide = song.slides[slideIdx] ?? song.content;
          const isSelected = p.selectedId === song.id;
          const isActive = p.activeIdx === i;
          const isProjected = !!p.projectedText && slide && p.projectedText.startsWith(slide.slice(0, 24));
          const isFav = p.favSet.has(song.id);
          const isMine = userIds.has(song.id);
          return (
            <div
              key={song.id}
              onClick={() => { p.setActiveIdx(i); p.onOpen(song); }}
              onDoubleClick={(e) => { e.stopPropagation(); p.onProject(song); }}
              className={cn(
                "group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-card/80 p-2.5 transition-all",
                "hover:-translate-y-px hover:border-primary/60 hover:shadow-md",
                isProjected ? "border-primary ring-2 ring-primary/40"
                  : isSelected ? "border-primary/60 bg-primary/5"
                  : isActive ? "border-accent" : "border-border",
              )}
            >
              <div className="mb-1 flex min-w-0 items-start gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("truncate text-[13px] font-semibold leading-tight", isSelected ? "text-primary" : "text-foreground")}>
                      {song.title}
                    </span>
                    {isMine && <span className="shrink-0 rounded bg-emerald-500/15 px-1 text-[9px] font-bold text-emerald-500">MINE</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{song.slides.length || 1} slide{song.slides.length === 1 ? "" : "s"}</span>
                    {song.artist && <><span>·</span><span className="truncate">{song.artist}</span></>}
                    {song.scale && <span className="ml-auto rounded bg-muted px-1 text-[9px]">{song.scale}</span>}
                  </div>
                </div>
                {isProjected && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary px-1 py-px text-[9px] font-bold uppercase text-primary-foreground">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Live
                  </span>
                )}
              </div>
              <pre className="line-clamp-3 min-h-[3.6em] whitespace-pre-wrap break-words font-sans text-[12px] leading-snug text-muted-foreground">
                {slide}
              </pre>
              <div className="mt-1.5 flex items-center justify-end gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); isFav ? p.removeFav(song.id) : p.addFav({ id: song.id, title: song.title }); }}
                  title={isFav ? "Unfavorite" : "Favorite"}
                  className={cn("inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded transition", isFav ? "text-amber-500" : "text-muted-foreground hover:bg-accent")}
                >
                  <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); p.onEdit(song.id); }}
                  title="Edit lyrics"
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {isMine && (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${song.title}"?`)) p.onDelete(song.id); }}
                    title="Delete"
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); p.onProject(song); }}
                  title="Project"
                  className="ml-1 inline-flex h-7 items-center gap-1 rounded bg-primary px-2 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Send className="h-3 w-3" /> Project
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Slide pane ───────── */

interface SlideProps {
  song: Song;
  activeSlide: number;
  onSelect: (i: number) => void;
  onProject: (i: number) => void;
  onEdit: () => void;
  onClose: () => void;
  projectedText: string | null;
}

function SlidePane({ song, activeSlide, onSelect, onProject, onEdit, onClose, projectedText }: SlideProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-2 py-1.5">
        <Music className="h-3.5 w-3.5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold">{song.title}</div>
          <div className="text-[10px] text-muted-foreground">
            {song.slides.length} slide{song.slides.length === 1 ? "" : "s"}
            {song.artist ? ` · ${song.artist}` : ""}
          </div>
        </div>
        <button
          onClick={onEdit}
          title="Edit song"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={onClose}
          title="Close"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {/* Slide grid — never more than 2 columns so each card stays wide
            enough for full lyric content without aggressive truncation. */}
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
          {song.slides.map((s, i) => {
            const isActive = activeSlide === i;
            const isProjected = !!projectedText && projectedText.startsWith(s.slice(0, 24));
            const lines = s.split("\n").length;
            return (
              <div
                key={i}
                onClick={() => { onSelect(i); onProject(i); }}
                className={cn(
                  "group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-card/80 transition-all",
                  "hover:-translate-y-px hover:border-primary/70 hover:shadow-md",
                  isProjected ? "border-primary ring-2 ring-primary/40" : isActive ? "border-primary/60" : "border-border",
                )}
              >
                <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Slide {i + 1}</span>
                  <span className="text-muted-foreground/60">· {lines} line{lines === 1 ? "" : "s"}</span>
                  {isProjected && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-1.5 py-px text-[9px] text-primary-foreground">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Live
                    </span>
                  )}
                </div>
                {/* No line-clamp — slide must show full lyric content. */}
                <pre className="flex-1 whitespace-pre-wrap break-words px-3 py-2.5 font-sans text-[14px] leading-relaxed">
                  {s}
                </pre>
                <div className="flex items-center justify-end border-t border-border/40 bg-muted/20 px-2 py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onProject(i); }}
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
    </div>
  );
}
