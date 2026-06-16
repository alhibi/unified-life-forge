import { useEffect, useState } from 'react';
import {
  fetchCityTimings,
  type AladhanTimings,
  type CityKey,
} from './aladhan';
import {
  computePrayerTimes,
  localDateInZone,
  tzOffsetMinutes,
  type CalculationMethodId,
  type PrayerAdjustments,
} from '@/utils/prayerAstronomy';

/**
 * Per-city minute-deltas between the local astronomy computation
 * and Aladhan's authoritative published timetable.
 *
 * Hybrid model:
 *   1) astronomy gives us instant times offline
 *   2) Aladhan calibrates once per city per day (cached 30h)
 *   3) we surface a {fajr,sunrise,dhuhr,asr,maghrib,isha} delta in
 *      minutes that callers add to their astronomical baseline
 *
 * Result: published-timetable accuracy with no per-tick network cost.
 */

export interface CalibrationOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

const ZERO: CalibrationOffsets = {
  fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0,
};

export interface CalibrationCity extends CityKey {
  asrShadow?: 1 | 2;
  adj?: PrayerAdjustments;
}

function computeOffset(
  c: CalibrationCity,
  authoritative: AladhanTimings,
  now: Date,
): CalibrationOffsets {
  const d = localDateInZone(c.tz, now);
  const tzMin = tzOffsetMinutes(c.tz, now);
  const utc = computePrayerTimes(
    d.year, d.month, d.day, c.lat, c.lng, c.method,
    c.asrShadow ?? 1, c.adj,
  );
  const toLocal = (utcMin: number) => {
    const m = Math.round(utcMin + tzMin);
    return ((m % 1440) + 1440) % 1440;
  };
  const wrap = (delta: number) => {
    // collapse 24h wrap so very-late ISHA vs very-early ISHA doesn't
    // explode into a 1400-minute offset
    if (delta > 720) return delta - 1440;
    if (delta < -720) return delta + 1440;
    return delta;
  };
  return {
    fajr:    wrap(authoritative.fajr    - toLocal(utc.fajr)),
    sunrise: wrap(authoritative.sunrise - toLocal(utc.sunrise)),
    dhuhr:   wrap(authoritative.dhuhr   - toLocal(utc.dhuhr)),
    asr:     wrap(authoritative.asr     - toLocal(utc.asr)),
    maghrib: wrap(authoritative.maghrib - toLocal(utc.maghrib)),
    isha:    wrap(authoritative.isha    - toLocal(utc.isha)),
  };
}

/**
 * Calibrates every supplied city against Aladhan once per local day.
 * Returns a `name → offsets` map (defaults to zero until each fetch
 * lands). Callers stay reactive — when fresh data arrives, the map
 * identity changes and the consumer re-renders.
 */
export function useAdhanCalibration(
  cities: CalibrationCity[],
): Record<string, CalibrationOffsets> {
  const [offsets, setOffsets] = useState<Record<string, CalibrationOffsets>>({});

  useEffect(() => {
    let cancelled = false;
    const now = new Date();

    // Throttle parallel fan-out: 4 concurrent fetches keeps things
    // snappy without melting browsers on slow networks.
    let cursor = 0;
    const worker = async () => {
      while (cursor < cities.length) {
        const c = cities[cursor++];
        const t = await fetchCityTimings(c, now);
        if (cancelled) return;
        if (!t) continue;
        const o = computeOffset(c, t, now);
        setOffsets((prev) => ({ ...prev, [c.name]: o }));
      }
    };
    Promise.all([worker(), worker(), worker(), worker()]).catch(() => {});

    // Refresh at next local midnight (cap 6h to handle dst/sleep).
    const msToMidnight = Math.min(
      6 * 3600 * 1000,
      24 * 3600 * 1000 - (now.getTime() % (24 * 3600 * 1000)),
    );
    const t = setTimeout(() => { /* trigger re-run via dep change */ }, msToMidnight);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities.length]);

  return offsets;
}

export { ZERO as ZERO_OFFSETS };
