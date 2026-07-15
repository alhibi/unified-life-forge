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
import { useAuth } from '@/hooks/useAuth';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData } from '@/weather/hooks/useWeatherData';
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

// Compact humaniser: 5 → "5د" / "5 Min", 95 → "1س 35د" / "1h 35m".
function fmtDuration(mins: number, ar: boolean): string {
  if (mins < 60) return ar ? `${mins}د` : `${mins} Min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!m) return ar ? `${h}س` : `${h}h`;
  return ar ? `${h}س ${m}د` : `${h}h ${m}m`;
}

// Short mood descriptor for the current temperature. Kept intentionally
// gentle — one word so the subtitle stays a glance, not a paragraph.
function tempMood(temp: number, ar: boolean): string {
  if (temp <= 0)  return ar ? 'قارس'   : 'eiskalt';
  if (temp <= 8)  return ar ? 'بارد'   : 'kalt';
  if (temp <= 15) return ar ? 'منعش'   : 'kühl';
  if (temp <= 22) return ar ? 'لطيف'   : 'mild';
  if (temp <= 28) return ar ? 'دافئ'   : 'warm';
  if (temp <= 34) return ar ? 'حار'    : 'heiß';
  return           ar ? 'شديد الحرارة' : 'sehr heiß';
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

  // Comparative prayer window — the last prayer that already passed today
  // AND the next one still ahead. Lets the greeting say "since Fajr … next
  // Dhuhr" so the user feels where in the day they are.
  const prayerWindow = useMemo(() => {
    if (!timings) return null;
    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let last: { name: string; mins: number } | null = null;
    let next: { name: string; mins: number } | null = null;
    for (const name of order) {
      const raw = timings[name];
      if (!raw) continue;
      const ts = todayAt(raw.slice(0, 5));
      if (ts == null) continue;
      const delta = Math.round((ts - now) / 60_000);
      if (delta <= 0) {
        // Already passed — keep updating so we end on the most recent one.
        last = { name, mins: -delta };
      } else if (!next) {
        next = { name, mins: delta };
        break;
      }
    }
    return { last, next };
  }, [timings, now]);

  // Prayer line — comparative window "since X · until Y".
  const prayerLine = useMemo(() => {
    if (!prayerWindow) return null;
    const { last, next } = prayerWindow;
    const bits: string[] = [];
    if (last) {
      const label = ar ? PRAYER_AR[last.name] : PRAYER_DE[last.name];
      bits.push(ar
        ? `مضى على ${label} ${fmtDuration(last.mins, true)}`
        : `${fmtDuration(last.mins, false)} nach ${label}`);
    }
    if (next) {
      const label = ar ? PRAYER_AR[next.name] : PRAYER_DE[next.name];
      bits.push(ar
        ? `${label} بعد ${fmtDuration(next.mins, true)}`
        : `${label} in ${fmtDuration(next.mins, false)}`);
    }
    if (!bits.length) return null;
    return bits.join(ar ? ' · ' : ' · ');
  }, [prayerWindow, ar]);

  // Weather line — "18° لطيف" and, when apparent temp diverges by 3°+,
  // append "الإحساس 15°" so the user knows the wind/humidity bite.
  const weatherLine = useMemo(() => {
    const c = weather?.current;
    if (!c) return null;
    const temp = Math.round(c.temperature);
    const feels = Math.round(c.apparentTemperature);
    const mood = tempMood(temp, ar);
    const base = `${temp}° ${mood}`;
    if (Math.abs(feels - temp) >= 3) {
      return ar ? `${base} · الإحساس ${feels}°` : `${base} · gefühlt ${feels}°`;
    }
    return base;
  }, [weather?.current, ar]);

  // Date fallback line if nothing else is ready yet (cold start).
  const dateLine = new Date(now).toLocaleDateString(ar ? 'ar' : 'de', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Headline composition.
  // Signed-in: "صباح الخير، عامر"  /  Signed-out: "صباح الخير"
  const headline = username
    ? (ar ? `${greeting}، ${username}` : `${greeting}, ${username}`)
    : greeting;

  const sep = ' · ';
  const primary = [weatherLine, prayerLine].filter(Boolean).join(sep) || dateLine;

  return (
    <div className="min-w-0" dir={ar ? 'rtl' : 'ltr'}>
      <p className="text-[22px] font-bold tracking-tight text-foreground leading-tight truncate">
        {headline}
      </p>
      <p
        className="text-[12px] text-muted-foreground mt-1 leading-snug tabular-nums"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {primary}
      </p>
    </div>
  );
}