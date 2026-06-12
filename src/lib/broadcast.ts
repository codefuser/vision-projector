// Cross-window communication for projection control.
export type ProjectionCommand =
  | { type: "LOAD"; mediaId: string; transition?: string }
  | { type: "LOAD_PLAYLIST"; playlistId: string; startIndex?: number; shuffle?: boolean; loop?: string }
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
  mode: "idle" | "single" | "slideshow";
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
};


const CHANNEL = "church-projection";

export function getChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL);
}
