# Theme / Background Separation — Implementation Plan

## Status of Text Workspace
**Frozen.** AI rewrite scaffolding has already been removed. The Tiptap toolbar and quick-insert tabs added in Phase 2 stay since they're already shipped, but no further work happens there. Confirm if you'd also like Phase 2's toolbar/quick-insert/block menu rolled back to the minimal Title + Textarea + Tanglish toggle.

---

## Core problem
`applyTemplate(id)` writes background, animation, gradient AND text styling in one go. Background is stored inside `useTextFormat.groups.background`, so themes and backgrounds share state. Picking a video background later gets overwritten on the next theme switch.

## New architecture

```text
┌──────────────────────────────────────────────────────────┐
│  Projector / Preview stage                               │
├──────────────────────────────────────────────────────────┤
│  Layer 5: Animation overlay   (motion / particles)       │
│  Layer 4: Text overlay        (typography, position)     │
│  Layer 3: Logo overlay        (independent)              │
│  Layer 2: Background          (color / image / video)    │
│  Layer 1: Black canvas                                   │
└──────────────────────────────────────────────────────────┘
```

Each layer = its own zustand store + its own broadcast message, so changing one never re-renders the others.

## Stores

| Store (file) | Owns | Broadcasts |
| --- | --- | --- |
| `useTextFormat` (existing, **trimmed**) | reference/tamil/english text styles only | `UPDATE_STYLES` (text-only payload) |
| `useBackground` (**new**, `src/stores/background.store.ts`) | `BackgroundConfig` + `themeBackgroundEnabled` + `customBackgroundEnabled` | `UPDATE_BACKGROUND` |
| `useLogo` (existing) | logo enable + settings | `UPDATE_LOGO` |
| `useEffects` (**new**, `src/stores/effects.store.ts`) | motion, particles, text-shadow, text-stroke master toggles | included in `UPDATE_STYLES` |

`GroupedStyles.background` stays in the broadcast wire format for projector compatibility, but its source becomes `useBackground` (not `useTextFormat`). `useTextFormat.setBackground` is removed; existing callers route through `useBackground`.

## Theme behaviour change

`applyTemplate(id)`:
- ALWAYS applies text styling (typography, color, shadow, alignment, animation rules).
- **Background only applies if `useBackground.themeBackgroundEnabled === true`.**
- When `customBackgroundEnabled === true`, theme background is silently skipped — operator's custom media/color/gradient stays put.
- Logo only applies if `useLogo.enabled === true` AND template has logo config.

`TemplatePreset` gains a `theme: { animationStyle, entrance, exit, safeMargins }` block (no schema break — old presets keep working via defaults).

## Background engine

New `src/features/background/BackgroundPanel.tsx` — dedicated panel with real `Switch` controls (not buttons):

- **Master**: Background Enabled · Logo Enabled · Theme Background · Custom Background · Motion Effects · Particles · Text Shadow · Text Stroke
- **Source picker** (radio, only one active): None · Color · Gradient · Image · Video · Animated · Particle · Motion · Theme
- **Customization** (slider controls): Opacity · Brightness · Contrast · Blur · Zoom · Position X/Y · Fit (cover/contain/fill) · Overlay color + opacity
- **Video controls**: Loop · Mute · Playback speed

`BackgroundConfig` extends with: `contrast`, `overlayColor`, `overlayOpacity`, `videoLoop`, `videoMuted`, `videoSpeed`, `source` (the new source enum). Wire-format change is additive only — old projector keeps working.

`BackgroundLayer.tsx` updates:
- Reads from `useBackground` directly (no longer prop-drilled through grouped styles).
- Adds contrast filter, overlay layer, video loop/mute/speed bindings.
- Memoizes media URL so changing brightness/opacity does NOT reload the video element.

## Presets (separate save/load)

Three independent preset libraries in `useCustomTemplates`:
- `themePresets` — typography + animation only
- `backgroundPresets` — background config only
- `logoPresets` — logo config only
- `projectionPresets` — combined snapshot (the existing custom-template behaviour, kept for backwards compatibility)

Save buttons split into 4 in the gallery: "Save Theme", "Save Background", "Save Logo", "Save Full Preset".

## Performance

- Each layer subscribes only to its own slice (`useBackground` vs `useTextFormat`) — Zustand selector equality already prevents cross-layer re-renders.
- Broadcast keeps `UPDATE_BACKGROUND` and `UPDATE_STYLES` as separate messages (already split in `broadcast.ts`). Theme switches no longer emit `UPDATE_BACKGROUND` when theme-background is disabled.
- Video element keyed on `mediaId` only — opacity/brightness/zoom are CSS transforms applied to a stable element so the video never reloads on slider drag.

## Migration

- `useTextFormat` keeps `groups.background` as a derived read-through view of `useBackground` for one release so any stale `groups.background.color` access keeps working. Marked `@deprecated` in the type.
- Existing custom templates (operator-saved combined presets) keep working — they apply as "Full Preset" via the projection-preset path.
- `applyTemplate` keeps its signature; only its behaviour respects the new toggles.

## Files

**New**
- `src/stores/background.store.ts`
- `src/stores/effects.store.ts`
- `src/features/background/BackgroundPanel.tsx`

**Modified**
- `src/lib/broadcast.ts` — extend `BackgroundConfig` (additive)
- `src/lib/text-format/store.ts` — remove `setBackground`, deprecate `groups.background`
- `src/lib/templates/apply.ts` — gate background/logo on toggles
- `src/lib/templates/presets.ts` — add optional `theme` block
- `src/components/BackgroundLayer.tsx` — read from `useBackground`, add contrast/overlay/video controls, memoize media URL
- `src/features/workspace/TextFormattingPanel.tsx` — remove background sub-panel (moved out), keep text-only
- `src/features/workspace/ThemeGalleryDialog.tsx` — split save buttons, respect toggles
- `src/stores/custom-templates.store.ts` — separate preset arrays
- `src/features/workspace/ProjectionWorkspace.tsx` — mount new BackgroundPanel
- `src/stores/projection.store.ts` — wire UPDATE_BACKGROUND payload from new store

## Out of scope (this turn)
- Particle / motion physics engines beyond CSS animations already shipped (24 animation kinds remain)
- Gradient editor UI (gradient string already supported, no visual builder this round)
- Crop tool UI (positionX/Y + zoom already covers practical cropping)

## Confirm before I implement
1. Roll back the Phase 2 Tiptap toolbar / quick-insert tabs / block menu in Text Workspace to the minimal "Title + Textarea + Tanglish toggle" set? (The spec says no rich editor, but those were shipped before the freeze.)
2. Do you want the new Background Panel as a **new tab next to "Format"** in the workspace tabs panel, or as a dedicated sidebar section under the existing Format tab?
3. Background source list — should `Animated` / `Particle` / `Motion` be a real upload type (animated overlay video files) or just the existing 24 CSS `BackgroundAnimation` kinds re-grouped under those labels?
