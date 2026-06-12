import { BIBLE_BOOKS, type BibleBookMeta } from "./books";
import type { BibleData, BibleLang } from "./loader";

export interface VerseHit {
  book: number;
  bookName: string;
  bookNameLocal: string;
  chapter: number;
  verse: number;
  text: string;
  score: number;
}

export interface ParsedRef {
  book: BibleBookMeta;
  chapter?: number;
  verse?: number;
  verseEnd?: number;
}

/**
 * Parse references like:
 *   "john 3", "jn 3 16", "jn 3:16", "psalm 23:1-6", "1 jn 4:8"
 * Returns null when no leading book token resolves.
 */
export function parseReference(input: string): ParsedRef | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  // Match leading book token: optional number + letters.
  const m = trimmed.match(/^(?:([123])\s*)?([\p{L}]+)(?:\s*(\d+))?(?:\s*[:\s]\s*(\d+))?(?:\s*-\s*(\d+))?$/u);
  if (!m) {
    // Try a looser pattern: leading numeric prefix attached, eg "1jn3:16".
    const m2 = trimmed.match(/^([123]?[\p{L}]+)\s*(\d+)?(?:[:\s]\s*(\d+))?(?:-(\d+))?$/u);
    if (!m2) return null;
    const token = m2[1];
    const book = matchBook(token);
    if (!book) return null;
    return {
      book,
      chapter: m2[2] ? Number(m2[2]) : undefined,
      verse: m2[3] ? Number(m2[3]) : undefined,
      verseEnd: m2[4] ? Number(m2[4]) : undefined,
    };
  }
  const token = (m[1] ? `${m[1]} ${m[2]}` : m[2]).trim();
  const book = matchBook(token);
  if (!book) return null;
  return {
    book,
    chapter: m[3] ? Number(m[3]) : undefined,
    verse: m[4] ? Number(m[4]) : undefined,
    verseEnd: m[5] ? Number(m[5]) : undefined,
  };
}

function matchBook(token: string): BibleBookMeta | null {
  const t = token.toLowerCase().replace(/\s+/g, " ").trim();
  const tNoSpace = t.replace(/\s+/g, "");
  // 1. exact alias
  for (const b of BIBLE_BOOKS) {
    if (b.aliases.includes(t) || b.aliases.includes(tNoSpace)) return b;
  }
  // 2. prefix
  let best: { b: BibleBookMeta; len: number } | null = null;
  for (const b of BIBLE_BOOKS) {
    for (const a of b.aliases) {
      if (a.startsWith(t) || a.startsWith(tNoSpace)) {
        const len = a.length;
        if (!best || len < best.len) best = { b, len };
      }
    }
  }
  if (best) return best.b;
  // 3. contains
  for (const b of BIBLE_BOOKS) {
    for (const a of b.aliases) {
      if (a.includes(t) && t.length >= 2) return b;
    }
  }
  return null;
}

const LANG_NAME = (lang: BibleLang, b: BibleBookMeta) => (lang === "ta" ? b.nameTa : b.name);

/**
 * Live search. If the query parses as a reference, returns the cited
 * chapter/verse range. Otherwise performs a full-text scan.
 * Hard cap of `limit` results to keep UI snappy.
 */
export function search(query: string, data: BibleData, lang: BibleLang, limit = 60): VerseHit[] {
  const q = query.trim();
  if (!q) return [];
  const ref = parseReference(q);
  if (ref) {
    return resolveReference(ref, data, lang);
  }
  return fullTextSearch(q, data, lang, limit);
}

function resolveReference(ref: ParsedRef, data: BibleData, lang: BibleLang): VerseHit[] {
  const { book } = ref;
  const chapters = data[book.index];
  if (!chapters) return [];
  if (ref.chapter == null) {
    // Return chapter 1 preview (first 5 verses)
    const verses = chapters[0] ?? [];
    return verses.slice(0, 5).map((text, i) => verseHit(book, 1, i + 1, text, lang, 100 - i));
  }
  const ch = chapters[ref.chapter - 1];
  if (!ch) return [];
  if (ref.verse == null) {
    return ch.map((text, i) => verseHit(book, ref.chapter!, i + 1, text, lang, 100));
  }
  const start = ref.verse;
  const end = ref.verseEnd ?? start;
  const out: VerseHit[] = [];
  for (let v = start; v <= end; v++) {
    const text = ch[v - 1];
    if (text) out.push(verseHit(book, ref.chapter, v, text, lang, 200));
  }
  return out;
}

function verseHit(
  book: BibleBookMeta,
  chapter: number,
  verse: number,
  text: string,
  lang: BibleLang,
  score: number,
): VerseHit {
  return {
    book: book.index,
    bookName: book.name,
    bookNameLocal: LANG_NAME(lang, book),
    chapter,
    verse,
    text,
    score,
  };
}

function fullTextSearch(query: string, data: BibleData, lang: BibleLang, limit: number): VerseHit[] {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits: VerseHit[] = [];
  for (let b = 0; b < data.length; b++) {
    const book = BIBLE_BOOKS[b];
    if (!book) continue;
    const chapters = data[b];
    for (let c = 0; c < chapters.length; c++) {
      const verses = chapters[c];
      for (let v = 0; v < verses.length; v++) {
        const text = verses[v];
        const lower = text.toLowerCase();
        let ok = true;
        for (const t of tokens) {
          if (!lower.includes(t)) { ok = false; break; }
        }
        if (!ok) continue;
        const score = scoreMatch(lower, tokens);
        hits.push(verseHit(book, c + 1, v + 1, text, lang, score));
        if (hits.length >= limit * 4) break;
      }
      if (hits.length >= limit * 4) break;
    }
    if (hits.length >= limit * 4) break;
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

function scoreMatch(text: string, tokens: string[]): number {
  let s = 0;
  for (const t of tokens) {
    const idx = text.indexOf(t);
    if (idx === 0) s += 50;
    else if (idx > 0) s += 20;
    s += Math.max(0, 10 - Math.floor(text.length / 100));
  }
  return s;
}
