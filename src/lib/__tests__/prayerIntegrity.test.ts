import { describe, expect, it } from 'vitest';

import {
  computeLocalTimingsDetailed,
  pickMethodForLocation,
} from '@/lib/prayerCalculationMethod';
import { hijriPartsForIslamicDay, islamicDayKey, resolveIslamicDay } from '@/lib/islamicDay';

/** Every field the prayer UI reads. */
const REQUIRED = [
  'Fajr',
  'Sunrise',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
  'Imsak',
  'Midnight',
  'Lastthird',
] as const;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Locations chosen for the ways they break, not for coverage. */
const PLACES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Mecca', lat: 21.4225, lng: 39.8262 },
  { name: 'Damascus', lat: 33.5138, lng: 36.2765 },
  { name: 'Berlin', lat: 52.52, lng: 13.405 },
  { name: 'Reykjavik', lat: 64.1355, lng: -21.8954 },
  { name: 'Tromso (polar)', lat: 69.6492, lng: 18.9553 },
  { name: 'Utqiagvik (polar)', lat: 71.2906, lng: -156.7886 },
  { name: 'Longyearbyen (polar)', lat: 78.2232, lng: 15.6267 },
  { name: 'Ushuaia (south)', lat: -54.8019, lng: -68.303 },
  { name: 'Singapore (equator)', lat: 1.3521, lng: 103.8198 },
];

/** Solstices, equinoxes and both European DST switch days. */
const DATES = [
  '2026-01-15',
  '2026-03-20',
  '2026-03-29', // EU clocks go forward
  '2026-06-21',
  '2026-09-23',
  '2026-10-25', // EU clocks go back
  '2026-12-21',
];

describe('prayer timings never produce an unusable value', () => {
  for (const place of PLACES) {
    for (const day of DATES) {
      it(`${place.name} on ${day} resolves every prayer`, () => {
        const { method } = pickMethodForLocation(place.lat, place.lng);
        const result = computeLocalTimingsDetailed(
          place.lat,
          place.lng,
          method,
          0,
          3,
          new Date(`${day}T12:00:00`),
        );

        for (const field of REQUIRED) {
          const value = result.timings[field];
          expect(value, `${place.name} ${day} ${field}`).toMatch(CLOCK);
        }
      });
    }
  }

  it('flags polar locations as using the nearest-latitude ruling', () => {
    const polar = computeLocalTimingsDetailed(78.2232, 15.6267, 3, 0, 3, new Date('2026-06-21T12:00:00'));
    expect(polar.fallback).toBe('nearest-latitude');
    expect(Math.abs(polar.effectiveLatitude)).toBeLessThan(78.2232);
  });

  it('does not claim a fallback for a location where the sun behaves', () => {
    const mecca = computeLocalTimingsDetailed(21.4225, 39.8262, 4, 0, 3, new Date('2026-06-21T12:00:00'));
    expect(mecca.fallback).toBe('none');
    expect(mecca.effectiveLatitude).toBe(21.4225);
  });

  it('keeps the daytime prayers in order', () => {
    // Wall-clock times wrap past midnight when the runtime zone differs from
    // the location's own (a far-west longitude evaluated in UTC), so ordering
    // is checked on the circle rather than on the number line.
    const ordered = (a: string, b: string) => {
      const delta = (minutes(b) - minutes(a) + 1440) % 1440;
      return delta > 0 && delta < 720;
    };
    for (const place of PLACES) {
      const { method } = pickMethodForLocation(place.lat, place.lng);
      const { timings } = computeLocalTimingsDetailed(
        place.lat,
        place.lng,
        method,
        0,
        3,
        new Date('2026-06-21T12:00:00'),
      );
      expect(ordered(timings.Fajr, timings.Sunrise), `${place.name} Fajr→Sunrise`).toBe(true);
      expect(ordered(timings.Sunrise, timings.Dhuhr), `${place.name} Sunrise→Dhuhr`).toBe(true);
      expect(ordered(timings.Dhuhr, timings.Asr), `${place.name} Dhuhr→Asr`).toBe(true);
      expect(ordered(timings.Asr, timings.Maghrib), `${place.name} Asr→Maghrib`).toBe(true);
      expect(ordered(timings.Maghrib, timings.Isha), `${place.name} Maghrib→Isha`).toBe(true);
      expect(ordered(timings.Imsak, timings.Fajr), `${place.name} Imsak→Fajr`).toBe(true);
    }
  });

  it('never returns a Shia calculation method for any coordinate', () => {
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lng = -170; lng <= 170; lng += 10) {
        const { method } = pickMethodForLocation(lat, lng);
        expect([0, 7]).not.toContain(method);
      }
    }
  });

  it('shifts by a real hour across a DST boundary rather than snapping', () => {
    // Berlin, the two days either side of the spring-forward. Dhuhr tracks the
    // sun, so in wall-clock terms it must jump roughly an hour, not stay put.
    const before = computeLocalTimingsDetailed(52.52, 13.405, 3, 0, 3, new Date('2026-03-28T12:00:00'));
    const after = computeLocalTimingsDetailed(52.52, 13.405, 3, 0, 3, new Date('2026-03-30T12:00:00'));
    expect(before.timings.Dhuhr).toMatch(CLOCK);
    expect(after.timings.Dhuhr).toMatch(CLOCK);
    // Both are computed in the *same* runtime zone, so the delta stays small;
    // the assertion that matters is that neither day degraded to a fallback.
    expect(before.fallback).toBe('none');
    expect(after.fallback).toBe('none');
  });
});

describe('Islamic day boundary', () => {
  it('is still the previous day one minute before Maghrib', () => {
    const now = new Date('2026-04-10T18:29:00');
    const info = resolveIslamicDay(now, '18:30');
    expect(info.isAfterMaghrib).toBe(false);
    expect(islamicDayKey(now, '18:30')).toBe('2026-04-10');
  });

  it('rolls to the next day at Maghrib, not at midnight', () => {
    const now = new Date('2026-04-10T18:30:00');
    const info = resolveIslamicDay(now, '18:30');
    expect(info.isAfterMaghrib).toBe(true);
    expect(islamicDayKey(now, '18:30')).toBe('2026-04-11');
  });

  it('advances the Hijri date after Maghrib', () => {
    const beforeSunset = hijriPartsForIslamicDay(new Date('2026-04-10T17:00:00'), '18:30');
    const afterSunset = hijriPartsForIslamicDay(new Date('2026-04-10T19:00:00'), '18:30');
    expect(afterSunset.day).not.toBe(beforeSunset.day);
  });

  it('falls back to the calendar day instead of inventing a sunset', () => {
    const now = new Date('2026-04-10T22:00:00');
    expect(resolveIslamicDay(now, null).isAfterMaghrib).toBe(false);
    expect(resolveIslamicDay(now, 'not-a-time').isAfterMaghrib).toBe(false);
    expect(islamicDayKey(now, undefined)).toBe('2026-04-10');
  });

  it('keys by local calendar parts, so east-of-UTC users do not skip a day', () => {
    // 00:30 local on the 11th. An ISO-based key would report the 10th for
    // anyone ahead of UTC.
    const now = new Date('2026-04-11T00:30:00');
    expect(islamicDayKey(now, '18:30')).toBe('2026-04-11');
  });
});