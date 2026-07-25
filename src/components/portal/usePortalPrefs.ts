/**
 * Portal preferences — pinned apps, recents and the grid/list view mode.
 *
 * Implemented as a module-level singleton with a listener set (the same
 * pattern `useUnreadMessages` / `useDeviceLocation` use in this codebase) so
 * that the header, the grid and the detail panel all read one value and a pin
 * toggle in any of them updates the others in the same frame — no prop
 * drilling and no duplicated localStorage reads on every render.
 *
 * Storage keys are prefixed `portal:` and are swept by AppContext's sign-out
 * reset only if listed there; they hold no personal data beyond app ordering,
 * so they intentionally survive as device-local ergonomics.
 */
import { useCallback, useSyncExternalStore } from 'react';

import { PORTAL_APPS } from './apps';

export type PortalViewMode = 'grid' | 'list';

export interface PortalPrefsState {
  /** App keys the user pinned, in the order they were pinned. */
  pinned: string[];
  /** App keys most-recently opened, newest first, capped at RECENTS_CAP. */
  recents: string[];
  view: PortalViewMode;
}

const KEY_PINNED = 'portal:pinned';
const KEY_RECENTS = 'portal:recents';
const KEY_VIEW = 'portal:view';
const RECENTS_CAP = 4;

type Listener = (s: PortalPrefsState) => void;

const listeners = new Set<Listener>();
let state: PortalPrefsState | null = null;

const VALID_KEYS = new Set(PORTAL_APPS.map((a) => a.key));

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop unknown keys so a renamed/removed app can never resurrect a ghost
    // tile, and de-dupe so a corrupted write cannot render the same app twice.
    return Array.from(new Set(parsed.filter((k): k is string => typeof k === 'string' && VALID_KEYS.has(k))));
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or privacy mode — preferences degrade to session-only */
  }
}

function bootstrap(): PortalPrefsState {
  if (state) return state;
  const rawView = (() => {
    try {
      return localStorage.getItem(KEY_VIEW);
    } catch {
      return null;
    }
  })();
  state = {
    pinned: readList(KEY_PINNED),
    recents: readList(KEY_RECENTS),
    view: rawView === 'list' ? 'list' : 'grid',
  };
  return state;
}

function commit(next: PortalPrefsState) {
  state = next;
  for (const l of listeners) l(next);
}

export function togglePinnedApp(key: string) {
  const s = bootstrap();
  const pinned = s.pinned.includes(key) ? s.pinned.filter((k) => k !== key) : [...s.pinned, key];
  write(KEY_PINNED, pinned);
  commit({ ...s, pinned });
}

export function recordAppOpen(key: string) {
  const s = bootstrap();
  if (!VALID_KEYS.has(key)) return;
  const recents = [key, ...s.recents.filter((k) => k !== key)].slice(0, RECENTS_CAP);
  write(KEY_RECENTS, recents);
  commit({ ...s, recents });
}

export function setPortalView(view: PortalViewMode) {
  const s = bootstrap();
  if (s.view === view) return;
  try {
    localStorage.setItem(KEY_VIEW, view);
  } catch {
    /* ignore */
  }
  commit({ ...s, view });
}

export interface UsePortalPrefsResult extends PortalPrefsState {
  isPinned: (key: string) => boolean;
  togglePin: (key: string) => void;
  recordOpen: (key: string) => void;
  setView: (v: PortalViewMode) => void;
}

function subscribe(onStoreChange: () => void): () => void {
  const listener: Listener = () => onStoreChange();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePortalPrefs(): UsePortalPrefsResult {
  // useSyncExternalStore is the correct primitive for a module-level store:
  // it reads the value during render (so the first paint is already correct),
  // subscribes without a setState-in-effect, and is tear-free under
  // concurrent rendering.
  const snapshot = useSyncExternalStore(subscribe, bootstrap, bootstrap);

  const isPinned = useCallback((key: string) => snapshot.pinned.includes(key), [snapshot.pinned]);

  return {
    ...snapshot,
    isPinned,
    togglePin: togglePinnedApp,
    recordOpen: recordAppOpen,
    setView: setPortalView,
  };
}
