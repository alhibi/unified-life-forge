import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSystemStore } from '../systemStore';

describe('useSystemStore Zustand Engine', () => {
  beforeEach(() => {
    useSystemStore.setState({
      theme: 'dark',
      language: 'ar',
      isCommandPaletteOpen: false,
      isDataSaver: false,
      isBatterySaver: false,
      lastThemeSwapTime: null,
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should initialize with default options', () => {
    const state = useSystemStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.language).toBe('ar');
    expect(state.isCommandPaletteOpen).toBe(false);
  });

  it('should update theme and record swap timestamp', () => {
    const store = useSystemStore.getState();
    store.setTheme('obsidian');

    const updated = useSystemStore.getState();
    expect(updated.theme).toBe('obsidian');
    expect(updated.lastThemeSwapTime).not.toBeNull();
  });

  it('should toggle command palette state successfully', () => {
    const store = useSystemStore.getState();
    store.toggleCommandPalette();

    expect(useSystemStore.getState().isCommandPaletteOpen).toBe(true);

    store.toggleCommandPalette();
    expect(useSystemStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('should update battery and data saver configurations', () => {
    const store = useSystemStore.getState();
    store.setDataSaver(true);
    store.setBatterySaver(true);

    const updated = useSystemStore.getState();
    expect(updated.isDataSaver).toBe(true);
    expect(updated.isBatterySaver).toBe(true);
  });

  it('should batch update system preferences', () => {
    const store = useSystemStore.getState();
    store.setSystemPreferences({
      language: 'en',
      theme: 'light',
    });

    const updated = useSystemStore.getState();
    expect(updated.language).toBe('en');
    expect(updated.theme).toBe('light');
  });

  it('should reset preferences to initial defaults', () => {
    const store = useSystemStore.getState();
    store.setTheme('obsidian');
    store.setLanguage('en');
    store.resetPreferences();

    const updated = useSystemStore.getState();
    expect(updated.theme).toBe('dark');
    expect(updated.language).toBe('ar');
  });
});
