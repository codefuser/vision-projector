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
};

const CHANNEL = "church-projection";

export function getChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL);
}
