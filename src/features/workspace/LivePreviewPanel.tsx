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
  Repeat,
  Maximize2,
  Minimize2,
  Gauge,
} from "lucide-react";
import { useProjection } from "@/stores/projection.store";
import { getMedia } from "@/db/repo";
import { db } from "@/db/schema";
import type { MediaRecord } from "@/db/schema";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import { useFocusZone } from "./focus-manager";
import { ProjectionTextStage } from "@/components/ProjectionTextStage";
import { LogoLayer } from "@/components/LogoLayer";
import { useLogo } from "@/stores/logo.store";
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
  const stageRef = useRef<HTMLDivElement>(null);
  const [localTime, setLocalTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [fullPreview, setFullPreview] = useState(false);
  const focus = useFocusZone("preview");
  // Live logo config — mirrors projector exactly.
  const logoEnabled = useLogo((s) => s.enabled);
  const logoCurrent = useLogo((s) => s.current);
  const logoSettings = useLogo((s) => s.settings);
  const localLogo = { enabled: logoEnabled, current: logoCurrent, settings: logoSettings };

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

  // Mirror projector playback — but wait until the projector reports it has
  // actually buffered the video (`videoReady`). This prevents the preview from
  // racing ahead by 5-20s when the projector is still loading the file.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const ready = state?.videoReady !== false; // images don't set it → treat as ready
    if (state?.playing && ready) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [state?.playing, state?.videoReady, url]);

  // Apply projector playback rate to preview so the mirror runs at the same speed.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (state?.playbackRate && isFinite(state.playbackRate)) {
      v.playbackRate = state.playbackRate;
    }
  }, [state?.playbackRate, url]);

  // Drift correction: keep preview within ~250ms of projector's reported time.
  // Tighter than the previous 0.5s window to maintain the <50ms target while
  // avoiding constant micro-seeks.
  useEffect(() => {
    const v = videoRef.current;
    const t = state?.videoCurrentTime;
    if (!v || t == null || scrubbing != null) return;
    if (Math.abs(v.currentTime - t) > 0.25) v.currentTime = t;
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

  const remaining = Math.max(0, (duration || 0) - currentTime);
  const rate = state?.playbackRate ?? 1;
  const isLooping = state?.loop ?? false;
  const cycleRate = () => {
    const steps = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const i = steps.findIndex((s) => Math.abs(s - rate) < 0.01);
    const next = steps[(i + 1) % steps.length];
    send({ type: "RATE", value: next });
    const v = videoRef.current;
    if (v) v.playbackRate = next;
  };

  return (
    <div
      ref={stageRef}
      className={cn(
        "flex h-full min-h-0 flex-col bg-card",
        focus.isActive && "ring-1 ring-primary/40",
        fullPreview && "fixed inset-0 z-50",
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
          onClick={() => (projectorOpen ? closeProjector() : void openProjector())}
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
        {!media && !black && !state?.textOverlay && (
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
        {!media && !black && state?.textOverlay && (
          <ProjectionTextStage
            overlay={state.textOverlay}
            textStyle={state.textStyle}
            groupedStyles={state.groupedStyles}
            logo={localLogo}
          />
        )}

        {black && <div className="absolute inset-0 bg-black" />}

        {/* Logo overlay — mirror of projector */}
        {!black && !state?.textOverlay && <LogoLayer logo={localLogo} />}

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
            <span className="text-[10px] font-semibold">-10</span>
          </IconBtn>
        )}
        {isVideo && (
          <IconBtn onClick={() => jump(-5)} title="Back 5s">
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
          <IconBtn onClick={() => jump(5)} title="Forward 5s">
            <FastForward className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        {isVideo && (
          <IconBtn onClick={() => jump(10)} title="Forward 10s">
            <span className="text-[10px] font-semibold">+10</span>
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
        {isVideo && (
          <IconBtn
            onClick={() => send({ type: "LOOP", value: !isLooping })}
            title={isLooping ? "Disable loop" : "Loop"}
            active={isLooping}
          >
            <Repeat className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        {isVideo && (
          <IconBtn onClick={cycleRate} title={`Playback speed (${rate}x)`}>
            <Gauge className="h-3.5 w-3.5" />
            <span className="ml-1 text-[10px] font-semibold tabular-nums">{rate}x</span>
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
        <IconBtn
          onClick={() => setFullPreview((v) => !v)}
          title={fullPreview ? "Exit full preview" : "Full preview"}
          active={fullPreview}
        >
          {fullPreview ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
        {isVideo && (
          <div className="ml-1 flex items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground">
            <span title="Current">{fmtTime(currentTime)}</span>
            <span>/</span>
            <span title="Duration">{fmtTime(duration)}</span>
            <span className="ml-1 opacity-60" title="Remaining">-{fmtTime(remaining)}</span>
          </div>
        )}
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
              {state?.playing ? (state?.videoReady === false ? "Buffering" : "Playing") : "Paused"}
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

/**
 * Frame-accurate timeline scrubber.
 *
 *  - Custom div-based track so the hover X position and the click/commit
 *    position use the SAME source. Eliminates the click-vs-hover offset
 *    that range-input quantisation (step=0.05s) introduces.
 *  - Single offscreen <video> element (never recreated) that drives a
 *    canvas thumbnail. Seeks are coalesced through requestAnimationFrame
 *    and use `fastSeek` when available — keeps hover under ~100ms even
 *    on hour-long files.
 *  - Fixed 144x80 popup with edge-clamping; never resizes or distorts.
 *  - Only rendered inside the Live Preview. Never in projector output.
 */
function TimelineScrubber({
  src,
  duration,
  currentTime,
  onScrub,
  onCommit,
}: {
  src: string | null;
  duration: number;
  currentTime: number;
  onScrub: (t: number) => void;
  onCommit: (t: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);

  // Coalesce hover seeks: only the most-recent target survives each frame.
  const scheduleSeek = (t: number) => {
    pendingSeekRef.current = t;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const v = previewVideoRef.current;
      const target = pendingSeekRef.current;
      pendingSeekRef.current = null;
      if (!v || target == null || !isFinite(target)) return;
      try {
        // fastSeek jumps to the nearest keyframe (snappy for long files).
        // Hover preview accepts keyframe-snapping; the playhead seek on
        // click uses exact currentTime for frame accuracy.
        const anyV = v as HTMLVideoElement & { fastSeek?: (t: number) => void };
        if (typeof anyV.fastSeek === "function") anyV.fastSeek(target);
        else v.currentTime = target;
      } catch {
        /* ignore */
      }
    });
  };

  const paintFrame = () => {
    const v = previewVideoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const vw = v.videoWidth || 16;
    const vh = v.videoHeight || 9;
    const cw = c.width;
    const ch = c.height;
    const scale = Math.min(cw / vw, ch / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    try {
      ctx.drawImage(v, dx, dy, dw, dh);
    } catch {
      /* drawing may fail mid-seek; repaint on next seeked */
    }
  };

  useEffect(() => {
    const v = previewVideoRef.current;
    if (!v) return;
    const onSeeked = () => paintFrame();
    const onLoaded = () => paintFrame();
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("loadeddata", onLoaded);
    return () => {
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("loadeddata", onLoaded);
    };
  }, [src]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const timeFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track || !duration) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const xWithinRow = (clientX: number): number => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return 0;
    const rowRect = row.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
    return (trackRect.left - rowRect.left) + ratio * trackRect.width;
  };

  const handlePointerMove = (clientX: number) => {
    if (!duration) return;
    const t = timeFromClientX(clientX);
    const x = xWithinRow(clientX);
    setHover({ x, t });
    scheduleSeek(t);
    if (draggingRef.current) onScrub(t);
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div
      ref={rowRef}
      className="relative flex items-center gap-2 border-t border-border bg-background/60 px-2.5 pt-1.5 pb-1"
      onMouseLeave={() => setHover(null)}
    >
      <span className="w-12 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {fmtTime(currentTime)}
      </span>

      {/* Track. Click + drag use the SAME coordinate space as the hover
          popup so the timestamp in the preview is exactly the timestamp
          the playhead jumps to on click — frame accurate. */}
      <div
        ref={trackRef}
        className="group relative h-3 flex-1 cursor-pointer"
        onMouseMove={(e) => handlePointerMove(e.clientX)}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          draggingRef.current = true;
          const t = timeFromClientX(e.clientX);
          onScrub(t);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          handlePointerMove(e.clientX);
        }}
        onPointerUp={(e) => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          const t = timeFromClientX(e.clientX);
          onCommit(t);
        }}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, duration)}
        aria-valuenow={Math.min(currentTime, duration || 0)}
      >
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
        <div
          className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{ width: `${progressRatio * 100}%` }}
        />
        {hover && duration > 0 && (
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-primary/60"
            style={{ left: `${(hover.t / duration) * 100}%` }}
          />
        )}
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-foreground/40 bg-primary shadow"
          style={{ left: `${progressRatio * 100}%` }}
        />
      </div>

      <span className="w-12 font-mono text-[11px] tabular-nums text-muted-foreground">
        {fmtTime(duration)}
      </span>

      {/* Offscreen video that drives the hover thumbnail. Single element,
          never recreated — avoids decoder churn on long files. */}
      {src && (
        <video
          ref={previewVideoRef}
          src={src}
          muted
          playsInline
          preload="auto"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}

      {/* Hover popup — fixed 144x80, edge-clamped, never resized. */}
      {hover && src && (() => {
        const POPUP_WIDTH = 152;
        const rowWidth = rowRef.current?.getBoundingClientRect().width ?? 0;
        const half = POPUP_WIDTH / 2;
        const clampedX = Math.max(half, Math.min(rowWidth - half, hover.x));
        return (
          <div
            className="pointer-events-none absolute bottom-full mb-2 flex flex-col items-center"
            style={{ left: clampedX, transform: "translateX(-50%)", width: POPUP_WIDTH }}
          >
            <div
              className="overflow-hidden rounded-md border border-border bg-black shadow-lg"
              style={{ width: 144, height: 80 }}
            >
              <canvas
                ref={canvasRef}
                width={144}
                height={80}
                style={{ width: 144, height: 80, display: "block" }}
              />
            </div>
            <div className="mt-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white">
              {fmtTime(hover.t)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}


