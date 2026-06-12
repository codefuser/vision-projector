import enAsset from "@/assets/bible/en.bible.json.asset.json";
import taAsset from "@/assets/bible/ta.bible.json.asset.json";

export type BibleLang = "en" | "ta";

/** Verses: data[bookIndex][chapterIndex0Based][verseIndex0Based] = string */
export type BibleData = string[][][];

const ASSET_URL: Record<BibleLang, string> = {
  en: (enAsset as { url: string }).url,
  ta: (taAsset as { url: string }).url,
};

const cache: Partial<Record<BibleLang, BibleData>> = {};
const inflight: Partial<Record<BibleLang, Promise<BibleData>>> = {};

export function isBibleLoaded(lang: BibleLang): boolean {
  return !!cache[lang];
}

export function getBible(lang: BibleLang): BibleData | undefined {
  return cache[lang];
}

export async function loadBible(lang: BibleLang): Promise<BibleData> {
  if (cache[lang]) return cache[lang]!;
  if (inflight[lang]) return inflight[lang]!;
  const p = fetch(ASSET_URL[lang])
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${lang} bible: ${r.status}`);
      return r.json() as Promise<BibleData>;
    })
    .then((data) => {
      cache[lang] = data;
      delete inflight[lang];
      return data;
    })
    .catch((e) => {
      delete inflight[lang];
      throw e;
    });
  inflight[lang] = p;
  return p;
}

export function getVerse(lang: BibleLang, book: number, chapter: number, verse: number): string | null {
  const d = cache[lang];
  if (!d) return null;
  return d[book]?.[chapter - 1]?.[verse - 1] ?? null;
}
