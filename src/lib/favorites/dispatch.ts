/**
 * Favorites dispatcher — single entry point for activating a favorite from
 * anywhere in the app. The caller passes its own navigate() (from
 * useNavigate) so we don't depend on a router singleton.
 */
import { useBibleStore } from "@/lib/bible/store";
import { useWorkspace } from "@/features/workspace/workspace.store";
import { getBible } from "@/lib/bible/loader";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { projectVerse } from "@/projection/adapters/bible.adapter";
import { projectSongSlide } from "@/projection/adapters/song.adapter";
import { useProjection } from "@/stores/projection.store";
import { getMedia } from "@/db/repo";
import { getSongs, loadSongs } from "@/lib/songs/loader";
import { useSongsStore } from "@/lib/songs/store";
import { toast } from "sonner";

type NavigateFn = (opts: { to: string }) => unknown;

export async function activateBibleFavorite(
  navigate: NavigateFn,
  book: number,
  chapter: number,
  verse: number,
  savedMode?: "en" | "ta" | "both",
) {
  const meta = BIBLE_BOOKS[book];
  if (!meta) return;
  const bs = useBibleStore.getState();
  // Restore the language context the favorite was saved with so Tamil
  // favorites always project in Tamil regardless of current mode.
  if (savedMode && savedMode !== bs.displayMode) {
    await bs.setDisplayMode(savedMode);
  }
  if (bs.displayMode === "both") await bs.ensureBoth();
  else await bs.ensureLoaded(bs.displayMode);

  useWorkspace.getState().setActiveTab("bible");
  if (typeof window !== "undefined" && window.location.pathname !== "/project") {
    try { await Promise.resolve(navigate({ to: "/project" })); } catch { /* */ }
  }
  bs.setQuery(`${meta.name} ${chapter}`);

  const primary = bs.displayMode === "ta" ? "ta" : "en";
  const dp = getBible(primary);
  const dotxt = dp?.[book]?.[chapter - 1]?.[verse - 1];
  if (!dotxt) { toast.error("Verse not available yet — loading…"); return; }
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
  if (!m) { toast.error("Media not found"); return; }
  const proj = useProjection.getState();
  if (!proj.projectorOpen) proj.openProjector();
  const send = () => useProjection.getState().send({ type: "LOAD", mediaId });
  if (proj.projectorOpen) send();
  else setTimeout(send, 400);
  toast.success(`Projecting ${m.name}`);
}

export async function activateSongFavorite(songId: number, slideIndex = 0) {
  await useSongsStore.getState().ensureLoaded();
  const song = getSongs()?.find((s) => s.id === songId);
  if (!song) { toast.error("Song not found"); return; }
  const text = song.slides[slideIndex] ?? song.content;
  projectSongSlide({
    songId: song.id,
    slideIndex,
    totalSlides: song.slides.length || 1,
    title: song.title,
    text,
  });
}
