/**
 * Athletic Hub — the calculators destination.
 *
 * Renders one consolidated body-composition + energy + strength dashboard
 * derived from the athlete profile. Plus interactive 1RM and sweat-rate
 * tools, and strength-standards tier ladders.
 *
 * Read-only. The user edits inputs in ProfileTab; this surface visualizes.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Beef, Dumbbell, Flame, Heart, Salad,
  Scale, Target, Trophy, Wheat, Wind,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { AthleteProfile, VitalLog, WorkoutSession } from '../wellnessDb';
import {
  athleticSummary, estimate1RM, strengthLevel, sweatRateLph,
  bestE1RMFromSets, type StrengthLevel,
} from '../athleticEngine';
import { resolveExercise } from '../exerciseCatalog';
import {
  PremiumCard, ProgressRing, SectionHeader, EmptyState, SegmentedControl,
  AnimatedNumber,
} from './primitives';

interface Props {
  profile: AthleteProfile | null;
  vitals: VitalLog[];
  workouts: WorkoutSession[];
  onJump: (key: string) => void;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const T = {
  title: { ar: 'المركز الرياضي', de: 'Athletik-Zentrum' },
  noProfile: {
    ar: 'أكمل ملفك الرياضي لتفعيل الحاسبات',
    de: 'Vervollständige dein Athletenprofil, um alle Berechnungen freizuschalten',
  },
  setupCta: { ar: 'الذهاب للملف', de: 'Profil öffnen' },

  // Body composition
  bodyComp: { ar: 'تكوين الجسم', de: 'Körperzusammensetzung' },
  bmi: { ar: 'كتلة الجسم', de: 'BMI' },
  bf: { ar: 'نسبة الدهون', de: 'Körperfett' },
  lbm: { ar: 'الكتلة الصافية', de: 'Magermasse' },
  ideal: { ar: 'الوزن المثالي', de: 'Idealgewicht' },

  // BMI categories
  underweight: { ar: 'نقص', de: 'Untergewicht' },
  healthy: { ar: 'صحي', de: 'Normal' },
  overweight: { ar: 'زيادة', de: 'Übergewicht' },
  obese: { ar: 'سمنة', de: 'Adipositas' },

  // Body-fat brackets
  essential: { ar: 'حدّ أدنى', de: 'Essenziell' },
  athlete: { ar: 'رياضي', de: 'Athlet' },
  fit: { ar: 'لياقة', de: 'Fit' },
  average: { ar: 'متوسط', de: 'Durchschnitt' },
  high: { ar: 'مرتفع', de: 'Hoch' },

  // Energy
  energy: { ar: 'الطاقة', de: 'Energie' },
  bmr: { ar: 'استقلاب أساسي', de: 'Grundumsatz' },
  tdee: { ar: 'إجمالي يومي', de: 'Gesamtumsatz' },
  target: { ar: 'هدف السعرات', de: 'Kalorienziel' },

  // Macros
  macros: { ar: 'المغذيات الكبرى', de: 'Makronährstoffe' },
  protein: { ar: 'بروتين', de: 'Protein' },
  carbs: { ar: 'كربوهيدرات', de: 'Kohlenhydrate' },
  fat: { ar: 'دهون', de: 'Fett' },
  perDay: { ar: 'في اليوم', de: 'pro Tag' },
  kcal: { ar: 'سعرة', de: 'kcal' },

  // Heart
  heart: { ar: 'القلب', de: 'Herz' },
  hrMax: { ar: 'أقصى نبض', de: 'HFmax' },
  vo2max: { ar: 'VO₂ ماكس', de: 'VO₂max' },
  rhr: { ar: 'نبض الراحة', de: 'Ruhepuls' },
  zones: { ar: 'مناطق التمرين', de: 'Trainingszonen' },
  zoneRecovery: { ar: 'تعافي', de: 'Erholung' },
  zoneAerobic: { ar: 'هوائي', de: 'Aerob' },
  zoneTempo: { ar: 'إيقاع', de: 'Tempo' },
  zoneThreshold: { ar: 'عتبة', de: 'Schwelle' },
  zoneVO2: { ar: 'VO₂', de: 'VO₂' },

  // 1RM
  oneRm: { ar: 'حاسبة 1RM', de: '1RM-Rechner' },
  oneRmDesc: {
    ar: 'أدخل وزنك وعدد التكرارات لتقدير الحد الأقصى لرفعة واحدة (متوسط Epley/Brzycki/Lombardi).',
    de: 'Gib Gewicht und Wiederholungen ein, um deinen geschätzten 1RM zu berechnen (Mittelwert Epley/Brzycki/Lombardi).',
  },
  weight: { ar: 'الوزن (كغ)', de: 'Gewicht (kg)' },
  reps: { ar: 'تكرارات', de: 'Wdh' },
  estimated1Rm: { ar: '1RM المقدّر', de: 'Geschätzter 1RM' },

  // Strength standards
  strength: { ar: 'معايير القوة', de: 'Kraftstandards' },
  strengthDesc: {
    ar: 'تقدير المستوى مقارنة بالوزن — مبني على بيانات Greg Nuckols و ExRx.',
    de: 'Schätzung deines Niveaus im Verhältnis zum Körpergewicht — basierend auf Greg-Nuckols-Datensätzen.',
  },
  squat: { ar: 'سكوات', de: 'Kniebeuge' },
  bench: { ar: 'بنش برس', de: 'Bankdrücken' },
  deadlift: { ar: 'ديدليفت', de: 'Kreuzheben' },
  ohp: { ar: 'ضغط فوق الرأس', de: 'Schulterdrücken' },
  noLifts: {
    ar: 'لا توجد رفعات مسجلة بعد. سجّل تمريناً لرؤية مستواك.',
    de: 'Noch keine Hebungen erfasst. Logge ein Training, um dein Niveau zu sehen.',
  },
  bestE1rm: { ar: 'أفضل 1RM مقدّر', de: 'Bester gesch. 1RM' },
  next: { ar: 'الهدف القادم', de: 'Nächstes Ziel' },
  level: {
    untrained: { ar: 'غير متدرّب', de: 'Untrainiert' },
    novice: { ar: 'مبتدئ', de: 'Anfänger' },
    intermediate: { ar: 'متوسط', de: 'Fortgeschritten' },
    advanced: { ar: 'متقدّم', de: 'Erfahren' },
    elite: { ar: 'نخبة', de: 'Elite' },
  } as Record<StrengthLevel, { ar: string; de: string }>,

  // Sweat rate
  sweat: { ar: 'معدّل التعرّق', de: 'Schweißrate' },
  sweatDesc: {
    ar: 'قس وزنك قبل وبعد التمرين، أضف ما شربته أثناءه.',
    de: 'Wiege dich vor und nach dem Training, gib die getrunkene Menge ein.',
  },
  pre: { ar: 'قبل (كغ)', de: 'Vor (kg)' },
  post: { ar: 'بعد (كغ)', de: 'Nach (kg)' },
  drank: { ar: 'شربت (مل)', de: 'Getrunken (ml)' },
  duration: { ar: 'المدة (د)', de: 'Dauer (min)' },
  result: { ar: 'النتيجة', de: 'Ergebnis' },
  lph: { ar: 'لتر/ساعة', de: 'L/h' },
};

const BMI_LABEL: Record<string, keyof typeof T> = {
  underweight: 'underweight',
  healthy: 'healthy',
  overweight: 'overweight',
  obese: 'obese',
};

const BF_LABEL: Record<string, keyof typeof T> = {
  essential: 'essential',
  athlete: 'athlete',
  fit: 'fit',
  average: 'average',
  high: 'high',
};

/* ───────────────────────── Sub-cards ───────────────────────── */

function MetricChip({ label, value, unit, accent }: {
  label: string; value: string; unit?: string; accent: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-1" dir="ltr">
        <span className="text-[20px] font-bold tabular-nums leading-none" style={{ color: accent }}>
          {value}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function BodyCompCard({
  summary,
  lang,
}: { summary: ReturnType<typeof athleticSummary>; lang: 'ar' | 'de' }) {
  const isAr = lang === 'ar';
  const bmiCat = summary.bmiCategory ? (T[BMI_LABEL[summary.bmiCategory]] as { ar: string; de: string })[lang] : '—';
  const bfBracket = summary.bodyFatBracket ? (T[BF_LABEL[summary.bodyFatBracket]] as { ar: string; de: string })[lang] : '—';

  // BMI ring 0..40 → 0..1
  const bmiV = summary.bmi ?? 0;
  const bmiRingValue = Math.max(0, Math.min(1, bmiV / 40));
  const bmiColor =
    summary.bmiCategory === 'healthy' ? '#10b981'
    : summary.bmiCategory === 'overweight' || summary.bmiCategory === 'underweight' ? '#f59e0b'
    : summary.bmiCategory === 'obese' ? '#ef4444'
    : 'hsl(var(--muted-foreground))';

  return (
    <PremiumCard gradient accent="#10b981" className="p-4 space-y-3">
      <SectionHeader title={T.bodyComp[lang]} icon={Scale} />
      <div className="flex items-center gap-3">
        <ProgressRing value={bmiRingValue} size={110} strokeWidth={9} color={bmiColor} gradient>
          <div className="text-center" dir="ltr">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
              {T.bmi[lang]}
            </div>
            <div className="text-[24px] font-bold tabular-nums leading-none" style={{ color: bmiColor }}>
              <AnimatedNumber value={summary.bmi} digits={1} />
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{bmiCat}</div>
          </div>
        </ProgressRing>
        <div className="flex-1 grid grid-cols-1 gap-2">
          <MetricChip
            label={T.bf[lang]}
            value={summary.bodyFat != null ? summary.bodyFat.toFixed(1) : '—'}
            unit={summary.bodyFat != null ? `% · ${bfBracket}` : ''}
            accent="#f59e0b"
          />
          <MetricChip
            label={T.lbm[lang]}
            value={summary.leanMass != null ? summary.leanMass.toFixed(1) : '—'}
            unit="kg"
            accent="#06b6d4"
          />
          <MetricChip
            label={T.ideal[lang]}
            value={summary.idealWeight != null ? summary.idealWeight.toFixed(1) : '—'}
            unit="kg"
            accent="#8b5cf6"
          />
        </div>
      </div>
    </PremiumCard>
  );
}

function EnergyCard({
  summary,
  lang,
}: { summary: ReturnType<typeof athleticSummary>; lang: 'ar' | 'de' }) {
  return (
    <PremiumCard gradient accent="#f97316" className="p-4 space-y-3">
      <SectionHeader title={T.energy[lang]} icon={Flame} />
      <div className="grid grid-cols-3 gap-2">
        <MetricChip
          label={T.bmr[lang]}
          value={summary.bmr != null ? summary.bmr.toFixed(0) : '—'}
          unit={T.kcal[lang]}
          accent="#f97316"
        />
        <MetricChip
          label={T.tdee[lang]}
          value={summary.tdee != null ? summary.tdee.toFixed(0) : '—'}
          unit={T.kcal[lang]}
          accent="#f97316"
        />
        <MetricChip
          label={T.target[lang]}
          value={summary.calorieTarget != null ? summary.calorieTarget.toFixed(0) : '—'}
          unit={T.kcal[lang]}
          accent="#10b981"
        />
      </div>
    </PremiumCard>
  );
}

function MacroCard({
  summary,
  lang,
}: { summary: ReturnType<typeof athleticSummary>; lang: 'ar' | 'de' }) {
  const isAr = lang === 'ar';
  const m = summary.macros;
  if (!m) return null;
  const total = m.proteinKcal + m.carbsKcal + m.fatKcal;
  const pP = (m.proteinKcal / total) * 100;
  const pC = (m.carbsKcal / total) * 100;
  const pF = (m.fatKcal / total) * 100;

  const rows: Array<{ key: 'protein' | 'carbs' | 'fat'; grams: number; kcal: number; color: string; pct: number; icon: any }> = [
    { key: 'protein', grams: m.protein, kcal: m.proteinKcal, color: '#ef4444', pct: pP, icon: Beef },
    { key: 'carbs',   grams: m.carbs,   kcal: m.carbsKcal,   color: '#f59e0b', pct: pC, icon: Wheat },
    { key: 'fat',     grams: m.fat,     kcal: m.fatKcal,     color: '#06b6d4', pct: pF, icon: Salad },
  ];

  return (
    <PremiumCard gradient accent="#ef4444" className="p-4 space-y-3">
      <SectionHeader
        title={T.macros[lang]}
        subtitle={`${m.totalKcal} ${T.kcal[lang]} ${T.perDay[lang]}`}
        icon={Beef}
      />
      {/* Stacked bar */}
      <div className="h-2 rounded-full overflow-hidden flex" dir="ltr">
        <div style={{ width: `${pP}%`, background: '#ef4444' }} />
        <div style={{ width: `${pC}%`, background: '#f59e0b' }} />
        <div style={{ width: `${pF}%`, background: '#06b6d4' }} />
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.key} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.color}1f` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: r.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-bold text-foreground">{T[r.key][lang]}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground" dir="ltr">
                    <span className="font-semibold text-foreground">{r.grams}g</span>
                    {' · '}{r.kcal} {T.kcal[lang]} · {Math.round(r.pct)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}



/* ────────────────── Heart card ────────────────── */
function HeartCard({
  summary,
  rhr,
  lang,
}: {
  summary: ReturnType<typeof athleticSummary>;
  rhr: number | null;
  lang: 'ar' | 'de';
}) {
  const zoneLabels: Record<string, string> = {
    recovery:  T.zoneRecovery[lang],
    aerobic:   T.zoneAerobic[lang],
    tempo:     T.zoneTempo[lang],
    threshold: T.zoneThreshold[lang],
    vo2max:    T.zoneVO2[lang],
  };
  const zoneColors = ['#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <PremiumCard gradient accent="#ef4444" className="p-4 space-y-3">
      <SectionHeader title={T.heart[lang]} icon={Heart} />
      <div className="grid grid-cols-3 gap-2">
        <MetricChip
          label={T.hrMax[lang]}
          value={summary.hrMax != null ? summary.hrMax.toFixed(0) : '—'}
          unit="bpm"
          accent="#ef4444"
        />
        <MetricChip
          label={T.rhr[lang]}
          value={rhr != null ? rhr.toFixed(0) : '—'}
          unit="bpm"
          accent="#ef4444"
        />
        <MetricChip
          label={T.vo2max[lang]}
          value={summary.vo2max != null ? summary.vo2max.toFixed(1) : '—'}
          unit=""
          accent="#10b981"
        />
      </div>
      {summary.hrZones && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.zones[lang]}
          </p>
          {summary.hrZones.map((z, i) => (
            <div key={z.zone} className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0 tabular-nums"
                style={{ background: `${zoneColors[i]}1f`, color: zoneColors[i] }}
              >
                Z{z.zone}
              </span>
              <span className="text-[11px] font-semibold text-foreground flex-1 truncate">
                {zoneLabels[z.label]}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground" dir="ltr">
                {z.low}–{z.high} bpm
              </span>
            </div>
          ))}
        </div>
      )}
    </PremiumCard>
  );
}

/* ────────────────── 1RM calculator ────────────────── */
function OneRmCalculator({ lang }: { lang: 'ar' | 'de' }) {
  const [weight, setWeight] = useState<string>('100');
  const [reps, setReps] = useState<string>('5');

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const result = useMemo(() => estimate1RM(w, r), [w, r]);

  return (
    <PremiumCard gradient accent="#8b5cf6" className="p-4 space-y-3">
      <SectionHeader
        title={T.oneRm[lang]}
        subtitle={T.oneRmDesc[lang]}
        icon={Target}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.weight[lang]}
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-[16px] text-foreground focus:outline-none focus:border-primary/40"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.reps[lang]}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-[16px] text-foreground focus:outline-none focus:border-primary/40"
            dir="ltr"
          />
        </div>
      </div>
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center" dir="ltr">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
          {T.estimated1Rm[lang]}
        </p>
        <p className="text-[34px] font-bold tabular-nums text-primary leading-none mt-1">
          <AnimatedNumber value={result} digits={1} /> <span className="text-[14px] text-muted-foreground">kg</span>
        </p>
      </div>
    </PremiumCard>
  );
}

/* ────────────────── Strength standards ────────────────── */
function StrengthStandards({
  profile,
  workouts,
  lang,
}: {
  profile: AthleteProfile;
  workouts: WorkoutSession[];
  lang: 'ar' | 'de';
}) {
  // Pull best e1RM from sessions per big lift.
  const bestByLift = useMemo(() => {
    const out: Record<'squat' | 'bench' | 'deadlift' | 'ohp', number | null> = {
      squat: null, bench: null, deadlift: null, ohp: null,
    };
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const k = ex.exerciseKey;
        if (k in out) {
          const e = bestE1RMFromSets(ex.sets);
          if (e != null && (out[k as keyof typeof out] == null || e > (out[k as keyof typeof out] as number))) {
            out[k as keyof typeof out] = e;
          }
        }
      }
    }
    return out;
  }, [workouts]);

  const bw = profile.weightKg ?? 0;

  const lifts: Array<'squat' | 'bench' | 'deadlift' | 'ohp'> = ['squat', 'bench', 'deadlift', 'ohp'];

  const anyLift = lifts.some((k) => bestByLift[k] != null);

  return (
    <PremiumCard gradient accent="#fbbf24" className="p-4 space-y-3">
      <SectionHeader
        title={T.strength[lang]}
        subtitle={T.strengthDesc[lang]}
        icon={Trophy}
      />
      {!anyLift ? (
        <EmptyState
          icon={Dumbbell}
          title={T.noLifts[lang]}
        />
      ) : (
        <div className="space-y-2">
          {lifts.map((k) => {
            const e1rm = bestByLift[k];
            const ex = resolveExercise(k);
            const std = e1rm && bw ? strengthLevel(k, e1rm, bw, profile.sex) : null;
            const levelLabel = std ? T.level[std.level][lang] : '—';
            const tierColors: Record<StrengthLevel, string> = {
              untrained: '#6b7280',
              novice: '#06b6d4',
              intermediate: '#10b981',
              advanced: '#f59e0b',
              elite: '#ef4444',
            };
            const color = std ? tierColors[std.level] : 'hsl(var(--muted-foreground))';

            return (
              <div key={k} className="rounded-xl bg-muted/30 border border-border/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-foreground">{ex.label[lang]}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}20`, color }}
                  >
                    {levelLabel}
                  </span>
                </div>
                {e1rm != null && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-start">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                        {T.bestE1rm[lang]}
                      </div>
                      <div className="text-[16px] font-bold tabular-nums text-foreground" dir="ltr">
                        {e1rm.toFixed(1)} <span className="text-[10px] text-muted-foreground">kg</span>
                        {std && (
                          <span className="text-[10px] text-muted-foreground ms-1">
                            · {std.ratio}× BW
                          </span>
                        )}
                      </div>
                    </div>
                    {std?.nextTarget != null && (
                      <div className="text-end">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                          {T.next[lang]}
                        </div>
                        <div className="text-[16px] font-bold tabular-nums" style={{ color }} dir="ltr">
                          {std.nextTarget} <span className="text-[10px] text-muted-foreground">kg</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PremiumCard>
  );
}

/* ────────────────── Sweat rate ────────────────── */
function SweatRateCalc({ lang }: { lang: 'ar' | 'de' }) {
  const [pre, setPre] = useState('70');
  const [post, setPost] = useState('69');
  const [drank, setDrank] = useState('500');
  const [duration, setDuration] = useState('60');

  const result = useMemo(
    () => sweatRateLph({
      preKg: parseFloat(pre),
      postKg: parseFloat(post),
      drankMl: parseFloat(drank),
      durationMin: parseFloat(duration),
    }),
    [pre, post, drank, duration],
  );

  return (
    <PremiumCard gradient accent="#06b6d4" className="p-4 space-y-3">
      <SectionHeader
        title={T.sweat[lang]}
        subtitle={T.sweatDesc[lang]}
        icon={Wind}
      />
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: T.pre[lang], v: pre, set: setPre, step: '0.1' },
          { label: T.post[lang], v: post, set: setPost, step: '0.1' },
          { label: T.drank[lang], v: drank, set: setDrank, step: '50' },
          { label: T.duration[lang], v: duration, set: setDuration, step: '5' },
        ].map((f) => (
          <div key={f.label}>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {f.label}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              value={f.v}
              onChange={(e) => f.set(e.target.value)}
              className="mt-1 w-full bg-card border border-border/40 rounded-xl px-3 py-2 text-[16px] text-foreground focus:outline-none focus:border-primary/40"
              dir="ltr"
            />
          </div>
        ))}
      </div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-center" dir="ltr">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
          {T.result[lang]}
        </p>
        <p className="text-[34px] font-bold tabular-nums text-cyan-600 dark:text-cyan-400 leading-none mt-1">
          <AnimatedNumber value={result} digits={2} /> <span className="text-[14px] text-muted-foreground">{T.lph[lang]}</span>
        </p>
      </div>
    </PremiumCard>
  );
}

/* ────────────────── Main ────────────────── */
export default function AthleticHubTab({ profile, vitals, workouts, onJump }: Props) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';

  const latestRhr = useMemo(() => {
    for (const v of vitals) if (v.restingHR && v.restingHR > 0) return v.restingHR;
    return null;
  }, [vitals]);
  const latestWeight = useMemo(() => {
    for (const v of vitals) if (v.weightKg && v.weightKg > 0) return v.weightKg;
    return null;
  }, [vitals]);

  if (!profile) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Activity}
          title={T.noProfile[lang]}
          action={
            <button
              onClick={() => onJump('profile')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold active:scale-[0.98] transition-transform"
            >
              {T.setupCta[lang]}
            </button>
          }
        />
        <OneRmCalculator lang={lang} />
        <SweatRateCalc lang={lang} />
      </div>
    );
  }

  const summary = athleticSummary({
    profile,
    weightKg: latestWeight ?? undefined,
    restingHR: latestRhr ?? undefined,
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <BodyCompCard summary={summary} lang={lang} />
      </motion.div>
      <motion.div variants={item}>
        <EnergyCard summary={summary} lang={lang} />
      </motion.div>
      {summary.macros && (
        <motion.div variants={item}>
          <MacroCard summary={summary} lang={lang} />
        </motion.div>
      )}
      <motion.div variants={item}>
        <HeartCard summary={summary} rhr={latestRhr} lang={lang} />
      </motion.div>
      <motion.div variants={item}>
        <StrengthStandards profile={profile} workouts={workouts} lang={lang} />
      </motion.div>
      <motion.div variants={item}>
        <OneRmCalculator lang={lang} />
      </motion.div>
      <motion.div variants={item}>
        <SweatRateCalc lang={lang} />
      </motion.div>
    </motion.div>
  );
}
