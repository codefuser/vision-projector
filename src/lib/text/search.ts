/**
 * Upgraded text-item search. Ranks by:
 *   - title exact / prefix / substring
 *   - content substring
 *   - Tanglish → Tamil hit (so typing "yesu" finds Tamil items containing யேசு)
 *   - small word-level fuzzy (Levenshtein ≤ 2) on title
 *   - recent boost
 */
import type { TextItem } from "@/stores/text-items.store";
import { convertCompleted } from "@/lib/text/tanglish";

function lev(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
}

export interface SearchHit {
  item: TextItem;
  score: number;
}

export function searchTextItems(
  items: TextItem[],
  query: string,
  recentIds: Set<string>,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...items]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((item) => ({ item, score: 0 }));
  }
  const qTamil = /[A-Za-z]/.test(q) ? convertCompleted(q).converted : "";
  const hits: SearchHit[] = [];

  for (const it of items) {
    const title = it.title.toLowerCase();
    const content = it.content.toLowerCase();
    let score = 0;

    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 60;
    else if (title.includes(q)) score += 40;

    if (content.includes(q)) score += 20;

    if (qTamil) {
      if (it.title.includes(qTamil)) score += 50;
      if (it.content.includes(qTamil)) score += 25;
    }

    if (score === 0) {
      // Word-level fuzzy on title tokens.
      const titleWords = title.split(/\s+/);
      for (const w of titleWords) {
        if (lev(w, q, 2) <= 2) { score += 15; break; }
      }
    }

    if (score > 0) {
      if (recentIds.has(it.id)) score += 5;
      if (it.favorite) score += 3;
      hits.push({ item: it, score });
    }
  }

  return hits.sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt);
}
