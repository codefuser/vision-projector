/**
 * Project a verse by book/chapter/verse using current language & display mode.
 * Shared helper used by the queue panel, collections panel, sermon bar, and
 * arrow-key navigation so they don't need to recreate `DisplayHit` objects.
 */
import { getBible, type BibleLang } from "./loader";
import { BIBLE_BOOKS } from "./books";
import { useBibleStore } from "./store";
import { projectVerse } from "@/projection/adapters/bible.adapter";

export interface VerseCoord {
  book: number;
  chapter: number;
  verse: number;
}

export function verseTextAt(lang: BibleLang, c: VerseCoord): string | null {
  return getBible(lang)?.[c.book]?.[c.chapter - 1]?.[c.verse - 1] ?? null;
}

export function projectVerseAt(c: VerseCoord): boolean {
  const meta = BIBLE_BOOKS[c.book];
  if (!meta) return false;
  const { displayMode, lang } = useBibleStore.getState();
  const primary: BibleLang = displayMode === "ta" ? "ta" : "en";
  const enTxt = verseTextAt("en", c) ?? "";
  const taTxt = verseTextAt("ta", c) ?? "";
  const primaryText = primary === "ta" ? taTxt : enTxt;
  if (!primaryText) return false;
  const refEn = `${meta.name} ${c.chapter}:${c.verse}`;
  const refTa = `${meta.nameTa} ${c.chapter}:${c.verse}`;
  const primaryLabel =
    displayMode === "ta" || (displayMode === "both" && lang === "ta") ? "தமிழ்" : "KJV";
  const refPrimary = primary === "ta" ? refTa : refEn;
  const refSecondary = displayMode === "both" ? (primary === "ta" ? refEn : refTa) : null;
  const pairText = displayMode === "both" ? (primary === "ta" ? enTxt : taTxt) : undefined;
  const reference = refSecondary ? `${refPrimary} | ${refSecondary}` : refPrimary;
  projectVerse({
    reference,
    text: primaryText,
    translation: primaryLabel,
    subtext: pairText,
    subtranslation: pairText ? (primaryLabel === "KJV" ? "தமிழ்" : "KJV") : undefined,
    referenceEn: refEn,
    referenceTa: refTa,
    textEn: enTxt,
    textTa: taTxt,
    mode: displayMode === "both" ? "both" : primary,
    book: c.book,
    chapter: c.chapter,
    verse: c.verse,
  });
  return true;
}

export function verseId(c: VerseCoord): string {
  return `${c.book}:${c.chapter}:${c.verse}`;
}
