/**
 * Advanced preferences & configuration store for the Soft Keyboard.
 *
 * Provides persistent settings inspired by Google Keyboard (Gboard), tuned for high-fidelity
 * Arabic typing experience with themes, haptics, key height, number row, popups, and layout modes.
 */

export type SoftKeyboardPreference = 'app' | 'system';
export type KeyboardTheme =
  | 'gboard-dark'
  | 'gboard-light'
  | 'oled'
  | 'luxury-gold'
  | 'sand'
  | 'emerald'
  | 'sapphire';
export type KeyboardHeight = 'compact' | 'normal' | 'tall' | 'extra-tall';
export type HapticIntensity = 'off' | 'light' | 'medium' | 'heavy';
export type DigitType = 'western' | 'eastern'; // '123' vs '١٢٣'
export type OneHandedMode = 'off' | 'left' | 'right';
export type SoundTone = 'default' | 'click' | 'mechanical' | 'soft';
export type ClipboardRetention = 'unlimited' | '1day' | '7days' | '30days' | 'session';

export interface KeyboardSettings {
  preference: SoftKeyboardPreference;
  theme: KeyboardTheme;
  keyHeight: KeyboardHeight;
  showNumberRow: boolean;
  digitType: DigitType;
  showKeyPressPopup: boolean;
  holdDelayMs: number;
  soundEnabled: boolean;
  soundOnClick: boolean;
  soundVolume: number;
  soundTone: SoundTone;
  hapticIntensity: HapticIntensity;
  vibrateOnKeyPress: boolean;
  autoCapitalization: boolean;
  autoCorrectionEnabled: boolean;
  autoPeriod: boolean;
  autoTashkeel: boolean;
  oneHandedMode: OneHandedMode;
  clipboardEnabled: boolean;
  clipboardRetention: ClipboardRetention;
  keyBorders: boolean;
}

const STORAGE_KEY = 'smarthub:soft-keyboard-settings-v2';
/** Exported so the traveling-settings sync layer can detect local ownership
 *  without hard-coding the key a second time (single source of truth). */
export const KEYBOARD_SETTINGS_STORAGE_KEY = STORAGE_KEY;
/** Pre-v2 key: stored the raw 'app' | 'system' choice. Migrated on first read. */
const LEGACY_PREFERENCE_KEY = 'smarthub:soft-keyboard';

let memorySettings: KeyboardSettings | null = null;

export const DEFAULT_KEYBOARD_SETTINGS: KeyboardSettings = {
  preference: 'app',
  theme: 'gboard-dark',
  keyHeight: 'normal',
  showNumberRow: true,
  digitType: 'western',
  showKeyPressPopup: true,
  holdDelayMs: 280,
  soundEnabled: false,
  soundOnClick: false,
  soundVolume: 0.5,
  soundTone: 'default',
  hapticIntensity: 'light',
  vibrateOnKeyPress: true,
  autoCapitalization: true,
  autoCorrectionEnabled: true,
  autoPeriod: true,
  autoTashkeel: true,
  oneHandedMode: 'off',
  clipboardEnabled: true,
  clipboardRetention: 'unlimited',
  keyBorders: true,
};

export function readKeyboardSettings(): KeyboardSettings {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...DEFAULT_KEYBOARD_SETTINGS, ...parsed };
        }
      }
      // Honour the legacy opt-out so users who chose the OS keyboard keep it.
      const legacy = localStorage.getItem(LEGACY_PREFERENCE_KEY);
      if (legacy === 'system' || legacy === 'app') {
        return { ...DEFAULT_KEYBOARD_SETTINGS, preference: legacy };
      }
    } catch {
      return DEFAULT_KEYBOARD_SETTINGS;
    }
  }
  return memorySettings ?? DEFAULT_KEYBOARD_SETTINGS;
}

export function writeKeyboardSettings(settings: Partial<KeyboardSettings>): KeyboardSettings {
  const current = readKeyboardSettings();
  const next = { ...current, ...settings };
  memorySettings = next;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private browsing fallback */
    }
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('soft-keyboard-settings-changed', { detail: next }));
    window.dispatchEvent(new CustomEvent('soft-keyboard-preference', { detail: next.preference }));
  }
  return next;
}

/** Legacy support wrappers for backward compatibility */
export function readSoftKeyboardPreference(): SoftKeyboardPreference {
  return readKeyboardSettings().preference;
}

/**
 * Drops the in-memory fallback cache so a localStorage wipe (e.g. the
 * sign-out sweep) isn't shadowed by stale cached settings for the rest
 * of the session.
 */
export function clearKeyboardRuntimeCache(): void {
  memorySettings = null;
}

export function writeSoftKeyboardPreference(value: SoftKeyboardPreference): void {
  writeKeyboardSettings({ preference: value });
}

/**
 * Checks if device supports touch soft keyboard.
 */
export function supportsSoftKeyboard(): boolean {
  if (typeof window === 'undefined') return false;
  // Available in all browser environments so users can opt into or out of
  // the in-app custom keyboard via preference settings ('app' vs 'system').
  return true;
}
