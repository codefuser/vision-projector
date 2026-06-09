/**
 * Favorites foundation.
 *
 * Phase 1 keeps favorites entirely in-memory so the architecture is in place
 * without touching the Dexie schema. A future phase will swap the backing
 * store for a persistent table — the public API below will not change.
 */
import type { ProjectionContent } from "./content.types";

export interface FavoriteEntry {
  contentId: string;
  type: ProjectionContent["type"];
  title: string;
  sourceModule: ProjectionContent["source"]["module"];
  addedAt: number;
}

class FavoritesStore {
  private entries = new Map<string, FavoriteEntry>();
  private listeners = new Set<(entries: readonly FavoriteEntry[]) => void>();

  isFavorite(contentId: string): boolean {
    return this.entries.has(contentId);
  }

  list(): readonly FavoriteEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.addedAt - a.addedAt);
  }

  add(content: ProjectionContent): FavoriteEntry {
    const existing = this.entries.get(content.id);
    if (existing) return existing;
    const entry: FavoriteEntry = {
      contentId: content.id,
      type: content.type,
      title: content.title,
      sourceModule: content.source.module,
      addedAt: Date.now(),
    };
    this.entries.set(content.id, entry);
    this.notify();
    return entry;
  }

  remove(contentId: string): void {
    if (this.entries.delete(contentId)) this.notify();
  }

  toggle(content: ProjectionContent): boolean {
    if (this.isFavorite(content.id)) {
      this.remove(content.id);
      return false;
    }
    this.add(content);
    return true;
  }

  subscribe(fn: (entries: readonly FavoriteEntry[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    const snapshot = this.list();
    for (const fn of this.listeners) {
      try {
        fn(snapshot);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[favorites] subscriber error", err);
      }
    }
  }
}

export const projectionFavorites = new FavoritesStore();
