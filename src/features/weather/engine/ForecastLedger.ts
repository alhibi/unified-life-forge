// ============================================================================
// ForecastLedger — 24-hour rolling window of every forecast each source emitted
// for a given location cell. Acts as the buffer that the verification layer
// reads from once a forecast becomes "due" (i.e. the matching observation
// timestamp has passed).
//
// DESIGN INVARIANTS
//   • Keyed by (location-cell, source) → an array of entries with an expiry.
//     24 hours after the entry's valid-time the entry is useless, so a
//     background pruner drops it. Newer entries always survive.
//   • Persisted to IndexedDB so the layer survives reloads — the whole point
//     of verification is to use data we recorded hours ago.
//   • Tolerates environments where IndexedDB is unavailable (SSR, private
//     mode): every operation resolves to a no-op. Verification then becomes
//     best-effort without crashing the rest of the pipeline.
//   • Read paths are O(n) over a window of ≤ 24 entries per cell/source — no
//     indexing needed at this size.
// ============================================================================

import type { SourceId } from '../types/SourceRegistry';

const DB_NAME = 'weather-engine';
const DB_VERSION = 2;
const STORE = 'forecast-ledger';
const WINDOW_HOURS = 24;
const MAX_CELLS = 32;       // hard cap on distinct (lat, lng) cells in storage
const MAX_PER_CELL = 64;    // hard cap on entries per cell

/**
 * One per-source forecast at one valid-time. The forecast we want to verify
 * later. Fields are intentionally minimal: enough to score the source's
 * prediction accuracy once the observation arrives.
 */
export interface LedgerEntry {
  /** Hour-aligned UTC timestamp the forecast was *for* (valid-time). */
  valid_unix: number;
  /** Hour-aligned UTC timestamp the forecast was *issued* (issue-time). */
  issued_unix: number;
  /** Lead-time at issue: valid_unix − issued_unix, in hours. */
  lead_hours: number;
  temperature_c: number | null;
  humidity_percent: number | null;
  pressure_hpa: number | null;
  wind_kph: number | null;
  cloud_cover_percent: number | null;
  precip_mm: number | null;
}

interface Wrapper {
  key: string;       // `cell|source|valid_unix`
  cell: string;
  sourceId: SourceId;
  entry: LedgerEntry;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'key' });
          os.createIndex('by_cell', 'cell', { unique: false });
        }
        // v2 stores are owned by other modules — opening the existing DB just
        // ensures we don't accidentally bump their version.
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** ~25 km grid cell — matches ConsensusSkillTracker so locations align. */
export function ledgerCellKey(lat: number, lng: number): string {
  return `${(Math.round(lat / 0.25) * 0.25).toFixed(2)},${(Math.round(lng / 0.25) * 0.25).toFixed(2)}`;
}

function entryKey(cell: string, sourceId: SourceId, validUnix: number): string {
  return `${cell}|${sourceId}|${validUnix}`;
}

const HOUR_MS = 3_600_000;

/**
 * Record one forecast entry. Called once per (source, hour) per pipeline run.
 * Silently no-ops if the value is older than the rolling window or if IDB is
 * unavailable — verification is a best-effort layer, never a hard dependency.
 */
export async function recordLedgerEntry(
  lat: number,
  lng: number,
  sourceId: SourceId,
  entry: Omit<LedgerEntry, 'lead_hours'> & { lead_hours?: number },
): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const cell = ledgerCellKey(lat, lng);
  // Window guard: refuse entries whose valid-time is already outside the
  // 24-hour verification window.
  const now = Date.now();
  if (entry.valid_unix < now - WINDOW_HOURS * HOUR_MS) return;
  if (entry.valid_unix > now + WINDOW_HOURS * HOUR_MS) return;

  const lead = entry.lead_hours ?? Math.max(0, Math.round((entry.valid_unix - entry.issued_unix) / HOUR_MS));
  const full: LedgerEntry = { ...entry, lead_hours: lead };
  const wrapper: Wrapper = { key: entryKey(cell, sourceId, entry.valid_unix), cell, sourceId, entry: full };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(wrapper);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Read every still-valid entry for a (cell, source). Used by verification. */
export async function readLedgerEntries(
  lat: number,
  lng: number,
  sourceId: SourceId,
): Promise<LedgerEntry[]> {
  const db = await openDB();
  if (!db) return [];
  const cell = ledgerCellKey(lat, lng);
  const out: LedgerEntry[] = [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('by_cell');
      const req = idx.getAll(IDBKeyRange.only(cell));
      req.onsuccess = () => {
        const wrappers = (req.result as Wrapper[] | undefined) ?? [];
        const cutoff = Date.now() - WINDOW_HOURS * HOUR_MS;
        for (const w of wrappers) {
          if (w.sourceId !== sourceId) continue;
          if (w.entry.valid_unix < cutoff) continue;
          out.push(w.entry);
        }
        resolve(out);
      };
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

/**
 * Drop expired entries and evict overflow cells. Runs lazily on each write so
 * we never accumulate garbage: cheap because the window is bounded.
 */
export async function pruneLedger(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const wrappers = (req.result as Wrapper[] | undefined) ?? [];
        const cutoff = Date.now() - WINDOW_HOURS * HOUR_MS;
        const byCell = new Map<string, Wrapper[]>();
        for (const w of wrappers) {
          if (w.entry.valid_unix < cutoff) {
            store.delete(w.key);
            continue;
          }
          const list = byCell.get(w.cell) ?? [];
          list.push(w);
          byCell.set(w.cell, list);
        }
        // Cap distinct cells: drop the entire cell whose latest entry is oldest.
        if (byCell.size > MAX_CELLS) {
          const ordered = Array.from(byCell.entries()).sort(([, a], [, b]) => {
            const lastA = Math.max(...a.map((w) => w.entry.valid_unix));
            const lastB = Math.max(...b.map((w) => w.entry.valid_unix));
            return lastA - lastB;
          });
          for (const [cell, list] of ordered.slice(MAX_CELLS)) {
            for (const w of list) store.delete(w.key);
          }
        }
        // Cap per-cell: keep the newest entries.
        for (const [, list] of byCell) {
          if (list.length > MAX_PER_CELL) {
            const sorted = [...list].sort((a, b) => b.entry.valid_unix - a.entry.valid_unix);
            for (const w of sorted.slice(MAX_PER_CELL)) store.delete(w.key);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Test seam — wipe the ledger. Used by vitest only. */
export async function clearLedger(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const __ledgerInternals = { DB_NAME, DB_VERSION, STORE, WINDOW_HOURS };