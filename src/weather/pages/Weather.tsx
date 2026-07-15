import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { useWeather } from '../hooks/useWeather';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import { snapshotAllSources, type SourceHealth } from '../engine/SourceHealthMonitor';
import {
  Activity,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloudy,
  Droplets,
  Eye,
  Gauge,
  Leaf,
  MoonStar,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from '@/lib/icons';

function iconForCode(code: number, isDay: boolean) {
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

function weatherLabel(code: number, ar: boolean) {
  if (code <= 1) return ar ? 'سماء صافية' : 'Klarer Himmel';
  if (code === 2) return ar ? 'غائم جزئياً' : 'Teilweise bewölkt';
  if (code === 3) return ar ? 'غائم' : 'Bewölkt';
  if (code === 45 || code === 48) return ar ? 'ضباب' : 'Nebel';
  if (code >= 51 && code <= 57) return ar ? 'رذاذ' : 'Nieselregen';
  if (code >= 61 && code <= 67) return ar ? 'مطر' : 'Regen';
  if (code >= 71 && code <= 77) return ar ? 'ثلج' : 'Schnee';
  if (code >= 80 && code <= 82) return ar ? 'زخات مطر' : 'Regenschauer';
  if (code >= 85 && code <= 86) return ar ? 'زخات ثلج' : 'Schneeschauer';
  if (code >= 95) return ar ? 'عواصف رعدية' : 'Gewitter';
  return '—';
}

function comfortLabel(value: string, ar: boolean) {
  const map: Record<string, string> = {
    dangerously_cold: ar ? 'برد خطِر' : 'Gefährlich kalt',
    cold: ar ? 'بارد' : 'Kalt',
    cool: ar ? 'لطيف بارد' : 'Kühl',
    comfortable: ar ? 'مريح' : 'Angenehm',
    warm: ar ? 'دافئ' : 'Warm',
    hot: ar ? 'حار' : 'Heiß',
    dangerously_hot: ar ? 'حرارة خطِرة' : 'Gefährlich heiß',
  };
  return map[value] ?? value.replace(/_/g, ' ');
}

function smoothPath(points: Array<{ x: number; y: number }>, tension = 0.28) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension}, ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function timeLabel(value: string | number | undefined, locale: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function pct(value: number, max: number) {
  return Math.max(0, Math.min(1, value / max));
}

function Panel({ title, sub, children }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <section className="relative rounded-[22px] border border-border/55 bg-card overflow-hidden shadow-[0_1px_0_hsl(var(--foreground)/0.04)_inset,0_18px_40px_-30px_hsl(var(--foreground)/0.45)]">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {(title || sub) && (
        <header className="px-4 pt-4 pb-3 flex items-end justify-between gap-3">
          {title && <h2 className="font-cormorant text-[24px] leading-none text-foreground">{title}</h2>}
          {sub && <span className="text-[10px] tracking-[0.24em] uppercase text-primary/80 tabular-nums text-end">{sub}</span>}
        </header>
      )}
      <div className={title || sub ? 'px-4 pb-4' : 'p-4'}>{children}</div>
    </section>
  );
}

function Metric({ label, value, unit, hint, icon }: { label: string; value: string | number; unit?: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
        {icon && <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-primary shrink-0">{icon}</span>}
        <span className="text-[10px] tracking-[0.15em] uppercase truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1 tabular-nums" dir="ltr">
        <span className="font-cormorant text-[28px] leading-none text-foreground">{value}</span>
        {unit && <span className="text-[12px] text-primary/80">{unit}</span>}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{hint}</p>}
    </div>
  );
}

function LineChart({
  title,
  sub,
  entries,
  series,
  unit,
}: {
  title: string;
  sub: string;
  entries: Array<{ timestamp_unix: number }>;
  series: Array<{ label: string; values: number[]; accent?: boolean }>;
  unit?: string;
}) {
  const slice = entries.slice(0, 24);
  if (slice.length < 2 || series.some(s => s.values.length < 2)) return null;

  const W = 320;
  const H = 116;
  const padX = 8;
  const padY = 12;
  const all = series.flatMap(s => s.values.slice(0, slice.length));
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);
  const toPoint = (value: number, i: number) => ({
    x: padX + (i / (slice.length - 1)) * (W - padX * 2),
    y: padY + (1 - (value - min) / span) * (H - padY * 2),
  });

  return (
    <Panel title={title} sub={sub}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {series.map(s => (
            <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${s.accent ? 'bg-primary' : 'bg-foreground/35'}`} />
              {s.label}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-primary tabular-nums" dir="ltr">
          {Math.round(min)}–{Math.round(max)}{unit}
        </span>
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }} dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`area-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.26" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={padX} x2={W - padX} y1={padY + f * (H - padY * 2)} y2={padY + f * (H - padY * 2)} stroke="hsl(var(--foreground))" strokeOpacity="0.08" strokeWidth="0.5" />
          ))}
          {series.map((s, idx) => {
            const points = s.values.slice(0, slice.length).map(toPoint);
            const path = smoothPath(points);
            const area = `${path} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
            return (
              <g key={s.label}>
                {s.accent && <motion.path d={area} fill={`url(#area-${title})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} />}
                <motion.path
                  d={path}
                  fill="none"
                  stroke={s.accent ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                  strokeOpacity={s.accent ? 0.95 : 0.38}
                  strokeWidth={s.accent ? 2.2 : 1.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: idx * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ vectorEffect: 'non-scaling-stroke' } as CSSProperties}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-muted-foreground/75 tabular-nums" dir="ltr">
        {[0, 6, 12, 18, slice.length - 1].filter((v, i, a) => v < slice.length && a.indexOf(v) === i).map((i, idx) => (
          <span key={slice[i].timestamp_unix}>{idx === 0 ? 'now' : `${new Date(slice[i].timestamp_unix).getHours()}h`}</span>
        ))}
      </div>
    </Panel>
  );
}

function BarChart({ title, sub, entries, values, unit, max = 100 }: { title: string; sub: string; entries: Array<{ timestamp_unix: number }>; values: number[]; unit: string; max?: number }) {
  const slice = entries.slice(0, 24);
  if (slice.length < 2) return null;
  return (
    <Panel title={title} sub={sub}>
      <div className="h-28 flex items-end gap-1.5" dir="ltr">
        {slice.map((entry, i) => (
          <div key={entry.timestamp_unix} className="flex-1 h-full flex flex-col justify-end gap-1 min-w-0">
            <motion.div
              className="rounded-t-sm bg-primary/70 min-h-[2px]"
              initial={{ height: 0, opacity: 0.3 }}
              animate={{ height: `${Math.max(3, pct(values[i] ?? 0, max) * 100)}%`, opacity: 1 }}
              transition={{ delay: i * 0.012, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-muted-foreground/75 tabular-nums" dir="ltr">
        <span>now</span>
        <span>{Math.round(Math.max(...values))}{unit}</span>
        <span>{new Date(slice[slice.length - 1].timestamp_unix).getHours()}h</span>
      </div>
    </Panel>
  );
}

function GaugeTile({ label, value, unit, pctValue, hint, icon }: { label: string; value: string | number; unit?: string; pctValue: number; hint?: string; icon?: ReactNode }) {
  const clamped = Math.max(0, Math.min(1, pctValue));
  const circumference = 2 * Math.PI * 33;
  return (
    <div className="rounded-2xl border border-border/55 bg-background/35 p-3 min-w-0">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="text-[10px] tracking-[0.16em] uppercase truncate">{label}</span>
        {icon && <span className="[&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-primary shrink-0">{icon}</span>}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0 -rotate-90">
          <circle cx="40" cy="40" r="33" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.09" strokeWidth="7" />
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
            <span className="font-cormorant text-[30px] leading-none text-foreground">{value}</span>
            {unit && <span className="text-[11px] text-primary/80">{unit}</span>}
          </div>
          {hint && <p className="mt-1 text-[10px] text-muted-foreground truncate">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function SunArc({ sunrise, noon, sunset, locale, ar }: { sunrise: string; noon: string; sunset: string; locale: string; ar: boolean }) {
  return (
    <Panel title={ar ? 'الشمس والضوء' : 'Sonne und Licht'} sub={ar ? 'اليوم' : 'heute'}>
      <div className="relative h-28" dir="ltr">
        <svg viewBox="0 0 320 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <path d="M 22 88 C 82 14, 238 14, 298 88" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
          <path d="M 22 88 L 298 88" stroke="hsl(var(--foreground))" strokeOpacity="0.12" strokeWidth="1" />
          <motion.circle cx="160" cy="32" r="5" fill="hsl(var(--primary))" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center" dir="ltr">
        <Metric label={ar ? 'الشروق' : 'Aufgang'} value={timeLabel(sunrise, locale)} icon={<Sunrise />} />
        <Metric label={ar ? 'الزوال' : 'Mittag'} value={timeLabel(noon, locale)} icon={<Sun />} />
        <Metric label={ar ? 'الغروب' : 'Untergang'} value={timeLabel(sunset, locale)} icon={<Sunset />} />
      </div>
    </Panel>
  );
}

function SourceHealthPanel({ ar }: { ar: boolean }) {
  const [rows, setRows] = useState<SourceHealth[]>([]);
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
    <Panel title={ar ? 'مصادر الرصد' : 'Messquellen'} sub={`${rows.filter(r => r.state === 'closed').length}/${rows.length}`}>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.state === 'closed' ? 'bg-primary' : r.state === 'half_open' ? 'bg-warning' : 'bg-destructive'}`} />
              <span className="truncate text-foreground">{r.label}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">w {r.effectiveWeight.toFixed(2)}</span>
            <span className="text-muted-foreground tabular-nums">{r.avgResponseMs}ms</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// --- Premium components -----------------------------------------------------

function AmbientBackdrop({ code, isDay }: { code: number; isDay: boolean }) {
  const palette = useMemo(() => {
    if (code >= 95) return ['hsl(230 40% 8%)', 'hsl(200 30% 12%)'];
    if (code >= 71 && code <= 77) return ['hsl(210 30% 18%)', 'hsl(220 25% 10%)'];
    if (code >= 61 && code <= 82) return ['hsl(215 32% 14%)', 'hsl(220 30% 8%)'];
    if (code >= 45 && code <= 48) return ['hsl(220 12% 16%)', 'hsl(220 12% 8%)'];
    if (code >= 2) return isDay ? ['hsl(215 22% 16%)', 'hsl(220 25% 9%)'] : ['hsl(225 30% 10%)', 'hsl(230 35% 6%)'];
    return isDay ? ['hsl(32 58% 20% / 0.55)', 'hsl(220 28% 8%)'] : ['hsl(230 40% 12%)', 'hsl(230 40% 5%)'];
  }, [code, isDay]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle at 30% 30%, ${palette[0]}, transparent 65%)` }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}
      />
      <motion.div
        className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle at 60% 60%, ${palette[1]}, transparent 65%)` }}
        initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ duration: 1.4, delay: 0.1 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(80% 60% at 50% 0%, hsl(var(--primary) / 0.10), transparent 60%)' }}
        animate={{ opacity: [0.55, 0.9, 0.55] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function HourlyRibbon({
  entries,
  iconFor,
  locale,
  ar,
}: {
  entries: Array<{ timestamp_unix: number; temperature_c: number; weather_code: number; is_day: boolean; precip_probability_percent: number }>;
  iconFor: (code: number, isDay: boolean) => typeof Sun;
  locale: string;
  ar: boolean;
}) {
  const slice = entries.slice(0, 12);
  if (slice.length < 2) return null;
  const temps = slice.map(e => e.temperature_c);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  return (
    <Panel title={ar ? 'الساعات القادمة' : 'Kommende Stunden'} sub={ar ? '12 ساعة' : '12 Stunden'}>
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
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted-foreground tabular-nums">
                  {i === 0 ? (ar ? 'الآن' : 'jetzt') : new Date(e.timestamp_unix).toLocaleTimeString(locale, { hour: '2-digit', hour12: false })}
                </div>
                <Icon className="w-4 h-4 mx-auto my-1.5 text-primary" strokeWidth={1.4} />
                <div className="font-cormorant text-[20px] leading-none text-foreground tabular-nums">{Math.round(e.temperature_c)}°</div>
                <div className="mt-2 h-8 rounded-full bg-foreground/5 relative overflow-hidden">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-primary/70 to-primary/20"
                    style={{ height: `${Math.max(6, heat * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-[9px] text-primary/80 tabular-nums">{Math.round(e.precip_probability_percent)}%</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function WindCompass({ speed, gusts, dirDeg, cardinal, beaufort, ar }: { speed: number; gusts: number; dirDeg: number; cardinal: string; beaufort: string; ar: boolean }) {
  const cardinals = ['N', 'E', 'S', 'W'];
  return (
    <Panel title={ar ? 'الرياح' : 'Wind'} sub={ar ? 'بوصلة' : 'Kompass'}>
      <div className="flex items-center gap-4">
        <div className="relative w-[120px] h-[120px] shrink-0" dir="ltr">
          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.08" strokeWidth="1" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="1 4" />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
              const r1 = i % 6 === 0 ? 44 : 48;
              const r2 = 52;
              return (
                <line key={i}
                  x1={60 + Math.cos(a) * r1} y1={60 + Math.sin(a) * r1}
                  x2={60 + Math.cos(a) * r2} y2={60 + Math.sin(a) * r2}
                  stroke="hsl(var(--foreground))" strokeOpacity={i % 6 === 0 ? 0.35 : 0.12} strokeWidth={i % 6 === 0 ? 1.4 : 0.8}
                />
              );
            })}
            {cardinals.map((c, i) => {
              const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
              return (
                <text key={c} x={60 + Math.cos(a) * 36} y={60 + Math.sin(a) * 36 + 3}
                  textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" letterSpacing="1">
                  {c}
                </text>
              );
            })}
          </svg>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 0 }} animate={{ rotate: dirDeg }}
            transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          >
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <defs>
                <linearGradient id="wind-needle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <path d="M60 14 L66 60 L60 55 L54 60 Z" fill="url(#wind-needle)" />
              <path d="M60 106 L64 66 L60 70 L56 66 Z" fill="hsl(var(--foreground))" fillOpacity="0.28" />
              <circle cx="60" cy="60" r="3" fill="hsl(var(--primary))" />
            </svg>
          </motion.div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-cormorant text-[42px] leading-none text-foreground">{Math.round(speed)}</span>
            <span className="text-[12px] text-primary/85">km/h</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{cardinal} · {Math.round(dirDeg)}°</p>
          <p className="mt-2 text-[11px] text-foreground/80 leading-snug">{beaufort}</p>
          <p className="mt-1 text-[10px] text-primary/80 tabular-nums" dir="ltr">{ar ? 'هبات' : 'Böen'} {Math.round(gusts)} km/h</p>
        </div>
      </div>
    </Panel>
  );
}

function AQIGauge({ caqi, category, pm25, pm10, o3, no2, so2, co, advisory, healthScore, source, ar }: {
  caqi: number; category: string; pm25: number; pm10: number; o3: number; no2: number; so2: number; co: number; advisory: string; healthScore: number; source: string | null; ar: boolean;
}) {
  const bands = [
    { to: 25, color: 'hsl(150 55% 45%)', label: ar ? 'ممتاز' : 'sehr gut' },
    { to: 50, color: 'hsl(90 55% 48%)', label: ar ? 'جيد' : 'gut' },
    { to: 75, color: 'hsl(45 85% 55%)', label: ar ? 'متوسط' : 'mäßig' },
    { to: 100, color: 'hsl(20 80% 55%)', label: ar ? 'ضعيف' : 'schlecht' },
    { to: 150, color: 'hsl(0 70% 52%)', label: ar ? 'رديء جداً' : 'sehr schlecht' },
  ];
  const clamped = Math.max(0, Math.min(150, caqi));
  const arcLen = Math.PI; // half circle 0..150 mapped
  const R = 62;
  const cx = 80, cy = 78;
  const angleFor = (v: number) => Math.PI + (Math.max(0, Math.min(150, v)) / 150) * arcLen;
  const pointFor = (v: number, r = R) => {
    const a = angleFor(v);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  const needle = pointFor(clamped, R - 6);
  const activeBand = bands.find(b => clamped <= b.to) ?? bands[bands.length - 1];
  const pollutants: Array<{ label: string; value: number; unit: string; limit: number }> = [
    { label: 'PM2.5', value: pm25, unit: 'µg', limit: 25 },
    { label: 'PM10', value: pm10, unit: 'µg', limit: 50 },
    { label: 'O₃', value: o3, unit: 'µg', limit: 120 },
    { label: 'NO₂', value: no2, unit: 'µg', limit: 40 },
    { label: 'SO₂', value: so2, unit: 'µg', limit: 40 },
    { label: 'CO', value: co, unit: 'mg', limit: 10 },
  ];
  return (
    <Panel title={ar ? 'جودة الهواء' : 'Luftqualität'} sub={source ?? (ar ? 'نموذج' : 'Modell')}>
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
                <path key={i}
                  d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`}
                  stroke={b.color} strokeOpacity="0.85" strokeWidth="8" fill="none" strokeLinecap="butt"
                />
              );
            })}
            <motion.line
              x1={cx} y1={cy} x2={needle.x} y2={needle.y}
              stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <circle cx={cx} cy={cy} r="4" fill="hsl(var(--foreground))" />
          </svg>
          <div className="absolute inset-x-0 -bottom-1 text-center">
            <div className="font-cormorant text-[30px] leading-none text-foreground tabular-nums">{Math.round(caqi)}</div>
            <div className="text-[10px] tracking-[0.16em] uppercase" style={{ color: activeBand.color }}>{activeBand.label}</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">{advisory}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] tracking-[0.16em] uppercase text-primary/80">
            <span>{ar ? 'مؤشر الصحة' : 'Gesundheit'}</span>
            <span className="tabular-nums text-foreground">{healthScore}/100</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {pollutants.map(p => {
          const ratio = Math.max(0, Math.min(1.5, p.value / p.limit));
          const color = ratio < 0.5 ? 'hsl(150 55% 45%)' : ratio < 1 ? 'hsl(45 85% 55%)' : 'hsl(0 70% 52%)';
          return (
            <div key={p.label} className="rounded-xl border border-border/40 bg-background/30 px-2 py-2 min-w-0">
              <div className="flex items-center justify-between text-[9px] tracking-[0.12em] uppercase text-muted-foreground">
                <span>{p.label}</span>
                <span className="tabular-nums" style={{ color }}>{p.value.toFixed(p.label === 'CO' ? 2 : 1)}<span className="text-muted-foreground/70 ms-0.5">{p.unit}</span></span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-foreground/8 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: color }}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(100, ratio * 100)}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LiveSunArc({ sunrise, noon, sunset, elevationDeg, azimuthDeg, dayLengthH, locale, ar }: {
  sunrise: string; noon: string; sunset: string; elevationDeg: number; azimuthDeg: number; dayLengthH: number; locale: string; ar: boolean;
}) {
  const now = Date.now();
  const t0 = new Date(sunrise).getTime();
  const t1 = new Date(sunset).getTime();
  const progress = Math.max(0, Math.min(1, (now - t0) / Math.max(1, t1 - t0)));
  const W = 320, H = 130, padX = 22, baseY = 108;
  const cx = padX + progress * (W - padX * 2);
  // parabolic arc y = baseY - 4*peak*progress*(1-progress)
  const peak = 78;
  const cy = baseY - 4 * peak * progress * (1 - progress);
  return (
    <Panel title={ar ? 'مسار الشمس' : 'Sonnenlauf'} sub={ar ? `${dayLengthH.toFixed(1)} ساعة` : `${dayLengthH.toFixed(1)} h`}>
      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }} dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="sun-arc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M ${padX} ${baseY} Q ${W / 2} ${baseY - 4 * peak * 0.25 * 4} ${W - padX} ${baseY} L ${W - padX} ${baseY} L ${padX} ${baseY} Z`} fill="url(#sun-arc-fill)" />
          <path d={`M ${padX} ${baseY} Q ${W / 2} ${baseY - 4 * peak * 0.25 * 4} ${W - padX} ${baseY}`} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.75" strokeWidth="1.6" strokeLinecap="round" />
          <line x1={padX} x2={W - padX} y1={baseY} y2={baseY} stroke="hsl(var(--foreground))" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="2 3" />
          <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            <circle cx={cx} cy={cy} r="14" fill="hsl(var(--primary))" fillOpacity="0.18" />
            <circle cx={cx} cy={cy} r="6" fill="hsl(var(--primary))" />
          </motion.g>
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center" dir="ltr">
        <div>
          <div className="flex items-center justify-center gap-1 text-[10px] tracking-[0.16em] uppercase text-muted-foreground"><Sunrise className="w-3 h-3 text-primary" /> {ar ? 'شروق' : 'Aufgang'}</div>
          <div className="mt-1 font-cormorant text-[22px] leading-none text-foreground tabular-nums">{timeLabel(sunrise, locale)}</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-[10px] tracking-[0.16em] uppercase text-muted-foreground"><Sun className="w-3 h-3 text-primary" /> {ar ? 'الآن' : 'Höhe'}</div>
          <div className="mt-1 font-cormorant text-[22px] leading-none text-foreground tabular-nums">{elevationDeg.toFixed(0)}°</div>
          <div className="text-[10px] text-primary/75 tabular-nums">{Math.round(azimuthDeg)}°</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-[10px] tracking-[0.16em] uppercase text-muted-foreground"><Sunset className="w-3 h-3 text-primary" /> {ar ? 'غروب' : 'Untergang'}</div>
          <div className="mt-1 font-cormorant text-[22px] leading-none text-foreground tabular-nums">{timeLabel(sunset, locale)}</div>
        </div>
      </div>
    </Panel>
  );
}

function DailyRangeStrip({ days, iconFor, locale, ar }: {
  days: Array<{ date_unix: number; high_c: number; low_c: number; weather_code: number }>;
  iconFor: (code: number, isDay: boolean) => typeof Sun;
  locale: string; ar: boolean;
}) {
  if (days.length === 0) return null;
  const globalMin = Math.min(...days.map(d => d.low_c));
  const globalMax = Math.max(...days.map(d => d.high_c));
  const span = Math.max(1, globalMax - globalMin);
  return (
    <Panel title={ar ? 'الأيام القادمة' : 'Nächste Tage'} sub={`${days.length} ${ar ? 'أيام' : 'Tage'}`}>
      <div className="space-y-2" dir="ltr">
        {days.map((d, i) => {
          const DayIcon = iconFor(d.weather_code, true);
          const leftPct = ((d.low_c - globalMin) / span) * 100;
          const rightPct = ((d.high_c - globalMin) / span) * 100;
          return (
            <motion.div
              key={d.date_unix}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-[56px_28px_1fr_auto] items-center gap-3"
            >
              <span className="text-[11px] text-muted-foreground">
                {i === 0 ? (ar ? 'اليوم' : 'Heute') : new Date(d.date_unix).toLocaleDateString(locale, { weekday: 'short' })}
              </span>
              <DayIcon className="w-4 h-4 text-primary" strokeWidth={1.4} />
              <div className="relative h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400/70 via-primary/80 to-orange-400/80"
                  style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-foreground">
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

// -----------------------------------------------------------------------------

export default function Weather() {
  const { language } = useApp();
  const ar = language === 'ar';
  const locale = ar ? 'en-GB' : 'de-DE';
  const { snapshot, status, tier, isRefreshing, refresh } = useWeather(ar ? 'ar' : 'de');
  const { forecast } = useWeatherForecast(ar ? 'ar' : 'de');

  const hourly = forecast.hourly.slice(0, 24);
  const currentHour = hourly[0];
  const CurrentIcon = iconForCode(currentHour?.weather_code ?? 0, currentHour?.is_day ?? true);
  const moonGlyph = useMemo(() => {
    const p = snapshot?.astronomical.moon_phase_name ?? 'new_moon';
    return ({ new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓', waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖', last_quarter: '🌗', waning_crescent: '🌘' } as const)[p];
  }, [snapshot]);

  if (status === 'loading' && !snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center bg-background text-foreground">
        <span className="font-cormorant text-2xl text-primary">{ar ? 'نقرأ السماء…' : 'Der Himmel wird gelesen…'}</span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen p-6 grid place-items-center bg-background text-foreground">
        <span className="text-sm text-muted-foreground">{ar ? 'تعذر تحميل بيانات الطقس.' : 'Wetterdaten nicht verfügbar.'}</span>
      </div>
    );
  }

  const conf = snapshot.meta.ensemble_confidence_percent;

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen pb-24 bg-background text-foreground">
      <Helmet>
        <title>{ar ? 'طقس SmartHub — لوحة الرصد' : 'SmartHub Wetter — Messpanel'}</title>
        <meta name="description" content={ar ? 'لوحة طقس تفصيلية برسوم بيانية للحرارة والرياح والرطوبة والضغط وجودة الهواء.' : 'Detailliertes Wetterpanel mit Diagrammen für Temperatur, Wind, Feuchte, Druck und Luftqualität.'} />
      </Helmet>

      <div className="sticky top-0 z-20 border-b border-border/55 bg-background/86 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-cormorant text-[25px] leading-none text-foreground truncate">
              {ar ? 'لوحة الطقس الداخلية' : 'Wetter-Instrumente'}
            </h1>
            <p className="mt-1 text-[10px] tracking-[0.2em] uppercase text-primary/75 tabular-nums" dir="ltr">
              {Math.round(snapshot.meta.location.elevation_m)} m · {snapshot.meta.location.lat.toFixed(2)}, {snapshot.meta.location.lng.toFixed(2)}
            </p>
          </div>
          <button onClick={refresh} aria-label={ar ? 'تحديث الطقس' : 'Wetter aktualisieren'} className="w-10 h-10 rounded-2xl border border-border/60 bg-card flex items-center justify-center active:scale-95 transition-transform">
            <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <main className="px-4 pt-5 space-y-4">
        <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.24em] uppercase text-primary/80">
                  {comfortLabel(snapshot.temperature.thermal_comfort_level, ar)}
                </p>
                <div className="mt-2 flex items-end gap-3" dir="ltr">
                  <span className="font-cormorant text-[86px] leading-[0.72] text-foreground tabular-nums">
                    {Math.round(snapshot.temperature.actual_c)}°
                  </span>
                  <span className="mb-1 font-cormorant text-[28px] leading-none text-primary/80 tabular-nums">
                    /{Math.round(snapshot.temperature.apparent_c)}°
                  </span>
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground tabular-nums" dir="ltr">
                  H {Math.round(snapshot.temperature.daily_high_c)}° · L {Math.round(snapshot.temperature.daily_low_c)}° · {weatherLabel(currentHour?.weather_code ?? 0, ar)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 shrink-0">
                <CurrentIcon className="w-16 h-16 text-primary" strokeWidth={1.1} />
                <div className="text-center">
                  <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{ar ? 'الثقة' : 'Vertrauen'}</div>
                  <div className="font-cormorant text-[28px] leading-none text-foreground tabular-nums" dir="ltr">{conf}%</div>
                </div>
              </div>
            </div>
            <div className="mt-5 h-1.5 rounded-full bg-foreground/10 overflow-hidden" dir="ltr">
              <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${conf}%` }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </div>
        </section>

        <LineChart
          title={ar ? 'منحنى الحرارة' : 'Temperaturkurve'}
          sub={ar ? '24 ساعة' : '24 Stunden'}
          entries={hourly}
          unit="°"
          series={[
            { label: ar ? 'الفعلي' : 'real', values: hourly.map(h => h.temperature_c), accent: true },
            { label: ar ? 'المحسوس' : 'gefühlt', values: hourly.map(h => h.apparent_c) },
          ]}
        />

        <BarChart
          title={ar ? 'الهطول المحتمل' : 'Niederschlag'}
          sub={ar ? 'احتمالية' : 'Wahrscheinlichkeit'}
          entries={hourly}
          values={hourly.map(h => h.precip_probability_percent)}
          unit="%"
        />

        <Panel title={ar ? 'القياسات الآن' : 'Messwerte jetzt'} sub={`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried}`}>
          <div className="grid grid-cols-3 gap-y-5 gap-x-3">
            <Metric label={ar ? 'الرطوبة' : 'Feuchte'} value={Math.round(snapshot.moisture.relative_humidity_percent)} unit="%" icon={<Droplets />} />
            <Metric label={ar ? 'نقطة الندى' : 'Taupunkt'} value={Math.round(snapshot.temperature.dew_point_c)} unit="°" />
            <Metric label={ar ? 'الكرة الرطبة' : 'Feuchtkugel'} value={Math.round(snapshot.temperature.wet_bulb_c)} unit="°" />
            <Metric label={ar ? 'الرياح' : 'Wind'} value={Math.round(snapshot.wind.speed_kph)} unit="km/h" hint={snapshot.wind.direction_cardinal_16pt} icon={<Wind />} />
            <Metric label={ar ? 'الهبات' : 'Böen'} value={Math.round(snapshot.wind.gusts_kph)} unit="km/h" hint={snapshot.wind.beaufort_description} />
            <Metric label={ar ? 'الضغط' : 'Druck'} value={Math.round(snapshot.pressure.msl_hpa)} unit="hPa" hint={snapshot.pressure.tendency_label.split(' — ')[0]} icon={<Gauge />} />
            <Metric label={ar ? 'السحب' : 'Wolken'} value={Math.round(snapshot.sky.cloud_cover_total_percent)} unit="%" icon={<Cloud />} />
            <Metric label={ar ? 'الرؤية' : 'Sicht'} value={Math.round(snapshot.sky.visibility_km)} unit="km" icon={<Eye />} />
            <Metric label={ar ? 'الأشعة' : 'UV'} value={snapshot.solar.uv_index.toFixed(1)} hint={snapshot.solar.uv_category} icon={<Sun />} />
          </div>
        </Panel>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GaugeTile label={ar ? 'الأشعة فوق البنفسجية' : 'UV-Index'} value={snapshot.solar.uv_index.toFixed(1)} pctValue={snapshot.solar.uv_index / 11} hint={snapshot.solar.uv_category} icon={<Sun />} />
          <GaugeTile label={ar ? 'جودة الهواء' : 'Luftqualität'} value={Math.round(snapshot.airQuality.aqi_eu_caqi)} pctValue={snapshot.airQuality.aqi_eu_caqi / 100} hint={snapshot.airQuality.aqi_category.replace(/_/g, ' ')} icon={<Leaf />} />
          <GaugeTile label={ar ? 'الرطوبة' : 'Feuchte'} value={Math.round(snapshot.moisture.relative_humidity_percent)} unit="%" pctValue={snapshot.moisture.relative_humidity_percent / 100} icon={<Droplets />} />
          <GaugeTile label={ar ? 'الغيوم' : 'Wolken'} value={Math.round(snapshot.sky.cloud_cover_total_percent)} unit="%" pctValue={snapshot.sky.cloud_cover_total_percent / 100} hint={snapshot.sky.cloud_type} icon={<Cloud />} />
        </div>

        <LineChart
          title={ar ? 'الرياح والرطوبة والضغط' : 'Wind, Feuchte, Druck'}
          sub={ar ? 'حركة الغلاف' : 'Atmosphäre'}
          entries={hourly}
          series={[
            { label: ar ? 'رياح' : 'Wind', values: hourly.map(h => h.wind_kph), accent: true },
            { label: ar ? 'رطوبة' : 'Feuchte', values: hourly.map(h => h.humidity_percent) },
          ]}
        />

        <LineChart
          title={ar ? 'السحب والضغط' : 'Wolken und Druck'}
          sub={ar ? 'تغيّر الساعة' : 'stündlich'}
          entries={hourly}
          series={[
            { label: ar ? 'سحب' : 'Wolken', values: hourly.map(h => h.cloud_cover_percent), accent: true },
            { label: ar ? 'ضغط' : 'Druck', values: hourly.map(h => h.pressure_hpa - 950) },
          ]}
        />

        <Panel title={ar ? 'الهواء والصحة' : 'Luft und Gesundheit'} sub={snapshot.airQuality.source_station_name ?? (ar ? 'نموذجي' : 'Modell')}>
          <div className="grid grid-cols-3 gap-y-4 gap-x-3">
            <Metric label="PM2.5" value={snapshot.airQuality.pm25_ugm3.toFixed(1)} unit="µg" />
            <Metric label="PM10" value={snapshot.airQuality.pm10_ugm3.toFixed(1)} unit="µg" />
            <Metric label="O₃" value={snapshot.airQuality.o3_ugm3.toFixed(1)} unit="µg" />
            <Metric label="NO₂" value={snapshot.airQuality.no2_ugm3.toFixed(1)} unit="µg" />
            <Metric label="SO₂" value={snapshot.airQuality.so2_ugm3.toFixed(1)} unit="µg" />
            <Metric label="CO" value={snapshot.airQuality.co_mgm3.toFixed(2)} unit="mg" />
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span className="leading-relaxed">{snapshot.airQuality.health_advisory}</span>
            <span className="shrink-0 text-primary tabular-nums">{snapshot.biological.outdoor_health_score}/100</span>
          </div>
        </Panel>

        <SunArc sunrise={snapshot.astronomical.sunrise} noon={snapshot.astronomical.solar_noon} sunset={snapshot.astronomical.sunset} locale={locale} ar={ar} />

        <Panel title={ar ? 'الفلك والضوء' : 'Astronomie'} sub={ar ? 'تفاصيل' : 'Details'}>
          <div className="grid grid-cols-3 gap-y-5 gap-x-3">
            <Metric label={ar ? 'طول النهار' : 'Tageslänge'} value={snapshot.astronomical.day_length_hours.toFixed(1)} unit="h" />
            <Metric label={ar ? 'الشمس' : 'Sonnenhöhe'} value={snapshot.solar.solar_elevation_deg.toFixed(0)} unit="°" hint={`${snapshot.solar.solar_azimuth_deg.toFixed(0)}°`} />
            <Metric label="GHI" value={Math.round(snapshot.solar.ghi_wm2)} unit="W/m²" />
            <Metric label={ar ? 'أقصى UV' : 'UV max'} value={snapshot.solar.uv_max_today.toFixed(1)} />
            <Metric label={ar ? 'القمر' : 'Mond'} value={`${moonGlyph} ${snapshot.astronomical.moon_illumination_percent.toFixed(0)}%`} hint={snapshot.astronomical.moon_phase_name.replace(/_/g, ' ')} />
            <Metric label={ar ? 'الساعة الذهبية' : 'Goldene Stunde'} value={timeLabel(snapshot.astronomical.golden_hour_evening_start, locale)} />
          </div>
        </Panel>

        {forecast.daily.length > 0 && (
          <Panel title={ar ? 'الأيام القادمة' : 'Nächste Tage'} sub={ar ? '7 أيام' : '7 Tage'}>
            <div className="grid grid-cols-7 gap-1.5" dir="ltr">
              {forecast.daily.slice(0, 7).map((d, i) => {
                const DayIcon = iconForCode(d.weather_code, true);
                return (
                  <div key={d.date_unix} className="rounded-xl bg-background/45 border border-border/45 py-2 px-1 text-center min-w-0">
                    <div className="text-[9px] text-muted-foreground truncate">{i === 0 ? (ar ? 'اليوم' : 'Heute') : new Date(d.date_unix).toLocaleDateString(locale, { weekday: 'short' })}</div>
                    <DayIcon className="w-4 h-4 text-primary mx-auto my-1" strokeWidth={1.4} />
                    <div className="font-cormorant text-[17px] leading-none text-foreground tabular-nums">{Math.round(d.high_c)}°</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{Math.round(d.low_c)}°</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        <Panel title={ar ? 'المؤشرات المشتقة' : 'Abgeleitete Werte'} sub={ar ? 'علم الغلاف' : 'Atmosphäre'}>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
            <Metric label="VPD" value={snapshot.moisture.vapor_pressure_deficit_kpa.toFixed(2)} unit="kPa" />
            <Metric label={ar ? 'رطوبة مطلقة' : 'Abs. Feuchte'} value={snapshot.moisture.absolute_humidity_gm3.toFixed(1)} unit="g/m³" />
            <Metric label={ar ? 'انزعاج' : 'Discomfort'} value={snapshot.temperature.discomfort_index.toFixed(1)} />
            <Metric label={ar ? 'قاعدة السحب' : 'Wolkenbasis'} value={snapshot.sky.cloud_base_m ?? '—'} unit={snapshot.sky.cloud_base_m ? 'm' : ''} />
            {snapshot.instability.cape_jkg !== null && <Metric label="CAPE" value={Math.round(snapshot.instability.cape_jkg)} unit="J/kg" />}
            {snapshot.instability.lifted_index !== null && <Metric label="Lifted" value={snapshot.instability.lifted_index.toFixed(1)} />}
          </div>
        </Panel>

        <SourceHealthPanel ar={ar} />

        <footer className="pt-2 pb-6 text-center text-[10px] tracking-[0.18em] uppercase text-primary/70 tabular-nums" dir="ltr">
          {tier ?? 'fresh'} · {timeLabel(snapshot.meta.last_updated_unix, locale)} · {snapshot.meta.fetch_duration_ms}ms
        </footer>
      </main>
    </div>
  );
}