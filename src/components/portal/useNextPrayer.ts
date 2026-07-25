/**
 * Next-prayer resolver for the portal's live band.
 *
 * Reuses the shared, de-duplicated `fetchPrayerTimings` cache and the user's
 * own calculation settings from AppContext, so the portal can never disagree
 * with `/now` or the prayer settings screen about when Maghrib is.
 *
 * The hook exposes a *progress* value (elapsed share of the current interval)
 * in addition to the countdown, because the live band renders a ring: a
 * countdown alone gives no sense of where you are inside the window.
 *
 * Ticking is 1 Hz but pauses while the document is hidden — a background tab
 * must not keep waking the main thread for a clock nobody can see.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { fetchPrayerTimings } from '@/hooks/usePrayerTimesCache';
import type { AladhanMethod } from '@/lib/prayerCalculationMethod';

/** The five obligatory prayers, in daily order, with their Arabic names. */
const PRAYER_ORDER = [
  { id: 'Fajr', label: 'الفجر' },
  { id: 'Dhuhr', label: 'الظهر' },
  { id: 'Asr', label: 'العصر' },
  { id: 'Maghrib', label: 'المغرب' },
  { id: 'Isha', label: 'العشاء' },
] as const;

export type PrayerId = (typeof PRAYER_ORDER)[number]['id'];

export interface NextPrayerInfo {
  id: PrayerId;
  label: string;
  /** Wall-clock "HH:MM" of the upcoming prayer, in the device timezone. */
  clock: string;
  /** Milliseconds until the prayer enters. Never negative. */
  remainingMs: number;
  /** 0..1 elapsed share of the window between the previous and next prayer. */
  progress: number;
  /** Arabic relative phrase, e.g. "بعد ٥٤ دقيقة". */
  relative: string;
}

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Render a latin integer with Arabic-Indic digits (display only). */
export function toArabicDigits(n: number): string {
  return String(Math.trunc(n))
    .split('')
    .map((c) => (c >= '0' && c <= '9' ? AR_DIGITS[Number(c)] : c))
    .join('');
}

function parseTiming(raw: string | undefined, base: Date): Date | null {
  if (!raw) return null;
  // Aladhan returns "HH:MM" or "HH:MM (EET)".
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

function relativePhrase(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes === 0) return 'حان الوقت';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `بعد ${toArabicDigits(minutes)} دقيقة`;
  if (minutes === 0) return `بعد ${toArabicDigits(hours)} ساعة`;
  return `بعد ${toArabicDigits(hours)} س ${toArabicDigits(minutes)} د`;
}

export interface UseNextPrayerResult {
  next: NextPrayerInfo | null;
  /** True until the first timings resolve (API or local fallback). */
  loading: boolean;
}

export function useNextPrayer(): UseNextPrayerResult {
  const { prayerMadhab, latitudeAdjMethod, calcMethod } = useApp();
  const { location } = useDeviceLocation();
  const [timings, setTimings] = useState<Record<string, string> | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestedKeyRef = useRef<string>('');

  const school = prayerMadhab === 'hanafi' ? 1 : 0;
  const latAdj = latitudeAdjMethod === 'middle' ? 1 : latitudeAdjMethod === 'seventh' ? 2 : 3;

  useEffect(() => {
    if (!location) return;
    const method = calcMethod === 'auto' || typeof calcMethod !== 'number' ? undefined : (calcMethod as AladhanMethod);
    const key = `${location.lat.toFixed(3)}_${location.lng.toFixed(3)}_${school}_${latAdj}_${method ?? 'auto'}`;
    if (requestedKeyRef.current === key) return;
    requestedKeyRef.current = key;
    let alive = true;
    void fetchPrayerTimings(location.lat, location.lng, school, latAdj, method).then((t) => {
      if (alive && t) setTimings(t);
    });
    return () => {
      alive = false;
    };
  }, [location, school, latAdj, calcMethod]);

  // 1 Hz tick, suspended while the tab is hidden.
  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      id = window.setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const next = useMemo<NextPrayerInfo | null>(() => {
    if (!timings) return null;
    const nowDate = new Date(now);
    interface Slot {
      id: PrayerId;
      label: string;
      at: Date;
    }
    const today: Slot[] = [];
    for (const prayer of PRAYER_ORDER) {
      const at = parseTiming(timings[prayer.id], nowDate);
      if (at) today.push({ id: prayer.id, label: prayer.label, at });
    }
    if (today.length === 0) return null;

    const upcomingIndex = today.findIndex((p) => p.at.getTime() > now);
    // After Isha the next prayer is tomorrow's Fajr — the same clock time is a
    // good approximation (Fajr moves by ≤ ~1 minute per day at any latitude we
    // support) and the timings refresh at midnight anyway.
    const upcoming =
      upcomingIndex === -1
        ? (() => {
            const fajr = today[0];
            const at = new Date(fajr.at);
            at.setDate(at.getDate() + 1);
            return { ...fajr, at };
          })()
        : today[upcomingIndex];

    const previous =
      upcomingIndex === -1
        ? today[today.length - 1]
        : upcomingIndex === 0
          ? (() => {
              const isha = today[today.length - 1];
              const at = new Date(isha.at);
              at.setDate(at.getDate() - 1);
              return { ...isha, at };
            })()
          : today[upcomingIndex - 1];

    const windowMs = upcoming.at.getTime() - previous.at.getTime();
    const elapsedMs = now - previous.at.getTime();
    const progress = windowMs > 0 ? Math.min(1, Math.max(0, elapsedMs / windowMs)) : 0;
    const remainingMs = Math.max(0, upcoming.at.getTime() - now);

    return {
      id: upcoming.id,
      label: upcoming.label,
      clock: `${String(upcoming.at.getHours()).padStart(2, '0')}:${String(upcoming.at.getMinutes()).padStart(2, '0')}`,
      remainingMs,
      progress,
      relative: relativePhrase(remainingMs),
    };
  }, [timings, now]);

  return { next, loading: timings === null };
}
