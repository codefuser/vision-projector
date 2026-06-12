/**
 * Categorized Quick-Insert vocabulary + content-block templates for the
 * Text Panel. Powers the tabbed Quick-Insert strip (Most Used / Recent /
 * Church / Worship / Sermon / Announcement) and the "Insert block" menu.
 *
 * Usage counts and recents persist in localStorage via a tiny vocab store
 * so "Most Used" learns over time.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface QuickWord {
  tamil: string;
  label: string;
}

export type QuickCategory = "church" | "worship" | "sermon" | "announcement";

export const QUICK_INSERT: Record<QuickCategory, QuickWord[]> = {
  church: [
    { tamil: "யேசு", label: "yesu" },
    { tamil: "இயேசு", label: "iyesu" },
    { tamil: "கர்த்தர்", label: "karthar" },
    { tamil: "தேவன்", label: "devan" },
    { tamil: "பிதா", label: "pitha" },
    { tamil: "ஆவியானவர்", label: "aaviyanavar" },
    { tamil: "பரிசுத்த ஆவி", label: "parisutha aavi" },
    { tamil: "கிறிஸ்து", label: "christ" },
    { tamil: "சபை", label: "sabai" },
    { tamil: "வேதாகமம்", label: "vethagamam" },
    { tamil: "வசனம்", label: "vasanam" },
    { tamil: "சாட்சியம்", label: "satchiyam" },
  ],
  worship: [
    { tamil: "ஆராதனை", label: "aaradhanai" },
    { tamil: "துதி", label: "thuthi" },
    { tamil: "ஸ்தோத்திரம்", label: "sthothiram" },
    { tamil: "மகிமை", label: "mahimai" },
    { tamil: "அல்லேலூயா", label: "halleluya" },
    { tamil: "ஆமென்", label: "amen" },
    { tamil: "ஜெபம்", label: "jebam" },
    { tamil: "உபவாசம்", label: "upavasam" },
    { tamil: "அன்பு", label: "anbu" },
    { tamil: "கிருபை", label: "kirubai" },
    { tamil: "சமாதானம்", label: "samadhanam" },
    { tamil: "விசுவாசம்", label: "visuvasam" },
  ],
  sermon: [
    { tamil: "வசனம்", label: "scripture" },
    { tamil: "முக்கிய கருத்து", label: "main point" },
    { tamil: "பயன்பாடு", label: "application" },
    { tamil: "முடிவுரை", label: "conclusion" },
    { tamil: "எடுத்துக்காட்டு", label: "illustration" },
    { tamil: "பிரசங்கம்", label: "sermon" },
    { tamil: "போதனை", label: "teaching" },
    { tamil: "தியானம்", label: "meditation" },
  ],
  announcement: [
    { tamil: "அறிவிப்பு", label: "announcement" },
    { tamil: "நிகழ்வு", label: "event" },
    { tamil: "தேதி:", label: "date:" },
    { tamil: "நேரம்:", label: "time:" },
    { tamil: "இடம்:", label: "venue:" },
    { tamil: "தொடர்பு:", label: "contact:" },
    { tamil: "வரவேற்கிறோம்", label: "welcome" },
    { tamil: "நன்றி", label: "thanks" },
  ],
};

export const CATEGORY_LABELS: Record<QuickCategory, string> = {
  church: "Church",
  worship: "Worship",
  sermon: "Sermon",
  announcement: "Notice",
};

// ── Block templates ───────────────────────────────────────────────────
export type BlockKind =
  | "heading"
  | "subheading"
  | "scripture"
  | "announcement"
  | "prayer"
  | "testimony"
  | "bullet"
  | "numbered"
  | "quote"
  | "divider";

export const BLOCK_TEMPLATES: Array<{ kind: BlockKind; label: string; snippet: string }> = [
  { kind: "heading", label: "Heading", snippet: "# Title here" },
  { kind: "subheading", label: "Subheading", snippet: "## Subtitle" },
  { kind: "scripture", label: "Scripture", snippet: "📖 Reference\n\n“Verse text here”" },
  {
    kind: "announcement",
    label: "Announcement",
    snippet: "📢 Announcement\n\n• Date:\n• Time:\n• Venue:",
  },
  { kind: "prayer", label: "Prayer", snippet: "🙏 Prayer\n\nPray for …" },
  { kind: "testimony", label: "Testimony", snippet: "✨ Testimony\n\nShare how God …" },
  { kind: "bullet", label: "Bulleted list", snippet: "• Point one\n• Point two\n• Point three" },
  { kind: "numbered", label: "Numbered list", snippet: "1. First\n2. Second\n3. Third" },
  { kind: "quote", label: "Quote", snippet: "> Quoted text here" },
  { kind: "divider", label: "Slide break", snippet: "\n---\n" },
];

// ── Usage tracking (Most Used / Recent) ───────────────────────────────
interface VocabState {
  counts: Record<string, number>;
  recents: string[]; // Tamil strings, newest first
  bump: (tamil: string) => void;
}

const RECENT_MAX = 18;

export const useVocab = create<VocabState>()(
  persist(
    (set) => ({
      counts: {},
      recents: [],
      bump: (tamil) =>
        set((s) => ({
          counts: { ...s.counts, [tamil]: (s.counts[tamil] ?? 0) + 1 },
          recents: [tamil, ...s.recents.filter((t) => t !== tamil)].slice(0, RECENT_MAX),
        })),
    }),
    { name: "vision-text-vocab", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

/** Returns top-N Tamil words by usage count, falling back to nothing if empty. */
export function mostUsed(counts: Record<string, number>, n = 18): QuickWord[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tamil]) => ({ tamil, label: `×${counts[tamil]}` }));
}
