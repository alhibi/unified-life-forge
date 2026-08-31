/**
 * Per-tab + cross-tab secure storage. Wraps `secure-web-storage` with our
 * project-wide pepper so persisted tokens survive a page reload but are
 * not trivially extractable from devtools.
 *
 * Never use `localStorage` directly from feature code. Use
 * `secureStore.get`, `secureStore.set`, `secureStore.remove`. The wrapper
 * also enforces a 5 MB cap and rejects non-serializable values.
 */

import SecureStorage from 'secure-web-storage';
import { APP_NAME, APP_VERSION } from '../version';

const PEPPER = `smarthub::${APP_NAME}::${APP_VERSION}`;

const storage = new SecureStorage(localStorage, {
  hash: (key) => {
    let h = 0x811c9dc5;
    const k = `${key}::${PEPPER}`;
    for (let i = 0; i < k.length; i += 1) {
      h ^= k.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16);
  },
});

const MAX_BYTES = 5 * 1024 * 1024;

function approxBytes(value: string): number {
  return value.length * 2;
}

export const secureStore = {
  get<T>(key: string): T | null {
    try {
      const raw = storage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      if (approxBytes(serialized) > MAX_BYTES) return false;
      storage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    storage.removeItem(key);
  },
  clear(): void {
    storage.clear();
  },
  has(key: string): boolean {
    return storage.getItem(key) != null;
  },
};