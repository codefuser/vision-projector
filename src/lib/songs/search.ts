/**
 * Song search — Tamil + Tanglish + fuzzy + sound-alike + partial word.
 *
 * Strategy: every song carries pre-computed consonant skeletons
 * (titleStem / contentStem / slideStems). A query is reduced to the same
 * skeleton form, then substring-matched. Because the skeleton normalizes
 * vowels, voicing (b↔p), aspiration, and Tamil↔Latin spelling, simple
 * substring matching becomes fuzzy + sound-alike + partial-word matching
 * in one pass — fast enough to scan 16k+ songs each keystroke.
 */
import type { Song } from "./loader";
import { songLower, songStem } from "./normalize";

export interface SongHit {
  song: Song;
  score: number;
  slideIndex: number;
  matched: string[];
}

export function searchSongs(query: string, songs: Song[], limit = 80): SongHit[] {
  const q = query.trim();
  if (!q) return [];
  const hits = runSearch(q, songs, limit);
  if (hits.length > 0) return hits;

  // Typo-tolerance fallback. If nothing matched, try variants of every token
  // with one character dropped at each position. The skeleton-based matcher
  // tolerates voicing / vowel mistakes already; this layer adds resilience to
  // straight-up letter typos (yesuu, yessu, yesuvae, iyesu, esu …).
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const variants = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.length < 3) continue;
    for (let j = 0; j < t.length; j++) {
      const trimmed = t.slice(0, j) + t.slice(j + 1);
      const v = [...tokens.slice(0, i), trimmed, ...tokens.slice(i + 1)].join(" ");
      variants.add(v);
    }
  }
  const seen = new Set<number>();
  const out: SongHit[] = [];
  for (const v of variants) {
    const h = runSearch(v, songs, limit);
    for (const x of h) {
      if (seen.has(x.song.id)) continue;
      seen.add(x.song.id);
      out.push({ ...x, score: x.score - 50 }); // penalize typo-fallback
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return out;
}

function runSearch(query: string, songs: Song[], limit: number): SongHit[] {
  const q = query.trim();
  if (!q) return [];
  const qLower = songLower(q);
  const qStem = songStem(q);
  const rawTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map((t) => ({
    raw: t,
    lower: songLower(t),
    stem: songStem(t),
  })).filter((t) => t.stem.length >= 1 || t.lower.length >= 2);

  if (!tokens.length) return [];

  const hits: SongHit[] = [];
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    let titleHits = 0;
    let titleStemHits = 0;
    let contentHits = 0;
    let contentStemHits = 0;
    const matched: string[] = [];
    let allMatched = true;

    for (const tok of tokens) {
      let found = false;
      if (tok.lower && s.titleLower.includes(tok.lower)) {
        titleHits++; matched.push(tok.raw); found = true;
      } else if (tok.stem.length >= 2 && s.titleStem.includes(tok.stem)) {
        titleStemHits++; matched.push(tok.raw); found = true;
      } else if (tok.lower && s.contentLower.includes(tok.lower)) {
        contentHits++; matched.push(tok.raw); found = true;
      } else if (tok.stem.length >= 2 && s.contentStem.includes(tok.stem)) {
        contentStemHits++; matched.push(tok.raw); found = true;
      }
      if (!found) { allMatched = false; break; }
    }
    if (!allMatched) continue;

    let score =
      titleHits * 220 +
      titleStemHits * 140 +
      contentHits * 30 +
      contentStemHits * 18;
    if (qLower && s.titleLower.includes(qLower)) score += 320;
    if (qStem && s.titleStem.includes(qStem)) score += 80;
    if (qLower && s.contentLower.includes(qLower)) score += 90;
    score -= Math.min(40, Math.floor(s.content.length / 400));

    // Pick best slide (stem-aware) for jump-to-slide.
    let bestSlide = 0, bestScore = -1;
    for (let j = 0; j < s.slides.length; j++) {
      const sl = s.slides[j].toLowerCase();
      const st = s.slideStems[j] ?? "";
      let sc = 0;
      for (const tok of tokens) {
        if (tok.lower && sl.includes(tok.lower)) sc += 6;
        else if (tok.stem.length >= 2 && st.includes(tok.stem)) sc += 4;
      }
      if (qLower && sl.includes(qLower)) sc += 12;
      if (sc > bestScore) { bestScore = sc; bestSlide = j; }
    }

    hits.push({ song: s, score, slideIndex: bestSlide, matched });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
