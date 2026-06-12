// Cross-window communication for projection control.
/**
 * Generic text-overlay payload used to project non-media content
 * (Bible verses today; Songs / Text / Announcements in later phases).
 */
export interface TextOverlay {
  /** e.g. "John 3:16" */
  reference: string;
  /** Main body. Newlines preserved. */
  text: string;
  /** Optional translation/language label, e.g. "KJV" or "தமிழ்". */
  translation?: string;
  /** Optional secondary lines (e.g. parallel translation). */
  subtext?: string;
  /** Logical content kind so future renderers can branch. */
  kind?: "bible_verse" | "song_slide" | "live_text" | "announcement";
}

export type ProjectionCommand =
  | { type: "LOAD"; mediaId: string; transition?: string }
  | { type: "LOAD_PLAYLIST"; playlistId: string; startIndex?: number; shuffle?: boolean; loop?: string }
  | { type: "LOAD_TEXT"; overlay: TextOverlay }
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
  /** True once the projector's video element has buffered enough to play. Preview uses this to gate its mirrored playback so it never runs ahead of the projector. */
  videoReady?: boolean;
  /** Playback rate currently applied on the projector. */
  playbackRate?: number;
  /** True when the projector video is looping. */
  loop?: boolean;
  /** Currently projected text overlay (Bible / Songs / Text). */
  textOverlay?: TextOverlay | null;
};


const CHANNEL = "church-projection";

export function getChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL);
}
