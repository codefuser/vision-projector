/**
 * Tanglish → Tamil conversion.
 *
 * Two-stage strategy:
 *   1. Dictionary lookup of worship / common-Tamil terms (highest quality,
 *      handles proper nouns and irregular spellings like "yesu" → "யேசு").
 *   2. Phonetic syllabic fallback for unknown words. A small consonant +
 *      vowel mapper that walks the Roman string greedily.
 *
 * The converter is word-aware: input is split on whitespace/punctuation and
 * each token converted independently. Punctuation, numbers and pre-converted
 * Tamil characters pass through unchanged. ASCII-only words are converted;
 * everything else is left alone so users can mix English freely.
 */

// ---------------------------------------------------------------------------
// Dictionary — worship vocabulary. Lowercase keys; common spelling variants.
// Add liberally; lookups are O(1).
// ---------------------------------------------------------------------------
export const TANGLISH_DICTIONARY: Record<string, string> = {
  // Greetings / common
  vanakkam: "வணக்கம்",
  vanakam: "வணக்கம்",
  nandri: "நன்றி",
  amen: "ஆமென்",
  aamen: "ஆமென்",
  halleluya: "அல்லேலூயா",
  hallelujah: "அல்லேலூயா",
  alleluya: "அல்லேலூயா",
  praise: "துதி",
  // God / Jesus / Lord
  yesu: "யேசு",
  iyesu: "இயேசு",
  esu: "ஏசு",
  yesuv: "யேசுவே",
  yesuve: "யேசுவே",
  jesus: "இயேசு",
  christ: "கிறிஸ்து",
  kiristu: "கிறிஸ்து",
  karthar: "கர்த்தர்",
  karthare: "கர்த்தரே",
  kartharae: "கர்த்தரே",
  devan: "தேவன்",
  devane: "தேவனே",
  thevan: "தேவன்",
  appa: "அப்பா",
  yesappa: "யேசப்பா",
  pidha: "பிதா",
  pitha: "பிதா",
  pithavae: "பிதாவே",
  aaviyanavar: "ஆவியானவர்",
  parisutha: "பரிசுத்த",
  parisuththa: "பரிசுத்த",
  parisuthamana: "பரிசுத்தமான",
  // Concepts
  anbu: "அன்பு",
  anbe: "அன்பே",
  kirubai: "கிருபை",
  kirubaiyae: "கிருபையே",
  irakkam: "இரக்கம்",
  santhi: "சாந்தி",
  samadhanam: "சமாதானம்",
  magizhchi: "மகிழ்ச்சி",
  magizhci: "மகிழ்ச்சி",
  nambikkai: "நம்பிக்கை",
  vishuvasam: "விசுவாசம்",
  visuvasam: "விசுவாசம்",
  jebam: "ஜெபம்",
  jepam: "ஜெபம்",
  aaradhanai: "ஆராதனை",
  aradhanai: "ஆராதனை",
  thuthi: "துதி",
  mahimai: "மகிமை",
  irul: "இருள்",
  oli: "ஒளி",
  vazhi: "வழி",
  unmai: "உண்மை",
  jeevan: "ஜீவன்",
  jivan: "ஜீவன்",
  marivu: "மரிவு",
  paavam: "பாவம்",
  pavam: "பாவம்",
  manippu: "மன்னிப்பு",
  manithan: "மனிதன்",
  rajan: "ராஜன்",
  raja: "ராஜா",
  rajadhi: "ராஜாதி",
  vetri: "வெற்றி",
  // Church / service
  thiruchabai: "திருச்சபை",
  sabai: "சபை",
  sungeetham: "சங்கீதம்",
  sangeetham: "சங்கீதம்",
  vasanam: "வசனம்",
  vethagamam: "வேதாகமம்",
  vedhagamam: "வேதாகமம்",
  vedham: "வேதம்",
  prarthanai: "பிரார்த்தனை",
  saatchi: "சாட்சி",
  satchi: "சாட்சி",
  paadal: "பாடல்",
  padal: "பாடல்",
  paattu: "பாட்டு",
  pattu: "பாட்டு",
  // Time / events
  gnayiru: "ஞாயிறு",
  njayiru: "ஞாயிறு",
  sunday: "ஞாயிற்றுக்கிழமை",
  kootam: "கூட்டம்",
  koottam: "கூட்டம்",
  visheshamana: "விசேஷமான",
  vizha: "விழா",
  vizhaa: "விழா",
  // People
  achchan: "அச்சன்",
  amma: "அம்மா",
  thai: "தாய்",
  tagappan: "தகப்பன்",
  thagappan: "தகப்பன்",
  makkal: "மக்கள்",
  pillaigal: "பிள்ளைகள்",
  pillaikal: "பிள்ளைகள்",
  illuvanthor: "இளைஞர்",
  ilaignar: "இளைஞர்",
  // Pronouns / particles
  naan: "நான்",
  nee: "நீ",
  neer: "நீர்",
  ungal: "உங்கள்",
  enathu: "எனது",
  unathu: "உனது",
  avar: "அவர்",
  avarude: "அவருடைய",
  enru: "என்று",
  endru: "என்று",
  enna: "என்ன",
  illai: "இல்லை",
  irukku: "இருக்கு",
  irukkum: "இருக்கும்",
  irukirar: "இருக்கிறார்",
  varugiraar: "வருகிறார்",
  varugirar: "வருகிறார்",
  varuvar: "வருவார்",
  vaarungal: "வாருங்கள்",
  vanga: "வாங்க",
  pogalam: "போகலாம்",
  seyvom: "செய்வோம்",
};

// ---------------------------------------------------------------------------
// Phonetic fallback
// ---------------------------------------------------------------------------

// Independent vowels (used at word start or after another vowel).
const VOWELS_INDEP: Array<[string, string]> = [
  ["aa", "ஆ"], ["ee", "ஏ"], ["ii", "ஈ"], ["oo", "ஓ"], ["uu", "ஊ"],
  ["ai", "ஐ"], ["au", "ஔ"],
  ["a", "அ"], ["i", "இ"], ["u", "உ"], ["e", "எ"], ["o", "ஒ"],
];

// Vowel signs (kombu/kaal) — appended after a consonant.
const VOWEL_SIGNS: Record<string, string> = {
  a: "", aa: "ா", i: "ி", ii: "ீ", u: "ு", uu: "ூ",
  e: "ெ", ee: "ே", ai: "ை", o: "ொ", oo: "ோ", au: "ௌ",
};

// Consonants, longest-first so "zh"/"ch"/"th"/"ng" match before single letters.
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
  for (const [pat, out] of table) {
    if (s.startsWith(pat, i)) return [pat, out];
  }
  return null;
}

function matchVowelKey(s: string, i: number): [string, string] | null {
  for (const [pat] of VOWELS_INDEP) {
    if (s.startsWith(pat, i)) return [pat, pat];
  }
  return null;
}

/**
 * Greedy syllabic conversion of a single ASCII-lowercase token to Tamil.
 * Walks left-to-right: at each position, prefer a consonant (+ optional
 * trailing vowel) or an independent vowel.
 */
export function phoneticToTamil(word: string): string {
  const s = word.toLowerCase();
  let out = "";
  let i = 0;
  let lastWasConsonant = false;

  while (i < s.length) {
    // Try consonant
    const cons = matchAt(s, i, CONSONANTS);
    if (cons) {
      const [cpat, cout] = cons;
      i += cpat.length;
      // Look for following vowel (sign)
      const v = matchVowelKey(s, i);
      if (v) {
        const [vpat, vkey] = v;
        out += cout + (VOWEL_SIGNS[vkey] ?? "");
        i += vpat.length;
        lastWasConsonant = false;
      } else {
        // Bare consonant — add pulli; next iteration may add another consonant.
        out += cout + PULLI;
        lastWasConsonant = true;
      }
      continue;
    }

    // Try independent vowel
    const vowel = matchAt(s, i, VOWELS_INDEP);
    if (vowel) {
      const [vpat, vout] = vowel;
      // If we just emitted a consonant+pulli, this is unreachable (consumed above).
      out += vout;
      i += vpat.length;
      lastWasConsonant = false;
      continue;
    }

    // Unknown character — pass through.
    out += s[i];
    i += 1;
    lastWasConsonant = false;
  }

  // Trim trailing schwa: a lone "a" at the end is typically silent in dictionary
  // entries, but our consonant-then-vowel handling already covers that.
  void lastWasConsonant;
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ASCII_WORD = /^[a-zA-Z][a-zA-Z']*$/;

/** Convert a single Tanglish word to Tamil (dictionary first, then phonetic). */
export function convertWord(word: string): string {
  if (!word) return word;
  if (!ASCII_WORD.test(word)) return word;
  const lower = word.toLowerCase();
  const dict = TANGLISH_DICTIONARY[lower];
  if (dict) return dict;
  return phoneticToTamil(lower);
}

/**
 * Convert a chunk of text, preserving whitespace and punctuation.
 * Each ASCII word is converted; non-ASCII tokens (already Tamil, etc.) and
 * numbers / punctuation pass through unchanged.
 */
export function convertText(text: string): string {
  if (!text) return text;
  // Split keeping delimiters so we can reassemble verbatim.
  return text.replace(/[A-Za-z][A-Za-z']*/g, (m) => convertWord(m));
}

/**
 * Convert only completed words — i.e. anything followed by whitespace or
 * punctuation. The last partial token (no trailing delimiter) is left as-is
 * so the operator can keep typing it. Used for live-as-you-type conversion.
 *
 * Returns { converted, trailing } so callers can reapply the unchanged tail.
 */
export function convertCompleted(text: string): { converted: string; trailing: string } {
  if (!text) return { converted: "", trailing: "" };
  // Find the last word boundary; everything after is "in-flight".
  const match = /[A-Za-z][A-Za-z']*$/.exec(text);
  if (!match) return { converted: convertText(text), trailing: "" };
  const cut = match.index;
  const head = text.slice(0, cut);
  const tail = text.slice(cut);
  return { converted: convertText(head), trailing: tail };
}
