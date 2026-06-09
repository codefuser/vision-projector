/**
 * Tiny strongly-typed event bus used by the Projection Engine.
 *
 * The engine is the only emitter; everything else (history, favorites,
 * analytics, future Service Planning) subscribes via `on(...)`. Subscribers
 * receive a stable unsubscribe function. Listeners that throw never break
 * other listeners.
 */
import type { ProjectionContent, HistoryEntry } from "./content.types";

export type ProjectionEvent =
  | { type: "CONTENT_PROJECTED"; content: ProjectionContent; previous: ProjectionContent | null }
  | { type: "CONTENT_UPDATED"; content: ProjectionContent }
  | { type: "CONTENT_CLEARED"; previous: ProjectionContent | null }
  | { type: "PLAYBACK_STARTED" }
  | { type: "PLAYBACK_PAUSED" }
  | { type: "PLAYBACK_STOPPED" }
  | { type: "BLACK_SCREEN_ENABLED" }
  | { type: "BLACK_SCREEN_DISABLED" }
  | { type: "PREVIEW_UPDATED" }
  | { type: "PROJECTOR_CONNECTED" }
  | { type: "PROJECTOR_DISCONNECTED" }
  | { type: "QUEUE_ADVANCED"; index: number; total: number }
  | { type: "HISTORY_APPENDED"; entry: HistoryEntry };

export type ProjectionEventType = ProjectionEvent["type"];
export type EventByType<T extends ProjectionEventType> = Extract<ProjectionEvent, { type: T }>;
export type Listener<T extends ProjectionEventType> = (event: EventByType<T>) => void;
export type AnyListener = (event: ProjectionEvent) => void;
export type Unsubscribe = () => void;

export class ProjectionEventBus {
  private byType = new Map<ProjectionEventType, Set<AnyListener>>();
  private any = new Set<AnyListener>();

  on<T extends ProjectionEventType>(type: T, listener: Listener<T>): Unsubscribe {
    const wrapped = listener as AnyListener;
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    set.add(wrapped);
    return () => {
      set!.delete(wrapped);
    };
  }

  onAny(listener: AnyListener): Unsubscribe {
    this.any.add(listener);
    return () => {
      this.any.delete(listener);
    };
  }

  emit(event: ProjectionEvent): void {
    const set = this.byType.get(event.type);
    if (set) {
      for (const fn of set) {
        try {
          fn(event);
        } catch (err) {
          // Never let one bad listener break the rest of the system.
          // eslint-disable-next-line no-console
          console.error("[projection] listener error for", event.type, err);
        }
      }
    }
    for (const fn of this.any) {
      try {
        fn(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[projection] anyListener error for", event.type, err);
      }
    }
  }

  clear(): void {
    this.byType.clear();
    this.any.clear();
  }
}

export const projectionEvents = new ProjectionEventBus();
