/**
 * Today / Dashboard tab — the home of the premium wellness experience.
 *
 * Shows at a glance:
 *   • Recovery + Readiness gauges with trend sparkline
 *   • A coaching recommendation derived from readiness + ACWR
 *   • Hydration ring driven by per-event hydration_events store
 *   • Active fasting countdown OR a "Start fasting" CTA
 *   • Next supplement dose with countdown
 *   • Stats grid: steps, sleep, energy, mood, weight, HRV (delta vs week)
 *   • Training-load card with ACWR zone
 *   • 10-week training-streak heatmap
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, BatteryCharging, Droplets, Flame, Footprints, Heart, HeartPulse,
  Moon, Pill, Scale, Sparkles, Timer, TrendingUp, Zap,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis,
} from 'recharts';

import type {
  Supplement, IntakeLog, VitalLog, SkinHairLog, WorkoutSession,
  HydrationEvent, FastingSession, AthleteProfile,
} from '../wellnessDb';
import { todayIso, isoFromTs } from '../wellnessDb';
import {
  ProgressRing, ScoreGauge, StatTile, FastingRing, useNowSecond,
  HeatmapCalendar, SectionHeader, PremiumCard, AnimatedNumber, zoneColor,
} from './primitives';
import { recoveryScore, readinessScore, dailyScoreSeries, streakBackwards } from '../recoveryEngine';
import { acwr, dailyWaterMl } from '../athleticEngine';

interface Props {
  profile: AthleteProfile | null;
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  vitals: VitalLog[];
  skinHair: SkinHairLog[];
  workouts: WorkoutSession[];
  hydration: HydrationEvent[];
  activeFasting: FastingSession | null;
  onLogHydration: (ml: number) => void;
  onStartFasting: (hours: number, protocol: string) => void;
  onEndFasting: () => void;
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
  greetingMorning: { ar: 'صباح الخير', de: 'Guten Morgen' },
  greetingAfternoon: { ar: 'نهارك جميل', de: 'Guten Tag' },
  greetingEvening: { ar: 'مساء الخير', de: 'Guten Abend' },
  greetingNight: { ar: 'مساء الخير', de: 'Gute Nacht' },
  recovery: { ar: 'التعافي', de: 'Erholung' },
  readiness: { ar: 'الجاهزية', de: 'Bereitschaft' },
  noData: { ar: 'بيانات غير كافية', de: 'Daten unzureichend' },
  setup: { ar: 'سجّل وزنك ونومك لتظهر النقاط', de: 'Erfasse Gewicht & Schlaf für Werte' },
  trainingAdvice: { ar: 'نصيحة اليوم', de: 'Heutige Empfehlung' },
  recGoHard: { ar: 'اليوم مناسب لتمرين شاق', de: 'Bereit für hartes Training' },
  recNormal: { ar: 'تمرين معتاد ممكن', de: 'Normales Training' },
  recEasy: { ar: 'خفّف الحمل اليوم', de: 'Heute leichter trainieren' },
  recRest: { ar: 'يوم استشفاء واستراحة', de: 'Erholungstag empfohlen' },
  hydration: { ar: 'الترطيب', de: 'Hydration' },
  ofTarget: { ar: 'من الهدف', de: 'des Ziels' },
  nextDose: { ar: 'الجرعة القادمة', de: 'Nächste Dosis' },
  noPending: { ar: 'لا جرعات معلّقة', de: 'Keine offenen Dosen' },
  fasting: { ar: 'الصيام المتقطع', de: 'Intervallfasten' },
  startFasting: { ar: 'ابدأ الصيام', de: 'Fasten starten' },
  endFasting: { ar: 'إنهاء', de: 'Beenden' },
  todaysStats: { ar: 'إحصائيات اليوم', de: 'Heutige Werte' },
  weeklyTrend: { ar: 'سبعة أيام', de: '7 Tage' },
  steps: { ar: 'الخطوات', de: 'Schritte' },
  sleep: { ar: 'النوم', de: 'Schlaf' },
  energy: { ar: 'الطاقة', de: 'Energie' },
  mood: { ar: 'المزاج', de: 'Stimmung' },
  weight: { ar: 'الوزن', de: 'Gewicht' },
  hrv: { ar: 'تباين النبض', de: 'HRV' },
  trainingLoad: { ar: 'الحمل التدريبي', de: 'Trainingsbelastung' },
  acwrSweet: { ar: 'منطقة مثالية', de: 'Idealer Bereich' },
  acwrLow: { ar: 'حمل منخفض', de: 'Geringe Belastung' },
  acwrCaution: { ar: 'انتبه — حمل مرتفع', de: 'Achtung — hohe Belastung' },
  acwrDanger: { ar: 'خطر إفراط', de: 'Übertraining-Risiko' },
  streakDays: { ar: 'يوم متواصل', de: 'Tage in Folge' },
  trainingStreak: { ar: 'تتابع التمارين', de: 'Trainings-Streak' },
  in: { ar: 'بعد', de: 'in' },
  hour: { ar: 'س', de: 'h' },
  min: { ar: 'د', de: 'min' },
  ml: { ar: 'مل', de: 'ml' },
  liters: { ar: 'لتر', de: 'L' },
  glass: { ar: 'كوب', de: 'Glas' },
  add: { ar: 'إضافة', de: 'Hinzufügen' },
  setProfile: { ar: 'أكمل ملفك الرياضي', de: 'Athletenprofil ergänzen' },
  setProfileDesc: {
    ar: 'أضف الطول والوزن والعمر لتفعيل كل الحسابات.',
    de: 'Füge Größe, Gewicht und Alter hinzu, um alle Berechnungen freizuschalten.',
  },
};

function greeting(lang: 'ar' | 'de'): string {
  const h = new Date().getHours();
  if (h < 5)  return T.greetingNight[lang];
  if (h < 12) return T.greetingMorning[lang];
  if (h < 17) return T.greetingAfternoon[lang];
  if (h < 21) return T.greetingEvening[lang];
  return T.greetingNight[lang];
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.max(0, Math.min(1, num / den));
}

function avgField<T>(arr: T[], get: (x: T) => number | undefined): number | null {
  const v: number[] = [];
  for (const x of arr) {
    const n = get(x);
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) v.push(n);
  }
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function deltaPct(latest: number | null, base: number | null): number | null {
  if (latest == null || base == null || base <= 0) return null;
  return ((latest - base) / base) * 100;
}



/* ────────────────── Recommendation card ────────────────── */
function RecCard({
  rec,
  score,
  zone,
  lang,
  ar7,
}: {
  rec: 'go_hard' | 'normal' | 'easy' | 'rest' | null;
  score: number | null;
  zone: 'low' | 'moderate' | 'good' | 'optimal' | null;
  lang: 'ar' | 'de';
  ar7: { date: string; readiness: number | null }[];
}) {
  const isAr = lang === 'ar';
  const labelMap = {
    go_hard: T.recGoHard[lang],
    normal:  T.recNormal[lang],
    easy:    T.recEasy[lang],
    rest:    T.recRest[lang],
  } as const;
  const Icon = !rec ? HeartPulse : rec === 'go_hard' ? Zap : rec === 'normal' ? Activity : rec === 'easy' ? Heart : Moon;
  const color = zoneColor(zone);
  const text = rec ? labelMap[rec] : (isAr ? T.noData.ar : T.noData.de);

  return (
    <PremiumCard gradient accent={color} className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${color}1f` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.trainingAdvice[lang]}
          </p>
          <p className="text-[15px] font-bold text-foreground leading-tight">{text}</p>
        </div>
        {score != null && (
          <div className="text-end shrink-0" dir="ltr">
            <div className="text-[28px] font-bold tabular-nums leading-none" style={{ color }}>
              {Math.round(score)}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
              /100
            </div>
          </div>
        )}
      </div>
      {ar7.some((p) => p.readiness != null) && (
        <div className="h-10 mt-3 -mx-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ar7} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="readiness-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                cursor={{ stroke: color, strokeOpacity: 0.4, strokeWidth: 1, strokeDasharray: '3 4' }}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: `1px solid ${color}33`,
                  borderRadius: 8,
                  fontSize: 11,
                  padding: '4px 8px',
                }}
                labelStyle={{ display: 'none' }}
                formatter={(v: any) => [`${Math.round(Number(v))}/100`, T.readiness[lang]]}
              />
              <Area
                type="monotone"
                dataKey="readiness"
                stroke={color}
                strokeWidth={2}
                fill="url(#readiness-grad)"
                connectNulls
                isAnimationActive
                animationDuration={1100}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </PremiumCard>
  );
}

/* ────────────────── Hydration card ────────────────── */
function HydrationCard({
  todayMl,
  targetMl,
  lang,
  onAdd,
}: {
  todayMl: number;
  targetMl: number;
  lang: 'ar' | 'de';
  onAdd: (ml: number) => void;
}) {
  const isAr = lang === 'ar';
  const ratio = pct(todayMl, targetMl);
  const liters = (todayMl / 1000).toFixed(1);
  const targetL = (targetMl / 1000).toFixed(1);
  const color = '#06b6d4'; // cyan-500

  const quick = [200, 300, 500];

  return (
    <PremiumCard gradient accent={color} className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.hydration[lang]}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5" dir="ltr">
            <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color }}>
              <AnimatedNumber value={Number(liters)} digits={1} />
            </span>
            <span className="text-[11px] text-muted-foreground">/ {targetL} {T.liters[lang]}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {Math.round(ratio * 100)}% {T.ofTarget[lang]}
          </p>
        </div>
        <ProgressRing value={ratio} size={70} strokeWidth={6} color={color} gradient>
          <Droplets className="w-5 h-5" style={{ color }} />
        </ProgressRing>
      </div>
      <div className="flex gap-1.5 mt-3" dir="ltr">
        {quick.map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border border-border/40 bg-muted/30 text-foreground active:scale-95 transition-transform"
          >
            +{ml} {isAr ? 'مل' : 'ml'}
          </button>
        ))}
      </div>
    </PremiumCard>
  );
}

/* ────────────────── Fasting card ────────────────── */
function FastingCard({
  active,
  lang,
  onStart,
  onEnd,
}: {
  active: FastingSession | null;
  lang: 'ar' | 'de';
  onStart: (hours: number, protocol: string) => void;
  onEnd: () => void;
}) {
  const isAr = lang === 'ar';
  const now = useNowSecond(!!active);
  const elapsed = active ? Math.max(0, Math.floor((now - active.startedAt) / 1000)) : 0;

  const protocols = [
    { hours: 16, label: '16:8' },
    { hours: 18, label: '18:6' },
    { hours: 20, label: '20:4' },
  ];

  return (
    <PremiumCard gradient accent="#a855f7" className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.fasting[lang]}
          </p>
          <p className="text-[13px] font-bold text-foreground mt-0.5">
            {active ? (active.protocol ?? '16:8') : (isAr ? 'متوقّف' : 'Inaktiv')}
          </p>
        </div>
        <Timer className="w-5 h-5 text-purple-500/70" />
      </div>
      <div className="flex items-center justify-center mb-3">
        <FastingRing
          elapsedSec={elapsed}
          targetHours={active?.targetHours ?? 16}
          active={!!active}
          protocol={active?.protocol ?? '16:8'}
          lang={lang}
          size={150}
        />
      </div>
      {active ? (
        <button
          onClick={onEnd}
          className="w-full py-2 rounded-xl text-[12px] font-semibold bg-destructive/15 text-destructive active:scale-[0.98] transition-transform"
        >
          {T.endFasting[lang]}
        </button>
      ) : (
        <div className="flex gap-1.5" dir="ltr">
          {protocols.map((p) => (
            <button
              key={p.label}
              onClick={() => onStart(p.hours, p.label)}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 active:scale-95 transition-transform"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </PremiumCard>
  );
}

/* ────────────────── Next supplement card ────────────────── */
function NextDoseCard({
  supplements,
  intakeLogs,
  lang,
  onJump,
}: {
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  lang: 'ar' | 'de';
  onJump: () => void;
}) {
  const isAr = lang === 'ar';
  const today = todayIso();

  const next = useMemo(() => {
    const taken = new Set<string>();
    for (const l of intakeLogs) {
      const d = isoFromTs(l.takenAt);
      if (d === today && l.scheduledTime) taken.add(`${l.supplementId}@${l.scheduledTime}`);
    }
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let best: { sup: Supplement; time: string; minutes: number } | null = null;
    for (const s of supplements) {
      if (!s.active) continue;
      for (const t of s.times) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(t);
        if (!m) continue;
        const min = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        if (min < nowMin) continue;
        if (taken.has(`${s.id}@${t}`)) continue;
        if (!best || min < best.minutes) best = { sup: s, time: t, minutes: min };
      }
    }
    if (best) return { ...best, deltaMin: best.minutes - nowMin };
    return null;
  }, [supplements, intakeLogs, today]);

  return (
    <button
      onClick={onJump}
      className="w-full text-start"
    >
      <PremiumCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {T.nextDose[lang]}
            </p>
            {next ? (
              <>
                <p className="text-[14px] font-bold text-foreground truncate mt-0.5">
                  {next.sup.name}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5" dir="ltr">
                  {next.time} · {T.in[lang]}{' '}
                  {next.deltaMin < 60
                    ? `${next.deltaMin}${T.min[lang]}`
                    : `${Math.floor(next.deltaMin / 60)}${T.hour[lang]} ${next.deltaMin % 60}${T.min[lang]}`}
                </p>
              </>
            ) : (
              <p className="text-[13px] font-semibold text-muted-foreground mt-1">
                {T.noPending[lang]}
              </p>
            )}
          </div>
        </div>
      </PremiumCard>
    </button>
  );
}



/* ────────────────── Training-load card ────────────────── */
function TrainingLoadCard({
  workouts,
  lang,
}: {
  workouts: WorkoutSession[];
  lang: 'ar' | 'de';
}) {
  const isAr = lang === 'ar';
  const ar = useMemo(() => acwr(workouts), [workouts]);
  const zoneLabel = !ar
    ? T.noData[lang]
    : ar.zone === 'undertraining' ? T.acwrLow[lang]
    : ar.zone === 'sweet_spot'    ? T.acwrSweet[lang]
    : ar.zone === 'caution'       ? T.acwrCaution[lang]
    :                                T.acwrDanger[lang];
  const color =
    !ar ? 'hsl(var(--muted-foreground))'
    : ar.zone === 'undertraining' ? '#f59e0b'
    : ar.zone === 'sweet_spot'    ? '#10b981'
    : ar.zone === 'caution'       ? '#f59e0b'
    :                                '#ef4444';

  // Position marker on a 0..2 scale, with 0.8/1.3/1.5 zone splits.
  const r = ar?.ratio ?? 0;
  const markerPct = Math.max(0, Math.min(1, r / 2));

  return (
    <PremiumCard className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.trainingLoad[lang]}
          </p>
          <p className="text-[15px] font-bold text-foreground mt-0.5">{zoneLabel}</p>
        </div>
        {ar && (
          <div className="text-end" dir="ltr">
            <div className="text-[28px] font-bold tabular-nums leading-none" style={{ color }}>
              {ar.ratio.toFixed(2)}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
              ACWR
            </div>
          </div>
        )}
      </div>

      {/* Zone bar */}
      <div className="relative h-2 rounded-full overflow-hidden" dir="ltr">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-amber-500/30" style={{ width: '40%' }} />     {/* 0..0.8 */}
          <div className="h-full bg-emerald-500/40" style={{ width: '25%' }} />   {/* 0.8..1.3 */}
          <div className="h-full bg-amber-500/40" style={{ width: '10%' }} />     {/* 1.3..1.5 */}
          <div className="h-full bg-rose-500/40" style={{ width: '25%' }} />      {/* 1.5..2 */}
        </div>
        {ar && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
            style={{
              background: color,
              borderColor: 'hsl(var(--card))',
              boxShadow: `0 0 0 1.5px ${color}`,
            }}
            initial={{ left: '0%' }}
            animate={{ left: `calc(${markerPct * 100}% - 6px)` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </div>

      {ar && (
        <div className="grid grid-cols-2 gap-2 text-[10px]" dir="ltr">
          <div className="bg-muted/30 rounded-lg p-2">
            <div className="text-muted-foreground/70">Acute (7d)</div>
            <div className="font-bold tabular-nums text-foreground">{ar.acute}</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <div className="text-muted-foreground/70">Chronic (28d)</div>
            <div className="font-bold tabular-nums text-foreground">{ar.chronic}</div>
          </div>
        </div>
      )}
    </PremiumCard>
  );
}

/* ────────────────── Streak heatmap card ────────────────── */
function StreakCard({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' | 'de' }) {
  const isAr = lang === 'ar';

  // Build a 70-day series with intensity = capped(workouts in day / 1).
  const days = useMemo(() => {
    const today = new Date();
    const out: { iso: string; value: number }[] = [];
    const byDay = new Map<string, number>();
    for (const w of workouts) byDay.set(w.date, (byDay.get(w.date) ?? 0) + 1);
    for (let i = 69; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const c = byDay.get(iso) ?? 0;
      out.push({ iso, value: c === 0 ? 0 : Math.min(1, 0.4 + c * 0.3) });
    }
    return out;
  }, [workouts]);

  const streak = useMemo(() => {
    const set = new Set(workouts.map((w) => w.date));
    return streakBackwards((iso) => set.has(iso));
  }, [workouts]);

  return (
    <PremiumCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.trainingStreak[lang]}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5" dir="ltr">
            <span className="text-[26px] font-bold tabular-nums text-foreground leading-none">
              {streak}
            </span>
            <span className="text-[11px] text-muted-foreground">{T.streakDays[lang]}</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-2xl bg-orange-500/15 flex items-center justify-center">
          <Flame className="w-4 h-4 text-orange-500" />
        </div>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <HeatmapCalendar days={days} weeks={10} color="#f97316" />
      </div>
    </PremiumCard>
  );
}



/* ────────────────── Main component ────────────────── */
export default function TodayTab({
  profile,
  supplements,
  intakeLogs,
  vitals,
  skinHair,
  workouts,
  hydration,
  activeFasting,
  onLogHydration,
  onStartFasting,
  onEndFasting,
  onJump,
}: Props) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';
  const isAr = lang === 'ar';
  const today = todayIso();

  // ── scores ──
  const recovery = useMemo(() => recoveryScore(vitals, skinHair), [vitals, skinHair]);
  const readiness = useMemo(
    () => readinessScore({ vitals, skinHair, workouts }),
    [vitals, skinHair, workouts],
  );
  const series7 = useMemo(
    () => dailyScoreSeries(vitals, skinHair, workouts, 7).map((p) => ({
      date: p.date.slice(8),
      readiness: p.readiness,
      recovery: p.recovery,
    })),
    [vitals, skinHair, workouts],
  );

  // ── hydration today ──
  const hydrationTodayMl = useMemo(
    () => hydration.filter((h) => h.date === today).reduce((s, h) => s + h.amountMl, 0),
    [hydration, today],
  );
  const targetMl = useMemo(() => {
    if (!profile) return 2500;
    return dailyWaterMl({
      weightKg: profile.weightKg ?? 70,
      trainingHours: workouts.some((w) => w.date === today) ? 1 : 0,
    }) ?? 2500;
  }, [profile, workouts, today]);

  // ── stat tiles ──
  const latestVital = vitals[0] ?? null;
  const latestSkin = skinHair[0] ?? null;
  const last7Vitals = vitals.slice(0, 7);
  const prev7Vitals = vitals.slice(7, 14);

  const stepsAvg = avgField(last7Vitals, (v) => v.steps);
  const stepsPrev = avgField(prev7Vitals, (v) => v.steps);
  const sleepAvg = avgField(last7Vitals, (v) => v.sleepHours);
  const sleepPrev = avgField(prev7Vitals, (v) => v.sleepHours);
  const hrvAvg = avgField(last7Vitals, (v) => v.hrv);
  const hrvPrev = avgField(prev7Vitals, (v) => v.hrv);
  const weightAvg = avgField(last7Vitals, (v) => v.weightKg);
  const weightPrev = avgField(prev7Vitals, (v) => v.weightKg);

  const energyVal = latestVital?.energy ?? latestSkin?.muscleEnergy ?? null;
  const moodVal = latestVital?.mood ?? null;

  // Profile incomplete banner
  const profileIncomplete = !profile || !profile.heightCm || !profile.weightKg;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Greeting */}
      <motion.div variants={item} className="space-y-0.5 px-1">
        <p className="text-[12px] text-muted-foreground">{greeting(lang)}{profile?.name ? `, ${profile.name}` : ''}</p>
        <p className="text-[11px] text-muted-foreground/60">
          {new Date().toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </motion.div>

      {/* Profile-incomplete banner */}
      {profileIncomplete && (
        <motion.div variants={item}>
          <button
            onClick={() => onJump('profile')}
            className="w-full text-start"
          >
            <PremiumCard gradient accent="hsl(var(--primary))" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{T.setProfile[lang]}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">{T.setProfileDesc[lang]}</p>
                </div>
              </div>
            </PremiumCard>
          </button>
        </motion.div>
      )}

      {/* Score gauges */}
      <motion.div variants={item}>
        <PremiumCard gradient accent={zoneColor(recovery.zone)} className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center">
              <ScoreGauge
                value={recovery.score}
                zone={recovery.zone}
                label={T.recovery[lang]}
                size={130}
                caption={recovery.hasData ? '' : T.setup[lang]}
              />
            </div>
            <div className="flex flex-col items-center">
              <ScoreGauge
                value={readiness.score}
                zone={readiness.zone}
                label={T.readiness[lang]}
                size={130}
                caption={readiness.components.loadPenalty > 0 ? `−${readiness.components.loadPenalty} (load)` : ''}
              />
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      {/* Recommendation */}
      <motion.div variants={item}>
        <RecCard
          rec={readiness.recommendation}
          score={readiness.score}
          zone={readiness.zone}
          lang={lang}
          ar7={series7}
        />
      </motion.div>

      {/* Hydration + Fasting row */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HydrationCard todayMl={hydrationTodayMl} targetMl={targetMl} lang={lang} onAdd={onLogHydration} />
        <FastingCard
          active={activeFasting}
          lang={lang}
          onStart={onStartFasting}
          onEnd={onEndFasting}
        />
      </motion.div>

      {/* Next dose */}
      <motion.div variants={item}>
        <NextDoseCard
          supplements={supplements}
          intakeLogs={intakeLogs}
          lang={lang}
          onJump={() => onJump('supplements')}
        />
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={item} className="space-y-2">
        <SectionHeader
          title={T.todaysStats[lang]}
          subtitle={T.weeklyTrend[lang]}
          icon={TrendingUp}
        />
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={Footprints}
            label={T.steps[lang]}
            accent="#06b6d4"
            value={stepsAvg ? Math.round(stepsAvg).toLocaleString() : '—'}
            delta={deltaPct(stepsAvg, stepsPrev)}
            higherIsBetter
            onClick={() => onJump('vitals')}
          />
          <StatTile
            icon={Moon}
            label={T.sleep[lang]}
            accent="#8b5cf6"
            value={sleepAvg ? sleepAvg.toFixed(1) : '—'}
            unit={isAr ? 'س' : 'h'}
            delta={deltaPct(sleepAvg, sleepPrev)}
            higherIsBetter
            onClick={() => onJump('vitals')}
          />
          <StatTile
            icon={Heart}
            label={T.hrv[lang]}
            accent="#10b981"
            value={hrvAvg ? Math.round(hrvAvg).toString() : '—'}
            unit="ms"
            delta={deltaPct(hrvAvg, hrvPrev)}
            higherIsBetter
            onClick={() => onJump('vitals')}
          />
          <StatTile
            icon={Scale}
            label={T.weight[lang]}
            accent="#f59e0b"
            value={weightAvg ? weightAvg.toFixed(1) : '—'}
            unit="kg"
            delta={deltaPct(weightAvg, weightPrev)}
            higherIsBetter={false}
            onClick={() => onJump('hub')}
          />
          <StatTile
            icon={BatteryCharging}
            label={T.energy[lang]}
            accent="#22c55e"
            value={energyVal ? `${energyVal}/5` : '—'}
            onClick={() => onJump('vitals')}
          />
          <StatTile
            icon={Activity}
            label={T.mood[lang]}
            accent="#ec4899"
            value={moodVal ? `${moodVal}/5` : '—'}
            onClick={() => onJump('vitals')}
          />
        </div>
      </motion.div>

      {/* Training load */}
      <motion.div variants={item}>
        <TrainingLoadCard workouts={workouts} lang={lang} />
      </motion.div>

      {/* Streak heatmap */}
      <motion.div variants={item}>
        <StreakCard workouts={workouts} lang={lang} />
      </motion.div>
    </motion.div>
  );
}
