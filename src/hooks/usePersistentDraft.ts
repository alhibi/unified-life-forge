import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * usePersistentDraft / usePersistentSection — "I did not mean to leave".
 *
 * The failure this fixes is mundane and infuriating: you are three sentences
 * into a note, the phone's back gesture fires, you come back, and the field is
 * empty. Native apps keep that text. So do we.
 *
 * Storage choices, both deliberate:
 *   • `sessionStorage`, not `localStorage` — a draft is a *this session*
 *     artifact. Resurrecting last week's half-sentence weeks later is creepy
 *     and confusing; losing it when the app is fully closed is expected.
 *   • writes are debounced (250ms) so typing never touches storage per
 *     keystroke, and the final value is flushed on unmount.
 *
 * The API is a drop-in for `useState<string>`.
 */

const DEBOUNCE_MS = 250;

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    if (value === '') sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the draft is simply not durable, never an error */
  }
}

export function usePersistentDraft(
  key: string,
  initial = '',
): [string, (next: string) => void, () => void] {
  const storageKey = `draft:${key}`;
  const [value, setValue] = useState<string>(() => read(storageKey) ?? initial);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `latest` mirrors the current value for the unmount flush. It is updated
  // inside `set` (never during render), so no effect is needed to keep it
  // in sync — and React's rules about ref writes are respected.
  const latest = useRef(value);

  const set = useCallback(
    (next: string) => {
      setValue(next);
      latest.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => write(storageKey, next), DEBOUNCE_MS);
    },
    [storageKey],
  );

  /** Call after a successful submit — the draft has become real data. */
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setValue('');
    latest.current = '';
    write(storageKey, '');
  }, [storageKey]);

  useEffect(
    () => () => {
      // Flush on unmount: navigating away is exactly the case this exists for,
      // and the debounce timer would otherwise be cancelled mid-flight.
      if (timer.current) clearTimeout(timer.current);
      write(storageKey, latest.current);
    },
    [storageKey],
  );

  return [value, set, clear];
}

/**
 * Remember which tab/section of a screen was last open, so returning to a
 * screen returns you to where you were rather than to its first tab.
 *
 * Persisted in `localStorage` (unlike drafts): "I always use the البلاغة tab"
 * is a lasting preference, not a session artifact. An unrecognised stored value
 * falls back to the default, so removing a tab can never wedge a screen.
 */
export function usePersistentSection<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const storageKey = `section:${key}`;
  const [section, setSection] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null && (allowed as readonly string[]).includes(stored)
        ? (stored as T)
        : fallback;
    } catch {
      return fallback;
    }
  });

  const set = useCallback(
    (next: T) => {
      setSection(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* session-only */
      }
    },
    [storageKey],
  );

  return [section, set];
}
