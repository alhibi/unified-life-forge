import './weather-theme.css';

import { AnimatePresence,motion } from 'framer-motion';
import { type ReactNode,useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import BackButton from '@/components/BackButton';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import {
  ChevronDown,
  Cloud,
  Droplets,
  Eye,
  Layers,
  RefreshCw,
  Settings,
  Sliders,
  Sun,
  Sunrise,
  Sunset,
} from '@/lib/icons';

import CitySearch from '../components/CitySearch';
import EnsembleTrustPanel from '../components/EnsembleTrustPanel';
import HourlyTrendPanel from '../components/HourlyTrendPanel';
import MeteorologyConsole from '../components/MeteorologyConsole';
import MicroMap from '../components/MicroMap';
import RadarMap from '../components/RadarMap';
import WeatherPlanner from '../components/WeatherPlanner';
import { snapshotAllSources, type SourceHealth } from '../engine/SourceHealthMonitor';
import { useWeather } from '../hooks/useWeather';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import { describeWeatherCode, labelForWeatherCode } from '../lib/conditions';
import {
  aqiAdvice,
  aqiCategoryLabel,
  beaufortLabel,
  cloudTypeLabel,
  comfortLabel,
  compassLabel,
  uvCategoryLabel,
} from '../lib/vocabulary';

// Weather-code vocabulary lives in ../lib/conditions — the page used to carry
// its own copy of both the glyph map and the Arabic labels, which drifted from
// the widget's copy (code 80 read "زخات مطر" here and "أمطار" there).
const iconForCode = (code: number, isDay: boolean) => describeWeatherCode(code, isDay).icon;

function timeLabel(value: string | number | undefined, locale: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function Panel({ title, sub, children }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40"
      />
      {(title || sub) && (
        <header className="px-4 pt-4 pb-3 flex items-end justify-between gap-3">
          {title && (
            <h2 className="font-semibold text-[1.125rem] leading-none text-foreground">
              {title}
            </h2>
          )}
          {sub && (
            <span className="text-[0.6875rem] tracking-[0.15em] uppercase text-foreground/90 font-bold tabular-nums text-end">
              {sub}
            </span>
          )}
        </header>
      )}
      <div className={title || sub ? 'px-4 pb-4' : 'p-4'}>{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  unit,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-foreground/90 font-semibold min-w-0">
        {icon && (
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-primary shrink-0">{icon}</span>
        )}
        <span className="text-[0.6875rem] tracking-[0.12em] uppercase truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1 tabular-nums" dir="ltr">
        <span className="font-bold text-[1.375rem] leading-none text-foreground">
          {value}
        </span>
        {unit && <span className="text-[0.75rem] text-primary/90 font-bold">{unit}</span>}
      </div>
      {hint && <p className="mt-0.5 text-[0.6875rem] text-foreground/80 font-medium truncate">{hint}</p>}
    </div>
  );
}

function GaugeTile({
  label,
  value,
  unit,
  pctValue,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  pctValue: number;
  hint?: string;
  icon?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, pctValue));
  const circumference = 2 * Math.PI * 33;
  return (
    <div className="rounded-2xl surface-depth p-3.5 min-w-0 h-full">
      <div className="flex items-center justify-between gap-2 text-foreground/90 font-semibold">
        <span className="text-[0.6875rem] tracking-[0.12em] uppercase truncate">{label}</span>
        {icon && (
          <span className="[&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-primary shrink-0">{icon}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <svg viewBox="0 0 80 80" className="w-14 h-14 shrink-0 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="33"
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeOpacity="0.09"
            strokeWidth="7"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="33"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - clamped) }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-bold text-[1.375rem] leading-none text-foreground">
              {value}
            </span>
            {unit && <span className="text-[0.6875rem] text-primary/90 font-bold">{unit}</span>}
          </div>
          {hint && (
            <p className="mt-1 text-[0.6875rem] text-foreground/80 font-medium truncate">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceHealthPanel() {
  const [rows, setRows] = useState<SourceHealth[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const tick = () => setRows(snapshotAllSources());
    tick();
    const id = window.setInterval(tick, 5_000);
    window.addEventListener('weather:refreshed', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('weather:refreshed', tick);
    };
  }, []);

  return (
    <Panel
      title={'إدارة مصادر الرصد والأوزان (12 مصدر)'}
      sub={`${rows.filter((r) => r.state === 'closed').length}/${rows.length}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 p-2.5 rounded-lg border border-border/30">
          <span className="leading-relaxed">
            {
              'تعتمد هذه اللوحة على نموذج إجماع متكامل (Consensus Ensemble) يدمج 12 مصدراً عالمياً ومحلياً لتقليل نسب الخطأ والانحراف المناخي.'
            }
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-primary shrink-0 transition-transform active:scale-95"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[0.6875rem] border-b border-border/20 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.state === 'closed' ? 'bg-primary' : r.state === 'half_open' ? 'bg-warning' : 'bg-destructive'}`}
                    />
                    <span className="truncate text-foreground font-medium">{r.label}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    وزن {r.effectiveWeight.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{r.avgResponseMs}ms</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function AmbientBackdrop({ code: _code, isDay }: { code: number; isDay: boolean }) {
  const surface = isDay ? 'hsl(var(--muted) / 0.42)' : 'hsl(var(--card) / 0.72)';
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: surface }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="absolute inset-x-0 top-0 h-24 bg-primary/5"
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function HourlyRibbon({
  entries,
  iconFor,
  locale,
}: {
  entries: Array<{
    timestamp_unix: number;
    temperature_c: number;
    weather_code: number;
    is_day: boolean;
    precip_probability_percent: number;
  }>;
  iconFor: (code: number, isDay: boolean) => typeof Sun;
  locale: string;
}) {
  const slice = entries.slice(0, 12);
  if (slice.length < 2) return null;
  const temps = slice.map((e) => e.temperature_c);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  return (
    <Panel title={'الساعات القادمة'} sub={'12 ساعة'}>
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar" dir="ltr">
        <div className="flex items-stretch gap-2 min-w-max">
          {slice.map((e, i) => {
            const Icon = iconFor(e.weather_code, e.is_day);
            const heat = (e.temperature_c - min) / span;
            return (
              <motion.div
                key={e.timestamp_unix}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-[56px] shrink-0 rounded-2xl border border-border/45 bg-background/40 px-1.5 py-2.5 text-center"
              >
                <div className="text-[0.625rem] tracking-[0.1em] uppercase text-foreground/90 font-bold tabular-nums">
                  {i === 0
                    ? 'الآن'
                    : new Date(e.timestamp_unix).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        hour12: false,
                      })}
                </div>
                <Icon className="w-4 h-4 mx-auto my-1.5 text-primary" strokeWidth={1.4} />
                <div className="font-bold text-[1.125rem] leading-none text-foreground tabular-nums">
                  {Math.round(e.temperature_c)}°
                </div>
                <div className="mt-2 h-8 rounded-full bg-foreground/5 relative overflow-hidden">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full bg-primary/60"
                    style={{ height: `${Math.max(6, heat * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-[0.625rem] text-primary/80 tabular-nums">
                  {Math.round(e.precip_probability_percent)}%
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function WindCompass({
  speed,
  gusts,
  dirDeg,
  cardinal,
  beaufort,
}: {
  speed: number;
  gusts: number;
  dirDeg: number;
  cardinal: string;
  beaufort: string;
}) {
  const cardinals = ['N', 'E', 'S', 'W'];
  return (
    <Panel title={'الرياح وحركتها الجوية'} sub={'بوصلة حية'}>
      <div className="flex items-center gap-4">
        <div className="relative w-[120px] h-[120px] shrink-0" dir="ltr">
          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.05"
              strokeWidth="1"
            />
            {Array.from({ length: 4 }).map((_, i) => {
              const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
              const r1 = 44;
              const r2 = 50;
              return (
                <line
                  key={i}
                  x1={60 + Math.cos(a) * r1}
                  y1={60 + Math.sin(a) * r1}
                  x2={60 + Math.cos(a) * r2}
                  y2={60 + Math.sin(a) * r2}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.22"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              );
            })}
            {cardinals.map((c, i) => {
              const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
              return (
                <text
                  key={c}
                  x={60 + Math.cos(a) * 36}
                  y={60 + Math.sin(a) * 36 + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                  letterSpacing="1"
                >
                  {c}
                </text>
              );
            })}
          </svg>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 0 }}
            animate={{ rotate: dirDeg }}
            transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          >
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <path
                d="M60 18 C 68 40, 68 52, 60 58 C 52 52, 52 40, 60 18 Z"
                fill="hsl(var(--primary))"
                fillOpacity="0.75"
              />
              <path
                d="M60 102 C 65 84, 65 74, 60 68 C 55 74, 55 84, 60 102 Z"
                fill="hsl(var(--foreground))"
                fillOpacity="0.22"
              />
              <circle cx="60" cy="60" r="4" fill="hsl(var(--primary))" />
            </svg>
          </motion.div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-extrabold text-[2rem] leading-none text-foreground">
              {Math.round(speed)}
            </span>
            <span className="text-[0.75rem] text-primary/90 font-bold">km/h</span>
          </div>
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">
            {cardinal} · {Math.round(dirDeg)}°
          </p>
          <p className="mt-2 text-[0.6875rem] text-foreground/80 leading-snug">{beaufort}</p>
          <p className="mt-1 text-[0.625rem] text-primary/80 tabular-nums" dir="ltr">
            {'هبات'} {Math.round(gusts)} km/h
          </p>
        </div>
      </div>
    </Panel>
  );
}

function AQIGauge({
  caqi,
  pm25,
  pm10,
  o3,
  no2,
  so2,
  co,
  advisory,
  healthScore,
  source,
}: {
  caqi: number;
  category?: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  advisory: string;
  healthScore: number;
  source: string | null;
}) {
  const bands = [
    { to: 25, color: 'hsl(150 55% 45%)', label: 'ممتاز' },
    { to: 50, color: 'hsl(90 55% 48%)', label: 'جيد' },
    { to: 75, color: 'hsl(45 85% 55%)', label: 'متوسط' },
    { to: 100, color: 'hsl(20 80% 55%)', label: 'ضعيف' },
    { to: 150, color: 'hsl(0 70% 52%)', label: 'رديء جداً' },
  ];
  const clamped = Math.max(0, Math.min(150, caqi));
  const arcLen = Math.PI; // half circle 0..150 mapped
  const R = 62;
  const cx = 80,
    cy = 78;
  const angleFor = (v: number) => Math.PI + (Math.max(0, Math.min(150, v)) / 150) * arcLen;
  const pointFor = (v: number, r = R) => {
    const a = angleFor(v);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  const needle = pointFor(clamped, R - 6);
  const activeBand = bands.find((b) => clamped <= b.to) ?? bands[bands.length - 1];
  const pollutants: Array<{ label: string; value: number; unit: string; limit: number }> = [
    { label: 'PM2.5', value: pm25, unit: 'µg', limit: 25 },
    { label: 'PM10', value: pm10, unit: 'µg', limit: 50 },
    { label: 'O₃', value: o3, unit: 'µg', limit: 120 },
    { label: 'NO₂', value: no2, unit: 'µg', limit: 40 },
    { label: 'SO₂', value: so2, unit: 'µg', limit: 40 },
    { label: 'CO', value: co, unit: 'mg', limit: 10 },
  ];
  return (
    <Panel title={'جودة الهواء والغبار'} sub={source ?? 'نموذج'}>
      <div className="flex items-end gap-4" dir="ltr">
        <div className="relative shrink-0">
          <svg viewBox="0 0 160 92" className="w-[160px] h-[92px]">
            {bands.map((b, i) => {
              const from = i === 0 ? 0 : bands[i - 1].to;
              const a1 = angleFor(from);
              const a2 = angleFor(b.to);
              const p1 = { x: cx + Math.cos(a1) * R, y: cy + Math.sin(a1) * R };
              const p2 = { x: cx + Math.cos(a2) * R, y: cy + Math.sin(a2) * R };
              return (
                <path
                  key={i}
                  d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`}
                  stroke={b.color}
                  strokeOpacity="0.85"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
            <motion.line
              x1={cx}
              y1={cy}
              x2={needle.x}
              y2={needle.y}
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <circle cx={cx} cy={cy} r="4" fill="hsl(var(--foreground))" />
          </svg>
          <div className="absolute inset-x-0 -bottom-1 text-center">
            <div className="font-bold text-[1.5rem] leading-none text-foreground tabular-nums">
              {Math.round(caqi)}
            </div>
            <div
              className="text-[0.6875rem] tracking-[0.12em] uppercase font-bold"
              style={{ color: activeBand.color }}
            >
              {activeBand.label}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.6875rem] leading-relaxed text-muted-foreground line-clamp-3">
            {advisory}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[0.625rem] tracking-[0.16em] uppercase text-primary/80">
            <span>{'مؤشر الصحة البشري'}</span>
            <span className="tabular-nums text-foreground font-semibold">{healthScore}/100</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {pollutants.map((p) => {
          const ratio = Math.max(0, Math.min(1.5, p.value / p.limit));
          const color =
            ratio < 0.5 ? 'hsl(150 55% 45%)' : ratio < 1 ? 'hsl(45 85% 55%)' : 'hsl(0 70% 52%)';
          return (
            <div
              key={p.label}
              className="rounded-xl border border-border/40 bg-background/30 px-2 py-2 min-w-0"
            >
              <div className="flex items-center justify-between text-[0.625rem] tracking-[0.12em] uppercase text-muted-foreground">
                <span>{p.label}</span>
                <span className="tabular-nums font-semibold" style={{ color }}>
                  {p.value.toFixed(p.label === 'CO' ? 2 : 1)}
                  <span className="text-muted-foreground/70 ms-0.5">{p.unit}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-foreground/8 overflow-hidden">
                {/* scaleX keeps the fill on the compositor; `width` would
                    relayout the row on every frame (design-system §8). */}
                <motion.div
                  className="h-full w-full origin-left rounded-full"
                  style={{ background: color }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: Math.min(1, ratio) }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LiveSunArc({
  sunrise,
  sunset,
  elevationDeg,
  azimuthDeg,
  dayLengthH,
  locale,
}: {
  sunrise: string;
  noon?: string;
  sunset: string;
  elevationDeg: number;
  azimuthDeg: number;
  dayLengthH: number;
  locale: string;
}) {
  const now = Date.now();
  const t0 = new Date(sunrise).getTime();
  const t1 = new Date(sunset).getTime();
  const progress = Math.max(0, Math.min(1, (now - t0) / Math.max(1, t1 - t0)));
  const W = 320,
    H = 130,
    padX = 22,
    baseY = 108;
  const cx = padX + progress * (W - padX * 2);
  const peak = 78;
  const cy = baseY - 4 * peak * progress * (1 - progress);
  return (
    <Panel title={'مسار الشمس والقبة السماوية'} sub={`${dayLengthH.toFixed(1)} ساعة`}>
      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }} dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <path
            d={`M ${padX} ${baseY} Q ${W / 2} ${baseY - 4 * peak * 0.25 * 4} ${W - padX} ${baseY} L ${W - padX} ${baseY} L ${padX} ${baseY} Z`}
            fill="hsl(var(--primary))"
            fillOpacity="0.12"
          />
          <path
            d={`M ${padX} ${baseY} Q ${W / 2} ${baseY - 4 * peak * 0.25 * 4} ${W - padX} ${baseY}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeOpacity="0.75"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1={padX}
            x2={W - padX}
            y1={baseY}
            y2={baseY}
            stroke="hsl(var(--foreground))"
            strokeOpacity="0.14"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <motion.g
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <circle cx={cx} cy={cy} r="14" fill="hsl(var(--primary))" fillOpacity="0.18" />
            <circle cx={cx} cy={cy} r="6" fill="hsl(var(--primary))" />
          </motion.g>
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center" dir="ltr">
        <div>
          <div className="flex items-center justify-center gap-1 text-[0.6875rem] tracking-[0.12em] uppercase text-foreground/90 font-semibold">
            <Sunrise className="w-3 h-3 text-primary" /> {'شروق'}
          </div>
          <div className="mt-1 font-bold text-[1.125rem] leading-none text-foreground tabular-nums">
            {timeLabel(sunrise, locale)}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-[0.6875rem] tracking-[0.12em] uppercase text-foreground/90 font-semibold">
            <Sun className="w-3 h-3 text-primary" /> {'الآن'}
          </div>
          <div className="mt-1 font-bold text-[1.125rem] leading-none text-foreground tabular-nums">
            {elevationDeg.toFixed(0)}°
          </div>
          <div className="text-[0.6875rem] text-primary/90 font-bold tabular-nums">
            {Math.round(azimuthDeg)}°
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-[0.6875rem] tracking-[0.12em] uppercase text-foreground/90 font-semibold">
            <Sunset className="w-3 h-3 text-primary" /> {'غروب'}
          </div>
          <div className="mt-1 font-bold text-[1.125rem] leading-none text-foreground tabular-nums">
            {timeLabel(sunset, locale)}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function DailyRangeStrip({
  days,
  iconFor,
  locale,
}: {
  days: Array<{ date_unix: number; high_c: number; low_c: number; weather_code: number }>;
  iconFor: (code: number, isDay: boolean) => typeof Sun;
  locale: string;
}) {
  if (days.length === 0) return null;
  const globalMin = Math.min(...days.map((d) => d.low_c));
  const globalMax = Math.max(...days.map((d) => d.high_c));
  const span = Math.max(1, globalMax - globalMin);
  return (
    <Panel title={'الأيام القادمة وحركة الحرارة'} sub={`${days.length} ${'أيام'}`}>
      <div className="space-y-2.5" dir="ltr">
        {days.map((d, i) => {
          const DayIcon = iconFor(d.weather_code, true);
          const leftPct = ((d.low_c - globalMin) / span) * 100;
          const rightPct = ((d.high_c - globalMin) / span) * 100;
          return (
            <motion.div
              key={d.date_unix}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-[56px_28px_1fr_auto] items-center gap-3"
            >
              <span className="text-[0.6875rem] text-muted-foreground font-medium">
                {i === 0
                  ? 'اليوم'
                  : new Date(d.date_unix).toLocaleDateString(locale, { weekday: 'short' })}
              </span>
              <DayIcon className="w-4 h-4 text-primary" strokeWidth={1.4} />
              <div className="relative h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full bg-primary/70"
                  style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
                />
              </div>
              <span className="text-[0.6875rem] tabular-nums text-foreground font-medium">
                <span className="text-muted-foreground">{Math.round(d.low_c)}°</span>
                <span className="mx-1 text-muted-foreground/50">·</span>
                {Math.round(d.high_c)}°
              </span>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}

export default function Weather() {
  // Arabic-only app (design-system §1). This was 'en-GB', which is why the
  // 7-day strip printed "Sun / Mon / Tue" and clock labels used English
  // formatting inside otherwise Arabic copy.
  const locale = 'ar';
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'now' | 'forecast' | 'radar' | 'lab'>('now');

  // Use either the selected geocoded city, or fallback to the device singleton coords
  const { location: deviceLoc } = useDeviceLocation();
  const activeLocation = selectedCoords || deviceLoc;

  const { snapshot, status, tier, isRefreshing, refresh } = useWeather('ar', selectedCoords);
  const { forecast } = useWeatherForecast('ar', selectedCoords);

  const hourly = forecast.hourly.slice(0, 24);
  const currentHour = hourly[0];
  const CurrentIcon = iconForCode(currentHour?.weather_code ?? 0, currentHour?.is_day ?? true);

  const moonGlyph = useMemo(() => {
    const p = snapshot?.astronomical.moon_phase_name ?? 'new_moon';
    return (
      {
        new_moon: '🌑',
        waxing_crescent: '🌒',
        first_quarter: '🌓',
        waxing_gibbous: '🌔',
        full_moon: '🌕',
        waning_gibbous: '🌖',
        last_quarter: '🌗',
        waning_crescent: '🌘',
      } as const
    )[p];
  }, [snapshot]);

  const handleCitySelect = (lat: number, lng: number, name: string) => {
    setSelectedCoords({ lat, lng, name });
  };

  const mainTabs = [
    { id: 'now', label: 'الآن', icon: Sun },
    { id: 'forecast', label: 'التوقعات والخريطة', icon: Sliders },
    { id: 'radar', label: 'الرياح والرادار', icon: Layers },
    { id: 'lab', label: 'المختبر والتخطيط', icon: Settings },
  ] as const;

  if (status === 'loading' && !snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center bg-background text-foreground">
        <span className="font-semibold text-xl text-primary animate-pulse">
          {'نقرأ الغلاف الجوي ونجمع الأرصاد…'}
        </span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center bg-background text-foreground">
        <span className="text-sm text-muted-foreground">{'تعذر تحميل بيانات الطقس.'}</span>
      </div>
    );
  }

  const conf = snapshot.meta.ensemble_confidence_percent;

  return (
    <div dir={'rtl'} className="weather-theme min-h-screen pb-page">
      <Helmet>
        <title>{'لوحة الأرصاد والطقس المتكاملة — SmartHub'}</title>
        <meta
          name="description"
          content={
            'مستكشف طقس ثوري يدمج الرادارات، محاكيات الجسيمات، مختبر الفيزياء ومخطط الأنشطة الطبي الذكي.'
          }
        />
        <link rel="canonical" href="https://amv.life/weather" />
        <meta property="og:title" content={'لوحة الأرصاد والطقس المتكاملة — SmartHub'} />
        <meta
          property="og:description"
          content={
            'مستكشف طقس ثوري يدمج الرادارات، محاكيات الجسيمات، مختبر الفيزياء ومخطط الأنشطة الطبي الذكي.'
          }
        />
        <meta property="og:url" content="https://amv.life/weather" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'لوحة الأرصاد الجوية والفيزياء',
            description:
              'مستكشف طقس ثوري يدمج الرادارات، محاكيات الجسيمات، مختبر الفيزياء ومخطط الأنشطة الطبي الذكي.',
            url: 'https://amv.life/weather',
          })}
        </script>
      </Helmet>

      {/* Sticky Header */}
      <div className="z-float border-b border-border/50 app-sticky-header">
        <div className="px-4 py-3 flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-bold text-[1.25rem] leading-none text-foreground truncate">
              {selectedCoords?.name || 'لوحة الأرصاد الجوية والفيزياء'}
            </h1>
            <p
              className="mt-2 text-[0.6875rem] tracking-[0.15em] uppercase text-primary/90 font-bold tabular-nums"
              dir="ltr"
            >
              {Math.round(snapshot.meta.location.elevation_m)} m · {activeLocation?.lat.toFixed(2)},{' '}
              {activeLocation?.lng.toFixed(2)}
            </p>
          </div>
          <button
            onClick={refresh}
            aria-label={'تحديث الطقس'}
            className="w-11 h-11 rounded-lg border border-border/60 bg-card flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="px-4 pt-5 space-y-6">
        {/* City Search Module */}
        <CitySearch onSelectCity={handleCitySelect} />

        {/* Dynamic Segmented Control main tabs */}
        <div className="flex bg-background border border-border p-1.5 rounded-2xl gap-1.5 sticky top-16 z-header">
          {mainTabs.map((t) => {
            const TabIcon = t.icon;
            const active = activeMainTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveMainTab(t.id);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl font-bold transition-all duration-200 active:scale-95 ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="text-[0.625rem] leading-tight text-center truncate max-w-full">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeMainTab === 'now' && (
            <motion.div
              key="now"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Ambient Hero Panel */}
              <section className="relative rounded-[26px] surface-depth overflow-hidden">
                <AmbientBackdrop
                  code={currentHour?.weather_code ?? 0}
                  isDay={currentHour?.is_day ?? true}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40"
                />
                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] tracking-[0.2em] uppercase text-primary/95 font-bold">
                        {comfortLabel(snapshot.temperature.thermal_comfort_level)}
                      </p>
                      <div className="mt-3 flex items-end gap-3" dir="ltr">
                        <span className="text-[5.125rem] leading-[0.72] text-foreground tabular-nums font-extrabold">
                          {Math.round(snapshot.temperature.actual_c)}°
                        </span>
                        <span className="mb-1 text-[1.5rem] leading-none text-primary/90 font-bold tabular-nums">
                          /{Math.round(snapshot.temperature.apparent_c)}°
                        </span>
                      </div>
                      <p className="mt-4 text-[0.875rem] text-foreground/95 font-extrabold">
                        {labelForWeatherCode(currentHour?.weather_code ?? 0)}
                      </p>
                      <p
                        className="mt-2 text-[0.75rem] text-foreground/90 font-bold tabular-nums"
                        dir="ltr"
                      >
                        ↑ {Math.round(snapshot.temperature.daily_high_c)}° · ↓{' '}
                        {Math.round(snapshot.temperature.daily_low_c)}° · {'ندى'}{' '}
                        {Math.round(snapshot.temperature.dew_point_c)}°
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                        className="relative"
                      >
                        <CurrentIcon className="w-20 h-20 text-primary" strokeWidth={1.05} />
                      </motion.div>
                      <div className="text-center">
                        <div className="text-[0.6875rem] tracking-[0.15em] uppercase text-foreground/80 font-bold">
                          {'ثقة التنبؤ'}
                        </div>
                        <div
                          className="font-bold text-[1.375rem] leading-none text-foreground tabular-nums"
                          dir="ltr"
                        >
                          {conf}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-5 h-1.5 rounded-full bg-foreground/15 overflow-hidden"
                    dir="ltr"
                  >
                    {/* scaleX, not width: animating width relayouts on every
                        frame (design-system §8). */}
                    <motion.div
                      className="h-full w-full origin-left rounded-full bg-primary"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: conf / 100 }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2.5 text-center" dir="ltr">
                    {[
                      {
                        label: 'ضغط',
                        value: `${Math.round(snapshot.pressure.msl_hpa)}`,
                        unit: 'hPa',
                      },
                      {
                        label: 'ندى',
                        value: `${Math.round(snapshot.temperature.dew_point_c)}`,
                        unit: '°',
                      },
                      {
                        label: 'انزعاج',
                        value: snapshot.temperature.discomfort_index.toFixed(1),
                        unit: '',
                      },
                      { label: 'أقصى UV', value: snapshot.solar.uv_max_today.toFixed(1), unit: '' },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-xl border border-border/50 bg-background/50 py-2.5 px-1.5 shadow-sm"
                      >
                        <div className="text-[0.6875rem] tracking-[0.1em] uppercase text-foreground/90 font-bold">
                          {m.label}
                        </div>
                        <div className="mt-1 flex items-baseline justify-center gap-0.5 tabular-nums">
                          <span className="font-bold text-[1.125rem] leading-none text-foreground">
                            {m.value}
                          </span>
                          {m.unit && (
                            <span className="text-[0.625rem] text-primary/90 font-bold">{m.unit}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Provenance for the blended numbers above. */}
              <EnsembleTrustPanel snapshot={snapshot} />

              {/* Dynamic Hourly Ribbon Slider */}
              <HourlyRibbon entries={hourly} iconFor={iconForCode} locale={locale} />

              {/* Standard Bento Tiles */}
              <div className="grid grid-cols-2 gap-3">
                <GaugeTile
                  label={'مؤشر UV'}
                  value={snapshot.solar.uv_index.toFixed(1)}
                  pctValue={snapshot.solar.uv_index / 11}
                  hint={uvCategoryLabel(snapshot.solar.uv_category)}
                  icon={<Sun />}
                />
                <GaugeTile
                  label={'الرطوبة النسبية'}
                  value={Math.round(snapshot.moisture.relative_humidity_percent)}
                  unit="%"
                  pctValue={snapshot.moisture.relative_humidity_percent / 100}
                  hint={`${'ندى'} ${Math.round(snapshot.temperature.dew_point_c)}°`}
                  icon={<Droplets />}
                />
                <GaugeTile
                  label={'تغطية الغيوم'}
                  value={Math.round(snapshot.sky.cloud_cover_total_percent)}
                  unit="%"
                  pctValue={snapshot.sky.cloud_cover_total_percent / 100}
                  hint={cloudTypeLabel(snapshot.sky.cloud_type)}
                  icon={<Cloud />}
                />
                <GaugeTile
                  label={'مدى الرؤية الأفقية'}
                  value={Math.round(snapshot.sky.visibility_km)}
                  unit="كم"
                  pctValue={Math.min(1, snapshot.sky.visibility_km / 20)}
                  icon={<Eye />}
                />
              </div>

              {/* Real Air Quality Indicator (AQI) with pollutant meters */}
              <AQIGauge
                caqi={snapshot.airQuality.aqi_eu_caqi}
                category={aqiCategoryLabel(snapshot.airQuality.aqi_category)}
                pm25={snapshot.airQuality.pm25_ugm3}
                pm10={snapshot.airQuality.pm10_ugm3}
                o3={snapshot.airQuality.o3_ugm3}
                no2={snapshot.airQuality.no2_ugm3}
                so2={snapshot.airQuality.so2_ugm3}
                co={snapshot.airQuality.co_mgm3}
                advisory={aqiAdvice(snapshot.airQuality.aqi_us)}
                healthScore={snapshot.biological.outdoor_health_score}
                source={snapshot.airQuality.source_station_name}
              />

              {/* Live Sun trajectory */}
              <LiveSunArc
                sunrise={snapshot.astronomical.sunrise}
                noon={snapshot.astronomical.solar_noon}
                sunset={snapshot.astronomical.sunset}
                elevationDeg={snapshot.solar.solar_elevation_deg}
                azimuthDeg={snapshot.solar.solar_azimuth_deg}
                dayLengthH={snapshot.astronomical.day_length_hours}
                locale={locale}
              />
            </motion.div>
          )}

          {activeMainTab === 'forecast' && (
            <motion.div
              key="forecast"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* NEW Component: MicroMap Dark Live Map */}
              <MicroMap
                lat={activeLocation?.lat ?? snapshot.meta.location.lat}
                lng={activeLocation?.lng ?? snapshot.meta.location.lng}
                elevationM={Math.round(snapshot.meta.location.elevation_m)}
              />

              {/* Canvas-rendered ensemble trend: blended line + model spread band. */}
              <HourlyTrendPanel entries={hourly} />

              {/* Multi-day forecasts */}
              <DailyRangeStrip
                days={forecast.daily.slice(0, 7)}
                iconFor={iconForCode}
                locale={locale}
              />

              {/* Microclimatology and Derived scores */}
              <Panel title={'المؤشرات الفيزيائية المشتقة'} sub={'علم الغلاف'}>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <Metric
                    label="VPD"
                    value={snapshot.moisture.vapor_pressure_deficit_kpa.toFixed(2)}
                    unit="kPa"
                  />
                  <Metric
                    label={'رطوبة مطلقة'}
                    value={snapshot.moisture.absolute_humidity_gm3.toFixed(1)}
                    unit="g/m³"
                  />
                  <Metric
                    label={'انزعاج'}
                    value={snapshot.temperature.discomfort_index.toFixed(1)}
                  />
                  <Metric
                    label={'قاعدة السحب'}
                    value={snapshot.sky.cloud_base_m ?? '—'}
                    unit={snapshot.sky.cloud_base_m ? 'م' : ''}
                  />
                  {snapshot.instability.cape_jkg !== null && (
                    <Metric
                      label="CAPE"
                      value={Math.round(snapshot.instability.cape_jkg)}
                      unit="J/kg"
                    />
                  )}
                  {snapshot.instability.lifted_index !== null && (
                    <Metric label="Lifted" value={snapshot.instability.lifted_index.toFixed(1)} />
                  )}
                </div>
              </Panel>
            </motion.div>
          )}

          {activeMainTab === 'radar' && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Live Wind Compass & Dynamics */}
              <WindCompass
                speed={snapshot.wind.speed_kph}
                gusts={snapshot.wind.gusts_kph}
                dirDeg={snapshot.wind.direction_deg}
                cardinal={compassLabel(snapshot.wind.direction_cardinal_16pt, true)}
                beaufort={beaufortLabel(snapshot.wind.beaufort_scale)}
              />

              {/* NEW Component: Realtime Particle simulator & interactive radar */}
              <RadarMap
                pastTimestamps={snapshot.radar.past_timestamps}
                futureTimestamps={snapshot.radar.future_timestamps}
                tileTemplate={snapshot.radar.tile_url_template}
                windSpeedKph={snapshot.wind.speed_kph}
                windDirectionDeg={snapshot.wind.direction_deg}
                precipIntensity={snapshot.precipitation.intensity_mm_hr}
                weatherCode={currentHour?.weather_code ?? 0}
              />

              {/* Classic details panel */}
              <Panel
                title={'القياسات الفيزيائية اللحظية الفريدة'}
                sub={`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried}`}
              >
                <div className="grid grid-cols-3 gap-y-5 gap-x-3">
                  <Metric
                    label={'الكرة الرطبة'}
                    value={Math.round(snapshot.temperature.wet_bulb_c)}
                    unit="°"
                  />
                  <Metric
                    label={'نقطة الندى'}
                    value={Math.round(snapshot.temperature.dew_point_c)}
                    unit="°"
                  />
                  <Metric
                    label={'هبات الرياح'}
                    value={Math.round(snapshot.wind.gusts_kph)}
                    unit="كم/س"
                    hint={beaufortLabel(snapshot.wind.beaufort_scale)}
                  />
                  <Metric
                    label={'مسافة الرياح اليومية'}
                    value={snapshot.wind.wind_run_km_day ?? 0}
                    unit="كم"
                  />
                  <Metric
                    label={'قاعدة السحب'}
                    value={snapshot.sky.cloud_base_m ?? '—'}
                    unit={snapshot.sky.cloud_base_m ? 'م' : ''}
                  />
                  <Metric
                    label={'احتمالية الضباب'}
                    value={Math.round(snapshot.sky.fog_probability_percent)}
                    unit="%"
                  />
                </div>
              </Panel>
            </motion.div>
          )}

          {activeMainTab === 'lab' && (
            <motion.div
              key="lab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* NEW Component: Smart Weather Planner & Medical Advisories */}
              <WeatherPlanner
                aqiUs={snapshot.airQuality.aqi_us}
                uvIndex={snapshot.solar.uv_index}
                humidityPercent={snapshot.moisture.relative_humidity_percent}
                temperatureC={snapshot.temperature.actual_c}
                pollenRisk={snapshot.biological.pollen_risk}
                solarElevationDeg={snapshot.solar.solar_elevation_deg}
              />

              {/* NEW Component: Physics Meteorology Calculator simulator */}
              <MeteorologyConsole />

              {/* Astronomics and Lunar stats */}
              <Panel title={'الفلك والضوء والشهور القمرية'} sub={'تفاصيل فلكية'}>
                <div className="grid grid-cols-3 gap-y-5 gap-x-3">
                  <Metric
                    label={'طول النهار'}
                    value={snapshot.astronomical.day_length_hours.toFixed(1)}
                    unit="h"
                  />
                  <Metric
                    label={'الشمس'}
                    value={snapshot.solar.solar_elevation_deg.toFixed(0)}
                    unit="°"
                    hint={`${snapshot.solar.solar_azimuth_deg.toFixed(0)}°`}
                  />
                  <Metric label="GHI" value={Math.round(snapshot.solar.ghi_wm2)} unit="W/m²" />
                  <Metric label={'أقصى UV'} value={snapshot.solar.uv_max_today.toFixed(1)} />
                  <Metric
                    label={'القمر'}
                    value={`${moonGlyph} ${snapshot.astronomical.moon_illumination_percent.toFixed(0)}%`}
                    hint={snapshot.astronomical.moon_phase_name.replace(/_/g, ' ')}
                  />
                  <Metric
                    label={'الساعة الذهبية'}
                    value={timeLabel(snapshot.astronomical.golden_hour_evening_start, locale)}
                  />
                </div>
              </Panel>

              {/* 12 sources management console */}
              <SourceHealthPanel />
            </motion.div>
          )}
        </AnimatePresence>

        <footer
          className="pt-2 pb-6 text-center text-[0.625rem] tracking-[0.18em] uppercase text-primary/70 tabular-nums"
          dir="ltr"
        >
          {tier ?? 'fresh'} · {timeLabel(snapshot.meta.last_updated_unix, locale)} ·{' '}
          {snapshot.meta.fetch_duration_ms}ms
        </footer>
      </main>
    </div>
  );
}
