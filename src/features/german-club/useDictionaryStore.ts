import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DictionaryEntry, CEFRLevel, DictionaryWordType, GermanGender } from './types';
import { GERMAN_DICTIONARY_DATA, searchDictionary, getWortDesTages } from './lib/dictionaryData';

interface DictionaryState {
  searchQuery: string;
  selectedCategory: string;
  selectedCEFR: CEFRLevel | 'all';
  selectedWordType: DictionaryWordType | 'all';
  selectedGender: GermanGender | 'all';
  selectedLetter: string | 'all';

  bookmarkedIds: string[];
  recentSearches: string[];
  selectedEntry: DictionaryEntry | null;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setSelectedCEFR: (level: CEFRLevel | 'all') => void;
  setSelectedWordType: (type: DictionaryWordType | 'all') => void;
  setSelectedGender: (gender: GermanGender | 'all') => void;
  setSelectedLetter: (letter: string | 'all') => void;

  toggleBookmark: (entryId: string) => void;
  isBookmarked: (entryId: string) => boolean;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setSelectedEntry: (entry: DictionaryEntry | null) => void;
  resetFilters: () => void;

  getFilteredEntries: () => DictionaryEntry[];
  getWortDesTages: () => DictionaryEntry;
}

export const useDictionaryStore = create<DictionaryState>()(
  persist(
    (set, get) => ({
      searchQuery: '',
      selectedCategory: 'all',
      selectedCEFR: 'all',
      selectedWordType: 'all',
      selectedGender: 'all',
      selectedLetter: 'all',

      bookmarkedIds: [],
      recentSearches: [],
      selectedEntry: null,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSelectedCEFR: (cefr) => set({ selectedCEFR: cefr }),
      setSelectedWordType: (wordType) => set({ selectedWordType: wordType }),
      setSelectedGender: (gender) => set({ selectedGender: gender }),
      setSelectedLetter: (letter) => set({ selectedLetter: letter }),

      toggleBookmark: (entryId) =>
        set((state) => {
          const exists = state.bookmarkedIds.includes(entryId);
          return {
            bookmarkedIds: exists
              ? state.bookmarkedIds.filter((id) => id !== entryId)
              : [...state.bookmarkedIds, entryId],
          };
        }),

      isBookmarked: (entryId) => get().bookmarkedIds.includes(entryId),

      addRecentSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmed.toLowerCase()
          );
          return {
            recentSearches: [trimmed, ...filtered].slice(0, 10),
          };
        });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      setSelectedEntry: (entry) => set({ selectedEntry: entry }),

      resetFilters: () =>
        set({
          searchQuery: '',
          selectedCategory: 'all',
          selectedCEFR: 'all',
          selectedWordType: 'all',
          selectedGender: 'all',
          selectedLetter: 'all',
        }),

      getFilteredEntries: () => {
        const {
          searchQuery,
          selectedCategory,
          selectedCEFR,
          selectedWordType,
          selectedGender,
          selectedLetter,
        } = get();

        let results = searchDictionary(searchQuery, {
          category: selectedCategory,
          cefr: selectedCEFR,
          wordType: selectedWordType,
          gender: selectedGender,
        });

        if (selectedLetter !== 'all') {
          results = results.filter((entry) =>
            entry.german.toLowerCase().startsWith(selectedLetter.toLowerCase())
          );
        }

        return results;
      },

      getWortDesTages: () => getWortDesTages(),
    }),
    {
      name: 'german-dictionary-storage',
      partialize: (state) => ({
        bookmarkedIds: state.bookmarkedIds,
        recentSearches: state.recentSearches,
      }),
    }
  )
);
