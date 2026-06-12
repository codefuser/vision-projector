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

export interface TextOverlay {
  /** e.g. "John 3:16" */
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
}

export type ProjectionCommand =
  | { type: "LOAD"; mediaId: string; transition?: string }
  | { type: "LOAD_PLAYLIST"; playlistId: string; startIndex?: number; shuffle?: boolean; loop?: string }
  | { type: "LOAD_TEXT"; overlay: TextOverlay; style?: TextStyle }
  | { type: "UPDATE_TEXT_STYLE"; style: TextStyle }
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
};

const CHANNEL = "church-projection";

export function getChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL);
}
