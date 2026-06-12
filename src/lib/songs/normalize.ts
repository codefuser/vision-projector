/**
 * Songs-specific normalization. Builds a consonant "skeleton" that is
 * stable across:
 *   • Tamil script              (இயேசு)
 *   • Standard Tanglish         (yesu)
 *   • Misspelled Tanglish       (yessu, yesuv, yesuvae, yesappa)
 *   • Sound-alikes              (anbu / anpu, vaazhvu / valvu, badham / patham)
 *
 * The skeleton is the string of consonants left after:
 *   1. Tamil → Latin transliteration (preserves vowel mappings).
 *   2. English digraph collapse (dh→d, th→t, zh→l, sh→s, ch→s, ph→p, …).
 *   3. Voiced/voiceless and aspiration collapse (b↔p, g↔k, d↔t, j↔s, w↔v, h dropped).
 *   4. All vowels dropped.
 *   5. Consecutive duplicate consonants collapsed.
 *
 * Two words that "sound the same" produce the same skeleton, so a simple
 * substring check (token.stem ⊆ song.stem) becomes a fuzzy / sound-alike
 * / partial-word match.
 */

const TA_VOWELS: Record<string, string> = {
  "\u0B85": "a", "\u0B86": "a", "\u0B87": "i", "\u0B88": "i",
  "\u0B89": "u", "\u0B8A": "u", "\u0B8E": "e", "\u0B8F": "e",
  "\u0B90": "ai", "\u0B92": "o", "\u0B93": "o", "\u0B94": "au",
};
const TA_SIGNS: Record<string, string> = {
  "\u0BBE": "a", "\u0BBF": "i", "\u0BC0": "i", "\u0BC1": "u", "\u0BC2": "u",
  "\u0BC6": "e", "\u0BC7": "e", "\u0BC8": "ai", "\u0BCA": "o",
  "\u0BCB": "o", "\u0BCC": "au",
};
const TA_CONS: Record<string, string> = {
  "\u0B95": "k", "\u0B99": "n", "\u0B9A": "s", "\u0B9E": "n",
  "\u0B9F": "t", "\u0BA3": "n", "\u0BA4": "t", "\u0BA8": "n",
  "\u0BA9": "n", "\u0BAA": "p", "\u0BAE": "m", "\u0BAF": "y",
  "\u0BB0": "r", "\u0BB1": "r", "\u0BB2": "l", "\u0BB3": "l",
  "\u0BB4": "l", "\u0BB5": "v", "\u0BB6": "s", "\u0BB7": "s",
  "\u0BB8": "s", "\u0BB9": "h",
};
const VIRAMA = "\u0BCD";

/** Transliterate Tamil text to a permissive Latin form (lowercase). Non-Tamil
 *  characters are passed through unchanged. */
export function tamilToLatin(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (TA_VOWELS[c]) { out += TA_VOWELS[c]; continue; }
    if (TA_SIGNS[c]) { out += TA_SIGNS[c]; continue; }
    if (TA_CONS[c]) {
      out += TA_CONS[c];
      const next = s[i + 1];
      if (next === VIRAMA) { i++; continue; }
      if (next && TA_SIGNS[next]) continue; // sign supplies vowel on next loop
      out += "a"; // inherent 'a'
      continue;
    }
    if (c === VIRAMA) continue;
    out += c.toLowerCase();
  }
  return out;
}

/** Lowercase + lossless digraph and voicing normalization (still has vowels). */
export function tanglishLower(s: string): string {
  let t = s.toLowerCase();
  t = t
    .replace(/dh/g, "d").replace(/th/g, "t")
    .replace(/zh/g, "l").replace(/sh/g, "s").replace(/ch/g, "s")
    .replace(/ph/g, "p").replace(/gh/g, "k").replace(/kh/g, "k")
    .replace(/ng/g, "n");
  t = t
    .replace(/b/g, "p").replace(/g/g, "k").replace(/d/g, "t")
    .replace(/j/g, "s").replace(/f/g, "p").replace(/w/g, "v")
    .replace(/h/g, "");
  return t;
}

/** Consonant skeleton — vowels removed, consonants deduped. Stable across
 *  spelling variants and Tamil↔Tanglish. */
export function tanglishStem(s: string): string {
  let t = tanglishLower(s);
  t = t.replace(/[aeiou]/g, "");
  t = t.replace(/([^\s])\1+/g, "$1");
  t = t.replace(/[^a-z\s]/g, "");
  return t.trim();
}

/** Skeleton for ANY input — Tamil, Tanglish, English, mixed. */
export function songStem(s: string): string {
  if (!s) return "";
  const latin = /[\u0B80-\u0BFF]/.test(s) ? tamilToLatin(s) : s;
  return tanglishStem(latin);
}

/** Best-effort vowel-preserving normalization (used for exact phrase bonus). */
export function songLower(s: string): string {
  const latin = /[\u0B80-\u0BFF]/.test(s) ? tamilToLatin(s) : s;
  return tanglishLower(latin).replace(/\s+/g, " ").trim();
}

/* Backward-compat re-exports so other modules importing this file keep working. */
export { normalizeTanglish, normalizeTamil, normalizeForSearch } from "@/lib/bible/search";
