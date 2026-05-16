import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Bell } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { fetchPrayerTimings as fetchPrayerTimingsCached } from '@/hooks/usePrayerTimesCache';

/**
 * PrayerTimes — sky-panorama hero card.
 *
 * The top "panorama" depicts a horizon with a continuous arc that mirrors
 * the sun's path through the day. The arc carries five labelled markers,
 * one per obligatory prayer, sitting on the curve at exactly the time-of-day
 * fraction of that prayer between sunrise and sunset (Fajr & Isha are
 * placed before/after the lit arc on the night side). The sun (or moon
 * during night) glides along the arc in real time and the entire palette
 * shifts smoothly between dawn / noon / dusk / night.
 *
 * Below the panorama:
 *  - Sunset / sunrise labels at the horizon line.
 *  - Big "next prayer" header with countdown.
 *  - A 5-cell strip showing every daily prayer with its local time and an
 *    "active" pill on the current one. A "Pray" pill blinks on the entry
 *    whose time is within ±15 minutes of now.
 */

// ─── Types & constants ──────────────────────────────────────────────────────
interface PrayerTime {
  name: string;
  time: string; // "HH:MM"
}

const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerKey = (typeof PRAYER_KEYS)[number];

const PRAYER_LABEL_KEYS: Record<PrayerKey, string> = {
  Fajr: 'prayer.fajr',
  Dhuhr: 'prayer.dhuhr',
  Asr: 'prayer.asr',
  Maghrib: 'prayer.maghrib',
  Isha: 'prayer.isha',
};

const PRAYER_AR_LABEL: Record<PrayerKey, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

// Per-prayer accent on the panorama markers
const PRAYER_ACCENT: Record<PrayerKey, string> = {
  Fajr: '#9aa6ff', // pre-dawn lavender
  Dhuhr: '#fff7c2', // bright noon cream
  Asr: '#ffc88a', // golden afternoon
  Maghrib: '#ff7e8a', // dusk rose
  Isha: '#7c8fff', // deep night blue
};

// ─── Time helpers ───────────────────────────────────────────────────────────
function parseHM(time?: string): number | null {
  if (!time) return null;
  const clean = time.replace(/\s*\(.*\)/, '').trim();
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatTime12(time24?: string, t?: (k: string) => string): string {
  if (!time24) return '--:--';
  const minutes = parseHM(time24);
  if (minutes == null) return '--:--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = t
    ? h >= 12
      ? t('prayer.pm')
      : t('prayer.am')
    : h >= 12
      ? 'PM'
      : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function getNextPrayer(
  prayers: PrayerTime[],
  t: (k: string) => string
): { prayer: PrayerTime | null; remaining: string; remainingMinutes: number } {
  const cur = nowMinutes();
  for (const p of prayers) {
    const m = parseHM(p.time);
    if (m != null && m > cur) {
      const diff = m - cur;
      return { prayer: p, remaining: formatRemaining(diff, t), remainingMinutes: diff };
    }
  }
  // After Isha — next is tomorrow's Fajr
  if (prayers.length > 0) {
    const fajr = prayers[0];
    const fm = parseHM(fajr.time);
    if (fm != null) {
      const diff = 24 * 60 - cur + fm;
      return { prayer: fajr, remaining: formatRemaining(diff, t), remainingMinutes: diff };
    }
  }
  return { prayer: null, remaining: '', remainingMinutes: 0 };
}

function formatRemaining(diffMin: number, t: (k: string) => string): string {
  const totalMin = Math.max(0, Math.ceil(diffMin));
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return `${hours} ${t('prayer.hour')} ${t('prayer.and')} ${mins} ${t('prayer.minute')}`;
  }
  return `${mins} ${t('prayer.minute')}`;
}

// ─── Sky palette per period ─────────────────────────────────────────────────
type Period = 'night' | 'fajr' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk';

function periodLabel(p: Period, ar: boolean): string {
  if (ar) {
    return {
      night: 'الليل',
      fajr: 'الفجر',
      morning: 'الصباح',
      noon: 'الظهيرة',
      afternoon: 'العصر',
      sunset: 'الغروب',
      dusk: 'الغسق',
    }[p];
  }
  return {
    night: 'Night',
    fajr: 'Fajr',
    morning: 'Morning',
    noon: 'Noon',
    afternoon: 'Afternoon',
    sunset: 'Sunset',
    dusk: 'Dusk',
  }[p];
}

interface SkyPalette {
  period: Period;
  /** Sky gradient: top-of-panorama → horizon */
  topColor: string;
  midColor: string;
  bottomColor: string;
  /** Color of the sun/moon body */
  bodyColor: string;
  bodyGlow: string;
  /** Star opacity (0 hides them) */
  starOpacity: number;
  /** Should we draw moon (else sun) */
  showMoon: boolean;
  /** Foreground accent (text/labels) */
  fg: string;
  fgMuted: string;
}

function paletteFor(
  cur: number,
  fajr: number | null,
  sunrise: number | null,
  dhuhr: number | null,
  asr: number | null,
  maghrib: number | null,
  isha: number | null
): SkyPalette {
  const inRange = (a: number | null, b: number | null) =>
    a != null && b != null && cur >= a && cur < b;

  // Night (after Isha or before Fajr)
  if (isha != null && fajr != null && (cur >= isha || cur < fajr)) {
    return {
      period: 'night',
      topColor: '#0b1230',
      midColor: '#142154',
      bottomColor: '#1d2c6e',
      bodyColor: '#e8eeff',
      bodyGlow: 'rgba(180, 200, 255, 0.5)',
      starOpacity: 1,
      showMoon: true,
      fg: '#ffffff',
      fgMuted: 'rgba(255,255,255,0.7)',
    };
  }
  // Fajr → sunrise: pre-dawn
  if (inRange(fajr, sunrise)) {
    return {
      period: 'fajr',
      topColor: '#1a1f4a',
      midColor: '#5a3f78',
      bottomColor: '#f0a07a',
      bodyColor: '#ffd7a8',
      bodyGlow: 'rgba(255, 200, 140, 0.55)',
      starOpacity: 0.4,
      showMoon: false,
      fg: '#ffffff',
      fgMuted: 'rgba(255,255,255,0.78)',
    };
  }
  // Sunrise → Dhuhr: morning
  if (inRange(sunrise, dhuhr)) {
    return {
      period: 'morning',
      topColor: '#6db8ff',
      midColor: '#a5d4ff',
      bottomColor: '#ffe8b8',
      bodyColor: '#ffe48a',
      bodyGlow: 'rgba(255, 220, 130, 0.7)',
      starOpacity: 0,
      showMoon: false,
      fg: '#ffffff',
      fgMuted: 'rgba(255,255,255,0.85)',
    };
  }
  // Dhuhr → Asr: high noon, brightest blue
  if (inRange(dhuhr, asr)) {
    return {
      period: 'noon',
      topColor: '#3b8dd8',
      midColor: '#74c0ee',
      bottomColor: '#cfe6f6',
      bodyColor: '#fff6c8',
      bodyGlow: 'rgba(255, 240, 180, 0.85)',
      starOpacity: 0,
      showMoon: false,
      fg: '#ffffff',
      fgMuted: 'rgba(255,255,255,0.85)',
    };
  }
  // Asr → Maghrib: golden hour
  if (inRange(asr, maghrib)) {
    return {
      period: 'afternoon',
      topColor: '#5e7fbe',
      midColor: '#dba66c',
      bottomColor: '#ffc788',
      bodyColor: '#ffb868',
      bodyGlow: 'rgba(255, 165, 90, 0.75)',
      starOpacity: 0,
      showMoon: false,
      fg: '#ffffff',
      fgMuted: 'rgba(255,255,255,0.85)',
    };
  }
  // Maghrib → Isha: dusk
  if (inRange(maghrib, isha)) {
    return {
      period: 'dusk',
      topColor: '#1c1f55',
      midColor: '#7d3a78',
      bottomColor: '#e6776a',
      bodyColor: '#ff8a6a',
      bodyGlow: 'rgba(255, 130, 100, 0.65)',
      starOpacity: 0.3,
      showMoon: false,
      fg: '#ffffff',
      fgMuted: 'rgba(255,255,255,0.78)',
    };
  }
  // Fallback: neutral evening
  return {
    period: 'night',
    topColor: '#0b1230',
    midColor: '#142154',
    bottomColor: '#1d2c6e',
    bodyColor: '#e8eeff',
    bodyGlow: 'rgba(180, 200, 255, 0.5)',
    starOpacity: 1,
    showMoon: true,
    fg: '#ffffff',
    fgMuted: 'rgba(255,255,255,0.7)',
  };
}

// ─── Arc geometry ───────────────────────────────────────────────────────────
// Panorama is drawn in a 320×130 viewBox. The arc represents *day*: it goes
// from sunrise (left horizon) over a peak around the middle (solar noon) and
// down to sunset (right horizon). Times before sunrise and after sunset are
// placed *below* the horizon line at fixed positions left/right.

const VB_W = 320;
const VB_H = 130;
const HORIZON_Y = 110;
const ARC_PEAK_Y = 28;
const ARC_LEFT_X = 24;
const ARC_RIGHT_X = VB_W - 24;

/** Position of `min` minutes on the panorama, given sunrise/sunset minutes. */
function positionFor(
  min: number,
  sunrise: number,
  sunset: number
): { x: number; y: number; onArc: boolean } {
  // Below-horizon: left of arc (before sunrise) or right (after sunset)
  if (min <= sunrise) {
    const t = Math.max(0, Math.min(1, (sunrise - min) / 90)); // 90-min wedge
    const x = ARC_LEFT_X - 14 - t * 6;
    const y = HORIZON_Y + 6 + t * 8;
    return { x, y, onArc: false };
  }
  if (min >= sunset) {
    const t = Math.max(0, Math.min(1, (min - sunset) / 90));
    const x = ARC_RIGHT_X + 14 + t * 6;
    const y = HORIZON_Y + 6 + t * 8;
    return { x, y, onArc: false };
  }
  // On arc: parameterise t in [0..1] from sunrise → sunset, and shape with
  // a shifted-cosine so the apex sits at solar noon.
  const t = (min - sunrise) / Math.max(1, sunset - sunrise);
  const x = ARC_LEFT_X + t * (ARC_RIGHT_X - ARC_LEFT_X);
  // Bell curve: y = horizon - sin(πt) * height
  const height = HORIZON_Y - ARC_PEAK_Y;
  const y = HORIZON_Y - Math.sin(t * Math.PI) * height;
  return { x, y, onArc: true };
}

/** SVG path for the day arc itself. */
function arcPath(): string {
  const cx = (ARC_LEFT_X + ARC_RIGHT_X) / 2;
  const cy = ARC_PEAK_Y - 8; // pull control point above peak
  return `M ${ARC_LEFT_X} ${HORIZON_Y} Q ${cx} ${cy} ${ARC_RIGHT_X} ${HORIZON_Y}`;
}

/** Star field — fixed seed so it doesn't jitter every render. */
const STARS: { x: number; y: number; r: number; o: number }[] = (() => {
  let s = 0xb16b00b5;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const arr: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < 50; i++) {
    arr.push({
      x: rand() * VB_W,
      y: rand() * (HORIZON_Y - 8),
      r: 0.4 + rand() * 0.7,
      o: 0.5 + rand() * 0.5,
    });
  }
  return arr;
})();

// ─── Component ──────────────────────────────────────────────────────────────
export default function PrayerTimes() {
  const { prayerMadhab, latitudeAdjMethod, dstEnabled, t, language } = useApp();
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [extraTimings, setExtraTimings] = useState<{ Sunrise?: string; Sunset?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [now, setNow] = useState(() => new Date());

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
          .catch(() => {});

        const timings = await fetchPrayerTimingsCached(
          lat,
          lng,
          schoolParam,
          latAdjParam
        );
        if (timings) {
          const result: PrayerTime[] = PRAYER_KEYS.map((key) => ({
            name: key,
            time: timings[key],
          }));
          setPrayers(result);
          setExtraTimings({
            Sunrise: timings.Sunrise,
            Sunset: timings.Sunset || timings.Maghrib, // fall back to Maghrib if Sunset missing
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

  useEffect(() => {
    const cached = localStorage.getItem('lastLocation');
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      fetchPrayers(lat, lng);
    } else {
      // Default to Mecca if no saved location
      fetchPrayers(21.4225, 39.8262);
    }
  }, [fetchPrayers]);

  // Tick every 30 s — sun moves visibly within a minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const cur = useMemo(
    () => now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
    [now]
  );
  const sunrise = parseHM(extraTimings.Sunrise);
  const sunset = parseHM(extraTimings.Sunset);
  const fajr = parseHM(prayers.find((p) => p.name === 'Fajr')?.time);
  const dhuhr = parseHM(prayers.find((p) => p.name === 'Dhuhr')?.time);
  const asr = parseHM(prayers.find((p) => p.name === 'Asr')?.time);
  const maghrib = parseHM(prayers.find((p) => p.name === 'Maghrib')?.time);
  const isha = parseHM(prayers.find((p) => p.name === 'Isha')?.time);

  const palette = useMemo(
    () => paletteFor(cur, fajr, sunrise, dhuhr, asr, maghrib, isha),
    [cur, fajr, sunrise, dhuhr, asr, maghrib, isha]
  );

  // Sun/moon position on arc. We use the SAME arc shape for both — during
  // day the sun crawls left → right between sunrise and sunset; at night
  // the moon traces the same arc but parameterised by how far the night
  // has progressed (start of night → moon at left, end → moon at right).
  const bodyPos = useMemo(() => {
    if (sunrise == null || sunset == null) {
      return { x: VB_W / 2, y: ARC_PEAK_Y, onArc: true };
    }
    if (palette.showMoon) {
      // The night runs sunset → next sunrise (≈ +24h). The moon rises in
      // the East (right side as drawn) and sets in the West (left side),
      // so as `tNight` goes 0→1 the moon should travel right → left.
      const nightLen = 24 * 60 - sunset + sunrise;
      let elapsed: number;
      if (cur >= sunset) elapsed = cur - sunset;
      else elapsed = 24 * 60 - sunset + cur;
      const tNight = Math.max(0, Math.min(1, elapsed / nightLen));
      const x = ARC_RIGHT_X - tNight * (ARC_RIGHT_X - ARC_LEFT_X);
      const height = HORIZON_Y - ARC_PEAK_Y;
      const y = HORIZON_Y - Math.sin(tNight * Math.PI) * height * 0.85;
      return { x, y, onArc: true };
    }
    return positionFor(cur, sunrise, sunset);
  }, [cur, sunrise, sunset, palette.showMoon]);

  // Marker positions for each prayer along the arc
  const markers = useMemo(() => {
    if (sunrise == null || sunset == null) return [];
    return PRAYER_KEYS.map((key) => {
      const p = prayers.find((x) => x.name === key);
      const m = parseHM(p?.time);
      if (m == null) return null;
      const pos = positionFor(m, sunrise, sunset);
      return { key, time: p!.time, ...pos };
    }).filter(Boolean) as Array<{
      key: PrayerKey;
      time: string;
      x: number;
      y: number;
      onArc: boolean;
    }>;
  }, [prayers, sunrise, sunset]);

  // Next prayer
  const next = useMemo(() => getNextPrayer(prayers, t), [prayers, t, now]);
  const activePrayerName = next.prayer?.name ?? null;

  // Prayer that is "due now" (within ±15 min of its scheduled time)
  const dueNowName = useMemo(() => {
    for (const p of prayers) {
      const m = parseHM(p.time);
      if (m == null) continue;
      if (Math.abs(cur - m) <= 15) return p.name;
    }
    return null;
  }, [prayers, cur]);

  // ─── Render guards ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-3xl bg-card border border-border p-5 text-card-foreground animate-pulse min-h-[280px]" />
    );
  }
  if (error) {
    return (
      <div className="rounded-3xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-center text-sm">
        {error}
      </div>
    );
  }

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl bg-card border border-border text-card-foreground relative overflow-hidden"
    >
      {/* ═══ Sky panorama ════════════════════════════════════════════════ */}
      <div className="relative" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-full block select-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            {/* Smoothly-shifting sky gradient */}
            <linearGradient id="prayerSky" x1="0" y1="0" x2="0" y2="1">
              <motion.stop
                offset="0%"
                animate={{ stopColor: palette.topColor }}
                transition={{ duration: 1.2 }}
              />
              <motion.stop
                offset="55%"
                animate={{ stopColor: palette.midColor }}
                transition={{ duration: 1.2 }}
              />
              <motion.stop
                offset="100%"
                animate={{ stopColor: palette.bottomColor }}
                transition={{ duration: 1.2 }}
              />
            </linearGradient>

            {/* Sun/moon glow */}
            <radialGradient id="prayerBodyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={palette.bodyColor} stopOpacity="0.85" />
              <stop offset="55%" stopColor={palette.bodyGlow} stopOpacity="0.45" />
              <stop offset="100%" stopColor={palette.bodyGlow} stopOpacity="0" />
            </radialGradient>

            {/* Soft underglow on horizon */}
            <radialGradient
              id="prayerHorizonGlow"
              cx="50%"
              cy="100%"
              r="60%"
              fx="50%"
              fy="100%"
            >
              <stop offset="0%" stopColor={palette.bodyColor} stopOpacity="0.4" />
              <stop offset="60%" stopColor={palette.bodyColor} stopOpacity="0.1" />
              <stop offset="100%" stopColor={palette.bodyColor} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sky fill */}
          <rect width={VB_W} height={VB_H} fill="url(#prayerSky)" />

          {/* Stars (only at night / dusk) */}
          {palette.starOpacity > 0 && (
            <g style={{ opacity: palette.starOpacity }}>
              {STARS.map((s, i) => (
                <motion.circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill="white"
                  fillOpacity={s.o}
                  animate={
                    i % 5 === 0
                      ? { opacity: [s.o, s.o * 0.3, s.o] }
                      : undefined
                  }
                  transition={
                    i % 5 === 0
                      ? {
                          duration: 2.5 + (i % 4) * 0.7,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: (i % 7) * 0.3,
                        }
                      : undefined
                  }
                />
              ))}
            </g>
          )}

          {/* Horizon underglow */}
          <rect
            x="0"
            y={HORIZON_Y - 28}
            width={VB_W}
            height="60"
            fill="url(#prayerHorizonGlow)"
          />

          {/* Day arc */}
          <path
            d={arcPath()}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="0.7"
            strokeDasharray="2 2"
          />

          {/* Horizon line */}
          <line
            x1="0"
            y1={HORIZON_Y}
            x2={VB_W}
            y2={HORIZON_Y}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="0.6"
          />

          {/* Prayer markers on the arc */}
          {markers.map((mk) => {
            const isActive = activePrayerName === mk.key;
            const accent = PRAYER_ACCENT[mk.key];
            // Label sits above the marker on the arc; below for off-arc
            const labelY = mk.onArc ? mk.y - 6 : mk.y + 10;
            return (
              <g key={mk.key}>
                {/* Vertical hairline drop to horizon (subtle) */}
                {mk.onArc && (
                  <line
                    x1={mk.x}
                    y1={mk.y + 2}
                    x2={mk.x}
                    y2={HORIZON_Y - 1}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.4"
                    strokeDasharray="1 2"
                  />
                )}
                {/* Halo when active */}
                {isActive && (
                  <motion.circle
                    cx={mk.x}
                    cy={mk.y}
                    r={6}
                    fill={accent}
                    fillOpacity={0.35}
                    animate={{ r: [4, 8, 4], opacity: [0.5, 0.05, 0.5] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
                {/* Solid dot */}
                <circle
                  cx={mk.x}
                  cy={mk.y}
                  r={isActive ? 2.8 : 2}
                  fill={accent}
                  stroke="white"
                  strokeWidth="0.7"
                />
                {/* Tiny prayer name label */}
                <text
                  x={mk.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="800"
                  fill={palette.fg}
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'rgba(0,0,0,0.45)',
                    strokeWidth: 0.7,
                    strokeLinejoin: 'round',
                    letterSpacing: '0.2px',
                  }}
                >
                  {language === 'ar' ? PRAYER_AR_LABEL[mk.key] : t(PRAYER_LABEL_KEYS[mk.key])}
                </text>
              </g>
            );
          })}

          {/* Sun / moon body */}
          <g>
            {/* Soft outer glow */}
            <circle
              cx={bodyPos.x}
              cy={bodyPos.y}
              r="14"
              fill="url(#prayerBodyGlow)"
            />
            {/* Inner glow ring */}
            {!palette.showMoon && (
              <motion.circle
                cx={bodyPos.x}
                cy={bodyPos.y}
                r="7"
                fill={palette.bodyColor}
                fillOpacity="0.25"
                animate={{ r: [6, 9, 6], opacity: [0.35, 0.1, 0.35] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
            {/* Body itself */}
            <motion.circle
              cx={bodyPos.x}
              cy={bodyPos.y}
              r="4"
              fill={palette.bodyColor}
              animate={
                palette.showMoon
                  ? {}
                  : { r: [3.8, 4.4, 3.8] }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            {/* Moon crescent shadow */}
            {palette.showMoon && (
              <circle
                cx={bodyPos.x + 1.4}
                cy={bodyPos.y - 0.4}
                r="3.4"
                fill={palette.midColor}
                opacity="0.85"
              />
            )}
          </g>
        </svg>

        {/* Sunrise / Sunset chips overlaid on horizon line */}
        <div
          className="absolute inset-x-0 flex items-center justify-between px-4 pointer-events-none"
          style={{ top: `calc(${(HORIZON_Y / VB_H) * 100}% + 6px)` }}
        >
          <div
            className="flex items-center gap-1 text-[10px] font-semibold tabular-nums"
            dir="ltr"
            style={{ color: palette.fgMuted }}
          >
            <span>{formatTime12(extraTimings.Sunrise, t)}</span>
            <span className="opacity-70 text-[9px]">
              {language === 'ar' ? '☀ شروق' : 'Sunrise'}
            </span>
          </div>
          <div
            className="flex items-center gap-1 text-[10px] font-semibold tabular-nums"
            dir="ltr"
            style={{ color: palette.fgMuted }}
          >
            <span className="opacity-70 text-[9px]">
              {language === 'ar' ? '🌇 غروب' : 'Sunset'}
            </span>
            <span>{formatTime12(extraTimings.Sunset, t)}</span>
          </div>
        </div>

        {/* Location chip — top-left, above the sky */}
        {locationName && (
          <div
            className="absolute top-2 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 pointer-events-none"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: palette.fg,
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <MapPin className="w-2.5 h-2.5" />
            {locationName}
          </div>
        )}

        {/* Period chip — top-right */}
        <div
          className="absolute top-2 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide pointer-events-none uppercase"
          style={{
            background: 'rgba(255,255,255,0.18)',
            color: palette.fg,
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          {periodLabel(palette.period, language === 'ar')}
        </div>
      </div>

      {/* ═══ Next prayer header ══════════════════════════════════════════ */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] opacity-70 leading-tight">
            {t('prayer.next')}
          </p>
          <p className="mt-0.5">
            <span className="text-[18px] font-bold leading-tight">
              {next.prayer ? t(PRAYER_LABEL_KEYS[next.prayer.name as PrayerKey]) : ''}
            </span>
            {next.prayer && (
              <span
                className="ml-2 text-[12px] font-semibold tabular-nums"
                dir="ltr"
              >
                {formatTime12(next.prayer.time, t)}
              </span>
            )}
          </p>
          {next.prayer && (
            <p className="text-[11.5px] opacity-75 mt-0.5">
              {t('prayer.remaining')} {next.remaining}
            </p>
          )}
        </div>
        <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <div className="h-px bg-border/60 mx-5" />

      {/* ═══ Prayer cells ═══════════════════════════════════════════════ */}
      <div className="px-3 pb-3 pt-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {prayers.map((p) => {
            const isActive = p.name === activePrayerName;
            const isDue = p.name === dueNowName;
            const accent = PRAYER_ACCENT[p.name as PrayerKey];
            return (
              <motion.div
                key={p.name}
                whileHover={{ y: -1 }}
                className={`relative rounded-2xl px-1 py-2.5 text-center transition-colors ${
                  isActive
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted/60 text-foreground'
                }`}
              >
                {/* Color dot */}
                <span
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                />
                <p className="text-[10.5px] font-semibold mt-1.5 leading-tight">
                  {t(PRAYER_LABEL_KEYS[p.name as PrayerKey])}
                </p>
                <p
                  className={`text-[10px] font-bold tabular-nums mt-0.5 ${
                    isActive ? '' : 'opacity-80'
                  }`}
                  dir="ltr"
                >
                  {formatTime12(p.time, t)}
                </p>
                {/* "Pray now" pill */}
                <AnimatePresence>
                  {isDue && (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wide"
                      style={{
                        background: accent,
                        color: '#1a1a1a',
                        boxShadow: `0 0 8px ${accent}`,
                      }}
                    >
                      {language === 'ar' ? 'صلِّ' : 'Pray'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
