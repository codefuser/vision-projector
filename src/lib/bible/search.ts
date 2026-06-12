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
 * Tolerant reference parser. Accepts:
 *   "John 3:16", "jn 3:16", "jhn 3 16", "john3:16",
 *   "genesis 1:1", "gen 1", "psalm 23", "psa 23", "ps 23",
 *   "1 jn 4:8", "1jn4:8",
 *   "யோவான் 3:16", "யோ 3:16", "சங்கீதம் 23",
 *   "yovan 3:16", "sangeetham 23", "aadhi 1:1".
 * Fuzzy-matches the book token so typos like "yovn", "pslam", "genisis"
 * still resolve. Returns null when no leading book token matches.
 */
export function parseReference(input: string): ParsedRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Split off any trailing numeric tail "<chapter>[ :| ]<verse>[-<end>]".
  // Anything before the first standalone number that follows a word is the
  // book token (which itself may contain a leading digit like "1 jn").
  const lower = trimmed.toLowerCase();

  // Pattern 1: "book ch:v" or "book ch v" with optional dash range.
  // Pattern 2: "bookch:v" (no space, e.g. "john3:16").
  // We try the loosest split first.
  const tailMatch = lower.match(/^(.*?)(?:[\s:]*?)(\d+)(?:\s*[:.\s-]\s*(\d+))?(?:\s*-\s*(\d+))?\s*$/);
  let bookToken = lower;
  let chapter: number | undefined;
  let verse: number | undefined;
  let verseEnd: number | undefined;

  if (tailMatch && tailMatch[1].trim().length > 0) {
    bookToken = tailMatch[1].trim();
    chapter = Number(tailMatch[2]);
    verse = tailMatch[3] ? Number(tailMatch[3]) : undefined;
    verseEnd = tailMatch[4] ? Number(tailMatch[4]) : undefined;
  } else {
    // No numeric tail — entire string is a book candidate.
    bookToken = lower;
  }

  // Handle "bookNN:NN" with no separator: try splitting glued digits.
  if (chapter == null) {
    const glued = bookToken.match(/^([\p{L}\s]+?)(\d+)(?:[:.\s-](\d+))?(?:-(\d+))?$/u);
    if (glued) {
      bookToken = glued[1].trim();
      chapter = Number(glued[2]);
      verse = glued[3] ? Number(glued[3]) : undefined;
      verseEnd = glued[4] ? Number(glued[4]) : undefined;
    }
  }

  const book = matchBook(bookToken);
  if (!book) return null;
  return { book, chapter, verse, verseEnd };
}

function matchBook(token: string): BibleBookMeta | null {
  const t = token.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return null;
  const tNoSpace = t.replace(/\s+/g, "");

  // 1. exact alias
  for (const b of BIBLE_BOOKS) {
    if (b.aliases.includes(t) || b.aliases.includes(tNoSpace)) return b;
  }
  // 2. prefix (shortest alias wins → most specific)
  let best: { b: BibleBookMeta; len: number } | null = null;
  for (const b of BIBLE_BOOKS) {
    for (const a of b.aliases) {
      if (a.length < t.length) continue;
      if (a.startsWith(t) || a.startsWith(tNoSpace)) {
        if (!best || a.length < best.len) best = { b, len: a.length };
      }
    }
  }
  if (best) return best.b;
  // 3. contains
  if (t.length >= 3) {
    for (const b of BIBLE_BOOKS) {
      for (const a of b.aliases) {
        if (a.includes(t) || a.includes(tNoSpace)) return b;
      }
    }
  }
  // 4. fuzzy — edit distance ≤ 2 against full names and common abbrev
  let fuzzy: { b: BibleBookMeta; d: number } | null = null;
  for (const b of BIBLE_BOOKS) {
    for (const a of b.aliases) {
      if (Math.abs(a.length - t.length) > 2) continue;
      const d = editDistance(a, t);
      const max = a.length >= 6 ? 2 : 1;
      if (d <= max && (!fuzzy || d < fuzzy.d)) fuzzy = { b, d };
    }
  }
  return fuzzy?.b ?? null;
}

/** Damerau-Levenshtein, capped at 3 for speed. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > 3) return 4;
  const dp: number[] = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) dp[j] = j;
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > 3) return 4; // early-out: cannot recover within cap
  }
  return dp[bl];
}

const LANG_NAME = (lang: BibleLang, b: BibleBookMeta) => (lang === "ta" ? b.nameTa : b.name);

export function search(query: string, data: BibleData, lang: BibleLang, limit = 80): VerseHit[] {
  const q = query.trim();
  if (!q) return [];
  const ref = parseReference(q);
  if (ref) return resolveReference(ref, data, lang);
  return fullTextSearch(q, data, lang, limit);
}

/** Returns every verse in a chapter (used by chapter mode). */
export function getChapterVerses(book: number, chapter: number, data: BibleData, lang: BibleLang): VerseHit[] {
  const meta = BIBLE_BOOKS[book];
  if (!meta) return [];
  const ch = data[book]?.[chapter - 1];
  if (!ch) return [];
  return ch.map((text, i) => verseHit(meta, chapter, i + 1, text, lang, 100));
}

function resolveReference(ref: ParsedRef, data: BibleData, lang: BibleLang): VerseHit[] {
  const { book } = ref;
  const chapters = data[book.index];
  if (!chapters) return [];
  if (ref.chapter == null) {
    const verses = chapters[0] ?? [];
    return verses.map((text, i) => verseHit(book, 1, i + 1, text, lang, 100));
  }
  const ch = chapters[ref.chapter - 1];
  if (!ch) return [];
  if (ref.verse == null) {
    // Chapter mode — return every verse as its own card.
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
        hits.push(verseHit(book, c + 1, v + 1, text, lang, scoreMatch(lower, tokens)));
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
