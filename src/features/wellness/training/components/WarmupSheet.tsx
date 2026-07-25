/**
 * Pre-lift warm-up sheet.
 *
 * Given a working weight and the lift, generate the warm-up ramp + the
 * mobility primer and show them as a scrollable checklist. Tap each set
 * to mark it done.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Flame, Target, X } from '@/lib/icons';
import { generateWarmup, mobilityFor } from '../warmupRamp';
import type { WarmupSet } from '../types';

export interface WarmupSheetProps {
  open: boolean;
  onClose: () => void;
  exerciseKey: string;
  exerciseLabel: string;
  workingKg: number;
  lang: 'ar';
  /** Notify when user finishes the warm-up. */
  onComplete?: () => void;
}

const T = {
  title: { ar: 'الإحماء', },
  mobility: { ar: 'تحضير الحركة', },
  ramp: { ar: 'بناء الوزن', },
  done: { ar: 'إنهاء', },
  sec: { ar: 'ث', },
  rest: { ar: 'راحة', },
  noWarmup: { ar: 'لا حاجة لإحماء — الوزن خفيف.', },
};

export default function WarmupSheet({
  open, onClose, exerciseKey, exerciseLabel, workingKg, lang, onComplete,
}: WarmupSheetProps) {
  const [doneSets, setDoneSets] = useState<Set<number>>(new Set());
  const [doneMob, setDoneMob] = useState<Set<number>>(new Set());

  const sets = useMemo<WarmupSet[]>(() => {
    if (workingKg < 30) return [];
    return generateWarmup(workingKg, workingKg >= 80 ? 'heavy_compound' : 'moderate_compound');
  }, [workingKg]);

  const mobility = useMemo(() => mobilityFor(exerciseKey), [exerciseKey]);

  const allDone = doneSets.size === sets.length && doneMob.size === mobility.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-drawer bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">{T.title[lang]}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {exerciseLabel} · {workingKg} kg
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobility */}
              <section className="space-y-2">
                <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  {T.mobility[lang]}
                </h4>
                <ul className="space-y-1.5">
                  {mobility.map((m, i) => {
                    const done = doneMob.has(i);
                    return (
                      <li key={i}>
                        <button
                          onClick={() => {
                            const next = new Set(doneMob);
                            if (done) next.delete(i); else next.add(i);
                            setDoneMob(next);
                          }}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${
                            done ? 'bg-success/10 border-success/40' : 'bg-card border-border/40'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            done ? 'bg-success text-success-foreground' : 'border-2 border-border'
                          }`}>
                            {done && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 text-start">
                            <p className={`text-[12px] font-semibold ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {m.name[lang]}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.cue[lang]}</p>
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground" dir="ltr">
                            {m.durationSec}{T.sec[lang]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Ramp */}
              <section className="space-y-2">
                <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  {T.ramp[lang]}
                </h4>
                {sets.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground p-3 bg-muted/30 rounded-xl text-center">
                    {T.noWarmup[lang]}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {sets.map((s, i) => {
                      const done = doneSets.has(i);
                      return (
                        <li key={i}>
                          <button
                            onClick={() => {
                              const next = new Set(doneSets);
                              if (done) next.delete(i); else next.add(i);
                              setDoneSets(next);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              done ? 'bg-success/10 border-success/40' : 'bg-card border-border/40'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                              done ? 'bg-success text-success-foreground' : 'border-2 border-border'
                            }`}>
                              {done && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-2 text-start" dir="ltr">
                              <span className="text-[12px] font-bold tabular-nums text-foreground">{s.weightKg} kg</span>
                              <span className="text-[12px] tabular-nums text-foreground/80">× {s.reps}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {Math.round(s.pct)}%
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">
                              {s.restSec}{T.sec[lang]} {T.rest[lang]}
                            </span>
                          </button>
                          {s.cue && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 ms-8">
                              {s.cue[lang]}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <button
                onClick={() => { onComplete?.(); onClose(); }}
                disabled={!allDone && sets.length > 0}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {T.done[lang]} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
