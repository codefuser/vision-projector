# Bible Module Phase 4 — Implementation Plan

This phase extends the existing Bible module without redesigning the app. Navigation, theme, and layout primitives stay intact.

## 1. Global Favorites Panel (always-visible)

- New component `src/components/GlobalFavoritesDock.tsx` — a slim **right-edge collapsible rail** (default 240px expanded / 28px collapsed icon strip). Mounted once in `src/routes/__root.tsx` so it persists across `/library`, `/playlists`, `/bible tab`, `/settings`, `/service/$id`.
- Persisted open/closed state in a new store `src/stores/favorites-dock.store.ts`.
- Compact list, grouped by tabs: **Bible / Songs / Media / Text**. Single-line entries (`John 3:16`, `Amazing Grace`). No previews.
- Keyboard: `Alt+F` toggles dock visibility.

## 2. Unified Favorites Source

- New module `src/lib/favorites/index.ts` aggregating:
  - Bible favorites from existing `useBibleStore` (already keyed `book:chapter:verse`).
  - Media favorites (new store `src/stores/media-favorites.store.ts`, localStorage-backed, ids only).
  - Song / Text favorites: stub stores returning `[]` until those modules ship — keeps the panel future-proof.
- Each entry: `{ id, kind: 'bible'|'media'|'song'|'text', label, onActivate() }`.

## 3. Click Behaviour

- **Bible favorite** → navigate to `/library` route with Bible tab active, set `bibleStore` to its book/chapter (chapter mode), select the verse, dispatch a projection command. Implemented via a thin dispatcher in `src/lib/favorites/dispatch.ts` that uses `useBibleStore` setters + `useProjection.send`.
- **Media favorite** → resolve from `library.store`, build a `LOAD_MEDIA` payload, project immediately.
- **Song / Text** → no-op for now (button disabled with tooltip "Coming soon") because the modules do not exist yet.

## 4. Verse Card Redesign

- `BiblePanel.tsx` card markup compressed: single row reference + tiny language pill, two-line clamp preview, favorite + project icon buttons. Padding drops from `p-4` to `p-2`. Bilingual cards stack Tamil/English with a `border-l` separator instead of full second card. Target ~2x density.

## 5. Projection Reference Header

- `BibleRenderer` (in `src/projection/renderers/BibleRenderer.tsx`) and `TextOverlayRenderer` get an explicit reference line at top:
  - English mode → English ref only.
  - Tamil mode → Tamil ref only.
  - Bilingual → Tamil ref above English ref.
- `BibleProjectionPayload` extended with `referenceEn`, `referenceTa`, `mode`.

## 6. Independent Formatting Groups (Reference / Tamil / English)

- Refactor `src/lib/text-format/store.ts`:
  ```ts
  type SectionStyle = TextStyle & { visible: boolean };
  state = { reference: SectionStyle, tamil: SectionStyle, english: SectionStyle, background: BackgroundConfig }
  ```
- Existing global `style` kept as a derived alias (`state.english`) so non-Bible callers continue working unchanged.
- Broadcast extended: `UPDATE_TEXT_STYLE_GROUPED` with full grouped payload; legacy `UPDATE_TEXT_STYLE` still honoured.
- `TextFormattingPanel.tsx` gets a 3-tab segmented control at the top — **Reference / Tamil / English** — each rendering the existing field set against the active group, plus a Visibility toggle.

## 7. Background Engine

- New `BackgroundConfig`:
  ```ts
  { kind: 'none'|'color'|'media', color?: string, mediaId?: string, fit: 'cover'|'contain' }
  ```
- New **Background** group at the bottom of `TextFormattingPanel.tsx` with:
  - Solid color picker
  - "Select from Library" button → opens a reuse of the existing `MediaPickerDialog` (filtered to image/video/gif).
  - "Clear" button.
- Projection: `ProjectionWindow.tsx` gains a `<div class="bible-bg">` underlay rendering color or `<img>` / `<video autoplay loop muted playsinline>` based on `BackgroundConfig`. Layer order enforced via z-index: `bg (0) → reference (10) → verses (20)`.
- Library media resolved through existing `library.store` blob URL helpers; URLs revoked on switch like the main renderer already does.

## 8. Smart Search Upgrades

- `src/lib/bible/search.ts`:
  - Add `normalizeTanglish()` — collapses `aa→a`, `oo→u`, `dh→d`, `th→t`, `v?→v`, strips trailing vowels (`yesuvae→yesu`), removes doubled consonants, lower-cases.
  - Add `normalizeTamil()` — strips vowel sign variants and pulps (`ஆதியிலே → ஆதியில`).
  - Full-text search runs against precomputed `normalizedLower` cache keyed per language; rebuilt lazily on first search.
  - Token scoring: exact phrase > all-tokens-in-order > token coverage > Levenshtein fallback (cap distance 2 per token, only when no exact hits).
- Verse cards highlight matched substrings via a `<HighlightedText match={tokens} />` helper.

## 9. Performance

- Memoise Bilingual rendering, gate broadcasts behind `requestAnimationFrame` coalescer in text-format store, keep favorites dock as `React.memo` with stable selectors.

## Files

**New**
- `src/components/GlobalFavoritesDock.tsx`
- `src/stores/favorites-dock.store.ts`
- `src/stores/media-favorites.store.ts`
- `src/lib/favorites/index.ts`
- `src/lib/favorites/dispatch.ts`
- `src/components/HighlightedText.tsx`

**Modified**
- `src/routes/__root.tsx` (mount dock)
- `src/features/bible/BiblePanel.tsx` (compact cards, highlighting, favorite-driven nav)
- `src/lib/bible/search.ts` (Tanglish + Tamil normalization, ranking)
- `src/lib/text-format/store.ts` (grouped styles + background)
- `src/lib/broadcast.ts` (grouped payload, background, ref fields)
- `src/features/workspace/TextFormattingPanel.tsx` (group tabs + background section)
- `src/features/projection/ProjectionWindow.tsx` (background layer, ref header)
- `src/projection/renderers/BibleRenderer.tsx` (ref header, grouped styles)
- `src/projection/adapters/bible.adapter.ts` (mode + grouped refs)
- `src/components/TextOverlayRenderer.tsx` (consume grouped styles)
- `src/features/library/LibraryPage.tsx` (favorite toggle on media items)

**Unchanged**
- Routing, theme tokens, AppShell, sidebar, playlists, service mode, all existing keyboard shortcuts.

## Out of Scope (called out so we don't silently add later)
- Song / Text favorites are surfaced but inert until those modules exist.
- Lottie/animated backgrounds beyond `<video>` and `<img>` (GIFs work via `<img>`); a true Lottie renderer is not included.

## Open Questions
None — defaults above (right-edge collapsible rail, MediaPickerDialog reuse, English as legacy alias) are chosen to minimise risk to existing functionality. Confirm to proceed and I will implement.
