/**
 * Calisthenics placement test flow — multi-step questionnaire.
 *
 * One question per "page", swipeable forward/backward. The result screen
 * places the user on each skill ladder and recommends suitable programs.
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useState } from 'react';

import { Award, Check, ChevronLeft, ChevronRight, X } from '@/lib/icons';

import {
  ASSESSMENT_QUESTIONS,
  computeAssessment,
  TIER_RECOMMENDATION,
} from '../caliAssessment';
import { CALI_EXP_LABELS,caliProgramByKey } from '../caliPrograms';
import { skillByKey } from '../caliSkillTree';
import type { AssessmentResult } from '../types';

export interface CaliAssessmentFlowProps {
  open: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult) => void;
  lang: 'ar';
}

const T = {
  title: { ar: 'تقييم المستوى', },
  subtitle: { ar: 'لتحديد نقطة الانطلاق المناسبة', },
  next: { ar: 'التالي', },
  prev: { ar: 'السابق', },
  finish: { ar: 'إنهاء', },
  question: { ar: 'سؤال', },
  of: { ar: 'من', },
  resultTitle: { ar: 'نتيجتك', },
  yourTier: { ar: 'مستواك', },
  recommendedPrograms: { ar: 'برامج مقترحة', },
  applyResults: { ar: 'تطبيق النتيجة', },
  yourSkills: { ar: 'تحديد بدء كل مهارة', },
  step: { ar: 'خطوة', },
  noStarted: { ar: 'لم تبدأ', },
};

export default function CaliAssessmentFlow({ open, onClose, onComplete, lang }: CaliAssessmentFlowProps) {
  const [step, setStep] = useState(0); // -1 = result
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  const total = ASSESSMENT_QUESTIONS.length;
  const q = ASSESSMENT_QUESTIONS[step];

  const handleNext = () => {
    if (step < total - 1) setStep(step + 1);
    else setShowResult(true);
  };
  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };
  const handleSelect = (idx: number) => {
    setAnswers({ ...answers, [q.key]: idx });
  };

  const result = showResult ? computeAssessment(answers) : null;

  const handleApply = () => {
    if (result) {
      onComplete(result);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-drawer bg-black/60 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3 }}
            className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-body font-bold text-foreground">{T.title[lang]}</h2>
                  <p className="text-micro text-muted-foreground">{T.subtitle[lang]}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!showResult ? (
                <>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <p className="text-micro text-muted-foreground tabular-nums" dir="ltr">
                      {T.question[lang]} {step + 1} {T.of[lang]} {total}
                    </p>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((step + 1) / total) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <h3 className="text-meta font-bold text-foreground leading-snug">{q.question[lang]}</h3>

                    <div className="space-y-1.5">
                      {q.options.map((opt, i) => {
                        const selected = answers[q.key] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelect(i)}
                            className={`w-full text-start p-3 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                              selected
                                ? 'bg-primary/15 border-primary text-foreground'
                                : 'bg-card border-border/40 text-foreground'
                            }`}
                          >
                            <span className="text-mini leading-snug">{opt.label[lang]}</span>
                            {selected && (
                              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Nav buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrev}
                      disabled={step === 0}
                      className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-meta font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> {T.prev[lang]}
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={answers[q.key] == null}
                      className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-meta font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1"
                    >
                      {step === total - 1 ? T.finish[lang] : T.next[lang]} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                /* Result */
                <ResultPanel result={result!} onApply={handleApply} lang={lang} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultPanel({ result, onApply, lang }: { result: AssessmentResult; onApply: () => void; lang: 'ar' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-2">
          <Award className="w-7 h-7 text-primary" />
        </div>
        <p className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">
          {T.yourTier[lang]}
        </p>
        <p className="text-title font-bold text-foreground">
          {CALI_EXP_LABELS[result.tier][lang]}
        </p>
      </div>

      <p className="text-mini text-foreground/85 leading-relaxed bg-card border border-border/40 rounded-xl p-3">
        {TIER_RECOMMENDATION[result.tier][lang]}
      </p>

      {/* Suggested programs */}
      <div className="space-y-1.5">
        <p className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">
          {T.recommendedPrograms[lang]}
        </p>
        {result.suggestedPrograms.slice(0, 3).map((key) => {
          const p = caliProgramByKey(key);
          if (!p) return null;
          return (
            <div key={key} className="rounded-xl bg-card border border-border/40 p-3">
              <p className="text-mini font-bold text-foreground">{p.name[lang]}</p>
              <p className="text-micro text-muted-foreground line-clamp-2 mt-0.5">{p.description[lang]}</p>
            </div>
          );
        })}
      </div>

      {/* Per-skill placement */}
      <div className="space-y-1.5">
        <p className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">
          {T.yourSkills[lang]}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(result.bySkill).map(([key, idx]) => {
            const skill = skillByKey(key);
            if (!skill) return null;
            const stepName = idx >= 0 ? skill.steps[Math.min(idx, skill.steps.length - 1)]?.name[lang] : T.noStarted[lang];
            return (
              <div key={key} className="bg-card border border-border/40 rounded-lg p-2">
                <p className="text-micro text-muted-foreground">{skill.name[lang]}</p>
                <p className="text-micro font-bold text-foreground line-clamp-1">{stepName}</p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-meta font-bold inline-flex items-center justify-center gap-1 active:scale-[0.98]"
      >
        {T.applyResults[lang]} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
