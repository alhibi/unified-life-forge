/**
 * Today / Dashboard tab — v4 Ultra-dense compact overhaul.
 *
 * Elite-tier, compact dashboard. 64px rings, 3-col stats,
 * refined typography, consistent spacing.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, BatteryCharging, ChevronRight, Droplets, Flame, Footprints,
  Heart, HeartPulse, Moon, Pill, Plus, Scale, Smile, Sparkles, Timer,
  TrendingUp, Zap,
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
  zoneColorAlt,
} from './primitives';
import { SoftSurface, SmoothBar, withAlpha, AuroraCard, GlassSurface, ElevatedCard, PulseRing } from './surfaces';
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
  onSaveVital: (entry: Omit<VitalLog, 'id' | 'loggedAt'>) => Promise<void>;
  onJump: (key: string) => void;
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const T = {
  greetingMorning: { ar: 'صباح الخير', de: 'Guten Morgen' },
  greetingAfternoon: { ar: 'نهارك جميل', de: 'Guten Tag' },
  greetingEvening: { ar: 'مساء الخير', de: 'Guten Abend' },
  greetingNight: { ar: 'مساء الخير', de: 'Gute Nacht' },
  recovery: { ar: 'التعافي', de: 'Recovery' },
  readiness: { ar: 'الجاهزية', de: 'Readiness' },
  noData: { ar: 'لا بيانات كافية', de: 'Nicht genug Daten' },
  setup: { ar: 'سجّل بياناتك لتفعيل النقاط', de: 'Logge Daten für Scores' },
  trainingAdvice: { ar: 'توصية اليوم', de: 'Empfehlung' },
  recGoHard: { ar: 'تمرين شاق ✓', de: 'Bereit für hartes Training' },
  recNormal: { ar: 'تمرين معتدل', de: 'Normales Training möglich' },
  recEasy: { ar: 'تخفيف الحمل', de: 'Heute leichter trainieren' },
  recRest: { ar: 'يوم راحة', de: 'Erholungstag empfohlen' },
  hydration: { ar: 'الترطيب', de: 'Hydration' },
  ofTarget: { ar: 'من الهدف', de: 'des Ziels' },
  nextDose: { ar: 'المكمل التالي', de: 'Nächste Dosis' },
  noPending: { ar: 'لا جرعات معلّقة اليوم', de: 'Keine offenen Dosen heute' },
  fasting: { ar: 'الصيام المتقطع', de: 'Intervallfasten' },
  endFasting: { ar: 'إنهاء الصيام', de: 'Beenden' },
  todaysStats: { ar: 'مؤشرات اليوم', de: 'Heutige Werte' },
  weeklyTrend: { ar: 'مقارنة بآخر 7 أيام', de: 'Vergleich letzte 7 Tage' },
  steps: { ar: 'الخطوات', de: 'Schritte' },
  sleep: { ar: 'النوم', de: 'Schlaf' },
  energy: { ar: 'الطاقة', de: 'Energie' },
  mood: { ar: 'المزاج', de: 'Stimmung' },
  weight: { ar: 'الوزن', de: 'Gewicht' },
  hrv: { ar: 'HRV', de: 'HRV' },
  trainingLoad: { ar: 'الحمل التدريبي', de: 'Trainingsbelastung' },
  acwrSweet: { ar: 'المنطقة المثالية', de: 'Idealer Bereich' },
  acwrLow: { ar: 'حمل منخفض — زِد التدريب', de: 'Geringe Belastung' },
  acwrCaution: { ar: 'حمل مرتفع — انتبه', de: 'Achtung — hohe Last' },
  acwrDanger: { ar: 'خطر إفراط تدريبي', de: 'Übertraining-Risiko' },
  streakDays: { ar: 'يوم متواصل', de: 'Tage in Folge' },
  trainingStreak: { ar: 'سلسلة التمارين', de: 'Trainings-Streak' },
  in: { ar: 'بعد', de: 'in' },
  hour: { ar: 'س', de: 'h' },
  min: { ar: 'د', de: 'min' },
  liters: { ar: 'لتر', de: 'L' },
  log: { ar: 'تسجيل سريع', de: 'Quick Log' },
  setProfile: { ar: 'أكمل ملفك لتفعيل كل الميزات', de: 'Profil vervollständigen' },
  setProfileDesc: {
    ar: 'أضف بياناتك الأساسية (الطول، الوزن، العمر) لتشغيل الحاسبات والنقاط الذكية.',
    de: 'Ergänze Größe, Gewicht & Alter für alle Berechnungen und Smart-Scores.',
  },
  quickActions: { ar: 'إجراءات سريعة', de: 'Schnellaktionen' },
  viewAll: { ar: 'عرض الكل', de: 'Alle anzeigen' },
};

function greeting(lang: 'ar' | 'de'): string {
  const h = new Date().getHours();
  if (h < 5) return T.greetingNight[lang];
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

function HeroScores({
  recovery: rec,
  readiness: ready,
  series7,
  lang,
}: {
  recovery: ReturnType<typeof recoveryScore>;
  readiness: ReturnType<typeof readinessScore>;
  series7: { date: string; readiness: number | null; recovery: number | null }[];
  lang: 'ar' | 'de';
}) {
  const recColor = zoneColor(rec.zone);
  const readyColor = zoneColor(ready.zone);
  const recAlt = zoneColorAlt(rec.zone);
  const readyAlt = zoneColorAlt(ready.zone);
  return (
    <SoftSurface accent={recColor} className="p-2.5 rounded-lg">
      <div className="flex items-center justify-center gap-3">
        <div className="flex flex-col items-center">
          <ProgressRing value={(rec.score ?? 0) / 100} size={64} strokeWidth={5} color={recColor} colorAlt={recAlt} gradient>
            <div className="text-center" dir="ltr">
              <div className="text-[18px] font-semibold tabular-nums leading-none" style={{ color: recColor }}>
                {rec.score != null ? Math.round(rec.score) : '—'}
              </div>
            </div>
          </ProgressRing>
          <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground mt-1.5">
            {T.recovery[lang]}
          </p>
          {!rec.hasData && (
            <p className="text-[8px] text-muted-foreground/50 mt-0.5 text-center max-w-[64px]">{T.setup[lang]}</p>
          )}
        </div>

        <div className="flex flex-col items-center">
          <ProgressRing value={(ready.score ?? 0) / 100} size={64} strokeWidth={5} color={readyColor} colorAlt={readyAlt} gradient>
            <div className="text-center" dir="ltr">
              <div className="text-[18px] font-semibold tabular-nums leading-none" style={{ color: readyColor }}>
                {ready.score != null ? Math.round(ready.score) : '—'}
              </div>
            </div>
          </ProgressRing>
          <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground mt-1.5">
            {T.readiness[lang]}
          </p>
          {ready.components.loadPenalty > 0 && (
            <p className="text-[8px] text-muted-foreground/50 mt-0.5">−{ready.components.loadPenalty} load</p>
          )}
        </div>
      </div>

      {series7.some((p) => p.readiness != null) && (
        <div className="h-8 mt-2 -mx-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series7} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={readyColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={readyColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                cursor={{ stroke: readyColor, strokeOpacity: 0.3, strokeWidth: 1, strokeDasharray: '3 4' }}
                contentStyle={{ background: 'hsl(var(--card) / 0.9)', backdropFilter: 'blur(8px)', border: `1px solid ${withAlpha(readyColor, 0.2)}`, borderRadius: 8, fontSize: 10, padding: '3px 8px' }}
                labelStyle={{ display: 'none' }}
                formatter={(v: any) => [`${Math.round(Number(v))}/100`, T.readiness[lang]]}
              />
              <Area type="monotone" dataKey="readiness" stroke={readyColor} strokeWidth={1.5} fill="url(#hero-grad)" connectNulls isAnimationActive animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SoftSurface>
  );
}

function RecCard({
  rec,
  score,
  zone,
  lang,
}: {
  rec: 'go_hard' | 'normal' | 'easy' | 'rest' | null;
  score: number | null;
  zone: 'low' | 'moderate' | 'good' | 'optimal' | null;
  lang: 'ar' | 'de';
}) {
  const labelMap = {
    go_hard: T.recGoHard[lang],
    normal: T.recNormal[lang],
    easy: T.recEasy[lang],
    rest: T.recRest[lang],
  } as const;
  const Icon = !rec ? HeartPulse : rec === 'go_hard' ? Zap : rec === 'normal' ? Activity : rec === 'easy' ? Heart : Moon;
  const color = zoneColor(zone);
  const text = rec ? labelMap[rec] : T.noData[lang];

  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-lg border"
      style={{ borderColor: withAlpha(color, 0.15) }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: withAlpha(color, 0.1) }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-foreground leading-snug truncate">{text}</p>
      </div>
      {score != null && (
        <div className="text-[15px] font-semibold tabular-nums shrink-0" dir="ltr" style={{ color }}>
          {Math.round(score)}
        </div>
      )}
    </div>
  );
}

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
  const color = '#06b6d4';
  const colorAlt = '#22d3ee';
  const quick = [200, 300, 500];

  return (
    <SoftSurface accent={color} className="p-2.5 rounded-lg">
      <button type="button" onClick={onLogMore} className="w-full flex items-center justify-between gap-2 text-start">
        <div className="flex-1 min-w-0">
          <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground">
            {T.hydration[lang]}
          </p>
          <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
            <span className="text-[18px] font-semibold tabular-nums leading-none" style={{ color }}>
              <AnimatedNumber value={Number(liters)} digits={1} />
            </span>
            <span className="text-[9px] text-muted-foreground font-medium">/ {targetL} {T.liters[lang]}</span>
          </div>
          <p className="text-[8px] text-muted-foreground/50 mt-0.5 font-medium">
            {Math.round(ratio * 100)}% {T.ofTarget[lang]}
          </p>
        </div>
        <ProgressRing value={ratio} size={48} strokeWidth={4} color={color} colorAlt={colorAlt} gradient>          <Droplets className="w-3.5 h-3.5" style={{ color }} />
        </ProgressRing>
      </button>
      <div className="flex gap-1 mt-2" dir="ltr">
        {quick.map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 h-6 rounded-md text-[9px] font-medium active:scale-95 transition-all duration-150"
            style={{
              background: withAlpha(color, 0.07),
              color,
              border: `1px solid ${withAlpha(color, 0.12)}`,
            }}
          >
            +{ml}{isAr ? 'مل' : 'ml'}
          </button>
        ))}
      </div>
    </SoftSurface>
  );
}

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
    <SoftSurface accent={accent} className="p-2.5 rounded-lg">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground">
            {T.fasting[lang]}
          </p>
          <p className="text-[11px] font-medium text-foreground mt-0.5">
            {active ? (active.protocol ?? '16:8') : (isAr ? 'متوقّف' : 'Inaktiv')}
          </p>
        </div>
        {active ? (
          <PulseRing color={accent} size={24} active>
            <Timer className="w-3 h-3" style={{ color: accent }} />
          </PulseRing>
        ) : (
          <Timer className="w-3.5 h-3.5" style={{ color: withAlpha(accent, 0.5) }} />
        )}
      </div>
      <div className="flex items-center justify-center mb-2">
        <FastingRing
          elapsedSec={elapsed}
          targetHours={active?.targetHours ?? 16}
          active={!!active}
          protocol={active?.protocol ?? '16:8'}
          lang={lang}
          size={90}
        />
      </div>
      {active ? (
        <button
          onClick={onEnd}
          className="w-full h-6 rounded-md text-[9px] font-medium bg-destructive/10 text-destructive active:scale-[0.98] transition-transform border border-destructive/15"
        >
          {T.endFasting[lang]}
        </button>
      ) : (
        <div className="flex gap-1" dir="ltr">
          {protocols.map((p) => (
            <button
              key={p.label}
              onClick={() => onStart(p.hours, p.label)}
              className="flex-1 h-6 rounded-md text-[9px] font-medium active:scale-95 transition-all duration-150"
              style={{
                background: withAlpha(accent, 0.07),
                border: `1px solid ${withAlpha(accent, 0.15)}`,
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
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform"
      style={{ borderColor: withAlpha(accent, 0.15) }}
      onClick={onJump}
      role="button"
      tabIndex={0}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: withAlpha(accent, 0.1) }}
      >
        <Pill className="w-3.5 h-3.5" style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground">
          {T.nextDose[lang]}
        </p>
        {next ? (
          <>
            <p className="text-[11px] font-medium text-foreground truncate mt-0.5">{next.sup.name}</p>
            <p className="text-[9px] font-medium mt-0.5" style={{ color: accent }} dir="ltr">
              {next.time} · {T.in[lang]}{' '}
              {next.deltaMin < 60
                ? `${next.deltaMin}${T.min[lang]}`
                : `${Math.floor(next.deltaMin / 60)}${T.hour[lang]} ${next.deltaMin % 60}${T.min[lang]}`}
            </p>
          </>
        ) : (
          <p className="text-[10px] font-medium text-muted-foreground/60 mt-0.5">{T.noPending[lang]}</p>
        )}
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
    </div>
  );
}

function TrainingLoadCard({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' | 'de' }) {
  const ar = useMemo(() => acwr(workouts), [workouts]);
  const zoneLabel = !ar
    ? T.noData[lang]
    : ar.zone === 'undertraining' ? T.acwrLow[lang]
    : ar.zone === 'sweet_spot' ? T.acwrSweet[lang]
    : ar.zone === 'caution' ? T.acwrCaution[lang]
    : T.acwrDanger[lang];
  const color =
    !ar ? 'hsl(var(--muted-foreground))'
    : ar.zone === 'undertraining' ? '#f59e0b'
    : ar.zone === 'sweet_spot' ? '#10b981'
    : ar.zone === 'caution' ? '#f59e0b'
    : '#ef4444';
  const r = ar?.ratio ?? 0;
  const markerPct = Math.max(0, Math.min(1, r / 2));

  return (
    <SoftSurface accent={color} className="p-2.5 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground">
            {T.trainingLoad[lang]}
          </p>
          <p className="text-[11px] font-medium text-foreground mt-0.5">{zoneLabel}</p>
        </div>
        {ar && (
          <div className="text-end" dir="ltr">
            <div className="text-[18px] font-semibold tabular-nums leading-none" style={{ color }}>
              {ar.ratio.toFixed(2)}
            </div>
            <div className="text-[7px] uppercase tracking-widest text-muted-foreground/50 mt-0.5">ACWR</div>
          </div>
        )}
      </div>

      <SmoothBar
        spectrum={[{ color: '#f59e0b', at: 0 }, { color: '#10b981', at: 40 }, { color: '#10b981', at: 65 }, { color: '#f59e0b', at: 75 }, { color: '#ef4444', at: 100 }]}
        marker={ar ? markerPct : undefined} markerColor={color} height={6}
      />

      {ar && (
        <div className="grid grid-cols-2 gap-1.5" dir="ltr">
          <div className="bg-muted/15 rounded-md p-1.5 border border-border/15">
            <div className="text-[8px] text-muted-foreground/60 font-medium">Acute (7d)</div>
            <div className="font-medium tabular-nums text-foreground text-[11px]">{ar.acute}</div>
          </div>
          <div className="bg-muted/15 rounded-md p-1.5 border border-border/15">
            <div className="text-[8px] text-muted-foreground/60 font-medium">Chronic (28d)</div>
            <div className="font-medium tabular-nums text-foreground text-[11px]">{ar.chronic}</div>
          </div>
        </div>
      )}
    </SoftSurface>
  );
}

function StreakCard({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' | 'de' }) {
  const days = useMemo(() => {
    const today = new Date();
    const out: { iso: string; value: number }[] = [];
    const byDay = new Map<string, number>();
    for (const w of workouts) byDay.set(w.date, (byDay.get(w.date) ?? 0) + 1);
    for (let i = 55; i >= 0; i--) {
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
    <SoftSurface accent="#f97316" className="p-2.5 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[8px] uppercase tracking-widest font-medium text-muted-foreground">
            {T.trainingStreak[lang]}
          </p>
          <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
            <span className="text-[18px] font-semibold tabular-nums text-foreground leading-none">
              {streak}
            </span>
            <span className="text-[9px] text-muted-foreground font-medium">{T.streakDays[lang]}</span>
          </div>
        </div>
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(249,115,22,0.08)' }}
        >
          <Flame className="w-3.5 h-3.5 text-orange-500" />
        </div>
      </div>
      <div className="overflow-x-auto -mx-0.5 px-0.5">
        <HeatmapCalendar days={days} weeks={8} color="#f97316" />
      </div>
    </SoftSurface>
  );
}

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

  const snap = useMemo(
    () => dailySnapshot({ profile, vitals, skinHair, hydration, workouts, dietLogs: [] }),
    [profile, vitals, skinHair, hydration, workouts],
  );

  const todayVital = useMemo(() => vitals.find((v) => v.date === today) ?? null, [vitals, today]);

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
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
        <motion.div variants={item} className="flex items-end justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">
              {greeting(lang)}{profile?.name ? `, ${profile.name}` : ''}
            </p>
            <p className="text-[9px] text-muted-foreground/60 font-medium">
              {new Date().toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => openQuick()}
            className="shrink-0 inline-flex items-center gap-1 h-6 px-2.5 rounded-md bg-primary text-primary-foreground text-[9px] font-medium active:scale-95 transition-transform"
          >
            <Plus className="w-3 h-3" />
            {T.log[lang]}
          </button>
        </motion.div>

        {profileIncomplete && (
          <motion.div variants={item}>
            <div
              className="flex items-center gap-2.5 p-2.5 rounded-lg border border-primary/15 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => onJump('profile')}
              role="button"
              tabIndex={0}
            >
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-start">
                <p className="text-[10px] font-medium text-foreground">{T.setProfile[lang]}</p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5 leading-relaxed">{T.setProfileDesc[lang]}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            </div>
          </motion.div>
        )}

        <motion.div variants={item}>
          <HeroScores
            recovery={recovery}
            readiness={readiness}
            series7={series7}
            lang={lang}
          />
        </motion.div>

        <motion.div variants={item}>
          <RecCard
            rec={readiness.recommendation}
            score={readiness.score}
            zone={readiness.zone}
            lang={lang}
          />
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        <motion.div variants={item}>
          <NextDoseCard
            supplements={supplements}
            intakeLogs={intakeLogs}
            lang={lang}
            onJump={() => onJump('supplements')}
          />
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <div className="flex items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-[9px] uppercase tracking-widest font-medium text-muted-foreground">
                {T.todaysStats[lang]}
              </p>
            </div>
            <button
              onClick={() => openQuick()}
              className="text-[9px] font-medium text-primary inline-flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />
              {T.log[lang]}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
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

        <motion.div variants={item}>
          <TrainingLoadCard workouts={workouts} lang={lang} />
        </motion.div>

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
