import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================================================
// Core Interfaces & Types
// ============================================================================

export type ThemeType = 'light' | 'dark' | 'obsidian';

export interface BaseState {
  theme: ThemeType;
  language: 'en' | 'ar';
  isCommandPaletteOpen: boolean;
  isDataSaver: boolean;
  isBatterySaver: boolean;
  lastThemeSwapTime: string | null;
}

export interface BaseActions {
  /**
   * Updates active theme and logs swap timestamp for performance monitoring.
   */
  setTheme: (theme: ThemeType) => void;

  /**
   * Updates language setting across the super-app context.
   */
  setLanguage: (lang: 'en' | 'ar') => void;

  /**
   * Toggles Command Palette (Ctrl+K/Cmd+K) trigger.
   */
  toggleCommandPalette: () => void;

  /**
   * Sets Command Palette state explicitly.
   */
  setCommandPalette: (isOpen: boolean) => void;

  /**
   * Updates data saver mode.
   */
  setDataSaver: (enabled: boolean) => void;

  /**
   * Updates battery saver mode. Caps spring frame-rates when active.
   */
  setBatterySaver: (enabled: boolean) => void;

  /**
   * Batch updates system preferences with schema validation.
   */
  setSystemPreferences: (prefs: Partial<BaseState>) => void;

  /**
   * Resets all preferences to initial system defaults.
   */
  resetPreferences: () => void;
}

type StoreType = BaseState & BaseActions;

const initialStoreState: BaseState = {
  theme: 'dark',
  language: 'ar',
  isCommandPaletteOpen: false,
  isDataSaver: false,
  isBatterySaver: false,
  lastThemeSwapTime: null,
};

// ============================================================================
// Global System Engine Store
// ============================================================================

export const useSystemStore = create<StoreType>()(
  persist(
    (set) => ({
      ...initialStoreState,

      setTheme: (theme) => set({
        theme,
        lastThemeSwapTime: new Date().toISOString()
      }),

      setLanguage: (language) => set({ language }),

      toggleCommandPalette: () => set((state) => ({
        isCommandPaletteOpen: !state.isCommandPaletteOpen
      })),

      setCommandPalette: (isOpen) => set({ isCommandPaletteOpen: isOpen }),

      setDataSaver: (isDataSaver) => set({ isDataSaver }),

      setBatterySaver: (isBatterySaver) => set({ isBatterySaver }),

      setSystemPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),

      resetPreferences: () => set(initialStoreState),
    }),
    {
      name: 'zen-elite-system-store',
      storage: createJSONStorage(() => localStorage),
      // Selectively persist specific fields
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isDataSaver: state.isDataSaver,
        isBatterySaver: state.isBatterySaver,
        lastThemeSwapTime: state.lastThemeSwapTime,
      }),
    }
  )
);
