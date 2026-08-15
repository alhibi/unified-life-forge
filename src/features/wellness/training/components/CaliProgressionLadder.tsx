/**
 * Skill ladder detail — shows all steps of one skill with cues,
 * unlock criteria, regressions. Tap a step to mark it cleared.
 */

import { motion } from 'framer-motion';
import React from 'react';

import { ArrowDown, BookOpen, Check, ChevronRight, Lock, Target } from '@/lib/icons';

import { skillByKey } from '../caliSkillTree';
import { weeksToNextStep } from '../caliVolumeMath';
import type { SkillProgressionStep } from '../types';

export interface CaliProgressionLadderProps {
  skillKey: string;
  /** Cleared step index (0-based). -1 = nothing cleared. */
  clearedStep: number;
  onStepClear: (stepIdx: number) => void;
  onShowKnowledge?: () => void;
  lang: 'ar';
  className?: string;
}

const T = {
  step: { ar: 'الخطوة', },
  unlockedAt: { ar: 'الانتقال للخطوة التالية عند', },
  cues: { ar: 'تعليمات', },
  mistakes: { ar: 'أخطاء', },
  regressions: { ar: 'اختصارات', },
  weeks: { ar: 'أسابيع', },
  knowledge: { ar: 'معرفة عميقة', },
  about: { ar: 'لماذا', },
  cleared: { ar: 'مكتمل', },
  current: { ar: 'الحالي', },
  locked: { ar: 'مغلق', },
  reps: { ar: 'تكرار', },
  sets: { ar: 'مج', },
  hold: { ar: 'هولد', },
  sec: { ar: 'ث', },
  difficulty: { ar: 'الصعوبة', },
};

export default function CaliProgressionLadder({
  skillKey,
  clearedStep,
  onStepClear,
  onShowKnowledge,
  lang,
  className = '',
}: CaliProgressionLadderProps) {
  const skill = skillByKey(skillKey);
  if (!skill) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hero */}
      <div
        className="rounded-2xl p-4 border"
        style={{
          
          borderColor: `${skill.color}40`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-display"
            style={{ background: `${skill.color}30` }}
          >
            {skill.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-body font-bold text-foreground leading-tight">{skill.name[lang]}</h2>
            <p className="text-micro text-muted-foreground mt-0.5">{skill.tagline[lang]}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold me-1">{T.difficulty[lang]}</span>
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i < skill.difficulty ? skill.color : 'rgba(127,127,127,0.2)' }}
                />
              ))}
            </div>
          </div>
          {onShowKnowledge && (
            <button
              onClick={onShowKnowledge}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
              aria-label={T.knowledge[lang]}
              style={{ color: skill.color }}
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-3 text-mini text-foreground/85 leading-relaxed">{skill.about[lang]}</p>
      </div>

      {/* Ladder */}
      <div className="space-y-1.5 relative">
        {skill.steps.map((step, i) => {
          const isCleared = clearedStep >= i;
          const isCurrent = clearedStep + 1 === i;
          const isLocked = clearedStep + 1 < i; // gated until previous cleared

          return (
            <React.Fragment key={step.key}>
              <StepCard
                step={step}
                index={i}
                isCleared={isCleared}
                isCurrent={isCurrent}
                isLocked={isLocked}
                onToggle={() => onStepClear(isCleared ? i - 1 : i)}
                accent={skill.color}
                weeksToNext={weeksToNextStep(skill, i)}
                lang={lang}
              />
              {i < skill.steps.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown
                    className="w-3.5 h-3.5"
                    style={{ color: clearedStep > i ? skill.color : 'rgba(127,127,127,0.4)' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StepCard({
  step, index, isCleared, isCurrent, isLocked, onToggle, accent, weeksToNext, lang,
}: {
  step: SkillProgressionStep;
  index: number;
  isCleared: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  onToggle: () => void;
  /** Hex/CSS colour used for the in-step badge and progress accents. */
  accent: string;
  weeksToNext: number;
  lang: 'ar';
}) {
  const targetText = step.target.holdSec
    ? `${step.target.holdSec}${T.sec[lang]} × ${step.target.sets ?? 1}${T.sets[lang]}`
    : `${step.target.sets ?? 1}×${step.target.reps ?? 1} ${T.reps[lang]}`;

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-xl border p-3 transition-colors ${
        isCleared
          ? 'bg-emerald-500/8 border-emerald-500/40'
          : isCurrent
            ? 'bg-card border-2'
            : isLocked
              ? 'bg-muted/30 border-border/30 opacity-60'
              : 'bg-card border-border/40'
      }`}
      style={isCurrent ? { borderColor: accent } : undefined}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={isLocked}
          aria-label={isCleared ? T.cleared[lang] : T.current[lang]}
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-mini font-bold tabular-nums transition-colors ${
            isCleared
              ? 'bg-emerald-500 text-white'
              : isLocked
                ? 'bg-muted text-muted-foreground/60'
                : 'bg-muted text-foreground'
          }`}
          style={isCurrent && !isLocked && !isCleared ? { borderColor: accent, borderWidth: 2 } : undefined}
        >
          {isCleared ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : index + 1}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <p className={`text-mini font-bold leading-tight ${isCleared ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {step.name[lang]}
            </p>
            {isCurrent && (
              <span
                className="text-micro font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                style={{ background: `${accent}20`, color: accent }}
              >
                {T.current[lang]}
              </span>
            )}
          </div>
          <p className="text-micro text-muted-foreground tabular-nums">
            <Target className="w-3 h-3 inline align-middle me-1" /> {targetText}
            {weeksToNext > 0 && (
              <span className="ms-2 text-muted-foreground/70">~{weeksToNext} {T.weeks[lang]}</span>
            )}
          </p>

          {step.cues.length > 0 && (
            <ul className="space-y-0.5">
              {step.cues.map((c, i) => (
                <li key={i} className="text-micro text-foreground/80 leading-relaxed">• {c[lang]}</li>
              ))}
            </ul>
          )}

          {step.unlockCriterion && (
            <p className="text-micro" style={{ color: accent }}>
              <ChevronRight className="w-3 h-3 inline align-middle" />
              {T.unlockedAt[lang]}: <span className="font-semibold">{step.unlockCriterion[lang]}</span>
            </p>
          )}

          {step.regressions && step.regressions.length > 0 && (
            <details className="text-micro text-muted-foreground">
              <summary className="cursor-pointer font-semibold">{T.regressions[lang]}</summary>
              <ul className="mt-1 space-y-0.5">
                {step.regressions.map((r, i) => (
                  <li key={i}>↘ {r[lang]}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </motion.div>
  );
}
