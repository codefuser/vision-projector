/**
 * Universal Renderer Registry.
 *
 * The Projection Engine never knows how to draw anything. It just hands a
 * `ProjectionContent` to whichever renderer is registered for its type.
 * Adding a new module = ship a new renderer + `registerRenderer(type, comp)`.
 * No changes to engine, store, preview, or projector code.
 */
import type { ComponentType } from "react";
import type { ProjectionContent, ProjectionContentType } from "../content.types";

export type RendererMode = "projector" | "preview";

export interface RendererProps {
  content: ProjectionContent;
  mode: RendererMode;
  /** Current playback state surfaced for renderers that need it (video). */
  playing?: boolean;
  muted?: boolean;
  volume?: number;
}

export type Renderer = ComponentType<RendererProps>;

const registry = new Map<ProjectionContentType, Renderer>();

export function registerRenderer(type: ProjectionContentType, renderer: Renderer): void {
  registry.set(type, renderer);
}

export function getRenderer(type: ProjectionContentType): Renderer | undefined {
  return registry.get(type);
}

export function hasRenderer(type: ProjectionContentType): boolean {
  return registry.has(type);
}

export function listRegisteredRenderers(): ProjectionContentType[] {
  return Array.from(registry.keys());
}

// Eagerly register Phase-1 renderers. Future modules add themselves the
// same way, ideally via a `register-renderers.ts` barrel imported by the
// app entry. Imports kept inline to avoid circular boot ordering.
import { ImageRenderer } from "./ImageRenderer";
import { VideoRenderer } from "./VideoRenderer";
import { BibleRenderer } from "./BibleRenderer";
import { SongRenderer } from "./SongRenderer";
import { TextRenderer } from "./TextRenderer";

registerRenderer("image", ImageRenderer);
registerRenderer("video", VideoRenderer);
registerRenderer("bible_verse", BibleRenderer);
registerRenderer("song_slide", SongRenderer);
registerRenderer("live_text", TextRenderer);
