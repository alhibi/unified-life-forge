import { DAILY_WORTER, DAILY_WORTER_COUNT } from './woerter';
import { DAILY_SPRICHWOERTER, DAILY_SPRICHWOERTER_COUNT } from './sprichwoerter';
import { DAILY_SAETZE, DAILY_SAETZE_COUNT } from './saetze';
import { DAILY_KULTURPERLEN, DAILY_KULTURPERLEN_COUNT } from './kulturperlen';
import type { DailyBundle } from './types';

/**
 * Deterministic daily selection.
 *
 * Same date → same content. No notifications, no streaks.
 * The user opens the Club and the content is there, like a cafe chalkboard.
 *
 * Implementation: stable hash of YYYY-MM-DD → seed → modulo into each pool.
 * Each pool uses a slightly different salt so Wort and Sprichwort of the day
 * don't always point to the same ordinal.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2024, 0, 1); // 2024-01-01 as day-0 reference

/** Days elapsed since the reference epoch. */
export function daysSinceEpoch(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((utc - EPOCH) / MS_PER_DAY);
}

/** Stable, well-mixed 32-bit hash (FNV-1a) — same input → same output. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // 32-bit FNV prime; coerce via Math.imul for safe 32-bit math.
    hash = Math.imul(hash, 0x01000193);
  }
  // Unsigned 32-bit
  return hash >>> 0;
}

/** Pick the pool index for a given date + salt. */
function pickIndex(date: Date, poolSize: number, salt: string): number {
  const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${salt}`;
  return fnv1a(dayKey) % poolSize;
}

/** Get the day-bundle for a given date (or today). */
export function getDailyBundle(date: Date = new Date()): DailyBundle {
  return {
    wort: DAILY_WORTER[pickIndex(date, DAILY_WORTER_COUNT, 'wort')],
    sprichwort: DAILY_SPRICHWOERTER[pickIndex(date, DAILY_SPRICHWOERTER_COUNT, 'sprichwort')],
    satz: DAILY_SAETZE[pickIndex(date, DAILY_SAETZE_COUNT, 'satz')],
    kulturperle: DAILY_KULTURPERLEN[pickIndex(date, DAILY_KULTURPERLEN_COUNT, 'kulturperle')],
  };
}

/** Get just the Wort des Tages (compatibility — already used in useDictionaryStore). */
export function getWortDesTages(date: Date = new Date()): typeof DAILY_WORTER[number] {
  return DAILY_WORTER[pickIndex(date, DAILY_WORTER_COUNT, 'wort')];
}

/** ISO-like short date key for diagnostic use (YYYY-MM-DD). */
export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}