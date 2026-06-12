# Church Media — UI Polish & Bible Fix Pass

## 1. Logo Manager (in Text Formatting)

New collapsible section **Projection Logo** inside `TextFormattingPanel.tsx`, sibling to Background.

New store `src/stores/logo.store.ts` (zustand+persist, key `vision-logo`):
- `enabled: boolean`
- `current: LogoItem | null` — `{ id, dataUrl, width, height }`
- `gallery: LogoItem[]` (max 5, FIFO eviction)
- `settings: { widthPct, heightPctAuto, opacity, radius, shadow, position, x, y }`
- Actions: `setEnabled`, `addFromFile(file)`, `addFromMedia(id)`, `selectFromGallery(id)`, `removeFromGallery(id)`, `patch(settings)`. All mutations broadcast a new `UPDATE_LOGO` command.

Storage: logos kept as base64 data-URLs in localStorage (small PNG/SVG only — max 5, capped at 256KB each, downscaled via canvas if larger). Simple, survives refresh, no IDB schema change.

New `LogoLayer.tsx` rendered in:
- `ProjectionWindow.tsx` (above text)
- `LivePreviewPanel.tsx` (1:1 mirror)

UI: thumbnails-only gallery grid (5 slots), with select/replace/remove. Position preset buttons + numeric X/Y. Hide all controls when disabled; settings preserved (stored independently of `enabled`).

Broadcast: extend `LogoConfig` interface in `broadcast.ts`; add `UPDATE_LOGO` and `logoConfig` to ProjectionState; persist in `text-format` partner store so other modules (BibleRenderer, ImageRenderer, VideoRenderer, SongRenderer, TextRenderer) just include `<LogoLayer />` once at the projection root → applies globally.

## 2. Background Manager — gallery

Extend background to support a saved gallery:
- New store `src/stores/background-gallery.store.ts` — `items: BackgroundItem[]` where each is `{ id, kind: "media"|"color", mediaId?, color?, name, thumbDataUrl? }`. Persisted.
- Upload-from-computer flow: file → save into existing media library via `addMedia()` → push id into gallery.
- "Select from library" reuses `MediaPickerDialog` and pushes selected media into gallery + sets as current.
- Gallery grid renders thumbnails (use existing `Thumb` component for media items). Click = select; X = remove; right-click/replace via picker.

Enable/Disable toggle = sets `background.kind` to `"none"` when off; restores previous kind+mediaId+color when on (cache last in store).

Existing `BackgroundLayer` already renders identically in preview + projector — no changes needed there.

## 3. Shortcut system

Already in `GlobalShortcuts.tsx`:
- `1..4` tab switch — keep, but REMOVE the auto-navigate-to-/project side-effect so they only switch tabs (request: "Only switch tabs").
- Actually: if not on /project, switching tabs is meaningless. Keep navigation but do NOT focus search.
- `Alt+1..4` focus search — keep as-is (already does navigate + dispatch focus event).

Add sidebar shortcuts:
- `F2` Library, `F3` Playlists, `F4` Project, `F5` Settings (avoid F5 which is reload → use `Mod+,`), `F1` Shortcut Center.
- Revised: `g l` style is too complex. Use: `Mod+Shift+L` Library, `Mod+Shift+P` Playlists, `Mod+Shift+J` Project, `Mod+Shift+,` Settings, `Mod+/` Shortcut Center.

All registered via `useShortcut` in `GlobalShortcuts.tsx` → auto-listed in Shortcut Center.

## 4. Shortcut Center

`src/routes/shortcuts.tsx` already aggregates via `shortcutManager.list()`. Verify the category list includes: navigation, media, bible, songs, text, projector, favorites, playlists, general. Add missing categories to the `ShortcutCategory` union in `manager.ts` (`favorites`, `playlists`).

## 5. Favorites — language mode preserved

Extend `BibleFavorite` shape in `src/lib/bible/store.ts`:
- Add `displayMode: "en"|"ta"|"both"` and `lang: BibleLang` captured at save time.

`addFavorite` now records current `displayMode`/`lang`. `activateBibleFavorite` in `src/lib/favorites/dispatch.ts` restores those before projecting (calls `setDisplayMode` and `setLang`, then awaits `ensureLoaded`/`ensureBoth`).

Migration: existing favorites without these fields default to current store mode at activation (back-compat).

## 6. Text Formatting responsiveness + Tamil fonts

`TextFormattingPanel.tsx`:
- Header row already uses flex; change Reset/Collapse buttons to `shrink-0` and the title block to `min-w-0 truncate`.
- Group selector strip wraps on narrow widths: use `flex-wrap gap-1`, each button `flex-1 min-w-[64px]`.
- Replace fixed `grid-cols-4` at `@3xl` with a more conservative grid: `@sm:grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3` so cells stop clipping.

Add Tamil fonts to `FONT_FAMILIES`:
- "Noto Sans Tamil", "Noto Serif Tamil", "Mukta Malar", "Catamaran", "Hind Madurai", "Meera Inimai", "Pavanam".
- Inject Google Fonts `<link>` for these in `__root.tsx` head().

Font preview live: store already broadcasts via RAF; verified working.

## 7. General quality

- Strip the ColorPick browser-extension hydration mismatch warning by gating `<input type="color">` render to client-only with `suppressHydrationWarning` on the wrapper.
- Verify Reset/Collapse never overlap at narrow widths (covered in §6).

---

## Files

**New:**
- `src/stores/logo.store.ts`
- `src/stores/background-gallery.store.ts`
- `src/components/LogoLayer.tsx`

**Modified:**
- `src/lib/broadcast.ts` (LogoConfig, UPDATE_LOGO, state field)
- `src/features/workspace/TextFormattingPanel.tsx` (logo section, bg gallery, responsive layout, fonts)
- `src/features/workspace/LivePreviewPanel.tsx` (LogoLayer)
- `src/features/projection/ProjectionWindow.tsx` (LogoLayer, apply logo from state)
- `src/stores/projection.store.ts` (handle UPDATE_LOGO)
- `src/components/GlobalShortcuts.tsx` (sidebar shortcuts; remove auto-nav on 1..4? keep but no search focus — already correct)
- `src/lib/shortcuts/manager.ts` (categories: favorites, playlists)
- `src/lib/bible/store.ts` (favorite fields)
- `src/lib/favorites/dispatch.ts` (restore mode/lang)
- `src/routes/__root.tsx` (Google Fonts link for Tamil fonts)

**Untouched:** `BackgroundLayer.tsx`, projection adapters, renderers, route tree.

## Open questions

1. Sidebar shortcut keys — proposed `Mod+Shift+L/P/J/,` and `Mod+/`. OK or prefer F-keys (F1–F4)?
2. Logo storage — base64 in localStorage (5 small logos) is simplest. Move to IDB only if you expect >1MB per logo.
3. Background gallery: store full media items by id (no duplication) — removing from gallery does NOT delete the media file. Confirm.

Should I proceed with these defaults or adjust first?
