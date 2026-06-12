/**
 * Text adapter — projects an arbitrary text slide (announcements, notices,
 * prayer points, custom messages). Reuses the shared text-overlay pipeline
 * so the projector renders identically to Bible and Songs output.
 *
 * Mode "ta" keeps the renderer single-language and skips the reference block
 * (no book/chapter for free text).
 */
import { useProjection } from "@/stores/projection.store";
import { projectionEvents } from "../event-bus";
import { projectionHistory } from "../history";
import type { ProjectionContent, LiveTextBody } from "../content.types";
import type { TextOverlay } from "@/lib/broadcast";
import { useTextFormat } from "@/lib/text-format/store";

export interface ProjectTextInput {
  itemId: string;
  slideIndex: number;
  totalSlides: number;
  title: string;
  text: string;
}

export function projectTextSlide(input: ProjectTextInput): ProjectionContent<LiveTextBody> {
  const overlay: TextOverlay = {
    reference: "",
    referenceEn: "",
    referenceTa: "",
    text: input.text,
    textEn: "",
    textTa: input.text,
    translation: "",
    mode: "ta",
    kind: "live_text",
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
  const content: ProjectionContent<LiveTextBody> = {
    id: `text:${input.itemId}:${input.slideIndex}`,
    type: "live_text",
    title: `${input.title} (slide ${input.slideIndex + 1}/${input.totalSlides})`,
    source: { module: "text" },
    metadata: { itemId: input.itemId, slideIndex: input.slideIndex },
    style: { background: style.background, color: style.color, align: style.align, vAlign: style.vAlign },
    body: { text: input.text },
    createdAt: now,
    updatedAt: now,
  };
  projectionEvents.emit({ type: "CONTENT_PROJECTED", content, previous: null });
  projectionHistory.append(content);
  return content;
}
