import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Globe2, X, Maximize2, Search, Sparkles, Sun, MapPin } from 'lucide-react';

/**
 * Ummah Pulse — a live planetary view of Islamic prayer across the world.
 *
 * Goals of this component:
 *  - Show, in real time, where on Earth each of the five daily prayers is
 *    currently due based on precise solar geometry.
 *  - Highlight the Fajr "wave" sweeping westward each minute as dawn breaks.
 *  - Feel alive: smooth animations, tactile interactions, high-information
 *    density without clutter.
 *
 * Astronomy notes (all self-contained, no external libs):
 *  - Solar declination and Equation of Time are computed from day-of-year.
 *  - The sub-solar longitude accounts for EoT so the sun sits where it
 *    really is (within ~1°), not just at 12:00 UTC nominal.
 *  - Solar altitude is derived exactly from the spherical trig formula.
 *  - Asr timing uses the user's madhab (Hanafi = shadow factor 2, otherwise 1).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Data: major Muslim-population centers
// pop = approx Muslim population (millions) in the metro / surrounding region
// ─────────────────────────────────────────────────────────────────────────────
type City = { name: string; nameAr: string; lat: number; lng: number; pop: number };

const CITIES: City[] = [
  { name: 'Jakarta',       nameAr: 'جاكرتا',       lat: -6.2,  lng: 106.8, pop: 230 },
  { name: 'Karachi',       nameAr: 'كراتشي',       lat: 24.9,  lng: 67.0,  pop: 200 },
  { name: 'Dhaka',         nameAr: 'دكا',          lat: 23.8,  lng: 90.4,  pop: 165 },
  { name: 'Lahore',        nameAr: 'لاهور',        lat: 31.5,  lng: 74.3,  pop: 130 },
  { name: 'Cairo',         nameAr: 'القاهرة',      lat: 30.0,  lng: 31.2,  pop: 100 },
  { name: 'Istanbul',      nameAr: 'إسطنبول',      lat: 41.0,  lng: 28.9,  pop: 85 },
  { name: 'Makkah',        nameAr: 'مكة المكرمة',  lat: 21.4225, lng: 39.8262, pop: 90 },
  { name: 'Madinah',       nameAr: 'المدينة',      lat: 24.47, lng: 39.61, pop: 15 },
  { name: 'Tehran',        nameAr: 'طهران',        lat: 35.7,  lng: 51.4,  pop: 70 },
  { name: 'Riyadh',        nameAr: 'الرياض',       lat: 24.7,  lng: 46.7,  pop: 60 },
  { name: 'Baghdad',       nameAr: 'بغداد',        lat: 33.3,  lng: 44.4,  pop: 65 },
  { name: 'Kuala Lumpur',  nameAr: 'كوالالمبور',   lat: 3.1,   lng: 101.7, pop: 60 },
  { name: 'Casablanca',    nameAr: 'الدار البيضاء', lat: 33.6, lng: -7.6,  pop: 55 },
  { name: 'Algiers',       nameAr: 'الجزائر',      lat: 36.7,  lng: 3.1,   pop: 50 },
  { name: 'Tunis',         nameAr: 'تونس',         lat: 36.8,  lng: 10.2,  pop: 35 },
  { name: 'Khartoum',      nameAr: 'الخرطوم',      lat: 15.6,  lng: 32.5,  pop: 45 },
  { name: 'Lagos',         nameAr: 'لاغوس',        lat: 6.5,   lng: 3.4,   pop: 55 },
  { name: 'Damascus',      nameAr: 'دمشق',         lat: 33.5,  lng: 36.3,  pop: 30 },
  { name: 'Amman',         nameAr: 'عمّان',        lat: 31.95, lng: 35.9,  pop: 25 },
  { name: 'Sanaa',         nameAr: 'صنعاء',        lat: 15.4,  lng: 44.2,  pop: 30 },
  { name: 'Tashkent',      nameAr: 'طشقند',        lat: 41.3,  lng: 69.2,  pop: 35 },
  { name: 'Kabul',         nameAr: 'كابول',        lat: 34.5,  lng: 69.2,  pop: 45 },
  { name: 'Mumbai',        nameAr: 'مومباي',       lat: 19.1,  lng: 72.9,  pop: 70 },
  { name: 'Delhi',         nameAr: 'دلهي',         lat: 28.6,  lng: 77.2,  pop: 45 },
  { name: 'London',        nameAr: 'لندن',         lat: 51.5,  lng: -0.1,  pop: 12 },
  { name: 'Paris',         nameAr: 'باريس',        lat: 48.9,  lng: 2.4,   pop: 10 },
  { name: 'Berlin',        nameAr: 'برلين',        lat: 52.5,  lng: 13.4,  pop: 8 },
  { name: 'Moscow',        nameAr: 'موسكو',        lat: 55.75, lng: 37.6,  pop: 20 },
  { name: 'New York',      nameAr: 'نيويورك',      lat: 40.7,  lng: -74.0, pop: 12 },
  { name: 'Toronto',       nameAr: 'تورنتو',       lat: 43.65, lng: -79.4, pop: 5 },
  { name: 'Sydney',        nameAr: 'سيدني',        lat: -33.9, lng: 151.2, pop: 3 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Projection — simple equirectangular onto a 360×180 virtual canvas
// ─────────────────────────────────────────────────────────────────────────────
const W = 360;
const H = 180;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

// ─────────────────────────────────────────────────────────────────────────────
// Astronomy
// ─────────────────────────────────────────────────────────────────────────────
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return (d.getTime() - start) / 86400000;
}

/** Solar declination (deg) — Spencer's formula approximation. */
function getSolarDeclination(d: Date): number {
  const n = dayOfYear(d);
  const gamma = (2 * Math.PI / 365) * (n - 1);
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148  * Math.sin(3 * gamma);
  return (decl * 180) / Math.PI;
}

/** Equation of time (minutes) — difference between apparent and mean solar time. */
function getEquationOfTime(d: Date): number {
  const n = dayOfYear(d);
  const gamma = (2 * Math.PI / 365) * (n - 1);
  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  return eot; // minutes
}

/** Longitude of the subsolar point (where the sun is directly overhead), deg. */
function getSubsolarLng(d: Date): number {
  const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  const eot = getEquationOfTime(d);
  // Solar noon at Greenwich happens at (720 - EoT) UTC minutes.
  // Subsolar longitude = -(utcMinutes + eot - 720) / 4   (4 min per degree)
  return -((utcMinutes + eot - 720) / 4);
}

/** Signed solar altitude (deg) at a given lat/lng and time. */
function getSolarAltitude(lat: number, lng: number, d: Date): number {
  const decl = (getSolarDeclination(d) * Math.PI) / 180;
  const subLng = getSubsolarLng(d);
  const hourAngle = (((lng - subLng + 540) % 360) - 180) * Math.PI / 180;
  const latR = (lat * Math.PI) / 180;
  const sinAlt =
    Math.sin(latR) * Math.sin(decl) +
    Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle);
  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

/** True if observer is on the morning side of solar noon (sun rising). */
function isMorningSide(lat: number, lng: number, d: Date): boolean {
  const subLng = getSubsolarLng(d);
  const hourAngle = ((lng - subLng + 540) % 360) - 180;
  return hourAngle > 0;
}

/**
 * Build SVG path(s) for the night hemisphere, correctly handling
 * antimeridian wrap. Returns an array of path `d` strings to render.
 *
 * Strategy: compute the terminator polygon in *unwrapped* longitude space
 * (lng values may exceed ±180), then draw the same path three times at
 * offsets -W, 0, +W. The SVG viewBox clips the visible slice.
 */
function buildNightPaths(date: Date): string[] {
  const subLng = getSubsolarLng(date);
  const declRad = (getSolarDeclination(date) * Math.PI) / 180;

  // Walk from south pole to north pole along the EASTERN (sunset) terminator,
  // then back from north to south along the WESTERN (sunrise) terminator.
  // Both expressed relative to subLng so the polygon is always contiguous.
  const pts: { lng: number; lat: number }[] = [];

  for (let lat = -90; lat <= 90; lat += 2) {
    const latR = (lat * Math.PI) / 180;
    const cosH = -Math.tan(latR) * Math.tan(declRad);
    if (cosH >= 1) {
      pts.push({ lng: subLng + 180, lat }); // polar night — on antimeridian
      continue;
    }
    if (cosH <= -1) continue; // midnight sun — skip, polygon wraps past it
    const H_ang = (Math.acos(cosH) * 180) / Math.PI;
    pts.push({ lng: subLng + H_ang, lat }); // eastern terminator
  }
  for (let lat = 90; lat >= -90; lat -= 2) {
    const latR = (lat * Math.PI) / 180;
    const cosH = -Math.tan(latR) * Math.tan(declRad);
    if (cosH >= 1) {
      pts.push({ lng: subLng - 180, lat });
      continue;
    }
    if (cosH <= -1) continue;
    const H_ang = (Math.acos(cosH) * 180) / Math.PI;
    pts.push({ lng: subLng + 360 - H_ang, lat }); // western terminator (far side)
  }

  // Base path in unwrapped space
  const base =
    pts
      .map((p, i) => {
        const x = ((p.lng + 180) / 360) * W;
        const y = ((90 - p.lat) / 180) * H;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  // Render shifted copies so wrapping is handled at the viewBox edges.
  const shift = (dx: number) =>
    pts
      .map((p, i) => {
        const x = ((p.lng + 180) / 360) * W + dx;
        const y = ((90 - p.lat) / 180) * H;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  return [shift(-W), base, shift(W)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Prayer slots
// ─────────────────────────────────────────────────────────────────────────────
type PrayerSlot =
  | 'fajr' | 'shuruq' | 'duha' | 'dhuhr' | 'asr'
  | 'maghrib' | 'isha' | 'night';

const SLOT_ORDER: PrayerSlot[] = ['fajr', 'shuruq', 'duha', 'dhuhr', 'asr', 'maghrib', 'isha', 'night'];

const SLOT_META: Record<PrayerSlot, { ar: string; de: string; color: string }> = {
  fajr:    { ar: 'الفجر',   de: 'Fadschr',    color: 'hsl(42, 100%, 62%)' },
  shuruq:  { ar: 'الشروق',  de: 'Sonnenaufg.', color: 'hsl(28, 95%, 60%)' },
  duha:    { ar: 'الضحى',   de: 'Duha',        color: 'hsl(48, 90%, 55%)' },
  dhuhr:   { ar: 'الظهر',   de: 'Dhuhr',       color: 'hsl(200, 78%, 58%)' },
  asr:     { ar: 'العصر',   de: 'Asr',         color: 'hsl(22, 75%, 55%)' },
  maghrib: { ar: 'المغرب',  de: 'Maghrib',     color: 'hsl(340, 72%, 55%)' },
  isha:    { ar: 'العشاء',  de: 'Ischa',       color: 'hsl(250, 60%, 58%)' },
  night:   { ar: 'الليل',   de: 'Nacht',       color: 'hsl(220, 30%, 45%)' },
};

/**
 * Classify the "current prayer slot" for a city.
 *   shadowFactor: 1 for Shafi'i/Maliki/Hanbali, 2 for Hanafi (Asr timing).
 */
function getCityPrayerSlot(lat: number, lng: number, d: Date, shadowFactor = 1): PrayerSlot {
  const altDeg = getSolarAltitude(lat, lng, d);
  const morning = isMorningSide(lat, lng, d);

  // Deep night — sun far below horizon (below Isha threshold).
  if (altDeg < -18) return 'night';

  // Twilight zones. -18° to -0.833° (refraction-adjusted horizon).
  if (altDeg < -0.833) return morning ? 'fajr' : 'isha';

  // Sunrise / sunset bands — ~7 min on each side.
  if (altDeg < 3) return morning ? 'shuruq' : 'maghrib';

  // Compute Asr altitude (sun altitude when shadow = shadowFactor + noon-shadow).
  // altAsr = arccot(shadowFactor + tan(|lat - decl|))
  const decl = getSolarDeclination(d);
  const absLatMinusDecl = Math.abs(lat - decl) * Math.PI / 180;
  const altAsr = (Math.atan(1 / (shadowFactor + Math.tan(absLatMinusDecl))) * 180) / Math.PI;

  if (!morning) {
    // Afternoon side: Asr begins when sun drops to altAsr.
    if (altDeg <= altAsr) return 'asr';
    return 'dhuhr';
  }

  // Morning side: Duha runs from after sunrise until zenith.
  // We call "Dhuhr" the narrow band near solar noon (|hourAngle| < ~0.5h).
  const subLng = getSubsolarLng(d);
  const hourAngleDeg = Math.abs((((lng - subLng + 540) % 360) - 180));
  if (hourAngleDeg < 7.5) return 'dhuhr'; // ±30 min around solar noon
  return 'duha';
}

/** Local clock time for a longitude (approximated as UTC ± lng/15). */
function getCityLocalTime(lng: number, d: Date): string {
  const ms = d.getTime() + (lng / 15) * 3600_000
    // cancel the browser's own local offset so longitude alone drives it
    + d.getTimezoneOffset() * 60_000;
  const dt = new Date(ms);
  return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simplified continents — equirectangular (W=360, H=180).
// Hand-traced outline: accurate enough to be instantly recognizable yet light.
// ─────────────────────────────────────────────────────────────────────────────
const CONTINENTS = [
  // Africa
  'M163,69 L174,55 L191,57 L202,58 L212,59 L216,75 L231,79 L220,95 L215,115 L200,125 L198,124 L188,95 L180,85 L170,83 L163,76 Z',
  // Eurasia (large landmass, incl. India, SE Asia, Arabia)
  'M170,54 L183,47 L181,40 L178,39 L188,35 L200,31 L210,30 L220,24 L240,23 L280,15 L315,18 L350,22 L348,30 L330,38 L325,48 L320,53 L308,55 L302,60 L290,70 L282,78 L278,82 L260,83 L252,68 L248,65 L240,65 L238,67 L232,64 L227,60 L220,55 L215,54 L210,53 L204,54 L195,52 L188,51 L175,54 Z',
  // British Isles
  'M174,36 L182,34 L181,42 L175,44 Z',
  // Scandinavia
  'M188,25 L210,20 L215,28 L205,36 L195,34 Z',
  // Japan
  'M318,48 L325,45 L322,52 L316,55 Z',
  // North America
  'M12,24 L39,20 L55,18 L80,18 L95,24 L105,29 L115,42 L100,46 L99,59 L93,60 L83,64 L73,67 L62,57 L56,50 L50,35 L30,30 Z',
  // Greenland
  'M125,12 L155,8 L165,12 L160,22 L140,25 L128,22 Z',
  // Central America + Caribbean
  'M85,68 L95,70 L103,74 L100,78 L90,76 Z',
  // South America
  'M102,78 L120,83 L130,90 L145,98 L142,113 L132,120 L123,125 L109,143 L105,137 L108,125 L100,102 Z',
  // Australia
  'M293,112 L302,107 L311,102 L321,102 L325,107 L334,115 L329,127 L321,128 L296,125 L294,116 Z',
  // New Zealand
  'M348,128 L354,126 L352,136 L346,134 Z',
  // Indonesia
  'M275,85 L286,84 L300,84 L311,90 L320,92 L320,98 L310,98 L295,99 L285,98 L275,92 Z',
  // Madagascar
  'M228,112 L233,110 L234,122 L229,124 Z',
  // Arabian Peninsula tip (Yemen/Oman) — thicken
  'M228,72 L246,72 L245,82 L230,80 Z',
  // Philippines
  'M308,82 L314,80 L315,90 L310,92 Z',
  // Iceland
  'M158,25 L166,23 L167,30 L158,31 Z',
].join(' ');

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
function UmmahPulse() {
  const { language, prayerMadhab } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [filter, setFilter] = useState<PrayerSlot | 'all'>('all');
  const [search, setSearch] = useState('');
  const shadowFactor = prayerMadhab === 'hanafi' ? 2 : 1;

  // Tick clock. Faster in expanded mode for smoother visuals.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), expanded ? 15_000 : 45_000);
    return () => clearInterval(id);
  }, [expanded]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  // Keyboard: Esc closes modal, Esc also clears selection
  useEffect(() => {
    if (!expanded && !selectedCity) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedCity) setSelectedCity(null);
      else if (expanded) setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, selectedCity]);

  const nightPaths = useMemo(() => buildNightPaths(now), [now]);
  const subLng = getSubsolarLng(now);
  const subLat = getSolarDeclination(now);
  const sunPoint = project(subLat, subLng);

  // Compute slot + local time + altitude for every city (recomputed each tick)
  const cityDetails = useMemo(
    () =>
      CITIES.map((c) => {
        const slot = getCityPrayerSlot(c.lat, c.lng, now, shadowFactor);
        return {
          ...c,
          slot,
          altitude: getSolarAltitude(c.lat, c.lng, now),
          localTime: getCityLocalTime(c.lng, now),
        };
      }),
    [now, shadowFactor]
  );

  const fajrCities = useMemo(
    () => cityDetails.filter((c) => c.slot === 'fajr'),
    [cityDetails]
  );
  const maghribCities = useMemo(
    () => cityDetails.filter((c) => c.slot === 'maghrib'),
    [cityDetails]
  );

  // Aggregate Muslim pop (millions) per slot
  const slotPop = useMemo(() => {
    const agg: Record<PrayerSlot, number> = {
      fajr: 0, shuruq: 0, duha: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, night: 0,
    };
    cityDetails.forEach((c) => { agg[c.slot] += c.pop; });
    return agg;
  }, [cityDetails]);

  const fajrPop = slotPop.fajr;

  // Center of the Fajr glow band (roughly 15° east of the sunrise terminator)
  const fajrCenterLng = ((subLng + 105 + 540) % 360) - 180;
  const fajrCenter = project(0, fajrCenterLng);

  // Sorted + filtered list for modal
  const sortedCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cityDetails
      .filter((c) => filter === 'all' || c.slot === filter)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.nameAr.includes(search))
      .sort((a, b) => {
        const oi = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
        return oi !== 0 ? oi : b.pop - a.pop;
      });
  }, [cityDetails, filter, search]);

  const selectedCityDetails = selectedCity
    ? cityDetails.find((c) => c.name === selectedCity) ?? null
    : null;

  const t = (ar: string, de: string) => (language === 'ar' ? ar : de);

  // ── render helpers ────────────────────────────────────────────────────────
  const renderMapSvg = (opts: { large?: boolean } = {}) => {
    const large = !!opts.large;
    const idSuffix = large ? 'Lg' : 'Sm';
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block select-none"
        preserveAspectRatio="xMidYMid meet"
        aria-label={t(
          'خريطة العالم مع موجة الفجر الحية',
          'Weltkarte mit Live-Fadschr-Welle'
        )}
      >
        <defs>
          <radialGradient id={`fajrGlow${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(42, 100%, 68%)" stopOpacity="0.95" />
            <stop offset="40%"  stopColor="hsl(30, 92%, 55%)"  stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(20, 80%, 45%)"  stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`maghribGlow${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(340, 80%, 62%)" stopOpacity="0.75" />
            <stop offset="60%"  stopColor="hsl(320, 60%, 40%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(280, 50%, 30%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`ocean${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--muted))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1"  />
          </linearGradient>
          <radialGradient id={`sunGrad${idSuffix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="hsl(48, 100%, 80%)" stopOpacity="1"   />
            <stop offset="55%" stopColor="hsl(42, 100%, 60%)" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="hsl(35, 95%, 50%)"  stopOpacity="0"   />
          </radialGradient>
          <filter id={`softBlur${idSuffix}`}>
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Ocean */}
        <rect width={W} height={H} fill={`url(#ocean${idSuffix})`} />

        {/* Graticule: equator (solid hint), tropics & arctic circles (dashed) */}
        <line x1={0} y1={90} x2={W} y2={90}
              stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.35" />
        {[66.5, 23.5, -23.5, -66.5].map((lat) => {
          const y = ((90 - lat) / 180) * H;
          return (
            <line key={lat} x1={0} y1={y} x2={W} y2={y}
                  stroke="hsl(var(--border))" strokeOpacity="0.18"
                  strokeWidth="0.25" strokeDasharray="2 3" />
          );
        })}
        {[-120, -60, 0, 60, 120].map((lng) => {
          const x = ((lng + 180) / 360) * W;
          return (
            <line key={lng} x1={x} y1={0} x2={x} y2={H}
                  stroke="hsl(var(--border))" strokeOpacity="0.12"
                  strokeWidth="0.25" strokeDasharray="2 3" />
          );
        })}

        {/* Continents */}
        <path d={CONTINENTS} fill="hsl(var(--foreground))" fillOpacity="0.22" />
        <path d={CONTINENTS} fill="none"
              stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="0.4" />

        {/* Night side overlay (three copies handle antimeridian wrap) */}
        <g>
          {nightPaths.map((d, i) => (
            <path key={i} d={d} fill="hsl(220, 42%, 6%)" fillOpacity="0.55" />
          ))}
          {nightPaths.map((d, i) => (
            <path key={`b-${i}`} d={d} fill="none"
                  stroke="hsl(45, 90%, 60%)" strokeOpacity="0.35"
                  strokeWidth="0.6" strokeDasharray="1.5 1.5" />
          ))}
        </g>
        {/* Maghrib band (subtle rose glow on sunset side) */}
        {(() => {
          const mLng = ((subLng - 95 + 540) % 360) - 180;
          const p = project(0, mLng);
          return (
            <motion.ellipse
              cx={p.x} cy={H / 2} rx={22} ry={H / 2}
              fill={`url(#maghribGlow${idSuffix})`}
              filter={`url(#softBlur${idSuffix})`}
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          );
        })()}

        {/* Fajr glow band — sweeps westward each minute */}
        <motion.g
          key={`fajr-${Math.round(fajrCenter.x / 3)}`}
          initial={{ opacity: 0.65 }}
          animate={{ opacity: [0.65, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx={fajrCenter.x} cy={H / 2} rx={30} ry={H / 2}
                   fill={`url(#fajrGlow${idSuffix})`} filter={`url(#softBlur${idSuffix})`} />
          {fajrCenter.x < 32 && (
            <ellipse cx={fajrCenter.x + W} cy={H / 2} rx={30} ry={H / 2}
                     fill={`url(#fajrGlow${idSuffix})`} filter={`url(#softBlur${idSuffix})`} />
          )}
          {fajrCenter.x > W - 32 && (
            <ellipse cx={fajrCenter.x - W} cy={H / 2} rx={30} ry={H / 2}
                     fill={`url(#fajrGlow${idSuffix})`} filter={`url(#softBlur${idSuffix})`} />
          )}
        </motion.g>

        {/* Sub-solar point (the "sun") */}
        <g>
          <motion.circle
            cx={sunPoint.x} cy={sunPoint.y} r={8}
            fill={`url(#sunGrad${idSuffix})`}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${sunPoint.x}px ${sunPoint.y}px` }}
          />
          <circle cx={sunPoint.x} cy={sunPoint.y} r={1.8} fill="hsl(48, 100%, 92%)" />
        </g>

        {/* Cities — colored by current slot */}
        {cityDetails.map((c) => {
          const { x, y } = project(c.lat, c.lng);
          const color = SLOT_META[c.slot].color;
          const isFajr = c.slot === 'fajr';
          const isSelected = c.name === selectedCity;
          const isMakkah = c.name === 'Makkah';
          return (
            <g key={`${c.name}-${c.lat}-${c.lng}`}
               style={{ cursor: 'pointer' }}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedCity(c.name === selectedCity ? null : c.name);
               }}>
              {/* invisible hit-area for easy tapping */}
              <circle cx={x} cy={y} r={5} fill="transparent" />
              {isFajr && (
                <motion.circle
                  cx={x} cy={y} r={2.4}
                  fill={color}
                  animate={{ r: [2.4, 4.5, 2.4], opacity: [1, 0.55, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <circle
                cx={x} cy={y}
                r={isMakkah ? 2.2 : isFajr ? 1.6 : 1.2}
                fill={isMakkah ? 'hsl(48, 100%, 70%)' : color}
                fillOpacity={isFajr || isMakkah ? 1 : 0.85}
                stroke={isSelected ? 'hsl(var(--foreground))' : isMakkah ? 'hsl(48,100%,95%)' : 'none'}
                strokeWidth={isSelected ? 0.6 : isMakkah ? 0.4 : 0}
              />
              {isMakkah && (
                <motion.circle
                  cx={x} cy={y} r={3.5}
                  fill="none"
                  stroke="hsl(48, 100%, 70%)"
                  strokeWidth="0.5"
                  animate={{ r: [3.5, 6, 3.5], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </g>
          );
        })}

        {/* Tooltip for selected city (rendered inside SVG for correct layering) */}
        {large && selectedCityDetails && (() => {
          const p = project(selectedCityDetails.lat, selectedCityDetails.lng);
          const tipW = 72;
          const tipH = 22;
          // flip tooltip if too close to right edge
          const flip = p.x > W - tipW - 4;
          const tx = flip ? p.x - tipW - 4 : p.x + 4;
          const ty = Math.max(2, Math.min(H - tipH - 2, p.y - tipH / 2));
          const c = selectedCityDetails;
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tipW} height={tipH} rx={3}
                    fill="hsl(var(--background))" fillOpacity="0.95"
                    stroke={SLOT_META[c.slot].color} strokeWidth="0.5" />
              <text x={tx + 3} y={ty + 8}
                    fontSize="5" fill="hsl(var(--foreground))" fontWeight="700">
                {language === 'ar' ? c.nameAr : c.name}
              </text>
              <text x={tx + 3} y={ty + 15} fontSize="4"
                    fill={SLOT_META[c.slot].color} fontWeight="700">
                {language === 'ar' ? SLOT_META[c.slot].ar : SLOT_META[c.slot].de}
              </text>
              <text x={tx + tipW - 3} y={ty + 15} fontSize="4"
                    fill="hsl(var(--muted-foreground))" textAnchor="end">
                {c.localTime}
              </text>
            </g>
          );
        })()}
      </svg>
    );
  };

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div
      dir="ltr"
      className="relative rounded-3xl overflow-hidden border border-border/40 bg-gradient-to-b from-card via-card to-background shadow-lg"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-2"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe2 className="w-4.5 h-4.5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-foreground leading-tight">
              {t('نبض الأمة', 'Puls der Ummah')}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {t('أين يُصلَّى الفجر الآن', 'Wo Fadschr jetzt gebetet wird')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold text-primary tabular-nums leading-tight flex items-center gap-1 justify-end">
            <Sparkles className="w-3 h-3" />
            ~{fajrPop}M
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight">
            {t('مسلم في الفجر', 'in Fadschr')}
          </div>
        </div>
      </div>

      {/* Map (click to expand) */}
      <div className="relative px-3 pb-3">
        <button
          onClick={() => setExpanded(true)}
          className="block w-full text-left active:scale-[0.985] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-2xl"
          aria-label={t('فتح الخريطة بحجم كامل', 'Karte im Vollbild öffnen')}
        >
          <div className="relative rounded-2xl overflow-hidden bg-[hsl(var(--muted))]/30 group">
            <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-background/75 backdrop-blur-md border border-border/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5 text-foreground" />
            </div>

            {/* "LIVE" pill */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/75 backdrop-blur-md border border-border/40">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-red-500" />
              </span>
              <span className="text-[9px] font-bold tracking-wide text-foreground">
                LIVE
              </span>
            </div>

            {renderMapSvg()}

            {/* Active fajr cities ticker */}
            {fajrCities.length > 0 && (
              <div
                className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 justify-center"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                {fajrCities.slice(0, 6).map((c) => (
                  <motion.span
                    key={c.name}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30"
                  >
                    {language === 'ar' ? c.nameAr : c.name}
                  </motion.span>
                ))}
                {fajrCities.length > 6 && (
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 backdrop-blur-sm border border-primary/20">
                    +{fajrCities.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        {/* Quick stats row */}
        <div
          className="grid grid-cols-4 gap-1.5 mt-2.5"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {([['fajr', fajrCities.length], ['dhuhr', cityDetails.filter(c=>c.slot==='dhuhr').length], ['asr', cityDetails.filter(c=>c.slot==='asr').length], ['maghrib', maghribCities.length]] as [PrayerSlot, number][]).map(([slot, count]) => (
            <button
              key={slot}
              onClick={() => { setFilter(slot); setExpanded(true); }}
              className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-card border border-border/30 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_META[slot].color }} />
                <span className="text-[10px] font-semibold text-foreground">
                  {language === 'ar' ? SLOT_META[slot].ar : SLOT_META[slot].de}
                </span>
              </div>
              <span className="text-[11px] font-bold tabular-nums text-foreground mt-0.5">
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <p
          className="text-[10.5px] text-muted-foreground text-center mt-2.5 leading-relaxed px-2"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {t(
            'اضغط على الخريطة لعرض كل المدن وأوقات صلاتها',
            'Tippe die Karte für Details zu allen Städten'
          )}
        </p>
      </div>

      {/* Fullscreen modal — portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 border-b border-border/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-foreground leading-tight">
                      {t('نبض الأمة', 'Puls der Ummah')}
                    </h2>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {t(
                        `~${fajrPop} مليون مسلم في الفجر الآن`,
                        `~${fajrPop} Mio. Muslime beten jetzt Fadschr`
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setExpanded(false); setSelectedCity(null); }}
                  className="w-10 h-10 rounded-2xl bg-card border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label={t('إغلاق', 'Schließen')}
                >
                  <X className="w-4.5 h-4.5 text-foreground" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.5rem)]">
                {/* Larger map */}
                <div className="px-4 pt-4">
                  <div
                    className="relative rounded-2xl overflow-hidden bg-[hsl(var(--muted))]/30 border border-border/30"
                    onClick={() => setSelectedCity(null)}
                  >
                    {renderMapSvg({ large: true })}

                    {/* Sun info overlay */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-md border border-border/40">
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-semibold text-foreground tabular-nums">
                        {subLat.toFixed(1)}°, {((subLng + 540) % 360 - 180).toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="px-4 pt-3">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {(['all', ...SLOT_ORDER] as const).map((s) => {
                      const active = filter === s;
                      const label = s === 'all'
                        ? t('الكل', 'Alle')
                        : language === 'ar' ? SLOT_META[s].ar : SLOT_META[s].de;
                      const count = s === 'all' ? CITIES.length : cityDetails.filter(c => c.slot === s).length;
                      return (
                        <button
                          key={s}
                          onClick={() => setFilter(s)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-card border-border/40 text-foreground hover:bg-muted/40'
                          }`}
                        >
                          {s !== 'all' && (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_META[s].color }} />
                          )}
                          <span>{label}</span>
                          <span className={`tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search */}
                <div className="px-4 pt-3">
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'right-3' : 'left-3'} text-muted-foreground pointer-events-none`} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('ابحث عن مدينة…', 'Stadt suchen…')}
                      className={`w-full py-2 text-[12px] rounded-xl bg-card border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>

                {/* City list */}
                <div className="px-4 pt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {t('المدن', 'Städte')}
                    </span>
                    <span className="normal-case tracking-normal">
                      {sortedCities.length} {t('نتيجة', 'Treffer')}
                    </span>
                  </p>

                  {sortedCities.length === 0 ? (
                    <div className="text-center text-[12px] text-muted-foreground py-6">
                      {t('لا توجد نتائج', 'Keine Treffer')}
                    </div>
                  ) : (
                    sortedCities.map((c) => {
                      const meta = SLOT_META[c.slot];
                      const isSelected = c.name === selectedCity;
                      return (
                        <motion.button
                          key={c.name}
                          layout
                          onClick={() => setSelectedCity(isSelected ? null : c.name)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all text-start ${
                            isSelected
                              ? 'bg-primary/5 border-primary/40 shadow-sm'
                              : 'bg-card border-border/30 active:scale-[0.99]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                background: meta.color,
                                boxShadow: c.slot === 'fajr' ? `0 0 8px ${meta.color}` : 'none',
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                                {language === 'ar' ? c.nameAr : c.name}
                                {c.name === 'Makkah' && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-bold align-middle">
                                    ★
                                  </span>
                                )}
                              </p>
                              <p className="text-[10.5px] text-muted-foreground tabular-nums leading-tight mt-0.5">
                                {c.localTime} · {c.altitude >= 0 ? '↑' : '↓'} {Math.abs(c.altitude).toFixed(0)}°
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                            style={{
                              background: meta.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)'),
                              color: meta.color,
                            }}
                          >
                            {language === 'ar' ? meta.ar : meta.de}
                          </span>
                        </motion.button>
                      );
                    })
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground text-center mt-5 px-6 leading-relaxed">
                  {t(
                    'الأوقات تقريبية مبنية على زاوية الشمس • يحدّث كل 15 ثانية • مذهب العصر: ' +
                      (prayerMadhab === 'hanafi' ? 'حنفي' : 'جمهور'),
                    'Zeiten basieren auf Sonnenstand · Aktualisierung alle 15 s · Asr-Madhab: ' +
                      (prayerMadhab === 'hanafi' ? 'Hanafi' : 'Mehrheit')
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default UmmahPulse;
