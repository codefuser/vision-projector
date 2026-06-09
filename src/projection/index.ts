/**
 * Public barrel for the unified Projection platform.
 *
 * Modules must import from `@/projection` only — never reach into the
 * internal files. This keeps the engine swappable.
 */
export * from "./content.types";
export { projectionEvents, ProjectionEventBus } from "./event-bus";
export type { ProjectionEvent, ProjectionEventType, Listener, Unsubscribe } from "./event-bus";
export { projectionEngine } from "./engine";
export { projectionHistory } from "./history";
export { projectionFavorites } from "./favorites";
export type { FavoriteEntry } from "./favorites";
export { registerRenderer, getRenderer, hasRenderer, listRegisteredRenderers } from "./renderers";
export type { Renderer, RendererProps, RendererMode } from "./renderers";
export * as MediaAdapter from "./adapters/media.adapter";
