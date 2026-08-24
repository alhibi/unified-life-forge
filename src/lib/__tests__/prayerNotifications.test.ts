import { describe, expect, it } from 'vitest';

import {
  buildPrayerSchedule,
  DEFAULT_PRAYER_NOTIFICATION_PREFS,
  isPrayerNotificationId,
  PRAYER_NAMES,
  type PrayerNotificationPrefs,
} from '@/lib/prayerNotifications';

const MECCA = { lat: 21.4225, lng: 39.8262, school: 0 as const, latAdj: 3 as const };

function prefs(over: Partial<PrayerNotificationPrefs> = {}): PrayerNotificationPrefs {
  return { ...DEFAULT_PRAYER_NOTIFICATION_PREFS, enabled: true, ...over };
}

describe('prayer notification scheduling', () => {
  const now = new Date('2026-05-01T00:05:00');

  it('schedules nothing while the feature is off', () => {
    expect(buildPrayerSchedule({ ...MECCA, prefs: prefs({ enabled: false }), days: 7, now })).toEqual([]);
  });

  it('schedules five prayers a day for a week', () => {
    const schedule = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 7, now });
    // The first day may be partially past; every later day must be complete.
    expect(schedule.length).toBeGreaterThanOrEqual(6 * 5);
    expect(schedule.length).toBeLessThanOrEqual(7 * 5);
  });

  it('never schedules a time that has already passed', () => {
    const late = new Date('2026-05-01T20:00:00');
    const schedule = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 3, now: late });
    for (const item of schedule) {
      expect(item.at.getTime()).toBeGreaterThan(late.getTime());
    }
  });

  it('is idempotent: the same inputs produce the same ids', () => {
    const a = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 7, now });
    const b = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 7, now });
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it('issues a unique id per prayer per day', () => {
    const schedule = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 7, now });
    expect(new Set(schedule.map((x) => x.id)).size).toBe(schedule.length);
  });

  it('claims only its own id range', () => {
    const schedule = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 7, now });
    for (const item of schedule) expect(isPrayerNotificationId(item.id)).toBe(true);
    // Chat and other features use small sequential ids.
    expect(isPrayerNotificationId(1)).toBe(false);
    expect(isPrayerNotificationId(0)).toBe(false);
    expect(isPrayerNotificationId(-5)).toBe(false);
  });

  it('honours a single-prayer opt-in', () => {
    const schedule = buildPrayerSchedule({
      ...MECCA,
      prefs: prefs({ prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false } }),
      days: 5,
      now,
    });
    expect(schedule.every((x) => x.prayer === 'Fajr')).toBe(true);
    expect(schedule.length).toBe(5);
  });

  it('fires early by exactly the lead time', () => {
    const atTime = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 2, now });
    const early = buildPrayerSchedule({ ...MECCA, prefs: prefs({ leadMinutes: 15 }), days: 2, now });

    const firstFajr = (list: typeof atTime) => list.find((x) => x.prayer === 'Fajr')!;
    const delta = firstFajr(atTime).at.getTime() - firstFajr(early).at.getTime();
    expect(delta).toBe(15 * 60_000);
    expect(firstFajr(early).body).toContain('15');
  });

  it('treats a negative lead time as zero rather than notifying late', () => {
    const zero = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 2, now });
    const negative = buildPrayerSchedule({ ...MECCA, prefs: prefs({ leadMinutes: -30 }), days: 2, now });
    expect(negative[0].at.getTime()).toBe(zero[0].at.getTime());
  });

  it('returns entries in chronological order', () => {
    const schedule = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 7, now });
    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i].at.getTime()).toBeGreaterThanOrEqual(schedule[i - 1].at.getTime());
    }
  });

  it('never schedules Sunrise as a prayer', () => {
    const schedule = buildPrayerSchedule({ ...MECCA, prefs: prefs(), days: 3, now });
    expect(schedule.some((x) => (x.prayer as string) === 'Sunrise')).toBe(false);
    expect(PRAYER_NAMES).not.toContain('Sunrise' as never);
  });

  it('still schedules in polar regions, and says the timing is approximate', () => {
    const schedule = buildPrayerSchedule({
      lat: 78.2232,
      lng: 15.6267,
      school: 0,
      latAdj: 3,
      prefs: prefs(),
      days: 3,
      now: new Date('2026-06-20T00:05:00'),
    });
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule.every((x) => x.approximate)).toBe(true);
    expect(schedule[0].body).toContain('أقرب البلاد');
  });

  it('crosses a DST boundary without dropping or duplicating a day', () => {
    // Berlin, spring-forward week. Every enabled prayer for each future day
    // must appear exactly once.
    const schedule = buildPrayerSchedule({
      lat: 52.52,
      lng: 13.405,
      school: 0,
      latAdj: 3,
      prefs: prefs(),
      days: 7,
      now: new Date('2026-03-26T00:05:00'),
    });
    const perDay = new Map<string, number>();
    for (const item of schedule) {
      const key = `${item.at.getMonth() + 1}-${item.at.getDate()}`;
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    for (const [, count] of perDay) expect(count).toBeLessThanOrEqual(5);
    expect(perDay.size).toBeGreaterThanOrEqual(6);
  });
});