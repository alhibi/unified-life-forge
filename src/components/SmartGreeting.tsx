/**
 * SmartGreeting — context-aware greeting line.
 *
 * Renders one elegant sentence that weaves together:
 *   • Time-of-day salutation (morning/afternoon/evening)
 *   • Username (if signed in)
 *   • Current temperature (if weather available)
 *   • Countdown to next prayer (if prayer times available)
 *
 * Text-only — no icons, no emojis (per Home Greeting memory rule).
 * Uses the Latin numeral system in both languages (per localization rule).
 */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
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

export default function SmartGreeting() {
  const { t, language } = useApp();
  const { username } = useAuth();
  const ar = language === 'ar';
  const { location } = useDeviceLocation();
  const { data: weather } = useWeatherData(ar ? 'ar' : 'de');

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

  // Find the next upcoming prayer (today only — keep it simple).
  const nextPrayer = useMemo(() => {
    if (!timings) return null;
    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const name of order) {
      const raw = timings[name];
      if (!raw) continue;
      const t = todayAt(raw.slice(0, 5));
      if (t == null) continue;
      const mins = Math.round((t - now) / 60_000);
      if (mins > 0) return { name, mins };
    }
    return null;
  }, [timings, now]);

  const temp = weather?.current ? Math.round(weather.current.temperature) : null;

  // Build a natural-language subtitle from whatever signals we have.
  // Worst case (cold start) → falls back to the date line.
  const parts: string[] = [];
  if (temp != null) {
    parts.push(ar ? `${temp}° الآن` : `${temp}° jetzt`);
  }
  if (nextPrayer) {
    const label = ar ? PRAYER_AR[nextPrayer.name] : PRAYER_DE[nextPrayer.name];
    if (nextPrayer.mins < 60) {
      parts.push(ar ? `${label} بعد ${nextPrayer.mins} د` : `${label} in ${nextPrayer.mins} Min`);
    } else {
      const h = Math.floor(nextPrayer.mins / 60);
      const m = nextPrayer.mins % 60;
      parts.push(
        ar
          ? `${label} بعد ${h}س ${m ? `${m}د` : ''}`.trim()
          : `${label} in ${h}h ${m ? `${m}m` : ''}`.trim(),
      );
    }
  }

  const subtitle = parts.length
    ? parts.join(ar ? '  •  ' : '  •  ')
    : new Date(now).toLocaleDateString(ar ? 'ar' : 'de', {
        weekday: 'long', month: 'long', day: 'numeric',
      });

  // Headline composition.
  // Signed-in: "صباح الخير، عامر"  /  Signed-out: "صباح الخير"
  const headline = username
    ? (ar ? `${greeting}، ${username}` : `${greeting}, ${username}`)
    : greeting;

  return (
    <div className="min-w-0">
      <p className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
        {headline}
      </p>
      <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
        {subtitle}
      </p>
    </div>
  );
}