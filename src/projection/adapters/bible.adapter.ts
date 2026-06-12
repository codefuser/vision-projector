/**
 * Bible Adapter — projects bible verses (single or bilingual) through the
 * shared text-overlay wire command. Always includes the current formatting
 * style so the projector renders identically on first frame.
 */
import { useProjection } from "@/stores/projection.store";
import { projectionEvents } from "../event-bus";
import { projectionHistory } from "../history";
import type { ProjectionContent, BibleVerseBody } from "../content.types";
import type { TextOverlay } from "@/lib/broadcast";
import { useTextFormat } from "@/lib/text-format/store";

export interface ProjectVerseInput {
  reference: string;
  text: string;
  translation: string;
  subtext?: string;
  subtranslation?: string;
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
    subtranslation: input.subtranslation,
    kind: "bible_verse",
  };
  const style = useTextFormat.getState().style;
  const store = useProjection.getState();
  if (!store.projectorOpen) store.openProjector();
  const send = () => useProjection.getState().send({ type: "LOAD_TEXT", overlay, style });
  if (store.projectorOpen) send();
  else setTimeout(send, 400);

  const now = Date.now();
  const content: ProjectionContent<BibleVerseBody> = {
    id: `bible:${input.translation}:${input.reference}`,
    type: "bible_verse",
    title: `${input.reference} (${input.translation})`,
    source: { module: "bible" },
    metadata: { book: input.book, chapter: input.chapter, verse: input.verse },
    style: { background: style.background, color: style.color, align: style.align, vAlign: style.vAlign },
    body: { reference: input.reference, text: input.text, translation: input.translation },
    createdAt: now,
    updatedAt: now,
  };
  projectionEvents.emit({ type: "CONTENT_PROJECTED", content, previous: null });
  projectionHistory.append(content);
  return content;
}
