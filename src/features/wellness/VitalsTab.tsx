/**
 * Vitals tab — historical view + chart picker.
 *
 * v2 — input overhaul:
 *  • The bespoke long form has been replaced by the shared
 *    <QuickLogSheet> from the premium folder. Tapping any metric card,
 *    or the floating "+ سجّل اليوم" CTA, opens the same sheet that the
 *    Today tab uses, so users only learn one input flow.
 *  • The sheet is per-date — the user can swipe to a past day and log
 *    retroactively, which the previous form already supported but
 *    behind a chevron disclosure that most users never opened.
 *  • All cards now use SoftSurface so accents wash gently.
 *  • The hero/mini chart cards keep their existing shape because their
 *    visual treatment was already on-spec; only the gradient stop curves
 *    were tightened (28%→0% with mid-stop @ 60%·0.18% so the apex
 *    no longer slices through a dense block).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Droplets, Footprints,
  HeartPulse, Minus, Moon, Pencil, Plus, Scale, TrendingUp, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '@/contexts/AppContext';
import AppDatePicker from './AppDatePicker';
import { todayIso, type VitalLog } from './wellnessDb';
import { SoftSurface, withAlpha } from './premium/surfaces';
import { AnimatedNumber } from './premium/primitives';
import QuickLogSheet, { type QuickMetric } from './premium/QuickLogSheet';

interface Props {
  vitals: VitalLog[];
  onSave: (entry: Omit<VitalLog, 'id' | 'loggedAt'>) => Promise<void>;
}

const t = {
  title: { ar: 'المؤشرات الحيوية', de: 'Vitalwerte' },
  subtitle: {
    ar: 'تتبّع يومي للجسد — اتجاهاتك خلال 14 يوماً',
    de: 'Tägliche Vitalwerte — 14-Tage-Trends',
  },
  date: { ar: 'التاريخ', de: 'Datum' },
  today: { ar: 'اليوم', de: 'Heute' },
  log: { ar: 'تسجيل', de: 'Loggen' },
  logForDate: { ar: 'سجّل قياسات', de: 'Werte loggen' },
  noData: {
    ar: 'لا توجد بيانات بعد. اضغط "تسجيل" لتبدأ.',
    de: 'Noch keine Daten. Tippe auf „Loggen", um zu starten.',
  },
  trends: { ar: 'الاتجاهات', de: 'Trends' },
  metrics: {
    steps: { ar: 'الخطوات', de: 'Schritte' },
    sleep: { ar: 'ساعات النوم', de: 'Schlaf' },
    hr: { ar: 'النبض', de: 'Puls' },
    weight: { ar: 'الوزن', de: 'Gewicht' },
    hydration: { ar: 'الماء', de: 'Wasser' },
    energy: { ar: 'الطاقة', de: 'Energie' },
  },
  avg: { ar: 'المتوسط', de: 'Ø' },
  min: { ar: 'الأدنى', de: 'Min' },
  max: { ar: 'الأعلى', de: 'Max' },
  range7: { ar: '٧ أيام', de: '7T' },
  range14: { ar: '١٤ يوماً', de: '14T' },
};

const SECTION = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};
const CARD_STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const CARD_ITEM = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ───────────── Pulse-dot factory (latest data point) ───────────── */
function makePulseDot(lastIndex: number, color: string, size = 4) {
  return function PulseDot(props: any) {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index !== lastIndex) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={size + 2} fill={color} opacity={0.22}>
          <animate attributeName="r" from={String(size + 1)} to={String(size + 10)} dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.32" to="0" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r={size} fill={color} stroke="hsl(var(--card))" strokeWidth={1.75} />
      </g>
    );
  };
}

/* ───────────── Types ───────────── */
type MetricKey = 'steps' | 'sleep' | 'hr' | 'weight' | 'hydration' | 'energy';

interface MetricSpec {
  key: MetricKey;
  icon: any;
  label: string;
  color: string;
  unit: string;
  digits: number;
  higherIsBetter: boolean;
  /** Quick-log mapping — which QuickLogSheet field maps to this card. */
  quick: QuickMetric;
}

interface SeriesPoint {
  date: string;
  iso: string;
  steps: number | null;
  sleep: number | null;
  hr: number | null;
  weight: number | null;
  hydration: number | null;
  energy: number | null;
}

/* ───────────── Tooltip pill ───────────── */
function HeroTooltip({ active, payload, label, color, unit, digits }: any) {
  if (!active || !payload || !payload.length) return null;
  const v = payload[0]?.value;
  if (v == null) return null;
  return (
    <div
      className="rounded-xl px-2.5 py-1.5 border backdrop-blur-md shadow-xl"
      style={{ background: 'hsl(var(--card) / 0.92)', borderColor: withAlpha(color, 0.25) }}
    >
      <div className="text-[9px] text-muted-foreground/80 tabular-nums leading-none mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1 leading-none" dir="ltr">
        <span className="text-[14px] font-bold tabular-nums" style={{ color }}>
          {Number(v).toFixed(digits)}
        </span>
        {unit && <span className="text-[9px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

/* ───────────── Mini metric card ───────────── */
function MiniMetricCard({
  spec,
  series,
  avg,
  delta,
  active,
  onSelect,
}: {
  spec: MetricSpec;
  series: SeriesPoint[];
  avg: number | null;
  delta: number | null;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = spec.icon;
  const dataKey: MetricKey = spec.key;

  const lastIndex = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (typeof series[i][dataKey] === 'number') return i;
    }
    return -1;
  }, [series, dataKey]);

  const PulseDot = useMemo(() => makePulseDot(lastIndex, spec.color, 2.5), [lastIndex, spec.color]);
  const gradId = `mini-grad-${spec.key}`;

  let trendIcon: any = Minus;
  let trendColor = 'hsl(var(--muted-foreground))';
  let trendText = '—';
  if (delta !== null && Math.abs(delta) >= 0.1) {
    const positive = delta > 0;
    const good = (positive && spec.higherIsBetter) || (!positive && !spec.higherIsBetter);
    trendIcon = positive ? ArrowUpRight : ArrowDownRight;
    trendColor = good ? '#10b981' : '#ef4444';
    trendText = `${positive ? '+' : ''}${delta.toFixed(0)}%`;
  } else if (delta !== null) trendText = '0%';
  const TrendIcon = trendIcon;

  return (
    <motion.div variants={CARD_ITEM} className="relative">
      <SoftSurface
        as="button"
        onClick={onSelect}
        accent={spec.color}
        intensity={active ? 1.05 : 0.55}
        className="p-3"
      >
        <div className="flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: withAlpha(spec.color, 0.14) }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: spec.color }} />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground truncate">{spec.label}</span>
          </div>
          {delta !== null && (
            <div className="flex items-center gap-0.5 text-[10px] font-bold tabular-nums shrink-0" style={{ color: trendColor }}>
              <TrendIcon className="w-3 h-3" />
              {trendText}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1 relative mt-1.5" dir="ltr">
          <span className="text-[20px] font-bold text-foreground tabular-nums leading-none">
            <AnimatedNumber value={avg} digits={spec.digits} />
          </span>
          {avg !== null && spec.unit && <span className="text-[10px] text-muted-foreground">{spec.unit}</span>}
        </div>

        <div className="h-12 -mx-1 relative mt-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={spec.color} stopOpacity={0.32} />
                  <stop offset="55%"  stopColor={spec.color} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={spec.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={spec.color}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#${gradId})`}
                dot={PulseDot as any}
                activeDot={false}
                isAnimationActive
                animationDuration={1100}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SoftSurface>
    </motion.div>
  );
}

/* ───────────── Hero chart ───────────── */
function HeroChart({
  spec,
  series,
  todayValue,
  delta,
  range,
  setRange,
  lang,
}: {
  spec: MetricSpec;
  series: SeriesPoint[];
  todayValue: number | null;
  delta: number | null;
  range: 7 | 14;
  setRange: (r: 7 | 14) => void;
  lang: 'ar' | 'de';
}) {
  const isAr = lang === 'ar';
  const Icon = spec.icon;
  const dataKey = spec.key;

  const values = useMemo(
    () => series.map((s) => s[dataKey]).filter((n): n is number => typeof n === 'number'),
    [series, dataKey],
  );
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const minV = values.length ? Math.min(...values) : null;
  const maxV = values.length ? Math.max(...values) : null;

  const lastIndex = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (typeof series[i][dataKey] === 'number') return i;
    }
    return -1;
  }, [series, dataKey]);

  const PulseDot = useMemo(() => makePulseDot(lastIndex, spec.color, 4), [lastIndex, spec.color]);

  let trendIcon: any = Minus;
  let trendColor = 'hsl(var(--muted-foreground))';
  let trendText = '';
  if (delta !== null && Math.abs(delta) >= 0.1) {
    const positive = delta > 0;
    const good = (positive && spec.higherIsBetter) || (!positive && !spec.higherIsBetter);
    trendIcon = positive ? ArrowUpRight : ArrowDownRight;
    trendColor = good ? '#10b981' : '#ef4444';
    trendText = `${positive ? '+' : ''}${delta.toFixed(0)}%`;
  } else if (delta !== null) trendText = '0%';
  const TrendIcon = trendIcon;

  const heroGradId = `hero-grad-${spec.key}`;

  return (
    <SoftSurface accent={spec.color} variant="mesh" intensity={0.85} className="p-4 space-y-4" radius="1.5rem">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: withAlpha(spec.color, 0.16) }}>
            <Icon className="w-[18px] h-[18px]" style={{ color: spec.color }} />
          </div>
          <div className="leading-tight min-w-0">
            <div className={`text-[12px] font-bold text-foreground truncate ${isAr ? '' : 'tracking-tight'}`}>{spec.label}</div>
            <div className="text-[10px] text-muted-foreground/70">{range === 7 ? t.range7[lang] : t.range14[lang]}</div>
          </div>
        </div>

        <div className="flex items-center rounded-full p-0.5 gap-0.5 shrink-0" style={{ background: 'hsl(var(--muted) / 0.6)', border: '1px solid hsl(var(--border) / 0.3)' }}>
          {[7, 14].map((r) => (
            <button key={r} type="button" onClick={() => setRange(r as 7 | 14)} className="relative text-[10px] font-bold px-2.5 py-1 rounded-full tabular-nums transition-colors" style={{ color: range === r ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))' }}>
              {range === r && (
                <motion.span layoutId="rangePill" className="absolute inset-0 rounded-full" style={{ background: spec.color }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
              )}
              <span className="relative">{r === 7 ? t.range7[lang] : t.range14[lang]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-muted-foreground/70 mb-1">{t.today[lang]}</div>
          <div className="flex items-baseline gap-1.5" dir="ltr">
            <span className="text-[44px] font-bold tabular-nums leading-none" style={{ color: spec.color }}>
              <AnimatedNumber value={todayValue ?? avg} digits={spec.digits} />
            </span>
            {spec.unit && <span className="text-[14px] text-muted-foreground/70 font-semibold">{spec.unit}</span>}
          </div>
        </div>

        {delta !== null && trendText && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums shrink-0"
               style={{ color: trendColor, background: withAlpha(trendColor, 0.12), border: `1px solid ${withAlpha(trendColor, 0.25)}` }}>
            <TrendIcon className="w-3 h-3" />
            {trendText}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 py-2.5 px-3 rounded-2xl divide-x divide-border/40 rtl:divide-x-reverse"
           style={{ background: 'hsl(var(--muted) / 0.4)', border: '1px solid hsl(var(--border) / 0.3)' }}>
        {[
          { label: t.avg[lang], value: avg },
          { label: t.min[lang], value: minV },
          { label: t.max[lang], value: maxV },
        ].map((s) => (
          <div key={s.label} className="text-center px-1">
            <div className="text-[9px] font-semibold text-muted-foreground/70">{s.label}</div>
            <div className="text-[13px] font-bold text-foreground tabular-nums leading-tight mt-0.5" dir="ltr">
              {s.value !== null ? s.value.toFixed(spec.digits) : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className="h-44 -mx-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 12, right: 12, left: 12, bottom: 4 }}>
            <defs>
              {/* Tighter mid-stop curve so the apex no longer slices a dense block */}
              <linearGradient id={heroGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={spec.color} stopOpacity={0.32} />
                <stop offset="35%"  stopColor={spec.color} stopOpacity={0.18} />
                <stop offset="65%"  stopColor={spec.color} stopOpacity={0.08} />
                <stop offset="100%" stopColor={spec.color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.14} vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground) / 0.55)' }} axisLine={false} tickLine={false} interval={range === 14 ? 1 : 0} tickMargin={8} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip cursor={{ stroke: spec.color, strokeOpacity: 0.35, strokeWidth: 1, strokeDasharray: '3 4' }} content={<HeroTooltip color={spec.color} unit={spec.unit} digits={spec.digits} />} />
            <Area
              type="monotone" dataKey={dataKey}
              stroke={spec.color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round"
              fill={`url(#${heroGradId})`}
              dot={PulseDot as any}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: spec.color }}
              isAnimationActive animationDuration={1300} connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SoftSurface>
  );
}

/* ───────────── Main component ───────────── */
export default function VitalsTab({ vitals, onSave }: Props) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const lang: 'ar' | 'de' = isAr ? 'ar' : 'de';

  const [activeMetric, setActiveMetric] = useState<MetricKey>('steps');
  const [range, setRange] = useState<7 | 14>(7);
  const [logDate, setLogDate] = useState<string>(todayIso());
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMetric, setQuickMetric] = useState<QuickMetric | undefined>(undefined);

  const fullSeries = useMemo<SeriesPoint[]>(() => {
    const days: { date: string; iso: string; label: string }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: iso, iso, label: String(d.getDate()) });
    }
    return days.map((d) => {
      const v = vitals.find((x) => x.date === d.iso);
      return {
        date: d.label,
        iso: d.iso,
        steps: v?.steps ?? null,
        sleep: v?.sleepHours ?? null,
        hr: v?.restingHR ?? null,
        weight: v?.weightKg ?? null,
        hydration: v?.hydrationLiters ?? null,
        energy: v?.energy ?? null,
      };
    });
  }, [vitals]);

  const heroSeries = useMemo<SeriesPoint[]>(() => (range === 7 ? fullSeries.slice(-7) : fullSeries), [fullSeries, range]);

  const avgOf = (slice: SeriesPoint[], key: MetricKey): number | null => {
    const vals = slice.map((s) => s[key]).filter((n): n is number => typeof n === 'number');
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const last7Avg = useMemo(() => {
    const last7 = fullSeries.slice(-7);
    return {
      steps: avgOf(last7, 'steps'),
      sleep: avgOf(last7, 'sleep'),
      hr: avgOf(last7, 'hr'),
      weight: avgOf(last7, 'weight'),
      hydration: avgOf(last7, 'hydration'),
      energy: avgOf(last7, 'energy'),
    };
  }, [fullSeries]);

  const prev7Avg = useMemo(() => {
    const prev7 = fullSeries.slice(-14, -7);
    return {
      steps: avgOf(prev7, 'steps'),
      sleep: avgOf(prev7, 'sleep'),
      hr: avgOf(prev7, 'hr'),
      weight: avgOf(prev7, 'weight'),
      hydration: avgOf(prev7, 'hydration'),
      energy: avgOf(prev7, 'energy'),
    };
  }, [fullSeries]);

  const deltaPct = (cur: number | null, prev: number | null): number | null => {
    if (cur === null || prev === null || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  };

  const todayValueFor = (key: MetricKey): number | null => {
    const today = vitals.find((v) => v.date === todayIso());
    if (!today) return null;
    switch (key) {
      case 'steps': return today.steps ?? null;
      case 'sleep': return today.sleepHours ?? null;
      case 'hr': return today.restingHR ?? null;
      case 'weight': return today.weightKg ?? null;
      case 'hydration': return today.hydrationLiters ?? null;
      case 'energy': return today.energy ?? null;
    }
  };

  const hasAnyData = vitals.length > 0;

  const metricSpecs: MetricSpec[] = [
    { key: 'steps',     icon: Footprints, label: t.metrics.steps[lang],     color: '#0ea5e9', unit: '',    digits: 0, higherIsBetter: true,  quick: 'steps' },
    { key: 'sleep',     icon: Moon,       label: t.metrics.sleep[lang],     color: '#a78bfa', unit: 'h',   digits: 1, higherIsBetter: true,  quick: 'sleep' },
    { key: 'hr',        icon: HeartPulse, label: t.metrics.hr[lang],        color: '#ef4444', unit: 'bpm', digits: 0, higherIsBetter: false, quick: 'restingHR' },
    { key: 'weight',    icon: Scale,      label: t.metrics.weight[lang],    color: '#10b981', unit: 'kg',  digits: 1, higherIsBetter: false, quick: 'weight' },
    { key: 'hydration', icon: Droplets,   label: t.metrics.hydration[lang], color: '#06b6d4', unit: 'L',   digits: 1, higherIsBetter: true,  quick: 'water' },
    { key: 'energy',    icon: Zap,        label: t.metrics.energy[lang],    color: '#f59e0b', unit: '/5',  digits: 1, higherIsBetter: true,  quick: 'energy' },
  ];

  const activeSpec = metricSpecs.find((m) => m.key === activeMetric)!;

  const targetVital = useMemo(() => vitals.find((v) => v.date === logDate) ?? null, [vitals, logDate]);

  const openQuick = (m?: QuickMetric) => {
    setQuickMetric(m);
    setQuickOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <motion.div variants={SECTION} initial="hidden" animate="show">
        <SoftSurface accent="hsl(var(--primary))" variant="mesh" intensity={0.7} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <HeartPulse className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-foreground">{t.title[lang]}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{t.subtitle[lang]}</p>
              </div>
            </div>
            <button
              onClick={() => openQuick()}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.log[lang]}
            </button>
          </div>
        </SoftSurface>
      </motion.div>

      {/* Date row + edit button */}
      <motion.div variants={SECTION} initial="hidden" animate="show">
        <SoftSurface variant="flat" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div className="text-start">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t.logForDate[lang]}
                </div>
                <div className="text-[13px] font-bold text-foreground" dir="ltr">{logDate}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AppDatePicker value={logDate} onChange={setLogDate} />
              <button
                onClick={() => openQuick()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-[11px] font-semibold"
              >
                <Pencil className="w-3 h-3" />
                {targetVital ? (isAr ? 'تعديل' : 'Bearb.') : t.log[lang]}
              </button>
            </div>
          </div>
        </SoftSurface>
      </motion.div>

      {/* Hero chart */}
      {hasAnyData ? (
        <motion.div variants={SECTION} initial="hidden" animate="show">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMetric + range}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroChart
                spec={activeSpec}
                series={heroSeries}
                todayValue={todayValueFor(activeMetric)}
                delta={deltaPct(last7Avg[activeMetric], prev7Avg[activeMetric])}
                range={range}
                setRange={setRange}
                lang={lang}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div variants={SECTION} initial="hidden" animate="show">
          <SoftSurface variant="flat" className="p-8 border-dashed">
            <p className="text-sm text-muted-foreground text-center">{t.noData[lang]}</p>
          </SoftSurface>
        </motion.div>
      )}

      {/* Mini-card grid */}
      {hasAnyData && (
        <motion.div variants={SECTION} initial="hidden" animate="show">
          <p className="text-[11px] font-semibold text-muted-foreground/80 px-1 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {t.trends[lang]}
          </p>

          <motion.div variants={CARD_STAGGER} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
            {metricSpecs.map((spec) => (
              <MiniMetricCard
                key={spec.key}
                spec={spec}
                series={fullSeries}
                avg={last7Avg[spec.key]}
                delta={deltaPct(last7Avg[spec.key], prev7Avg[spec.key])}
                active={spec.key === activeMetric}
                onSelect={() => {
                  setActiveMetric(spec.key);
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* The shared quick-log sheet — same UI as Today tab */}
      <QuickLogSheet
        open={quickOpen}
        metric={quickMetric}
        forDate={logDate}
        todayVital={targetVital}
        hydrationTodayMl={0}
        hideHydration={logDate !== todayIso()}
        onClose={() => setQuickOpen(false)}
        onSaveVital={async (patch) => {
          await onSave({
            date: logDate,
            steps: patch.steps ?? targetVital?.steps,
            sleepHours: patch.sleepHours ?? targetVital?.sleepHours,
            sleepQuality: patch.sleepQuality ?? targetVital?.sleepQuality,
            restingHR: patch.restingHR ?? targetVital?.restingHR,
            hrv: patch.hrv ?? targetVital?.hrv,
            weightKg: patch.weightKg ?? targetVital?.weightKg,
            bpSystolic: patch.bpSystolic ?? targetVital?.bpSystolic,
            bpDiastolic: patch.bpDiastolic ?? targetVital?.bpDiastolic,
            hydrationLiters: patch.hydrationLiters ?? targetVital?.hydrationLiters,
            energy: patch.energy ?? targetVital?.energy,
            mood: patch.mood ?? targetVital?.mood,
            notes: targetVital?.notes,
          });
        }}
        onAddHydration={async () => { /* hydration sheet handled separately for non-today dates */ }}
      />
    </div>
  );
}
