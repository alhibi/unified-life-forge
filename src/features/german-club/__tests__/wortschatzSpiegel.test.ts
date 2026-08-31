import { describe, expect, it, beforeEach } from 'vitest';

import { useDictionaryStore } from '../useDictionaryStore';

/**
 * Note: WortschatzSpiegel is a thin UI shell around `bookmarkedIds`.
 * We test the store contract that drives it: bookmarks persist
 * and the bookmarkedIds selector returns the right shape.
 */
describe('WortschatzSpiegel — bookmark contract', () => {
  beforeEach(() => {
    // Reset between tests
    useDictionaryStore.setState({ bookmarkedIds: [] });
  });

  it('starts empty', () => {
    expect(useDictionaryStore.getState().bookmarkedIds.length).toBe(0);
  });

  it('toggling a bookmark adds and removes an id', () => {
    const store = useDictionaryStore.getState();
    store.toggleBookmark('dict-00001');
    expect(useDictionaryStore.getState().bookmarkedIds).toContain('dict-00001');

    store.toggleBookmark('dict-00001');
    expect(useDictionaryStore.getState().bookmarkedIds).not.toContain('dict-00001');
  });

  it('isBookmarked returns true only for toggled ids', () => {
    const store = useDictionaryStore.getState();
    store.toggleBookmark('dict-00001');
    expect(store.isBookmarked('dict-00001')).toBe(true);
    expect(store.isBookmarked('dict-99999')).toBe(false);
  });

  it('grows monotonically when adding different ids', () => {
    const store = useDictionaryStore.getState();
    const ids = ['dict-00001', 'dict-00002', 'dict-00003'];
    for (const id of ids) store.toggleBookmark(id);
    expect(useDictionaryStore.getState().bookmarkedIds.length).toBe(3);
    expect(useDictionaryStore.getState().bookmarkedIds.sort()).toEqual([...ids].sort());
  });
});