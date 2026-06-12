/**
 * Song full-text search — title + lyric content. Mirrors the Bible search
 * engine: Tanglish + Tamil normalization, multi-token AND match, exact
 * phrase bonus, title-hit bonus. Single pass over 16k songs, no index —
 * fast enough at this scale and avoids large in-memory token tables.
 */
import type { Song } from "./loader";
import { normalizeTanglish, normalizeTamil } from "./normalize";

export interface SongHit {
  song: Song;
  score: number;
  /** Which slide best matched the query (for jump-to-slide on projection). */
  slideIndex: number;
  matched: string[];
}

export function searchSongs(query: string, songs: Song[], limit = 80): SongHit[] {
  const q = query.trim();
  if (!q) return [];
  const qLower = q.toLowerCase();
  const isTamilQuery = /[\u0B80-\u0BFF]/.test(q);
  const tokensRaw = qLower.split(/\s+/).filter(Boolean);
  const tokensNorm = tokensRaw.map((t) =>
    isTamilQuery ? normalizeTamil(t) : normalizeTanglish(t),
  );

  const hits: SongHit[] = [];
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const titleLower = s.titleLower;
    const contentLower = s.contentLower;
    const titleNorm = s.titleNorm;
    const contentNorm = s.contentNorm;

    let titleHits = 0;
    let contentHits = 0;
    let normTitleHits = 0;
    let normContentHits = 0;
    const matched: string[] = [];

    for (let k = 0; k < tokensRaw.length; k++) {
      const rt = tokensRaw[k];
      const nt = tokensNorm[k];
      let found = false;
      if (rt && titleLower.includes(rt)) { titleHits++; found = true; matched.push(rt); }
      else if (rt && contentLower.includes(rt)) { contentHits++; found = true; matched.push(rt); }
      else if (nt && nt.length >= 2 && titleNorm.includes(nt)) { normTitleHits++; found = true; matched.push(rt); }
      else if (nt && nt.length >= 2 && contentNorm.includes(nt)) { normContentHits++; found = true; matched.push(rt); }
      if (!found) { titleHits = -1; break; }
    }
    if (titleHits < 0) continue;

    let score = titleHits * 200 + normTitleHits * 120 + contentHits * 25 + normContentHits * 15;
    if (titleLower.includes(qLower)) score += 300;
    if (titleLower.startsWith(tokensRaw[0])) score += 60;
    if (contentLower.includes(qLower)) score += 80;
    // Prefer shorter / well-structured songs slightly.
    score -= Math.min(40, Math.floor(s.content.length / 400));

    // Pick best slide for jump-to-slide hint.
    let bestSlide = 0;
    let bestSlideScore = -1;
    for (let j = 0; j < s.slides.length; j++) {
      const sl = s.slides[j].toLowerCase();
      let sc = 0;
      for (const rt of tokensRaw) if (rt && sl.includes(rt)) sc += 5;
      if (sl.includes(qLower)) sc += 10;
      if (sc > bestSlideScore) { bestSlideScore = sc; bestSlide = j; }
    }

    hits.push({ song: s, score, slideIndex: bestSlide, matched });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
