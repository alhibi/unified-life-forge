import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  Plus,
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
  trends: { ar: 'الاتجاهات', de: 'Trends' },
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
  today: { ar: 'اليوم', de: 'Heute' },
  avg: { ar: 'المتوسط', de: 'Ø' },
  min: { ar: 'الأدنى', de: 'Min' },
  max: { ar: 'الأعلى', de: 'Max' },
  range7: { ar: '٧ أيام', de: '7T' },
  range14: { ar: '١٤ يوماً', de: '14T' },
  vsLast: { ar: 'مقارنة بالأسبوع السابق', de: 'vs. Vorwoche' },
  logEntry: { ar: 'تسجيل قياسات اليوم', de: 'Heute erfassen' },
  logEntrySub: {
    ar: 'الخطوات، النوم، النبض، الوزن…',
    de: 'Schritte, Schlaf, Puls, Gewicht…',
  },
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
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ───────────────────────── Animated number counter ───────────────────────── */
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
      fromRef.current = 0;
      return;
    }
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
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

/* ──────────────────────── Pulsing dot on latest point ────────────────────── */
function makePulseDot(lastIndex: number, color: string, size = 4) {
  return function PulseDot(props: any) {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index !== lastIndex) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={size + 6} fill={color} opacity={0.18}>
          <animate
            attributeName="r"
            from={String(size + 2)}
            to={String(size + 14)}
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.45"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx={cx} cy={cy} r={size} fill={color} stroke="hsl(var(--card))" strokeWidth={2} />
      </g>
    );
  };
}

/* ─────────────────────────────── Form fields ─────────────────────────────── */
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

/* ──────────────────────────── Metric definitions ─────────────────────────── */
type MetricKey = 'steps' | 'sleep' | 'hr' | 'weight' | 'hydration' | 'energy';

interface MetricSpec {
  key: MetricKey;
  icon: any;
  label: string;
  color: string;
  unit: string;
  digits: number;
  /** Higher value = better health signal? Used to color the trend arrow. */
  higherIsBetter: boolean;
}

interface SeriesPoint {
  date: string; // day-of-month label
  iso: string;  // full ISO date
  steps: number | null;
  sleep: number | null;
  hr: number | null;
  weight: number | null;
  hydration: number | null;
  energy: number | null;
}

/* ─────────────────────────── Hero tooltip pill ───────────────────────────── */
function HeroTooltip({
  active,
  payload,
  label,
  color,
  unit,
  digits,
}: any) {
  if (!active || !payload || !payload.length) return null;
  const v = payload[0]?.value;
  if (v == null) return null;
  return (
    <div
      className="rounded-xl px-2.5 py-1.5 border backdrop-blur-md shadow-xl"
      style={{
        background: 'hsl(var(--card) / 0.92)',
        borderColor: `${color}33`,
      }}
    >
      <div className="text-[9px] text-muted-foreground/80 tabular-nums leading-none mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1 leading-none" dir="ltr">
        <span className="text-[14px] font-bold tabular-nums" style={{ color }}>
          {Number(v).toFixed(digits)}
        </span>
        {unit && <span className="text-[9px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

/* ───────────────────────────── Mini metric chip ──────────────────────────── */
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

  const PulseDot = useMemo(
    () => makePulseDot(lastIndex, spec.color, 2.5),
    [lastIndex, spec.color],
  );

  const gradId = `mini-grad-${spec.key}`;

  // Trend indicator
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
    <motion.button
      type="button"
      variants={CARD_ITEM}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="relative rounded-2xl bg-card/80 backdrop-blur-sm p-3 space-y-2 overflow-hidden text-left transition-all duration-300"
      style={{
        direction: 'ltr',
        border: '1px solid',
        borderColor: active ? `${spec.color}80` : 'hsl(var(--border) / 0.4)',
        boxShadow: active
          ? `0 0 0 1px ${spec.color}40, 0 8px 24px -10px ${spec.color}55`
          : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Subtle radial wash */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
        style={{ background: spec.color, opacity: active ? 0.28 : 0.12 }}
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
        <span className="text-[19px] font-bold text-foreground tabular-nums leading-none">
          <AnimatedNumber value={avg} digits={spec.digits} />
        </span>
        {avg !== null && spec.unit && (
          <span className="text-[10px] text-muted-foreground">{spec.unit}</span>
        )}
      </div>

      <div className="h-12 -mx-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={spec.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={spec.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={spec.color}
              strokeWidth={1.8}
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
    </motion.button>
  );
}

/* ───────────────────────────── Premium hero card ─────────────────────────── */
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
  const Icon = spec.icon;
  const dataKey = spec.key;

  // Stats
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

  const PulseDot = useMemo(
    () => makePulseDot(lastIndex, spec.color, 4),
    [lastIndex, spec.color],
  );

  // Trend arrow (vs delta passed in)
  let trendIcon: any = Minus;
  let trendColor = 'hsl(var(--muted-foreground))';
  let trendText = '';
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

  const heroGradId = `hero-grad-${spec.key}`;
  const heroGlowId = `hero-glow-${spec.key}`;
  const ringGradId = `hero-ring-${spec.key}`;

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background:
          'linear-gradient(155deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.85) 100%)',
        border: '1px solid hsl(var(--border) / 0.5)',
        boxShadow:
          `0 1px 0 hsl(var(--border) / 0.5) inset, 0 24px 40px -22px ${spec.color}40`,
      }}
    >
      {/* Aurora background */}
      <div
        aria-hidden
        className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: spec.color, opacity: 0.18 }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: spec.color, opacity: 0.08 }}
      />

      <div className="relative p-4 space-y-3">
        {/* Top row: icon + label, range pills */}
        <div className="flex items-center justify-between" dir="ltr">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${spec.color}33, ${spec.color}11)`,
                border: `1px solid ${spec.color}40`,
              }}
            >
              <Icon className="w-4.5 h-4.5" style={{ color: spec.color, width: 18, height: 18 }} />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                {spec.label}
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {range === 7 ? t.range7[lang] : t.range14[lang]}
              </div>
            </div>
          </div>

          {/* Range pills */}
          <div
            className="flex items-center rounded-full p-0.5 gap-0.5"
            style={{
              background: 'hsl(var(--muted) / 0.6)',
              border: '1px solid hsl(var(--border) / 0.3)',
            }}
          >
            {[7, 14].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r as 7 | 14)}
                className="relative text-[10px] font-bold px-2.5 py-1 rounded-full tabular-nums transition-colors"
                style={{
                  color:
                    range === r ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {range === r && (
                  <motion.span
                    layoutId="rangePill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: spec.color }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">{r === 7 ? t.range7[lang] : t.range14[lang]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Big value + delta */}
        <div className="flex items-end justify-between" dir="ltr">
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">
              {t.today[lang]}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[44px] font-bold tabular-nums leading-none"
                style={{
                  color: spec.color,
                  textShadow: `0 0 24px ${spec.color}40`,
                }}
              >
                <AnimatedNumber value={todayValue ?? avg} digits={spec.digits} />
              </span>
              {spec.unit && (
                <span className="text-[14px] text-muted-foreground/70 font-semibold">
                  {spec.unit}
                </span>
              )}
            </div>
          </div>

          {delta !== null && trendText && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums"
              style={{
                color: trendColor,
                background: `${trendColor}15`,
                border: `1px solid ${trendColor}30`,
              }}
            >
              <TrendIcon className="w-3 h-3" />
              {trendText}
            </div>
          )}
        </div>

        {/* Sub-stats row */}
        <div
          className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl"
          style={{
            background: 'hsl(var(--muted) / 0.4)',
            border: '1px solid hsl(var(--border) / 0.3)',
          }}
          dir="ltr"
        >
          {[
            { label: t.avg[lang], value: avg },
            { label: t.min[lang], value: minV },
            { label: t.max[lang], value: maxV },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {s.label}
              </div>
              <div className="text-[13px] font-bold text-foreground tabular-nums leading-tight">
                {s.value !== null ? s.value.toFixed(spec.digits) : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Big chart */}
        <div className="h-44 -mx-2" style={{ direction: 'ltr' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 12, right: 12, left: 12, bottom: 4 }}>
              <defs>
                <linearGradient id={heroGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={spec.color} stopOpacity={0.55} />
                  <stop offset="55%" stopColor={spec.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={spec.color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={ringGradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={spec.color} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={spec.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={spec.color} stopOpacity={0.4} />
                </linearGradient>
                <filter id={heroGlowId} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeOpacity={0.18}
                vertical={false}
                strokeDasharray="2 6"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground) / 0.6)' }}
                axisLine={false}
                tickLine={false}
                interval={range === 14 ? 1 : 0}
                tickMargin={6}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                cursor={{
                  stroke: spec.color,
                  strokeOpacity: 0.45,
                  strokeWidth: 1.5,
                  strokeDasharray: '3 4',
                }}
                content={
                  <HeroTooltip color={spec.color} unit={spec.unit} digits={spec.digits} />
                }
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={`url(#${ringGradId})`}
                strokeWidth={2.5}
                fill={`url(#${heroGradId})`}
                dot={PulseDot as any}
                activeDot={{
                  r: 5,
                  strokeWidth: 2.5,
                  stroke: 'hsl(var(--card))',
                  fill: spec.color,
                }}
                isAnimationActive
                animationDuration={1300}
                connectNulls
                filter={`url(#${heroGlowId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Main component ───────────────────────────── */
export default function VitalsTab({ vitals, onSave }: Props) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const lang = isAr ? 'ar' : 'de';

  const [form, setForm] = useState<FormState>(() => emptyForm(todayIso()));
  const [justSaved, setJustSaved] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('steps');
  const [range, setRange] = useState<7 | 14>(7);

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

  // Build full 14-day series (mini cards always show 14d)
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

  // Hero series respects the range toggle
  const heroSeries = useMemo<SeriesPoint[]>(
    () => (range === 7 ? fullSeries.slice(-7) : fullSeries),
    [fullSeries, range],
  );

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
    const t = vitals.find((v) => v.date === todayIso());
    if (!t) return null;
    switch (key) {
      case 'steps': return t.steps ?? null;
      case 'sleep': return t.sleepHours ?? null;
      case 'hr': return t.restingHR ?? null;
      case 'weight': return t.weightKg ?? null;
      case 'hydration': return t.hydrationLiters ?? null;
      case 'energy': return t.energy ?? null;
    }
  };

  const hasAnyData = vitals.length > 0;

  const metricSpecs: MetricSpec[] = [
    { key: 'steps', icon: Footprints, label: t.metrics.steps[lang], color: 'hsl(var(--primary))', unit: '', digits: 0, higherIsBetter: true },
    { key: 'sleep', icon: Moon, label: t.metrics.sleep[lang], color: '#a78bfa', unit: 'h', digits: 1, higherIsBetter: true },
    { key: 'hr', icon: HeartPulse, label: t.metrics.hr[lang], color: '#ef4444', unit: 'bpm', digits: 0, higherIsBetter: false },
    { key: 'weight', icon: Scale, label: t.metrics.weight[lang], color: '#10b981', unit: 'kg', digits: 1, higherIsBetter: false },
    { key: 'hydration', icon: Droplets, label: t.metrics.hydration[lang], color: '#06b6d4', unit: 'L', digits: 1, higherIsBetter: true },
    { key: 'energy', icon: Zap, label: t.metrics.energy[lang], color: '#f59e0b', unit: '/5', digits: 1, higherIsBetter: true },
  ];

  const activeSpec = metricSpecs.find((m) => m.key === activeMetric)!;

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

      {/* Collapsible form */}
      <motion.div variants={SECTION} initial="hidden" animate="show">
        <div
          className="rounded-2xl bg-card border border-border/40 overflow-hidden"
          style={{ boxShadow: formOpen ? '0 12px 32px -16px hsl(var(--primary) / 0.18)' : undefined }}
        >
          {/* Header bar — always visible */}
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 active:scale-[0.995] transition-transform"
            aria-expanded={formOpen}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
                <Plus
                  className="w-4 h-4 text-primary transition-transform duration-300"
                  style={{ transform: formOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
                />
              </div>
              <div className="text-left min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="text-[13px] font-bold text-foreground truncate">
                  {t.logEntry[lang]}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {t.logEntrySub[lang]}
                </div>
              </div>
            </div>
            <motion.div
              animate={{ rotate: formOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </button>

          {/* Animated body */}
          <AnimatePresence initial={false}>
            {formOpen && (
              <motion.div
                key="form-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.25 },
                }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/30">
                  <div className="space-y-1.5 pt-3">
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
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Hero metric card */}
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
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">{t.noData[lang]}</p>
          </div>
        </motion.div>
      )}

      {/* Trend mini grid */}
      {hasAnyData && (
        <motion.div variants={SECTION} initial="hidden" animate="show">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {t.trends[lang]}
          </p>

          <motion.div
            variants={CARD_STAGGER}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3"
          >
            {metricSpecs.map((spec) => (
              <MiniMetricCard
                key={spec.key}
                spec={spec}
                series={fullSeries}
                avg={last7Avg[spec.key]}
                delta={deltaPct(last7Avg[spec.key], prev7Avg[spec.key])}
                active={spec.key === activeMetric}
                onSelect={() => setActiveMetric(spec.key)}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
