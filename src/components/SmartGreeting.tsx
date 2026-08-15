/**
 * SmartGreeting — context-aware greeting line.
 *
 * Renders a compact, elegant two-line block that weaves together:
 *   • Time-of-day salutation (morning/afternoon/evening) + name
 *   • Comparative prayer timing — how long since the last prayer AND
 *     how long until the next one, so the day has a felt rhythm
 *   • Current temperature + short mood descriptor (feels-like when it
 *     diverges meaningfully from the actual temperature)
 *
 * Text-only — no icons, no emojis (per Home Greeting memory rule).
 * Uses the Latin numeral system in both languages (per localization rule).
 */
import { useEffect, useMemo, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { fetchPrayerTimings } from '@/hooks/usePrayerTimesCache';

const PRAYER_AR: Record<string, string> = {
  Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء',
};
const PRAYER_DE: Record<string, string> = {
  Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha',
};

function todayAt(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

// Compact humaniser: 5 → "5د" / "5 Min", 95 → "1:35س" / "1h 35".
function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}د`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!m) return `${h}س`;
  return `${h}س ${m}د`;
}

export default function SmartGreeting() {
  const { t, } = useApp();
  const { username } = useAuth();
  const { location } = useDeviceLocation();
  const { data: weather } = useWeatherData('ar');

  // Re-tick every minute so the countdown stays fresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Lazy-fetch prayer times — reuse the shared cache so we don't double-fetch.
  const [timings, setTimings] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    fetchPrayerTimings(location.lat, location.lng, 0, 1).then(r => {
      if (!cancelled) setTimings(r);
    });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng]);

  const greeting = useMemo(() => {
    const hour = new Date(now).getHours();
    if (hour >= 5 && hour < 12)  return t('greeting.morning');
    if (hour >= 12 && hour < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  }, [now, t]);

  // Next upcoming prayer today — keep it to one signal so the subtitle
  // stays a glance, not a paragraph.
  const nextPrayer = useMemo(() => {
    if (!timings) return null;
    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const name of order) {
      const raw = timings[name];
      if (!raw) continue;
      const ts = todayAt(raw.slice(0, 5));
      if (ts == null) continue;
      const delta = Math.round((ts - now) / 60_000);
      if (delta > 0) return { name, mins: delta };
    }
    return null;
  }, [timings, now]);

  const prayerLine = useMemo(() => {
    if (!nextPrayer) return null;
    const label = PRAYER_AR[nextPrayer.name];
    return `${label} بعد ${fmtDuration(nextPrayer.mins)}`;
  }, [nextPrayer]);

  const weatherLine = weather?.current
    ? `${Math.round(weather.current.temperature)}°`
    : null;

  // Date fallback line if nothing else is ready yet (cold start).
  const dateLine = new Date(now).toLocaleDateString('ar', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Headline composition.
  // Signed-in: "صباح الخير، عامر"  /  Signed-out: "صباح الخير"
  const headline = username
    ? (`${greeting}، ${username}`)
    : greeting;

  const primary = [weatherLine, prayerLine].filter(Boolean).join(' · ') || dateLine;

  return (
    <div className="min-w-0" dir={'rtl'}>
      <p className="text-display font-bold tracking-tight text-foreground leading-tight truncate">
        {headline}
      </p>
      <p
        className="text-mini text-muted-foreground mt-1 leading-snug tabular-nums"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {primary}
      </p>
    </div>
  );
}