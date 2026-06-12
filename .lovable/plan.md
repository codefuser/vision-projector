# Text Workspace Major Upgrade — Build Plan

Scope is large (15 sections). To keep quality production-grade and avoid placeholders, I will ship it in **3 phases**, each independently usable. Existing Media / Bible / Songs / Preview / Projector / Theme Gallery remain untouched.

---

## Phase A — Smart Typing + Editor Core (this turn)

1. **Tanglish engine v2** (`src/lib/text/tanglish.ts` rewrite + `src/lib/text/church-dictionary.ts`)
   - Expanded church / worship dictionary (~600 curated headwords + inflections → effectively 2000+ surface forms; structured so we can grow toward 5000 without code changes).
   - Fuzzy matcher (Levenshtein ≤ 2, length-bucketed) for typos like `karthr`, `yesuu`, `jebamm`.
   - Priority chain: exact dict → fuzzy dict → church-only dict → transliteration fallback.
   - `suggest(prefix)` returns ranked Tamil candidates (e.g. `yes` → யேசு / இயேசு / யேசுவே).
2. **Suggestion dropdown** in `TextPanel` editor — appears under caret while typing Tanglish, arrow-key navigation, Enter/Tab to accept, Esc to dismiss. Non-blocking (debounced 80 ms, web-worker-free but `requestIdleCallback`).
3. **Quick Word Insert side panel** — common church words, click to insert at caret.
4. **Autosave indicator** — already autosaving via Zustand persist; surface "Saved · 2s ago" badge with 2 s debounce.
5. **Project shortcuts**: `Ctrl+Enter`, `Ctrl+Shift+Enter`, `Ctrl+D`, `Ctrl+Alt+N` wired via existing `useShortcut`.

## Phase B — Rich Editor + Blocks + Announcements (next turn)

6. Tiptap integration with full toolbar (bold/italic/underline/strike, color, highlight, font family/size, line height, letter spacing, align, lists, indent, case, clear, divider, quote, scripture block, announcement block).
7. Structured content blocks (Title / Subtitle / Body / Scripture / Quote / Announcement / Footer) as Tiptap node extensions.
8. Announcement Builder mode — numbered list input auto-expands to progressive slides (slide N reveals points 1..N).
9. Auto slide generator settings (blank line / char count / line count / paragraph / manual `---` marker).

## Phase C — Reveal + Templates + Search (final turn)

10. Reveal animation mode (None / Point / Line / Paragraph / Section) — drives projector via `LOAD_TEXT` payload `revealIndex`.
11. Text Workspace templates (13 categories) — separate registry from song/bible presets, applies font/size/align/spacing/color/background/theme via existing `applyTemplate`.
12. Enhanced search (Tamil / Tanglish / fuzzy / title+content / recent).
13. Final QA pass against existing preview + projector pipeline.

---

## Technical Notes

- **No package additions** in Phase A. Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, color/highlight/underline/textstyle/textalign extensions) added in Phase B.
- Dictionary stored as plain TS module (tree-shakable, lazy-loaded on first Tanglish keystroke via dynamic `import()`).
- Suggestion dropdown is a portal-positioned `Popover` anchored to a hidden mirror div that tracks caret coords — no contentEditable change yet.
- All projection still flows through `projectTextSlide` → `LOAD_TEXT` → existing renderer. No projector changes.
- 3-column layout preserved.

---

**Confirm Phase A and I'll ship it now.** If you want a different split (e.g. Tiptap first), tell me and I'll re-plan.
