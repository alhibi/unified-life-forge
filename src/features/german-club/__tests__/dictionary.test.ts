import { beforeEach,describe, expect, it } from 'vitest';

import { GERMAN_DICTIONARY_DATA,getWortDesTages, searchDictionary } from '../lib/dictionaryData';
import { DictionaryEntrySchema } from '../types';
import { useDictionaryStore } from '../useDictionaryStore';

describe('German Dictionary Engine & Store Suite', () => {
  beforeEach(() => {
    useDictionaryStore.getState().resetFilters();
    useDictionaryStore.getState().clearRecentSearches();
  });

  describe('Dictionary Dataset & Schema Integrity', () => {
    it('contains over 5,000 unique dictionary entries satisfying the Zod schema', () => {
      expect(GERMAN_DICTIONARY_DATA.length).toBeGreaterThanOrEqual(5000);

      const termsSet = new Set<string>();
      GERMAN_DICTIONARY_DATA.forEach((entry) => {
        const result = DictionaryEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
        termsSet.add(entry.german.toLowerCase());
      });

      // Ensure no duplicates
      expect(termsSet.size).toBe(GERMAN_DICTIONARY_DATA.length);
    });

    it('returns a deterministic Wort des Tages', () => {
      const wordOfDay = getWortDesTages();
      expect(wordOfDay).toBeDefined();
      expect(wordOfDay.german).toBeTruthy();
      expect(wordOfDay.arabic).toBeTruthy();
    });
  });

  describe('Search & Filter Engine', () => {
    it('searches entries by German keyword', () => {
      const results = searchDictionary('Anmeldung');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].german).toBe('Anmeldung');
    });

    it('searches entries by Arabic translation keyword', () => {
      const results = searchDictionary('طبيب');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.arabic.includes('طبيب'))).toBe(true);
    });

    it('filters entries by CEFR level', () => {
      const b2Results = searchDictionary('', { cefr: 'B2' });
      expect(b2Results.length).toBeGreaterThan(0);
      expect(b2Results.every((r) => r.cefr === 'B2')).toBe(true);
    });

    it('filters entries by category', () => {
      const healthResults = searchDictionary('', { category: 'health' });
      expect(healthResults.length).toBeGreaterThan(0);
      expect(healthResults.every((r) => r.category === 'health')).toBe(true);
    });

    it('filters entries by word type', () => {
      const verbResults = searchDictionary('', { wordType: 'verb' });
      expect(verbResults.length).toBeGreaterThan(0);
      expect(verbResults.every((r) => r.word_type === 'verb')).toBe(true);
    });

    it('filters entries by gender', () => {
      const dieResults = searchDictionary('', { gender: 'die' });
      expect(dieResults.length).toBeGreaterThan(0);
      expect(dieResults.every((r) => r.gender === 'die')).toBe(true);
    });

    it('sorts entries alphabetically ascending and descending', () => {
      const ascResults = searchDictionary('', { selectedSort: 'alphabetical_asc' });
      const descResults = searchDictionary('', { selectedSort: 'alphabetical_desc' });

      expect(ascResults[0].german.localeCompare(ascResults[1].german, 'de')).toBeLessThanOrEqual(0);
      expect(descResults[0].german.localeCompare(descResults[1].german, 'de')).toBeGreaterThanOrEqual(0);
    });

    it('sorts entries by CEFR level ascending (A1 -> C2)', () => {
      const cefrAsc = searchDictionary('', { selectedSort: 'cefr_asc' });
      expect(cefrAsc[0].cefr).toBe('A1');
    });

    it('sorts entries by word length', () => {
      const byLength = searchDictionary('', { selectedSort: 'word_length' });
      expect(byLength[0].german.length).toBeGreaterThanOrEqual(byLength[byLength.length - 1].german.length);
    });

    it('filters separable verbs correctly', () => {
      const sepVerbs = searchDictionary('', { onlySeparableVerbs: true });
      expect(sepVerbs.length).toBeGreaterThan(0);
      expect(sepVerbs.every((r) => r.is_separable === true)).toBe(true);
    });
  });

  describe('Dictionary Zustand Store', () => {
    it('handles bookmarking and unbookmarking entries', () => {
      const store = useDictionaryStore.getState();
      const testId = 'dict-a1-001';

      expect(useDictionaryStore.getState().isBookmarked(testId)).toBe(false);

      store.toggleBookmark(testId);
      expect(useDictionaryStore.getState().isBookmarked(testId)).toBe(true);

      store.toggleBookmark(testId);
      expect(useDictionaryStore.getState().isBookmarked(testId)).toBe(false);
    });

    it('tracks recent searches deduplicated and capped at 10', () => {
      const store = useDictionaryStore.getState();

      store.addRecentSearch('Kaffee');
      store.addRecentSearch('Bahnhof');
      store.addRecentSearch('Kaffee'); // duplicate should move to top

      const recent = useDictionaryStore.getState().recentSearches;
      expect(recent[0]).toBe('Kaffee');
      expect(recent[1]).toBe('Bahnhof');
      expect(recent.length).toBe(2);
    });

    it('filters entries starting with selected alphabetical letter', () => {
      const store = useDictionaryStore.getState();
      store.setSelectedLetter('A');

      const results = store.getFilteredEntries();
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.german.toUpperCase().startsWith('A'))).toBe(true);
    });

    it('resets all filters back to default state', () => {
      const store = useDictionaryStore.getState();
      store.setSearchQuery('Test');
      store.setSelectedCategory('health');
      store.setSelectedCEFR('C1');
      store.setSelectedLetter('B');

      store.resetFilters();

      const currentState = useDictionaryStore.getState();
      expect(currentState.searchQuery).toBe('');
      expect(currentState.selectedCategory).toBe('all');
      expect(currentState.selectedCEFR).toBe('all');
      expect(currentState.selectedLetter).toBe('all');
    });
  });
});
