import type { RendererProps } from "./index";

/**
 * Bible verse renderer — registered as a Phase 1 architectural placeholder.
 * The Bible Module ships in a later phase; until then the engine will
 * never route a `bible_verse` content through it. The slot exists so the
 * future module can replace this file without touching engine code.
 */
export function BibleRenderer(_props: RendererProps) {
  return null;
}
