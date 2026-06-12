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
  /** Tokens that matched (for in-card highlighting). */
  matched?: string[];
}

export interface ParsedRef {
  book: BibleBookMeta;
  chapter?: number;
  verse?: number;
  verseEnd?: number;
}

/* ───────── Tanglish + Tamil normalization (Phase 4) ───────── */

/**
 * Collapse common Tanglish spelling variants so "yesu", "yesuvae",
 * "yessu", "yasu", "esu" all reduce to a stable stem ("esu") that we
 * also generate for the reference word "yesu". Aggressive but stable.
 */
export function normalizeTanglish(s: string): string {
  let t = s.toLowerCase();
  t = t
    .replace(/aa+/g, "a")
    .replace(/ee+/g, "e")
    .replace(/oo+/g, "u")
    .replace(/uu+/g, "u")
    .replace(/ii+/g, "i")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/zh/g, "l")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/v([aeiou])/g, "$1") // y'v'esu → yesu
    .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1")
    .replace(/(ae|ai|ay)$/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/^y/, "") // yesu → esu, yovan → ovan (helps cross-spell)
    .trim();
  return t;
}

/** Strip Tamil vowel signs + virama so different transliterations collapse. */
export function normalizeTamil(s: string): string {
  return s
    .replace(/[\u0BBE-\u0BD7]/g, "") // vowel signs / au-length / virama
    .replace(/\s+/g, " ")
    .trim();
}

/** Mixed normalizer: returns BOTH romanization and tamil-only variants. */
export function normalizeForSearch(s: string): string {
  if (/[\u0B80-\u0BFF]/.test(s)) return normalizeTamil(s);
  return normalizeTanglish(s);
}

/* ───────── Reference parser (unchanged behavior + alias-fuzz) ───────── */

export function parseReference(input: string): ParsedRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
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
  }
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
  for (const b of BIBLE_BOOKS) if (b.aliases.includes(t) || b.aliases.includes(tNoSpace)) return b;
  let best: { b: BibleBookMeta; len: number } | null = null;
  for (const b of BIBLE_BOOKS) for (const a of b.aliases) {
    if (a.length < t.length) continue;
    if (a.startsWith(t) || a.startsWith(tNoSpace)) {
      if (!best || a.length < best.len) best = { b, len: a.length };
    }
  }
  if (best) return best.b;
  if (t.length >= 3) for (const b of BIBLE_BOOKS) for (const a of b.aliases) {
    if (a.includes(t) || a.includes(tNoSpace)) return b;
  }
  let fuzzy: { b: BibleBookMeta; d: number } | null = null;
  for (const b of BIBLE_BOOKS) for (const a of b.aliases) {
    if (Math.abs(a.length - t.length) > 2) continue;
    const d = editDistance(a, t);
    const max = a.length >= 6 ? 2 : 1;
    if (d <= max && (!fuzzy || d < fuzzy.d)) fuzzy = { b, d };
  }
  // Tanglish fuzz fallback
  const nt = normalizeTanglish(t);
  if (!fuzzy && nt.length >= 2) {
    for (const b of BIBLE_BOOKS) for (const a of b.aliases) {
      const na = normalizeTanglish(a);
      if (!na) continue;
      if (na === nt || na.startsWith(nt) || nt.startsWith(na)) return b;
    }
  }
  return fuzzy?.b ?? null;
}

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
    if (rowMin > 3) return 4;
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
  if (ref.verse == null) return ch.map((text, i) => verseHit(book, ref.chapter!, i + 1, text, lang, 100));
  const start = ref.verse;
  const end = ref.verseEnd ?? start;
  const out: VerseHit[] = [];
  for (let v = start; v <= end; v++) {
    const text = ch[v - 1];
    if (text) out.push(verseHit(book, ref.chapter, v, text, lang, 200));
  }
  return out;
}

function verseHit(book: BibleBookMeta, chapter: number, verse: number, text: string, lang: BibleLang, score: number, matched?: string[]): VerseHit {
  return {
    book: book.index, bookName: book.name,
    bookNameLocal: LANG_NAME(lang, book),
    chapter, verse, text, score, matched,
  };
}

/* ───────── Full-text search with normalization + ranking ───────── */

function fullTextSearch(query: string, data: BibleData, lang: BibleLang, limit: number): VerseHit[] {
  const qLower = query.toLowerCase();
  const tokensRaw = qLower.split(/\s+/).filter(Boolean);
  const tokensNorm = tokensRaw.map(normalizeForSearch).filter(Boolean);
  const isTamilQuery = /[\u0B80-\u0BFF]/.test(query);
  const hits: VerseHit[] = [];
  let scanned = 0;

  for (let b = 0; b < data.length; b++) {
    const book = BIBLE_BOOKS[b];
    if (!book) continue;
    const chapters = data[b];
    for (let c = 0; c < chapters.length; c++) {
      const verses = chapters[c];
      for (let v = 0; v < verses.length; v++) {
        scanned++;
        const text = verses[v];
        const lower = text.toLowerCase();
        const norm = isTamilQuery ? normalizeTamil(text) : normalizeTanglish(text);

        let exactHits = 0;
        let normHits = 0;
        const matched: string[] = [];
        for (let i = 0; i < tokensRaw.length; i++) {
          const rt = tokensRaw[i];
          const nt = tokensNorm[i];
          if (rt && lower.includes(rt)) { exactHits++; matched.push(rt); continue; }
          if (nt && nt.length >= 2 && norm.includes(nt)) { normHits++; matched.push(rt); }
        }
        const totalHits = exactHits + normHits;
        if (totalHits < tokensRaw.length) continue;

        let score = totalHits * 50 + exactHits * 30;
        if (lower.includes(qLower)) score += 100; // exact phrase bonus
        if (lower.startsWith(tokensRaw[0])) score += 15;
        score -= Math.floor(text.length / 80); // prefer concise verses

        hits.push(verseHit(book, c + 1, v + 1, text, lang, score, matched));
        if (hits.length >= limit * 5) break;
      }
      if (hits.length >= limit * 5) break;
    }
    if (hits.length >= limit * 5) break;
  }

  hits.sort((a, b) => b.score - a.score);
  void scanned;
  return hits.slice(0, limit);
}
