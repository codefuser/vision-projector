import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loadBible, type BibleLang } from "./loader";

export type DisplayMode = "en" | "ta" | "both";

export interface BibleFavorite {
  id: string;
  lang: BibleLang;
  /** Display mode captured at save time so a favorite restores the same
   *  Tamil / English / Bilingual context when activated. */
  displayMode?: DisplayMode;
  book: number;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
  addedAt: number;
}

interface BibleStore {
  /** Primary language (used as the canonical / projected reference name). */
  lang: BibleLang;
  /** Card display mode: english-only, tamil-only, or bilingual. */
  displayMode: DisplayMode;
  query: string;
  loading: boolean;
  loaded: Record<BibleLang, boolean>;
  error: string | null;
  favorites: BibleFavorite[];
  setLang: (l: BibleLang) => Promise<void>;
  setDisplayMode: (m: DisplayMode) => Promise<void>;
  setQuery: (q: string) => void;
  ensureLoaded: (l?: BibleLang) => Promise<void>;
  ensureBoth: () => Promise<void>;
  addFavorite: (fav: Omit<BibleFavorite, "id" | "addedAt">) => void;
  removeFavorite: (id: string) => void;
}

export const useBibleStore = create<BibleStore>()(
  persist(
    (set, get) => ({
      lang: "en",
      displayMode: "en",
      query: "",
      loading: false,
      loaded: { en: false, ta: false },
      error: null,
      favorites: [],
      setLang: async (l) => {
        set({ lang: l });
        await get().ensureLoaded(l);
      },
      setDisplayMode: async (m) => {
        // Bilingual implies primary language = the mode's "main" — keep `lang`
        // as the user picked; we just need both DBs loaded.
        set({ displayMode: m });
        if (m === "both") await get().ensureBoth();
        else {
          set({ lang: m });
          await get().ensureLoaded(m);
        }
      },
      setQuery: (q) => set({ query: q }),
      ensureLoaded: async (l) => {
        const lang = l ?? get().lang;
        if (get().loaded[lang]) return;
        set({ loading: true, error: null });
        try {
          await loadBible(lang);
          set((s) => ({ loaded: { ...s.loaded, [lang]: true }, loading: false }));
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
        }
      },
      ensureBoth: async () => {
        set({ loading: true, error: null });
        try {
          await Promise.all([loadBible("en"), loadBible("ta")]);
          set({ loaded: { en: true, ta: true }, loading: false });
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
        }
      },
      addFavorite: (fav) =>
        set((s) => ({
          favorites: [
            {
              ...fav,
              displayMode: fav.displayMode ?? s.displayMode,
              id: `${fav.book}:${fav.chapter}:${fav.verse}`,
              addedAt: Date.now(),
            },
            ...s.favorites.filter(
              (f) => !(f.book === fav.book && f.chapter === fav.chapter && f.verse === fav.verse),
            ),
          ].slice(0, 200),
        })),
      removeFavorite: (id) => set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
    }),
    {
      name: "vision-bible-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lang: s.lang, displayMode: s.displayMode, favorites: s.favorites }),
      version: 3,
      migrate: (persisted) => {
        const p = persisted as { favorites?: BibleFavorite[] } | undefined;
        if (p?.favorites) {
          const seen = new Set<string>();
          p.favorites = p.favorites
            .map((f) => ({ ...f, id: `${f.book}:${f.chapter}:${f.verse}` }))
            .filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
        }
        return p as never;
      },
    },
  ),
);

