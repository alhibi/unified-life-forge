import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Globe2, X, Maximize2 } from 'lucide-react';

/**
 * Ummah Pulse — live world map showing where Fajr is currently being prayed.
 * 
 * Approach (no external libs):
 * - Compute the current solar terminator (the line dividing day & night).
 * - Fajr happens roughly when the sun is ~18° below the horizon → terminator
 *   shifted ~18° east of the day/night line.
 * - We render a pure SVG equirectangular world (simple silhouette path) and
 *   draw an animated golden "Fajr band" that sweeps west as the earth rotates.
 * - Pulsing dots mark major Muslim-population cities currently in the Fajr band.
 */

// Major Muslim-population centers (lat, lng, city)
const CITIES: { name: string; nameAr: string; lat: number; lng: number; pop: number }[] = [
  { name: 'Jakarta', nameAr: 'جاكرتا', lat: -6.2, lng: 106.8, pop: 230 },
  { name: 'Karachi', nameAr: 'كراتشي', lat: 24.9, lng: 67.0, pop: 200 },
  { name: 'Dhaka', nameAr: 'دكا', lat: 23.8, lng: 90.4, pop: 165 },
  { name: 'Lahore', nameAr: 'لاهور', lat: 31.5, lng: 74.3, pop: 130 },
  { name: 'Cairo', nameAr: 'القاهرة', lat: 30.0, lng: 31.2, pop: 100 },
  { name: 'Istanbul', nameAr: 'إسطنبول', lat: 41.0, lng: 28.9, pop: 85 },
  { name: 'Tehran', nameAr: 'طهران', lat: 35.7, lng: 51.4, pop: 70 },
  { name: 'Riyadh', nameAr: 'الرياض', lat: 24.7, lng: 46.7, pop: 60 },
  { name: 'Makkah', nameAr: 'مكة', lat: 21.4, lng: 39.8, pop: 90 },
  { name: 'Baghdad', nameAr: 'بغداد', lat: 33.3, lng: 44.4, pop: 65 },
  { name: 'Kuala Lumpur', nameAr: 'كوالالمبور', lat: 3.1, lng: 101.7, pop: 60 },
  { name: 'Casablanca', nameAr: 'الدار البيضاء', lat: 33.6, lng: -7.6, pop: 55 },
  { name: 'Algiers', nameAr: 'الجزائر', lat: 36.7, lng: 3.1, pop: 50 },
  { name: 'Tunis', nameAr: 'تونس', lat: 36.8, lng: 10.2, pop: 35 },
  { name: 'Khartoum', nameAr: 'الخرطوم', lat: 15.6, lng: 32.5, pop: 45 },
  { name: 'Lagos', nameAr: 'لاغوس', lat: 6.5, lng: 3.4, pop: 55 },
  { name: 'Damascus', nameAr: 'دمشق', lat: 33.5, lng: 36.3, pop: 30 },
  { name: 'Amman', nameAr: 'عمّان', lat: 31.95, lng: 35.9, pop: 25 },
  { name: 'Sanaa', nameAr: 'صنعاء', lat: 15.4, lng: 44.2, pop: 30 },
  { name: 'Tashkent', nameAr: 'طشقند', lat: 41.3, lng: 69.2, pop: 35 },
  { name: 'Kabul', nameAr: 'كابول', lat: 34.5, lng: 69.2, pop: 45 },
  { name: 'Mumbai', nameAr: 'مومباي', lat: 19.1, lng: 72.9, pop: 70 },
  { name: 'London', nameAr: 'لندن', lat: 51.5, lng: -0.1, pop: 12 },
  { name: 'Paris', nameAr: 'باريس', lat: 48.9, lng: 2.4, pop: 10 },
  { name: 'Berlin', nameAr: 'برلين', lat: 52.5, lng: 13.4, pop: 8 },
  { name: 'New York', nameAr: 'نيويورك', lat: 40.7, lng: -74.0, pop: 12 },
];

// Equirectangular projection
const W = 360;
const H = 180;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

/** Compute longitude where the sun is currently at solar noon (subsolar point). */
function getSubsolarLng(date: Date): number {
  // UTC hours past midnight → angle. Sun is over Greenwich at 12:00 UTC.
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  return -((utcHours - 12) * 15); // degrees
}

/** Approx solar declination (degrees) — controls north/south tilt of terminator. */
function getSolarDeclination(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  return 23.44 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
}

/** Build a polygon path representing the night side of the earth. */
function buildNightPath(date: Date): string {
  const subLng = getSubsolarLng(date);
  const decl = getSolarDeclination(date);
  // Terminator: longitude where sun is on horizon for each latitude
  // cos(H) = -tan(lat)*tan(decl), H = hour angle from noon
  const declRad = (decl * Math.PI) / 180;
  const points: { lng: number; lat: number }[] = [];
  for (let lat = -90; lat <= 90; lat += 2) {
    const latRad = (lat * Math.PI) / 180;
    const cosH = -Math.tan(latRad) * Math.tan(declRad);
    if (cosH >= 1) {
      // Sun never rises at this lat (polar night) → fully dark
      points.push({ lng: subLng - 180, lat });
      continue;
    }
    if (cosH <= -1) continue; // midnight sun → no terminator
    const H = (Math.acos(cosH) * 180) / Math.PI;
    // Eastern terminator (sunset side relative to subsolar)
    points.push({ lng: subLng + H, lat });
  }
  // Close polygon along the antimeridian on the far (night) side
  const back: { lng: number; lat: number }[] = [];
  for (let lat = 90; lat >= -90; lat -= 2) {
    const latRad = (lat * Math.PI) / 180;
    const cosH = -Math.tan(latRad) * Math.tan(declRad);
    if (cosH >= 1) { back.push({ lng: subLng + 180, lat }); continue; }
    if (cosH <= -1) continue;
    const H = (Math.acos(cosH) * 180) / Math.PI;
    back.push({ lng: subLng - H + 360, lat });
  }
  const all = [...points, ...back];
  const d = all
    .map((p, i) => {
      const x = (((p.lng + 540) % 360) / 360) * W;
      const y = ((90 - p.lat) / 180) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
  return d;
}

/** Returns true if a city is currently in the Fajr window (sun ~18°-12° below horizon, eastern side). */
function isInFajr(lat: number, lng: number, date: Date): boolean {
  const decl = getSolarDeclination(date);
  const subLng = getSubsolarLng(date);
  const declRad = (decl * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngDiff = (((lng - subLng + 540) % 360) - 180) * Math.PI / 180;
  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(lngDiff);
  const altDeg = (Math.asin(sinAlt) * 180) / Math.PI;
  const morningSide = lngDiff > 0;
  return morningSide && altDeg >= -18 && altDeg <= -12;
}

type PrayerSlot = 'fajr' | 'sunrise' | 'duha' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'night';

/** Estimate the current prayer slot for a city based on sun altitude & side. */
function getCityPrayerSlot(lat: number, lng: number, date: Date): PrayerSlot {
  const decl = getSolarDeclination(date);
  const subLng = getSubsolarLng(date);
  const declRad = (decl * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngDiff = (((lng - subLng + 540) % 360) - 180) * Math.PI / 180;
  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(lngDiff);
  const altDeg = (Math.asin(sinAlt) * 180) / Math.PI;
  const morning = lngDiff > 0;
  if (altDeg < -18) return 'night'; // deep night / isha continues
  if (altDeg >= -18 && altDeg < -0.83) return morning ? 'fajr' : 'isha';
  if (altDeg >= -0.83 && altDeg < 5) return morning ? 'sunrise' : 'maghrib';
  if (altDeg >= 5 && altDeg < 25) return morning ? 'duha' : 'asr';
  // Sun is high — dhuhr around solar noon (lngDiff near 0)
  if (Math.abs(lngDiff) < (15 * Math.PI) / 180) return 'dhuhr';
  return morning ? 'duha' : 'asr';
}

/** Local time in a city derived from its longitude offset from UTC. */
function getCityLocalTime(lng: number, date: Date): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const cityMs = utcMs + (lng / 15) * 3600_000;
  const d = new Date(cityMs);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const SLOT_LABEL: Record<PrayerSlot, { ar: string; en: string; color: string }> = {
  fajr:    { ar: 'الفجر',  en: 'Fajr',    color: 'hsl(45, 100%, 65%)' },
  sunrise: { ar: 'الشروق', en: 'Sunrise', color: 'hsl(28, 95%, 60%)' },
  duha:    { ar: 'الضحى',  en: 'Duha',    color: 'hsl(48, 90%, 55%)' },
  dhuhr:   { ar: 'الظهر',  en: 'Dhuhr',   color: 'hsl(200, 80%, 60%)' },
  asr:     { ar: 'العصر',  en: 'Asr',     color: 'hsl(20, 75%, 55%)' },
  maghrib: { ar: 'المغرب', en: 'Maghrib', color: 'hsl(340, 70%, 55%)' },
  isha:    { ar: 'العشاء', en: 'Isha',    color: 'hsl(250, 60%, 55%)' },
  night:   { ar: 'الليل',  en: 'Night',   color: 'hsl(220, 30%, 50%)' },
};

// Simplified world land silhouette (low-poly, recognizable continents).
// Source: simplified manually for performance — equirectangular 360x180.
const WORLD_PATH = "M30,55 L70,52 L95,58 L110,68 L125,72 L130,85 L120,95 L100,98 L85,95 L75,105 L65,115 L55,118 L45,115 L40,100 L32,85 L28,70 Z M150,40 L185,38 L220,42 L260,45 L300,50 L320,55 L335,65 L325,75 L300,80 L280,75 L255,72 L230,70 L200,68 L175,65 L155,58 Z M195,75 L225,72 L250,78 L265,90 L260,105 L245,118 L225,125 L210,120 L200,108 L195,92 Z M165,72 L190,75 L185,90 L175,95 L165,88 Z M270,82 L295,80 L310,90 L305,105 L290,108 L275,98 Z M75,55 L120,52 L145,58 L130,68 L100,72 L80,68 Z";

function UmmahPulse() {
  const { language } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);

  // Update every minute (every 30s when expanded for snappier feel)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), expanded ? 30_000 : 60_000);
    return () => clearInterval(id);
  }, [expanded]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  const nightPath = useMemo(() => buildNightPath(now), [now]);

  const fajrCities = useMemo(
    () => CITIES.filter((c) => isInFajr(c.lat, c.lng, now)),
    [now]
  );

  const fajrPop = useMemo(
    () => fajrCities.reduce((s, c) => s + c.pop, 0),
    [fajrCities]
  );

  // Compute slot + local time for every city (memoized — recomputed each minute)
  const cityDetails = useMemo(
    () =>
      CITIES.map((c) => ({
        ...c,
        slot: getCityPrayerSlot(c.lat, c.lng, now),
        localTime: getCityLocalTime(c.lng, now),
      })).sort((a, b) => {
        // Order: fajr first, then sunrise/duha/dhuhr/asr/maghrib/isha/night
        const order: PrayerSlot[] = ['fajr', 'sunrise', 'duha', 'dhuhr', 'asr', 'maghrib', 'isha', 'night'];
        return order.indexOf(a.slot) - order.indexOf(b.slot);
      }),
    [now]
  );

  const subLng = getSubsolarLng(now);
  const fajrCenterLng = ((subLng + 105 + 540) % 360) - 180;
  const fajrCenter = project(0, fajrCenterLng);

  return (
    <div
      dir="ltr"
      className="relative rounded-3xl overflow-hidden border border-border/40 bg-gradient-to-b from-card via-card to-background shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe2 className="w-4.5 h-4.5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-foreground leading-tight">
              {language === 'ar' ? 'نبض الأمة' : 'Ummah Pulse'}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {language === 'ar' ? 'أين يُصلَّى الفجر الآن' : 'Where Fajr is being prayed now'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold text-primary tabular-nums leading-tight">
            ~{fajrPop}M
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight">
            {language === 'ar' ? 'مسلم في الفجر' : 'in Fajr now'}
          </div>
        </div>
      </div>

      {/* Map (clickable to expand) */}
      <div className="relative px-3 pb-3">
        <button
          onClick={() => setExpanded(true)}
          className="block w-full text-left active:scale-[0.98] transition-transform"
          aria-label={language === 'ar' ? 'فتح الخريطة بحجم كامل' : 'Open fullscreen map'}
        >
          <div className="relative rounded-2xl overflow-hidden bg-[hsl(var(--muted))]/30 group">
            {/* Expand hint */}
            <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-background/70 backdrop-blur-md border border-border/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5 text-foreground" />
            </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block"
            preserveAspectRatio="xMidYMid meet"
            aria-label="World map showing global Fajr prayer wave"
          >
            <defs>
              <radialGradient id="fajrGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(38, 95%, 65%)" stopOpacity="0.85" />
                <stop offset="40%" stopColor="hsl(28, 90%, 55%)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="hsl(20, 80%, 45%)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="oceanBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.15" />
              </linearGradient>
              <filter id="softBlur">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
            </defs>

            {/* Ocean / background */}
            <rect width={W} height={H} fill="url(#oceanBg)" />

            {/* Subtle latitude grid */}
            {[30, 60, 90, 120, 150].map((y) => (
              <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="hsl(var(--border))" strokeOpacity="0.15" strokeWidth="0.3" />
            ))}

            {/* Continents silhouette */}
            <path d={WORLD_PATH} fill="hsl(var(--foreground))" fillOpacity="0.18" />

            {/* Night side */}
            <path d={nightPath} fill="hsl(220, 40%, 8%)" fillOpacity="0.55" />

            {/* Fajr glow band — moves westward each minute */}
            <motion.g
              key={`fajr-${Math.round(fajrCenter.x)}`}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.6, 1, 0.75] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ellipse
                cx={fajrCenter.x}
                cy={H / 2}
                rx={28}
                ry={H / 2}
                fill="url(#fajrGlow)"
                filter="url(#softBlur)"
              />
              {/* wrap-around if near edges */}
              {fajrCenter.x < 30 && (
                <ellipse cx={fajrCenter.x + W} cy={H / 2} rx={28} ry={H / 2} fill="url(#fajrGlow)" filter="url(#softBlur)" />
              )}
              {fajrCenter.x > W - 30 && (
                <ellipse cx={fajrCenter.x - W} cy={H / 2} rx={28} ry={H / 2} fill="url(#fajrGlow)" filter="url(#softBlur)" />
              )}
            </motion.g>

            {/* City dots in Fajr — pulsing gold */}
            {fajrCities.map((c) => {
              const { x, y } = project(c.lat, c.lng);
              return (
                <g key={c.name}>
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={2.2}
                    fill="hsl(45, 100%, 70%)"
                    animate={{ r: [2.2, 4, 2.2], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <circle cx={x} cy={y} r={1} fill="hsl(45, 100%, 90%)" />
                </g>
              );
            })}

            {/* Other major cities — dim dots */}
            {CITIES.filter((c) => !fajrCities.find((f) => f.name === c.name)).map((c) => {
              const { x, y } = project(c.lat, c.lng);
              return (
                <circle
                  key={c.name}
                  cx={x}
                  cy={y}
                  r={0.9}
                  fill="hsl(var(--foreground))"
                  fillOpacity="0.35"
                />
              );
            })}
          </svg>

          {/* Active cities ticker */}
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
            </div>
          )}
          </div>
        </button>

        {/* Footer note */}
        <p
          className="text-[10.5px] text-muted-foreground text-center mt-2.5 leading-relaxed px-2"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {language === 'ar'
            ? 'اضغط على الخريطة لعرض كل المدن وأوقات صلاتها'
            : 'Tap the map to see all cities & prayer times'}
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
                      {language === 'ar' ? 'نبض الأمة' : 'Ummah Pulse'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {language === 'ar'
                        ? `~${fajrPop} مليون مسلم في الفجر الآن`
                        : `~${fajrPop}M Muslims in Fajr now`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-10 h-10 rounded-2xl bg-card border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
                >
                  <X className="w-4.5 h-4.5 text-foreground" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.5rem)]">
                {/* Larger map */}
                <div className="px-4 pt-4">
                  <div className="relative rounded-2xl overflow-hidden bg-[hsl(var(--muted))]/30 border border-border/30">
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      className="w-full h-auto block"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <radialGradient id="fajrGlow2" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="hsl(38, 95%, 65%)" stopOpacity="0.9" />
                          <stop offset="40%" stopColor="hsl(28, 90%, 55%)" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="hsl(20, 80%, 45%)" stopOpacity="0" />
                        </radialGradient>
                        <filter id="softBlur2">
                          <feGaussianBlur stdDeviation="2.5" />
                        </filter>
                      </defs>
                      <rect width={W} height={H} fill="hsl(var(--muted))" fillOpacity="0.25" />
                      <path d={WORLD_PATH} fill="hsl(var(--foreground))" fillOpacity="0.2" />
                      <path d={nightPath} fill="hsl(220, 40%, 8%)" fillOpacity="0.55" />
                      <ellipse cx={fajrCenter.x} cy={H / 2} rx={28} ry={H / 2} fill="url(#fajrGlow2)" filter="url(#softBlur2)" />
                      {cityDetails.map((c) => {
                        const { x, y } = project(c.lat, c.lng);
                        const isFajr = c.slot === 'fajr';
                        return (
                          <g key={c.name}>
                            <circle cx={x} cy={y} r={isFajr ? 2.6 : 1.4} fill={SLOT_LABEL[c.slot].color} fillOpacity={isFajr ? 1 : 0.7} />
                            {isFajr && (
                              <circle cx={x} cy={y} r={5} fill="hsl(45, 100%, 70%)" fillOpacity="0.25" />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Legend */}
                <div className="px-4 pt-4 pb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(['fajr', 'sunrise', 'duha', 'dhuhr', 'asr', 'maghrib', 'isha', 'night'] as PrayerSlot[]).map((s) => (
                      <div key={s} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-card border border-border/40">
                        <span className="w-2 h-2 rounded-full" style={{ background: SLOT_LABEL[s].color }} />
                        <span className="text-[10px] font-medium text-foreground">
                          {language === 'ar' ? SLOT_LABEL[s].ar : SLOT_LABEL[s].en}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* City list */}
                <div className="px-4 pt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                    {language === 'ar' ? 'المدن — مرتبة حسب الصلاة الحالية' : 'Cities — sorted by current prayer'}
                  </p>
                  {cityDetails.map((c) => {
                    const slot = SLOT_LABEL[c.slot];
                    return (
                      <motion.div
                        key={c.name}
                        layout
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/30"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: slot.color, boxShadow: c.slot === 'fajr' ? `0 0 8px ${slot.color}` : 'none' }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                              {language === 'ar' ? c.nameAr : c.name}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground tabular-nums leading-tight mt-0.5">
                              {c.localTime} {language === 'ar' ? 'محلي' : 'local'}
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                          style={{
                            background: `${slot.color.replace(')', ', 0.15)').replace('hsl(', 'hsla(')}`,
                            color: slot.color,
                          }}
                        >
                          {language === 'ar' ? slot.ar : slot.en}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-muted-foreground text-center mt-4 px-6 leading-relaxed">
                  {language === 'ar'
                    ? 'الأوقات تقريبية مبنية على زاوية الشمس • تحديث كل 30 ثانية'
                    : 'Times are approximate based on sun angle • updates every 30s'}
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
