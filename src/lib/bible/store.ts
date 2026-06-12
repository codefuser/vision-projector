import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loadBible, type BibleLang } from "./loader";

export interface BibleFavorite {
  id: string;
  lang: BibleLang;
  book: number;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
  addedAt: number;
}

interface BibleStore {
  lang: BibleLang;
  query: string;
  loading: boolean;
  loaded: Record<BibleLang, boolean>;
  error: string | null;
  favorites: BibleFavorite[];
  setLang: (l: BibleLang) => Promise<void>;
  setQuery: (q: string) => void;
  ensureLoaded: (l?: BibleLang) => Promise<void>;
  addFavorite: (fav: Omit<BibleFavorite, "id" | "addedAt">) => void;
  removeFavorite: (id: string) => void;
}

export const useBibleStore = create<BibleStore>()(
  persist(
    (set, get) => ({
      lang: "en",
      query: "",
      loading: false,
      loaded: { en: false, ta: false },
      error: null,
      favorites: [],
      setLang: async (l) => {
        set({ lang: l });
        await get().ensureLoaded(l);
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
      addFavorite: (fav) =>
        set((s) => ({
          favorites: [
            { ...fav, id: `${fav.lang}:${fav.book}:${fav.chapter}:${fav.verse}`, addedAt: Date.now() },
            ...s.favorites.filter(
              (f) =>
                !(
                  f.lang === fav.lang &&
                  f.book === fav.book &&
                  f.chapter === fav.chapter &&
                  f.verse === fav.verse
                ),
            ),
          ].slice(0, 200),
        })),
      removeFavorite: (id) => set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
    }),
    {
      name: "vision-bible-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lang: s.lang, favorites: s.favorites }),
    },
  ),
);
