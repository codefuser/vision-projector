import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Square,
  Play,
  Pause,
  Radio,
} from "lucide-react";
import { getPlaylist, listAllMedia } from "@/db/repo";
import type { MediaRecord, PlaylistRecord } from "@/db/schema";
import { Thumb } from "@/components/Thumb";
import { MediaAdapter, projectionEngine } from "@/projection";
import { useProjection } from "@/stores/projection.store";
import { formatDuration } from "@/lib/files";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Service Mode — live cue runner.
 *
 * Owns its own cursor (we don't rely on the projector's auto-advance) so the
 * operator stays in full control: NEXT/PREV move the cursor and project the
 * resolved cue via the existing MediaAdapter, which keeps preview/projector
 * in sync through the unified projection engine.
 */
export function ServiceMode({ id }: { id: string }) {
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistRecord | null>(null);
  const [mediaMap, setMediaMap] = useState<Map<string, MediaRecord>>(new Map());
  const [cursor, setCursor] = useState(0);
  const projection = useProjection();
  const armedRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const p = await getPlaylist(id);
      if (!p) return;
      setPlaylist(p);
      const all = await listAllMedia();
      setMediaMap(new Map(all.map((m) => [m.id, m])));
    })();
  }, [id]);

  // Open the projector once when entering service mode.
  useEffect(() => {
    if (!playlist || armedRef.current) return;
    armedRef.current = true;
    if (!projection.projectorOpen) projection.openProjector();
    // Project the first cue automatically when ready.
    void projectAt(0, playlist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist]);

  const projectAt = useCallback(
    async (idx: number, p?: PlaylistRecord) => {
      const list = p ?? playlist;
      if (!list || !list.items.length) return;
      const safe = Math.max(0, Math.min(list.items.length - 1, idx));
      const item = list.items[safe];
      const record = mediaMap.get(item.mediaId);
      if (record) {
        await MediaAdapter.projectMedia(record);
      } else {
        const { getMedia } = await import("@/db/repo");
        const fetched = await getMedia(item.mediaId);
        if (fetched) await MediaAdapter.projectMedia(fetched);
        else toast.error("Missing media for this cue");
      }
      setCursor(safe);
    },
    [playlist, mediaMap],
  );

  const goNext = useCallback(() => {
    if (!playlist) return;
    if (cursor >= playlist.items.length - 1) {
      toast.info("End of service flow");
      return;
    }
    void projectAt(cursor + 1);
  }, [playlist, cursor, projectAt]);

  const goPrev = useCallback(() => {
    if (!playlist || cursor <= 0) return;
    void projectAt(cursor - 1);
  }, [playlist, cursor, projectAt]);

  const goTo = useCallback((i: number) => void projectAt(i), [projectAt]);

  const togglePlay = useCallback(() => {
    const playing = projection.state?.playing ?? false;
    if (playing) projectionEngine.pause();
    else projectionEngine.play();
  }, [projection.state?.playing]);

  const toggleBlack = useCallback(() => {
    projectionEngine.setBlack(!(projection.state?.black ?? false));
  }, [projection.state?.black]);

  const stopAll = useCallback(() => {
    projectionEngine.stop();
  }, []);

  const exit = useCallback(() => {
    navigate({ to: "/playlists/$id", params: { id } });
  }, [navigate, id]);

  // Keyboard shortcuts — service-mode scope
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleBlack();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, toggleBlack, togglePlay, exit]);

  const currentItem = playlist?.items[cursor];
  const nextItem = playlist?.items[cursor + 1];
  const currentMedia = currentItem ? mediaMap.get(currentItem.mediaId) : undefined;
  const nextMedia = nextItem ? mediaMap.get(nextItem.mediaId) : undefined;

  const remainingMs = useMemo(() => {
    if (!playlist) return 0;
    let sum = 0;
    for (let i = cursor; i < playlist.items.length; i++) {
      const it = playlist.items[i];
      const m = mediaMap.get(it.mediaId);
      if (m?.type === "video") sum += m.durationMs ?? it.durationMs ?? 0;
      else sum += it.durationMs ?? 0;
    }
    return sum;
  }, [playlist, mediaMap, cursor]);

  if (!playlist) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading service…</div>;
  }

  if (!playlist.items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>This playlist has no cues.</p>
        <Link
          to="/playlists/$id"
          params={{ id }}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to editor
        </Link>
      </div>
    );
  }

  const playing = projection.state?.playing ?? false;
  const black = projection.state?.black ?? false;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={exit}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-accent"
            title="Exit Service Mode (Esc)"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit
          </button>
          <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Radio className="h-3.5 w-3.5" /> Service Mode
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{playlist.name}</div>
            <div className="text-[11px] text-muted-foreground">
              Cue {cursor + 1} of {playlist.items.length} · est. remaining {formatDuration(remainingMs)}
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-[11px] text-muted-foreground md:flex">
          <kbd className="rounded border px-1.5 py-0.5">Space</kbd> Next ·
          <kbd className="rounded border px-1.5 py-0.5">←</kbd> Prev ·
          <kbd className="rounded border px-1.5 py-0.5">B</kbd> Black ·
          <kbd className="rounded border px-1.5 py-0.5">P</kbd> Play/Pause ·
          <kbd className="rounded border px-1.5 py-0.5">Esc</kbd> Exit
        </div>
      </div>

      {/* Main */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        {/* Live + Next + Transport */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
            <CuePanel
              title="ON SCREEN"
              accent="primary"
              item={currentItem}
              media={currentMedia}
            />
            <CuePanel
              title="NEXT UP"
              accent="muted"
              item={nextItem}
              media={nextMedia}
              empty="End of service"
            />
          </div>

          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-5">
            <ControlButton onClick={goPrev} disabled={cursor === 0} icon={<ChevronLeft className="h-5 w-5" />}>
              Prev
            </ControlButton>
            <ControlButton
              onClick={togglePlay}
              icon={playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            >
              {playing ? "Pause" : "Play"}
            </ControlButton>
            <ControlButton
              onClick={toggleBlack}
              icon={<EyeOff className="h-5 w-5" />}
              tone={black ? "warning" : undefined}
            >
              {black ? "Unblack" : "Black"}
            </ControlButton>
            <ControlButton onClick={stopAll} icon={<Square className="h-5 w-5" />} tone="danger">
              Stop
            </ControlButton>
            <button
              onClick={goNext}
              disabled={cursor >= playlist.items.length - 1}
              className="col-span-2 inline-flex h-16 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
              title="Next cue (Space)"
            >
              <ChevronRight className="h-6 w-6" /> NEXT
            </button>
          </div>
        </div>

        {/* Cue list */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="shrink-0 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cue list
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {playlist.items.map((it, idx) => {
              const m = mediaMap.get(it.mediaId);
              const isCurrent = idx === cursor;
              const isNext = idx === cursor + 1;
              return (
                <button
                  key={it.id}
                  onClick={() => goTo(idx)}
                  className={cn(
                    "mb-1 flex w-full cursor-pointer items-center gap-2 rounded-md border px-1.5 py-1.5 text-left transition",
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : isNext
                        ? "border-primary/30 bg-accent/40"
                        : "border-transparent hover:bg-accent/40",
                  )}
                  title={it.notes || (it.label || m?.name)}
                >
                  <div className="w-5 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
                    {idx + 1}
                  </div>
                  {m ? <Thumb media={m} className="h-10 w-16 shrink-0 rounded" /> : <div className="h-10 w-16 shrink-0 rounded bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{it.label || m?.name || "Missing"}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {m?.type === "video"
                        ? `Video · ${formatDuration(m.durationMs)}`
                        : m?.type === "image"
                          ? `Image · ${Math.round(it.durationMs / 1000)}s`
                          : "Missing media"}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                      Live
                    </span>
                  )}
                  {isNext && (
                    <span className="rounded border border-primary/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">
                      Next
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CuePanel({
  title,
  accent,
  item,
  media,
  empty,
}: {
  title: string;
  accent: "primary" | "muted";
  item: { id: string; label?: string; notes?: string; durationMs: number } | undefined;
  media: MediaRecord | undefined;
  empty?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card",
        accent === "primary" ? "border-primary/60 shadow-[0_0_0_1px_rgba(0,0,0,0)]" : "border-border",
      )}
    >
      <div
        className={cn(
          "shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest",
          accent === "primary" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {title}
      </div>
      <div className="flex flex-1 items-center justify-center bg-black/80">
        {media ? (
          <Thumb media={media} className="h-full w-full" />
        ) : (
          <div className="text-xs text-muted-foreground">{empty ?? "—"}</div>
        )}
      </div>
      {item && (
        <div className="shrink-0 border-t border-border bg-card px-3 py-2">
          <div className="truncate text-sm font-medium">{item.label || media?.name || "Cue"}</div>
          <div className="text-[11px] text-muted-foreground">
            {media?.type === "video"
              ? `Video · ${formatDuration(media.durationMs)}`
              : media?.type === "image"
                ? `Image · ${Math.round(item.durationMs / 1000)}s`
                : ""}
          </div>
          {item.notes && (
            <div className="mt-1 rounded bg-accent/40 px-2 py-1 text-[11px] italic text-foreground">
              {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ControlButton({
  children,
  icon,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "warning";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : tone === "warning"
            ? "border-amber-500/50 bg-amber-500/15 text-amber-600 hover:bg-amber-500/25"
            : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
