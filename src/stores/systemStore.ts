import { create } from 'zustand';
import { createJSONStorage,persist } from 'zustand/middleware';

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
}

export interface BaseActions {
  setTheme: (theme: ThemeType) => void;
  setLanguage: (lang: 'en' | 'ar') => void;
  toggleCommandPalette: () => void;
  setCommandPalette: (isOpen: boolean) => void;
  setSystemPreferences: (prefs: Partial<BaseState>) => void;
  resetPreferences: () => void;
}

type StoreType = BaseState & BaseActions;

const initialStoreState: BaseState = {
  theme: 'dark',
  language: 'ar',
  isCommandPaletteOpen: false,
  isDataSaver: false,
  isBatterySaver: false,
};

// ============================================================================
// Global System Engine Store
// ============================================================================

export const useSystemStore = create<StoreType>()(
  persist(
    (set) => ({
      ...initialStoreState,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
      setCommandPalette: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
      setSystemPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),
      resetPreferences: () => set(initialStoreState),
    }),
    {
      name: 'zen-elite-system-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isDataSaver: state.isDataSaver,
        isBatterySaver: state.isBatterySaver,
      }), // Only persist specific fields
    }
  )
);
