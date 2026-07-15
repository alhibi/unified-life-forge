import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  Cloudy,
  CloudFog,
  MoonStar,
  Wind as WindIcon,
  Droplets,
  Gauge,
  Eye,
  Leaf,
  ChevronLeft,
} from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';
import { useWeather } from '@/weather/hooks/useWeather';
import { useWeatherForecast } from '@/weather/hooks/useWeatherForecast';

function iconFor(code: number, isDay: boolean) {
  if (code <= 1) return isDay ? Sun : MoonStar;
  if (code === 2) return Cloudy;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return isDay ? Sun : MoonStar;
}

function conditionLabel(code: number, ar: boolean): string {
  if (code <= 1) return ar ? 'صافٍ' : 'Klar';
  if (code === 2) return ar ? 'غائم جزئياً' : 'Teilweise bewölkt';
  if (code === 3) return ar ? 'غائم' : 'Bewölkt';
  if (code === 45 || code === 48) return ar ? 'ضباب' : 'Nebel';
  if (code >= 51 && code <= 57) return ar ? 'رذاذ' : 'Nieselregen';
  if (code >= 61 && code <= 67) return ar ? 'أمطار' : 'Regen';
  if (code >= 71 && code <= 77) return ar ? 'ثلوج' : 'Schnee';
  if (code >= 80 && code <= 82) return ar ? 'زخات مطر' : 'Regenschauer';
  if (code >= 85 && code <= 86) return ar ? 'زخات ثلج' : 'Schneeschauer';
  if (code >= 95) return ar ? 'عواصف رعدية' : 'Gewitter';
  return '—';
}

function smoothPath(points: Array<{ x: number; y: number }>, tension = 0.24): string {
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

function formatClock(value: number | string | undefined, ar: boolean) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(ar ? 'en-GB' : 'de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function comfortLabel(value: string | undefined, ar: boolean) {
  const map: Record<string, string> = {
    dangerously_cold: ar ? 'برد قارس' : 'Sehr kalt',
    cold: ar ? 'بارد' : 'Kalt',
    cool: ar ? 'لطيف بارد' : 'Kühl',
    comfortable: ar ? 'مريح' : 'Angenehm',
    warm: ar ? 'دافئ' : 'Warm',
    hot: ar ? 'حار' : 'Heiß',
    dangerously_hot: ar ? 'حرارة خطرة' : 'Gefährlich heiß',
  };
  return map[value ?? ''] ?? (ar ? 'الرصد الآن' : 'Jetzt');
}

const gaugeStyle = (pct: number): CSSProperties => ({
  transform: `scaleX(${Math.max(0, Math.min(1, pct))})`,
  transformOrigin: 'left center',
});

export default function WeatherWidget() {
  const navigate = useNavigate();
  const { language } = useApp();
  const ar = language === 'ar';
  const { snapshot } = useWeather(ar ? 'ar' : 'de');
  const { forecast } = useWeatherForecast(ar ? 'ar' : 'de');

  const hourly = useMemo(() => forecast.hourly.slice(0, 24), [forecast.hourly]);

  if (!snapshot) {
    return (
      <div
        className="w-full rounded-2xl border border-border/60 bg-card p-4 animate-pulse"
        style={{ minHeight: 258 }}
        aria-label={ar ? 'جارٍ تحميل الطقس' : 'Wetter wird geladen'}
      />
    );
  }

  const currentHour = hourly[0];
  const weatherCode = currentHour?.weather_code ?? 0;
  const Icon = iconFor(weatherCode, currentHour?.is_day ?? true);
  const temp = Math.round(snapshot.temperature.actual_c);
  const feels = Math.round(snapshot.temperature.apparent_c);
  const hi = Math.round(snapshot.temperature.daily_high_c);
  const lo = Math.round(snapshot.temperature.daily_low_c);
  const condition = conditionLabel(weatherCode, ar);
  const peakPrecip = Math.max(snapshot.precipitation.probability_percent, ...hourly.map(h => h.precip_probability_percent));
  const confidence = snapshot.meta.ensemble_confidence_percent;

  const chart = (() => {
    const entries = hourly.length ? hourly : [];
    if (entries.length < 2) return null;
    const W = 300;
    const H = 68;
    const pad = 7;
    const temps = entries.map(h => h.temperature_c);
    const tMin = Math.min(...temps);
    const tMax = Math.max(...temps);
    const span = Math.max(1, tMax - tMin);
    const points = entries.map((h, i) => ({
      x: (i / (entries.length - 1)) * W,
      y: pad + (1 - (h.temperature_c - tMin) / span) * (H - pad * 2),
    }));
    const line = smoothPath(points);
    const area = `${line} L ${W} ${H} L 0 ${H} Z`;
    const ticks = [0, 6, 12, 18, entries.length - 1].filter((v, idx, arr) => v < entries.length && arr.indexOf(v) === idx);
    return { W, H, pad, points, line, area, ticks, entries };
  })();

  return (
    <button
      onClick={() => navigate('/weather')}
      dir={ar ? 'rtl' : 'ltr'}
      className="w-full text-start rounded-2xl border border-border/60 bg-card overflow-hidden surface-depth-pressable active:scale-[0.98]"
      aria-label={ar ? 'فتح تفاصيل الطقس' : 'Wetterdetails öffnen'}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" strokeWidth={1.55} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[15px] font-semibold text-foreground truncate">
                  {ar ? 'الطقس الآن' : 'Wetter jetzt'}
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary tabular-nums shrink-0" dir="ltr">
                  {confidence}%
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground truncate">
                {condition} · {comfortLabel(snapshot.temperature.thermal_comfort_level, ar)}
              </p>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0 rtl:rotate-180" />
        </div>

        <div className="grid grid-cols-[auto_1fr] items-end gap-3" dir="ltr">
          <div className="flex items-end gap-2">
            <span className="font-cormorant text-[64px] leading-[0.78] text-foreground tabular-nums">
              {temp}°
            </span>
            <span className="mb-1 text-[12px] text-muted-foreground tabular-nums">
              / {feels}°
            </span>
          </div>
          <div className="mb-1 flex flex-col items-end gap-1 text-[11px] text-muted-foreground tabular-nums">
            <span>H <b className="font-medium text-foreground/80">{hi}°</b> · L {lo}°</span>
            <span>{peakPrecip}% {ar ? 'هطول' : 'Regen'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <MiniMetric label={ar ? 'الرطوبة' : 'Feuchte'} value={Math.round(snapshot.moisture.relative_humidity_percent)} unit="%" icon={<Droplets />} />
          <MiniMetric label={ar ? 'الضغط' : 'Druck'} value={Math.round(snapshot.pressure.msl_hpa)} unit="hPa" icon={<Gauge />} />
          <MiniMetric label={ar ? 'الرياح' : 'Wind'} value={Math.round(snapshot.wind.speed_kph)} unit="km/h" icon={<WindIcon />} />
          <MiniMetric label={ar ? 'الندى' : 'Taupunkt'} value={Math.round(snapshot.temperature.dew_point_c)} unit="°" />
          <MiniMetric label={ar ? 'السحب' : 'Wolken'} value={Math.round(snapshot.sky.cloud_cover_total_percent)} unit="%" />
          <MiniMetric label={ar ? 'الرؤية' : 'Sicht'} value={Math.round(snapshot.sky.visibility_km)} unit="km" icon={<Eye />} />
        </div>

        {chart && (
          <div className="rounded-xl border border-border/45 bg-background/35 px-3 pt-2.5 pb-2" dir="ltr">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {ar ? '24 ساعة' : '24 Stunden'}
              </span>
              <span className="text-[9px] text-primary tabular-nums">
                {Math.round(Math.min(...chart.entries.map(h => h.temperature_c)))}°–{Math.round(Math.max(...chart.entries.map(h => h.temperature_c)))}°
              </span>
            </div>
            <div className="relative w-full" style={{ aspectRatio: `${chart.W} / ${chart.H}` }}>
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="home-wx-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.62" />
                  </linearGradient>
                  <linearGradient id="home-wx-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.35, 0.7].map(f => (
                  <line key={f} x1="0" x2={chart.W} y1={chart.pad + f * (chart.H - chart.pad * 2)} y2={chart.pad + f * (chart.H - chart.pad * 2)} stroke="hsl(var(--foreground))" strokeOpacity="0.06" strokeWidth="0.5" />
                ))}
                {chart.entries.map((h, i) => {
                  const barH = (h.precip_probability_percent / 100) * (chart.H - chart.pad * 2) * 0.34;
                  const x = (i / (chart.entries.length - 1)) * chart.W;
                  return <rect key={h.timestamp_unix} x={x - 1.4} y={chart.H - barH} width="2.8" height={barH} rx="0.8" fill="hsl(var(--primary))" opacity="0.16" />;
                })}
                <motion.path d={chart.area} fill="url(#home-wx-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} />
                <motion.path d={chart.line} fill="none" stroke="url(#home-wx-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }} style={{ vectorEffect: 'non-scaling-stroke' } as CSSProperties} />
                {chart.points[0] && <circle cx={chart.points[0].x} cy={chart.points[0].y} r="2.8" fill="hsl(var(--primary))" />}
              </svg>
            </div>
            <div className="mt-1.5 flex justify-between tabular-nums">
              {chart.ticks.map((i, idx) => {
                const entry = chart.entries[i];
                const label = idx === 0 ? (ar ? 'الآن' : 'Jetzt') : `${new Date(entry.timestamp_unix).getHours()}h`;
                return (
                  <span key={entry.timestamp_unix} className={`text-[9px] ${idx === 0 ? 'text-primary font-semibold' : 'text-muted-foreground/75'}`}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          <CompactGauge label={ar ? 'الأشعة' : 'UV'} value={snapshot.solar.uv_index.toFixed(1)} pct={snapshot.solar.uv_index / 11} />
          <CompactGauge label={ar ? 'جودة الهواء' : 'AQI'} value={Math.round(snapshot.airQuality.aqi_eu_caqi)} pct={snapshot.airQuality.aqi_eu_caqi / 100} icon={<Leaf />} />
          <div className="rounded-xl border border-border/45 bg-background/35 p-2 min-w-0">
            <div className="text-[9px] text-muted-foreground font-medium truncate">{ar ? 'الشمس' : 'Sonne'}</div>
            <div className="mt-1 text-[11px] text-foreground tabular-nums" dir="ltr">
              {formatClock(snapshot.astronomical.sunrise, ar)} · {formatClock(snapshot.astronomical.sunset, ar)}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniMetric({ label, value, unit, icon }: { label: string; value: number | string; unit?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/45 bg-background/35 p-2 min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground min-w-0">
        {icon && <span className="[&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-primary shrink-0">{icon}</span>}
        <span className="text-[9px] font-medium truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1 tabular-nums" dir="ltr">
        <span className="text-[15px] leading-none font-semibold text-foreground">{value}</span>
        {unit && <span className="text-[8.5px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function CompactGauge({ label, value, pct, icon }: { label: string; value: number | string; pct: number; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/45 bg-background/35 p-2 min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground min-w-0">
        {icon && <span className="[&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-primary shrink-0">{icon}</span>}
        <span className="text-[9px] font-medium truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground tabular-nums">{value}</span>
        <span className="h-1 flex-1 rounded-full bg-foreground/10 overflow-hidden">
          <span className="block h-full rounded-full bg-primary/75" style={gaugeStyle(pct)} />
        </span>
      </div>
    </div>
  );
}