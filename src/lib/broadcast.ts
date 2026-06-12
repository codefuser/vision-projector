// Cross-window communication for projection control.

/** Text style applied uniformly to every projected text overlay. Shared
 *  between BiblePanel / TextFormatting / ProjectionWindow / LivePreview so
 *  the preview is a true mirror of the projector output. */
export interface TextStyle {
  fontFamily: string;
  fontSizeVw: number;        // base size in viewport-width units (auto-fit shrinks below this)
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  color: string;
  textOpacity: number;       // 0..1
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;        // px
  outlineWidth: number;      // px
  outlineColor: string;
  background: string;        // CSS color
  bgOpacity: number;         // 0..1
  align: "left" | "center" | "right";
  vAlign: "top" | "middle" | "bottom";
  lineHeight: number;        // unit-less
  letterSpacing: number;     // px
  paddingVw: number;         // % of viewport width margins
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter",
  fontSizeVw: 5.2,
  fontWeight: 500,
  italic: false,
  underline: false,
  color: "#ffffff",
  textOpacity: 1,
  shadow: true,
  shadowColor: "#000000",
  shadowBlur: 20,
  outlineWidth: 0,
  outlineColor: "#000000",
  background: "#000000",
  bgOpacity: 1,
  align: "center",
  vAlign: "middle",
  lineHeight: 1.25,
  letterSpacing: 0,
  paddingVw: 6,
};

/** A SectionStyle wraps a TextStyle with a visibility toggle, used by the
 *  grouped (Reference / Tamil / English) formatting model. */
export interface SectionStyle extends TextStyle {
  visible: boolean;
}

export const DEFAULT_REFERENCE_STYLE: SectionStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSizeVw: 2.4,
  fontWeight: 600,
  letterSpacing: 2,
  paddingVw: 4,
  vAlign: "top",
  visible: true,
};

export const DEFAULT_TAMIL_STYLE: SectionStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontFamily: "Latha",
  fontSizeVw: 5,
  visible: true,
};

export const DEFAULT_ENGLISH_STYLE: SectionStyle = {
  ...DEFAULT_TEXT_STYLE,
  visible: true,
};

/** Background source for the projector stage (sits underneath text). */
export interface BackgroundConfig {
  kind: "none" | "color" | "media";
  color: string;
  /** Library media id when kind === "media". Resolved on the projector. */
  mediaId: string | null;
  fit: "cover" | "contain" | "stretch";
  /** Visual adjustments — applied to the media layer. */
  opacity: number;     // 0..1
  blur: number;        // px
  brightness: number;  // 0..2 (1 = neutral)
  /** NEW (additive): css contrast multiplier, defaults 1. */
  contrast?: number;   // 0..2 (1 = neutral)
  zoom: number;        // 1..3 scale multiplier
  positionX: number;   // 0..100 (%, default 50)
  positionY: number;   // 0..100 (%, default 50)
  /** Optional CSS gradient string. When set + kind === "color", renders gradient instead of solid. */
  gradient?: string | null;
  /** Optional animated decorative overlay rendered above the base. */
  animation?: BackgroundAnimation;
  /** NEW (additive): coloured overlay rendered above media, below text. */
  overlayColor?: string;
  overlayOpacity?: number; // 0..1
  /** NEW (additive): video playback controls. */
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoSpeed?: number; // 0.25..4, default 1
}

export type BackgroundAnimation =
  | "none"
  | "particles" | "bokeh" | "gradient-shift" | "light-rays"
  | "floating-cross" | "sparkles" | "soft-glow"
  | "clouds" | "golden-particles" | "floating-dust" | "fog"
  | "fire-glow" | "cross-beam" | "water" | "sky-motion"
  | "stage-lights" | "aurora" | "star-field" | "rain"
  | "candle-glow" | "sunrise" | "ocean" | "abstract-worship";

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  kind: "color",
  color: "#000000",
  mediaId: null,
  fit: "cover",
  opacity: 1,
  blur: 0,
  brightness: 1,
  contrast: 1,
  zoom: 1,
  positionX: 50,
  positionY: 50,
  overlayColor: "#000000",
  overlayOpacity: 0,
  videoLoop: true,
  videoMuted: true,
  videoSpeed: 1,
};


export interface GroupedStyles {
  reference: SectionStyle;
  tamil: SectionStyle;
  english: SectionStyle;
  background: BackgroundConfig;
}

export const DEFAULT_GROUPED_STYLES: GroupedStyles = {
  reference: DEFAULT_REFERENCE_STYLE,
  tamil: DEFAULT_TAMIL_STYLE,
  english: DEFAULT_ENGLISH_STYLE,
  background: DEFAULT_BACKGROUND,
};

export interface TextOverlay {
  /** Combined / legacy reference string. */
  reference: string;
  /** Main body. Newlines preserved. */
  text: string;
  /** Optional translation/language label, e.g. "KJV" or "தமிழ்". */
  translation?: string;
  /** Optional secondary lines (e.g. parallel translation). */
  subtext?: string;
  /** Secondary translation label (parallel). */
  subtranslation?: string;
  /** Logical content kind so future renderers can branch. */
  kind?: "bible_verse" | "song_slide" | "live_text" | "announcement";

  // ── Bible-bilingual extension (optional, populated only by Bible adapter)
  referenceEn?: string;
  referenceTa?: string;
  textEn?: string;
  textTa?: string;
  /** "en" | "ta" | "both" — controls which sections render. */
  mode?: "en" | "ta" | "both";
}

/** Logo overlay payload broadcast to the projector / preview. */
export interface LogoBroadcast {
  enabled: boolean;
  current: { id: string; dataUrl: string; name: string } | null;
  settings: {
    widthPct: number;
    opacity: number;
    radius: number;
    shadow: boolean;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom";
    xPct: number;
    yPct: number;
  };
}

export type ProjectionCommand =
  | { type: "LOAD"; mediaId: string; transition?: string }
  | { type: "LOAD_PLAYLIST"; playlistId: string; startIndex?: number; shuffle?: boolean; loop?: string }
  | { type: "LOAD_TEXT"; overlay: TextOverlay; style?: TextStyle; styles?: GroupedStyles }
  | { type: "UPDATE_TEXT_STYLE"; style: TextStyle }
  | { type: "UPDATE_STYLES"; styles: GroupedStyles }
  | { type: "UPDATE_BACKGROUND"; background: BackgroundConfig }
  | { type: "UPDATE_LOGO"; logo: LogoBroadcast }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "STOP" }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SEEK"; time: number }
  | { type: "VOLUME"; value: number }
  | { type: "MUTE"; value: boolean }
  | { type: "BLACK"; value: boolean }
  | { type: "RATE"; value: number }
  | { type: "LOOP"; value: boolean }
  | { type: "PING" };

export type ProjectionState = {
  type: "STATE";
  mode: "idle" | "single" | "slideshow" | "text";
  currentMediaId: string | null;
  index: number;
  total: number;
  playing: boolean;
  black: boolean;
  muted: boolean;
  volume: number;
  videoCurrentTime?: number;
  videoDurationMs?: number;
  videoReady?: boolean;
  playbackRate?: number;
  loop?: boolean;
  textOverlay?: TextOverlay | null;
  textStyle?: TextStyle | null;
  groupedStyles?: GroupedStyles | null;
  logo?: LogoBroadcast | null;
};

const CHANNEL = "church-projection";

export function getChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL);
}
