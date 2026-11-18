import { useEffect, useState } from 'react';

import { readSoftKeyboardPreference, type SoftKeyboardPreference } from '../lib/preference';

/**
 * Explicit opt-in control surface for the in-app keyboard.
 *
 * The keyboard never opens on focus (see KeyboardProvider). A surface that
 * wants the app keyboard renders <SoftKeyboardToggle /> next to its field and
 * this module carries the state subscription + the two request events, kept in
 * a non-component file so the toggle module only exports components
 * (react-refresh contract).
 */

export interface KeyboardStateDetail {
  open: boolean;
  available: boolean;
  preference: SoftKeyboardPreference;
}

function readState(): KeyboardStateDetail {
  const preference = readSoftKeyboardPreference();
  const open =
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute('data-soft-keyboard-open');
  return { open, available: true, preference };
}

/** Subscribe to the provider's open state and the saved preference. */
export function useSoftKeyboardState(): KeyboardStateDetail {
  const [state, setState] = useState<KeyboardStateDetail>(readState);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<KeyboardStateDetail>).detail;
      if (detail) setState(detail);
      else setState(readState());
    };
    const onPreference = () => setState(readState());
    window.addEventListener('soft-keyboard:state', onState);
    window.addEventListener('soft-keyboard-preference', onPreference);
    return () => {
      window.removeEventListener('soft-keyboard:state', onState);
      window.removeEventListener('soft-keyboard-preference', onPreference);
    };
  }, []);

  return state;
}

/** Ask the provider to open the app keyboard for a field (or the focused one). */
export function requestSoftKeyboard(element?: HTMLElement | null): void {
  window.dispatchEvent(
    new CustomEvent('soft-keyboard:request-open', { detail: { element: element ?? null } }),
  );
}

/** Ask the provider to close the app keyboard. */
export function requestCloseSoftKeyboard(): void {
  window.dispatchEvent(new Event('soft-keyboard:request-close'));
}
