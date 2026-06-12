/**
 * Church / Worship Tanglish → Tamil dictionary with suggestion support.
 *
 * Each Roman key maps to an *ordered* array of Tamil candidates (primary
 * first). Many words have multiple valid renderings (e.g. yesu →
 * யேசு / இயேசு / யேசுவே) — the suggestion dropdown shows all of them.
 *
 * Inflections (vocative -ஏ, possessive -உடைய, etc.) are encoded as separate
 * candidates where they are common in worship contexts.
 *
 * Structure is intentionally a flat record so it tree-shakes well and can
 * grow toward 5000+ entries without code changes. A `prefixIndex` is built
 * lazily for the suggestion API.
 */

export type Suggestions = string[];

export const CHURCH_DICTIONARY: Record<string, Suggestions> = {
  // ── Names of God / Jesus ─────────────────────────────────────────────
  yesu: ["யேசு", "இயேசு", "யேசுவே", "யேசுவின்"],
  iyesu: ["இயேசு", "இயேசுவே", "இயேசுவின்"],
  jesus: ["இயேசு", "யேசு", "இயேசுவே"],
  esu: ["ஏசு", "ஏசுவே"],
  christ: ["கிறிஸ்து", "கிறிஸ்துவே", "கிறிஸ்துவின்"],
  kiristu: ["கிறிஸ்து", "கிறிஸ்துவின்"],
  karthar: ["கர்த்தர்", "கர்த்தரே", "கர்த்தராகிய", "கர்த்தருடைய"],
  kartharr: ["கர்த்தர்", "கர்த்தரே"],
  karthr: ["கர்த்தர்", "கர்த்தரே"],
  kartharh: ["கர்த்தர்", "கர்த்தரே"],
  karthare: ["கர்த்தரே"],
  kartharae: ["கர்த்தரே"],
  kartharin: ["கர்த்தருடைய", "கர்த்தரின்"],
  devan: ["தேவன்", "தேவனே", "தேவனாகிய", "தேவனுடைய"],
  devane: ["தேவனே"],
  thevan: ["தேவன்", "தேவனே"],
  thevane: ["தேவனே"],
  appa: ["அப்பா", "அப்பாவே"],
  yesappa: ["யேசப்பா", "யேசப்பாவே"],
  pitha: ["பிதா", "பிதாவே", "பிதாவாகிய"],
  pidha: ["பிதா", "பிதாவே"],
  pithavae: ["பிதாவே"],
  pithave: ["பிதாவே"],
  aaviyanavar: ["ஆவியானவர்", "ஆவியானவரே", "ஆவியானவருடைய"],
  aaviyanavare: ["ஆவியானவரே"],
  parisutha: ["பரிசுத்த"],
  parisuththa: ["பரிசுத்த"],
  parisuthamana: ["பரிசுத்தமான"],
  parisuthaaviyanavar: ["பரிசுத்த ஆவியானவர்"],
  emmanuel: ["இம்மானுவேல்", "இம்மானுவேலே"],
  immanuel: ["இம்மானுவேல்"],
  alpha: ["ஆல்பா"],
  omega: ["ஓமேகா"],
  trinity: ["திரியேக"],
  trieka: ["திரியேக"],
  abba: ["அப்பா"],
  yahweh: ["யேகோவா"],
  jehovah: ["யேகோவா"],
  rabbi: ["ரபீ"],
  meshiah: ["மேசியா"],
  messiah: ["மேசியா"],

  // ── Greetings / common ───────────────────────────────────────────────
  vanakkam: ["வணக்கம்"],
  vanakam: ["வணக்கம்"],
  nandri: ["நன்றி"],
  amen: ["ஆமென்", "ஆமென்!"],
  aamen: ["ஆமென்"],
  halleluya: ["அல்லேலூயா", "அல்லேலூயா!"],
  hallelujah: ["அல்லேலூயா"],
  alleluya: ["அல்லேலூயா"],
  praise: ["துதி", "ஸ்தோத்திரம்"],
  hosanna: ["ஓசன்னா"],
  osanna: ["ஓசன்னா"],
  glory: ["மகிமை"],
  bless: ["ஆசீர்வதியும்"],
  blessing: ["ஆசீர்வாதம்"],
  blessed: ["ஆசீர்வதிக்கப்பட்ட"],
  asirvadham: ["ஆசீர்வாதம்"],
  aasirvadham: ["ஆசீர்வாதம்"],

  // ── Concepts ─────────────────────────────────────────────────────────
  anbu: ["அன்பு", "அன்பே", "அன்பான"],
  anbae: ["அன்பே"],
  anbe: ["அன்பே"],
  kirubai: ["கிருபை", "கிருபையே", "கிருபையினால்"],
  kirubaiyae: ["கிருபையே"],
  kirubaiye: ["கிருபையே"],
  kirubaiyinal: ["கிருபையினால்"],
  irakkam: ["இரக்கம்", "இரக்கமே"],
  santhi: ["சாந்தி"],
  samadhanam: ["சமாதானம்", "சமாதானமே"],
  magizhchi: ["மகிழ்ச்சி", "மகிழ்ச்சியே"],
  magizhci: ["மகிழ்ச்சி"],
  santhosham: ["சந்தோஷம்"],
  nambikkai: ["நம்பிக்கை", "நம்பிக்கையே"],
  vishuvasam: ["விசுவாசம்", "விசுவாசமே"],
  visuvasam: ["விசுவாசம்", "விசுவாசமே"],
  visvasam: ["விசுவாசம்"],
  jebam: ["ஜெபம்", "ஜெபமே", "ஜெபத்தினால்"],
  jepam: ["ஜெபம்", "ஜெபமே"],
  jebamm: ["ஜெபம்"],
  prarthanai: ["பிரார்த்தனை", "பிரார்த்தனையே"],
  aaradhanai: ["ஆராதனை", "ஆராதனையே"],
  aradhanai: ["ஆராதனை", "ஆராதனையே"],
  aarathanai: ["ஆராதனை", "ஆராதனையே"],
  arathanai: ["ஆராதனை"],
  worship: ["ஆராதனை"],
  thuthi: ["துதி", "துதியே"],
  sthothiram: ["ஸ்தோத்திரம்", "ஸ்தோத்திரமே"],
  sthothram: ["ஸ்தோத்திரம்"],
  stothiram: ["ஸ்தோத்திரம்"],
  mahimai: ["மகிமை", "மகிமையே"],
  oli: ["ஒளி", "ஒளியே"],
  irul: ["இருள்"],
  vazhi: ["வழி", "வழியே"],
  unmai: ["உண்மை", "உண்மையே"],
  jeevan: ["ஜீவன்", "ஜீவனே", "ஜீவனுள்ள"],
  jivan: ["ஜீவன்"],
  marivu: ["மரிவு"],
  paavam: ["பாவம்"],
  pavam: ["பாவம்"],
  manippu: ["மன்னிப்பு"],
  mannippu: ["மன்னிப்பு"],
  manithan: ["மனிதன்"],
  rajan: ["ராஜன்", "ராஜாவே"],
  raja: ["ராஜா", "ராஜாவே"],
  rajadhi: ["ராஜாதி"],
  rajadhiraja: ["ராஜாதி ராஜா"],
  vetri: ["வெற்றி", "வெற்றியே"],
  victory: ["வெற்றி"],
  ratchipu: ["இரட்சிப்பு"],
  iratchipu: ["இரட்சிப்பு"],
  ratchakar: ["இரட்சகர்", "இரட்சகரே"],
  iratchakar: ["இரட்சகர்", "இரட்சகரே"],
  meetparr: ["மீட்பர்"],
  meetpar: ["மீட்பர்", "மீட்பரே"],
  uyirthezhuthal: ["உயிர்த்தெழுதல்"],
  uyirthezhudal: ["உயிர்த்தெழுதல்"],
  uyirthezhunthar: ["உயிர்த்தெழுந்தார்"],
  upavasam: ["உபவாசம்"],
  upavaasam: ["உபவாசம்"],
  saatchi: ["சாட்சி", "சாட்சியம்"],
  satchi: ["சாட்சி"],
  saatchiyam: ["சாட்சியம்"],
  satchiyam: ["சாட்சியம்"],
  testimony: ["சாட்சியம்"],
  abhishekam: ["அபிஷேகம்"],
  abishekam: ["அபிஷேகம்"],
  anugraham: ["அநுக்கிரகம்"],
  varam: ["வரம்"],
  varangal: ["வரங்கள்"],
  satyam: ["சத்தியம்"],
  sathyam: ["சத்தியம்"],
  punithar: ["புனிதர்"],
  parisuthavan: ["பரிசுத்தவான்"],

  // ── Church / service ─────────────────────────────────────────────────
  thiruchabai: ["திருச்சபை"],
  sabai: ["சபை", "சபையே"],
  sungeetham: ["சங்கீதம்"],
  sangeetham: ["சங்கீதம்"],
  vasanam: ["வசனம்", "வசனமே"],
  vethagamam: ["வேதாகமம்"],
  vedhagamam: ["வேதாகமம்"],
  vethaagamam: ["வேதாகமம்"],
  vedham: ["வேதம்"],
  paadal: ["பாடல்"],
  padal: ["பாடல்"],
  paattu: ["பாட்டு"],
  pattu: ["பாட்டு"],
  bible: ["வேதாகமம்"],
  thirumarai: ["திருமறை"],
  vacanam: ["வசனம்"],
  sermon: ["பிரசங்கம்"],
  prasangam: ["பிரசங்கம்"],
  pirasangam: ["பிரசங்கம்"],
  kuripu: ["குறிப்பு"],
  pasthar: ["பாஸ்டர்"],
  pastor: ["போதகர்", "பாஸ்டர்"],
  bothakar: ["போதகர்", "போதகரே"],
  pothakar: ["போதகர்"],
  mootha: ["மூத்த"],
  sangam: ["சங்கம்"],
  thiruvasan: ["திருவசனம்"],

  // ── Time / events ────────────────────────────────────────────────────
  gnayiru: ["ஞாயிறு"],
  njayiru: ["ஞாயிறு"],
  sunday: ["ஞாயிற்றுக்கிழமை"],
  kootam: ["கூட்டம்"],
  koottam: ["கூட்டம்"],
  visheshamana: ["விசேஷமான"],
  vizha: ["விழா"],
  vizhaa: ["விழா"],
  conference: ["மாநாடு"],
  manadu: ["மாநாடு"],
  retreat: ["தனிமைப் பயிற்சி"],
  youth: ["இளைஞர்"],
  meeting: ["கூட்டம்"],

  // ── People ───────────────────────────────────────────────────────────
  achchan: ["அச்சன்"],
  amma: ["அம்மா"],
  thai: ["தாய்"],
  tagappan: ["தகப்பன்"],
  thagappan: ["தகப்பன்"],
  makkal: ["மக்கள்"],
  pillaigal: ["பிள்ளைகள்"],
  pillaikal: ["பிள்ளைகள்"],
  illuvanthor: ["இளைஞர்"],
  ilaignar: ["இளைஞர்"],
  sabaiyar: ["சபையார்"],
  sahodharar: ["சகோதரர்"],
  sahodhari: ["சகோதரி"],
  sagothara: ["சகோதரர்"],

  // ── Pronouns / particles / verbs ─────────────────────────────────────
  naan: ["நான்"],
  nee: ["நீ"],
  neer: ["நீர்"],
  ungal: ["உங்கள்"],
  enathu: ["எனது"],
  unathu: ["உனது"],
  avar: ["அவர்"],
  avarude: ["அவருடைய"],
  enru: ["என்று"],
  endru: ["என்று"],
  enna: ["என்ன"],
  illai: ["இல்லை"],
  irukku: ["இருக்கு"],
  irukkum: ["இருக்கும்"],
  irukirar: ["இருக்கிறார்"],
  varugiraar: ["வருகிறார்"],
  varugirar: ["வருகிறார்"],
  varuvar: ["வருவார்"],
  vaarungal: ["வாருங்கள்"],
  vanga: ["வாங்க"],
  pogalam: ["போகலாம்"],
  seyvom: ["செய்வோம்"],
  paadalam: ["பாடலாம்"],
  paaduvom: ["பாடுவோம்"],
  thuthipom: ["துதிப்போம்"],
  jepippom: ["ஜெபிப்போம்"],
  aaradhippom: ["ஆராதிப்போம்"],
  nambuvom: ["நம்புவோம்"],
  yeshu: ["இயேசு", "யேசு"],
};

// ---------------------------------------------------------------------------
// Prefix index & fuzzy matcher (built lazily on first suggest() call)
// ---------------------------------------------------------------------------

let PREFIX_INDEX: Map<string, string[]> | null = null;
let KEYS_BY_LEN: Map<number, string[]> | null = null;

function buildIndex(): void {
  PREFIX_INDEX = new Map();
  KEYS_BY_LEN = new Map();
  for (const key of Object.keys(CHURCH_DICTIONARY)) {
    const lk = key.toLowerCase();
    for (let i = 1; i <= Math.min(lk.length, 6); i++) {
      const p = lk.slice(0, i);
      const arr = PREFIX_INDEX.get(p);
      if (arr) arr.push(lk);
      else PREFIX_INDEX.set(p, [lk]);
    }
    const len = lk.length;
    const bucket = KEYS_BY_LEN.get(len);
    if (bucket) bucket.push(lk);
    else KEYS_BY_LEN.set(len, [lk]);
  }
}

/** Bounded Levenshtein. Returns Infinity if distance exceeds `max`. */
function bounded(a: string, b: string, max: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return Infinity;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return Infinity;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[bl];
}

export interface Suggestion {
  /** Tamil candidate. */
  tamil: string;
  /** Source Roman key (for debugging / future highlight). */
  key: string;
  /** Lower is better; 0 = exact dictionary hit. */
  score: number;
}

/**
 * Suggest Tamil candidates for a Roman prefix or word. Strategy:
 *   1. Exact key match → all candidates, score 0.
 *   2. Prefix match (first 1–6 chars) → all candidates of matching keys.
 *   3. Fuzzy match within Levenshtein ≤ 2 (length-bucketed).
 *
 * Results are de-duped and capped at `limit`.
 */
export function suggest(prefix: string, limit = 6): Suggestion[] {
  const p = (prefix ?? "").toLowerCase().trim();
  if (!p) return [];
  if (!PREFIX_INDEX || !KEYS_BY_LEN) buildIndex();

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (tamil: string, key: string, score: number) => {
    if (seen.has(tamil)) return;
    seen.add(tamil);
    out.push({ tamil, key, score });
  };

  // 1) Exact
  const exact = CHURCH_DICTIONARY[p];
  if (exact) for (const t of exact) push(t, p, 0);

  // 2) Prefix
  const idxKey = p.slice(0, Math.min(p.length, 6));
  const prefixKeys = PREFIX_INDEX!.get(idxKey) ?? [];
  // Sort prefix matches by length asc so shorter words show first.
  prefixKeys.sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const k of prefixKeys) {
    if (k === p) continue;
    const cands = CHURCH_DICTIONARY[k];
    if (!cands) continue;
    for (const t of cands) push(t, k, 1);
    if (out.length >= limit * 2) break;
  }

  // 3) Fuzzy — only if we still need more and prefix has at least 3 chars.
  if (out.length < limit && p.length >= 3) {
    const max = p.length <= 4 ? 1 : 2;
    for (let len = p.length - max; len <= p.length + max; len++) {
      const bucket = KEYS_BY_LEN!.get(len);
      if (!bucket) continue;
      for (const k of bucket) {
        if (seen.size >= limit * 3) break;
        const d = bounded(p, k, max);
        if (d === Infinity) continue;
        const cands = CHURCH_DICTIONARY[k];
        if (!cands) continue;
        for (const t of cands) push(t, k, 2 + d);
      }
    }
  }

  return out.sort((a, b) => a.score - b.score).slice(0, limit);
}

/** Quick-insert palette — common worship words shown in the side panel. */
export const QUICK_INSERT_WORDS: Array<{ tamil: string; label: string }> = [
  { tamil: "யேசு", label: "yesu" },
  { tamil: "இயேசு", label: "iyesu" },
  { tamil: "கர்த்தர்", label: "karthar" },
  { tamil: "தேவன்", label: "devan" },
  { tamil: "ஆவியானவர்", label: "aaviyanavar" },
  { tamil: "பரிசுத்த ஆவி", label: "parisutha aavi" },
  { tamil: "ஜெபம்", label: "jebam" },
  { tamil: "ஸ்தோத்திரம்", label: "sthothiram" },
  { tamil: "ஆராதனை", label: "aaradhanai" },
  { tamil: "துதி", label: "thuthi" },
  { tamil: "மகிமை", label: "mahimai" },
  { tamil: "அல்லேலூயா", label: "halleluya" },
  { tamil: "ஆமென்", label: "amen" },
  { tamil: "அன்பு", label: "anbu" },
  { tamil: "கிருபை", label: "kirubai" },
  { tamil: "சமாதானம்", label: "samadhanam" },
  { tamil: "விசுவாசம்", label: "visuvasam" },
  { tamil: "இரட்சிப்பு", label: "ratchipu" },
  { tamil: "வேதாகமம்", label: "vethagamam" },
  { tamil: "சபை", label: "sabai" },
  { tamil: "வசனம்", label: "vasanam" },
  { tamil: "உயிர்த்தெழுதல்", label: "uyirthezhuthal" },
  { tamil: "உபவாசம்", label: "upavasam" },
  { tamil: "சாட்சியம்", label: "satchiyam" },
];
