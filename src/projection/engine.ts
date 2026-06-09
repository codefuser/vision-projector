/**
 * ProjectionEngine — the single entry point for everything that projects.
 *
 * Modules never call the BroadcastChannel, the projector window, or the
 * preview directly. They build a `ProjectionContent` and call one of the
 * engine methods below. The engine:
 *
 *   1. Updates the canonical projection store (single source of truth).
 *   2. Translates the universal content into the legacy wire commands
 *      (`LOAD`, `LOAD_PLAYLIST`, transport) so the existing projector
 *      window and preview continue to work unchanged.
 *   3. Emits typed events on the event bus so History, Favorites, and any
 *      future cross-cutting concern can react without polling state.
 *   4. Appends to the history ring buffer.
 *
 * The engine is deliberately framework-free (no React) so it can be reused
 * by scripts, tests, and a future Electron main process.
 */
import { useProjection } from "@/stores/projection.store";
import type { ProjectionCommand } from "@/lib/broadcast";
import type { ProjectionContent, ProjectionContentType } from "./content.types";
import { projectionEvents } from "./event-bus";
import { projectionHistory } from "./history";
import { hasRenderer } from "./renderers";

interface EngineRuntimeState {
  current: ProjectionContent | null;
  queue: ProjectionContent[];
  index: number;
}

class ProjectionEngineImpl {
  private state: EngineRuntimeState = { current: null, queue: [], index: 0 };
  private bootstrapped = false;
  private projectorWasOpen = false;

  /** Idempotent. Wires the engine to the underlying broadcast store. */
  bootstrap(): void {
    if (this.bootstrapped) return;
    this.bootstrapped = true;
    const store = useProjection.getState();
    store.init();
    // Translate projector-open transitions into engine events.
    useProjection.subscribe((s) => {
      if (s.projectorOpen !== this.projectorWasOpen) {
        this.projectorWasOpen = s.projectorOpen;
        projectionEvents.emit({
          type: s.projectorOpen ? "PROJECTOR_CONNECTED" : "PROJECTOR_DISCONNECTED",
        });
      }
    });
  }

  // ───────── read-side helpers (engine state, not React) ─────────

  getCurrent(): ProjectionContent | null {
    return this.state.current;
  }
  getQueue(): readonly ProjectionContent[] {
    return this.state.queue;
  }
  getIndex(): number {
    return this.state.index;
  }
  canRender(type: ProjectionContentType): boolean {
    return hasRenderer(type);
  }

  // ───────── projection ─────────

  /**
   * Project a single piece of content. Replaces whatever is showing.
   * Returns the content for chaining/awaiting in adapters.
   */
  project(content: ProjectionContent): ProjectionContent {
    this.bootstrap();
    const previous = this.state.current;
    this.state = { current: content, queue: [content], index: 0 };
    this.dispatchToWire(content);
    projectionEvents.emit({ type: "CONTENT_PROJECTED", content, previous });
    projectionHistory.append(content);
    return content;
  }

  /**
   * Project an ordered queue (e.g. a playlist) starting at `startIndex`.
   * Adapters that resolve their queue lazily on the projector side may
   * still call `project()` per item — both paths are supported.
   */
  projectQueue(items: ProjectionContent[], startIndex = 0): ProjectionContent | null {
    this.bootstrap();
    if (!items.length) return null;
    const safeIndex = Math.min(Math.max(0, startIndex), items.length - 1);
    const current = items[safeIndex];
    const previous = this.state.current;
    this.state = { current, queue: items.slice(), index: safeIndex };
    this.dispatchToWire(current, { queue: items, startIndex: safeIndex });
    projectionEvents.emit({ type: "CONTENT_PROJECTED", content: current, previous });
    projectionEvents.emit({ type: "QUEUE_ADVANCED", index: safeIndex, total: items.length });
    projectionHistory.append(current);
    return current;
  }

  /** Edit-in-place: applies a patch and rebroadcasts. Used for style edits. */
  replace(patch: Partial<ProjectionContent>): void {
    if (!this.state.current) return;
    const next: ProjectionContent = {
      ...this.state.current,
      ...patch,
      style: { ...this.state.current.style, ...(patch.style ?? {}) },
      updatedAt: Date.now(),
    } as ProjectionContent;
    this.state.current = next;
    if (this.state.queue.length) {
      this.state.queue[this.state.index] = next;
    }
    this.dispatchToWire(next);
    projectionEvents.emit({ type: "CONTENT_UPDATED", content: next });
  }

  clear(): void {
    const previous = this.state.current;
    this.state = { current: null, queue: [], index: 0 };
    useProjection.getState().send({ type: "STOP" });
    projectionEvents.emit({ type: "CONTENT_CLEARED", previous });
    projectionEvents.emit({ type: "PLAYBACK_STOPPED" });
  }

  // ───────── transport ─────────

  play(): void {
    useProjection.getState().send({ type: "PLAY" });
    projectionEvents.emit({ type: "PLAYBACK_STARTED" });
  }
  pause(): void {
    useProjection.getState().send({ type: "PAUSE" });
    projectionEvents.emit({ type: "PLAYBACK_PAUSED" });
  }
  stop(): void {
    this.clear();
  }
  next(): void {
    useProjection.getState().send({ type: "NEXT" });
  }
  prev(): void {
    useProjection.getState().send({ type: "PREV" });
  }
  setBlack(value: boolean): void {
    useProjection.getState().send({ type: "BLACK", value });
    projectionEvents.emit({ type: value ? "BLACK_SCREEN_ENABLED" : "BLACK_SCREEN_DISABLED" });
  }
  setMuted(value: boolean): void {
    useProjection.getState().send({ type: "MUTE", value });
  }
  setVolume(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    useProjection.getState().send({ type: "VOLUME", value: clamped });
  }
  seek(time: number): void {
    useProjection.getState().send({ type: "SEEK", time });
  }

  // ───────── projector lifecycle ─────────

  openProjector(): void {
    useProjection.getState().openProjector();
  }
  closeProjector(): void {
    useProjection.getState().closeProjector();
  }

  // ───────── events ─────────

  on = projectionEvents.on.bind(projectionEvents);
  onAny = projectionEvents.onAny.bind(projectionEvents);

  // ───────── wire translation ─────────

  /**
   * Translate a universal content into legacy broadcast commands so the
   * existing ProjectionWindow renderer keeps working. Future content
   * types whose renderers live in the projector window will dispatch via
   * a future `PROJECT_CONTENT` wire command instead — this single method
   * is the only place that needs to change.
   */
  private dispatchToWire(
    content: ProjectionContent,
    opts?: { queue?: ProjectionContent[]; startIndex?: number },
  ): void {
    const store = useProjection.getState();
    // Auto-open projector for first projection if it isn't open yet.
    const wasOpen = store.projectorOpen;
    if (!wasOpen) store.openProjector();
    const delay = wasOpen ? 0 : 400;

    let cmd: ProjectionCommand | null = null;
    if (content.type === "image" || content.type === "video") {
      const body = content.body as { mediaId: string };
      // Playlist projection routes through the existing LOAD_PLAYLIST path
      // when the source supplies a refId; falls back to single-media LOAD.
      if (
        opts?.queue &&
        opts.queue.length > 1 &&
        content.source.module === "media" &&
        content.source.refId
      ) {
        cmd = {
          type: "LOAD_PLAYLIST",
          playlistId: content.source.refId,
          startIndex: opts.startIndex ?? 0,
        };
      } else {
        cmd = { type: "LOAD", mediaId: body.mediaId };
      }
    }
    // Non-media types are accepted by the engine today (state + events + history)
    // even though the projector window has no renderer for them yet. The wire
    // dispatch for those types is a no-op — they will light up automatically
    // when the projector window gains the matching renderer in a later phase.
    if (cmd) {
      if (delay === 0) store.send(cmd);
      else setTimeout(() => useProjection.getState().send(cmd!), delay);
    }
  }
}

export const projectionEngine = new ProjectionEngineImpl();
