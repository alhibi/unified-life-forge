/**
 * The Islamic day boundary.
 *
 * The Islamic day begins at Maghrib, not at midnight. Anything that asks "what
 * is today's content?" — the day's Adhkar, the Hijri date on the header, which
 * day of Ramadan it is, whether tonight is a Laylat al-Qadr candidate — is
 * wrong for the ~4–6 hours between sunset and midnight if it uses the calendar
 * day. On the 29th of Sha'ban that error is not cosmetic: it is the difference
 * between fasting tomorrow and not.
 *
 * This module is deliberately pure and clock-injected so the boundary can be
 * tested at sunset rather than assumed.
 */

/** `HH:MM` as produced by `computeLocalTimings` / the Aladhan API. */
export type ClockTime = string;

export interface IslamicDayInfo {
  /**
   * The Gregorian date whose *daylight* portion belongs to the current Islamic
   * day. After Maghrib this is tomorrow's calendar date, because the Islamic
   * day that just began will run through tomorrow's daylight.
   */
  gregorianAnchor: Date;
  /** True between Maghrib and local midnight — the "extra" evening hours. */
  isAfterMaghrib: boolean;
  /** Maghrib for the calendar day of `now`, resolved to a real instant. */
  maghribAt: Date;
}

function parseClock(time: ClockTime): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

/** Same calendar day as `ref`, at `HH:MM` local time. */
export function atLocalTime(ref: Date, time: ClockTime): Date | null {
  const parsed = parseClock(time);
  if (!parsed) return null;
  const d = new Date(ref);
  d.setHours(parsed.h, parsed.m, 0, 0);
  return d;
}

/**
 * Resolves which Islamic day is current.
 *
 * `maghrib` is the Maghrib time for the calendar day of `now`. When it cannot
 * be parsed (no timings loaded yet, or a latitude fallback left it blank) the
 * function degrades to calendar-day behaviour rather than guessing a sunset —
 * showing the wrong day is bad, inventing a sunset is worse.
 */
export function resolveIslamicDay(now: Date, maghrib: ClockTime | null | undefined): IslamicDayInfo {
  const maghribAt = maghrib ? atLocalTime(now, maghrib) : null;
  if (!maghribAt) {
    return { gregorianAnchor: startOfDay(now), isAfterMaghrib: false, maghribAt: startOfDay(now) };
  }

  const isAfterMaghrib = now.getTime() >= maghribAt.getTime();
  const anchor = startOfDay(now);
  if (isAfterMaghrib) anchor.setDate(anchor.getDate() + 1);
  return { gregorianAnchor: anchor, isAfterMaghrib, maghribAt };
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Stable key for "the current Islamic day", for cache keys and for deciding
 * whether a daily item (dhikr of the day, streak tick) has already been shown.
 *
 * Uses local calendar parts rather than `toISOString`, which would shift the
 * key by a day for anyone east of UTC.
 */
export function islamicDayKey(now: Date, maghrib: ClockTime | null | undefined): string {
  const { gregorianAnchor } = resolveIslamicDay(now, maghrib);
  const y = gregorianAnchor.getFullYear();
  const m = String(gregorianAnchor.getMonth() + 1).padStart(2, '0');
  const d = String(gregorianAnchor.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Hijri date for the current Islamic day, advanced past Maghrib.
 *
 * `Intl` with the `islamic-umalqura` calendar gives the civil Umm al-Qura date
 * for a Gregorian day; feeding it the post-Maghrib anchor is what makes it
 * agree with the sky.
 */
export function hijriPartsForIslamicDay(
  now: Date,
  maghrib: ClockTime | null | undefined,
  locale = 'ar-SA-u-ca-islamic-umalqura',
): { day: string; month: string; year: string } {
  const { gregorianAnchor } = resolveIslamicDay(now, maghrib);
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(gregorianAnchor);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { day: pick('day'), month: pick('month'), year: pick('year') };
}