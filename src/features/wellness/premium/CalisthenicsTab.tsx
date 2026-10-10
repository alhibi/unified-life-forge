/**
 * CalisthenicsTab — premium edition.
 *
 * Sub-sections:
 *   1. Hub        — hero stats, today's session preview, hold timer launcher
 *   2. Skills     — skill tree → progression ladder → knowledge sheet
 *   3. Programs   — calisthenics programs library
 *   4. Assess     — placement test
 *   5. Records    — best holds and step milestones
 *
 * Persists per-skill progress in localStorage. Workout completions log to
 * IndexedDB via the same `WorkoutSession` schema (mapped via skillKey).
 *
 * System-unification pass: sub-nav, hero and records went through
 * <AppCard>, hub rows are canonical <AppList>/<AppRow>, CTAs are <Button>,
 * the empty states are <StateView>, raw hexes became data tokens and the
 * per-button press scaling was dropped (the global press rule owns it).
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';

import { AppCard, AppList, AppRow, IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { useApp } from '@/contexts/AppContext';
import {
  Activity, Award, BookOpen, ChevronLeft, Flame, Library, Play,
  Target, Timer, TrendingUp, Trophy,
} from '@/lib/icons';

import { caliProgramByKey } from '../training/caliPrograms';
// Data
import { CATEGORY_LABEL, skillByKey, SKILLS } from '../training/caliSkillTree';
import { masteredSkills, totalCaliXP, weeksToNextStep } from '../training/caliVolumeMath';
import CaliAssessmentFlow from '../training/components/CaliAssessmentFlow';
import CaliHoldTimer from '../training/components/CaliHoldTimer';
import CaliKnowledgeSheet from '../training/components/CaliKnowledgeSheet';
import CaliProgramView from '../training/components/CaliProgramView';
import CaliProgressionLadder from '../training/components/CaliProgressionLadder';
// Components
import CaliSkillTreeView from '../training/components/CaliSkillTreeView';
import type { AssessmentResult } from '../training/types';

interface Props {
  /** Optional cross-tab navigation callback (parent prop, currently unused). */
   
  onJump?: (key: string) => void;
}

type Section = 'hub' | 'skills' | 'programs' | 'assess' | 'records';

const T = {
  title: { ar: 'كاليستنيكس', },
  tagline: { ar: 'فن التحكم بالجسم', },
  hub: { ar: 'الواجهة', },
  skills: { ar: 'المهارات', },
  programs: { ar: 'برامج', },
  assess: { ar: 'تقييم', },
  records: { ar: 'الأرقام', },
  totalXp: { ar: 'إجمالي XP', },
  mastered: { ar: 'مكتمل', },
  inProgress: { ar: 'قيد التطور', },
  streak: { ar: 'سلسلة', },
  startTimer: { ar: 'بدء هولد', },
  startAssessment: { ar: 'ابدأ التقييم', },
  noProgress: { ar: 'لم تبدأ بعد. خذ التقييم لتحديد نقطة الانطلاق.', },
  pickSkill: { ar: 'اختر مهارة لرؤية السلم', },
  back: { ar: 'رجوع', },
  activeProgram: { ar: 'البرنامج النشط', },
  noActiveProgram: { ar: 'لا برنامج مختار', },
  bestHolds: { ar: 'أفضل الهولد', },
  noHolds: { ar: 'لا أرقام بعد. سجّل أول هولد.', },
  exploreSkills: { ar: 'استكشف المهارات', },
  weeksToNext: { ar: 'أسابيع للتالي', },
  todayRecommendation: { ar: 'توصية اليوم', },
  practiceCurrent: { ar: 'دَرِّب خطوتك الحالية', },
  changeProgram: { ar: 'تغيير', },
};

const SECTIONS: { key: Section; ar: string; icon: typeof Activity }[] = [
  { key: 'hub',      ar: 'الواجهة',      icon: Activity },
  { key: 'skills',   ar: 'المهارات',   icon: Award },
  { key: 'programs', ar: 'برامج', icon: Library },
  { key: 'assess',   ar: 'تقييم',    icon: Target },
  { key: 'records',  ar: 'أرقام',   icon: Trophy },
];

import { getKV, setKV } from '@/features/wellness/wellnessDb';

const KV_PROGRESS = 'cali:progress:v2';
const KV_HOLD_PRS = 'cali:holdPRs';
const KV_ACTIVE_PROG = 'cali:activeProgram';

export default function CalisthenicsTab(_props: Props) {
  const { language } = useApp();
  const lang = language as 'ar';

  const [section, setSection] = useState<Section>('hub');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [pickedSkill, setPickedSkill] = useState<string | null>(null);
  const [knowledgeSkill, setKnowledgeSkill] = useState<string | null>(null);
  const [holdSkill, setHoldSkill] = useState<{ key: string; stepIdx: number } | null>(null);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [holdPRs, setHoldPRs] = useState<Record<string, number>>({});
  const [activeProgram, setActiveProgram] = useState<string | null>(null);

  const hydratedRef = React.useRef(false);

  // Hydrate persisted state from Cloud (per-user).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, h, ap] = await Promise.all([
        getKV<Record<string, number>>(KV_PROGRESS, {}),
        getKV<Record<string, number>>(KV_HOLD_PRS, {}),
        getKV<string | null>(KV_ACTIVE_PROG, null),
      ]);
      if (cancelled) return;
      setProgress(p);
      setHoldPRs(h);
      setActiveProgram(ap);
      hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist to Cloud (skip until initial hydrate to avoid clobbering).
  useEffect(() => {
    if (!hydratedRef.current) return;
    void setKV(KV_PROGRESS, progress);
  }, [progress]);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void setKV(KV_HOLD_PRS, holdPRs);
  }, [holdPRs]);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void setKV(KV_ACTIVE_PROG, activeProgram);
  }, [activeProgram]);

  const xp = useMemo(() => totalCaliXP(progress), [progress]);
  const masteredCount = useMemo(() => masteredSkills(progress).length, [progress]);
  const inProgressCount = useMemo(() => {
    return Object.entries(progress).filter(([k, v]) => {
      const s = skillByKey(k);
      return s && v >= 0 && v < s.steps.length - 1;
    }).length;
  }, [progress]);

  const activeProgramDef = useMemo(() => activeProgram ? caliProgramByKey(activeProgram) : null, [activeProgram]);

  const handleStepClear = (skillKey: string, stepIdx: number) => {
    setProgress((p) => ({ ...p, [skillKey]: stepIdx }));
  };

  const handleHoldSave = (skillKey: string, stepKey: string, sec: number) => {
    const id = `${skillKey}:${stepKey}`;
    if (sec > (holdPRs[id] ?? 0)) {
      setHoldPRs({ ...holdPRs, [id]: sec });
    }
    // Auto-advance step if user matches/exceeds the step's holdSec target
    const s = skillByKey(skillKey);
    if (!s) return;
    const stepIdx = s.steps.findIndex((st) => st.key === stepKey);
    if (stepIdx < 0) return;
    const step = s.steps[stepIdx];
    if (step.target.holdSec && sec >= step.target.holdSec && (progress[skillKey] ?? -1) < stepIdx) {
      setProgress((p) => ({ ...p, [skillKey]: stepIdx }));
    }
  };

  const handleAssessmentComplete = (r: AssessmentResult) => {
    const next = { ...progress };
    for (const [k, idx] of Object.entries(r.bySkill)) {
      next[k] = Math.max(next[k] ?? -1, idx);
    }
    setProgress(next);
    if (r.suggestedPrograms[0]) setActiveProgram(r.suggestedPrograms[0]);
    setSection('skills');
  };

  /* ───────────── Suggested next step ───────────── */
  const suggestedSkill = useMemo(() => {
    // Pick the in-progress skill the user is closest to advancing
    let best: { key: string; stepIdx: number; weeks: number } | null = null;
    for (const s of SKILLS) {
      const idx = progress[s.key] ?? -1;
      if (idx < 0 || idx >= s.steps.length - 1) continue;
      const weeks = weeksToNextStep(s, idx);
      if (!best || weeks < best.weeks) best = { key: s.key, stepIdx: idx + 1, weeks };
    }
    return best;
  }, [progress]);

  return (
    <div className="space-y-3">
      {/* Hero */}
      <CaliHero
        xp={xp}
        mastered={masteredCount}
        inProgress={inProgressCount}
        lang={lang}
      />

      {/* Sub-nav */}
      <nav aria-label="أقسام الكاليستنيكس">
        <AppCard className="flex gap-0.5 p-1 overflow-x-auto scrollbar-none" dir="ltr">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => { setSection(s.key); setPickedSkill(null); }}
                aria-pressed={active}
                className={`relative shrink-0 flex items-center gap-1 px-2.5 h-8 rounded-lg text-micro font-semibold transition-colors ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="cali-pill"
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
        </AppCard>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {section === 'hub' && (
            <>
              {/* No progress → assessment CTA */}
              {Object.keys(progress).length === 0 ? (
                <AppCard className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <IconChip>
                      <Target className="h-5 w-5" aria-hidden />
                    </IconChip>
                    <div>
                      <p className="text-mini font-bold text-foreground">{T.startAssessment[lang]}</p>
                      <p className="text-micro text-muted-foreground">{T.noProgress[lang]}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setAssessmentOpen(true)}
                  >
                    <Play className="w-4 h-4" aria-hidden /> {T.startAssessment[lang]}
                  </Button>
                </AppCard>
              ) : (
                <>
                  {/* Today's recommendation */}
                  {suggestedSkill && (
                    <SuggestedNext
                      skillKey={suggestedSkill.key}
                      stepIdx={suggestedSkill.stepIdx - 1}
                      weeksToNext={suggestedSkill.weeks}
                      onTrain={(sk, st) => setHoldSkill({ key: sk, stepIdx: st })}
                      onView={(sk) => { setPickedSkill(sk); setSection('skills'); }}
                      lang={lang}
                    />
                  )}

                  {/* Active program card */}
                  {activeProgramDef ? (
                    <AppCard className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-micro uppercase tracking-wider text-primary font-semibold">
                          {T.activeProgram[lang]}
                        </p>
                        <p className="text-mini font-bold text-foreground truncate">
                          {activeProgramDef.name[lang]}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSection('programs')}
                      >
                        {T.changeProgram[lang]}
                      </Button>
                    </AppCard>
                  ) : (
                    <AppList>
                      <AppRow
                        onClick={() => setSection('programs')}
                        chevron
                        leading={
                          <IconChip tone="plain" aria-hidden>
                            <Library className="h-5 w-5" />
                          </IconChip>
                        }
                        title={T.noActiveProgram[lang]}
                        subtitle={T.activeProgram[lang]}
                      />
                    </AppList>
                  )}

                  {/* Browse skills CTA */}
                  <AppList>
                    <AppRow
                      onClick={() => setSection('skills')}
                      chevron
                      leading={
                        <IconChip tone="plain" aria-hidden>
                          <Award className="h-5 w-5" />
                        </IconChip>
                      }
                      title={T.exploreSkills[lang]}
                      subtitle={`${SKILLS.length} مهارة من المبتدئ للنخبة`}
                    />
                  </AppList>
                </>
              )}
            </>
          )}

          {section === 'skills' && (
            <>
              {pickedSkill ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setPickedSkill(null)}
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden /> {T.back[lang]}
                  </Button>
                  <CaliProgressionLadder
                    skillKey={pickedSkill}
                    clearedStep={progress[pickedSkill] ?? -1}
                    onStepClear={(idx) => handleStepClear(pickedSkill, idx)}
                    onShowKnowledge={() => setKnowledgeSkill(pickedSkill)}
                    lang={lang}
                  />
                  {/* Hold timer button for static skills */}
                  {(() => {
                    const s = skillByKey(pickedSkill);
                    const idx = (progress[pickedSkill] ?? -1) + 1;
                    const step = s?.steps[Math.min(idx, (s?.steps.length ?? 1) - 1)];
                    if (s && step?.isHold) {
                      return (
                        <Button
                          className="w-full"
                          onClick={() => setHoldSkill({ key: pickedSkill, stepIdx: Math.max(0, Math.min((s.steps.length - 1), idx)) })}
                        >
                          <Timer className="w-4 h-4" aria-hidden /> {T.startTimer[lang]}: {step.name[lang]}
                        </Button>
                      );
                    }
                    return null;
                  })()}
                </>
              ) : (
                <CaliSkillTreeView
                  progress={progress}
                  onPickSkill={(k) => setPickedSkill(k)}
                  lang={lang}
                />
              )}
            </>
          )}

          {section === 'programs' && (
            <CaliProgramView
              activeKey={activeProgram}
              onPickProgram={(k) => { setActiveProgram(k); setSection('hub'); }}
              lang={lang}
            />
          )}

          {section === 'assess' && (
            <AppCard className="p-4 space-y-3 text-center">
              <IconChip size="xl" className="mx-auto">
                <Target className="h-6 w-6" aria-hidden />
              </IconChip>
              <h3 className="text-meta font-bold text-foreground">{T.startAssessment[lang]}</h3>
              <p className="text-mini text-muted-foreground">
                {'12 سؤال لتحديد مستواك في كل مهارة وتوصية برنامج مناسب.'}
              </p>
              <Button
                className="w-full"
                onClick={() => setAssessmentOpen(true)}
              >
                <Play className="w-4 h-4" aria-hidden /> {T.startAssessment[lang]}
              </Button>
            </AppCard>
          )}

          {section === 'records' && <RecordsView holdPRs={holdPRs} progress={progress} lang={lang} />}
        </motion.div>
      </AnimatePresence>

      {/* Sheets */}
      <CaliKnowledgeSheet
        open={knowledgeSkill != null}
        skillKey={knowledgeSkill}
        onClose={() => setKnowledgeSkill(null)}
        lang={lang}
      />

      {holdSkill && (() => {
        const s = skillByKey(holdSkill.key);
        const step = s?.steps[holdSkill.stepIdx];
        if (!s || !step) return null;
        const id = `${s.key}:${step.key}`;
        return (
          <CaliHoldTimer
            open={true}
            skillName={`${s.name[lang]} — ${step.name[lang]}`}
            targetSec={step.target.holdSec ?? 30}
            personalBest={holdPRs[id]}
            onSave={(sec) => handleHoldSave(s.key, step.key, sec)}
            onClose={() => setHoldSkill(null)}
            accent={s.color}
            lang={lang}
          />
        );
      })()}

      <CaliAssessmentFlow
        open={assessmentOpen}
        onClose={() => setAssessmentOpen(false)}
        onComplete={handleAssessmentComplete}
        lang={lang}
      />
    </div>
  );
}

/* ──────────────── Hero ──────────────── */

function CaliHero({ xp, mastered, inProgress, lang }: { xp: number; mastered: number; inProgress: number; lang: 'ar' }) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 6 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <AppCard className="p-3">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
 <Flame className="w-4 h-4 text-primary" aria-hidden />
 </div>
 <div>
 <h2 className="text-meta font-bold text-foreground leading-tight">{T.title[lang]}</h2>
 <p className="text-micro text-muted-foreground">{T.tagline[lang]}</p>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-1.5">
 <Bubble icon={<TrendingUp className="w-3 h-3" />} value={`${xp}`} label={T.totalXp[lang]} color="hsl(var(--data-1))" />
 <Bubble icon={<Award className="w-3 h-3" />} value={`${mastered}`} label={T.mastered[lang]} color="hsl(var(--data-3))" />
 <Bubble icon={<Activity className="w-3 h-3" />} value={`${inProgress}`} label={T.inProgress[lang]} color="hsl(var(--data-4))" />
 </div>
 </AppCard>
 </motion.div>
 );
}

function Bubble({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
 return (
 <AppCard flat className="p-1.5 text-center">
 <div className="flex items-center justify-center" style={{ color }}>{icon}</div>
 <div className="text-meta font-bold leading-none mt-0.5 tabular-nums" style={{ color }}>{value}</div>
 <div className="text-micro text-muted-foreground uppercase tracking-tight mt-0.5">{label}</div>
 </AppCard>
 );
}

/* ──────────────── Suggested Next ──────────────── */

function SuggestedNext({
 skillKey, stepIdx, weeksToNext, onTrain, onView, lang,
}: { skillKey: string; stepIdx: number; weeksToNext: number; onTrain: (sk: string, idx: number) => void; onView: (sk: string) => void; lang: 'ar' }) {
  const skill = skillByKey(skillKey);
  if (!skill) return null;
  const cur = skill.steps[stepIdx];
  const next = skill.steps[stepIdx + 1];
  return (
    <motion.div
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <AppCard className="p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-display">{skill.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-micro uppercase tracking-wider font-semibold" style={{ color: skill.color }}>
            {T.todayRecommendation[lang]}
          </p>
          <p className="text-meta font-bold text-foreground leading-tight">{skill.name[lang]}</p>
          <p className="text-micro text-muted-foreground tabular-nums">
            {CATEGORY_LABEL[skill.category][lang]} · {cur ? cur.name[lang] : '—'}
          </p>
        </div>
      </div>
      {next && (
        <AppCard flat className="p-2">
          <p className="text-micro uppercase tracking-wider text-muted-foreground-subtle font-semibold">
            {T.weeksToNext[lang]}
          </p>
          <p className="text-micro font-semibold text-foreground">
            {next.name[lang]} <span className="text-muted-foreground">· ~{weeksToNext} {'أسابيع'}</span>
          </p>
        </AppCard>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onView(skill.key)}
        >
          <BookOpen className="w-3 h-3" aria-hidden /> {'اعرض السلم'}
        </Button>
        {cur?.isHold && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onTrain(skill.key, stepIdx)}
          >
            <Timer className="w-3 h-3" aria-hidden /> {T.startTimer[lang]}
          </Button>
        )}
      </div>
      </AppCard>
    </motion.div>
  );
}

/* ──────────────── Records view ──────────────── */

function RecordsView({ holdPRs, progress, lang }: { holdPRs: Record<string, number>; progress: Record<string, number>; lang: 'ar' }) {
  const masteredArr = useMemo(() => masteredSkills(progress), [progress]);

  const holdEntries = useMemo(() => {
    return Object.entries(holdPRs)
      .map(([id, sec]) => {
        const [skillKey, stepKey] = id.split(':');
        const s = skillByKey(skillKey);
        if (!s) return null;
        const step = s.steps.find((st) => st.key === stepKey);
        if (!step) return null;
        return { id, skill: s, step, sec };
      })
      .filter(Boolean) as { id: string; skill: typeof SKILLS[number]; step: typeof SKILLS[number]['steps'][number]; sec: number }[];
  }, [holdPRs]);

  return (
    <div className="space-y-3">
      {/* Mastered skills */}
      {masteredArr.length > 0 && (
        <AppCard className="p-3 space-y-2">
          <p className="text-micro uppercase tracking-wider text-warning font-semibold inline-flex items-center gap-1">
            <Trophy className="w-3 h-3" aria-hidden /> {T.mastered[lang]}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {masteredArr.map((s) => (
              <div key={s.key} className="bg-warning/10 rounded-lg p-1.5 text-center">
                <span className="text-lead">{s.emoji}</span>
                <p className="text-micro font-bold text-foreground line-clamp-1">{s.name[lang]}</p>
              </div>
            ))}
          </div>
        </AppCard>
      )}

      {/* Best holds */}
      <AppCard className="p-3 space-y-2">
        <p className="text-micro uppercase tracking-wider text-muted-foreground-subtle font-semibold inline-flex items-center gap-1">
          <Timer className="w-3 h-3" aria-hidden /> {T.bestHolds[lang]}
        </p>
        {holdEntries.length === 0 ? (
          <StateView
            kind="empty"
            compact
            title={T.noHolds[lang]}
            body="افتح أي مهارة ثابتة وابدأ هولد — سيُسجّل أفضل رقم هنا تلقائياً."
          />
        ) : (
          <div className="space-y-1.5">
            {holdEntries.sort((a, b) => b.sec - a.sec).map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-micro font-bold text-foreground truncate">
                    <span className="me-1">{h.skill.emoji}</span>
                    {h.skill.name[lang]} — {h.step.name[lang]}
                  </p>
                </div>
                <span className="text-meta font-bold tabular-nums" style={{ color: h.skill.color }}>
                  {h.sec}s
                </span>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
