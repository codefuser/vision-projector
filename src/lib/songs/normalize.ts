/**
 * Shared text normalization used by Bible AND Songs search so a query like
 * "yesu", "yesuvae", "anpu" / "anbu", "vaazhvu" / "valvu" produces stable
 * stems for fuzzy / Tanglish matching.
 *
 * Re-exports the Bible search normalizers so both modules stay in sync.
 */
export { normalizeTanglish, normalizeTamil, normalizeForSearch } from "@/lib/bible/search";
