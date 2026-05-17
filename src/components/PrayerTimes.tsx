import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sunrise as SunriseIcon, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { fetchPrayerTimings as fetchPrayerTimingsCached } from '@/hooks/usePrayerTimesCache';
import {
  getUpcomingOccasions,
  getDaysUntil,
  getTodayHijri,
  formatHijriDate,
} from '@/data/islamicOccasions';
import type { IslamicOccasion } from '@/data/islamicOccasions';

/**
 * PrayerTimes — a faithful re-implementation of khushu's Home prayer feature
 * (https://github.com/greykaizen/khushu, Kotlin/Compose) ported to React.
 *
 * The card has three stacked sections, mirroring khushu:
 *   1. Dual-tone hero  → "Current prayer | Next prayer" with location + source
 *   2. Arc strip       → sinusoidal day/night sun-path with prayer dots,
 *                         makruh zones, sun/moon, twinkling stars at night
 *   3. Prayer slab     → list of all 5 fard prayers with sequential
 *                         "completed today" tracking, progress bar, NEXT badge,
 *                         "Pray" pill on the active prayer, shake on rejected
 *                         tap and guide-pulse on the row that *should* be
 *                         tapped next.
 *
 * Notes / parity with khushu:
 *   • Time arc is anchored on solar noon: tToArc(ms) = clamp(0.5 + (ms − solarNoon)/24h, −0.2, 1.2).
 *   • Makruh zones: Sunrise..+20min, Dhuhr−15min..Dhuhr, Maghrib−15min..Maghrib.
 *   • Done states are stored in localStorage keyed by yyyy-MM-dd; auto-reset at
 *     midnight rollover.
 *   • Sequential rule: tapping a not-yet-done prayer that isn't the very next
 *     uncompleted one shakes the row and pulses the row the user *should* tap.
 *     Tapping an already-done prayer rewinds it and every later prayer.
 */

// ─── Types & constants ──────────────────────────────────────────────────────
interface PrayerTime {
  name: PrayerKey;
  ar: string;
  time24: string;        // "HH:MM" — used only for parsing
  time: string;          // "h:mm AM" — preformatted for display
  rawTimeMs: number;     // epoch ms for ordering
  arcT: number;          // 0..1 position on the day-arc
  dotLight: string;
  dotDark: string;
}

const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerKey = (typeof PRAYER_KEYS)[number];

const PRAYER_AR: Record<PrayerKey, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

const PRAYER_DOT_LIGHT: Record<PrayerKey, string> = {
  Fajr: '#4a70b0',
  Dhuhr: '#a87010',
  Asr: '#a06020',
  Maghrib: '#9a3828',
  Isha: '#584898',
};
const PRAYER_DOT_DARK: Record<PrayerKey, string> = {
  Fajr: '#6890d8',
  Dhuhr: '#d4a828',
  Asr: '#d08840',
  Maghrib: '#e06050',
  Isha: '#9070d0',
};

// Makruh palette (same hexes as khushu)
const MAKRUH_RED = '#E04030';
const MAKRUH_BADGE_AMBER = '#FFB300';
const MAKRUH_BADGE_RED = '#E53935';
const MAKRUH_TINT_SOLAR = 'rgba(229, 115, 115, 0.12)';   // zawal
const MAKRUH_TINT_HORIZON = 'rgba(255, 213, 79, 0.12)';  // sunrise/sunset

// Sun/moon palette
const SUN_COLOR = '#FAC82D';
const MOON_COLOR = '#B4A2FF';

// ─── Time / parsing helpers ────────────────────────────────────────────────
function parseHM(time?: string): number | null {
  if (!time) return null;
  const clean = time.replace(/\s*\(.*\)/, '').trim();
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Convert "HH:MM" to a Date today. */
function timeToDateToday(time24: string, anchor: Date): Date {
  const m = parseHM(time24);
  const d = new Date(anchor);
  if (m == null) return d;
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

function formatTime12(time24: string, ampm: { am: string; pm: string }): string {
  const m = parseHM(time24);
  if (m == null) return '--:--';
  const h = Math.floor(m / 60);
  const mm = (m % 60).toString().padStart(2, '0');
  const suffix = h >= 12 ? ampm.pm : ampm.am;
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${suffix}`;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

/** Khushu's tToArc: 0.5 = solar noon, 0.0 = 12h before, 1.0 = 12h after. */
function tToArc(targetMs: number, solarNoonMs: number): number {
  const dayMs = 86_400_000;
  const ratio = (targetMs - solarNoonMs) / dayMs;
  return Math.max(-0.2, Math.min(1.2, 0.5 + ratio));
}

// ─── Makruh zone computation ───────────────────────────────────────────────
interface MakruhZone {
  tStart: number;
  tEnd: number;
  label: 'Sunrise' | 'Zawal' | 'Sunset';
}

function computeMakruhZones(
  sunriseMs: number | null,
  dhuhrMs: number | null,
  maghribMs: number | null,
  solarNoonMs: number
): MakruhZone[] {
  const zones: MakruhZone[] = [];
  const min15 = 15 * 60_000;
  const min20 = 20 * 60_000;
  if (sunriseMs != null) {
    zones.push({
      tStart: tToArc(sunriseMs, solarNoonMs),
      tEnd: tToArc(sunriseMs + min20, solarNoonMs),
      label: 'Sunrise',
    });
  }
  if (dhuhrMs != null) {
    zones.push({
      tStart: tToArc(dhuhrMs - min15, solarNoonMs),
      tEnd: tToArc(dhuhrMs, solarNoonMs),
      label: 'Zawal',
    });
  }
  if (maghribMs != null) {
    zones.push({
      tStart: tToArc(maghribMs - min15, solarNoonMs),
      tEnd: tToArc(maghribMs, solarNoonMs),
      label: 'Sunset',
    });
  }
  return zones;
}

// ─── Star field (deterministic seed, like khushu) ──────────────────────────
const STARS: { x: number; y: number; r: number; delayMs: number }[] = (() => {
  const arr: { x: number; y: number; r: number; delayMs: number }[] = [];
  for (let i = 0; i < 22; i++) {
    arr.push({
      x: ((i * 47 + 19) % 120) + 5,
      y: ((i * 31 + 11) % 55) + 4,
      r: ((i * 13) % 8) / 10 + 0.35,
      delayMs: ((i * 7) % 20) * 100,
    });
  }
  return arr;
})();

// ─── Arc strip geometry ────────────────────────────────────────────────────
// Drawn in a 320×100 viewBox.
const ARC_W = 320;
const ARC_H = 100;
const ARC_PAD_X = 22;
const ARC_LINE_Y = 56;        // horizon line baseline
const ARC_DAY_AMPL = 22;      // upward bell amplitude during day
const ARC_NIGHT_AMPL = 14;    // downward bump amplitude at night

interface ArcGeom {
  dayStart: number;
  dayEnd: number;
}

function arcCurveY(t: number, geom: ArcGeom): number {
  if (t >= geom.dayStart && t <= geom.dayEnd) {
    const dayDur = Math.max(0.0001, geom.dayEnd - geom.dayStart);
    const norm = (t - geom.dayStart) / dayDur;
    return ARC_LINE_Y - ARC_DAY_AMPL * Math.sin(Math.PI * norm);
  }
  const nightDur = Math.max(0.0001, 1 - (geom.dayEnd - geom.dayStart));
  const norm =
    t > geom.dayEnd
      ? (t - geom.dayEnd) / nightDur
      : (t + (1 - geom.dayEnd)) / nightDur;
  return ARC_LINE_Y + ARC_NIGHT_AMPL * Math.sin(Math.PI * norm);
}

function arcX(t: number): number {
  const lineLen = ARC_W - 2 * ARC_PAD_X;
  return ARC_PAD_X + Math.max(0, Math.min(1, t)) * lineLen;
}

/** Build a smooth SVG path between t0 and t1 using `steps` samples. */
function buildArcPath(t0: number, t1: number, steps: number, geom: ArcGeom): string {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const x = arcX(t).toFixed(2);
    const y = arcCurveY(t, geom).toFixed(2);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}

// ─── Slot detection (current / next prayer) ─────────────────────────────────
interface Slot {
  current: PrayerKey;
  next: PrayerKey;
  /** ms epoch of the next prayer's start (may be tomorrow's Fajr) */
  nextMs: number;
}

function computeSlot(prayers: PrayerTime[], nowMs: number): Slot | null {
  if (prayers.length < 5) return null;
  // current = last prayer with rawTime ≤ now, fallback to last (Isha) so
  // before-Fajr today still shows "Isha" (yesterday's last) like khushu.
  let current: PrayerKey = prayers[prayers.length - 1].name;
  for (const p of prayers) {
    if (p.rawTimeMs <= nowMs) current = p.name;
  }
  // next = first prayer with rawTime > now; fallback to tomorrow's Fajr.
  const upcoming = prayers.find((p) => p.rawTimeMs > nowMs);
  if (upcoming) {
    return { current, next: upcoming.name, nextMs: upcoming.rawTimeMs };
  }
  const fajr = prayers[0];
  return { current, next: fajr.name, nextMs: fajr.rawTimeMs + 86_400_000 };
}

// ─── Done-states persistence ────────────────────────────────────────────────
const DONE_KEY = 'prayer_done_states';

function loadDoneStates(stamp: string): Record<PrayerKey, boolean> {
  const empty: Record<PrayerKey, boolean> = {
    Fajr: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false,
  };
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (parsed?.stamp === stamp && parsed?.states) {
      return { ...empty, ...parsed.states };
    }
  } catch { /* ignore */ }
  return empty;
}

function saveDoneStates(stamp: string, states: Record<PrayerKey, boolean>) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify({ stamp, states }));
  } catch { /* ignore */ }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function PrayerTimes() {
  const { prayerMadhab, latitudeAdjMethod, dstEnabled, t, language, theme } = useApp();
  const isDark = useIsDark(theme);

  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [extraTimings, setExtraTimings] = useState<{ Sunrise?: string; Sunset?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [now, setNow] = useState(() => new Date());

  // Done-states keyed by yyyy-MM-dd, auto-reset on day rollover
  const [stamp, setStamp] = useState(todayStamp);
  const [doneStates, setDoneStates] = useState<Record<PrayerKey, boolean>>(() =>
    loadDoneStates(todayStamp())
  );

  // Animation triggers per-row: each value is an ever-increasing counter that
  // re-fires the keyframe whenever it changes (mirrors khushu's pattern).
  const [shakeCounter, setShakeCounter] = useState<Record<PrayerKey, number>>({
    Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0,
  });
  const [guideCounter, setGuideCounter] = useState<Record<PrayerKey, number>>({
    Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0,
  });

  const schoolParam = prayerMadhab === 'hanafi' ? 1 : 0;
  const latAdjMap: Record<string, number> = { middle: 1, seventh: 2, angle: 3 };
  const latAdjParam = latAdjMap[latitudeAdjMethod] || 3;

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchPrayers = useCallback(
    async (lat: number, lng: number) => {
      try {
        // Reverse-geocode (non-blocking)
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${language}`
        )
          .then((r) => r.json())
          .then((geoData) => {
            const addr = geoData.address;
            const city =
              addr?.city ||
              addr?.town ||
              addr?.village ||
              addr?.suburb ||
              addr?.county ||
              '';
            if (city) setLocationName(city);
          })
          .catch(() => { /* ignore geocoding failure */ });

        const timings = await fetchPrayerTimingsCached(lat, lng, schoolParam, latAdjParam);
        if (timings) {
          // Build PrayerTime[] with absolute epoch ms anchored to TODAY.
          // We anchor by parsing each HH:MM into today's date; the slot-detect
          // then handles "after Isha → next is tomorrow Fajr".
          const anchor = new Date();
          // First pass: parse times we need for the arc/makruh math.
          const sunriseMs = timings.Sunrise
            ? timeToDateToday(timings.Sunrise, anchor).getTime()
            : null;
          const sunsetMs = timings.Sunset
            ? timeToDateToday(timings.Sunset, anchor).getTime()
            : timings.Maghrib
              ? timeToDateToday(timings.Maghrib, anchor).getTime()
              : null;
          const dhuhrMs = timings.Dhuhr
            ? timeToDateToday(timings.Dhuhr, anchor).getTime()
            : null;
          const maghribMs = timings.Maghrib
            ? timeToDateToday(timings.Maghrib, anchor).getTime()
            : null;
          const solarNoonMs =
            sunriseMs != null && sunsetMs != null
              ? (sunriseMs + sunsetMs) / 2
              : dhuhrMs ?? anchor.getTime();

          const ampm = { am: t('prayer.am'), pm: t('prayer.pm') };
          const result: PrayerTime[] = PRAYER_KEYS.map((key) => {
            const time24 = timings[key] || '';
            const ms = timeToDateToday(time24, anchor).getTime();
            return {
              name: key,
              ar: PRAYER_AR[key],
              time24,
              time: formatTime12(time24, ampm),
              rawTimeMs: ms,
              arcT: tToArc(ms, solarNoonMs),
              dotLight: PRAYER_DOT_LIGHT[key],
              dotDark: PRAYER_DOT_DARK[key],
            };
          });
          setPrayers(result);
          setExtraTimings({
            Sunrise: timings.Sunrise,
            Sunset: timings.Sunset || timings.Maghrib,
          });
        } else {
          setError(t('prayer.error'));
        }
      } catch {
        setError(t('prayer.connectionError'));
      } finally {
        setLoading(false);
      }
    },
    [schoolParam, latAdjParam, dstEnabled, language, t]
  );

  // Resolve location, then fetch prayer times.
  // Strategy (mirrors what other widgets in this app do):
  //   1. If `lastLocation` is already saved (by LocationSaver, Index, or
  //      another widget) → use it immediately.
  //   2. Otherwise actively request the device's geolocation.
  //   3. If permission is denied or geolocation unavailable → fall back to Mecca.
  //   4. Always listen for `locationUpdated` events so we re-fetch whenever
  //      the user changes their saved location elsewhere in the app.
  useEffect(() => {
    let cancelled = false;

    const useCoords = (lat: number, lng: number, persist: boolean) => {
      if (cancelled) return;
      if (persist) {
        try {
          localStorage.setItem('lastLocation', JSON.stringify({ lat, lng }));
        } catch { /* ignore quota / privacy errors */ }
      }
      fetchPrayers(lat, lng);
    };

    const fallbackToMecca = () => useCoords(21.4225, 39.8262, false);

    const cached = localStorage.getItem('lastLocation');
    if (cached) {
      try {
        const { lat, lng } = JSON.parse(cached);
        if (typeof lat === 'number' && typeof lng === 'number') {
          useCoords(lat, lng, false);
        } else {
          fallbackToMecca();
        }
      } catch {
        fallbackToMecca();
      }
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Ask the browser for the current position. We don't block on this —
      // a fallback timer kicks in after 8 s so the card never stays in the
      // loading state forever (some browsers stall silently).
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        fallbackToMecca();
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (timedOut) return;
          clearTimeout(timeout);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          useCoords(lat, lng, true);
          // Notify the rest of the app so other widgets (Weather, Sunnah, …)
          // can re-fetch with the same coordinates.
          window.dispatchEvent(new Event('locationUpdated'));
        },
        () => {
          // Permission denied / position unavailable
          if (timedOut) return;
          clearTimeout(timeout);
          fallbackToMecca();
        },
        { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 7000 }
      );
    } else {
      fallbackToMecca();
    }

    // Listen for location updates from other widgets (e.g. user picks a
    // saved location, Index re-detects, etc.)
    const handleLocationUpdate = () => {
      const updated = localStorage.getItem('lastLocation');
      if (!updated) return;
      try {
        const { lat, lng } = JSON.parse(updated);
        if (typeof lat === 'number' && typeof lng === 'number') {
          fetchPrayers(lat, lng);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('locationUpdated', handleLocationUpdate);
    // Also listen to cross-tab storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lastLocation') handleLocationUpdate();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('locationUpdated', handleLocationUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchPrayers]);

  // Tick once per second so the arc, sun and any inside-makruh tinting stay live.
  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow(next);
      const stampNow = todayStamp();
      if (stampNow !== stamp) {
        // Day rolled over — reset done states
        setStamp(stampNow);
        setDoneStates(loadDoneStates(stampNow));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [stamp]);

  // ─── Derived values ──────────────────────────────────────────────────────
  const nowMs = now.getTime();

  const slot = useMemo(() => computeSlot(prayers, nowMs), [prayers, nowMs]);

  const sunriseMs = extraTimings.Sunrise
    ? timeToDateToday(extraTimings.Sunrise, now).getTime()
    : null;
  const sunsetMs = extraTimings.Sunset
    ? timeToDateToday(extraTimings.Sunset, now).getTime()
    : null;
  const dhuhrMs = prayers.find((p) => p.name === 'Dhuhr')?.rawTimeMs ?? null;
  const maghribMs = prayers.find((p) => p.name === 'Maghrib')?.rawTimeMs ?? null;
  const solarNoonMs =
    sunriseMs != null && sunsetMs != null ? (sunriseMs + sunsetMs) / 2 : dhuhrMs ?? nowMs;

  const sunT = useMemo(() => tToArc(nowMs, solarNoonMs), [nowMs, solarNoonMs]);
  const makruhZones = useMemo(
    () => computeMakruhZones(sunriseMs, dhuhrMs, maghribMs, solarNoonMs),
    [sunriseMs, dhuhrMs, maghribMs, solarNoonMs]
  );
  const arcGeom: ArcGeom = useMemo(
    () => ({
      dayStart: makruhZones.find((z) => z.label === 'Sunrise')?.tStart ?? 0.25,
      dayEnd: makruhZones.find((z) => z.label === 'Sunset')?.tEnd ?? 0.75,
    }),
    [makruhZones]
  );
  const isNight = sunT < arcGeom.dayStart || sunT > arcGeom.dayEnd;
  const currentMakruh = makruhZones.find((z) => sunT >= z.tStart && sunT <= z.tEnd);

  // ─── Slab toggle logic ───────────────────────────────────────────────────
  const handleToggle = useCallback(
    (name: PrayerKey) => {
      const ordered = PRAYER_KEYS;
      // Tapped is already done → rewind it and every later prayer
      if (doneStates[name]) {
        const idx = ordered.indexOf(name);
        const rewound = { ...doneStates };
        for (let i = idx; i < ordered.length; i++) rewound[ordered[i]] = false;
        setDoneStates(rewound);
        saveDoneStates(stamp, rewound);
        return;
      }
      // Find the first uncompleted prayer; if it isn't this one, REJECT
      const firstPending = ordered.find((k) => !doneStates[k]);
      if (firstPending == null) {
        // All already done — rejection too-early (no guidance)
        setShakeCounter((s) => ({ ...s, [name]: s[name] + 1 }));
        return;
      }
      if (firstPending !== name) {
        setShakeCounter((s) => ({ ...s, [name]: s[name] + 1 }));
        setGuideCounter((g) => ({ ...g, [firstPending]: g[firstPending] + 1 }));
        return;
      }
      // Accept: mark this one done
      const updated = { ...doneStates, [name]: true };
      setDoneStates(updated);
      saveDoneStates(stamp, updated);
    },
    [doneStates, stamp]
  );

  const doneCount = Object.values(doneStates).filter(Boolean).length;

  // ─── Render guards ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-3xl bg-card border border-border p-5 text-card-foreground animate-pulse min-h-[360px]" />
    );
  }
  if (error) {
    return (
      <div className="rounded-3xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-center text-sm">
        {error}
      </div>
    );
  }
  if (!slot) return null;

  const currentPrayer = prayers.find((p) => p.name === slot.current);
  const nextPrayer = prayers.find((p) => p.name === slot.next);
  const sunriseStr = extraTimings.Sunrise
    ? formatTime12(extraTimings.Sunrise, { am: t('prayer.am'), pm: t('prayer.pm') })
    : '';
  const sunsetStr = extraTimings.Sunset
    ? formatTime12(extraTimings.Sunset, { am: t('prayer.am'), pm: t('prayer.pm') })
    : '';

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-border bg-card text-card-foreground relative overflow-hidden shadow-sm"
    >
      {/* ═══ Hero (Current | Next) ════════════════════════════════════════ */}
      <Hero
        currentPrayer={currentPrayer}
        nextPrayer={nextPrayer}
        locationLabel={locationName || t('prayer.locationFallback')}
        language={language}
        t={t}
      />

      {/* ═══ Arc strip ════════════════════════════════════════════════════ */}
      <ArcStrip
        prayers={prayers}
        sunT={sunT}
        nextName={slot.next}
        makruhZones={makruhZones}
        currentMakruh={currentMakruh}
        arcGeom={arcGeom}
        isNight={isNight}
        isDark={isDark}
        sunriseStr={sunriseStr}
        sunsetStr={sunsetStr}
        language={language}
        t={t}
      />

      {/* ═══ Hijri Calendar Strip — separator ════════════════════════════ */}
      <HijriCalendarStrip language={language} t={t} />

      {/* ═══ Prayer slab ══════════════════════════════════════════════════ */}
      <Slab
        prayers={prayers}
        doneStates={doneStates}
        doneCount={doneCount}
        activeName={slot.current}
        shakeCounter={shakeCounter}
        guideCounter={guideCounter}
        onToggle={handleToggle}
        isDark={isDark}
        language={language}
        t={t}
      />
    </motion.div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero({
  currentPrayer,
  nextPrayer,
  locationLabel,
  language,
  t,
}: {
  currentPrayer?: PrayerTime;
  nextPrayer?: PrayerTime;
  locationLabel: string;
  language: string;
  t: (k: string) => string;
}) {
  const nameOf = (p?: PrayerTime) =>
    p ? (language === 'ar' ? p.ar : p.name === 'Fajr' || p.name === 'Dhuhr' || p.name === 'Asr' || p.name === 'Maghrib' || p.name === 'Isha' ? t(`prayer.${p.name.toLowerCase()}`) : p.name) : '—';

  return (
    <div className="grid grid-cols-2 divide-x divide-border/40">
      {/* Current */}
      <div className="bg-card px-4 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[8.5px] font-semibold tracking-[0.09em] uppercase text-muted-foreground/80 truncate">
            {locationLabel}
          </span>
          <span className="text-[8px] font-bold uppercase text-primary/75 shrink-0">
            {t('prayer.local')}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[20px] font-medium leading-none truncate">
            {nameOf(currentPrayer)}
          </span>
          <span
            className="text-[17px] font-light tabular-nums text-muted-foreground/70 shrink-0"
            dir="ltr"
          >
            {currentPrayer?.time ?? '--:--'}
          </span>
        </div>
      </div>

      {/* Next — slightly darker bg using muted/30 to mimic surfaceContainer */}
      <div className="bg-muted/30 px-4 pt-3 pb-2.5">
        <div className="text-[8.5px] font-semibold tracking-[0.09em] uppercase text-muted-foreground/80 mb-1.5">
          {t('prayer.next')}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[17px] font-medium leading-none truncate">
            {nameOf(nextPrayer)}
          </span>
          <span
            className="text-[13px] font-light tabular-nums text-muted-foreground/70 shrink-0"
            dir="ltr"
          >
            {nextPrayer?.time ?? '--:--'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Arc strip ──────────────────────────────────────────────────────────────
function ArcStrip({
  prayers,
  sunT,
  nextName,
  makruhZones,
  currentMakruh,
  arcGeom,
  isNight,
  isDark,
  sunriseStr,
  sunsetStr,
  language,
  t,
}: {
  prayers: PrayerTime[];
  sunT: number;
  nextName: PrayerKey;
  makruhZones: MakruhZone[];
  currentMakruh: MakruhZone | undefined;
  arcGeom: ArcGeom;
  isNight: boolean;
  isDark: boolean;
  sunriseStr: string;
  sunsetStr: string;
  language: string;
  t: (k: string) => string;
}) {
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const showStars = isDark && isNight;

  // Tint overlay when inside a makruh zone
  let tint = 'transparent';
  if (currentMakruh) {
    tint =
      currentMakruh.label === 'Zawal' ? MAKRUH_TINT_SOLAR : MAKRUH_TINT_HORIZON;
  }

  // Arc paths
  const fullPath = useMemo(() => buildArcPath(0, 1, 60, arcGeom), [arcGeom]);
  const pastPath = useMemo(
    () => (sunT > 0 ? buildArcPath(0, Math.min(1, sunT), Math.max(1, Math.floor(sunT * 60)), arcGeom) : ''),
    [sunT, arcGeom]
  );

  const sunX = arcX(sunT);
  const sunY = arcCurveY(sunT, arcGeom);

  return (
    <div
      className="relative bg-muted/10"
      style={{
        backgroundColor: tint === 'transparent' ? undefined : tint,
        aspectRatio: `${ARC_W} / ${ARC_H}`,
      }}
    >
      <svg
        viewBox={`0 0 ${ARC_W} ${ARC_H}`}
        className="w-full h-full block select-none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* Stars (only at night in dark mode) */}
        {showStars && (
          <g>
            {STARS.map((s, i) => (
              <motion.circle
                key={i}
                cx={ARC_PAD_X + s.x * ((ARC_W - 2 * ARC_PAD_X) / 130)}
                cy={Math.min(
                  ARC_LINE_Y + ARC_NIGHT_AMPL,
                  ARC_LINE_Y - ARC_DAY_AMPL + (s.y / 60) * (ARC_DAY_AMPL + ARC_NIGHT_AMPL + 12)
                )}
                r={s.r * 1.1}
                fill="white"
                animate={{ opacity: [0.1, 0.5, 0.1] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: s.delayMs / 1000,
                  ease: 'easeInOut',
                  repeatType: 'reverse',
                }}
              />
            ))}
          </g>
        )}

        {/* Horizon hairline */}
        <line
          x1={ARC_PAD_X}
          y1={ARC_LINE_Y}
          x2={ARC_W - ARC_PAD_X}
          y2={ARC_LINE_Y}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={1}
        />

        {/* Full 24h path (dashed) */}
        <path
          d={fullPath}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={1.5}
          strokeDasharray="4 6"
        />

        {/* Past trail (solid, primary tint) */}
        {pastPath && (
          <path
            d={pastPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeOpacity={0.55}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Makruh zones */}
        {makruhZones.map((mk, i) => {
          const expanded = expandedZone === i;
          return (
            <path
              key={mk.label}
              d={buildArcPath(mk.tStart, mk.tEnd, 12, arcGeom)}
              fill="none"
              stroke={MAKRUH_RED}
              strokeOpacity={expanded ? 0.7 : 0.6}
              strokeWidth={expanded ? 6 : 4}
              strokeLinecap="round"
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setExpandedZone(expanded ? null : i)}
            />
          );
        })}

        {/* Prayer dots + labels */}
        {prayers.map((p) => {
          const isNext = p.name === nextName;
          const isPast = sunT > p.arcT;
          const px = arcX(p.arcT);
          const py = arcCurveY(p.arcT, arcGeom);
          const dotColor = isDark ? p.dotDark : p.dotLight;
          return (
            <g key={p.name}>
              {isNext && (
                <circle
                  cx={px}
                  cy={py}
                  r={9}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  strokeWidth={1.2}
                />
              )}
              <circle
                cx={px}
                cy={py}
                r={isNext ? 4 : 3.5}
                fill={dotColor}
                fillOpacity={isNext ? 1 : isPast ? 0.85 : 0.4}
              />
              <text
                x={px}
                y={py + 14}
                textAnchor="middle"
                fontSize={isNext ? 7.5 : 7}
                fontWeight={isNext ? 700 : 500}
                fill="currentColor"
                fillOpacity={isNext ? 0.9 : 0.5}
              >
                {language === 'ar' ? p.ar : p.name}
              </text>
            </g>
          );
        })}

        {/* Sun / Moon */}
        <g>
          {/* Outer glow */}
          <circle
            cx={sunX}
            cy={sunY}
            r={20}
            fill={isNight ? MOON_COLOR : SUN_COLOR}
            fillOpacity={0.15}
          />
          {isNight ? (
            <>
              {/* Crescent moon: filled circle minus offset surface circle */}
              <circle cx={sunX} cy={sunY} r={6} fill={MOON_COLOR} fillOpacity={0.85} />
              <circle
                cx={sunX + 2.5}
                cy={sunY - 1}
                r={5}
                fill={isDark ? '#0b1230' : '#ffffff'}
              />
            </>
          ) : (
            <motion.circle
              cx={sunX}
              cy={sunY}
              r={6}
              fill={SUN_COLOR}
              animate={{ r: [5.5, 6.5, 5.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </g>
      </svg>

      {/* Sunrise / Sunset corner labels */}
      {sunriseStr && (
        <div className="absolute bottom-1.5 left-3 flex items-center gap-1 pointer-events-none">
          <SunriseIcon className="w-3 h-3 text-amber-400/85" />
          <span className="text-[9px] font-medium text-muted-foreground/70 leading-none">
            {language === 'ar' ? 'شروق' : 'Sunrise'}
          </span>
          <span className="text-[9px] font-medium tabular-nums leading-none" dir="ltr">
            {sunriseStr}
          </span>
        </div>
      )}
      {sunsetStr && (
        <div className="absolute bottom-1.5 right-3 flex items-center gap-1 pointer-events-none">
          <span className="text-[9px] font-medium tabular-nums leading-none" dir="ltr">
            {sunsetStr}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground/70 leading-none">
            {language === 'ar' ? 'غروب' : 'Sunset'}
          </span>
          <SunriseIcon className="w-3 h-3 text-indigo-400/70 rotate-180" />
        </div>
      )}

      {/* Makruh badge top-right */}
      {currentMakruh && (
        <div
          className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded text-[7px] font-bold tracking-wide"
          style={{
            backgroundColor:
              currentMakruh.label === 'Zawal'
                ? `${MAKRUH_BADGE_RED}30`
                : `${MAKRUH_BADGE_AMBER}30`,
            color:
              currentMakruh.label === 'Zawal'
                ? MAKRUH_BADGE_RED
                : MAKRUH_BADGE_AMBER,
          }}
        >
          {t('prayer.makruh').toUpperCase()} ·{' '}
          {language === 'ar'
            ? t(`prayer.makruh.${currentMakruh.label.toLowerCase()}`)
            : currentMakruh.label.toUpperCase()}
        </div>
      )}

      {/* Expanded makruh overlay (tap a zone to learn) */}
      <AnimatePresence>
        {expandedZone != null && makruhZones[expandedZone] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.86)' }}
            onClick={() => setExpandedZone(null)}
          >
            <p className="text-[7.5px] font-bold tracking-wide" style={{ color: '#F06045' }}>
              {t('prayer.makruh').toUpperCase()} ·{' '}
              {language === 'ar'
                ? t(`prayer.makruh.${makruhZones[expandedZone].label.toLowerCase()}`)
                : makruhZones[expandedZone].label.toUpperCase()}
            </p>
            <p className="mt-1 text-[10.5px] leading-[16px] text-white/80 font-light">
              {t(`prayer.makruh.desc.${makruhZones[expandedZone].label.toLowerCase()}`)}
            </p>
            <p className="mt-2 text-[8px] text-white/30">{t('prayer.tapDismiss')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Slab ───────────────────────────────────────────────────────────────────
function Slab({
  prayers,
  doneStates,
  doneCount,
  activeName,
  shakeCounter,
  guideCounter,
  onToggle,
  isDark,
  language,
  t,
}: {
  prayers: PrayerTime[];
  doneStates: Record<PrayerKey, boolean>;
  doneCount: number;
  activeName: PrayerKey;
  shakeCounter: Record<PrayerKey, number>;
  guideCounter: Record<PrayerKey, number>;
  onToggle: (k: PrayerKey) => void;
  isDark: boolean;
  language: string;
  t: (k: string) => string;
}) {
  // First not-yet-done prayer (suggested next)
  const nextToPray = PRAYER_KEYS.find((k) => !doneStates[k]) ?? null;

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-muted-foreground">
          {t('prayer.todaysPrayers')}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground/75 tabular-nums">
          {doneCount} {t('prayer.of')} 5
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-[2.5px] rounded-sm bg-foreground/10 overflow-hidden">
        <motion.div
          className="h-full rounded-sm bg-primary"
          initial={false}
          animate={{ width: `${(doneCount / 5) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="mt-3">
        {prayers.map((p, idx) => {
          const isPrayed = doneStates[p.name];
          const isNext = !isPrayed && nextToPray === p.name;
          const isActive = p.name === activeName;
          const dotColor = isDark ? p.dotDark : p.dotLight;
          return (
            <SlabRow
              key={p.name}
              prayer={p}
              isPrayed={isPrayed}
              isNext={isNext}
              isActive={isActive}
              dotColor={dotColor}
              shakeKey={shakeCounter[p.name]}
              guideKey={guideCounter[p.name]}
              onToggle={() => onToggle(p.name)}
              language={language}
              t={t}
              showDivider={idx < prayers.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}

function SlabRow({
  prayer,
  isPrayed,
  isNext,
  isActive,
  dotColor,
  shakeKey,
  guideKey,
  onToggle,
  language,
  t,
  showDivider,
}: {
  prayer: PrayerTime;
  isPrayed: boolean;
  isNext: boolean;
  isActive: boolean;
  dotColor: string;
  shakeKey: number;
  guideKey: number;
  onToggle: () => void;
  language: string;
  t: (k: string) => string;
  showDivider: boolean;
}) {
  // Shake on rejection: re-fires whenever shakeKey increments
  const shakeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (shakeKey === 0 || !shakeRef.current) return;
    const el = shakeRef.current;
    const anim = el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(9px)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 360, easing: 'ease-out' }
    );
    return () => anim.cancel();
  }, [shakeKey]);

  // Guide pulse: 150ms in, 420ms out
  const [guideAlpha, setGuideAlpha] = useState(0);
  useEffect(() => {
    if (guideKey === 0) return;
    setGuideAlpha(0.22);
    const timeout = setTimeout(() => setGuideAlpha(0), 150);
    return () => clearTimeout(timeout);
  }, [guideKey]);

  return (
    <>
      <div
        ref={shakeRef}
        onClick={onToggle}
        className="relative flex items-center gap-2.5 py-2 cursor-pointer rounded-2xl transition-colors px-2"
        style={{
          backgroundColor: guideAlpha > 0 ? `hsl(var(--primary) / ${guideAlpha})` : 'transparent',
          transition: 'background-color 420ms ease',
        }}
      >
        {/* Color dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: isPrayed ? 'hsl(var(--foreground) / 0.1)' : dotColor,
          }}
        />

        {/* Checkbox */}
        <div
          className={`w-[18px] h-[18px] rounded-full border-[1.6px] flex items-center justify-center shrink-0 ${
            isPrayed ? 'bg-foreground/10 border-foreground/20' : 'border-foreground/15'
          }`}
        >
          {isPrayed && <Check className="w-3 h-3 text-foreground/65" strokeWidth={3} />}
        </div>

        {/* Name (English/transliterated) */}
        <span
          className={`text-[14px] flex-1 truncate ${
            isPrayed
              ? 'text-foreground/40 font-light'
              : isNext
                ? 'font-semibold'
                : 'font-light'
          }`}
        >
          {language === 'ar' ? prayer.ar : t(`prayer.${prayer.name.toLowerCase()}`)}
        </span>

        {/* NEXT badge */}
        {isNext && (
          <span className="text-[7.5px] font-bold tracking-[0.1em] text-primary me-2 shrink-0">
            {t('prayer.next.short')}
          </span>
        )}

        {/* "Pray" pill — for the active (current-window) prayer */}
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Just acknowledge tap; could open a Qibla / pray-tracker modal
            }}
            className="px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wide bg-primary/10 text-primary shrink-0"
          >
            {t('prayer.pray')}
          </button>
        )}

        {/* Arabic name (only when UI lang is not Arabic) */}
        {language !== 'ar' && (
          <span className="text-[14px] text-foreground/50 shrink-0">
            {prayer.ar}
          </span>
        )}

        {/* Time */}
        <span
          className="text-[13px] font-medium text-foreground/70 tabular-nums min-w-[60px] text-end shrink-0"
          dir="ltr"
        >
          {prayer.time}
        </span>
      </div>
      {showDivider && <div className="h-px bg-foreground/5 mx-2" />}
    </>
  );
}

// ─── Hijri Calendar Strip ───────────────────────────────────────────────────
/**
 * A compact horizontal strip showing today's Hijri date + upcoming Islamic
 * occasions as scrollable pills. Tapping the ALL button or the arrow navigates
 * to the full /occasions calendar page.
 */
function HijriCalendarStrip({
  language,
  t,
}: {
  language: string;
  t: (k: string) => string;
}) {
  const navigate = useNavigate();
  const hijri = useMemo(() => getTodayHijri(), []);
  const occasions = useMemo(() => getUpcomingOccasions(6), []);

  // Accent hex per color class
  const accentMap: Record<string, string> = {
    'border-l-emerald-500': '#10b981',
    'border-l-emerald-600': '#059669',
    'border-l-sky-500': '#0ea5e9',
    'border-l-violet-500': '#8b5cf6',
    'border-l-amber-500': '#f59e0b',
    'border-l-yellow-500': '#eab308',
    'border-l-yellow-600': '#ca8a04',
  };

  return (
    <div>
      {/* خط فاصل خفيف */}
      <div className="mx-4 h-px bg-border/20" />

      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
        {/* Today Hijri */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 text-primary/70" />
          <span className="text-[11px] font-semibold text-muted-foreground" dir="rtl">
            {formatHijriDate(hijri)}
          </span>
        </div>

        {/* ALL button */}
        <button
          onClick={() => navigate('/occasions')}
          className="flex items-center gap-0.5 text-primary/80 hover:text-primary transition-colors"
          aria-label={language === 'ar' ? 'عرض التقويم كاملاً' : 'View full calendar'}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide">
            {language === 'ar' ? 'الكل' : 'ALL'}
          </span>
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* ── Occasions horizontal scroll ─────────────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto pb-2.5 px-4 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        dir="rtl"
      >
        {occasions.map((occ) => {
          const daysLeft = getDaysUntil(occ.gregorianDate);
          const isToday = daysLeft === 0;
          const accent = accentMap[occ.color] ?? '#10b981';

          return (
            <button
              key={occ.id}
              onClick={() => navigate('/occasions')}
              className="flex-shrink-0 flex flex-col gap-0.5 rounded-xl px-3 py-2 min-w-[120px] max-w-[140px] text-right active:opacity-70 transition-opacity"
              style={{ background: `${accent}12`, borderLeft: `2px solid ${accent}40` }}
            >
              {/* Days countdown + month */}
              <div className="flex items-center justify-between w-full">
                <span
                  className="text-[9px] font-bold uppercase tracking-wide"
                  style={{ color: accent }}
                >
                  {isToday
                    ? (language === 'ar' ? 'اليوم' : 'TODAY')
                    : language === 'ar'
                      ? `${daysLeft} يوم`
                      : `IN ${daysLeft}D`}
                </span>
                <span className="text-[8.5px] text-muted-foreground/70 tabular-nums">
                  {occ.hijriDay} {occ.hijriMonth}
                </span>
              </div>

              {/* Name */}
              <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2 w-full">
                {occ.name}
              </p>
            </button>
          );
        })}

        {/* "Show all" terminal button */}
        <button
          onClick={() => navigate('/occasions')}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 min-w-[60px] active:opacity-70 transition-opacity"
          style={{ background: 'hsl(var(--primary) / 0.08)' }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-[8.5px] font-bold text-primary/70 uppercase tracking-wide">
            {language === 'ar' ? 'الكل' : 'ALL'}
          </span>
        </button>
      </div>

      {/* خط فاصل خفيف أسفل */}
      <div className="mx-4 h-px bg-border/20" />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
/** True if the current effective theme is dark. */
function useIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  useEffect(() => {
    if (theme === 'dark') return setIsDark(true);
    if (theme === 'light') return setIsDark(false);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
  return isDark;
}
