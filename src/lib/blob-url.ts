// Ref-counted object URL cache so we don't leak or revoke too eagerly.
const cache = new Map<string, { url: string; refs: number }>();

export function acquireUrl(key: string, blob: Blob): string {
  const existing = cache.get(key);
  if (existing) {
    existing.refs += 1;
    return existing.url;
  }
  const url = URL.createObjectURL(blob);
  cache.set(key, { url, refs: 1 });
  return url;
}

export function releaseUrl(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    URL.revokeObjectURL(entry.url);
    cache.delete(key);
  }
}

export function purgeAll(): void {
  for (const { url } of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}
