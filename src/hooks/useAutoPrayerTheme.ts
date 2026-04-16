// Auto-switch color theme & light/dark mode based on the current prayer time slot.
// Integrates with existing prayer times cache + AppContext.
import { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fetchPrayerTimings } from './usePrayerTimesCache';

export type PrayerSlot = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerThemeMapping {
  slot: PrayerSlot;
  colorTheme: string;
  mode: 'light' | 'dark';
}

// Default mapping — matches the spirit of each prayer time
export const DEFAULT_PRAYER_THEME_MAP: Record<PrayerSlot, { colorTheme: string; mode: 'light' | 'dark' }> = {
  fajr:    { colorTheme: 'lavender',  mode: 'dark' },   // pre-dawn calm
  sunrise: { colorTheme: 'amber',     mode: 'light' },  // morning warmth
  dhuhr:   { colorTheme: 'ocean',     mode: 'light' },  // bright midday
  asr:     { colorTheme: 'sunset',    mode: 'light' },  // golden afternoon
  maghrib: { colorTheme: 'rose',      mode: 'dark' },   // sunset glow
  isha:    { colorTheme: 'midnight',  mode: 'dark' },   // night
};

const STORAGE_KEY_ENABLED = 'app-auto-prayer-theme';
const STORAGE_KEY_MAP = 'app-auto-prayer-theme-map';

export function getAutoPrayerThemeEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
}

export function setAutoPrayerThemeEnabled(v: boolean) {
  localStorage.setItem(STORAGE_KEY_ENABLED, String(v));
  window.dispatchEvent(new Event('auto-prayer-theme-changed'));
}

export function getPrayerThemeMap(): typeof DEFAULT_PRAYER_THEME_MAP {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MAP);
    if (raw) return { ...DEFAULT_PRAYER_THEME_MAP, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PRAYER_THEME_MAP;
}

export function setPrayerThemeFor(slot: PrayerSlot, colorTheme: string, mode: 'light' | 'dark') {
  const map = getPrayerThemeMap();
  map[slot] = { colorTheme, mode };
  localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(map));
  window.dispatchEvent(new Event('auto-prayer-theme-changed'));
}

// Convert "HH:mm" → minutes since midnight
function toMinutes(t: string): number {
  const clean = t.split(' ')[0]; // strip "(EEST)" suffix if present
  const [h, m] = clean.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Determine which slot the current time falls in
export function getCurrentSlot(timings: Record<string, string>, nowMinutes: number): PrayerSlot {
  const fajr = toMinutes(timings.Fajr);
  const sunrise = toMinutes(timings.Sunrise);
  const dhuhr = toMinutes(timings.Dhuhr);
  const asr = toMinutes(timings.Asr);
  const maghrib = toMinutes(timings.Maghrib);
  const isha = toMinutes(timings.Isha);

  if (nowMinutes >= fajr && nowMinutes < sunrise) return 'fajr';
  if (nowMinutes >= sunrise && nowMinutes < dhuhr) return 'sunrise';
  if (nowMinutes >= dhuhr && nowMinutes < asr) return 'dhuhr';
  if (nowMinutes >= asr && nowMinutes < maghrib) return 'asr';
  if (nowMinutes >= maghrib && nowMinutes < isha) return 'maghrib';
  return 'isha'; // after isha and before fajr
}

export function useAutoPrayerTheme() {
  const { setColorTheme, setTheme, prayerMadhab, latitudeAdjMethod } = useApp();
  const lastAppliedSlotRef = useRef<PrayerSlot | null>(null);
  const enabledRef = useRef<boolean>(getAutoPrayerThemeEnabled());

  useEffect(() => {
    let intervalId: number | undefined;
    let mounted = true;

    const applyForCurrentTime = async () => {
      if (!enabledRef.current) return;

      // Get cached location (saved by WeatherWidget / PrayerTimes)
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const loc = localStorage.getItem('lastLocation');
        if (loc) {
          const parsed = JSON.parse(loc);
          lat = parsed.lat;
          lng = parsed.lng;
        }
      } catch {}
      if (lat == null || lng == null) return;

      const school = prayerMadhab === 'hanafi' ? 1 : 0;
      const latAdj = latitudeAdjMethod === 'middle' ? 1 : latitudeAdjMethod === 'seventh' ? 2 : 3;

      const timings = await fetchPrayerTimings(lat, lng, school, latAdj);
      if (!timings || !mounted) return;

      const now = new Date();
      const slot = getCurrentSlot(timings, now.getHours() * 60 + now.getMinutes());

      if (lastAppliedSlotRef.current === slot) return;
      lastAppliedSlotRef.current = slot;

      const map = getPrayerThemeMap();
      const target = map[slot];
      if (target) {
        setColorTheme(target.colorTheme as any);
        setTheme(target.mode);
      }
    };

    const start = () => {
      enabledRef.current = getAutoPrayerThemeEnabled();
      lastAppliedSlotRef.current = null;
      applyForCurrentTime();
      // Re-check every 60 seconds
      if (intervalId) window.clearInterval(intervalId);
      intervalId = window.setInterval(applyForCurrentTime, 60_000);
    };

    start();

    const handleChange = () => start();
    window.addEventListener('auto-prayer-theme-changed', handleChange);

    return () => {
      mounted = false;
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener('auto-prayer-theme-changed', handleChange);
    };
  }, [setColorTheme, setTheme, prayerMadhab, latitudeAdjMethod]);
}
