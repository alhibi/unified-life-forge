/**
 * Advanced preferences & configuration store for the Soft Keyboard.
 *
 * Provides persistent settings inspired by Google Keyboard (Gboard), tuned for high-fidelity
 * Arabic typing experience with themes, haptics, key height, number row, popups, and layout modes.
 */

export type SoftKeyboardPreference = 'app' | 'system';
export type KeyboardTheme = 'gboard-dark' | 'gboard-light' | 'oled' | 'luxury-gold' | 'sand';
export type KeyboardHeight = 'compact' | 'normal' | 'tall' | 'extra-tall';
export type HapticIntensity = 'off' | 'light' | 'medium' | 'heavy';
export type DigitType = 'western' | 'eastern'; // '123' vs '١٢٣'
export type OneHandedMode = 'off' | 'left' | 'right';

export interface KeyboardSettings {
  preference: SoftKeyboardPreference;
  theme: KeyboardTheme;
  keyHeight: KeyboardHeight;
  showNumberRow: boolean;
  showKeyPressPopup: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  hapticIntensity: HapticIntensity;
  digitType: DigitType;
  autoPeriod: boolean;
  autoTashkeel: boolean;
  oneHandedMode: OneHandedMode;
  clipboardEnabled: boolean;
  keyBorders: boolean;
  vibrateOnKeyPress: boolean;
}

const STORAGE_KEY = 'smarthub:soft-keyboard-settings-v2';

export const DEFAULT_KEYBOARD_SETTINGS: KeyboardSettings = {
  preference: 'app',
  theme: 'gboard-dark',
  keyHeight: 'normal',
  showNumberRow: false,
  showKeyPressPopup: true,
  soundEnabled: false,
  soundVolume: 0.5,
  hapticIntensity: 'light',
  digitType: 'western',
  autoPeriod: true,
  autoTashkeel: true,
  oneHandedMode: 'off',
  clipboardEnabled: true,
  keyBorders: true,
  vibrateOnKeyPress: true,
};

export function readKeyboardSettings(): KeyboardSettings {
  if (typeof window === 'undefined') return DEFAULT_KEYBOARD_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KEYBOARD_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_KEYBOARD_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_KEYBOARD_SETTINGS;
  }
}

export function writeKeyboardSettings(settings: Partial<KeyboardSettings>): KeyboardSettings {
  const current = readKeyboardSettings();
  const next = { ...current, ...settings };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private browsing fallback */
  }
  window.dispatchEvent(new CustomEvent('soft-keyboard-settings-changed', { detail: next }));
  return next;
}

/** Legacy support wrappers for backward compatibility */
export function readSoftKeyboardPreference(): SoftKeyboardPreference {
  return readKeyboardSettings().preference;
}

export function writeSoftKeyboardPreference(value: SoftKeyboardPreference): void {
  writeKeyboardSettings({ preference: value });
}

/**
 * Checks if device supports touch soft keyboard.
 */
export function supportsSoftKeyboard(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse && touch;
}
