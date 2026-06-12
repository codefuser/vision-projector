/**
 * GlobalFavoritesDock — always-visible right-edge rail listing Bible, Songs,
 * Media, and Text favorites. Collapsible to a thin icon strip. Mounted once
 * in the root layout so the operator can recall favorites from any module
 * during live preaching.
 */
import { Star, BookOpen, Music, Image as ImageIcon, Type, ChevronRight, ChevronLeft, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useBibleStore } from "@/lib/bible/store";
import { useSongsStore } from "@/lib/songs/store";
import { useMediaFavorites } from "@/stores/media-favorites.store";
import { useFavoritesDock, type FavoritesGroup } from "@/stores/favorites-dock.store";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { activateBibleFavorite, activateMediaFavorite, activateSongFavorite } from "@/lib/favorites/dispatch";
import { getMedia } from "@/db/repo";
import type { MediaRecord } from "@/db/schema";
import { cn } from "@/lib/utils";

export function GlobalFavoritesDock() {
  const { open, group, toggle, setGroup } = useFavoritesDock();
  const navigate = useNavigate();
  const bibleFavorites = useBibleStore((s) => s.favorites);
  const removeBibleFav = useBibleStore((s) => s.removeFavorite);
  const songFavorites = useSongsStore((s) => s.favorites);
  const removeSongFav = useSongsStore((s) => s.removeFavorite);
  const mediaFavIds = useMediaFavorites((s) => s.ids);
  const removeMediaFav = useMediaFavorites((s) => s.remove);
  const [mediaItems, setMediaItems] = useState<MediaRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = (await Promise.all(mediaFavIds.map((id) => getMedia(id))))
        .filter((m): m is MediaRecord => !!m);
      if (!cancelled) setMediaItems(items);
    })();
    return () => { cancelled = true; };
  }, [mediaFavIds]);

  useShortcut({
    id: "favorites.toggle-dock",
    label: "Toggle Favorites dock",
    category: "general",
    keys: ["Alt+Shift+F"],
    scope: "global" as never,
    handler: () => toggle(),
    allowInInput: true,
  });

  // Collapsed → icon rail
  if (!open) {
    return (
      <div className="fixed right-0 top-12 z-40 flex flex-col items-center gap-1 rounded-l-lg border border-r-0 border-border bg-card/95 p-1 shadow-lg backdrop-blur">
        <button
          onClick={toggle}
          title="Open Favorites (Alt+Shift+F)"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-amber-500 hover:bg-accent"
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
        <ChevronLeft className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  const counts = {
    bible: bibleFavorites.length,
    songs: songFavorites.length,
    media: mediaItems.length,
    text: 0,
  };

  return (
    <div className="fixed right-0 top-12 z-40 flex h-[calc(100vh-3.5rem)] w-56 flex-col rounded-l-lg border border-r-0 border-border bg-card/95 shadow-xl backdrop-blur">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-muted/40 px-2">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <div className="text-[11px] font-semibold uppercase tracking-wide">Favorites</div>
        <button
          onClick={toggle}
          title="Collapse"
          className="ml-auto inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-b border-border bg-background/40 p-1">
        {(
          [
            { id: "bible", label: "Bible", icon: BookOpen },
            { id: "songs", label: "Songs", icon: Music },
            { id: "media", label: "Media", icon: ImageIcon },
            { id: "text", label: "Text", icon: Type },
          ] as { id: FavoritesGroup; label: string; icon: React.ComponentType<{ className?: string }> }[]
        ).map((g) => {
          const Icon = g.icon;
          const active = g.id === group;
          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              title={g.label}
              className={cn(
                "inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded px-1 text-[10px] font-medium transition",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{counts[g.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {group === "bible" && (
          bibleFavorites.length === 0 ? (
            <Empty hint="Star a verse in the Bible tab." />
          ) : (
            <ul className="space-y-0.5">
              {bibleFavorites.map((f) => (
                <FavRow
                  key={f.id}
                  label={f.ref}
                  sub={f.text}
                  onActivate={() => activateBibleFavorite(navigate, f.book, f.chapter, f.verse, f.displayMode)}
                  onRemove={() => removeBibleFav(f.id)}
                />
              ))}
            </ul>
          )
        )}
        {group === "media" && (
          mediaItems.length === 0 ? (
            <Empty hint="Star media in the Library to pin it here." />
          ) : (
            <ul className="space-y-0.5">
              {mediaItems.map((m) => (
                <FavRow
                  key={m.id}
                  label={m.name}
                  sub={m.type}
                  onActivate={() => activateMediaFavorite(m.id)}
                  onRemove={() => removeMediaFav(m.id)}
                />
              ))}
            </ul>
          )
        )}
        {group === "songs" && (
          songFavorites.length === 0 ? (
            <Empty hint="Star a song in the Songs tab." />
          ) : (
            <ul className="space-y-0.5">
              {songFavorites.map((f) => (
                <FavRow
                  key={f.id}
                  label={f.title}
                  onActivate={() => activateSongFavorite(f.id, 0)}
                  onRemove={() => removeSongFav(f.id)}
                />
              ))}
            </ul>
          )
        )}
        {group === "text" && <Empty hint="Text module coming soon." />}
      </div>
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="flex h-full items-center justify-center px-3 text-center text-[10px] text-muted-foreground">
      {hint}
    </div>
  );
}

function FavRow({
  label, sub, onActivate, onRemove,
}: {
  label: string; sub?: string; onActivate: () => void; onRemove: () => void;
}) {
  return (
    <li className="group flex items-center gap-1 rounded px-1.5 py-1 hover:bg-accent/60">
      <button
        onClick={onActivate}
        title={`Project ${label}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
      >
        <Send className="h-3 w-3 shrink-0 text-primary opacity-60 group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-medium leading-tight">{label}</div>
          {sub && <div className="truncate text-[9px] text-muted-foreground">{sub}</div>}
        </div>
      </button>
      <button
        onClick={onRemove}
        title="Remove favorite"
        className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </li>
  );
}
