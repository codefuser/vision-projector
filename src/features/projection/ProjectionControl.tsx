import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX, MonitorPlay, MonitorOff, Eye, EyeOff } from "lucide-react";
import { useProjection } from "@/stores/projection.store";
import { getMedia } from "@/db/repo";
import { db } from "@/db/schema";
import type { MediaRecord } from "@/db/schema";
import { Thumb } from "@/components/Thumb";

export function ProjectionControl() {
  const { state, projectorOpen, openProjector, closeProjector, send, init } = useProjection();
  const [currentMedia, setCurrentMedia] = useState<MediaRecord | null>(null);

  useEffect(() => {
    init();
    // ping projector to get its state in case it's already open
    send({ type: "PING" });
  }, [init, send]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!state?.currentMediaId) {
        setCurrentMedia(null);
        return;
      }
      const m = await getMedia(state.currentMediaId);
      if (!cancelled) setCurrentMedia(m ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.currentMediaId]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Projection Control</h1>
          <p className="text-sm text-muted-foreground">Live control room for the projector window.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${projectorOpen ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              <div>
                <div className="font-medium">Projector window</div>
                <div className="text-xs text-muted-foreground">
                  {projectorOpen ? "Connected — drag to your projector screen and press F11 for fullscreen" : "Not open"}
                </div>
              </div>
            </div>
            <button
              onClick={projectorOpen ? closeProjector : openProjector}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                projectorOpen ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              } hover:opacity-90`}
            >
              {projectorOpen ? <><MonitorOff className="h-4 w-4" /> Close</> : <><MonitorPlay className="h-4 w-4" /> Open Projector</>}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium text-muted-foreground">Now Showing</div>
          {currentMedia ? (
            <div className="flex items-center gap-4">
              <Thumb media={currentMedia} className="h-24 w-40 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">{currentMedia.name}</div>
                <div className="text-xs text-muted-foreground">
                  {currentMedia.type === "video" ? "Video" : "Image"}
                  {state && state.total > 1 && ` · Item ${state.index + 1} of ${state.total}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">Nothing projecting</div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium text-muted-foreground">Transport</div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => send({ type: "PREV" })} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent">
              <SkipBack className="h-4 w-4" />
            </button>
            {state?.playing ? (
              <button onClick={() => send({ type: "PAUSE" })} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Pause className="h-4 w-4" /> Pause
              </button>
            ) : (
              <button onClick={() => send({ type: "PLAY" })} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Play className="h-4 w-4" /> Play
              </button>
            )}
            <button onClick={() => send({ type: "NEXT" })} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent">
              <SkipForward className="h-4 w-4" />
            </button>
            <button onClick={() => send({ type: "STOP" })} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-accent">
              <Square className="h-4 w-4" /> Stop
            </button>
            <div className="mx-2 h-6 w-px bg-border" />
            <button
              onClick={() => send({ type: "BLACK", value: !state?.black })}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm ${
                state?.black ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
              } hover:bg-accent`}
            >
              {state?.black ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {state?.black ? "Show" : "Black Screen"}
            </button>
            <div className="mx-2 h-6 w-px bg-border" />
            <button
              onClick={() => send({ type: "MUTE", value: !state?.muted })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
            >
              {state?.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state?.volume ?? 0.8}
              onChange={(e) => send({ type: "VOLUME", value: Number(e.target.value) })}
              className="w-32 accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
