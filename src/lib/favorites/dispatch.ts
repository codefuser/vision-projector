/**
 * Favorites dispatcher — single entry point for activating a favorite from
 * anywhere in the app. Handles:
 *   - bible: navigate to /project, open Bible tab in chapter mode, project verse
 *   - media: load + project the media immediately
 *   - songs / text: reserved for future modules
 */
import { router } from "@/router";
import { useBibleStore } from "@/lib/bible/store";
import { useWorkspace } from "@/features/workspace/workspace.store";
import { getBible } from "@/lib/bible/loader";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { projectVerse } from "@/projection/adapters/bible.adapter";
import { useProjection } from "@/stores/projection.store";
import { getMedia } from "@/db/repo";
import { toast } from "sonner";

export async function activateBibleFavorite(book: number, chapter: number, verse: number) {
  const meta = BIBLE_BOOKS[book];
  if (!meta) return;
  const bs = useBibleStore.getState();
  // Make sure both DBs are loaded when in bilingual mode; primary otherwise.
  if (bs.displayMode === "both") await bs.ensureBoth();
  else await bs.ensureLoaded(bs.displayMode);

  // Switch to project view + Bible tab.
  useWorkspace.getState().setActiveTab("bible");
  if (router.state.location.pathname !== "/project") {
    try { await router.navigate({ to: "/project" }); } catch { /* */ }
  }
  // Drive BiblePanel into chapter mode for this verse.
  bs.setQuery(`${meta.name} ${chapter}`);

  // Resolve the verse text and project immediately.
  const primary = bs.displayMode === "ta" ? "ta" : "en";
  const dp = getBible(primary);
  const dotxt = dp?.[book]?.[chapter - 1]?.[verse - 1];
  if (!dotxt) {
    toast.error("Verse not available yet — loading…");
    return;
  }
  const otherLang = bs.displayMode === "both" ? (primary === "en" ? "ta" : "en") : null;
  const otherTxt = otherLang ? getBible(otherLang)?.[book]?.[chapter - 1]?.[verse - 1] : null;

  const refEn = `${meta.name} ${chapter}:${verse}`;
  const refTa = `${meta.nameTa} ${chapter}:${verse}`;
  const enTxt = primary === "en" ? dotxt : (otherTxt ?? "");
  const taTxt = primary === "ta" ? dotxt : (otherTxt ?? "");

  projectVerse({
    reference: bs.displayMode === "both" ? `${refTa} | ${refEn}` : (primary === "ta" ? refTa : refEn),
    text: dotxt,
    translation: primary === "ta" ? "தமிழ்" : "KJV",
    subtext: otherTxt ?? undefined,
    subtranslation: otherTxt ? (primary === "ta" ? "KJV" : "தமிழ்") : undefined,
    referenceEn: refEn,
    referenceTa: refTa,
    textEn: enTxt,
    textTa: taTxt,
    mode: bs.displayMode === "both" ? "both" : (primary === "ta" ? "ta" : "en"),
    book, chapter, verse,
  });
}

export async function activateMediaFavorite(mediaId: string) {
  const m = await getMedia(mediaId);
  if (!m) {
    toast.error("Media not found");
    return;
  }
  const proj = useProjection.getState();
  if (!proj.projectorOpen) proj.openProjector();
  const send = () => useProjection.getState().send({ type: "LOAD", mediaId });
  if (proj.projectorOpen) send();
  else setTimeout(send, 400);
  toast.success(`Projecting ${m.name}`);
}
