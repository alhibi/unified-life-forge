/**
 * WeatherWidget — chart-forward, instrument-panel weather card for the
 * home page. Replaces the previous 4-line teaser with:
 *   • Header: location + condition word + big temperature + feels-like
 *   • 24h temperature curve (SVG, gradient, draw-in animation) with
 *     precipitation-probability bars stacked underneath the same x-axis
 *   • 2×2 instrument grid: UV Index, AQI, Wind (with direction arrow),
 *     Humidity
 *   • Sunrise / Sunset row
 *
 * All values come from `useWeatherData` — the same source /weather uses,
 * so numbers stay in lockstep between the home card and the full page.
 *
 * Design tokens only: no hardcoded hex. Copper accent = `--primary`.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle,
  Cloudy, CloudFog, MoonStar, Wind as WindIcon, Droplets, Sunrise, Sunset,
  Leaf, Navigation,
} from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';
import { useWeatherData } from '@/weather/hooks/useWeatherData';

// ─── Weather code → icon + label ───────────────────────────────────────────
function iconFor(code: number, isDay: boolean) {
  if (code <= 1)                  return isDay ? Sun : MoonStar;
  if (code === 2)                 return Cloudy;
  if (code === 3)                 return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57)   return CloudDrizzle;
  if (code >= 61 && code <= 67)   return CloudRain;
  if (code >= 71 && code <= 77)   return CloudSnow;
  if (code >= 80 && code <= 82)   return CloudRain;
  if (code >= 85 && code <= 86)   return CloudSnow;
  if (code >= 95)                 return CloudLightning;
  return isDay ? Sun : MoonStar;
}

function conditionLabel(code: number, ar: boolean): string {
  if (code <= 1)                  return ar ? 'صافٍ'          : 'Klar';
  if (code === 2)                 return ar ? 'غائم جزئياً'   : 'Teilweise bewölkt';
  if (code === 3)                 return ar ? 'غائم'          : 'Bewölkt';
  if (code === 45 || code === 48) return ar ? 'ضباب'          : 'Nebel';
  if (code >= 51 && code <= 57)   return ar ? 'رذاذ'          : 'Nieselregen';
  if (code >= 61 && code <= 67)   return ar ? 'أمطار'         : 'Regen';
  if (code >= 71 && code <= 77)   return ar ? 'ثلوج'          : 'Schnee';
  if (code >= 80 && code <= 82)   return ar ? 'زخات مطر'      : 'Regenschauer';
  if (code >= 85 && code <= 86)   return ar ? 'زخات ثلج'      : 'Schneeschauer';
  if (code >= 95)                 return ar ? 'عواصف رعدية'   : 'Gewitter';
  return ar ? '—' : '—';
}

// ─── Interpretive helpers ──────────────────────────────────────────────────
function uvLabel(uv: number, ar: boolean): string {
  if (uv < 3)  return ar ? 'منخفض'    : 'Niedrig';
  if (uv < 6)  return ar ? 'معتدل'    : 'Mäßig';
  if (uv < 8)  return ar ? 'مرتفع'    : 'Hoch';
  if (uv < 11) return ar ? 'مرتفع جداً' : 'Sehr hoch';
  return       ar ? 'خطر'      : 'Extrem';
}
function aqiLabel(caqi: number, ar: boolean): string {
  if (caqi <= 25) return ar ? 'ممتاز'  : 'Ausgezeichnet';
  if (caqi <= 50) return ar ? 'جيد'    : 'Gut';
  if (caqi <= 75) return ar ? 'متوسط'  : 'Mittel';
  if (caqi <= 100) return ar ? 'رديء'  : 'Schlecht';
  return           ar ? 'سيء جداً' : 'Sehr schlecht';
}
// 16-point compass. Consumers already round direction_deg.
function bearing(deg: number, ar: boolean): string {
  const ptsAr = ['ش','ش ش ق','ش ق','ش ق ق','ق','ج ق ق','ج ق','ج ج ق','ج','ج ج غ','ج غ','ج غ غ','غ','ش غ غ','ش غ','ش ش غ'];
  const ptsEn = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return (ar ? ptsAr : ptsEn)[idx];
}

// Build the smooth cubic-Bezier path through N points on a fixed viewBox.
function smoothPath(points: Array<{ x: number; y: number }>, tension = 0.35): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// ─── Panel ─────────────────────────────────────────────────────────────────
export default function WeatherWidget() {
  const navigate = useNavigate();
  const { language } = useApp();
  const ar = language === 'ar';
  const { data } = useWeatherData(ar ? 'ar' : 'de');

  // Slice — next 24 hourly points, starting at the current hour.
  const hours = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const from = data.hourly.findIndex(h => h.time >= now);
    const start = from === -1 ? 0 : Math.max(0, from);
    return data.hourly.slice(start, start + 24);
  }, [data]);

  if (!data || hours.length === 0) {
    return (
      <div
        className="w-full rounded-3xl border border-border/60 bg-card p-6 animate-pulse"
        style={{ minHeight: 380 }}
        aria-label={ar ? 'جارٍ تحميل الطقس' : 'Wetter wird geladen'}
      />
    );
  }

  const { current } = data;
  const Icon = iconFor(current.weatherCode, current.isDay);
  const temp = Math.round(current.temperature);
  const apparent = Math.round(current.apparentTemperature);
  const hi = Math.round(data.daily[0]?.tempMax ?? temp);
  const lo = Math.round(data.daily[0]?.tempMin ?? temp);
  const cond = conditionLabel(current.weatherCode, ar);

  // Chart geometry
  const W = 300;
  const H = 90;
  const pad = 8;
  const temps = hours.map(h => h.temperature);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const span = Math.max(1, tMax - tMin);
  const points = hours.map((h, i) => ({
    x: (i / (hours.length - 1)) * W,
    y: pad + (1 - (h.temperature - tMin) / span) * (H - pad * 2),
  }));
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

  // Peak precipitation for the header chip
  const peakPrecip = Math.max(0, ...hours.map(h => h.precipitationProbability));

  // 5 evenly-spaced tick labels
  const tickIdxs = [0, 6, 12, 18, hours.length - 1].filter(i => i < hours.length);

  // UV / AQI colors (semantic bands, still design-token accented)
  const uv = current.uvIndex ?? 0;
  const caqi = data.airQuality?.europeanAqi ?? 0;
  const pm25 = data.airQuality?.pm2_5 ?? 0;
  const pm10 = data.airQuality?.pm10 ?? 0;

  const uvPct = Math.min(1, uv / 11);
  const aqiPct = Math.min(1, caqi / 100);

  // Sunrise / Sunset — daily strings are ISO. Extract HH:MM in local time.
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(ar ? 'en-GB' : 'de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const sunriseStr = fmtTime(data.daily[0]?.sunrise ?? '');
  const sunsetStr  = fmtTime(data.daily[0]?.sunset ?? '');

  // Now-marker position on chart (first hour)
  const nowPoint = points[0];

  return (
    <button
      onClick={() => navigate('/weather')}
      dir={ar ? 'rtl' : 'ltr'}
      className="w-full text-start rounded-3xl border border-border/60 bg-card overflow-hidden active:scale-[0.985] transition-transform"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="p-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-foreground text-[15px] font-semibold tracking-tight truncate">
              {ar ? 'الطقس الآن' : 'Wetter jetzt'}
            </h3>
            <p className="text-muted-foreground text-[12px] mt-0.5">{cond}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-3" dir="ltr">
          <span className="text-[56px] font-extralight leading-none tracking-tighter text-foreground tabular-nums">
            {temp}°
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              {ar ? 'الإحساس' : 'Gefühlt'}
            </span>
            <span className="text-foreground/85 font-medium tabular-nums">{apparent}°</span>
          </div>
          <div className="ms-auto text-[11px] text-muted-foreground tabular-nums" dir="ltr">
            <span className="text-foreground/80 font-medium">H {hi}°</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>L {lo}°</span>
          </div>
        </div>
      </div>

      {/* ── 24h forecast chart ─────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-2" dir="ltr">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em]">
            {ar ? 'توقّعات 24 ساعة' : '24-Stunden-Prognose'}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary tabular-nums"
          >
            {peakPrecip}% {ar ? 'هطول' : 'Regen'}
          </span>
        </div>

        <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="wx-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="wx-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* horizontal gridlines */}
            {[0.25, 0.5, 0.75].map(f => (
              <line
                key={f}
                x1="0" x2={W}
                y1={pad + f * (H - pad * 2)}
                y2={pad + f * (H - pad * 2)}
                stroke="hsl(var(--foreground))"
                strokeOpacity="0.06"
                strokeWidth="0.5"
              />
            ))}

            {/* precipitation bars */}
            {hours.map((h, i) => {
              const barH = (h.precipitationProbability / 100) * (H - pad * 2) * 0.6;
              const x = (i / (hours.length - 1)) * W;
              return (
                <motion.rect
                  key={i}
                  x={x - 2}
                  y={H - barH}
                  width={4}
                  height={barH}
                  rx={1}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.18}
                  initial={{ opacity: 0, scaleY: 0.3 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: 0.15 + i * 0.012, duration: 0.35, ease: 'easeOut' }}
                  style={{ transformOrigin: `${x}px ${H}px` }}
                />
              );
            })}

            {/* area under curve */}
            <motion.path
              d={areaPath}
              fill="url(#wx-area)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            />

            {/* line */}
            <motion.path
              d={linePath}
              fill="none"
              stroke="url(#wx-line)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ vectorEffect: 'non-scaling-stroke' } as React.CSSProperties}
            />

            {/* "now" marker */}
            {nowPoint && (
              <>
                <motion.circle
                  cx={nowPoint.x}
                  cy={nowPoint.y}
                  r={8}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.18}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.3 }}
                />
                <motion.circle
                  cx={nowPoint.x}
                  cy={nowPoint.y}
                  r={3}
                  fill="hsl(var(--primary))"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: 'spring', stiffness: 320, damping: 22 }}
                />
              </>
            )}
          </svg>
        </div>

        {/* tick labels */}
        <div className="flex justify-between mt-2 tabular-nums">
          {tickIdxs.map((i, idx) => {
            const h = hours[i];
            if (!h) return null;
            const label = new Date(h.time).toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false }) + 'h';
            const isNow = idx === 0;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className={`text-[9px] ${isNow ? 'text-primary font-bold' : 'text-muted-foreground/70'}`}>
                  {isNow ? (ar ? 'الآن' : 'Jetzt') : label}
                </span>
                <span className={`text-[11px] ${isNow ? 'text-primary font-bold' : 'text-foreground/80 font-medium'}`}>
                  {Math.round(h.temperature)}°
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Instrument grid (2×2) ──────────────────────────────────── */}
      <div className="p-5 pt-4 grid grid-cols-2 gap-2.5">
        {/* UV */}
        <InstrumentTile
          label={ar ? 'الأشعة' : 'UV-Index'}
          icon={<Sun className="w-3.5 h-3.5 text-primary" strokeWidth={2} />}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-medium text-foreground tabular-nums">{uv.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground">{uvLabel(uv, ar)}</span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-foreground/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${uvPct * 100}%` }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </InstrumentTile>

        {/* AQI */}
        <InstrumentTile
          label={ar ? 'جودة الهواء' : 'Luftqualität'}
          icon={<Leaf className="w-3.5 h-3.5 text-primary" strokeWidth={2} />}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-medium text-foreground tabular-nums">{Math.round(caqi)}</span>
            <span className="text-[10px] text-muted-foreground">{aqiLabel(caqi, ar)}</span>
          </div>
          <p className="mt-1.5 text-[9px] text-muted-foreground/80 leading-tight tabular-nums" dir="ltr">
            PM2.5 {pm25.toFixed(1)} · PM10 {pm10.toFixed(0)}
          </p>
          <div className="mt-1 h-1 w-full rounded-full bg-foreground/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${aqiPct * 100}%` }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </InstrumentTile>

        {/* Wind */}
        <InstrumentTile
          label={ar ? 'الرياح' : 'Wind'}
          icon={<WindIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] font-medium text-foreground tabular-nums">
                  {Math.round(current.windSpeed)}
                </span>
                <span className="text-[10px] text-muted-foreground">km/h</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {bearing(current.windDirection, ar)} · {ar ? 'هبوب' : 'Böen'} {Math.round(current.windGusts)}
              </p>
            </div>
            <motion.div
              className="w-7 h-7 rounded-full border border-foreground/15 flex items-center justify-center"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: current.windDirection, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <Navigation className="w-3 h-3 text-primary" strokeWidth={2.4} fill="currentColor" />
            </motion.div>
          </div>
        </InstrumentTile>

        {/* Humidity */}
        <InstrumentTile
          label={ar ? 'الرطوبة' : 'Feuchte'}
          icon={<Droplets className="w-3.5 h-3.5 text-primary" strokeWidth={2} />}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-medium text-foreground tabular-nums">
              {Math.round(current.humidity)}
            </span>
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-foreground/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, current.humidity)}%` }}
              transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </InstrumentTile>
      </div>

      {/* ── Sun cycle row ──────────────────────────────────────────── */}
      <div className="mx-5 mb-5 px-4 py-3 rounded-2xl border border-border/50 bg-background/40 flex items-center justify-between" dir="ltr">
        <div className="flex items-center gap-2.5">
          <Sunrise className="w-4 h-4 text-primary/80" strokeWidth={1.75} />
          <div>
            <div className="text-[9px] uppercase font-bold tracking-[0.14em] text-muted-foreground">
              {ar ? 'الشروق' : 'Sonnenaufgang'}
            </div>
            <div className="text-[12px] text-foreground font-medium tabular-nums">{sunriseStr}</div>
          </div>
        </div>
        <div className="h-6 w-px bg-border/60" />
        <div className="flex items-center gap-2.5">
          <div className="text-end">
            <div className="text-[9px] uppercase font-bold tracking-[0.14em] text-muted-foreground">
              {ar ? 'الغروب' : 'Sonnenuntergang'}
            </div>
            <div className="text-[12px] text-foreground font-medium tabular-nums">{sunsetStr}</div>
          </div>
          <Sunset className="w-4 h-4 text-primary/80" strokeWidth={1.75} />
        </div>
      </div>
    </button>
  );
}

// ─── Instrument tile ───────────────────────────────────────────────────────
function InstrumentTile({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
