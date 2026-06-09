/**
 * In-memory ring buffer of projected content.
 *
 * Persistence (Dexie / IndexedDB) and the History UI ship in a later phase.
 * For Phase 1 we expose the architecture so any future module can call
 * `getHistory()` or subscribe to `HISTORY_APPENDED` events from the bus.
 */
import { uid } from "@/lib/uid";
import type { HistoryEntry, ProjectionContent } from "./content.types";
import { projectionEvents } from "./event-bus";

const MAX_ENTRIES = 200;

class HistoryBuffer {
  private entries: HistoryEntry[] = [];
  private listeners = new Set<(entries: readonly HistoryEntry[]) => void>();

  append(content: ProjectionContent): HistoryEntry {
    const entry: HistoryEntry = {
      id: uid(),
      contentId: content.id,
      type: content.type,
      title: content.title,
      sourceModule: content.source.module,
      projectedAt: Date.now(),
    };
    // Collapse consecutive duplicates of the same logical item.
    const last = this.entries[0];
    if (last && last.contentId === entry.contentId && entry.projectedAt - last.projectedAt < 1500) {
      return last;
    }
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    projectionEvents.emit({ type: "HISTORY_APPENDED", entry });
    this.notify();
    return entry;
  }

  list(): readonly HistoryEntry[] {
    return this.entries;
  }

  clear(): void {
    if (!this.entries.length) return;
    this.entries = [];
    this.notify();
  }

  subscribe(fn: (entries: readonly HistoryEntry[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn(this.entries);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[history] subscriber error", err);
      }
    }
  }
}

export const projectionHistory = new HistoryBuffer();
