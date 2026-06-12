/**
 * BackgroundLayer — renders a color / gradient / image / video underlay for
 * projected text, plus an optional animated decorative overlay (particles,
 * bokeh, light rays, sparkles, floating cross, soft glow, gradient shift)
 * and a coloured overlay tint.
 *
 * Layer order (bottom → top, inside this component):
 *   1. Base color / gradient
 *   2. Media (image or video)
 *   3. Coloured overlay tint
 *   4. Animation decorative overlay
 *
 * Animations are pure CSS (see styles.css `.bg-anim-*`). The media element
 * is keyed on `mediaId` alone so brightness / opacity / zoom slider drags
 * never reload the video.
 */
import { useEffect, useRef, useState } from "react";
import type { BackgroundConfig, BackgroundAnimation } from "@/lib/broadcast";
import { db } from "@/db/schema";
import type { MediaRecord } from "@/db/schema";
import { getMedia } from "@/db/repo";
import { acquireUrl, releaseUrl } from "@/lib/blob-url";
import { useBackground } from "@/stores/background.store";

interface Props { background: BackgroundConfig; }

interface Resolved {
  kind: BackgroundConfig["kind"];
  color: string;
  mediaId: string | null;
  fit: "cover" | "contain" | "stretch";
  opacity: number;
  blur: number;
  brightness: number;
  contrast: number;
  zoom: number;
  positionX: number;
  positionY: number;
  gradient: string | null;
  animation: BackgroundAnimation;
  overlayColor: string;
  overlayOpacity: number;
  videoLoop: boolean;
  videoMuted: boolean;
  videoSpeed: number;
}

function withDefaults(bg: BackgroundConfig): Resolved {
  return {
    kind: bg.kind,
    color: bg.color,
    mediaId: bg.mediaId,
    fit: bg.fit ?? "cover",
    opacity: bg.opacity ?? 1,
    blur: bg.blur ?? 0,
    brightness: bg.brightness ?? 1,
    contrast: bg.contrast ?? 1,
    zoom: bg.zoom ?? 1,
    positionX: bg.positionX ?? 50,
    positionY: bg.positionY ?? 50,
    gradient: bg.gradient ?? null,
    animation: bg.animation ?? "none",
    overlayColor: bg.overlayColor ?? "#000000",
    overlayOpacity: bg.overlayOpacity ?? 0,
    videoLoop: bg.videoLoop ?? true,
    videoMuted: bg.videoMuted ?? true,
    videoSpeed: bg.videoSpeed ?? 1,
  };
}

export function BackgroundLayer({ background }: Props) {
  const bg = withDefaults(background);
  // Master toggles: if background is globally off, render nothing.
  // Particles toggle suppresses particle-family animations; motion toggle
  // suppresses everything else.
  const backgroundEnabled = useBackground((s) => s.backgroundEnabled);
  const motionEnabled = useBackground((s) => s.motionEnabled);
  const particlesEnabled = useBackground((s) => s.particlesEnabled);

  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (bg.kind !== "media" || !bg.mediaId) { setMedia(null); return; }
    (async () => {
      const m = await getMedia(bg.mediaId!);
      if (!cancelled) setMedia(m ?? null);
    })();
    return () => { cancelled = true; };
  }, [bg.kind, bg.mediaId]);

  useEffect(() => {
    let cancelled = false;
    let key: string | null = null;
    (async () => {
      if (!media) { setUrl(null); return; }
      const rec = await db().blobs.get(media.blobId);
      if (!rec || cancelled) return;
      key = media.blobId;
      setUrl(acquireUrl(key, rec.blob));
    })();
    return () => { cancelled = true; if (key) releaseUrl(key); };
  }, [media]);

  // Live-apply video controls without reloading the element.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.loop = bg.videoLoop;
    v.muted = bg.videoMuted;
    v.playbackRate = Math.max(0.1, Math.min(4, bg.videoSpeed));
  }, [bg.videoLoop, bg.videoMuted, bg.videoSpeed]);

  if (!backgroundEnabled) return null;

  const animationKind: BackgroundAnimation = (() => {
    if (!motionEnabled) return "none";
    const isParticle = bg.animation === "particles" || bg.animation === "golden-particles"
      || bg.animation === "sparkles" || bg.animation === "floating-dust" || bg.animation === "star-field";
    if (isParticle && !particlesEnabled) return "none";
    return bg.animation;
  })();

  const overlay = bg.overlayOpacity > 0 ? (
    <div className="pointer-events-none absolute inset-0" style={{ background: bg.overlayColor, opacity: bg.overlayOpacity }} />
  ) : null;

  if (bg.kind === "none") return <>{overlay}<AnimationOverlay kind={animationKind} /></>;

  if (bg.kind === "color" || !media || !url) {
    return (
      <>
        <div className="absolute inset-0" style={{ background: bg.gradient ?? bg.color }} />
        {overlay}
        <AnimationOverlay kind={animationKind} />
      </>
    );
  }

  const objectFit: React.CSSProperties["objectFit"] =
    bg.fit === "contain" ? "contain" : bg.fit === "stretch" ? "fill" : "cover";
  const style: React.CSSProperties = {
    objectFit,
    objectPosition: `${bg.positionX}% ${bg.positionY}%`,
    opacity: bg.opacity,
    transform: `scale(${bg.zoom})`,
    transformOrigin: `${bg.positionX}% ${bg.positionY}%`,
    filter: `blur(${bg.blur}px) brightness(${bg.brightness}) contrast(${bg.contrast})`,
  };

  return (
    <>
      {media.type === "video" ? (
        <video
          key={media.id}
          ref={videoRef}
          src={url}
          className="absolute inset-0 h-full w-full"
          style={style}
          autoPlay
          loop={bg.videoLoop}
          muted={bg.videoMuted}
          playsInline
        />
      ) : (
        <img src={url} alt="" className="absolute inset-0 h-full w-full" style={style} draggable={false} />
      )}
      {overlay}
      <AnimationOverlay kind={animationKind} />
    </>
  );
}

function AnimationOverlay({ kind }: { kind: BackgroundAnimation }) {
  if (!kind || kind === "none") return null;
  return <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-anim-${kind}`} aria-hidden />;
}

