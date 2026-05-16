import React, { useMemo, useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  LineChart,
  Line,
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
  summary: { ar: 'متوسط آخر 7 أيام', de: 'Ø letzte 7 Tage' },
};

const SECTION = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

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
  const series = useMemo(() => {
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

  const last7Avg = useMemo(() => {
    const last7 = series.slice(-7);
    const avg = (key: keyof (typeof series)[number]) => {
      const vals = last7.map((s) => s[key]).filter((n): n is number => typeof n === 'number');
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      steps: avg('steps'),
      sleep: avg('sleep'),
      hr: avg('hr'),
      weight: avg('weight'),
      hydration: avg('hydration'),
      energy: avg('energy'),
    };
  }, [series]);

  const hasAnyData = vitals.length > 0;

  const trendCards: Array<{
    key: keyof typeof last7Avg;
    icon: any;
    label: string;
    color: string;
    unit: string;
    digits: number;
  }> = [
    { key: 'steps', icon: Footprints, label: t.metrics.steps[lang], color: 'hsl(var(--primary))', unit: '', digits: 0 },
    { key: 'sleep', icon: Moon, label: t.metrics.sleep[lang], color: '#a78bfa', unit: 'h', digits: 1 },
    { key: 'hr', icon: HeartPulse, label: t.metrics.hr[lang], color: '#ef4444', unit: 'bpm', digits: 0 },
    { key: 'weight', icon: Scale, label: t.metrics.weight[lang], color: '#10b981', unit: 'kg', digits: 1 },
    { key: 'hydration', icon: Droplets, label: t.metrics.hydration[lang], color: '#06b6d4', unit: 'L', digits: 1 },
    { key: 'energy', icon: Zap, label: t.metrics.energy[lang], color: '#f59e0b', unit: '/5', digits: 1 },
  ];

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
          <div className="grid grid-cols-2 gap-3">
            {trendCards.map(({ key, icon: Icon, label, color, unit, digits }) => {
              const avg = last7Avg[key];
              const dataKey = key === 'sleep' ? 'sleep' : key;
              return (
                <div
                  key={key}
                  className="rounded-2xl bg-card border border-border/40 p-3 space-y-2"
                  style={{ direction: 'ltr' }}
                >
                  <div className="flex items-center justify-between" dir={isAr ? 'rtl' : 'ltr'}>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1" dir="ltr">
                    <span className="text-[18px] font-bold text-foreground tabular-nums">
                      {avg !== null ? avg.toFixed(digits) : '—'}
                    </span>
                    {avg !== null && unit && (
                      <span className="text-[10px] text-muted-foreground">{unit}</span>
                    )}
                  </div>
                  <div className="h-12 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                        <Line
                          type="monotone"
                          dataKey={dataKey}
                          stroke={color}
                          strokeWidth={1.8}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Big chart */}
      {hasAnyData && (
        <motion.div variants={SECTION} initial="hidden" animate="show">
          <div className="rounded-2xl bg-card border border-border/40 p-4">
            <p className="text-[11px] font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5" />
              {t.metrics.steps[lang]} — 14d
            </p>
            <div className="h-40" style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}