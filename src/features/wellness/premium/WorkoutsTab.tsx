/**
 * WorkoutsTab — premium edition.
 *
 * Five sub-sections:
 *   1. Train      — readiness, active session, last-session card, programs hint
 *   2. Programs   — full library, start/swap programs
 *   3. Records    — strength standards + 1RM trends per lift
 *   4. Volume     — per-muscle weekly volume vs MEV/MAV/MRV
 *   5. History    — past sessions list
 *
 * Composition is intentional — each sub-tab is a self-contained component
 * exported from `training/components/`. This file is a thin orchestrator
 * that owns the active-session draft and triggers the PR detector.
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import {
  Activity, BarChart3, Calendar, Dumbbell, Flame, History,
  Library, Play, TrendingUp, Trophy,
} from '@/lib/icons';

import { EXERCISES } from '../exerciseCatalog';
import { activityStreak,sessionStats, topExercises } from '../training/analyticsEngine';
import DeloadAdvisor from '../training/components/DeloadAdvisor';
import FrequencyHeatmap from '../training/components/FrequencyHeatmap';
import HistoryList from '../training/components/HistoryList';
import OneRmTrendChart from '../training/components/OneRmTrendChart';
import PlateCalculator from '../training/components/PlateCalculator';
import PrCelebration from '../training/components/PrCelebration';
import ProgramsLibraryView from '../training/components/ProgramsLibraryView';
// UI components
import SessionPlayer from '../training/components/SessionPlayer';
import StrengthStandardsView from '../training/components/StrengthStandardsView';
import VolumeBars, { VolumeZoneLegend } from '../training/components/VolumeBars';
import { detectPrs } from '../training/prDetector';
import { programByKey } from '../training/programsLibrary';
import {
  bestE1RMFromSets,
  sessionVolumeKg,
} from '../training/progressionEngine';
import type { PersonalRecord } from '../training/types';
import type { AthleteProfile, UUID, WorkoutSession } from '../wellnessDb';

interface Props {
  workouts: WorkoutSession[];
  profile: AthleteProfile | null;
  onSave: (s: Omit<WorkoutSession, 'id'> & { id?: UUID }) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
}

type Section = 'train' | 'programs' | 'records' | 'volume' | 'history';

const T = {
  startSession: { ar: 'ابدأ تمريناً', },
  resumeSession: { ar: 'متابعة', },
  emptyState: { ar: 'لا تمارين بعد — ابدأ أول جلسة لتبدأ القصة.', },
  emptyAfter: { ar: 'سترى تطورك ينمو هنا تلقائياً.', },
  lastSession: { ar: 'آخر تمرين', },
  topPrs: { ar: 'أعلى 1RM', },
  topMuscles: { ar: 'الأكثر تدريباً', },
  totalSessions: { ar: 'جلسات', },
  streak: { ar: 'سلسلة', },
  weekVolume: { ar: 'حجم 7 أيام', },
  noProfile: { ar: 'سجّل وزنك في الملف لتفعيل المعايير.', },
  pickLift: { ar: 'اختر تمريناً لعرض التقدم', },
  noPrChart: { ar: 'لا أرقام كافية لعرض الرسم البياني.', },
  // Sub-tabs
  train: { ar: 'تدريب', },
  programs: { ar: 'برامج', },
  records: { ar: 'الأرقام', },
  volume: { ar: 'الحجم', },
  history: { ar: 'السجل', },
  toolPlate: { ar: 'حاسبة الأوزان', },
  weekTotal: { ar: 'حمل الأسبوع', },
  sessionsTotal: { ar: 'إجمالي الجلسات', },
  longestStreak: { ar: 'أطول سلسلة', },
  programActive: { ar: 'برنامجك الحالي', },
  changeProgram: { ar: 'تغيير', },
};

const SECTIONS: { key: Section; ar: string; icon: typeof Activity }[] = [
  { key: 'train',    ar: 'تدريب',  icon: Dumbbell },
  { key: 'programs', ar: 'برامج', icon: Library },
  { key: 'records',  ar: 'الأرقام',   icon: Trophy },
  { key: 'volume',   ar: 'الحجم',   icon: BarChart3 },
  { key: 'history',  ar: 'السجل',   icon: History },
];

import { getKV, setKV } from '@/features/wellness/wellnessDb';
const ACTIVE_PROG_KEY = 'training:activeProgram';
const STD_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'] as const;

export default function WorkoutsTab({ workouts, profile, onSave, onDelete }: Props) {
  const { language } = useApp();
  const lang = language as 'ar';
  const [section, setSection] = useState<Section>('train');
  const [showPlayer, setShowPlayer] = useState(false);
  const [recentPrs, setRecentPrs] = useState<PersonalRecord[] | null>(null);
  const [pickedLift, setPickedLift] = useState<string>('squat');
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
  const [showPlate, setShowPlate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const k = await getKV<string | null>(ACTIVE_PROG_KEY, null);
      if (!cancelled) setActiveProgram(k);
    })();
    return () => { cancelled = true; };
  }, []);

  const lastByExercise = useMemo(() => {
    const map = new Map<string, { weightKg?: number; reps?: number }>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (map.has(ex.exerciseKey)) continue;
        const last = ex.sets[ex.sets.length - 1];
        if (last) map.set(ex.exerciseKey, { weightKg: last.weightKg, reps: last.reps });
      }
    }
    return map;
  }, [workouts]);

  const recentExercises = useMemo(() => {
    const arr: string[] = [];
    const seen = new Set<string>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (seen.has(ex.exerciseKey)) continue;
        seen.add(ex.exerciseKey);
        arr.push(ex.exerciseKey);
        if (arr.length >= 8) break;
      }
      if (arr.length >= 8) break;
    }
    return arr;
  }, [workouts]);

  const stats = useMemo(() => sessionStats(workouts, 7), [workouts]);
  const allTime = useMemo(() => sessionStats(workouts), [workouts]);
  const streak = useMemo(() => activityStreak(workouts), [workouts]);

  const activeProgramDef = useMemo(() => activeProgram ? programByKey(activeProgram) : null, [activeProgram]);

  const handleFinish = async (s: Omit<WorkoutSession, 'id'> & { id?: UUID }) => {
    await onSave(s);
    // Detect PRs against existing history
    const prs = detectPrs(
      { ...s, id: s.id ?? 'new' } as WorkoutSession,
      workouts,
    );
    setShowPlayer(false);
    if (prs.length > 0) setRecentPrs(prs);
  };

  const handlePickProgram = (key: string) => {
    setActiveProgram(key);
    void setKV(ACTIVE_PROG_KEY, key);
    setSection('train');
  };

  const liftOptions = useMemo(() => {
    const opts = STD_LIFTS.filter((k) => workouts.some((w) => w.exercises.some((e) => e.exerciseKey === k)));
    if (opts.length === 0) return STD_LIFTS.slice(0, 1);
    return opts;
  }, [workouts]);

  return (
    <div className="space-y-3">
      {/* Hero stats — always visible */}
      <HeroStats
        totalSessions={allTime.count}
        currentStreak={streak.current}
        longestStreak={streak.longest}
        weekVolume={stats.totalVolumeKg}
        lang={lang}
      />

      {/* Sub-nav */}
      <nav className="flex gap-0.5 p-1 bg-card/80 border border-border/40 rounded-xl overflow-x-auto scrollbar-none" dir="ltr">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              aria-pressed={active}
              className={`relative shrink-0 flex items-center gap-1 px-2.5 h-8 rounded-lg text-[0.6875rem] font-semibold transition-colors ${
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="workouts-pill"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1">
                <Icon className="w-3.5 h-3.5" />
                {s.ar}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {section === 'train' && (
            <>
              <DeloadAdvisor workouts={workouts} lang={lang} />

              {showPlayer ? (
                <SessionPlayer
                  onCancel={() => setShowPlayer(false)}
                  onFinish={handleFinish}
                  recentExercises={recentExercises}
                  lastByExercise={lastByExercise}
                  lang={lang}
                />
              ) : (
                <>
                  <button
                    onClick={() => setShowPlayer(true)}
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                  >
                    <Play className="w-5 h-5" /> {T.startSession[lang]}
                  </button>

                  {activeProgramDef && (
                    <div className="rounded-2xl bg-primary/8 border border-primary/30 p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.625rem] uppercase tracking-wider text-primary font-semibold">{T.programActive[lang]}</p>
                        <p className="text-[0.8125rem] font-bold text-foreground truncate">{activeProgramDef.name[lang]}</p>
                      </div>
                      <button
                        onClick={() => setSection('programs')}
                        className="text-[0.6875rem] font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10"
                      >
                        {T.changeProgram[lang]}
                      </button>
                    </div>
                  )}

                  {workouts.length === 0 ? (
                    <EmptyState lang={lang} />
                  ) : (
                    <LastSessionCard session={workouts[0]} lang={lang} />
                  )}

                  {/* Plate calculator quick tool */}
                  <button
                    onClick={() => setShowPlate(true)}
                    className="w-full text-start rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3 active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.75rem] font-bold text-foreground">{T.toolPlate[lang]}</p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {'احسب الأقراص لكل وزن — مرئي.'}
                      </p>
                    </div>
                  </button>

                  {workouts.length > 0 && (
                    <TopExercisesCard workouts={workouts} lang={lang} />
                  )}
                </>
              )}
            </>
          )}

          {section === 'programs' && (
            <ProgramsLibraryView
              activeKey={activeProgram}
              onPickProgram={handlePickProgram}
              lang={lang}
            />
          )}

          {section === 'records' && (
            <>
              <StrengthStandardsView workouts={workouts} profile={profile} lang={lang} />
              {workouts.length > 0 && (
                <>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                    {liftOptions.map((k) => (
                      <button
                        key={k}
                        onClick={() => setPickedLift(k)}
                        className={`shrink-0 text-[0.6875rem] font-semibold px-3 py-1.5 rounded-full border ${
                          pickedLift === k
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border/40'
                        }`}
                      >
                        {EXERCISES[k]?.label[lang] ?? k}
                      </button>
                    ))}
                  </div>
                  <OneRmTrendChart workouts={workouts} exerciseKey={pickedLift} lang={lang} />
                </>
              )}
            </>
          )}

          {section === 'volume' && (
            <>
              <VolumeBars workouts={workouts} windowDays={7} lang={lang} />
              <div className="bg-card border border-border/40 rounded-xl p-3 space-y-1.5">
                <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                  {'مفتاح المناطق'}
                </p>
                <VolumeZoneLegend lang={lang} />
              </div>
              <FrequencyHeatmap workouts={workouts} lang={lang} />
            </>
          )}

          {section === 'history' && (
            <HistoryList workouts={workouts} onDelete={onDelete} lang={lang} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* PR celebration */}
      <PrCelebration
        records={recentPrs ?? []}
        open={recentPrs != null}
        onClose={() => setRecentPrs(null)}
        lang={lang}
      />

      {/* Plate calculator sheet */}
      <AnimatePresence>
        {showPlate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer bg-black/60 flex items-end sm:items-center justify-center"
            onClick={() => setShowPlate(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3 }}
              className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-6 space-y-3">
                <h3 className="text-base font-bold text-foreground">{T.toolPlate[lang]}</h3>
                <PlateCalculator initialKg={60} lang={lang} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function HeroStats({
  totalSessions, currentStreak, longestStreak, weekVolume, lang: _lang,
}: { totalSessions: number; currentStreak: number; longestStreak: number; weekVolume: number; lang: 'ar' }) {
  return (
    <motion.div
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl p-3 border border-primary/20"
    >
      <div className="grid grid-cols-4 gap-1.5">
        <BubbleStat icon={<Calendar className="w-3 h-3" />} value={`${totalSessions}`} label={'جلسات'} color="#3b82f6" />
        <BubbleStat icon={<Flame className="w-3 h-3" />} value={`${currentStreak}d`} label={'سلسلة'} color="#f97316" />
        <BubbleStat icon={<Trophy className="w-3 h-3" />} value={`${longestStreak}d`} label={'أطول'} color="#fbbf24" />
        <BubbleStat icon={<TrendingUp className="w-3 h-3" />} value={`${Math.round(weekVolume / 1000)}t`} label={'الأسبوع'} color="#10b981" />
      </div>
    </motion.div>
  );
}

function BubbleStat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-card/60 border border-border/30 p-1.5 text-center">
      <div className="flex items-center justify-center" style={{ color }}>
        {icon}
      </div>
      <div className="text-[0.875rem] font-bold leading-none mt-0.5 tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[0.625rem] text-muted-foreground uppercase tracking-tight mt-0.5">{label}</div>
    </div>
  );
}

function EmptyState({ lang }: { lang: 'ar' }) {
  return (
    <div className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center space-y-2">
      <Dumbbell className="w-7 h-7 text-muted-foreground mx-auto" />
      <p className="text-[0.75rem] font-semibold text-foreground">{T.emptyState[lang]}</p>
      <p className="text-[0.625rem] text-muted-foreground">{T.emptyAfter[lang]}</p>
    </div>
  );
}

function LastSessionCard({ session, lang }: { session: WorkoutSession; lang: 'ar' }) {
  const vol = sessionVolumeKg(session);
  const dur = session.endedAt ? session.endedAt - session.startedAt : 0;
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.lastSession[lang]}</p>
        <span className="text-[0.625rem] text-muted-foreground tabular-nums" dir="ltr">{session.date}</span>
      </div>
      {session.title && <p className="text-[0.8125rem] font-bold text-foreground">{session.title}</p>}
      <div className="flex items-center gap-2 text-[0.625rem] tabular-nums text-muted-foreground" dir="ltr">
        {vol > 0 && <span>{Math.round(vol)} kg</span>}
        <span>·</span>
        <span>{Math.round(dur / 60_000)} min</span>
        <span>·</span>
        <span>{session.exercises.length} ex</span>
        {session.sessionRpe && <><span>·</span><span>RPE {session.sessionRpe}</span></>}
      </div>
    </div>
  );
}

function TopExercisesCard({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' }) {
  const top = useMemo(() => topExercises(workouts, 5), [workouts]);
  if (top.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-3 space-y-2">
      <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
        <Activity className="w-3 h-3" /> {T.topMuscles[lang]}
      </p>
      <div className="space-y-1.5">
        {top.map((t) => {
          const def = EXERCISES[t.exerciseKey];
          const e1rm = bestE1RMFromSets(workouts.flatMap((w) => w.exercises.find((e) => e.exerciseKey === t.exerciseKey)?.sets ?? []));
          return (
            <div key={t.exerciseKey} className="flex items-baseline justify-between gap-2">
              <span className="text-[0.6875rem] font-semibold text-foreground truncate">{def?.label[lang] ?? t.exerciseKey}</span>
              <span className="text-[0.625rem] tabular-nums text-muted-foreground" dir="ltr">
                {t.sessions} sessions
                {e1rm != null && <span className="ms-1.5 text-amber-500">· {e1rm} kg</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
