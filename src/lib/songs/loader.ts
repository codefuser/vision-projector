import asset from "@/assets/songs/tamilsongs.json.asset.json";

export interface RawSong {
  id: number;
  t: string;   // title
  c: string;   // content (lyrics, newline-separated)
  a: string;   // artist
  al: string;  // album
  s: string;   // scale
}

export interface Song {
  id: number;
  title: string;
  content: string;
  artist: string;
  album: string;
  scale: string;
  /** Stanzas split on blank lines. */
  slides: string[];
  /** Pre-normalized title for fast Tanglish/Tamil search. */
  titleNorm: string;
  /** Pre-normalized content for fast fuzzy search. */
  contentNorm: string;
  /** Lowercased title for exact substring match. */
  titleLower: string;
  /** Lowercased content for exact substring match. */
  contentLower: string;
}

import { normalizeTanglish, normalizeTamil } from "./normalize";

let cache: Song[] | null = null;
let inflight: Promise<Song[]> | null = null;

function buildSlides(content: string): string[] {
  return content
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildSong(r: RawSong): Song {
  const title = r.t.trim();
  const content = r.c.trim();
  const isTamilTitle = /[\u0B80-\u0BFF]/.test(title);
  const isTamilContent = /[\u0B80-\u0BFF]/.test(content);
  return {
    id: r.id,
    title,
    content,
    artist: r.a,
    album: r.al,
    scale: r.s,
    slides: buildSlides(content),
    titleNorm: isTamilTitle ? normalizeTamil(title) : normalizeTanglish(title),
    contentNorm: isTamilContent ? normalizeTamil(content) : normalizeTanglish(content),
    titleLower: title.toLowerCase(),
    contentLower: content.toLowerCase(),
  };
}

export function getSongs(): Song[] | null {
  return cache;
}

export function isSongsLoaded(): boolean {
  return !!cache;
}

export async function loadSongs(): Promise<Song[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  const url = (asset as { url: string }).url;
  inflight = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load songs: ${r.status}`);
      return r.json() as Promise<RawSong[]>;
    })
    .then((rows) => {
      cache = rows.map(buildSong);
      inflight = null;
      return cache;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
}
