/**
 * Unified Tanglish → Tamil dictionary index.
 *
 * Merges the curated CHURCH_DICTIONARY (high-confidence, worship-specific)
 * with the broader TAMIL_CORPUS (general spoken/written vocabulary) into
 * a single lookup with a 2-char prefix index and length-bucketed fuzzy
 * matcher. Church entries always win on ties.
 *
 * Built lazily on first query and memoised; safe to import anywhere.
 */
import { CHURCH_DICTIONARY } from "./church-dictionary";
import { TAMIL_CORPUS } from "./tamil-corpus";

export interface Suggestion {
  /** Tamil candidate. */
  tamil: string;
  /** Source Roman key (for debugging / future highlight). */
  key: string;
  /** Lower is better; 0 = exact dictionary hit. */
  score: number;
  /** Where the suggestion came from. */
  source: "church" | "corpus" | "phonetic";
}

interface Entry {
  candidates: string[];
  source: "church" | "corpus";
}

let MERGED: Map<string, Entry> | null = null;
let PREFIX_INDEX: Map<string, string[]> | null = null;
let KEYS_BY_LEN: Map<number, string[]> | null = null;

function normalize(key: string): string {
  // Loose normalization for tolerance against common typos. Used for
  // secondary lookups only — exact lookup still wins first.
  return key
    .toLowerCase()
    .replace(/(.)\1+/g, "$1")          // collapse doubled letters
    .replace(/h(?=[^aeiou]|$)/g, "")   // drop trailing 'h' after consonants
    .replace(/[^a-z]/g, "");
}

function buildIndex(): void {
  MERGED = new Map();
  PREFIX_INDEX = new Map();
  KEYS_BY_LEN = new Map();

  const add = (key: string, candidates: string[], source: "church" | "corpus") => {
    const lk = key.toLowerCase();
    const existing = MERGED!.get(lk);
    if (existing) {
      // Church wins; corpus extends with new candidates.
      const merged = existing.source === "church" ? existing.candidates : candidates;
      const extras = existing.source === "church" ? candidates : existing.candidates;
      const seen = new Set(merged);
      for (const c of extras) if (!seen.has(c)) merged.push(c);
      MERGED!.set(lk, { candidates: merged, source: existing.source });
      return;
    }
    MERGED!.set(lk, { candidates: [...candidates], source });

    for (let i = 1; i <= Math.min(lk.length, 6); i++) {
      const p = lk.slice(0, i);
      const arr = PREFIX_INDEX!.get(p);
      if (arr) arr.push(lk);
      else PREFIX_INDEX!.set(p, [lk]);
    }
    const len = lk.length;
    const bucket = KEYS_BY_LEN!.get(len);
    if (bucket) bucket.push(lk);
    else KEYS_BY_LEN!.set(len, [lk]);
  };

  // Church first so it owns conflicts.
  for (const [k, v] of Object.entries(CHURCH_DICTIONARY)) add(k, v, "church");
  for (const [k, v] of Object.entries(TAMIL_CORPUS)) add(k, v, "corpus");
}

function ensure(): void {
  if (!MERGED) buildIndex();
}

/** Bounded Levenshtein. Returns Infinity if distance exceeds `max`. */
function bounded(a: string, b: string, max: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return Infinity;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return Infinity;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[bl];
}

/** Exact lookup. */
export function lookup(key: string): string[] | null {
  ensure();
  const lk = key.toLowerCase();
  const hit = MERGED!.get(lk);
  if (hit) return hit.candidates;
  // Try normalized key
  const nk = normalize(lk);
  if (nk && nk !== lk) {
    const hit2 = MERGED!.get(nk);
    if (hit2) return hit2.candidates;
  }
  return null;
}

/**
 * Suggest Tamil candidates for a Roman prefix or word.
 * Priority: exact → normalized exact → prefix → fuzzy.
 * Church entries rank above corpus on ties.
 */
export function suggest(prefix: string, limit = 6): Suggestion[] {
  const p = (prefix ?? "").toLowerCase().trim();
  if (!p) return [];
  ensure();

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (tamil: string, key: string, score: number, source: "church" | "corpus" | "phonetic") => {
    if (seen.has(tamil)) return;
    seen.add(tamil);
    out.push({ tamil, key, score, source });
  };

  const sourceBoost = (s: "church" | "corpus") => (s === "church" ? 0 : 0.1);

  // 1) Exact
  const exact = MERGED!.get(p);
  if (exact) for (const t of exact.candidates) push(t, p, 0 + sourceBoost(exact.source), exact.source);

  // 1b) Normalized exact
  const np = normalize(p);
  if (np && np !== p) {
    const nh = MERGED!.get(np);
    if (nh) for (const t of nh.candidates) push(t, np, 0.5 + sourceBoost(nh.source), nh.source);
  }

  // 2) Prefix
  const idxKey = p.slice(0, Math.min(p.length, 6));
  const prefixKeys = PREFIX_INDEX!.get(idxKey) ?? [];
  prefixKeys.sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const k of prefixKeys) {
    if (k === p) continue;
    const entry = MERGED!.get(k);
    if (!entry) continue;
    for (const t of entry.candidates) push(t, k, 1 + sourceBoost(entry.source), entry.source);
    if (out.length >= limit * 2) break;
  }

  // 3) Fuzzy — only if we still need more.
  if (out.length < limit && p.length >= 3) {
    const max = p.length <= 4 ? 1 : 2;
    for (let len = p.length - max; len <= p.length + max; len++) {
      const bucket = KEYS_BY_LEN!.get(len);
      if (!bucket) continue;
      for (const k of bucket) {
        if (seen.size >= limit * 3) break;
        const d = bounded(p, k, max);
        if (d === Infinity) continue;
        const entry = MERGED!.get(k);
        if (!entry) continue;
        for (const t of entry.candidates) push(t, k, 2 + d + sourceBoost(entry.source), entry.source);
      }
    }
  }

  return out.sort((a, b) => a.score - b.score).slice(0, limit);
}
