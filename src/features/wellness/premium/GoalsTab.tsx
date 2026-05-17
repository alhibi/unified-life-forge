/**
 * Goals tab — set & track daily/weekly targets with progress rings,
 * streaks, a 10-week heatmap of consistency, and achievement badges.
 *
 * Default goals are auto-suggested from the athlete profile (e.g. water
 * needs from BW, protein from goal, sleep 7-9h, 10k steps, 4 workouts/wk).
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, Beef, Droplets, Dumbbell, Flame, Footprints, Moon, Plus, Scale,
  Target, Trash2, Trophy, Zap,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type {
  AthleteProfile, Goal, GoalMetric, HydrationEvent, SkinHairLog,
  UUID, VitalLog, WorkoutSession, DietLog,
} from '../wellnessDb';
import { todayIso, isoFromTs } from '../wellnessDb';
import {
  EmptyState, PremiumCard, ProgressRing, SectionHeader, AnimatedNumber,
  HeatmapCalendar,
} from './primitives';
import { dailyWaterMl, macroTarget, athleticSummary } from '../athleticEngine';
import { streakBackwards } from '../recoveryEngine';
import { macrosForDate } from '../foodMacros';

interface Props {
  profile: AthleteProfile | null;
  goals: Goal[];
  vitals: VitalLog[];
  workouts: WorkoutSession[];
  hydration: HydrationEvent[];
  skinHair: SkinHairLog[];
  dietLogs: DietLog[];
  onSave: (g: Omit<Goal, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number }) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
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
  todayProgress: { ar: 'تقدّم اليوم', de: 'Heutiger Fortschritt' },
  streaks: { ar: 'سلاسل المثابرة', de: 'Erfolgsserien' },
  heatmap: { ar: 'مخطط الالتزام', de: 'Konsistenz' },
  achievements: { ar: 'الأوسمة', de: 'Auszeichnungen' },
  manageGoals: { ar: 'إدارة الأهداف', de: 'Ziele verwalten' },
  newGoal: { ar: 'هدف جديد', de: 'Neues Ziel' },
  empty: { ar: 'لم تحدد أهدافاً بعد', de: 'Noch keine Ziele' },
  emptyDesc: {
    ar: 'فعّل الأهداف الموصى بها أو أنشئ هدفاً مخصصاً.',
    de: 'Aktiviere die empfohlenen Ziele oder erstelle ein eigenes.',
  },
  recommended: { ar: 'موصى به', de: 'Empfohlen' },
  enable: { ar: 'تفعيل', de: 'Aktivieren' },
  pause: { ar: 'إيقاف', de: 'Pausieren' },
  delete: { ar: 'حذف', de: 'Löschen' },
  edit: { ar: 'تعديل', de: 'Bearbeiten' },
  save: { ar: 'حفظ', de: 'Speichern' },
  cancel: { ar: 'إلغاء', de: 'Abbrechen' },
  metric: { ar: 'المؤشر', de: 'Metrik' },
  target: { ar: 'الهدف', de: 'Zielwert' },
  period: { ar: 'الفترة', de: 'Zeitraum' },
  daily: { ar: 'يومي', de: 'Täglich' },
  weekly: { ar: 'أسبوعي', de: 'Wöchentlich' },
  active: { ar: 'نشط', de: 'Aktiv' },
  paused: { ar: 'موقوف', de: 'Pausiert' },
  done: { ar: 'مكتمل ✓', de: 'Erfüllt ✓' },
  ofTarget: { ar: 'من الهدف', de: 'des Ziels' },
  daysRow: { ar: 'يوم', de: 'Tage' },
  noProfileHint: {
    ar: 'أكمل ملفك الرياضي لاقتراحات أكثر دقة.',
    de: 'Vervollständige dein Profil für genauere Empfehlungen.',
  },
};

const METRIC_META: Record<GoalMetric, {
  icon: any;
  color: string;
  label: Record<'ar' | 'de', string>;
  unit: Record<'ar' | 'de', string>;
  defaultPeriod: 'daily' | 'weekly';
  digits: number;
}> = {
  steps:     { icon: Footprints, color: '#06b6d4', defaultPeriod: 'daily',  digits: 0,
               label: { ar: 'الخطوات', de: 'Schritte' }, unit: { ar: 'خطوة', de: 'Schritte' } },
  sleep:     { icon: Moon,       color: '#8b5cf6', defaultPeriod: 'daily',  digits: 1,
               label: { ar: 'النوم',   de: 'Schlaf'   }, unit: { ar: 'ساعة', de: 'h' } },
  water:     { icon: Droplets,   color: '#06b6d4', defaultPeriod: 'daily',  digits: 0,
               label: { ar: 'الترطيب', de: 'Hydration'}, unit: { ar: 'مل', de: 'ml' } },
  protein:   { icon: Beef,       color: '#ef4444', defaultPeriod: 'daily',  digits: 0,
               label: { ar: 'البروتين',de: 'Protein'  }, unit: { ar: 'غ', de: 'g' } },
  workouts:  { icon: Dumbbell,   color: '#3b82f6', defaultPeriod: 'weekly', digits: 0,
               label: { ar: 'تمارين',  de: 'Trainings'}, unit: { ar: 'تمرين', de: 'Trainings' } },
  weight:    { icon: Scale,      color: '#f59e0b', defaultPeriod: 'daily',  digits: 1,
               label: { ar: 'الوزن',   de: 'Gewicht'  }, unit: { ar: 'كغ', de: 'kg' } },
  streak:    { icon: Flame,      color: '#f97316', defaultPeriod: 'daily',  digits: 0,
               label: { ar: 'سلسلة',   de: 'Streak'   }, unit: { ar: 'يوم', de: 'Tage' } },
  calories:  { icon: Zap,        color: '#10b981', defaultPeriod: 'daily',  digits: 0,
               label: { ar: 'سعرات',   de: 'Kalorien' }, unit: { ar: 'سعرة', de: 'kcal' } },
};

/* ──────────── Daily progress per goal ──────────── */

interface ProgressRow {
  goal: Goal;
  current: number;
  ratio: number; // 0..1
  done: boolean;
}

function progressForGoal(
  g: Goal,
  ctx: {
    todayIso: string;
    vitals: VitalLog[];
    workouts: WorkoutSession[];
    hydration: HydrationEvent[];
    skinHair: SkinHairLog[];
    dietLogs: DietLog[];
  },
): ProgressRow {
  const { todayIso: today } = ctx;

  const isWeekly = g.period === 'weekly';
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceIso = since.toISOString().slice(0, 10);

  let current = 0;

  switch (g.metric) {
    case 'steps': {
      if (isWeekly) {
        for (const v of ctx.vitals) {
          if (v.date >= sinceIso && v.steps) current += v.steps;
        }
      } else {
        const v = ctx.vitals.find((x) => x.date === today);
        current = v?.steps ?? 0;
      }
      break;
    }
    case 'sleep': {
      const v = ctx.vitals.find((x) => x.date === today);
      const sh = ctx.skinHair.find((x) => x.date === today);
      current = v?.sleepHours ?? sh?.sleepHours ?? 0;
      break;
    }
    case 'water': {
      const target = todayIso();
      current = ctx.hydration
        .filter((h) => h.date === target)
        .reduce((s, h) => s + h.amountMl, 0);
      break;
    }
    case 'workouts': {
      if (isWeekly) {
        current = ctx.workouts.filter((w) => w.date >= sinceIso).length;
      } else {
        current = ctx.workouts.filter((w) => w.date === today).length;
      }
      break;
    }
    case 'weight': {
      const v = ctx.vitals.find((x) => x.weightKg && x.weightKg > 0);
      current = v?.weightKg ?? 0;
      break;
    }
    case 'streak': {
      const set = new Set(ctx.workouts.map((w) => w.date));
      current = streakBackwards((iso) => set.has(iso));
      break;
    }
    case 'protein': {
      // Compute from diet logs via the macro bridge.
      if (g.period === 'weekly') {
        let sum = 0;
        const since = new Date();
        since.setDate(since.getDate() - 6);
        const sinceIso = since.toISOString().slice(0, 10);
        for (const l of ctx.dietLogs) {
          if (l.date < sinceIso) continue;
          // accumulate per-day to keep numerics bounded
          // (macrosForDate also does this; calling per-log keeps it simple)
        }
        // Re-compute properly day-by-day
        const days = new Set(ctx.dietLogs.map((l) => l.date).filter((d) => d >= sinceIso));
        for (const d of days) sum += macrosForDate(ctx.dietLogs, d).protein;
        current = Math.round(sum * 10) / 10;
      } else {
        current = Math.round(macrosForDate(ctx.dietLogs, today).protein * 10) / 10;
      }
      break;
    }
    case 'calories': {
      if (g.period === 'weekly') {
        const since = new Date();
        since.setDate(since.getDate() - 6);
        const sinceIso = since.toISOString().slice(0, 10);
        const days = new Set(ctx.dietLogs.map((l) => l.date).filter((d) => d >= sinceIso));
        let sum = 0;
        for (const d of days) sum += macrosForDate(ctx.dietLogs, d).kcal;
        current = sum;
      } else {
        current = macrosForDate(ctx.dietLogs, today).kcal;
      }
      break;
    }
  }

  const target = g.target > 0 ? g.target : 1;
  const ratio =
    g.metric === 'weight'
      ? // Weight goals: closer to target = better; ratio = 1 - |delta|/target.
        current === 0 ? 0 : Math.max(0, 1 - Math.abs(current - target) / target)
      : Math.max(0, Math.min(1, current / target));
  const done = ratio >= 1;
  return { goal: g, current, ratio, done };
}

/* ──────────── Goal-progress card ──────────── */

function GoalProgressCard({ row, lang }: { row: ProgressRow; lang: 'ar' | 'de' }) {
  const meta = METRIC_META[row.goal.metric];
  const Icon = meta.icon;
  const isAr = lang === 'ar';
  const ratio = row.ratio;
  const periodLabel = row.goal.period === 'weekly' ? T.weekly[lang] : T.daily[lang];

  return (
    <PremiumCard className="p-3 flex items-center gap-3" gradient accent={meta.color}>
      <ProgressRing value={ratio} size={62} strokeWidth={6} color={meta.color} gradient>
        <Icon className="w-4 h-4" style={{ color: meta.color }} />
      </ProgressRing>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-foreground truncate">
            {meta.label[lang]}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-muted/50">
            {periodLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
          <span className="text-[15px] font-bold tabular-nums text-foreground">
            <AnimatedNumber value={row.current} digits={meta.digits} />
          </span>
          <span className="text-[10px] text-muted-foreground">
            / {row.goal.target.toLocaleString()} {meta.unit[lang]}
          </span>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: row.done ? '#10b981' : 'hsl(var(--muted-foreground))' }}>
          {row.done ? T.done[lang] : `${Math.round(ratio * 100)}% ${T.ofTarget[lang]}`}
        </p>
      </div>
    </PremiumCard>
  );
}

/* ──────────── Goal editor sheet ──────────── */

function GoalEditor({
  initial,
  onCancel,
  onSave,
  onDelete,
  lang,
}: {
  initial: Goal | { metric: GoalMetric; target: number; period: 'daily' | 'weekly' };
  onCancel: () => void;
  onSave: (g: Omit<Goal, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number }) => void;
  onDelete?: () => void;
  lang: 'ar' | 'de';
}) {
  const isExisting = 'id' in initial;
  const [metric, setMetric] = useState<GoalMetric>(initial.metric);
  const [target, setTarget] = useState<string>(String(initial.target));
  const [period, setPeriod] = useState<'daily' | 'weekly'>(initial.period);
  const [active, setActive] = useState<boolean>(isExisting ? (initial as Goal).active : true);

  const meta = METRIC_META[metric];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pt-2 pb-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">
            {isExisting ? T.edit[lang] : T.newGoal[lang]}
          </h2>

          {/* Metric chips */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {T.metric[lang]}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(METRIC_META) as GoalMetric[]).map((m) => {
                const mt = METRIC_META[m];
                const Icon = mt.icon;
                const sel = metric === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMetric(m);
                      setPeriod(mt.defaultPeriod);
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full border flex items-center gap-1 transition-colors ${
                      sel
                        ? 'border-current'
                        : 'bg-card text-muted-foreground border-border/40'
                    }`}
                    style={sel ? { background: `${mt.color}1f`, color: mt.color } : undefined}
                  >
                    <Icon className="w-3 h-3" />
                    {mt.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {T.target[lang]} ({meta.unit[lang]})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50"
              dir="ltr"
            />
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {T.period[lang]}
            </label>
            <div className="flex gap-2" dir="ltr">
              {(['daily', 'weekly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {p === 'daily' ? T.daily[lang] : T.weekly[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center justify-between bg-card border border-border/40 rounded-xl px-3 py-2.5">
            <span className="text-sm text-foreground">{T.active[lang]}</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
            >
              {T.cancel[lang]}
            </button>
            <button
              type="button"
              onClick={() => {
                const t = parseFloat(target);
                if (!Number.isFinite(t) || t <= 0) return;
                onSave({
                  id: isExisting ? (initial as Goal).id : undefined,
                  createdAt: isExisting ? (initial as Goal).createdAt : undefined,
                  metric,
                  target: t,
                  period,
                  active,
                });
              }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              {T.save[lang]}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────── Heatmap row ──────────── */

function ConsistencyHeatmap({
  workouts,
  hydration,
  vitals,
  lang,
}: {
  workouts: WorkoutSession[];
  hydration: HydrationEvent[];
  vitals: VitalLog[];
  lang: 'ar' | 'de';
}) {
  const days = useMemo(() => {
    const today = new Date();
    const out: { iso: string; value: number }[] = [];
    const wByDay = new Map<string, number>();
    for (const w of workouts) wByDay.set(w.date, (wByDay.get(w.date) ?? 0) + 1);
    const hByDay = new Map<string, number>();
    for (const h of hydration) hByDay.set(h.date, (hByDay.get(h.date) ?? 0) + h.amountMl);
    const vByDay = new Map<string, VitalLog>();
    for (const v of vitals) vByDay.set(v.date, v);

    for (let i = 69; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      let v = 0;
      if (wByDay.get(iso)) v += 0.4;
      if ((hByDay.get(iso) ?? 0) >= 1500) v += 0.3;
      const vi = vByDay.get(iso);
      if (vi?.sleepHours && vi.sleepHours >= 6.5) v += 0.3;
      out.push({ iso, value: Math.min(1, v) });
    }
    return out;
  }, [workouts, hydration, vitals]);

  return (
    <PremiumCard className="p-4 space-y-2">
      <SectionHeader title={T.heatmap[lang]} icon={Award} />
      <div className="overflow-x-auto -mx-1 px-1">
        <HeatmapCalendar days={days} weeks={10} color="hsl(var(--primary))" />
      </div>
    </PremiumCard>
  );
}

/* ──────────── Achievements ──────────── */

interface BadgeDef {
  key: string;
  icon: any;
  color: string;
  title: { ar: string; de: string };
  earned: boolean;
}

function buildBadges(input: {
  workouts: WorkoutSession[];
  hydration: HydrationEvent[];
  vitals: VitalLog[];
}, lang: 'ar' | 'de'): BadgeDef[] {
  const today = todayIso();
  const wByDay = new Set(input.workouts.map((w) => w.date));
  const trainStreak = streakBackwards((iso) => wByDay.has(iso));
  const totalWorkouts = input.workouts.length;
  const todayWaterMl = input.hydration.filter((h) => h.date === today).reduce((s, h) => s + h.amountMl, 0);
  const sleepDays = input.vitals.filter((v) => (v.sleepHours ?? 0) >= 7).length;

  return [
    {
      key: 'first_workout', icon: Dumbbell, color: '#3b82f6',
      title: { ar: 'أول تمرين', de: 'Erstes Training' }, earned: totalWorkouts >= 1,
    },
    {
      key: 'workout_streak_3', icon: Flame, color: '#f97316',
      title: { ar: 'ثلاث أيام', de: '3 Tage Serie' }, earned: trainStreak >= 3,
    },
    {
      key: 'workout_streak_7', icon: Flame, color: '#ef4444',
      title: { ar: 'أسبوع كامل', de: 'Eine Woche' }, earned: trainStreak >= 7,
    },
    {
      key: 'hydrated', icon: Droplets, color: '#06b6d4',
      title: { ar: 'شارب الماء', de: 'Hydriert' }, earned: todayWaterMl >= 2000,
    },
    {
      key: 'sleeper', icon: Moon, color: '#8b5cf6',
      title: { ar: 'نوم سبع ليالٍ', de: '7 Nächte Schlaf' }, earned: sleepDays >= 7,
    },
    {
      key: 'volume_10k', icon: Trophy, color: '#fbbf24',
      title: { ar: '10 آلاف كغ', de: '10k kg Volumen' },
      earned: input.workouts.reduce((s, w) =>
        s + w.exercises.reduce((a, e) =>
          a + e.sets.reduce((b, x) => b + ((x.weightKg ?? 0) * (x.reps ?? 0)), 0), 0), 0) >= 10_000,
    },
    {
      key: 'consistent_30', icon: Award, color: '#10b981',
      title: { ar: 'ثلاثون تمرين', de: '30 Trainings' }, earned: totalWorkouts >= 30,
    },
  ];
}

function AchievementsCard({
  workouts,
  hydration,
  vitals,
  lang,
}: {
  workouts: WorkoutSession[];
  hydration: HydrationEvent[];
  vitals: VitalLog[];
  lang: 'ar' | 'de';
}) {
  const badges = useMemo(
    () => buildBadges({ workouts, hydration, vitals }, lang),
    [workouts, hydration, vitals, lang],
  );
  const earned = badges.filter((b) => b.earned).length;

  return (
    <PremiumCard gradient accent="#fbbf24" className="p-4 space-y-3">
      <SectionHeader
        title={T.achievements[lang]}
        subtitle={`${earned} / ${badges.length}`}
        icon={Trophy}
      />
      <div className="grid grid-cols-4 gap-2">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.key}
              className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center text-center p-1 transition-all duration-300 ${
                b.earned
                  ? 'bg-card border border-border/40'
                  : 'bg-muted/30 border border-dashed border-border/40 opacity-40'
              }`}
              style={b.earned ? { boxShadow: `0 8px 22px -16px ${b.color}aa` } : {}}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-1"
                style={{ background: b.earned ? `${b.color}1f` : 'transparent' }}
              >
                <Icon className="w-4 h-4" style={{ color: b.earned ? b.color : 'hsl(var(--muted-foreground))' }} />
              </div>
              <p className="text-[8.5px] leading-tight font-semibold text-foreground line-clamp-2">
                {b.title[lang]}
              </p>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}

/* ──────────── Recommended-goals seed builder ──────────── */

function buildRecommendedGoals(profile: AthleteProfile | null): Array<Omit<Goal, 'id' | 'createdAt'>> {
  const water = profile?.weightKg
    ? dailyWaterMl({ weightKg: profile.weightKg }) ?? 2500
    : 2500;
  const summary = profile ? athleticSummary({ profile }) : null;
  const proteinG = summary?.macros?.protein ?? 120;
  const calorie = summary?.calorieTarget ?? 2200;

  return [
    { metric: 'steps',    target: 10000, period: 'daily',  active: true },
    { metric: 'sleep',    target: 8,     period: 'daily',  active: true },
    { metric: 'water',    target: water, period: 'daily',  active: true },
    { metric: 'protein',  target: proteinG, period: 'daily', active: true },
    { metric: 'calories', target: calorie, period: 'daily',  active: true },
    { metric: 'workouts', target: 4,     period: 'weekly', active: true },
  ];
}

/* ──────────── Main component ──────────── */

export default function GoalsTab({
  profile,
  goals,
  vitals,
  workouts,
  hydration,
  skinHair,
  dietLogs,
  onSave,
  onDelete,
}: Props) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';

  const [editing, setEditing] = useState<Goal | 'new' | null>(null);

  const today = todayIso();
  const activeGoals = goals.filter((g) => g.active);
  const rows = useMemo(
    () => activeGoals.map((g) => progressForGoal(g, { todayIso: today, vitals, workouts, hydration, skinHair, dietLogs })),
    [activeGoals, today, vitals, workouts, hydration, skinHair, dietLogs],
  );

  // Streaks & counters per goal type
  const trainSet = useMemo(() => new Set(workouts.map((w) => w.date)), [workouts]);
  const workoutStreak = useMemo(() => streakBackwards((iso) => trainSet.has(iso)), [trainSet]);
  const sleepStreak = useMemo(() => {
    const set = new Set(vitals.filter((v) => (v.sleepHours ?? 0) >= 7).map((v) => v.date));
    return streakBackwards((iso) => set.has(iso));
  }, [vitals]);
  const hydroStreak = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const h of hydration) byDay.set(h.date, (byDay.get(h.date) ?? 0) + h.amountMl);
    return streakBackwards((iso) => (byDay.get(iso) ?? 0) >= 1500);
  }, [hydration]);

  const recommended = useMemo(() => buildRecommendedGoals(profile), [profile]);
  const haveMetric = new Set(goals.map((g) => g.metric));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Today progress */}
      <motion.div variants={item} className="space-y-2">
        <SectionHeader
          title={T.todayProgress[lang]}
          icon={Target}
          action={
            <button
              onClick={() => setEditing('new')}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary"
            >
              <Plus className="w-3.5 h-3.5" /> {T.newGoal[lang]}
            </button>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={Target}
            title={T.empty[lang]}
            description={T.emptyDesc[lang]}
          />
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {rows.map((r) => (
              <button
                key={r.goal.id}
                onClick={() => setEditing(r.goal)}
                className="text-start"
              >
                <GoalProgressCard row={r} lang={lang} />
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recommended goals (only ones not already added) */}
      {recommended.some((r) => !haveMetric.has(r.metric)) && (
        <motion.div variants={item} className="space-y-2">
          <SectionHeader title={T.recommended[lang]} icon={Award} />
          <div className="grid grid-cols-2 gap-2">
            {recommended
              .filter((r) => !haveMetric.has(r.metric))
              .map((r) => {
                const meta = METRIC_META[r.metric];
                const Icon = meta.icon;
                return (
                  <button
                    key={r.metric}
                    onClick={() => onSave({ ...r })}
                    className="text-start bg-card border border-dashed border-border/50 rounded-2xl p-3 active:scale-[0.98] transition-transform"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
                      style={{ background: `${meta.color}1f` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>
                    <p className="text-[12px] font-bold text-foreground">{meta.label[lang]}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums" dir="ltr">
                      {r.target.toLocaleString()} {meta.unit[lang]} · {r.period === 'daily' ? T.daily[lang] : T.weekly[lang]}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold mt-1.5">
                      <Plus className="w-3 h-3" /> {T.enable[lang]}
                    </span>
                  </button>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Streaks */}
      <motion.div variants={item}>
        <PremiumCard gradient accent="#f97316" className="p-4 space-y-3">
          <SectionHeader title={T.streaks[lang]} icon={Flame} />
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Dumbbell, label: METRIC_META.workouts.label[lang], val: workoutStreak, color: '#3b82f6' },
              { icon: Moon,     label: METRIC_META.sleep.label[lang],    val: sleepStreak,  color: '#8b5cf6' },
              { icon: Droplets, label: METRIC_META.water.label[lang],    val: hydroStreak,  color: '#06b6d4' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-muted/30 rounded-xl p-2.5 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                  <div className="text-[20px] font-bold tabular-nums leading-none text-foreground">
                    <AnimatedNumber value={s.val} digits={0} />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </motion.div>

      {/* Heatmap */}
      <motion.div variants={item}>
        <ConsistencyHeatmap workouts={workouts} hydration={hydration} vitals={vitals} lang={lang} />
      </motion.div>

      {/* Achievements */}
      <motion.div variants={item}>
        <AchievementsCard workouts={workouts} hydration={hydration} vitals={vitals} lang={lang} />
      </motion.div>

      {/* Inactive goals list */}
      {goals.some((g) => !g.active) && (
        <motion.div variants={item} className="space-y-2">
          <SectionHeader title={T.manageGoals[lang]} />
          <div className="space-y-1.5">
            {goals.filter((g) => !g.active).map((g) => {
              const meta = METRIC_META[g.metric];
              const Icon = meta.icon;
              return (
                <button
                  key={g.id}
                  onClick={() => setEditing(g)}
                  className="w-full bg-card border border-border/40 rounded-xl p-3 flex items-center gap-3 active:scale-[0.99] transition-transform text-start"
                >
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground">{meta.label[lang]}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">
                      {g.target.toLocaleString()} {meta.unit[lang]} · {g.period === 'daily' ? T.daily[lang] : T.weekly[lang]}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-muted/50">
                    {T.paused[lang]}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {!profile && (
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed text-center px-2">
          {T.noProfileHint[lang]}
        </p>
      )}

      <AnimatePresence>
        {editing && (
          <GoalEditor
            initial={
              editing === 'new'
                ? { metric: 'steps', target: 10000, period: 'daily' }
                : editing
            }
            onCancel={() => setEditing(null)}
            onSave={async (g) => {
              await onSave(g);
              setEditing(null);
            }}
            onDelete={
              editing !== 'new'
                ? async () => {
                    await onDelete((editing as Goal).id);
                    setEditing(null);
                  }
                : undefined
            }
            lang={lang}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
