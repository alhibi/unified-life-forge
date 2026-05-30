/**
 * ExerciseDetailSheet — bottom sheet showing exercise info with MuscleBodyMap.
 *
 * Displays:
 *  • Exercise name (bilingual)
 *  • Target muscles (chips: primary highlighted, secondary lighter)
 *  • MuscleBodyMap (front + back SVG visualization)
 *  • Skill difficulty level bar (B-I-A-E gradient)
 *  • Equipment type
 *  • Default sets/reps recommendation
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, Target, Zap } from '@/lib/icons';
import MuscleBodyMap from '@/components/MuscleBodyMap';
import {
  MUSCLE_LABELS, EQUIPMENT_LABELS, TYPE_LABELS,
  type Exercise, type MuscleGroup, type Lang,
} from '@/features/wellness/exerciseCatalog';

interface Props {
  exercise: Exercise | null;
  open: boolean;
  onClose: () => void;
  lang: Lang;
}

const DIFFICULTY_MAP: Record<string, number> = {
  // Approximate difficulty 1-10 based on exercise type/equipment
  bodyweight: 3,
  band: 2,
  barbell: 5,
  dumbbell: 4,
  machine: 2,
  kettlebell: 4,
  cable: 3,
  cardio_machine: 2,
  none: 1,
};

// Difficulty labels
const DIFF_LABELS = {
  ar: ['مبتدئ', 'متوسط', 'متقدم', 'نخبوي'],
  de: ['Beginner', 'Intermediate', 'Advanced', 'Elite'],
};

function getDifficulty(ex: Exercise): number {
  // Heuristic based on exercise properties
  let diff = DIFFICULTY_MAP[ex.equipment] ?? 3;
  if (ex.isBigLift) diff = Math.max(diff, 5);
  if (ex.type === 'plyo') diff = Math.max(diff, 4);
  // Bodyweight statics/advanced
  if (ex.equipment === 'bodyweight') {
    if (ex.key.includes('one_arm') || ex.key.includes('planche') || ex.key.includes('lever')
      || ex.key.includes('iron_cross') || ex.key.includes('maltese') || ex.key.includes('flag')
      || ex.key.includes('manna') || ex.key.includes('v_sit')) {
      diff = 9;
    } else if (ex.key.includes('muscle_up') || ex.key.includes('hspu') || ex.key.includes('pistol')
      || ex.key.includes('nordic') || ex.key.includes('dragon') || ex.key.includes('archer')
      || ex.key.includes('korean') || ex.key.includes('impossible')) {
      diff = 7;
    } else if (ex.key.includes('ring') || ex.key.includes('handstand') || ex.key.includes('l_sit')) {
      diff = 6;
    } else if (ex.key.includes('diamond') || ex.key.includes('pike') || ex.key.includes('decline')
      || ex.key.includes('dip') || ex.key.includes('pull_up') || ex.key.includes('chin_up')) {
      diff = 4;
    }
  }
  return Math.min(10, Math.max(1, diff));
}

export default function ExerciseDetailSheet({ exercise, open, onClose, lang }: Props) {
  if (!exercise) return null;

  const difficulty = getDifficulty(exercise);
  const diffIndex = difficulty <= 3 ? 0 : difficulty <= 5 ? 1 : difficulty <= 7 ? 2 : 3;
  const diffLabel = DIFF_LABELS[lang][diffIndex];
  const diffPercent = (difficulty / 10) * 100;

  const primaryMuscles: MuscleGroup[] = [exercise.primary];
  const secondaryMuscles: MuscleGroup[] = exercise.secondary ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-bold text-foreground leading-tight">
                    {exercise.label[lang]}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {TYPE_LABELS[exercise.type][lang]}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {EQUIPMENT_LABELS[exercise.equipment][lang]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Targeted Muscles Title */}
              <div>
                <h4 className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  {lang === 'ar' ? 'العضلات المستهدفة' : 'Zielmuskeln'}
                </h4>

                {/* Muscle chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {primaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                      style={{
                        backgroundColor: 'rgba(236, 72, 153, 0.12)',
                        borderColor: 'rgba(236, 72, 153, 0.3)',
                        color: '#ec4899',
                      }}
                    >
                      {MUSCLE_LABELS[m][lang]}
                    </span>
                  ))}
                  {secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        backgroundColor: 'rgba(249, 168, 212, 0.1)',
                        borderColor: 'rgba(249, 168, 212, 0.25)',
                        color: '#f9a8d4',
                      }}
                    >
                      {MUSCLE_LABELS[m][lang]}
                    </span>
                  ))}
                </div>

                {/* Body Map */}
                <div className="flex justify-center rounded-2xl bg-card/80 border border-border/30 p-3">
                  <MuscleBodyMap
                    primary={primaryMuscles}
                    secondary={secondaryMuscles}
                    size="md"
                    showLegend={true}
                    lang={lang}
                  />
                </div>
              </div>

              {/* Skill Difficulty Level */}
              <div className="rounded-2xl bg-card/80 border border-border/30 p-3 space-y-2">
                <h4 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {lang === 'ar' ? 'مستوى الصعوبة' : 'Schwierigkeitsgrad'}
                </h4>

                <div className="text-[11px] font-bold text-foreground">{diffLabel}</div>

                {/* Difficulty bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8px] text-muted-foreground font-semibold">
                    <span>B</span>
                    <span>I</span>
                    <span>A</span>
                    <span>E</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden flex gap-0.5">
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(diffPercent, 25)}%`,
                        backgroundColor: diffPercent >= 5 ? '#ec4899' : '#374151',
                        opacity: diffPercent >= 5 ? 0.9 : 0.2,
                      }}
                    />
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: '25%',
                        backgroundColor: diffPercent >= 30 ? '#f472b6' : '#374151',
                        opacity: diffPercent >= 30 ? 0.7 : 0.2,
                      }}
                    />
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: '25%',
                        backgroundColor: diffPercent >= 55 ? '#a78bfa' : '#374151',
                        opacity: diffPercent >= 55 ? 0.6 : 0.2,
                      }}
                    />
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: '25%',
                        backgroundColor: diffPercent >= 80 ? '#6b7280' : '#374151',
                        opacity: diffPercent >= 80 ? 0.5 : 0.2,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommended Sets/Reps */}
              {exercise.defaultSets && exercise.defaultReps && (
                <div className="rounded-2xl bg-card/80 border border-border/30 p-3">
                  <h4 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                    {lang === 'ar' ? 'التوصية' : 'Empfehlung'}
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-[18px] font-bold text-primary tabular-nums">
                        {exercise.defaultSets}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {lang === 'ar' ? 'مجموعات' : 'Sätze'}
                      </div>
                    </div>
                    <span className="text-muted-foreground/40 text-[14px]">×</span>
                    <div className="text-center">
                      <div className="text-[18px] font-bold text-primary tabular-nums">
                        {exercise.defaultReps}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {lang === 'ar' ? 'تكرار' : 'Wdh'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
