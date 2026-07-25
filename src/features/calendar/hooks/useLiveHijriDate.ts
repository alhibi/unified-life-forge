import { useEffect, useState } from 'react';

import {
  applyHijriOffset,
  fromHijri,
  getHijriDayOffset,
  type HijriDate,
  setHijriDayOffset,
  toHijri,
} from '@/features/calendar/data/islamicOccasions';

/**
 * Source of the active Hijri date.
 * - 'umm-al-qura'  → offset synced from the Saudi Umm al-Qura calendar (via Aladhan).
 * - 'tabular'      → fallback to the tabular Kuwaiti algorithm (offline-safe).
 */
export type HijriSource = 'umm-al-qura' | 'tabular';

const OFFSET_CACHE_KEY = 'smarthub.hijri.umm-al-qura.offset.v1';

interface CachedOffset {
  /** ISO yyyy-mm-dd the offset was computed for. */
  date: string;
  /** Saudi-tabular delta in whole days (can be negative). */
  offset: number;
  source: HijriSource;
}

function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readCache(): CachedOffset | null {
  try {
    const raw = localStorage.getItem(OFFSET_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOffset;
    if (typeof parsed?.offset !== 'number' || typeof parsed?.date !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: CachedOffset) {
  try {
    localStorage.setItem(OFFSET_CACHE_KEY, JSON.stringify(c));
  } catch {
    // localStorage may be unavailable (private mode, SSR) — non-fatal.
  }
}

/**
 * Fetch today's Saudi Umm al-Qura date from Aladhan and compute the day-offset
 * relative to the local tabular algorithm. Returns null on failure.
 */
async function fetchUmmAlQuraOffset(now: Date, signal?: AbortSignal): Promise<number | null> {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  // calendarMethod=UAQ  → Umm al-Qura (Saudi Arabia, official)
  const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}?calendarMethod=UAQ`;
  try {
    const res = await fetch(url, { signal, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const h = json?.data?.hijri;
    if (!h?.day || !h?.month?.number || !h?.year) return null;
    const saudiDay = Number(h.day);
    const saudiMonth = Number(h.month.number);
    const saudiYear = Number(h.year);
    const saudiAsGreg = fromHijri(saudiYear, saudiMonth, saudiDay);
    // offset = days(saudi - tabular) — applied to `new Date()` before tabular conversion
    const tabularGreg = new Date(now);
    tabularGreg.setHours(0, 0, 0, 0);
    saudiAsGreg.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (saudiAsGreg.getTime() - tabularGreg.getTime()) / 86_400_000,
    );
    return diff;
  } catch {
    return null;
  }
}

/** ms until the next local midnight (with a small 1s cushion). */
function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

export interface LiveHijri {
  /** Today's Hijri date, reflecting the active offset. */
  hijri: HijriDate;
  /** ISO yyyy-mm-dd of the Gregorian day this snapshot belongs to. */
  todayISO: string;
  /** Source backing the offset. */
  source: HijriSource;
  /** Day-offset currently applied (+/- days). */
  offset: number;
}

/**
 * Reactive hook returning today's Hijri date. Re-renders:
 *  - When the Saudi-source offset is loaded/refreshed.
 *  - At local midnight (no page reload required).
 *  - When the tab becomes visible/focused again (handles long-suspended tabs).
 *
 * On first run it applies any cached offset synchronously, then tries to
 * refresh from Aladhan in the background once per local day.
 */
export function useLiveHijriDate(): LiveHijri {
  // Apply cached offset before the first render so initial paint is correct.
  const initial = (() => {
    const cached = readCache();
    const iso = todayISO();
    if (cached && cached.date === iso) {
      setHijriDayOffset(cached.offset);
    }
    return {
      hijri: toHijri(applyHijriOffset(new Date())),
      todayISO: iso,
      source: cached?.source ?? 'tabular',
      offset: getHijriDayOffset(),
    } satisfies LiveHijri;
  });

  const [state, setState] = useState<LiveHijri>(initial);

  // Recompute snapshot from current global offset.
  const refresh = (source?: HijriSource) => {
    const now = new Date();
    setState({
      hijri: toHijri(applyHijriOffset(now)),
      todayISO: todayISO(now),
      source: source ?? readCache()?.source ?? 'tabular',
      offset: getHijriDayOffset(),
    });
  };

  // Schedule midnight tick.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        refresh();
        arm();
      }, msUntilMidnight());
    };
    arm();
    return () => clearTimeout(timer);
     
  }, []);

  // Re-check on visibility / focus (handles laptop sleep, tab switch).
  useEffect(() => {
    const onWake = () => {
      const iso = todayISO();
      if (iso !== state.todayISO) refresh();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [state.todayISO]);

  // Sync Umm al-Qura offset from Aladhan (once per local day).
  useEffect(() => {
    const cached = readCache();
    const iso = todayISO();
    if (cached?.date === iso && cached.source === 'umm-al-qura') return;

    const ctrl = new AbortController();
    fetchUmmAlQuraOffset(new Date(), ctrl.signal).then((offset) => {
      if (offset == null) return;
      setHijriDayOffset(offset);
      writeCache({ date: iso, offset, source: 'umm-al-qura' });
      refresh('umm-al-qura');
    });
    return () => ctrl.abort();
     
  }, []);

  return state;
}