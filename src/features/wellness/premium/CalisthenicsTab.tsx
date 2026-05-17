/**
 * CalisthenicsTab — elite bodyweight skill training hub.
 *
 * Features:
 *  • Skill Progressions  — 10 calisthenics skills with level-dot progress tracking
 *  • Training Plans      — 3 pre-built programs (PPL, Full Body, Skills Focus)
 *  • Today's Workout     — checklist of exercises if a plan is active
 *  • Weekly Volume       — 7-day bar chart of sets completed
 *
 * Self-contained: all state persisted in localStorage.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, BarChart3, Calendar, Check, ChevronRight,
  Dumbbell, Flame, Play, RotateCcw, Target, Timer, Trophy, Zap,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

/* ─────────────── Constants & Types ─────────────── */

const LS_PROGRESS = 'cali:progress';
const LS_PLAN = 'cali:plan';
const LS_LOG = 'cali:log';

type SkillKey =
  | 'pushUp' | 'pullUp' | 'dip' | 'squat' | 'lSit'
  | 'handstand' | 'frontLever' | 'backLever' | 'planche' | 'muscleUp';

interface SkillDef {
  key: SkillKey;
  name: { ar: string; de: string };
  color: string;
  levels: string[];
}

interface LogEntry {
  date: string;
  exercises: { key: string; sets: number; reps: number; done: boolean }[];
}

type PlanKey = 'ppl' | 'fullBody' | 'skills';

interface PlanDef {
  key: PlanKey;
  name: { ar: string; de: string };
  freq: { ar: string; de: string };
  desc: { ar: string; de: string };
  days: { exercises: { key: string; name: string; sets: number; reps: number }[] }[];
}

/* ─────────────── Skill Definitions ─────────────── */

const SKILLS: SkillDef[] = [
  { key: 'pushUp', name: { ar: 'ضغط', de: 'Liegestütz' }, color: '#ef4444', levels: ['Wall', 'Incline', 'Standard', 'Diamond', 'Archer', 'One-Arm'] },
  { key: 'pullUp', name: { ar: 'عقلة', de: 'Klimmzug' }, color: '#3b82f6', levels: ['Dead Hang', 'Negative', 'Assisted', 'Standard', 'L-sit Pull', 'Muscle-Up'] },
  { key: 'dip', name: { ar: 'ديبس', de: 'Dips' }, color: '#f59e0b', levels: ['Bench', 'Assisted', 'Standard', 'Ring', 'Weighted', 'Korean'] },
  { key: 'squat', name: { ar: 'سكوات', de: 'Kniebeuge' }, color: '#10b981', levels: ['Bodyweight', 'Split', 'Bulgarian', 'Pistol Neg.', 'Pistol', 'Shrimp'] },
  { key: 'lSit', name: { ar: 'إل-سيت', de: 'L-Sit' }, color: '#8b5cf6', levels: ['Tuck', 'One-leg', 'Straddle', 'Full L-sit', 'V-sit'] },
  { key: 'handstand', name: { ar: 'وقوف يدين', de: 'Handstand' }, color: '#ec4899', levels: ['Wall HS', 'Chest-to-wall', 'Back-to-wall', 'Kick-up', 'Freestanding', 'HSPU'] },
  { key: 'frontLever', name: { ar: 'فرنت ليفر', de: 'Front Lever' }, color: '#06b6d4', levels: ['Tuck', 'Adv. Tuck', 'One-leg', 'Straddle', 'Full'] },
  { key: 'backLever', name: { ar: 'باك ليفر', de: 'Back Lever' }, color: '#14b8a6', levels: ['Tuck', 'Adv. Tuck', 'One-leg', 'Straddle', 'Full'] },
  { key: 'planche', name: { ar: 'بلانش', de: 'Planche' }, color: '#f97316', levels: ['Plank', 'Pseudo PU', 'Tuck Planche', 'Adv. Tuck', 'Straddle', 'Full'] },
  { key: 'muscleUp', name: { ar: 'ماصل أب', de: 'Muscle-Up' }, color: '#6366f1', levels: ['High Pull', 'Negative MU', 'Kipping', 'Strict', 'Slow MU'] },
];

/* ─────────────── Training Plans ─────────────── */

const PLANS: PlanDef[] = [
  {
    key: 'ppl',
    name: { ar: 'دفع/سحب/أرجل', de: 'Push/Pull/Legs' },
    freq: { ar: '3×/أسبوع', de: '3×/Woche' },
    desc: { ar: 'تقسيم كلاسيكي لبناء القوة المتوازنة', de: 'Klassischer Split für ausgewogenen Kraftaufbau' },
    days: [
      { exercises: [
        { key: 'pushUp', name: 'Push-ups', sets: 4, reps: 8 },
        { key: 'dip', name: 'Dips', sets: 3, reps: 8 },
        { key: 'handstand', name: 'HS Hold', sets: 3, reps: 30 },
        { key: 'planche', name: 'Planche Lean', sets: 3, reps: 15 },
      ]},
      { exercises: [
        { key: 'pullUp', name: 'Pull-ups', sets: 4, reps: 6 },
        { key: 'frontLever', name: 'FL Rows', sets: 3, reps: 6 },
        { key: 'backLever', name: 'BL Hold', sets: 3, reps: 15 },
        { key: 'muscleUp', name: 'High Pulls', sets: 3, reps: 5 },
      ]},
      { exercises: [
        { key: 'squat', name: 'Squats', sets: 4, reps: 10 },
        { key: 'squat', name: 'Nordic Curl', sets: 3, reps: 5 },
        { key: 'lSit', name: 'L-sit Hold', sets: 3, reps: 20 },
        { key: 'squat', name: 'Calf Raises', sets: 3, reps: 15 },
      ]},
    ],
  },
  {
    key: 'fullBody',
    name: { ar: 'جسم كامل', de: 'Ganzkörper' },
    freq: { ar: '3×/أسبوع', de: '3×/Woche' },
    desc: { ar: 'تمرين شامل لكل جلسة', de: 'Komplettes Training pro Session' },
    days: [
      { exercises: [
        { key: 'pullUp', name: 'Pull-ups', sets: 3, reps: 8 },
        { key: 'pushUp', name: 'Push-ups', sets: 3, reps: 12 },
        { key: 'squat', name: 'Squats', sets: 3, reps: 12 },
        { key: 'dip', name: 'Dips', sets: 3, reps: 8 },
        { key: 'lSit', name: 'L-sit', sets: 3, reps: 15 },
      ]},
      { exercises: [
        { key: 'pullUp', name: 'Chin-ups', sets: 3, reps: 8 },
        { key: 'pushUp', name: 'Diamond PU', sets: 3, reps: 10 },
        { key: 'squat', name: 'Split Squat', sets: 3, reps: 10 },
        { key: 'handstand', name: 'Wall HS', sets: 3, reps: 30 },
        { key: 'frontLever', name: 'Tuck FL', sets: 3, reps: 12 },
      ]},
      { exercises: [
        { key: 'muscleUp', name: 'High Pulls', sets: 3, reps: 5 },
        { key: 'pushUp', name: 'Archer PU', sets: 3, reps: 6 },
        { key: 'squat', name: 'Pistol Neg.', sets: 3, reps: 6 },
        { key: 'dip', name: 'Ring Dips', sets: 3, reps: 6 },
        { key: 'planche', name: 'Pseudo PU', sets: 3, reps: 8 },
      ]},
    ],
  },
  {
    key: 'skills',
    name: { ar: 'مهارات', de: 'Skills Focus' },
    freq: { ar: '4×/أسبوع', de: '4×/Woche' },
    desc: { ar: 'تركيز على المهارات المتقدمة والثبات', de: 'Fokus auf fortgeschrittene Skills & Holds' },
    days: [
      { exercises: [
        { key: 'handstand', name: 'Freestanding HS', sets: 5, reps: 20 },
        { key: 'planche', name: 'Tuck Planche', sets: 4, reps: 10 },
        { key: 'pushUp', name: 'HSPU Neg.', sets: 3, reps: 5 },
      ]},
      { exercises: [
        { key: 'frontLever', name: 'Front Lever', sets: 5, reps: 10 },
        { key: 'backLever', name: 'Back Lever', sets: 4, reps: 10 },
        { key: 'pullUp', name: 'Weighted Pull', sets: 3, reps: 5 },
      ]},
      { exercises: [
        { key: 'muscleUp', name: 'Muscle-ups', sets: 5, reps: 3 },
        { key: 'dip', name: 'Korean Dips', sets: 3, reps: 6 },
        { key: 'lSit', name: 'V-sit', sets: 4, reps: 12 },
      ]},
      { exercises: [
        { key: 'handstand', name: 'HS Walk', sets: 4, reps: 10 },
        { key: 'planche', name: 'Straddle Pl.', sets: 4, reps: 8 },
        { key: 'squat', name: 'Shrimp Squat', sets: 3, reps: 6 },
      ]},
    ],
  },
];

/* ─────────────── Translations ─────────────── */

const T = {
  title: { ar: 'كاليسثينكس', de: 'Calisthenics' },
  skills: { ar: 'تدرّج المهارات', de: 'Skill-Progressionen' },
  plans: { ar: 'خطط التدريب', de: 'Trainingspläne' },
  today: { ar: 'تمرين اليوم', de: 'Heutiges Training' },
  volume: { ar: 'حجم الأسبوع', de: 'Wochenvolumen' },
  start: { ar: 'بدء', de: 'Start' },
  active: { ar: 'نشط', de: 'Aktiv' },
  reset: { ar: 'إعادة', de: 'Reset' },
  noPlan: { ar: 'اختر خطة للبدء', de: 'Wähle einen Plan' },
  rest: { ar: 'راحة 60-90 ث', de: 'Pause 60-90s' },
  setsLabel: { ar: 'مج', de: 'Sätze' },
  level: { ar: 'المستوى', de: 'Level' },
  complete: { ar: 'مكتمل', de: 'Fertig' },
  dayLabel: { ar: 'يوم', de: 'Tag' },
};

/* ─────────────── Helpers ─────────────── */

const todayIso = () => new Date().toISOString().slice(0, 10);
const getDayOfWeek = () => new Date().getDay();

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}



/* ─────────────── Sub-components ─────────────── */

function SkillProgressions({
  progress,
  onLevelChange,
  lang,
}: {
  progress: Record<SkillKey, number>;
  onLevelChange: (key: SkillKey, lvl: number) => void;
  lang: 'ar' | 'de';
}) {
  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Target className="w-3 h-3 text-primary" />
        <h3 className="text-[13px] font-medium">{T.skills[lang]}</h3>
      </div>
      <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
        {SKILLS.map((skill) => {
          const currentLvl = progress[skill.key] ?? 0;
          return (
            <motion.div
              key={skill.key}
              variants={item}
              className="flex items-center gap-2 p-2 rounded-lg bg-card/60 border border-border/30"
            >
              {/* Skill color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: skill.color }}
              />
              {/* Name + Level */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium truncate">
                    {skill.name[lang]}
                  </span>
                  <span className="text-[9px] text-muted-foreground ml-1">
                    {T.level[lang]} {currentLvl + 1}/{skill.levels.length}
                  </span>
                </div>
                {/* Progression dots */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {skill.levels.map((lvl, i) => (
                    <button
                      key={i}
                      onClick={() => onLevelChange(skill.key, i)}
                      title={lvl}
                      className="group relative"
                    >
                      <div
                        className={`w-3.5 h-1.5 rounded-sm transition-all ${
                          i <= currentLvl
                            ? 'opacity-100'
                            : 'opacity-20'
                        }`}
                        style={{ backgroundColor: skill.color }}
                      />
                      {/* Tooltip on hover */}
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] bg-popover border border-border rounded px-1 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {lvl}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Current level name */}
              <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 rounded px-1 py-0.5 shrink-0">
                {skill.levels[currentLvl]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function TrainingPlans({
  activePlan,
  onSelectPlan,
  lang,
}: {
  activePlan: PlanKey | null;
  onSelectPlan: (key: PlanKey) => void;
  lang: 'ar' | 'de';
}) {
  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Calendar className="w-3 h-3 text-primary" />
        <h3 className="text-[13px] font-medium">{T.plans[lang]}</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {PLANS.map((plan) => {
          const isActive = activePlan === plan.key;
          return (
            <motion.div
              key={plan.key}
              variants={item}
              className={`shrink-0 w-[140px] p-2 rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/30 bg-card/60 hover:border-border/60'
              }`}
              onClick={() => onSelectPlan(plan.key)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium truncate">{plan.name[lang]}</span>
                {isActive && (
                  <span className="text-[8px] bg-primary/20 text-primary rounded px-1 py-0.5 font-medium">
                    {T.active[lang]}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground block mb-1.5">{plan.freq[lang]}</span>
              <p className="text-[9px] text-muted-foreground/80 line-clamp-2">{plan.desc[lang]}</p>
              {!isActive && (
                <button className="mt-1.5 h-5 w-full flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary text-[9px] font-medium hover:bg-primary/20 transition-colors">
                  <Play className="w-2.5 h-2.5" />
                  {T.start[lang]}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function TodayWorkout({
  plan,
  log,
  onToggle,
  onReset,
  lang,
}: {
  plan: PlanDef | null;
  log: LogEntry | null;
  onToggle: (idx: number) => void;
  onReset: () => void;
  lang: 'ar' | 'de';
}) {
  if (!plan) {
    return (
      <motion.section variants={item} className="p-2.5 rounded-lg bg-card/60 border border-border/30">
        <div className="flex items-center gap-1.5 mb-1">
          <Dumbbell className="w-3 h-3 text-muted-foreground" />
          <h3 className="text-[13px] font-medium text-muted-foreground">{T.today[lang]}</h3>
        </div>
        <p className="text-[10px] text-muted-foreground/70 text-center py-3">{T.noPlan[lang]}</p>
      </motion.section>
    );
  }

  const dayIdx = getDayOfWeek() % plan.days.length;
  const dayExercises = plan.days[dayIdx].exercises;
  const exercises = log?.exercises ?? dayExercises.map((e) => ({ ...e, done: false }));
  const doneCount = exercises.filter((e) => e.done).length;
  const allDone = doneCount === exercises.length;

  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="w-3 h-3 text-primary" />
          <h3 className="text-[13px] font-medium">{T.today[lang]}</h3>
          <span className="text-[9px] text-muted-foreground">
            {T.dayLabel[lang]} {dayIdx + 1} — {plan.name[lang]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {allDone && <Trophy className="w-3 h-3 text-amber-500" />}
          <span className="text-[9px] font-medium text-muted-foreground">
            {doneCount}/{exercises.length}
          </span>
          <button
            onClick={onReset}
            className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-2.5 h-2.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {exercises.map((ex, idx) => (
          <motion.div
            key={idx}
            variants={item}
            className={`flex items-center gap-2 p-1.5 rounded-md border transition-all ${
              ex.done
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-border/30 bg-card/60'
            }`}
          >
            <button
              onClick={() => onToggle(idx)}
              className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
                ex.done
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {ex.done && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-[11px] font-medium ${ex.done ? 'line-through text-muted-foreground' : ''}`}>
                {ex.key in dayExercises ? dayExercises[idx]?.name ?? ex.key : ex.key}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground shrink-0">
              {ex.sets}×{ex.reps}
            </span>
            <Timer className="w-2.5 h-2.5 text-muted-foreground/50" />
          </motion.div>
        ))}
      </div>
      <p className="text-[8px] text-muted-foreground/60 text-center">{T.rest[lang]}</p>
    </motion.section>
  );
}

function WeeklyVolume({ logs, lang }: { logs: LogEntry[]; lang: 'ar' | 'de' }) {
  const weekDays = lang === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'];

  const today = new Date();
  const weekData = useMemo(() => {
    const data: number[] = Array(7).fill(0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      const entry = logs.find((l) => l.date === iso);
      if (entry) {
        data[i] = entry.exercises.reduce((sum, ex) => sum + (ex.done ? ex.sets : 0), 0);
      }
    }
    return data;
  }, [logs]);

  const maxSets = Math.max(...weekData, 1);

  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <BarChart3 className="w-3 h-3 text-primary" />
        <h3 className="text-[13px] font-medium">{T.volume[lang]}</h3>
        <span className="text-[9px] text-muted-foreground ml-auto">
          {weekData.reduce((a, b) => a + b, 0)} {T.setsLabel[lang]}
        </span>
      </div>
      <div className="flex items-end gap-1 h-[48px] p-2 rounded-lg bg-card/60 border border-border/30">
        {weekData.map((sets, i) => {
          const pct = sets / maxSets;
          return (
            <motion.div
              key={i}
              variants={item}
              className="flex-1 flex flex-col items-center gap-0.5"
            >
              <div className="w-full relative flex items-end justify-center h-[30px]">
                <div
                  className="w-full max-w-[12px] rounded-sm transition-all"
                  style={{
                    height: `${Math.max(pct * 100, 4)}%`,
                    backgroundColor: sets > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    opacity: sets > 0 ? 0.6 + pct * 0.4 : 0.3,
                  }}
                />
              </div>
              <span className="text-[7px] text-muted-foreground">{weekDays[i]}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}



/* ─────────────── Main Component ─────────────── */

export default function CalisthenicsTab() {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';

  /* ── State ── */
  const [progress, setProgress] = useState<Record<SkillKey, number>>(() =>
    loadJson<Record<SkillKey, number>>(LS_PROGRESS, {
      pushUp: 2, pullUp: 1, dip: 2, squat: 1, lSit: 0,
      handstand: 0, frontLever: 0, backLever: 0, planche: 0, muscleUp: 0,
    })
  );
  const [activePlan, setActivePlan] = useState<PlanKey | null>(() =>
    loadJson<PlanKey | null>(LS_PLAN, null)
  );
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    loadJson<LogEntry[]>(LS_LOG, [])
  );

  /* ── Derived ── */
  const currentPlan = useMemo(() => PLANS.find((p) => p.key === activePlan) ?? null, [activePlan]);
  const todayLog = useMemo(() => logs.find((l) => l.date === todayIso()) ?? null, [logs]);

  /* ── Persistence ── */
  useEffect(() => {
    localStorage.setItem(LS_PROGRESS, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem(LS_PLAN, JSON.stringify(activePlan));
  }, [activePlan]);

  useEffect(() => {
    localStorage.setItem(LS_LOG, JSON.stringify(logs));
  }, [logs]);

  /* ── Handlers ── */
  const handleLevelChange = (key: SkillKey, lvl: number) => {
    setProgress((prev) => ({ ...prev, [key]: lvl }));
  };

  const handleSelectPlan = (key: PlanKey) => {
    setActivePlan((prev) => (prev === key ? null : key));
  };

  const handleToggleExercise = (idx: number) => {
    const date = todayIso();
    setLogs((prev) => {
      const existing = prev.find((l) => l.date === date);
      if (existing) {
        const updated = { ...existing, exercises: [...existing.exercises] };
        if (updated.exercises[idx]) {
          updated.exercises[idx] = { ...updated.exercises[idx], done: !updated.exercises[idx].done };
        }
        return prev.map((l) => (l.date === date ? updated : l));
      }
      // Create new entry from plan
      if (!currentPlan) return prev;
      const dayIdx = getDayOfWeek() % currentPlan.days.length;
      const exercises = currentPlan.days[dayIdx].exercises.map((e, i) => ({
        key: e.name,
        sets: e.sets,
        reps: e.reps,
        done: i === idx,
      }));
      return [...prev, { date, exercises }];
    });
  };

  const handleResetToday = () => {
    const date = todayIso();
    setLogs((prev) => prev.filter((l) => l.date !== date));
  };

  /* ── Render ── */
  return (
    <motion.div
      className="p-2.5 space-y-2"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5 text-primary" />
        <h2 className="text-[13px] font-medium">{T.title[lang]}</h2>
        <div className="flex items-center gap-1 ml-auto">
          <Award className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] text-muted-foreground font-medium">
            {Object.values(progress).filter((v) => v >= 3).length} {T.complete[lang]}
          </span>
        </div>
      </motion.div>

      {/* Skill Progressions */}
      <SkillProgressions progress={progress} onLevelChange={handleLevelChange} lang={lang} />

      {/* Training Plans */}
      <TrainingPlans activePlan={activePlan} onSelectPlan={handleSelectPlan} lang={lang} />

      {/* Today's Workout */}
      <TodayWorkout
        plan={currentPlan}
        log={todayLog}
        onToggle={handleToggleExercise}
        onReset={handleResetToday}
        lang={lang}
      />

      {/* Weekly Volume */}
      <WeeklyVolume logs={logs} lang={lang} />
    </motion.div>
  );
}
