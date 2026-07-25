/**
 * Skill tree — grid of cards, one per skill, with lock icons for unmet
 * prerequisites and progress dots showing the user's current step.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, ChevronRight, Lock } from '@/lib/icons';
import { CATEGORY_LABEL, isUnlocked, SKILLS, skillsByCategory } from '../caliSkillTree';
import type { SkillDef } from '../types';

export interface CaliSkillTreeViewProps {
  /** progress: skillKey → step idx achieved (0-based). */
  progress: Record<string, number>;
  onPickSkill: (skillKey: string) => void;
  lang: 'ar';
  className?: string;
}

const T = {
  title: { ar: 'شجرة المهارات', },
  subtitle: { ar: '14 مهارة من المبتدئ للنخبة', },
  lockedHint: { ar: 'يحتاج إنجاز مهارات أخرى أولاً', },
  step: { ar: 'الخطوة', },
  notStarted: { ar: 'لم تبدأ', },
  mastered: { ar: 'مكتمل', },
};

const CATEGORIES: SkillDef['category'][] = ['push', 'pull', 'legs', 'core', 'static', 'dynamic'];

export default function CaliSkillTreeView({
  progress,
  onPickSkill,
  lang,
  className = '',
}: CaliSkillTreeViewProps) {
  const [filter, setFilter] = useState<SkillDef['category'] | 'all'>('all');

  const skills = useMemo(() => {
    if (filter === 'all') return SKILLS;
    return skillsByCategory(filter);
  }, [filter]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          {T.title[lang]}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{T.subtitle[lang]}</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border ${
            filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border/40'
          }`}
        >
          {'الكل'}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border ${
              filter === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border/40'
            }`}
          >
            {CATEGORY_LABEL[c][lang]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {skills.map((s, i) => (
          <SkillCard
            key={s.key}
            skill={s}
            progressStep={progress[s.key] ?? -1}
            unlocked={isUnlocked(s.key, progress)}
            onClick={() => onPickSkill(s.key)}
            lang={lang}
            delay={i * 0.03}
          />
        ))}
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  progressStep,
  unlocked,
  onClick,
  lang,
  delay,
}: {
  skill: SkillDef;
  progressStep: number;
  unlocked: boolean;
  onClick: () => void;
  lang: 'ar';
  delay: number;
}) {
  const totalSteps = skill.steps.length;
  const stepIdx = Math.max(-1, Math.min(totalSteps - 1, progressStep));
  const isMastered = stepIdx === totalSteps - 1;
  const pct = totalSteps > 0 ? ((stepIdx + 1) / totalSteps) * 100 : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      disabled={!unlocked}
      className={`relative text-start rounded-2xl p-3 border overflow-hidden transition-transform active:scale-[0.98] ${
        unlocked ? 'bg-card border-border/40' : 'bg-muted/30 border-border/30'
      }`}
    >
      {/* Accent halo */}
      <div
        aria-hidden
        className="absolute -top-8 -end-8 w-20 h-20 rounded-full pointer-events-none opacity-20"
        style={{ background: skill.color, filter: 'blur(20px)' }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-1.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${skill.color}25` }}
          >
            {skill.emoji}
          </div>
          {!unlocked ? (
            <Lock className="w-3 h-3 text-muted-foreground/60" />
          ) : isMastered ? (
            <Award className="w-3.5 h-3.5 text-amber-500" />
          ) : null}
        </div>

        <p className="text-[12px] font-bold text-foreground leading-tight line-clamp-2">{skill.name[lang]}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{CATEGORY_LABEL[skill.category][lang]}</p>

        {/* Difficulty dots */}
        <div className="flex gap-0.5 mt-1.5">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full"
              style={{
                background: i < skill.difficulty ? skill.color : 'rgba(127,127,127,0.2)',
              }}
            />
          ))}
        </div>

        {/* Progress */}
        {unlocked && (
          <div className="mt-2 space-y-1">
            <div className="flex items-baseline justify-between text-[10px]">
              <span className="text-muted-foreground/70 tabular-nums">
                {progressStep < 0 ? T.notStarted[lang] : isMastered ? T.mastered[lang] : `${T.step[lang]} ${stepIdx + 1}/${totalSteps}`}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            </div>
            <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: skill.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: delay + 0.2 }}
              />
            </div>
          </div>
        )}

        {!unlocked && (
          <p className="text-[10px] text-muted-foreground/70 mt-2 line-clamp-2">{T.lockedHint[lang]}</p>
        )}
      </div>
    </motion.button>
  );
}
