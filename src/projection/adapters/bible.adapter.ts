/**
 * Bible Adapter — projects bible verses through the engine's text-overlay
 * wire command. Uses the same broadcast channel as media so the projector
 * window can switch instantly without losing state.
 */
import { useProjection } from "@/stores/projection.store";
import { projectionEvents } from "../event-bus";
import { projectionHistory } from "../history";
import type { ProjectionContent, BibleVerseBody } from "../content.types";
import type { TextOverlay } from "@/lib/broadcast";

export interface ProjectVerseInput {
  reference: string;
  text: string;
  translation: string;
  /** Optional secondary text (e.g. parallel translation). */
  subtext?: string;
  book?: number;
  chapter?: number;
  verse?: number;
}

export function projectVerse(input: ProjectVerseInput): ProjectionContent<BibleVerseBody> {
  const overlay: TextOverlay = {
    reference: input.reference,
    text: input.text,
    translation: input.translation,
    subtext: input.subtext,
    kind: "bible_verse",
  };
  const store = useProjection.getState();
  if (!store.projectorOpen) store.openProjector();
  // Send immediately; ProjectionWindow handles whether to delay.
  const send = () => useProjection.getState().send({ type: "LOAD_TEXT", overlay });
  if (store.projectorOpen) send();
  else setTimeout(send, 400);

  const now = Date.now();
  const content: ProjectionContent<BibleVerseBody> = {
    id: `bible:${input.translation}:${input.reference}`,
    type: "bible_verse",
    title: `${input.reference} (${input.translation})`,
    source: { module: "bible" },
    metadata: { book: input.book, chapter: input.chapter, verse: input.verse },
    style: { background: "#000", color: "#fff", align: "center", vAlign: "middle" },
    body: { reference: input.reference, text: input.text, translation: input.translation },
    createdAt: now,
    updatedAt: now,
  };
  projectionEvents.emit({ type: "CONTENT_PROJECTED", content, previous: null });
  projectionHistory.append(content);
  return content;
}
