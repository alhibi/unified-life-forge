/**
 * Storage quota guard with LRU eviction.
 *
 * The app caches aggressively on purpose — the whole Qur'an, tafsir, article
 * bodies, chat messages, voice notes and image thumbnails. On a phone that is
 * already nearly full, the browser does not politely warn: an IndexedDB or
 * Cache Storage write simply rejects with QuotaExceededError, which surfaces
 * as an unrelated feature "randomly" failing to save.
 *
 * So eviction is a first-class, app-owned policy rather than something left to
 * the browser. Each cache registers an evictor that can free space
 * oldest-accessed-first and report roughly how much it freed. When usage
 * crosses `HIGH_WATER` of the quota, evictors run in ascending value order —
 * cheapest-to-refetch first — until usage is back under `LOW_WATER` or nothing
 * is left to drop.
 *
 * Fully feature-detected: on Safari <17 and in private windows
 * `navigator.storage.estimate` may be missing or lie, in which case every
 * function here degrades to a no-op instead of guessing.
 */

/** Start evicting at 80% of quota. */
const HIGH_WATER = 0.8;
/** Evict until back under 65%, so we do not thrash at the boundary. */
const LOW_WATER = 0.65;
/** Never re-check more than once a minute — estimate() is not free. */
const MIN_CHECK_INTERVAL_MS = 60_000;

export interface StorageEstimateResult {
  usage: number;
  quota: number;
  /** 0–1. `0` when the platform cannot tell us. */
  ratio: number;
  supported: boolean;
}

export interface Evictor {
  /** Stable id, for logs and for replacing a registration on HMR. */
  id: string;
  /**
   * Cost of losing this data, 1 = trivially refetched (article thumbnails),
   * 10 = expensive or irreplaceable (offline Qur'an audio, outbox). Lower
   * values are evicted first.
   */
  value: number;
  /**
   * Free approximately `targetBytes`, oldest-accessed first. Returns the
   * number of bytes actually freed (an estimate is fine).
   */
  evict: (targetBytes: number) => Promise<number>;
}

const evictors = new Map<string, Evictor>();
let lastCheck = 0;
let inFlight: Promise<StorageEstimateResult> | null = null;

export function registerEvictor(evictor: Evictor): () => void {
  evictors.set(evictor.id, evictor);
  return () => {
    evictors.delete(evictor.id);
  };
}

export async function estimateStorage(): Promise<StorageEstimateResult> {
  const empty: StorageEstimateResult = { usage: 0, quota: 0, ratio: 0, supported: false };
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return empty;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!quota) return empty;
    return { usage, quota, ratio: usage / quota, supported: true };
  } catch {
    return empty;
  }
}

/**
 * Checks usage and evicts if needed. Safe to call from any write path — it
 * self-throttles, dedupes concurrent calls, and never throws.
 *
 * @param force Skip the throttle (use right before a large write).
 */
export async function ensureStorageHeadroom(force = false): Promise<StorageEstimateResult> {
  if (inFlight) return inFlight;
  const now = Date.now();
  if (!force && now - lastCheck < MIN_CHECK_INTERVAL_MS) {
    return { usage: 0, quota: 0, ratio: 0, supported: false };
  }
  lastCheck = now;

  inFlight = (async () => {
    const est = await estimateStorage();
    if (!est.supported || est.ratio < HIGH_WATER) return est;

    // How much we need gone to land under the low-water mark.
    let remaining = Math.ceil(est.usage - est.quota * LOW_WATER);
    const ordered = [...evictors.values()].sort((a, b) => a.value - b.value);

    for (const evictor of ordered) {
      if (remaining <= 0) break;
      try {
        const freed = await evictor.evict(remaining);
        remaining -= Math.max(0, freed);
      } catch {
        /* a cache that cannot evict is skipped, not fatal */
      }
    }

    const after = await estimateStorage();
    if (import.meta.env.DEV) {
      console.info(
        `[storage] evicted to ${(after.ratio * 100).toFixed(1)}% of quota ` +
          `(was ${(est.ratio * 100).toFixed(1)}%)`,
      );
    }
    return after;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/**
 * True when a write of `bytes` would likely be rejected. Callers use this to
 * skip an optional cache write rather than to block a user action.
 */
export async function hasRoomFor(bytes: number): Promise<boolean> {
  const est = await estimateStorage();
  if (!est.supported) return true; // unknown: attempt the write, handle failure
  return est.usage + bytes < est.quota * HIGH_WATER;
}

/**
 * Ask the browser for persistent storage so the OS does not evict our caches
 * under pressure. Idempotent; resolves false when unsupported or refused.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist || !navigator.storage.persisted) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}