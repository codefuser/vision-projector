# Church Media Projection — Architecture Plan

A focused, offline-first media projection app for churches. Scope is strictly: **Images, Posters, Videos**. No lyrics, no Bible verses, no slide editor, no worship planning.

---

## 1. Tech Stack

- React 19 + TypeScript on the existing TanStack Start template (used purely as the React/Vite shell — all logic is client-side, no server functions).
- Tailwind CSS v4 (already configured via `src/styles.css`).
- **Zustand** for state, with persistence middleware where appropriate.
- **Dexie.js** as the IndexedDB wrapper (typed, fast, reliable).
- **@dnd-kit/core + sortable** for drag & drop.
- **@tanstack/react-virtual** for virtualized grids/lists (10k+ items).
- **vite-plugin-pwa** (generateSW, guarded registration per Lovable rules) for offline support.
- shadcn/ui components already in the template for primitives.

No backend. No Lovable Cloud. Everything lives in the browser.

---

## 2. Folder Structure

```text
src/
  routes/
    __root.tsx
    index.tsx                 -> redirects to /library
    library.tsx               -> Media Library (folders + media grid)
    playlists.tsx             -> Playlists list
    playlists.$id.tsx         -> Playlist editor
    project.tsx               -> Projection control room
    settings.tsx              -> Settings
  features/
    media/                    -> upload, grid, preview, rename, bulk actions
    folders/                  -> tree, CRUD, drag-move
    playlists/                -> CRUD, reorder, duration editor
    projection/               -> ProjectionWindow, engine, second-screen
    slideshow/                -> slideshow engine + transitions
    video/                    -> video player
    backup/                   -> export/import zip
    search/                   -> global search + filters
    settings/                 -> settings UI
  db/
    schema.ts                 -> Dexie tables + types
    repo.ts                   -> typed repository functions
    migrations.ts
  stores/
    library.store.ts
    playlist.store.ts
    projection.store.ts
    settings.store.ts
    ui.store.ts
  lib/
    thumbnails.ts             -> generate + cache image/video thumbs
    files.ts                  -> File <-> Blob helpers, mime validation
    transitions.ts
    presentation-api.ts       -> second-screen via window.open + Presentation API fallback
    logger.ts
    errors.ts
  components/
    AppShell.tsx              -> sidebar + topbar layout
    ErrorBoundary.tsx
    VirtualGrid.tsx
    MediaCard.tsx
    FolderTree.tsx
    Dropzone.tsx
  pwa/
    register.ts               -> guarded SW registration (Lovable preview safe)
```

---

## 3. IndexedDB Schema (Dexie)

```text
folders
  id (uuid), name, parentId|null, createdAt, updatedAt
  index: parentId, name

media
  id (uuid), name, type ('image'|'video'),
  mime, size, durationMs (video), width, height,
  folderId|null, blobId (-> blobs.id), thumbBlobId|null,
  createdAt, updatedAt, lastUsedAt|null, tags[]
  index: folderId, type, name, createdAt, lastUsedAt

blobs            (separated so metadata queries stay fast)
  id, blob (Blob), kind ('original'|'thumb')

playlists
  id, name, createdAt, updatedAt
  items: PlaylistItem[]  -- embedded array, ordered
    { id, mediaId, durationMs (images), transition, muted?, loop? }

settings
  key (singleton 'app'), value (Settings)

logs (ring buffer, capped ~1000)
  id, level, message, ctx, ts
```

Blobs are stored as `Blob` objects (browsers persist them efficiently in IDB). Thumbnails are generated on import via `createImageBitmap` (images) and a `<video>` + `<canvas>` snapshot at t=1s (videos), then cached as separate blobs.

---

## 4. State Management (Zustand)

- `library.store` — folders tree cache, selected folder, selection set, search query, filters.
- `playlist.store` — current editing playlist, dirty flag.
- `projection.store` — projection open?, current item, playback state (playing/paused), index, mode (slideshow/video/single), loop, shuffle, BroadcastChannel handle.
- `settings.store` — persisted to IDB; hydrated on boot.
- `ui.store` — theme, sidebar collapsed, modals.

DB is the source of truth; stores hold UI state + cached queries. Mutations go: action → repo (Dexie) → store refresh.

---

## 5. Projection Engine

- **Projection window**: `window.open('/project', 'projector', 'popup')` so users can drag it to the second monitor and press F11 (or we call `requestFullscreen` on load). Clean route with pure black bg, no chrome, no scrollbars, cursor auto-hides after 2s.
- **Cross-window comms**: `BroadcastChannel('church-projection')`. Control room sends `{type, payload}` messages: `LOAD_ITEM`, `PLAY`, `PAUSE`, `NEXT`, `PREV`, `STOP`, `SEEK`, `VOLUME`, `BLACK`, `CLOSE`. Projector window echoes state back.
- **Second-screen detection**: feature-detect `window.getScreenDetails()` (Multi-Screen Window Placement API). If available and permission granted, auto-position the popup on the non-primary screen. Otherwise the popup opens on current screen and user moves it.
- **Slideshow engine**: setTimeout per item using its own `durationMs`; preloads next image's `ObjectURL`; transitions via CSS (fade/crossfade/zoom/dissolve/none) with two stacked `<img>` layers.
- **Video engine**: native `<video>` with autoplay+muted fallback; loop modes (single/playlist/none); seek/volume from control room.

---

## 6. Media Management

- Drag-drop & file-picker upload → validate mime → write blob + metadata → generate thumb → insert.
- Bulk actions: delete, move, copy, duplicate (clones metadata, references same blob unless user duplicates blob too — we'll duplicate metadata only by default).
- Preview modal with full-size image / inline video player.
- Multi-select via shift/ctrl click + checkbox mode.

---

## 7. Playlist Engine

- Playlist = ordered `items[]`. dnd-kit sortable for reorder.
- Per-image duration editor (number input, seconds).
- Per-item transition override (falls back to settings default).
- "Project playlist" → opens projection window in slideshow/video mode starting at index 0.

---

## 8. Backup / Restore

- **Export**: stream all tables to a single `.zip` using `fflate` — `manifest.json` (folders, media metadata, playlists, settings, version) plus `blobs/{id}.bin` files. Trigger download.
- **Import**: read zip, validate manifest version, upsert all records into Dexie inside one transaction (with a "merge vs replace" choice). Progress UI for large libraries.

---

## 9. Settings

- Theme (light/dark/system), language (en only for v1, scaffolded for i18n).
- Default image duration, default transition, default loop mode.
- Default video volume, autoplay, mute-on-start.
- Auto-save is always on (every mutation persists immediately).

---

## 10. Performance Strategy

- Virtualized grid (`@tanstack/react-virtual`) for media library.
- Thumbnails (max 320px) decoded once, cached as Blob in IDB, served via `URL.createObjectURL` with a ref-counted URL cache that revokes on unmount.
- Indexed Dexie queries; paginated reads (`offset/limit`) for huge folders.
- Web Worker for thumbnail generation on import (keeps UI responsive on bulk drops).
- Preload next-slide image during slideshow.
- React 19 transitions for filter/search updates.

---

## 11. Error Handling

- Global React `ErrorBoundary` at app root + per-route boundaries.
- All Dexie ops wrapped in `try/catch` → `logger.error` → toast.
- Logs persisted to `logs` table (ring buffer) and viewable in Settings → Diagnostics, with "Export logs".
- Projection window has its own boundary that falls back to a black screen + "Press Esc to return" rather than crashing mid-service.

---

## 12. PWA / Offline

- `vite-plugin-pwa` with `generateSW`, `registerType: autoUpdate`, NetworkFirst for navigations, CacheFirst for hashed assets.
- Guarded registration wrapper per Lovable rules: refuses to register in dev, iframe, `id-preview--*`, `preview--*`, `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`, or when URL has `?sw=off`.
- Manifest with name "Church Media", standalone display, dark theme color, icons.

---

## 13. Routes & Nav

Sidebar: **Library · Playlists · Project · Settings**. Topbar: search + theme toggle + "Open Projector" button (always visible).

---

## 14. Build Order

1. Scaffold: deps, Dexie schema, Zustand stores, AppShell, routes.
2. Media upload + library grid + folders + thumbnails.
3. Playlists CRUD + sortable editor.
4. Projection window + BroadcastChannel + slideshow + video engines.
5. Settings + theme + backup/restore.
6. Search/filters, virtualization, performance pass.
7. PWA + error boundaries + logging.
8. QA pass: large-library stress, projection reliability, recovery.

---

## What I need from you

This is a large build (~40–60 files). Two questions before I start:

1. **Scope of v1 ship**: build everything end-to-end in one go, or ship in the 8 phases above with you reviewing each? End-to-end is faster but a single huge change; phased lets you sanity-check projection reliability early.
2. **Second-screen UX**: confirm the "popup window the user drags to the projector" approach is acceptable (this is the only reliable cross-browser path — true automatic second-screen placement requires the experimental Multi-Screen API which only Chrome supports and needs a user permission grant).
