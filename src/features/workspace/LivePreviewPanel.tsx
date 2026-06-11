import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  MonitorPlay,
  MonitorOff,
  Rewind,
  FastForward,
  RotateCcw,
} from "lucide-react";
import { useProjection } from "@/stores/projection.store";
import { getMedia } from "@/db/repo";
import { db } from "@/db/schema";
import type { MediaRecord } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import { useFocusZone } from "./focus-manager";
import { cn } from "@/lib/utils";


/**
 * Live preview / operator console. Mirrors the projector output and exposes
 * the full transport surface (timeline, scrubbing, jump ±10s, volume,
 * current/total time) that the projector window deliberately omits.
 */
export function LivePreviewPanel() {
  const { state, projectorOpen, openProjector, closeProjector, send } = useProjection();
  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localTime, setLocalTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const focus = useFocusZone("preview");

  // Resolve current media metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!state?.currentMediaId) {
        setMedia(null);
        return;
      }
      const m = await getMedia(state.currentMediaId);
      if (!cancelled) setMedia(m ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.currentMediaId]);

  // Resolve current media blob URL (ref-counted)
  useEffect(() => {
    let cancelled = false;
    let activeKey: string | null = null;
    (async () => {
      if (!media) {
        setUrl(null);
        return;
      }
      const rec = await db().blobs.get(media.blobId);
      if (!rec || cancelled) return;
      activeKey = media.blobId;
      const u = acquireUrl(activeKey, rec.blob);
      setUrl(u);
    })();
    return () => {
      cancelled = true;
      if (activeKey) releaseUrl(activeKey);
    };
  }, [media]);

  // Reset preview video to 0 whenever media changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setLocalTime(0);
  }, [url]);

  // Keep mirrored video roughly in sync with projector playing state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (state?.playing) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [state?.playing, url]);

  // Drift correction: keep preview within ~0.5s of projector's reported time
  useEffect(() => {
    const v = videoRef.current;
    const t = state?.videoCurrentTime;
    if (!v || t == null || scrubbing != null) return;
    if (Math.abs(v.currentTime - t) > 0.5) v.currentTime = t;
  }, [state?.videoCurrentTime, scrubbing]);

  const black = state?.black ?? false;
  const isVideo = media?.type === "video";

  // Prefer projector-reported time/duration; fall back to local preview video.
  const currentTime =
    scrubbing != null
      ? scrubbing
      : state?.videoCurrentTime != null
        ? state.videoCurrentTime
        : localTime;
  const duration =
    state?.videoDurationMs != null && state.videoDurationMs > 0
      ? state.videoDurationMs / 1000
      : localDuration;

  const handleSeek = (t: number) => {
    send({ type: "SEEK", time: t });
    const v = videoRef.current;
    if (v) v.currentTime = t;
  };

  const jump = (delta: number) => {
    if (!isVideo) return;
    const next = Math.max(0, Math.min(duration || 0, currentTime + delta));
    handleSeek(next);
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-card",
        focus.isActive && "ring-1 ring-primary/40",
      )}
      onFocus={focus.onFocus}
      onMouseDown={focus.onFocus}
      tabIndex={focus.tabIndex}
    >
      <PanelHeader
        title="Live Preview"
        subtitle={projectorOpen ? "Mirroring projector" : "Projector not open"}
      >
        <button
          onClick={projectorOpen ? closeProjector : openProjector}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
            projectorOpen
              ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
              : "bg-primary text-primary-foreground hover:opacity-90",
          )}
        >
          {projectorOpen ? (
            <><MonitorOff className="h-3.5 w-3.5" /> Close</>
          ) : (
            <><MonitorPlay className="h-3.5 w-3.5" /> Open</>
          )}
        </button>
      </PanelHeader>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
        {!media && !black && (
          <div className="text-center text-xs text-muted-foreground">
            <div className="font-medium">No media projecting</div>
            <div className="mt-1 opacity-60">Send media to the projector to preview it here</div>
          </div>
        )}
        {media && !black && url && media.type === "image" && (
          <img src={url} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
        )}
        {media && !black && url && media.type === "video" && (
          <video
            ref={videoRef}
            src={url}
            className="max-h-full max-w-full object-contain"
            muted
            playsInline
            loop
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              v.currentTime = 0;
              setLocalDuration(isFinite(v.duration) ? v.duration : 0);
            }}
            onTimeUpdate={(e) => {
              if (scrubbing == null) setLocalTime(e.currentTarget.currentTime);
            }}
            onDurationChange={(e) =>
              setLocalDuration(isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)
            }
          />
        )}
        {black && <div className="absolute inset-0 bg-black" />}

        <div className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              projectorOpen ? "bg-red-500 animate-pulse" : "bg-neutral-500",
            )}
          />
          Live
        </div>
        {state && state.total > 1 && (
          <div className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            {state.index + 1} / {state.total}
          </div>
        )}
      </div>

      {/* Timeline (video only) — with hover thumbnail + timestamp preview */}
      {isVideo && (
        <TimelineScrubber
          src={url}
          duration={duration}
          currentTime={currentTime}
          onScrub={(t) => setScrubbing(t)}
          onCommit={(t) => {
            setScrubbing(null);
            handleSeek(t);
          }}
        />
      )}


      {/* Transport */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-background/60 px-2 py-1.5">
        <IconBtn onClick={() => send({ type: "PREV" })} title="Previous">
          <SkipBack className="h-3.5 w-3.5" />
        </IconBtn>
        {isVideo && (
          <IconBtn onClick={() => jump(-10)} title="Back 10s">
            <Rewind className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        {state?.playing ? (
          <IconBtn onClick={() => send({ type: "PAUSE" })} title="Pause" primary>
            <Pause className="h-3.5 w-3.5" />
          </IconBtn>
        ) : (
          <IconBtn onClick={() => send({ type: "PLAY" })} title="Play" primary>
            <Play className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        {isVideo && (
          <IconBtn onClick={() => jump(10)} title="Forward 10s">
            <FastForward className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        <IconBtn onClick={() => send({ type: "NEXT" })} title="Next">
          <SkipForward className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={() => send({ type: "STOP" })} title="Stop">
          <Square className="h-3.5 w-3.5" />
        </IconBtn>
        {isVideo && (
          <IconBtn onClick={() => handleSeek(0)} title="Restart">
            <RotateCcw className="h-3.5 w-3.5" />
          </IconBtn>
        )}

        <div className="mx-1 h-4 w-px bg-border" />
        <IconBtn
          onClick={() => send({ type: "BLACK", value: !state?.black })}
          title={state?.black ? "Show" : "Black screen"}
          active={state?.black}
        >
          {state?.black ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </IconBtn>
        <div className="mx-1 h-4 w-px bg-border" />
        <IconBtn
          onClick={() => send({ type: "MUTE", value: !state?.muted })}
          title={state?.muted ? "Unmute" : "Mute"}
        >
          {state?.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </IconBtn>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={state?.volume ?? 0.8}
          onChange={(e) => send({ type: "VOLUME", value: Number(e.target.value) })}
          className="h-1 w-20 cursor-pointer accent-primary"
          aria-label="Volume"
        />
        <div className="ml-auto flex items-center gap-2 truncate text-[11px] text-muted-foreground">
          {isVideo && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium uppercase tracking-wide",
                state?.playing
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {state?.playing ? "Playing" : "Paused"}
            </span>
          )}
          <span className="truncate">{media ? media.name : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function PanelHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-muted/30 px-2.5">
      <div className="flex min-w-0 items-baseline gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {title}
        </div>
        {subtitle && <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  primary,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border px-1.5 text-xs transition",
        primary
          ? "border-transparent bg-primary text-primary-foreground hover:opacity-90"
          : active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
