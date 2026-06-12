# Text Workspace — Intelligent Writing Engine

Layout stays the same. No changes to Bible, Songs, Media, Preview, Projector, Theme Gallery.

---

## Phase 1 — Smart Suggestion Engine (this turn)

Make Tanglish work for **any sentence**, not just church words.

### Dictionary
- New `src/lib/text/tamil-corpus.ts` — ~2,000 high-frequency Tamil words (common + church + worship + sermon + colloquial spoken forms like `irukeenga → இருக்கீங்க`, `nalla → நல்ல`, `vivekam → விவேகம்`). Stored as `{ roman[]: tamil[] }` so one Tanglish key maps to several Tamil candidates ranked by frequency.
- Extend `church-dictionary.ts` to merge with corpus through a shared loader (`getCombinedDictionary()`), built once and indexed by 2-char prefix bucket for O(1) prefix lookup.

### Fuzzy + phonetic chain
- Normalize input (collapse `rr→r`, `aa→a` for matching only, strip trailing `h`).
- Match priority: **exact → normalized exact → prefix (≤6 candidates) → fuzzy Levenshtein ≤ 2 → phonetic fallback**.
- Multi-word sentence conversion: tokenise on spaces, convert each word, preserve punctuation/spacing. `indru naam kartharai thuthippom` → `இன்று நாம் கர்த்தரை துதிப்போம்`.

### Dropdown UX
- Existing suggestion popover (already in `TextPanel.tsx`) gets:
  - Up to 6 ranked candidates per prefix
  - `↑/↓` navigate, `Tab/Enter` accept, `Esc` dismiss, `1–6` quick pick
  - Shows source badge (📖 dict / 🔤 phonetic) so user knows confidence
- Debounced 60 ms, runs in `requestIdleCallback`.

### Online assist (optional, behind toggle)
- New `src/lib/text/online-suggest.ts` calls Lovable AI Gateway (`google/gemini-3-flash-preview`) via a `createServerFn` returning `{ candidates: string[] }`. Cached in `localStorage` keyed by lowercased prefix. Silently no-ops if request fails → offline never breaks.
- Off by default; toggle in editor header (`🌐 Online suggestions`).

---

## Phase 2 — Rich Editor + Blocks + Toolbar (next turn)

Replace the plain `<textarea>` with **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`, color/highlight/underline/text-style/text-align/task-list/typography extensions).

### Toolbar
Full Google-Docs-style toolbar above editor: Undo/Redo, B/I/U/S, color, highlight, font family, font size, line height, letter spacing, align (L/C/R/J), bullets/numbered/checklist, indent/outdent, quote, code block, divider, H1–H4, super/subscript, clear formatting.

### Content blocks (Tiptap nodes)
Heading, Subheading, Paragraph, Bullet, Numbered, Quote, **Scripture**, **Announcement**, **Prayer**, **Testimony**, **Custom** — each rendered with distinct semantic styling and serialised to slides cleanly.

### Quick-Insert panel expansion
Tabbed groups: Most Used · Recent · Church · Sermon · Worship · Announcement. Usage counted in a new `text-vocab.store.ts` so "Most Used" learns over time.

### Slide split rules
Configurable: blank line / `---` marker / paragraph / char count / line count.

---

## Phase 3 — Reveal · AI Assist · Search (final turn)

### Reveal system
Announcement block auto-expands to progressive slides (Title → +Point 1 → +Point 2…). Driven via existing `LOAD_TEXT` projection with `revealIndex` payload.

### AI Writing Assistant
`createServerFn` `rewriteText({ mode, text })` with modes: Expand, Shorten, Formal, Simple, Sermon, Announcement, Prayer, Worship, Youth, Bible Study. Result diff-previewed before applying.

### Search upgrade
Title + content + Tamil + Tanglish + fuzzy + recent + saved. Index built lazily on first search.

### Performance pass
- Dictionary lazy-imported on first Tanglish keystroke
- Prefix index pre-built once, memoised
- Suggestion compute in `requestIdleCallback` with 60 ms debounce
- Tiptap configured without history limit issues; `onUpdate` debounced 150 ms before autosave

---

## Technical notes

- **Phase 1 adds no packages.** Phase 2 adds Tiptap + extensions. Phase 3 reuses existing AI gateway helper.
- **Lovable AI** is already wired; online suggestions and rewrite use `google/gemini-3-flash-preview` via `createServerFn` so `LOVABLE_API_KEY` stays server-side.
- **Projector pipeline unchanged** — all output still flows through `projectTextSlide` → `LOAD_TEXT`.
- **No layout changes.** 3-column workspace preserved.
- **Existing files touched in Phase 1:** `src/lib/text/tanglish.ts`, `src/lib/text/church-dictionary.ts`, `src/features/text/TextPanel.tsx`. **New:** `src/lib/text/tamil-corpus.ts`, `src/lib/text/dictionary-index.ts`, `src/lib/text/online-suggest.functions.ts`.

---

**Confirm and I'll ship Phase 1 now.** If you'd rather start with the Tiptap toolbar (Phase 2) first, say so and I'll re-plan.
