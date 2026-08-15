/**
 * Prayer-time notifications that do not depend on the network at the moment
 * they must fire.
 *
 * A push-based reminder is the wrong mechanism for this: it needs the device
 * online, the service worker alive, and the server awake at the exact minute of
 * Adhan. A missed Fajr notification is not a degraded feature — it is the
 * user missing the prayer, and it cannot be made up afterwards.
 *
 * So the schedule is computed *locally* from `adhan.js`, days in advance, and
 * handed to the OS alarm scheduler. Once handed over, it fires with the app
 * killed, in airplane mode, and with no backend at all.
 *
 * The scheduling maths lives in `buildPrayerSchedule`, which is pure and
 * tested. The plugin call is a thin, failure-tolerant wrapper around it.
 */

import { computeLocalTimingsDetailed, pickMethodForLocation } from '@/lib/prayerCalculationMethod';
import { atLocalTime } from '@/lib/islamicDay';
import { isNative } from '@/lib/native';
import { captureError } from '@/lib/telemetry';

/** The five obligatory prayers. Sunrise is not a prayer and is never notified. */
export const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];

/** Arabic titles, matching the widget. */
export const PRAYER_TITLES_AR: Record<PrayerName, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

export interface PrayerNotificationPrefs {
  /** Master switch. */
  enabled: boolean;
  /** Per-prayer opt-in. A user who only wants Fajr should get only Fajr. */
  prayers: Record<PrayerName, boolean>;
  /**
   * Minutes *before* the prayer to fire. 0 = at the time itself.
   * Negative values are clamped to 0 — a reminder after the fact is noise.
   */
  leadMinutes: number;
}

export const DEFAULT_PRAYER_NOTIFICATION_PREFS: PrayerNotificationPrefs = {
  enabled: false,
  prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  leadMinutes: 0,
};

export interface ScheduledPrayer {
  /**
   * Deterministic id derived from the date and prayer, so re-running the sync
   * replaces entries instead of stacking duplicates. Android/iOS both key
   * pending notifications by id, which makes idempotence free — but only if
   * the id is a function of *what* is scheduled, never of when it was built.
   */
  id: number;
  prayer: PrayerName;
  at: Date;
  title: string;
  body: string;
  /** True when the timings came from a latitude fallback, so the copy can say so. */
  approximate: boolean;
}

/** ids stay inside the 32-bit range Android requires. */
function notificationId(at: Date, prayer: PrayerName): number {
  const day =
    at.getFullYear() * 10000 + (at.getMonth() + 1) * 100 + at.getDate();
  const index = PRAYER_NAMES.indexOf(prayer);
  // day is at most 99991231 → ×10 overflows 32 bits, so fold the year.
  const folded = (day % 1_000_000) * 10 + index;
  return folded;
}

export interface BuildScheduleInput {
  lat: number;
  lng: number;
  /** Aladhan school: 0 = Shafi, 1 = Hanafi. */
  school: 0 | 1;
  /** High-latitude rule. */
  latAdj: 1 | 2 | 3;
  prefs: PrayerNotificationPrefs;
  /** How many days ahead to schedule. */
  days: number;
  now: Date;
}

/**
 * Builds the full list of notifications to hand to the OS.
 *
 * Rules that matter:
 *  - never schedule a time that has already passed (the OS would fire it
 *    immediately, which reads as a bug and, for Fajr, as a false alarm),
 *  - one entry per enabled prayer per day, in chronological order,
 *  - a prayer whose timing could not be resolved is skipped rather than
 *    guessed.
 */
export function buildPrayerSchedule(input: BuildScheduleInput): ScheduledPrayer[] {
  const { lat, lng, school, latAdj, prefs, days, now } = input;
  if (!prefs.enabled) return [];

  const lead = Math.max(0, Math.round(prefs.leadMinutes || 0));
  const { method } = pickMethodForLocation(lat, lng);
  const out: ScheduledPrayer[] = [];

  for (let offset = 0; offset < Math.max(1, days); offset += 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0); // midday anchor: immune to DST edges
    date.setDate(date.getDate() + offset);

    const { timings, fallback } = computeLocalTimingsDetailed(
      lat,
      lng,
      method,
      school,
      latAdj,
      date,
    );

    for (const prayer of PRAYER_NAMES) {
      if (!prefs.prayers[prayer]) continue;

      const clock = timings[prayer];
      const base = clock ? atLocalTime(date, clock) : null;
      if (!base) continue;

      const at = new Date(base.getTime() - lead * 60_000);
      if (at.getTime() <= now.getTime()) continue;

      const title = PRAYER_TITLES_AR[prayer];
      const body =
        lead > 0
          ? `بعد ${lead} دقيقة — ${clock}`
          : `حان وقت الصلاة — ${clock}`;

      out.push({
        id: notificationId(at, prayer),
        prayer,
        at,
        title,
        body: fallback === 'nearest-latitude' ? `${body} (توقيت أقرب البلاد)` : body,
        approximate: fallback !== 'none',
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/* ── Native plumbing ─────────────────────────────────────────────────── */

/**
 * Seven days is the balance point: long enough that a user who does not open
 * the app for a week still gets called to prayer, short enough to stay well
 * inside iOS's 64-pending-notification ceiling (7 × 5 = 35).
 */
export const SCHEDULE_DAYS = 7;

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications')['LocalNotifications'];

async function plugin(): Promise<LocalNotificationsPlugin | null> {
  if (!isNative()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

/** Asks once. Returns false when the user declined — never re-prompts in a loop. */
export async function requestPrayerNotificationPermission(): Promise<boolean> {
  const api = await plugin();
  if (!api) return false;
  try {
    const current = await api.checkPermissions();
    if (current.display === 'granted') return true;
    if (current.display === 'denied') return false;
    const asked = await api.requestPermissions();
    return asked.display === 'granted';
  } catch (err) {
    captureError(err, 'Manual', { area: 'prayer-notifications', step: 'permission' });
    return false;
  }
}

export interface SyncResult {
  scheduled: number;
  /** Why nothing was scheduled, when that is the outcome. */
  reason?: 'not-native' | 'no-permission' | 'disabled' | 'error';
}

/**
 * Reconciles the OS schedule with the user's preferences.
 *
 * Cancels every pending prayer notification first. Cancelling before
 * scheduling — rather than diffing — is deliberate: a diff has to be correct
 * about DST shifts, location changes and preference edits simultaneously, and
 * being wrong means either a duplicate Adhan or a silent miss. A full replace
 * of 35 alarms is cheap and cannot drift.
 */
export async function syncPrayerNotifications(
  input: Omit<BuildScheduleInput, 'days' | 'now'> & { days?: number; now?: Date },
): Promise<SyncResult> {
  const api = await plugin();
  if (!api) return { scheduled: 0, reason: 'not-native' };

  const granted = await requestPrayerNotificationPermission();
  if (!granted) return { scheduled: 0, reason: 'no-permission' };

  try {
    const pending = await api.getPending();
    const ours = pending.notifications.filter((n) => isPrayerNotificationId(n.id));
    if (ours.length) await api.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

    const schedule = buildPrayerSchedule({
      ...input,
      days: input.days ?? SCHEDULE_DAYS,
      now: input.now ?? new Date(),
    });
    if (!schedule.length) return { scheduled: 0, reason: input.prefs.enabled ? undefined : 'disabled' };

    await api.schedule({
      notifications: schedule.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        schedule: {
          at: item.at,
          // The alarm must survive Doze on Android; without this the OS is
          // free to defer it into the next maintenance window, which for Fajr
          // can mean an hour late.
          allowWhileIdle: true,
        },
        smallIcon: 'ic_stat_icon_config_sample',
        group: 'prayer-times',
        extra: { prayer: item.prayer, approximate: item.approximate },
      })),
    });

    return { scheduled: schedule.length };
  } catch (err) {
    captureError(err, 'Manual', { area: 'prayer-notifications', step: 'schedule' });
    return { scheduled: 0, reason: 'error' };
  }
}

/**
 * Prayer ids are `DDDDDDp` where the last digit is the prayer index (0–4) and
 * the rest is a folded calendar day, so they never collide with the chat
 * notification range.
 */
export function isPrayerNotificationId(id: number): boolean {
  if (!Number.isInteger(id) || id <= 0) return false;
  const index = id % 10;
  const day = Math.floor(id / 10);
  return index < PRAYER_NAMES.length && day >= 10100 && day <= 999_999;
}

/** Removes every pending prayer alarm — used when the user turns the feature off. */
export async function cancelAllPrayerNotifications(): Promise<void> {
  const api = await plugin();
  if (!api) return;
  try {
    const pending = await api.getPending();
    const ours = pending.notifications.filter((n) => isPrayerNotificationId(n.id));
    if (ours.length) await api.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  } catch (err) {
    captureError(err, 'Manual', { area: 'prayer-notifications', step: 'cancel' });
  }
}