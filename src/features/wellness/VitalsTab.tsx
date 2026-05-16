import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HeartPulse,
  Footprints,
  Moon,
  Scale,
  Activity,
  Droplets,
  Zap,
  Save,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useApp } from '@/contexts/AppContext';
import AppDatePicker from './AppDatePicker';
import { todayIso, type VitalLog } from './wellnessDb';

interface Props {
  vitals: VitalLog[];
  onSave: (entry: Omit<VitalLog, 'id' | 'loggedAt'>) => Promise<void>;
}

type FormState = {
  date: string;
  steps: string;
  sleepHours: string;
  sleepQuality: string;
  restingHR: string;
  weightKg: string;
  bpSystolic: string;
  bpDiastolic: string;
  hydrationLiters: string;
  energy: string;
  mood: string;
  notes: string;
};

const emptyForm = (date: string): FormState => ({
  date,
  steps: '',
  sleepHours: '',
  sleepQuality: '',
  restingHR: '',
  weightKg: '',
  bpSystolic: '',
  bpDiastolic: '',
  hydrationLiters: '',
  energy: '',
  mood: '',
  notes: '',
});

const numOrUndef = (v: string): number | undefined => {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
};

const t = {
  title: { ar: 'المؤشرات الحيوية', de: 'Vitalwerte' },
  subtitle: {
    ar: 'تتبّع يومي للجسد — تظهر اتجاهاتك خلال 14 يوماً',
    de: 'Tägliche Vitalwerte — 14-Tage-Trends',
  },
  date: { ar: 'التاريخ', de: 'Datum' },
  steps: { ar: 'الخطوات', de: 'Schritte' },
  sleepHours: { ar: 'ساعات النوم', de: 'Schlaf (Std.)' },
  sleepQuality: { ar: 'جودة النوم (1-5)', de: 'Schlafqualität (1-5)' },
  restingHR: { ar: 'النبض أثناء الراحة (نبضة/د)', de: 'Ruhepuls (bpm)' },
  weight: { ar: 'الوزن (كغ)', de: 'Gewicht (kg)' },
  bp: { ar: 'الضغط (انقباضي/انبساطي)', de: 'Blutdruck (sys/dia)' },
  hydration: { ar: 'الماء (لتر)', de: 'Wasser (Liter)' },
  energy: { ar: 'الطاقة (1-5)', de: 'Energie (1-5)' },
  mood: { ar: 'المزاج (1-5)', de: 'Stimmung (1-5)' },
  notes: { ar: 'ملاحظات', de: 'Notizen' },
  save: { ar: 'حفظ اليوم', de: 'Tag speichern' },
  saved: { ar: 'تم الحفظ ✓', de: 'Gespeichert ✓' },
  trends: { ar: 'الاتجاهات (آخر 14 يوماً)', de: 'Trends (14 Tage)' },
  noData: {
    ar: 'لا توجد بيانات بعد. سجّل اليوم لتبدأ.',
    de: 'Noch keine Daten. Beginne mit heutigem Eintrag.',
  },
  metrics: {
    steps: { ar: 'الخطوات', de: 'Schritte' },
    sleep: { ar: 'ساعات النوم', de: 'Schlaf' },
    hr: { ar: 'النبض', de: 'Puls' },
    weight: { ar: 'الوزن', de: 'Gewicht' },
    hydration: { ar: 'الماء', de: 'Wasser' },
    energy: { ar: 'الطاقة', de: 'Energie' },
  },
  vsLast: { ar: 'مقارنة بالأسبوع السابق', de: 'vs. Vorwoche' },
};

const SECTION = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const CARD_STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const CARD_ITEM = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/** Animated counter that eases from 0 to the target value (or between updates). */
function AnimatedNumber({
  value,
  digits = 0,
  duration = 900,
}: {
  value: number | null;
  digits?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (value === null || isNaN(value)) {
      setDisplay(0);
      return;
    }
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      setDisplay(cur);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (value === null) return <>—</>;
  return <>{display.toFixed(digits)}</>;
}

/** Custom dot that pulses only on the last non-null point. */
function makePulseDot(lastIndex: number, color: string) {
  return function PulseDot(props: any) {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index !== lastIndex) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="hsl(var(--card))" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={3.5} fill={color} opacity={0.45}>
          <animate
            attributeName="r"
            from="3.5"
            to="11"
            dur="1.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.45"
            to="0"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    );
  };
}

function NumInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  label,
  step = '1',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: any;
  label: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-secondary/50 border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
      />
    </div>
  );
}

type MetricKey = 'steps' | 'sleep' | 'hr' | 'weight' | 'hydration' | 'energy';

interface MetricSpec {
  key: MetricKey;
  icon: any;
  label: string;
  color: string;
  unit: string;
  digits: number;
  /** higher value = better health signal? Used to color the trend arrow. */
  higherIsBetter: boolean;
}

interface SparkSeriesPoint {
  date: string;
  steps: number | null;
  sleep: number | null;
  hr: number | null;
  weight: number | null;
  hydration: number | null;
  energy: number | null;
}

function MetricCard({
  spec,
  series,
  avg,
  delta,
  index,
}: {
  spec: MetricSpec;
  series: SparkSeriesPoint[];
  avg: number | null;
  delta: number | null; // percentage delta vs previous week
  index: number;
}) {
  const Icon = spec.icon;
  const dataKey: MetricKey = spec.key;

  // Find last non-null point for pulse dot
  const lastIndex = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (typeof series[i][dataKey] === 'number') return i;
    }
    return -1;
  }, [series, dataKey]);

  const PulseDot = useMemo(() => makePulseDot(lastIndex, spec.color), [lastIndex, spec.color]);

  const gradId = `grad-${spec.key}`;
  const glowId = `glow-${spec.key}`;

  // Trend arrow + color
  let trendIcon: any = Minus;
  let trendColor = 'hsl(var(--muted-foreground))';
  let trendText = '—';
  if (delta !== null && Math.abs(delta) >= 0.1) {
    const positive = delta > 0;
    const good = (positive && spec.higherIsBetter) || (!positive && !spec.higherIsBetter);
    trendIcon = positive ? ArrowUpRight : ArrowDownRight;
    trendColor = good ? '#10b981' : '#ef4444';
    trendText = `${positive ? '+' : ''}${delta.toFixed(0)}%`;
  } else if (delta !== null) {
    trendText = '0%';
  }
  const TrendIcon = trendIcon;

  return (
    <motion.div
      variants={CARD_ITEM}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-2xl bg-card border border-border/40 p-3 space-y-2 overflow-hidden"
      style={{ direction: 'ltr' }}
    >
      {/* Soft color wash in the corner */}
      <div
        aria-hidden
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-[0.18] pointer-events-none"
        style={{ background: spec.color }}
      />

      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${spec.color}1f` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: spec.color }} />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{spec.label}</span>
        </div>
        {delta !== null && (
          <div
            className="flex items-center gap-0.5 text-[10px] font-bold tabular-nums"
            style={{ color: trendColor }}
          >
            <TrendIcon className="w-3 h-3" />
            {trendText}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 relative" dir="ltr">
        <span className="text-[20px] font-bold text-foreground tabular-nums leading-none">
          <AnimatedNumber value={avg} digits={spec.digits} />
        </span>
        {avg !== null && spec.unit && (
          <span className="text-[10px] text-muted-foreground">{spec.unit}</span>
        )}
      </div>

      <div className="h-14 -mx-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={spec.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={spec.color} stopOpacity={0} />
              </linearGradient>
              <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={spec.color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={PulseDot as any}
              activeDot={false}
              isAnimationActive
              animationDuration={1200}
              animationBegin={index * 90}
              connectNulls
              filter={`url(#${glowId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default function VitalsTab({ vitals, onSave }: Props) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const lang = isAr ? 'ar' : 'de';

  const [form, setForm] = useState<FormState>(() => emptyForm(todayIso()));
  const [justSaved, setJustSaved] = useState(false);

  // When date changes, hydrate form from existing record
  useEffect(() => {
    const existing = vitals.find((v) => v.date === form.date);
    if (existing) {
      setForm((f) => ({
        ...f,
        steps: existing.steps?.toString() ?? '',
        sleepHours: existing.sleepHours?.toString() ?? '',
        sleepQuality: existing.sleepQuality?.toString() ?? '',
        restingHR: existing.restingHR?.toString() ?? '',
        weightKg: existing.weightKg?.toString() ?? '',
        bpSystolic: existing.bpSystolic?.toString() ?? '',
        bpDiastolic: existing.bpDiastolic?.toString() ?? '',
        hydrationLiters: existing.hydrationLiters?.toString() ?? '',
        energy: existing.energy?.toString() ?? '',
        mood: existing.mood?.toString() ?? '',
        notes: existing.notes ?? '',
      }));
    } else {
      setForm(emptyForm(form.date));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, vitals.length]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await onSave({
      date: form.date,
      steps: numOrUndef(form.steps),
      sleepHours: numOrUndef(form.sleepHours),
      sleepQuality: numOrUndef(form.sleepQuality),
      restingHR: numOrUndef(form.restingHR),
      weightKg: numOrUndef(form.weightKg),
      bpSystolic: numOrUndef(form.bpSystolic),
      bpDiastolic: numOrUndef(form.bpDiastolic),
      hydrationLiters: numOrUndef(form.hydrationLiters),
      energy: numOrUndef(form.energy),
      mood: numOrUndef(form.mood),
      notes: form.notes || undefined,
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1400);
  };

  // Build 14-day series
  const series = useMemo<SparkSeriesPoint[]>(() => {
    const days: { date: string; label: string }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: iso, label: String(d.getDate()) });
    }
    return days.map((d) => {
      const v = vitals.find((x) => x.date === d.date);
      return {
        date: d.label,
        steps: v?.steps ?? null,
        sleep: v?.sleepHours ?? null,
        hr: v?.restingHR ?? null,
        weight: v?.weightKg ?? null,
        hydration: v?.hydrationLiters ?? null,
        energy: v?.energy ?? null,
      };
    });
  }, [vitals]);

  const avgOf = (slice: SparkSeriesPoint[], key: MetricKey): number | null => {
    const vals = slice.map((s) => s[key]).filter((n): n is number => typeof n === 'number');
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const last7Avg = useMemo(() => {
    const last7 = series.slice(-7);
    return {
      steps: avgOf(last7, 'steps'),
      sleep: avgOf(last7, 'sleep'),
      hr: avgOf(last7, 'hr'),
      weight: avgOf(last7, 'weight'),
      hydration: avgOf(last7, 'hydration'),
      energy: avgOf(last7, 'energy'),
    };
  }, [series]);

  const prev7Avg = useMemo(() => {
    const prev7 = series.slice(-14, -7);
    return {
      steps: avgOf(prev7, 'steps'),
      sleep: avgOf(prev7, 'sleep'),
      hr: avgOf(prev7, 'hr'),
      weight: avgOf(prev7, 'weight'),
      hydration: avgOf(prev7, 'hydration'),
      energy: avgOf(prev7, 'energy'),
    };
  }, [series]);

  const deltaPct = (cur: number | null, prev: number | null): number | null => {
    if (cur === null || prev === null || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  };

  const hasAnyData = vitals.length > 0;

  const trendCards: MetricSpec[] = [
    { key: 'steps', icon: Footprints, label: t.metrics.steps[lang], color: 'hsl(var(--primary))', unit: '', digits: 0, higherIsBetter: true },
    { key: 'sleep', icon: Moon, label: t.metrics.sleep[lang], color: '#a78bfa', unit: 'h', digits: 1, higherIsBetter: true },
    { key: 'hr', icon: HeartPulse, label: t.metrics.hr[lang], color: '#ef4444', unit: 'bpm', digits: 0, higherIsBetter: false },
    { key: 'weight', icon: Scale, label: t.metrics.weight[lang], color: '#10b981', unit: 'kg', digits: 1, higherIsBetter: false },
    { key: 'hydration', icon: Droplets, label: t.metrics.hydration[lang], color: '#06b6d4', unit: 'L', digits: 1, higherIsBetter: true },
    { key: 'energy', icon: Zap, label: t.metrics.energy[lang], color: '#f59e0b', unit: '/5', digits: 1, higherIsBetter: true },
  ];

  // Find last non-null index for steps in big chart, for pulse dot
  const lastStepsIndex = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (typeof series[i].steps === 'number') return i;
    }
    return -1;
  }, [series]);

  const StepsPulseDot = useMemo(
    () => makePulseDot(lastStepsIndex, 'hsl(var(--primary))'),
    [lastStepsIndex],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div variants={SECTION} initial="hidden" animate="show">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-foreground">{t.title[lang]}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
              {t.subtitle[lang]}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div variants={SECTION} initial="hidden" animate="show">
        <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              {t.date[lang]}
            </label>
            <AppDatePicker value={form.date} onChange={(v) => update('date', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumInput icon={Footprints} label={t.steps[lang]} value={form.steps} onChange={(v) => update('steps', v)} placeholder="8000" />
            <NumInput icon={Moon} label={t.sleepHours[lang]} value={form.sleepHours} onChange={(v) => update('sleepHours', v)} placeholder="7.5" step="0.1" />
            <NumInput icon={Moon} label={t.sleepQuality[lang]} value={form.sleepQuality} onChange={(v) => update('sleepQuality', v)} placeholder="4" />
            <NumInput icon={HeartPulse} label={t.restingHR[lang]} value={form.restingHR} onChange={(v) => update('restingHR', v)} placeholder="62" />
            <NumInput icon={Scale} label={t.weight[lang]} value={form.weightKg} onChange={(v) => update('weightKg', v)} placeholder="72.5" step="0.1" />
            <NumInput icon={Droplets} label={t.hydration[lang]} value={form.hydrationLiters} onChange={(v) => update('hydrationLiters', v)} placeholder="2.0" step="0.1" />
          </div>

          {/* Blood pressure */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              {t.bp[lang]}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                inputMode="numeric"
                value={form.bpSystolic}
                onChange={(e) => update('bpSystolic', e.target.value)}
                placeholder="120"
                className="w-full bg-secondary/50 border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
              <input
                type="number"
                inputMode="numeric"
                value={form.bpDiastolic}
                onChange={(e) => update('bpDiastolic', e.target.value)}
                placeholder="80"
                className="w-full bg-secondary/50 border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumInput icon={Zap} label={t.energy[lang]} value={form.energy} onChange={(v) => update('energy', v)} placeholder="4" />
            <NumInput icon={Zap} label={t.mood[lang]} value={form.mood} onChange={(v) => update('mood', v)} placeholder="4" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">{t.notes[lang]}</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              className="w-full bg-secondary/50 border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Save className="w-4 h-4" />
            {justSaved ? t.saved[lang] : t.save[lang]}
          </button>
        </div>
      </motion.div>

      {/* Trends */}
      <motion.div variants={SECTION} initial="hidden" animate="show">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          {t.trends[lang]}
        </p>

        {!hasAnyData ? (
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">{t.noData[lang]}</p>
          </div>
        ) : (
          <motion.div
            variants={CARD_STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3"
          >
            {trendCards.map((spec, i) => (
              <MetricCard
                key={spec.key}
                spec={spec}
                series={series}
                avg={last7Avg[spec.key]}
                delta={deltaPct(last7Avg[spec.key], prev7Avg[spec.key])}
                index={i}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Big chart */}
      {hasAnyData && (
        <motion.div variants={SECTION} initial="hidden" animate="show">
          <div className="rounded-2xl bg-card border border-border/40 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-primary" />
                {t.metrics.steps[lang]} — 14d
              </p>
              <p className="text-[10px] text-muted-foreground/70 tabular-nums">
                <AnimatedNumber value={last7Avg.steps} digits={0} />{' '}
                <span className="text-muted-foreground/50">{t.vsLast[lang]}</span>
              </p>
            </div>
            <div className="h-44" style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-steps-big" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow-steps-big" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.6" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.18} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.3, strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.25)',
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="steps"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#grad-steps-big)"
                    dot={StepsPulseDot as any}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: 'hsl(var(--primary))' }}
                    isAnimationActive
                    animationDuration={1500}
                    connectNulls
                    filter="url(#glow-steps-big)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
