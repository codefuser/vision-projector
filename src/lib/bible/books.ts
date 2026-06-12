/**
 * 66-book Bible canon metadata used by both the English and Tamil DBs.
 * The source databases (Book column, 0..65) are aligned to this order.
 *
 * `aliases` is a flat list of search tokens (lowercased) — full names,
 * common abbreviations, and number-prefixed variants (e.g. "1 jn", "1jn").
 * The fuzzy search engine matches against this list directly.
 */
export interface BibleBookMeta {
  /** 0-indexed canonical position matching the source DB `Book` column. */
  index: number;
  /** Three-letter canonical code (USFM). */
  code: string;
  /** Full English name. */
  name: string;
  /** Full Tamil name. */
  nameTa: string;
  /** Number of chapters. */
  chapters: number;
  /** Lowercase search tokens (full + abbreviations). */
  aliases: string[];
  /** "OT" or "NT". */
  testament: "OT" | "NT";
}

const make = (
  index: number,
  code: string,
  name: string,
  nameTa: string,
  chapters: number,
  aliases: string[],
  testament: "OT" | "NT",
): BibleBookMeta => ({
  index,
  code,
  name,
  nameTa,
  chapters,
  testament,
  aliases: Array.from(
    new Set([name.toLowerCase(), code.toLowerCase(), nameTa, ...aliases.map((a) => a.toLowerCase())]),
  ),
});

export const BIBLE_BOOKS: BibleBookMeta[] = [
  make(0, "GEN", "Genesis", "ஆதியாகமம்", 50, ["gen", "ge", "gn"], "OT"),
  make(1, "EXO", "Exodus", "யாத்திராகமம்", 40, ["exo", "ex", "exod"], "OT"),
  make(2, "LEV", "Leviticus", "லேவியராகமம்", 27, ["lev", "le", "lv"], "OT"),
  make(3, "NUM", "Numbers", "எண்ணாகமம்", 36, ["num", "nu", "nm", "nb"], "OT"),
  make(4, "DEU", "Deuteronomy", "உபாகமம்", 34, ["deu", "dt", "deut"], "OT"),
  make(5, "JOS", "Joshua", "யோசுவா", 24, ["jos", "josh", "jsh"], "OT"),
  make(6, "JDG", "Judges", "நியாயாதிபதிகள்", 21, ["jdg", "judg", "jg"], "OT"),
  make(7, "RUT", "Ruth", "ரூத்", 4, ["rut", "ru", "rth"], "OT"),
  make(8, "1SA", "1 Samuel", "1 சாமுவேல்", 31, ["1sa", "1 sam", "1sam", "1 sa", "1s"], "OT"),
  make(9, "2SA", "2 Samuel", "2 சாமுவேல்", 24, ["2sa", "2 sam", "2sam", "2 sa", "2s"], "OT"),
  make(10, "1KI", "1 Kings", "1 இராஜாக்கள்", 22, ["1ki", "1 ki", "1 kgs", "1kgs", "1k"], "OT"),
  make(11, "2KI", "2 Kings", "2 இராஜாக்கள்", 25, ["2ki", "2 ki", "2 kgs", "2kgs", "2k"], "OT"),
  make(12, "1CH", "1 Chronicles", "1 நாளாகமம்", 29, ["1ch", "1 chr", "1chr", "1 ch"], "OT"),
  make(13, "2CH", "2 Chronicles", "2 நாளாகமம்", 36, ["2ch", "2 chr", "2chr", "2 ch"], "OT"),
  make(14, "EZR", "Ezra", "எஸ்றா", 10, ["ezr", "ez"], "OT"),
  make(15, "NEH", "Nehemiah", "நெகேமியா", 13, ["neh", "ne"], "OT"),
  make(16, "EST", "Esther", "எஸ்தர்", 10, ["est", "es", "esth"], "OT"),
  make(17, "JOB", "Job", "யோபு", 42, ["job", "jb"], "OT"),
  make(18, "PSA", "Psalms", "சங்கீதம்", 150, ["psa", "ps", "pslm", "psalm", "pss"], "OT"),
  make(19, "PRO", "Proverbs", "நீதிமொழிகள்", 31, ["pro", "pr", "prov", "prv"], "OT"),
  make(20, "ECC", "Ecclesiastes", "பிரசங்கி", 12, ["ecc", "ec", "eccl", "qoh"], "OT"),
  make(21, "SNG", "Song of Solomon", "உன்னதப்பாட்டு", 8, ["sng", "song", "sos", "ss", "cant"], "OT"),
  make(22, "ISA", "Isaiah", "ஏசாயா", 66, ["isa", "is"], "OT"),
  make(23, "JER", "Jeremiah", "எரேமியா", 52, ["jer", "je", "jr"], "OT"),
  make(24, "LAM", "Lamentations", "புலம்பல்", 5, ["lam", "la"], "OT"),
  make(25, "EZK", "Ezekiel", "எசேக்கியேல்", 48, ["ezk", "eze", "ezek", "ezk"], "OT"),
  make(26, "DAN", "Daniel", "தானியேல்", 12, ["dan", "da", "dn"], "OT"),
  make(27, "HOS", "Hosea", "ஓசியா", 14, ["hos", "ho"], "OT"),
  make(28, "JOL", "Joel", "யோவேல்", 3, ["jol", "joel", "joe", "jl"], "OT"),
  make(29, "AMO", "Amos", "ஆமோஸ்", 9, ["amo", "am"], "OT"),
  make(30, "OBA", "Obadiah", "ஒபதியா", 1, ["oba", "ob"], "OT"),
  make(31, "JON", "Jonah", "யோனா", 4, ["jon", "jnh"], "OT"),
  make(32, "MIC", "Micah", "மீகா", 7, ["mic", "mi"], "OT"),
  make(33, "NAM", "Nahum", "நாகூம்", 3, ["nam", "nah", "na"], "OT"),
  make(34, "HAB", "Habakkuk", "ஆபகூக்", 3, ["hab", "hb"], "OT"),
  make(35, "ZEP", "Zephaniah", "செப்பனியா", 3, ["zep", "zeph", "zp"], "OT"),
  make(36, "HAG", "Haggai", "ஆகாய்", 2, ["hag", "hg"], "OT"),
  make(37, "ZEC", "Zechariah", "சகரியா", 14, ["zec", "zech", "zc"], "OT"),
  make(38, "MAL", "Malachi", "மல்கியா", 4, ["mal", "ml"], "OT"),
  make(39, "MAT", "Matthew", "மத்தேயு", 28, ["mat", "mt", "matt"], "NT"),
  make(40, "MRK", "Mark", "மாற்கு", 16, ["mrk", "mk", "mr"], "NT"),
  make(41, "LUK", "Luke", "லூக்கா", 24, ["luk", "lk", "lu"], "NT"),
  make(42, "JHN", "John", "யோவான்", 21, ["jhn", "jn", "joh"], "NT"),
  make(43, "ACT", "Acts", "அப்போஸ்தலர்", 28, ["act", "ac", "acts"], "NT"),
  make(44, "ROM", "Romans", "ரோமர்", 16, ["rom", "ro", "rm"], "NT"),
  make(45, "1CO", "1 Corinthians", "1 கொரிந்தியர்", 16, ["1co", "1 cor", "1cor", "1 co"], "NT"),
  make(46, "2CO", "2 Corinthians", "2 கொரிந்தியர்", 13, ["2co", "2 cor", "2cor", "2 co"], "NT"),
  make(47, "GAL", "Galatians", "கலாத்தியர்", 6, ["gal", "ga"], "NT"),
  make(48, "EPH", "Ephesians", "எபேசியர்", 6, ["eph", "ep"], "NT"),
  make(49, "PHP", "Philippians", "பிலிப்பியர்", 4, ["php", "phil", "pp"], "NT"),
  make(50, "COL", "Colossians", "கொலோசேயர்", 4, ["col", "co"], "NT"),
  make(51, "1TH", "1 Thessalonians", "1 தெசலோனிக்கேயர்", 5, ["1th", "1 thess", "1thess", "1 th"], "NT"),
  make(52, "2TH", "2 Thessalonians", "2 தெசலோனிக்கேயர்", 3, ["2th", "2 thess", "2thess", "2 th"], "NT"),
  make(53, "1TI", "1 Timothy", "1 தீமோத்தேயு", 6, ["1ti", "1 tim", "1tim", "1 ti"], "NT"),
  make(54, "2TI", "2 Timothy", "2 தீமோத்தேயு", 4, ["2ti", "2 tim", "2tim", "2 ti"], "NT"),
  make(55, "TIT", "Titus", "தீத்து", 3, ["tit", "ti"], "NT"),
  make(56, "PHM", "Philemon", "பிலேமோன்", 1, ["phm", "philem", "pm"], "NT"),
  make(57, "HEB", "Hebrews", "எபிரெயர்", 13, ["heb", "he"], "NT"),
  make(58, "JAS", "James", "யாக்கோபு", 5, ["jas", "jm"], "NT"),
  make(59, "1PE", "1 Peter", "1 பேதுரு", 5, ["1pe", "1 pet", "1pet", "1 pe", "1p"], "NT"),
  make(60, "2PE", "2 Peter", "2 பேதுரு", 3, ["2pe", "2 pet", "2pet", "2 pe", "2p"], "NT"),
  make(61, "1JN", "1 John", "1 யோவான்", 5, ["1jn", "1 jn", "1 john", "1jo", "1 jo"], "NT"),
  make(62, "2JN", "2 John", "2 யோவான்", 1, ["2jn", "2 jn", "2 john", "2jo"], "NT"),
  make(63, "3JN", "3 John", "3 யோவான்", 1, ["3jn", "3 jn", "3 john", "3jo"], "NT"),
  make(64, "JUD", "Jude", "யூதா", 1, ["jud", "jude"], "NT"),
  make(65, "REV", "Revelation", "வெளிப்படுத்தின", 22, ["rev", "re", "rv", "apoc"], "NT"),
];

export function bookByIndex(i: number): BibleBookMeta | undefined {
  return BIBLE_BOOKS[i];
}
