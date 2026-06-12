import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "@/db/schema";
import type { MediaRecord, PlaylistItem, PlaylistRecord, TransitionType } from "@/db/schema";
import { getMedia, getPlaylist, getSettings, touchMedia } from "@/db/repo";
import {
  getChannel,
  DEFAULT_TEXT_STYLE,
  DEFAULT_GROUPED_STYLES,
  type GroupedStyles,
  type LogoBroadcast,
  type ProjectionCommand,
  type ProjectionState,
  type TextOverlay,
  type TextStyle,
} from "@/lib/broadcast";
import { ProjectionTextStage } from "@/components/ProjectionTextStage";
import { LogoLayer } from "@/components/LogoLayer";


type Mode = "idle" | "single" | "slideshow" | "text";

interface RuntimeItem {
  id: string;
  media: MediaRecord;
  blobUrl: string;
  durationMs: number;
  transition: TransitionType;
}

export function ProjectionWindow() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [items, setItems] = useState<RuntimeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [black, setBlack] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [prevItem, setPrevItem] = useState<RuntimeItem | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [groupedStyles, setGroupedStyles] = useState<GroupedStyles>(DEFAULT_GROUPED_STYLES);
  const [logo, setLogo] = useState<LogoBroadcast | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const urlsRef = useRef<string[]>([]);
  const idleHideTimer = useRef<number | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);

  // Cursor auto-hide
  useEffect(() => {
    const onMove = () => {
      setCursorHidden(false);
      if (idleHideTimer.current) clearTimeout(idleHideTimer.current);
      idleHideTimer.current = window.setTimeout(() => setCursorHidden(true), 2000);
    };
    window.addEventListener("mousemove", onMove);
    onMove();
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (idleHideTimer.current) clearTimeout(idleHideTimer.current);
    };
  }, []);

  // Announce open + close
  useEffect(() => {
    const ch = getChannel();
    channelRef.current = ch;
    ch.postMessage({ type: "PROJECTOR_OPEN" });
    const onUnload = () => ch.postMessage({ type: "PROJECTOR_CLOSED" });
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      ch.postMessage({ type: "PROJECTOR_CLOSED" });
      ch.close();
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const broadcastState = useCallback(() => {
    const cur = items[index];
    const v = videoRef.current;
    const state: ProjectionState = {
      type: "STATE",
      mode,
      currentMediaId: cur?.media.id ?? null,
      index,
      total: items.length,
      playing,
      black,
      muted,
      volume,
      playbackRate,
      loop,
      videoReady: cur?.media.type === "video" ? videoReady : undefined,
      videoCurrentTime: v && cur?.media.type === "video" ? v.currentTime : undefined,
      videoDurationMs:
        v && cur?.media.type === "video" && isFinite(v.duration) ? v.duration * 1000 : undefined,
      textOverlay,
      textStyle,
      groupedStyles,
      logo,
    };
    channelRef.current?.postMessage(state);
  }, [mode, items, index, playing, black, muted, volume, playbackRate, loop, videoReady, textOverlay, textStyle, groupedStyles, logo]);


  useEffect(() => {
    broadcastState();
  }, [broadcastState]);

  // Periodic time broadcast while a video is playing
  useEffect(() => {
    const cur = items[index];
    if (!cur || cur.media.type !== "video") return;
    const id = window.setInterval(() => broadcastState(), 250);
    return () => clearInterval(id);
  }, [items, index, broadcastState]);


  const loadMediaUrl = async (m: MediaRecord): Promise<string> => {
    const rec = await db().blobs.get(m.blobId);
    if (!rec) throw new Error("Missing blob");
    const url = URL.createObjectURL(rec.blob);
    urlsRef.current.push(url);
    return url;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Schedule auto-advance for current item (images only; videos advance on `ended`)
  const scheduleAdvance = useCallback(
    (cur: RuntimeItem | undefined) => {
      clearTimer();
      if (!cur || !playing) return;
      if (cur.media.type === "image" && items.length > 1) {
        timerRef.current = window.setTimeout(() => goNext(), cur.durationMs);
      }
    },
    [playing, items.length], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const goNext = useCallback(() => {
    setPrevItem(items[index] ?? null);
    setTransitioning(true);
    setIndex((i) => {
      if (items.length === 0) return 0;
      const next = (i + 1) % items.length;
      return next;
    });
    setTimeout(() => setTransitioning(false), 600);
  }, [items, index]);

  const goPrev = useCallback(() => {
    setPrevItem(items[index] ?? null);
    setTransitioning(true);
    setIndex((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
    setTimeout(() => setTransitioning(false), 600);
  }, [items, index]);

  // When item changes, reschedule
  useEffect(() => {
    scheduleAdvance(items[index]);
    if (items[index]) void touchMedia(items[index].media.id);
    return () => clearTimer();
  }, [index, items, scheduleAdvance]);

  // Video ended -> advance
  const onVideoEnded = () => {
    if (items.length > 1) goNext();
    else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    }
  };

  const loadSingle = async (mediaId: string) => {
    const m = await getMedia(mediaId);
    if (!m) return;
    const settings = await getSettings();
    const url = await loadMediaUrl(m);
    setPrevItem(items[index] ?? null);
    setTransitioning(true);
    setItems([
      {
        id: "single",
        media: m,
        blobUrl: url,
        durationMs: settings.defaultImageDurationMs,
        transition: settings.defaultTransition,
      },
    ]);
    setIndex(0);
    setMode("single");
    setPlaying(true);
    setBlack(false);
    setTimeout(() => setTransitioning(false), 600);
  };

  const loadPlaylist = async (playlistId: string, startIndex = 0) => {
    const p: PlaylistRecord | undefined = await getPlaylist(playlistId);
    if (!p || p.items.length === 0) return;
    const settings = await getSettings();
    const runtime: RuntimeItem[] = [];
    for (const it of p.items as PlaylistItem[]) {
      const m = await getMedia(it.mediaId);
      if (!m) continue;
      const url = await loadMediaUrl(m);
      runtime.push({
        id: it.id,
        media: m,
        blobUrl: url,
        durationMs: it.durationMs || settings.defaultImageDurationMs,
        transition: it.transition || settings.defaultTransition,
      });
    }
    if (!runtime.length) return;
    setItems(runtime);
    setIndex(Math.min(startIndex, runtime.length - 1));
    setMode("slideshow");
    setPlaying(true);
    setBlack(false);
  };

  // Command listener
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const handler = async (ev: MessageEvent) => {
      const cmd = ev.data as ProjectionCommand;
      if (!cmd?.type) return;
      switch (cmd.type) {
        case "LOAD":
          setVideoReady(false);
          setTextOverlay(null);
          await loadSingle(cmd.mediaId);
          break;
        case "LOAD_PLAYLIST":
          setVideoReady(false);
          setTextOverlay(null);
          await loadPlaylist(cmd.playlistId, cmd.startIndex ?? 0);
          break;
        case "LOAD_TEXT":
          // Projecting non-media content. Stop any media playback first so the
          // overlay owns the screen, then store the overlay payload.
          // CRITICAL: We also clear prevItem and revoke all blob URLs so no
          // background media can ever silently resume while the operator is
          // working inside the Bible / Songs / Text tabs.
          setVideoReady(false);
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute("src");
            videoRef.current.load();
          }
          clearTimer();
          urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
          urlsRef.current = [];
          setItems([]);
          setPrevItem(null);
          setTransitioning(false);
          setIndex(0);
          setMode("text");
          setPlaying(false);
          setBlack(false);
          setTextOverlay(cmd.overlay);
          if (cmd.style) setTextStyle(cmd.style);
          if (cmd.styles) setGroupedStyles(cmd.styles);
          break;
        case "UPDATE_TEXT_STYLE":
          setTextStyle(cmd.style);
          break;
        case "UPDATE_STYLES":
          setGroupedStyles(cmd.styles);
          break;
        case "UPDATE_BACKGROUND":
          setGroupedStyles((g) => ({ ...g, background: cmd.background }));
          break;
        case "UPDATE_LOGO":
          setLogo(cmd.logo);
          break;

        case "PLAY":
          setPlaying(true);
          if (videoRef.current) void videoRef.current.play();
          break;
        case "PAUSE":
          setPlaying(false);
          if (videoRef.current) videoRef.current.pause();
          clearTimer();
          break;
        case "NEXT":
          goNext();
          break;
        case "PREV":
          goPrev();
          break;
        case "STOP":
          setPlaying(false);
          setItems([]);
          setIndex(0);
          setMode("idle");
          setTextOverlay(null);
          clearTimer();
          urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
          urlsRef.current = [];
          break;
        case "SEEK":
          if (videoRef.current) videoRef.current.currentTime = cmd.time;
          break;
        case "VOLUME":
          setVolume(cmd.value);
          if (videoRef.current) videoRef.current.volume = cmd.value;
          break;
        case "MUTE":
          setMuted(cmd.value);
          if (videoRef.current) videoRef.current.muted = cmd.value;
          break;
        case "RATE":
          setPlaybackRate(cmd.value);
          if (videoRef.current) videoRef.current.playbackRate = cmd.value;
          break;
        case "LOOP":
          setLoop(cmd.value);
          if (videoRef.current) videoRef.current.loop = cmd.value;
          break;
        case "BLACK":
          setBlack(cmd.value);
          break;
        case "PING":
          broadcastState();
          break;
      }
    };
    ch.addEventListener("message", handler);
    return () => ch.removeEventListener("message", handler);
  }, [goNext, goPrev, broadcastState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply volume/muted to video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Initial settings: volume
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setVolume(s.defaultVolume);
      setMuted(s.muteOnStart);
    })();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key.toLowerCase() === "b") setBlack((b) => !b);
      else if (e.key === "Escape") window.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const cur = items[index];

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black"
      style={{ cursor: cursorHidden ? "none" : "default" }}
    >
      {/* Previous layer for crossfade */}
      {prevItem && transitioning && prevItem.media.type === "image" && (
        <img
          key={"prev-" + prevItem.id}
          src={prevItem.blobUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
          style={{ opacity: transitioning ? 0 : 1 }}
        />
      )}

      {/* Current */}
      {cur && !black && cur.media.type === "image" && (
        <img
          key={"cur-" + cur.id + "-" + index}
          src={cur.blobUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-contain ${transitionClass(cur.transition)}`}
        />
      )}

      {cur && !black && cur.media.type === "video" && (
        <video
          ref={videoRef}
          key={"vid-" + cur.id + "-" + index + "-" + cur.blobUrl}
          src={cur.blobUrl}
          autoPlay={playing}
          loop={loop}
          onEnded={onVideoEnded}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget as HTMLVideoElement;
            v.currentTime = 0;
            v.playbackRate = playbackRate;
            v.volume = volume;
            v.muted = muted;
            broadcastState();
          }}
          onCanPlay={() => {
            setVideoReady(true);
            broadcastState();
          }}
          onPlaying={() => {
            setVideoReady(true);
            broadcastState();
          }}
          onWaiting={() => {
            setVideoReady(false);
            broadcastState();
          }}
          onTimeUpdate={() => broadcastState()}
          onDurationChange={() => broadcastState()}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
        />
      )}


      {/* Text overlay (Bible / Songs / Text) — same renderer used by Live Preview. */}
      {textOverlay && !black && !cur && (
        <ProjectionTextStage
          overlay={textOverlay}
          textStyle={textStyle}
          groupedStyles={groupedStyles}
          logo={logo}
        />
      )}


      {/* Black */}
      {black && <div className="absolute inset-0 bg-black" />}

      {/* Logo — global, always on top, never inside the black overlay. */}
      {!black && !textOverlay && <LogoLayer logo={logo} />}

      {/* Idle */}
      {!cur && !black && !textOverlay && (
        <div className="flex h-full items-center justify-center text-neutral-700">
          <div className="text-center">
            <div className="text-2xl font-semibold">Church Media — Projector</div>
            <div className="mt-1 text-sm">Waiting for media…</div>
          </div>
        </div>
      )}
    </div>
  );
}

function transitionClass(t: TransitionType): string {
  switch (t) {
    case "fade":
    case "crossfade":
    case "dissolve":
      return "animate-in fade-in duration-500";
    case "zoom":
      return "animate-in fade-in zoom-in-95 duration-500";
    case "none":
    default:
      return "";
  }
}
