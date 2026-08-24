/**
 * Owns the prayer-notification preference and keeps the OS schedule in sync
 * with it.
 *
 * Re-syncs on every input that can invalidate the schedule:
 *   • the preference itself,
 *   • the madhab / high-latitude rule (they move Asr and Isha),
 *   • the device location (a flight changes every timing),
 *   • app resume, because the schedule is a rolling seven-day window and only
 *     shrinks while the app is closed.
 *
 * Deliberately does *not* re-sync on a timer: alarms already live in the OS,
 * so a background tick would only spend battery re-writing the same 35 rows.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { MECCA_FALLBACK, useDeviceLocation } from '@/hooks/useDeviceLocation';
import { isNative } from '@/lib/native';
import {
  cancelAllPrayerNotifications,
  DEFAULT_PRAYER_NOTIFICATION_PREFS,
  type PrayerName,
  type PrayerNotificationPrefs,
  syncPrayerNotifications,
} from '@/lib/prayerNotifications';

const STORAGE_KEY = 'prayerNotificationPrefs';

function readPrefs(): PrayerNotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRAYER_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as Partial<PrayerNotificationPrefs>;
    return {
      enabled: parsed.enabled === true,
      leadMinutes: Number.isFinite(parsed.leadMinutes) ? Number(parsed.leadMinutes) : 0,
      prayers: { ...DEFAULT_PRAYER_NOTIFICATION_PREFS.prayers, ...(parsed.prayers ?? {}) },
    };
  } catch {
    return DEFAULT_PRAYER_NOTIFICATION_PREFS;
  }
}

export interface UsePrayerNotifications {
  prefs: PrayerNotificationPrefs;
  /** False on the web build, where the OS cannot be handed an alarm. */
  supported: boolean;
  /** True while a sync is in flight, so the UI can avoid a double tap. */
  syncing: boolean;
  /** Set once a sync has run: how many alarms the OS now holds. */
  scheduled: number | null;
  /** Present when the last sync could not schedule anything. */
  problem: 'no-permission' | 'error' | null;
  setEnabled: (value: boolean) => void;
  setPrayer: (prayer: PrayerName, value: boolean) => void;
  setLeadMinutes: (minutes: number) => void;
}

export function usePrayerNotifications(): UsePrayerNotifications {
  const { prayerMadhab, latitudeAdjMethod } = useApp();
  const { location } = useDeviceLocation();
  const [prefs, setPrefs] = useState<PrayerNotificationPrefs>(readPrefs);
  const [syncing, setSyncing] = useState(false);
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [problem, setProblem] = useState<'no-permission' | 'error' | null>(null);

  const supported = isNative();

  const school = prayerMadhab === 'hanafi' ? (1 as const) : (0 as const);
  const latAdj = latitudeAdjMethod === 'middle' ? (1 as const)
    : latitudeAdjMethod === 'seventh' ? (2 as const)
    : (3 as const);

  const coords = useMemo(
    () => ({
      lat: location?.lat ?? MECCA_FALLBACK.lat,
      lng: location?.lng ?? MECCA_FALLBACK.lng,
    }),
    [location?.lat, location?.lng],
  );

  const persist = useCallback((next: PrayerNotificationPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* a full quota must not block the toggle from taking effect this session */
    }
  }, []);

  const sync = useCallback(async () => {
    if (!supported) return;
    if (!prefs.enabled) {
      await cancelAllPrayerNotifications();
      setScheduled(0);
      setProblem(null);
      return;
    }
    setSyncing(true);
    const result = await syncPrayerNotifications({
      lat: coords.lat,
      lng: coords.lng,
      school,
      latAdj,
      prefs,
    });
    setSyncing(false);
    setScheduled(result.scheduled);
    setProblem(
      result.reason === 'no-permission' ? 'no-permission'
      : result.reason === 'error' ? 'error'
      : null,
    );
  }, [supported, prefs, coords.lat, coords.lng, school, latAdj]);

  useEffect(() => {
    void sync();
  }, [sync]);

  // Resume: the window has been rolling forward while the app was closed.
  useEffect(() => {
    if (!supported || !prefs.enabled) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [supported, prefs.enabled, sync]);

  return {
    prefs,
    supported,
    syncing,
    scheduled,
    problem,
    setEnabled: (value) => persist({ ...prefs, enabled: value }),
    setPrayer: (prayer, value) =>
      persist({ ...prefs, prayers: { ...prefs.prayers, [prayer]: value } }),
    setLeadMinutes: (minutes) => persist({ ...prefs, leadMinutes: minutes }),
  };
}