/**
 * CalisthenicsTab — elite bodyweight training hub.
 *
 * Visual upgrade — full polish for athletes in their 20s:
 *  • Hero stats banner with active streak & total volume
 *  • Skill Progressions  — animated dot ladders with detailed labels
 *  • Training Plans      — visual cards with day-of-week mapping
 *  • Today's Workout     — interactive checklist with rest timer
 *  • Weekly Volume       — animated bar chart with sparkline
 *  • Quick links to Encyclopedia atlas
 *
 * Self-contained: all state persisted in localStorage.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, BarChart3, Calendar, Check, Dumbbell, Flame, Play, RotateCcw,
  Target, Timer, Trophy, Zap, BookOpen, ChevronRight, TrendingUp, Activity,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

/* ─────────────── Constants & Types ─────────────── */

const LS_PROGRESS = 'cali:progress';
const LS_PLAN = 'cali:plan';
const LS_LOG = 'cali:log';
const LS_STREAK = 'cali:streak';

type SkillKey =
  | 'pushUp' | 'pullUp' | 'dip' | 'squat' | 'lSit'
  | 'handstand' | 'frontLever' | 'backLever' | 'planche' | 'muscleUp';

interface SkillDef {
  key: SkillKey;
  name: { ar: string; de: string };
  emoji: string;
  color: string;
  levels: string[];
  difficulty: number;
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
  emoji: string;
  color: string;
  days: { name: { ar: string; de: string }; exercises: { key: string; name: string; sets: number; reps: number }[] }[];
}

/* ─────────────── Skill Definitions ─────────────── */

const SKILLS: SkillDef[] = [
  { key: 'pushUp', name: { ar: 'ضغط', de: 'Liegestütz' }, emoji: '💪', color: '#ef4444', difficulty: 2,
    levels: ['Wall', 'Incline', 'Standard', 'Diamond', 'Archer', 'One-Arm'] },
  { key: 'pullUp', name: { ar: 'عقلة', de: 'Klimmzug' }, emoji: '🔝', color: '#3b82f6', difficulty: 4,
    levels: ['Dead Hang', 'Negative', 'Assisted', 'Standard', 'L-sit Pull', 'Muscle-Up'] },
  { key: 'dip', name: { ar: 'ديبس', de: 'Dips' }, emoji: '🦅', color: '#f59e0b', difficulty: 5,
    levels: ['Bench', 'Assisted', 'Standard', 'Ring', 'Weighted', 'Korean'] },
  { key: 'squat', name: { ar: 'سكوات', de: 'Kniebeuge' }, emoji: '🦵', color: '#10b981', difficulty: 6,
    levels: ['Bodyweight', 'Split', 'Bulgarian', 'Pistol Neg.', 'Pistol', 'Shrimp'] },
  { key: 'lSit', name: { ar: 'إل-سيت', de: 'L-Sit' }, emoji: '🪑', color: '#8b5cf6', difficulty: 5,
    levels: ['Tuck', 'One-leg', 'Straddle', 'Full L-sit', 'V-sit'] },
  { key: 'handstand', name: { ar: 'وقوف يدين', de: 'Handstand' }, emoji: '🤸', color: '#ec4899', difficulty: 7,
    levels: ['Wall HS', 'Chest-to-wall', 'Back-to-wall', 'Kick-up', 'Freestanding', 'HSPU'] },
  { key: 'frontLever', name: { ar: 'فرنت ليفر', de: 'Front Lever' }, emoji: '🪂', color: '#06b6d4', difficulty: 8,
    levels: ['Tuck', 'Adv. Tuck', 'One-leg', 'Straddle', 'Full'] },
  { key: 'backLever', name: { ar: 'باك ليفر', de: 'Back Lever' }, emoji: '🌗', color: '#14b8a6', difficulty: 7,
    levels: ['Tuck', 'Adv. Tuck', 'One-leg', 'Straddle', 'Full'] },
  { key: 'planche', name: { ar: 'بلانش', de: 'Planche' }, emoji: '✈️', color: '#f97316', difficulty: 10,
    levels: ['Plank', 'Pseudo PU', 'Tuck Planche', 'Adv. Tuck', 'Straddle', 'Full'] },
  { key: 'muscleUp', name: { ar: 'ماصل أب', de: 'Muscle-Up' }, emoji: '🎯', color: '#6366f1', difficulty: 8,
    levels: ['High Pull', 'Negative MU', 'Kipping', 'Strict', 'Slow MU'] },
];

/* ─────────────── Training Plans ─────────────── */

const PLANS: PlanDef[] = [
  {
    key: 'ppl',
    name: { ar: 'دفع/سحب/أرجل', de: 'Push/Pull/Legs' },
    freq: { ar: '3×/أسبوع', de: '3×/Woche' },
    desc: { ar: 'تقسيم كلاسيكي لبناء القوة المتوازنة', de: 'Klassischer Split für ausgewogenen Kraftaufbau' },
    emoji: '⚖️',
    color: '#3b82f6',
    days: [
      { name: { ar: 'يوم الدفع', de: 'Push-Tag' }, exercises: [
        { key: 'pushUp', name: 'Push-ups', sets: 4, reps: 8 },
        { key: 'dip', name: 'Dips', sets: 3, reps: 8 },
        { key: 'handstand', name: 'HS Hold', sets: 3, reps: 30 },
        { key: 'planche', name: 'Planche Lean', sets: 3, reps: 15 },
      ]},
      { name: { ar: 'يوم السحب', de: 'Pull-Tag' }, exercises: [
        { key: 'pullUp', name: 'Pull-ups', sets: 4, reps: 6 },
        { key: 'frontLever', name: 'FL Rows', sets: 3, reps: 6 },
        { key: 'backLever', name: 'BL Hold', sets: 3, reps: 15 },
        { key: 'muscleUp', name: 'High Pulls', sets: 3, reps: 5 },
      ]},
      { name: { ar: 'يوم الأرجل', de: 'Beintag' }, exercises: [
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
    emoji: '🔥',
    color: '#10b981',
    days: [
      { name: { ar: 'الجلسة A', de: 'Session A' }, exercises: [
        { key: 'pullUp', name: 'Pull-ups', sets: 3, reps: 8 },
        { key: 'pushUp', name: 'Push-ups', sets: 3, reps: 12 },
        { key: 'squat', name: 'Squats', sets: 3, reps: 12 },
        { key: 'dip', name: 'Dips', sets: 3, reps: 8 },
        { key: 'lSit', name: 'L-sit', sets: 3, reps: 15 },
      ]},
      { name: { ar: 'الجلسة B', de: 'Session B' }, exercises: [
        { key: 'pullUp', name: 'Chin-ups', sets: 3, reps: 8 },
        { key: 'pushUp', name: 'Diamond PU', sets: 3, reps: 10 },
        { key: 'squat', name: 'Split Squat', sets: 3, reps: 10 },
        { key: 'handstand', name: 'Wall HS', sets: 3, reps: 30 },
        { key: 'frontLever', name: 'Tuck FL', sets: 3, reps: 12 },
      ]},
      { name: { ar: 'الجلسة C', de: 'Session C' }, exercises: [
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
    name: { ar: 'مهارات نخبوية', de: 'Skills Focus' },
    freq: { ar: '4×/أسبوع', de: '4×/Woche' },
    desc: { ar: 'تركيز على المهارات المتقدمة والثبات', de: 'Fokus auf fortgeschrittene Skills & Holds' },
    emoji: '🏆',
    color: '#f97316',
    days: [
      { name: { ar: 'دفع متقدم', de: 'Advanced Push' }, exercises: [
        { key: 'handstand', name: 'Freestanding HS', sets: 5, reps: 20 },
        { key: 'planche', name: 'Tuck Planche', sets: 4, reps: 10 },
        { key: 'pushUp', name: 'HSPU Neg.', sets: 3, reps: 5 },
      ]},
      { name: { ar: 'سحب متقدم', de: 'Advanced Pull' }, exercises: [
        { key: 'frontLever', name: 'Front Lever', sets: 5, reps: 10 },
        { key: 'backLever', name: 'Back Lever', sets: 4, reps: 10 },
        { key: 'pullUp', name: 'Weighted Pull', sets: 3, reps: 5 },
      ]},
      { name: { ar: 'ديناميكي', de: 'Dynamic' }, exercises: [
        { key: 'muscleUp', name: 'Muscle-ups', sets: 5, reps: 3 },
        { key: 'dip', name: 'Korean Dips', sets: 3, reps: 6 },
        { key: 'lSit', name: 'V-sit', sets: 4, reps: 12 },
      ]},
      { name: { ar: 'توازن', de: 'Balance' }, exercises: [
        { key: 'handstand', name: 'HS Walk', sets: 4, reps: 10 },
        { key: 'planche', name: 'Straddle Pl.', sets: 4, reps: 8 },
        { key: 'squat', name: 'Shrimp Squat', sets: 3, reps: 6 },
      ]},
    ],
  },
];

/* ─────────────── Translations ─────────────── */

const T = {
  title: { ar: 'كاليستنيكس', de: 'Calisthenics' },
  hero: { ar: 'فنّ القوة بوزن الجسم', de: 'Kunst der Körpergewichtskraft' },
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
  streak: { ar: 'سلسلة أيام', de: 'Streak' },
  totalSets: { ar: 'إجمالي', de: 'Gesamt' },
  thisWeek: { ar: 'هذا الأسبوع', de: 'Diese Woche' },
  encyclopedia: { ar: 'الموسوعة الكاملة', de: 'Volle Enzyklopädie' },
  encDesc: { ar: 'تقنيات، شروط، أخطاء — لكل مهارة', de: 'Technik, Voraussetzungen, Fehler' },
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

/** Compute consecutive workout streak */
function calcStreak(logs: LogEntry[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs]
    .filter((l) => l.exercises.some((e) => e.done))
    .map((l) => l.date)
    .sort();
  if (!sorted.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (sorted.includes(iso)) {
      streak++;
    } else if (i === 0) {
      // today not done, check yesterday onwards
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/* ─────────────── HERO STATS BANNER ─────────────── */

function HeroBanner({
  streak, totalSets, weekSets, completedSkills, lang,
}: { streak: number; totalSets: number; weekSets: number; completedSkills: number; lang: 'ar' | 'de' }) {
  return (
    <motion.div
      variants={item}
      className="relative overflow-hidden rounded-2xl p-3"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.05) 50%, transparent 100%)',
        border: '1px solid hsl(var(--primary) / 0.2)',
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute -top-10 -end-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: 'hsl(var(--primary))' }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-foreground leading-tight">{T.title[lang]}</h2>
            <p className="text-[9px] text-muted-foreground">{T.hero[lang]}</p>
          </div>
        </div>

        {/* 4-stat grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <StatBubble icon={Flame} label={T.streak[lang]} value={`${streak}d`} color="#f97316" />
          <StatBubble icon={TrendingUp} label={T.thisWeek[lang]} value={`${weekSets}`} color="#10b981" />
          <StatBubble icon={BarChart3} label={T.totalSets[lang]} value={`${totalSets}`} color="#3b82f6" />
          <StatBubble icon={Award} label={T.complete[lang]} value={`${completedSkills}`} color="#a855f7" />
        </div>
      </div>
    </motion.div>
  );
}

function StatBubble({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-card/60 border border-border/30 p-1.5 text-center">
      <div className="flex items-center justify-center gap-0.5 mb-0.5">
        <Icon className="w-2.5 h-2.5" style={{ color }} />
      </div>
      <div className="text-[12px] font-bold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="text-[8px] text-muted-foreground uppercase tracking-tight mt-0.5">
        {label}
      </div>
    </div>
  );
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
        <h3 className="text-[12px] font-semibold text-foreground">{T.skills[lang]}</h3>
        <span className="text-[9px] text-muted-foreground ms-auto">
          {Object.values(progress).reduce((a, b) => a + b + 1, 0)}/
          {SKILLS.reduce((a, s) => a + s.levels.length, 0)}
        </span>
      </div>
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pe-0.5 scrollbar-thin">
        {SKILLS.map((skill, idx) => {
          const currentLvl = progress[skill.key] ?? 0;
          const completion = ((currentLvl + 1) / skill.levels.length) * 100;

          return (
            <motion.div
              key={skill.key}
              variants={item}
              className="rounded-xl p-2 bg-card/60 border border-border/30 hover:border-border/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {/* Emoji icon */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `${skill.color}20`, border: `1px solid ${skill.color}40` }}
                >
                  {skill.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-foreground truncate">
                      {skill.name[lang]}
                    </span>
                    <span
                      className="text-[8.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: `${skill.color}15`, color: skill.color }}
                    >
                      {currentLvl + 1}/{skill.levels.length}
                    </span>
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate mt-0.5">
                    → {skill.levels[currentLvl]}
                  </div>
                </div>
              </div>

              {/* Progression dots */}
              <div className="flex items-center gap-1" dir="ltr">
                {skill.levels.map((lvl, i) => {
                  const isReached = i <= currentLvl;
                  const isCurrent = i === currentLvl;
                  return (
                    <button
                      key={i}
                      onClick={() => onLevelChange(skill.key, i)}
                      title={lvl}
                      className="group relative flex-1"
                    >
                      <motion.div
                        className="h-2 rounded-full transition-all"
                        animate={{
                          backgroundColor: isReached ? skill.color : 'rgb(150 150 150 / 0.18)',
                          scale: isCurrent ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      />
                      {isCurrent && (
                        <motion.div
                          layoutId={`current-${skill.key}`}
                          className="absolute inset-0 rounded-full ring-2 ring-offset-1 ring-offset-background"
                          style={{ '--tw-ring-color': skill.color } as any}
                        />
                      )}
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[8px] bg-popover border border-border rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                        {lvl}
                      </span>
                    </button>
                  );
                })}
              </div>
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
        <h3 className="text-[12px] font-semibold text-foreground">{T.plans[lang]}</h3>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {PLANS.map((plan) => {
          const isActive = activePlan === plan.key;
          return (
            <motion.button
              key={plan.key}
              variants={item}
              onClick={() => onSelectPlan(plan.key)}
              className="relative rounded-xl p-2 border transition-all text-start overflow-hidden"
              style={{
                borderColor: isActive ? plan.color : 'hsl(var(--border) / 0.4)',
                backgroundColor: isActive ? `${plan.color}10` : 'hsl(var(--card) / 0.6)',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-plan-glow"
                  className="absolute -top-6 -end-6 w-16 h-16 rounded-full opacity-20 blur-xl pointer-events-none"
                  style={{ backgroundColor: plan.color }}
                />
              )}
              <div className="relative">
                <div className="text-base mb-1">{plan.emoji}</div>
                <div className="text-[10px] font-semibold text-foreground line-clamp-1 mb-0.5">
                  {plan.name[lang]}
                </div>
                <div className="text-[8.5px] text-muted-foreground">{plan.freq[lang]}</div>
                {isActive ? (
                  <div
                    className="mt-1.5 text-[8px] font-bold flex items-center gap-1"
                    style={{ color: plan.color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: plan.color }} />
                    {T.active[lang]}
                  </div>
                ) : (
                  <div className="mt-1.5 text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
                    <Play className="w-2 h-2" />
                    {T.start[lang]}
                  </div>
                )}
              </div>
            </motion.button>
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
      <motion.section variants={item} className="rounded-xl p-3 bg-card/40 border border-dashed border-border/40 text-center">
        <Dumbbell className="w-5 h-5 text-muted-foreground/50 mx-auto mb-1" />
        <p className="text-[10px] text-muted-foreground/80">{T.noPlan[lang]}</p>
      </motion.section>
    );
  }

  const dayIdx = getDayOfWeek() % plan.days.length;
  const day = plan.days[dayIdx];
  const dayExercises = day.exercises;
  const exercises = log?.exercises ?? dayExercises.map((e) => ({
    key: e.name, sets: e.sets, reps: e.reps, done: false,
  }));
  const doneCount = exercises.filter((e) => e.done).length;
  const allDone = doneCount === exercises.length;
  const progress = exercises.length ? doneCount / exercises.length : 0;

  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Dumbbell className="w-3 h-3" style={{ color: plan.color }} />
        <h3 className="text-[12px] font-semibold text-foreground">{T.today[lang]}</h3>
        <span className="text-[9px] text-muted-foreground truncate">— {day.name[lang]}</span>
        <div className="ms-auto flex items-center gap-1">
          {allDone && (
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}>
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            </motion.div>
          )}
          <span className="text-[9px] font-semibold text-foreground">
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

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: plan.color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>

      <div className="space-y-1">
        {exercises.map((ex, idx) => (
          <motion.div
            key={idx}
            variants={item}
            className="flex items-center gap-2 p-2 rounded-lg border transition-all"
            style={{
              borderColor: ex.done ? `${plan.color}40` : 'hsl(var(--border) / 0.3)',
              backgroundColor: ex.done ? `${plan.color}08` : 'hsl(var(--card) / 0.6)',
            }}
          >
            <button
              onClick={() => onToggle(idx)}
              className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all"
              style={{
                borderColor: ex.done ? plan.color : 'hsl(var(--border))',
                backgroundColor: ex.done ? plan.color : 'transparent',
              }}
            >
              {ex.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <span
                className={`text-[11px] font-medium block truncate ${
                  ex.done ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {dayExercises[idx]?.name ?? ex.key}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-bold tabular-nums" style={{ color: plan.color }}>
                {ex.sets}×{ex.reps}
              </span>
              <Timer className="w-2.5 h-2.5 text-muted-foreground/50" />
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-[8.5px] text-muted-foreground/60 text-center pt-0.5">{T.rest[lang]}</p>
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
  const totalSets = weekData.reduce((a, b) => a + b, 0);
  const todayIdx = 6;

  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="w-3 h-3 text-primary" />
        <h3 className="text-[12px] font-semibold text-foreground">{T.volume[lang]}</h3>
        <span className="text-[9px] text-muted-foreground ms-auto font-semibold">
          {totalSets} {T.setsLabel[lang]}
        </span>
      </div>
      <div className="rounded-xl p-2.5 bg-card/60 border border-border/30">
        <div className="flex items-end gap-1 h-[60px]" dir="ltr">
          {weekData.map((sets, i) => {
            const pct = sets / maxSets;
            const isToday = i === todayIdx;
            return (
              <motion.div
                key={i}
                variants={item}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full relative flex items-end justify-center h-[40px]">
                  <motion.div
                    className="w-full max-w-[18px] rounded-t-md transition-all"
                    style={{
                      backgroundColor: sets > 0
                        ? (isToday ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)')
                        : 'hsl(var(--muted))',
                      opacity: sets > 0 ? 0.7 + pct * 0.3 : 0.3,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct * 100, 6)}%` }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                  />
                  {sets > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.3 }}
                      className="absolute -top-3 text-[7.5px] font-bold tabular-nums text-foreground/70"
                    >
                      {sets}
                    </motion.span>
                  )}
                </div>
                <span
                  className={`text-[7.5px] font-medium tabular-nums ${
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {weekDays[i]}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

/* ─────────────── Main Component ─────────────── */

interface CalisthenicsTabProps {
  onJump?: (tabKey: string) => void;
}

export default function CalisthenicsTab({ onJump }: CalisthenicsTabProps = {}) {
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

  const stats = useMemo(() => {
    const completedSkills = Object.values(progress).filter((v) => v >= 3).length;
    const totalSets = logs.reduce((sum, l) => sum + l.exercises.reduce((s, e) => s + (e.done ? e.sets : 0), 0), 0);
    const today = new Date();
    let weekSets = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const entry = logs.find((l) => l.date === iso);
      if (entry) {
        weekSets += entry.exercises.reduce((s, e) => s + (e.done ? e.sets : 0), 0);
      }
    }
    return { completedSkills, totalSets, weekSets, streak: calcStreak(logs) };
  }, [progress, logs]);

  /* ── Persistence ── */
  useEffect(() => { localStorage.setItem(LS_PROGRESS, JSON.stringify(progress)); }, [progress]);
  useEffect(() => { localStorage.setItem(LS_PLAN, JSON.stringify(activePlan)); }, [activePlan]);
  useEffect(() => { localStorage.setItem(LS_LOG, JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem(LS_STREAK, String(stats.streak)); }, [stats.streak]);

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
      if (!currentPlan) return prev;
      const dayIdx = getDayOfWeek() % currentPlan.days.length;
      const exercises = currentPlan.days[dayIdx].exercises.map((e, i) => ({
        key: e.name, sets: e.sets, reps: e.reps, done: i === idx,
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
    <motion.div className="space-y-2.5" variants={stagger} initial="hidden" animate="show">
      {/* Hero Banner */}
      <HeroBanner
        streak={stats.streak}
        totalSets={stats.totalSets}
        weekSets={stats.weekSets}
        completedSkills={stats.completedSkills}
        lang={lang}
      />

      {/* Encyclopedia link */}
      <motion.button
        type="button"
        onClick={() => onJump?.('encyclopedia')}
        variants={item}
        className="w-full text-start rounded-xl p-2.5 border border-border/40 bg-gradient-to-r from-violet-500/5 to-purple-500/5 flex items-center gap-2.5 active:scale-[0.99] transition-transform hover:border-violet-500/40"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-foreground">{T.encyclopedia[lang]}</div>
          <div className="text-[9px] text-muted-foreground line-clamp-1">{T.encDesc[lang]}</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </motion.button>

      {/* Today's Workout */}
      <TodayWorkout
        plan={currentPlan}
        log={todayLog}
        onToggle={handleToggleExercise}
        onReset={handleResetToday}
        lang={lang}
      />

      {/* Training Plans */}
      <TrainingPlans activePlan={activePlan} onSelectPlan={handleSelectPlan} lang={lang} />

      {/* Skill Progressions */}
      <SkillProgressions progress={progress} onLevelChange={handleLevelChange} lang={lang} />

      {/* Weekly Volume */}
      <WeeklyVolume logs={logs} lang={lang} />
    </motion.div>
  );
}
