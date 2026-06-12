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
import { projectSongSlide } from "@/projection/adapters/song.adapter";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SongEditorDialog } from "./SongEditorDialog";

type SongFilter = "all" | "favorites" | "recent" | "mine";
const FILTER_LABELS: Record<SongFilter, string> = {
  all: "All Songs",
  favorites: "Favorites",
  recent: "Recently Used",
  mine: "My Songs",
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
  const projectedRef = useProjection((s) => s.state?.textOverlay?.text ?? null);
  const recent = useSongsRecent((s) => s.items);
  const pushRecent = useSongsRecent((s) => s.push);

  useEffect(() => { void ensureLoaded(); }, [ensureLoaded]);

  useEffect(() => {
    if (!loaded) return;
    const songs = getSongs();
    if (!songs) return;
    const q = query.trim();
    if (!q) {
      const out: SongHit[] = [];
      const seen = new Set<number>();
      for (const u of userSongs) {
        const s = songs.find((x) => x.id === u.id);
        if (s && !seen.has(s.id)) {
          out.push({ song: s, score: 0, slideIndex: 0, matched: [] });
          seen.add(s.id);
        }
      }
      for (const r of recent) {
        if (seen.has(r.songId)) continue;
        const s = songs.find((x) => x.id === r.songId);
        if (s) { out.push({ song: s, score: 0, slideIndex: r.slideIndex, matched: [] }); seen.add(s.id); }
      }
      for (let i = 0; i < songs.length && out.length < 40; i++) {
        if (seen.has(songs[i].id)) continue;
        out.push({ song: songs[i], score: 0, slideIndex: 0, matched: [] });
      }
      setResults(out);
      setSearchMs(null);
      setActiveIdx(0);
      return;
    }
    const t0 = performance.now();
    const hits = searchSongs(q, songs, 120);
    setSearchMs(performance.now() - t0);
    setResults(hits);
    setActiveIdx(0);
  }, [query, loaded, recent, userSongs]);

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

  // ── shortcuts ──
  useShortcut({ id: "songs.focus-search", label: "Focus song search", category: "songs", keys: ["/"], scope: "songs", handler: () => inputRef.current?.focus() });
  useShortcut({ id: "songs.next", label: "Next song", category: "songs", keys: ["ArrowDown"], scope: "songs", allowInInput: true, priority: 20, handler: () => setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1))) });
  useShortcut({ id: "songs.prev", label: "Previous song", category: "songs", keys: ["ArrowUp"], scope: "songs", allowInInput: true, priority: 20, handler: () => setActiveIdx((i) => Math.max(0, i - 1)) });
  useShortcut({ id: "songs.open", label: "Open selected song", category: "songs", keys: ["Enter"], scope: "songs", allowInInput: true, priority: 20, handler: () => {
    const h = results[activeIdx]; if (!h) return;
    if (selectedSongId === h.song.id) project(h.song, activeSlideById[h.song.id] ?? 0);
    else openSong(h.song);
  } });
  useShortcut({ id: "songs.next-slide", label: "Next slide", category: "songs", keys: ["ArrowRight"], scope: "songs", allowInInput: true, priority: 20, handler: () => {
    if (!selectedSong) return;
    const cur = activeSlideById[selectedSong.id] ?? 0;
    const next = Math.min(cur + 1, selectedSong.slides.length - 1);
    if (next !== cur) project(selectedSong, next);
  } });
  useShortcut({ id: "songs.prev-slide", label: "Previous slide", category: "songs", keys: ["ArrowLeft"], scope: "songs", allowInInput: true, priority: 20, handler: () => {
    if (!selectedSong) return;
    const cur = activeSlideById[selectedSong.id] ?? 0;
    const prev = Math.max(0, cur - 1);
    if (prev !== cur) project(selectedSong, prev);
  } });
  useShortcut({ id: "songs.close", label: "Close song", category: "songs", keys: ["Escape"], scope: "songs", allowInInput: true, handler: () => selectSong(null) });

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
            placeholder="yesu · anbu · vaazhvu · இயேசு · title · lyric…"
            className="h-8 pl-7 text-sm"
            autoFocus
          />
        </div>
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
  return (
    <div className={cn("min-h-0 overflow-y-auto border-border", p.compact && "border-r")}>
      {!p.results.length && (
        <div className="px-3 py-8 text-center text-xs text-muted-foreground">
          No matches. Try Tamil, Tanglish, a misspelling, or any lyric.
        </div>
      )}
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
                "group relative flex cursor-pointer items-start gap-2 px-2.5 py-1.5 transition",
                "hover:bg-accent/60",
                isSelected ? "bg-primary/10" : isActive ? "bg-accent/40" : "",
                isSelected && "border-l-2 border-l-primary",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("truncate text-[12px] font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                    {song.title}
                  </span>
                  {isMine && <span className="rounded bg-emerald-500/15 px-1 text-[9px] font-bold text-emerald-500">MINE</span>}
                  {song.scale && <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">{song.scale}</span>}
                  {isProjected && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-1 py-px text-[9px] font-bold uppercase text-primary-foreground">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Live
                    </span>
                  )}
                </div>
                {!p.compact && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {slide.split("\n")[0]}
                  </p>
                )}
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{song.slides.length || 1} slide{song.slides.length === 1 ? "" : "s"}</span>
                  {song.artist && <><span>·</span><span className="truncate">{song.artist}</span></>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); isFav ? p.removeFav(song.id) : p.addFav({ id: song.id, title: song.title }); }}
                  title={isFav ? "Unfavorite" : "Favorite"}
                  className={cn("inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded transition", isFav ? "text-amber-500" : "text-muted-foreground hover:bg-accent")}
                >
                  <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                </button>
                {isMine && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); p.onEdit(song.id); }} title="Edit" className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${song.title}"?`)) p.onDelete(song.id); }} title="Delete" className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); p.onProject(song); }}
                  title="Project (Enter on selected)"
                  className="inline-flex h-6 items-center gap-1 rounded bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────── Slide pane ───────── */

interface SlideProps {
  song: Song;
  activeSlide: number;
  onSelect: (i: number) => void;
  onProject: (i: number) => void;
  onClose: () => void;
  projectedText: string | null;
}

function SlidePane({ song, activeSlide, onSelect, onProject, onClose, projectedText }: SlideProps) {
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
          onClick={onClose}
          title="Close"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
          {song.slides.map((s, i) => {
            const isActive = activeSlide === i;
            const isProjected = !!projectedText && projectedText.startsWith(s.slice(0, 24));
            return (
              <div
                key={i}
                onClick={() => { onSelect(i); onProject(i); }}
                className={cn(
                  "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-card/80 transition-all",
                  "hover:-translate-y-px hover:border-primary/70 hover:shadow-md",
                  isProjected ? "border-primary ring-2 ring-primary/40" : isActive ? "border-primary/60" : "border-border",
                )}
              >
                <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Slide {i + 1}</span>
                  {isProjected && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-1 py-px text-[9px] text-primary-foreground">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-primary-foreground" /> Live
                    </span>
                  )}
                </div>
                <pre className="line-clamp-6 flex-1 whitespace-pre-wrap px-2.5 py-2 font-sans text-[13px] leading-snug">
                  {s}
                </pre>
                <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">
                    {s.split("\n").length} line{s.split("\n").length === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onProject(i); }}
                    className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:opacity-90"
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
