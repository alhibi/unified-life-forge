import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DictionaryEntry,
  CEFRLevel,
  DictionaryWordType,
  GermanGender,
  DictionarySortOption,
  GrammaticalCase,
} from './types';
import { GERMAN_DICTIONARY_DATA, searchDictionary, getWortDesTages } from './lib/dictionaryData';

interface DictionaryState {
  searchQuery: string;
  selectedCategory: string;
  selectedCEFR: CEFRLevel | 'all';
  selectedWordType: DictionaryWordType | 'all';
  selectedGender: GermanGender | 'all';
  selectedLetter: string | 'all';
  selectedSort: DictionarySortOption;
  selectedCase: GrammaticalCase | 'all';
  onlySeparableVerbs: boolean;

  bookmarkedIds: string[];
  recentSearches: string[];
  selectedEntry: DictionaryEntry | null;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setSelectedCEFR: (level: CEFRLevel | 'all') => void;
  setSelectedWordType: (type: DictionaryWordType | 'all') => void;
  setSelectedGender: (gender: GermanGender | 'all') => void;
  setSelectedLetter: (letter: string | 'all') => void;
  setSelectedSort: (sort: DictionarySortOption) => void;
  setSelectedCase: (grammaticalCase: GrammaticalCase | 'all') => void;
  setOnlySeparableVerbs: (only: boolean) => void;

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
      selectedSort: 'alphabetical_asc',
      selectedCase: 'all',
      onlySeparableVerbs: false,

      bookmarkedIds: [],
      recentSearches: [],
      selectedEntry: null,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSelectedCEFR: (cefr) => set({ selectedCEFR: cefr }),
      setSelectedWordType: (wordType) => set({ selectedWordType: wordType }),
      setSelectedGender: (gender) => set({ selectedGender: gender }),
      setSelectedLetter: (letter) => set({ selectedLetter: letter }),
      setSelectedSort: (sort) => set({ selectedSort: sort }),
      setSelectedCase: (grammaticalCase) => set({ selectedCase: grammaticalCase }),
      setOnlySeparableVerbs: (only) => set({ onlySeparableVerbs: only }),

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
          selectedSort: 'alphabetical_asc',
          selectedCase: 'all',
          onlySeparableVerbs: false,
        }),

      getFilteredEntries: () => {
        const {
          searchQuery,
          selectedCategory,
          selectedCEFR,
          selectedWordType,
          selectedGender,
          selectedLetter,
          selectedSort,
          selectedCase,
          onlySeparableVerbs,
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

        if (selectedCase !== 'all') {
          results = results.filter((entry) => entry.preposition_case === selectedCase);
        }

        if (onlySeparableVerbs) {
          results = results.filter((entry) => entry.is_separable === true);
        }

        const cefrRank: Record<CEFRLevel, number> = {
          A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
        };
        const byGerman = (a: DictionaryEntry, b: DictionaryEntry) =>
          a.german.localeCompare(b.german, 'de');

        const sorted = [...results];
        switch (selectedSort) {
          case 'alphabetical_desc':
            sorted.sort((a, b) => byGerman(b, a));
            break;
          case 'cefr_asc':
            sorted.sort((a, b) => (cefrRank[a.cefr] ?? 0) - (cefrRank[b.cefr] ?? 0) || byGerman(a, b));
            break;
          case 'cefr_desc':
            sorted.sort((a, b) => (cefrRank[b.cefr] ?? 0) - (cefrRank[a.cefr] ?? 0) || byGerman(a, b));
            break;
          case 'word_length':
            sorted.sort((a, b) => a.german.length - b.german.length || byGerman(a, b));
            break;
          case 'type_grouped':
            sorted.sort((a, b) => a.word_type.localeCompare(b.word_type) || byGerman(a, b));
            break;
          case 'alphabetical_asc':
          default:
            sorted.sort(byGerman);
            break;
        }

        return sorted;
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
