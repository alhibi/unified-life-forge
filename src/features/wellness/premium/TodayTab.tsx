/**
 * Today / Dashboard tab — the home of the premium wellness experience.
 *
 * v2 changes (gradient + UX overhaul):
 *  • All cards use the new SoftSurface (multi-stop gradient + dither)
 *    so accents wash gently rather than as a harsh ring.
 *  • A single `QuickLogSheet` lets the user log water, weight, sleep,
 *    sleep-quality, HRV, RHR, steps, energy and mood from this page —
 *    every stat tile and ring becomes a one-tap entry point.
 *  • The ACWR bar is now the new <SmoothBar> (continuous spectrum
 *    interpolated through oklab — no hard segment seams).
 *  • Stat tiles read from the unified `wellnessLink` resolver so the
 *    same number appears here, in the Hub, and in the Profile preview.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, BatteryCharging, Droplets, Flame, Footprints, Heart, HeartPulse,
  Moon, Pill, Plus, Scale, Smile, Sparkles, Timer, TrendingUp, Zap,
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
import { SoftSurface, SmoothBar, withAlpha } from './surfaces';
import QuickLogSheet, { type QuickMetric } from './QuickLogSheet';
import { recoveryScore, readinessScore, dailyScoreSeries, streakBackwards } from '../recoveryEngine';
import { acwr, dailyWaterMl } from '../athleticEngine';
import { resolveWeight, dailySnapshot } from '../wellnessLink';

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
  /** Vital upsert (used by QuickLogSheet). */
  onSaveVital: (entry: Omit<VitalLog, 'id' | 'loggedAt'>) => Promise<void>;
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
  log: { ar: 'تسجيل', de: 'Loggen' },
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
    <SoftSurface accent={color} variant="mesh" intensity={0.85} className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: withAlpha(color, 0.16) }}
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
                  <stop offset="0%"   stopColor={color} stopOpacity={0.45} />
                  <stop offset="60%"  stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                cursor={{ stroke: color, strokeOpacity: 0.4, strokeWidth: 1, strokeDasharray: '3 4' }}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: `1px solid ${withAlpha(color, 0.25)}`,
                  borderRadius: 10,
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
    </SoftSurface>
  );
}

/* ────────────────── Hydration card ────────────────── */
function HydrationCard({
  todayMl,
  targetMl,
  lang,
  onAdd,
  onLogMore,
}: {
  todayMl: number;
  targetMl: number;
  lang: 'ar' | 'de';
  onAdd: (ml: number) => void;
  onLogMore: () => void;
}) {
  const isAr = lang === 'ar';
  const ratio = pct(todayMl, targetMl);
  const liters = (todayMl / 1000).toFixed(1);
  const targetL = (targetMl / 1000).toFixed(1);
  const color = '#06b6d4'; // cyan-500
  const colorAlt = '#22d3ee'; // cyan-400

  const quick = [200, 300, 500];

  return (
    <SoftSurface accent={color} variant="mesh" intensity={0.85} className="p-4">
      <button
        type="button"
        onClick={onLogMore}
        className="w-full flex items-center justify-between gap-3 text-start"
      >
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
        <ProgressRing value={ratio} size={74} strokeWidth={6} color={color} colorAlt={colorAlt} gradient>
          <Droplets className="w-5 h-5" style={{ color }} />
        </ProgressRing>
      </button>
      <div className="flex gap-1.5 mt-3" dir="ltr">
        {quick.map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border active:scale-95 transition-transform"
            style={{
              borderColor: withAlpha(color, 0.25),
              background: withAlpha(color, 0.06),
              color: color,
            }}
          >
            +{ml} {isAr ? 'مل' : 'ml'}
          </button>
        ))}
      </div>
    </SoftSurface>
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
  const accent = '#a855f7';

  const protocols = [
    { hours: 16, label: '16:8' },
    { hours: 18, label: '18:6' },
    { hours: 20, label: '20:4' },
  ];

  return (
    <SoftSurface accent={accent} variant="mesh" intensity={0.85} className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {T.fasting[lang]}
          </p>
          <p className="text-[13px] font-bold text-foreground mt-0.5">
            {active ? (active.protocol ?? '16:8') : (isAr ? 'متوقّف' : 'Inaktiv')}
          </p>
        </div>
        <Timer className="w-5 h-5" style={{ color: withAlpha(accent, 0.7) }} />
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
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold border active:scale-95 transition-transform"
              style={{
                borderColor: withAlpha(accent, 0.3),
                background: withAlpha(accent, 0.08),
                color: accent,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </SoftSurface>
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

  const accent = '#f59e0b';

  return (
    <SoftSurface as="button" onClick={onJump} accent={accent} variant="mesh" intensity={0.6} className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: withAlpha(accent, 0.16) }}>
          <Pill className="w-5 h-5" style={{ color: accent }} />
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
              <p className="text-[11px] mt-0.5" style={{ color: accent }} dir="ltr">
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
    </SoftSurface>
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

  const r = ar?.ratio ?? 0;
  const markerPct = Math.max(0, Math.min(1, r / 2));

  return (
    <SoftSurface accent={color} variant="mesh" intensity={0.6} className="p-4 space-y-3">
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

      {/* Smooth zone bar — continuous gradient through oklab */}
      <SmoothBar
        spectrum={[
          { color: '#f59e0b', at: 0 },     // amber: under
          { color: '#10b981', at: 40 },    // emerald: sweet spot
          { color: '#10b981', at: 65 },
          { color: '#f59e0b', at: 75 },    // amber: caution
          { color: '#ef4444', at: 100 },   // red: danger
        ]}
        marker={ar ? markerPct : undefined}
        markerColor={color}
        height={10}
      />

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
    </SoftSurface>
  );
}

/* ────────────────── Streak heatmap card ────────────────── */
function StreakCard({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' | 'de' }) {
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
    <SoftSurface accent="#f97316" variant="mesh" intensity={0.55} className="p-4">
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
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
          <Flame className="w-4 h-4 text-orange-500" />
        </div>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <HeatmapCalendar days={days} weeks={10} color="#f97316" />
      </div>
    </SoftSurface>
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
  onSaveVital,
  onJump,
}: Props) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';
  const isAr = lang === 'ar';
  const today = todayIso();

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMetric, setQuickMetric] = useState<QuickMetric | undefined>(undefined);

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

  // ── unified daily snapshot ──
  const snap = useMemo(
    () => dailySnapshot({ profile, vitals, skinHair, hydration, workouts, dietLogs: [] }),
    [profile, vitals, skinHair, hydration, workouts],
  );

  // Today's vital row (used as seed for the QuickLog sheet)
  const todayVital = useMemo(() => vitals.find((v) => v.date === today) ?? null, [vitals, today]);

  // Effective body weight for hydration target
  const weightForTarget = useMemo(() => {
    return resolveWeight({ profile, vitals, skinHair, hydration, workouts, dietLogs: [] }).value
      ?? profile?.weightKg ?? 70;
  }, [profile, vitals, skinHair, hydration, workouts]);

  const targetMl = useMemo(() => {
    return dailyWaterMl({
      weightKg: weightForTarget,
      trainingHours: workouts.some((w) => w.date === today) ? 1 : 0,
    }) ?? 2500;
  }, [weightForTarget, workouts, today]);

  // ── stat tiles (avg of last 7d, baseline = previous 7d) ──
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

  const energyVal = snap.energy;
  const moodVal = snap.mood;

  const profileIncomplete = !profile || !profile.heightCm || !profile.weightKg;

  const openQuick = (m?: QuickMetric) => {
    setQuickMetric(m);
    setQuickOpen(true);
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
        {/* Greeting + Quick-log CTA */}
        <motion.div variants={item} className="flex items-end justify-between gap-3 px-1">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[12px] text-muted-foreground truncate">
              {greeting(lang)}{profile?.name ? `, ${profile.name}` : ''}
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              {new Date().toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => openQuick()}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            {T.log[lang]}
          </button>
        </motion.div>

        {/* Profile-incomplete banner */}
        {profileIncomplete && (
          <motion.div variants={item}>
            <SoftSurface as="button" onClick={() => onJump('profile')} accent="hsl(var(--primary))" intensity={1} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-[13px] font-bold text-foreground">{T.setProfile[lang]}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">{T.setProfileDesc[lang]}</p>
                </div>
              </div>
            </SoftSurface>
          </motion.div>
        )}

        {/* Score gauges */}
        <motion.div variants={item}>
          <SoftSurface accent={zoneColor(recovery.zone)} variant="mesh" intensity={0.85} className="p-4">
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
          </SoftSurface>
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
          <HydrationCard
            todayMl={snap.hydrationMl}
            targetMl={targetMl}
            lang={lang}
            onAdd={onLogHydration}
            onLogMore={() => openQuick('water')}
          />
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

        {/* Stats grid — every tile opens QuickLog */}
        <motion.div variants={item} className="space-y-2">
          <SectionHeader
            title={T.todaysStats[lang]}
            subtitle={T.weeklyTrend[lang]}
            icon={TrendingUp}
            action={
              <button
                onClick={() => openQuick()}
                className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {T.log[lang]}
              </button>
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              icon={Footprints}
              label={T.steps[lang]}
              accent="#06b6d4"
              value={snap.steps != null
                ? snap.steps.toLocaleString()
                : (stepsAvg ? Math.round(stepsAvg).toLocaleString() : '—')}
              delta={deltaPct(stepsAvg, stepsPrev)}
              higherIsBetter
              onClick={() => openQuick('steps')}
            />
            <StatTile
              icon={Moon}
              label={T.sleep[lang]}
              accent="#8b5cf6"
              value={snap.sleepHours != null
                ? snap.sleepHours.toFixed(1)
                : (sleepAvg ? sleepAvg.toFixed(1) : '—')}
              unit={isAr ? 'س' : 'h'}
              delta={deltaPct(sleepAvg, sleepPrev)}
              higherIsBetter
              onClick={() => openQuick('sleep')}
            />
            <StatTile
              icon={Heart}
              label={T.hrv[lang]}
              accent="#10b981"
              value={snap.hrv != null
                ? Math.round(snap.hrv).toString()
                : (hrvAvg ? Math.round(hrvAvg).toString() : '—')}
              unit="ms"
              delta={deltaPct(hrvAvg, hrvPrev)}
              higherIsBetter
              onClick={() => openQuick('hrv')}
            />
            <StatTile
              icon={Scale}
              label={T.weight[lang]}
              accent="#f59e0b"
              value={snap.weightKg != null
                ? snap.weightKg.toFixed(1)
                : (weightAvg ? weightAvg.toFixed(1) : '—')}
              unit="kg"
              delta={deltaPct(weightAvg, weightPrev)}
              higherIsBetter={false}
              onClick={() => openQuick('weight')}
            />
            <StatTile
              icon={BatteryCharging}
              label={T.energy[lang]}
              accent="#22c55e"
              value={energyVal ? `${energyVal}/5` : '—'}
              onClick={() => openQuick('energy')}
            />
            <StatTile
              icon={Smile}
              label={T.mood[lang]}
              accent="#ec4899"
              value={moodVal ? `${moodVal}/5` : '—'}
              onClick={() => openQuick('mood')}
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

      <QuickLogSheet
        open={quickOpen}
        metric={quickMetric}
        todayVital={todayVital}
        hydrationTodayMl={snap.hydrationMl}
        fallbackWeightKg={weightForTarget}
        onClose={() => setQuickOpen(false)}
        onSaveVital={async (patch) => {
          await onSaveVital({
            date: today,
            ...patch,
          } as Omit<VitalLog, 'id' | 'loggedAt'>);
        }}
        onAddHydration={async (ml) => {
          await onLogHydration(ml);
        }}
      />
    </>
  );
}
