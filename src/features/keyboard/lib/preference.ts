/**
 * Whether the app's own keyboard replaces the OS one.
 *
 * Persisted, because a typist who prefers the system keyboard (swipe input,
 * dictation, their own dictionary) must not have to opt out on every field.
 */

const KEY = 'smarthub:soft-keyboard';

export type SoftKeyboardPreference = 'app' | 'system';

export function readSoftKeyboardPreference(): SoftKeyboardPreference {
  if (typeof window === 'undefined') return 'system';
  try {
    return window.localStorage.getItem(KEY) === 'system' ? 'system' : 'app';
  } catch {
    return 'app';
  }
}

export function writeSoftKeyboardPreference(value: SoftKeyboardPreference): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* private mode — the session default still applies */
  }
  window.dispatchEvent(new CustomEvent('soft-keyboard-preference', { detail: value }));
}

/**
 * The app keyboard is a touch surface. On a device with a real keyboard the OS
 * input path is strictly better, so we never take it over there.
 */
export function supportsSoftKeyboard(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse && touch;
}