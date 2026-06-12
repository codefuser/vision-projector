/**
 * Song Adapter — Tamil-only projection.
 *
 * Projection screen shows lyrics only: no title, no metadata, no slide
 * number. We achieve this by sending the song text as `textTa` and leaving
 * every reference field empty so `TextOverlayRenderer` skips the reference
 * block entirely (even if the Reference section is set to visible).
 */
import { useProjection } from "@/stores/projection.store";
import { projectionEvents } from "../event-bus";
import { projectionHistory } from "../history";
import type { ProjectionContent, SongSlideBody } from "../content.types";
import type { TextOverlay } from "@/lib/broadcast";
import { useTextFormat } from "@/lib/text-format/store";

export interface ProjectSlideInput {
  songId: number;
  slideIndex: number;
  totalSlides: number;
  title: string;
  text: string;
}

export function projectSongSlide(input: ProjectSlideInput): ProjectionContent<SongSlideBody> {
  const overlay: TextOverlay = {
    reference: "",
    referenceEn: "",
    referenceTa: "",
    text: input.text,
    textEn: "",
    textTa: input.text,
    translation: "",
    mode: "ta",
    kind: "song_slide",
  };
  const groups = useTextFormat.getState().groups;
  const style = useTextFormat.getState().style;
  const store = useProjection.getState();
  if (!store.projectorOpen) store.openProjector();
  const send = () =>
    useProjection.getState().send({ type: "LOAD_TEXT", overlay, style, styles: groups });
  if (store.projectorOpen) send();
  else setTimeout(send, 400);

  const now = Date.now();
  const lines = input.text.split(/\n/);
  const content: ProjectionContent<SongSlideBody> = {
    id: `song:${input.songId}:${input.slideIndex}`,
    type: "song_slide",
    title: `${input.title} (slide ${input.slideIndex + 1})`,
    source: { module: "songs" },
    metadata: { songId: input.songId, slideIndex: input.slideIndex },
    style: { background: style.background, color: style.color, align: style.align, vAlign: style.vAlign },
    body: { songId: String(input.songId), slideIndex: input.slideIndex, lines },
    createdAt: now,
    updatedAt: now,
  };
  projectionEvents.emit({ type: "CONTENT_PROJECTED", content, previous: null });
  projectionHistory.append(content);
  return content;
}
