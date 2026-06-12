/**
 * Tanglish → Tamil conversion.
 *
 * Strategy:
 *   1. Dictionary lookup (worship / church / common Tamil) — highest quality,
 *      handles irregular spellings like "yesu" → "யேசு".
 *   2. Fuzzy dictionary match for misspellings ("karthr" → "கர்த்தர்").
 *   3. Phonetic syllabic fallback for unknown words.
 *
 * The converter is word-aware: input is split on whitespace/punctuation and
 * each token converted independently. Punctuation, numbers and pre-converted
 * Tamil characters pass through unchanged.
 *
 * `suggest()` exposes the ranked candidate list used by the live dropdown.
 */
import { CHURCH_DICTIONARY, suggest as dictSuggest, type Suggestion } from "./church-dictionary";

// Re-export the dictionary as the legacy name so callers that import
// `TANGLISH_DICTIONARY` keep working (each value collapses to the primary
// candidate).
export const TANGLISH_DICTIONARY: Record<string, string> = Object.fromEntries(
  Object.entries(CHURCH_DICTIONARY).map(([k, v]) => [k, v[0]]),
);

// ---------------------------------------------------------------------------
// Phonetic fallback
// ---------------------------------------------------------------------------

const VOWELS_INDEP: Array<[string, string]> = [
  ["aa", "ஆ"], ["ee", "ஏ"], ["ii", "ஈ"], ["oo", "ஓ"], ["uu", "ஊ"],
  ["ai", "ஐ"], ["au", "ஔ"],
  ["a", "அ"], ["i", "இ"], ["u", "உ"], ["e", "எ"], ["o", "ஒ"],
];

const VOWEL_SIGNS: Record<string, string> = {
  a: "", aa: "ா", i: "ி", ii: "ீ", u: "ு", uu: "ூ",
  e: "ெ", ee: "ே", ai: "ை", o: "ொ", oo: "ோ", au: "ௌ",
};

const CONSONANTS: Array<[string, string]> = [
  ["zh", "ழ"], ["ng", "ங"], ["nj", "ஞ"], ["ch", "ச"], ["sh", "ஷ"],
  ["th", "த"], ["dh", "த"], ["kh", "க"], ["gh", "க"], ["ph", "ப"],
  ["k", "க"], ["g", "க"], ["c", "ச"], ["j", "ஜ"], ["s", "ஸ"],
  ["t", "ட"], ["d", "ட"], ["n", "ன"], ["p", "ப"], ["b", "ப"],
  ["m", "ம"], ["y", "ய"], ["r", "ர"], ["l", "ல"], ["v", "வ"],
  ["w", "வ"], ["h", "ஹ"], ["f", "ப"], ["z", "ஜ"], ["q", "க"],
  ["x", "க்ஸ"],
];

const PULLI = "்";

function matchAt(s: string, i: number, table: Array<[string, string]>): [string, string] | null {
  for (const [pat, out] of table) if (s.startsWith(pat, i)) return [pat, out];
  return null;
}
function matchVowelKey(s: string, i: number): [string, string] | null {
  for (const [pat] of VOWELS_INDEP) if (s.startsWith(pat, i)) return [pat, pat];
  return null;
}

export function phoneticToTamil(word: string): string {
  const s = word.toLowerCase();
  let out = "";
  let i = 0;
  while (i < s.length) {
    const cons = matchAt(s, i, CONSONANTS);
    if (cons) {
      const [cpat, cout] = cons;
      i += cpat.length;
      const v = matchVowelKey(s, i);
      if (v) {
        const [vpat, vkey] = v;
        out += cout + (VOWEL_SIGNS[vkey] ?? "");
        i += vpat.length;
      } else {
        out += cout + PULLI;
      }
      continue;
    }
    const vowel = matchAt(s, i, VOWELS_INDEP);
    if (vowel) {
      const [vpat, vout] = vowel;
      out += vout;
      i += vpat.length;
      continue;
    }
    out += s[i];
    i += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ASCII_WORD = /^[a-zA-Z][a-zA-Z']*$/;

/**
 * Convert a single Tanglish word to Tamil. Uses (1) exact dict, then
 * (2) the top-ranked fuzzy/prefix suggestion when the word looks like a
 * misspelling of a known entry, else (3) phonetic fallback.
 */
export function convertWord(word: string): string {
  if (!word) return word;
  if (!ASCII_WORD.test(word)) return word;
  const lower = word.toLowerCase();
  const exact = CHURCH_DICTIONARY[lower];
  if (exact && exact[0]) return exact[0];
  // Cheap fuzzy: only accept when the *only* hit is a confident match.
  if (lower.length >= 4) {
    const ranked = dictSuggest(lower, 1);
    if (ranked.length && ranked[0].score <= 3) return ranked[0].tamil;
  }
  return phoneticToTamil(lower);
}

export function convertText(text: string): string {
  if (!text) return text;
  return text.replace(/[A-Za-z][A-Za-z']*/g, (m) => convertWord(m));
}

/**
 * Convert only completed words — everything followed by whitespace or
 * punctuation. The last partial token (no trailing delimiter) is left as-is
 * so the operator can keep typing it.
 */
export function convertCompleted(text: string): { converted: string; trailing: string } {
  if (!text) return { converted: "", trailing: "" };
  const match = /[A-Za-z][A-Za-z']*$/.exec(text);
  if (!match) return { converted: convertText(text), trailing: "" };
  const cut = match.index;
  const head = text.slice(0, cut);
  const tail = text.slice(cut);
  return { converted: convertText(head), trailing: tail };
}

/** Live suggestion API — re-exported from the dictionary module. */
export function suggestTanglish(prefix: string, limit = 6): Suggestion[] {
  return dictSuggest(prefix, limit);
}

export type { Suggestion };
