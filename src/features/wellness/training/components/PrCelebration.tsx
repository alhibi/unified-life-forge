/**
 * Mid-session PR celebration overlay.
 *
 * When `detectPrs` returns at least one record after a finished session,
 * show this modal with confetti + the list of PRs hit. Animates beautifully.
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Trophy, X } from '@/lib/icons';

import { type Exercise,resolveExercise } from '../../exerciseCatalog';
import type { PersonalRecord } from '../types';

export interface PrCelebrationProps {
  records: PersonalRecord[];
  open: boolean;
  onClose: () => void;
  lang: 'ar';
}

const T = {
  newPr: { ar: 'رقم قياسي جديد!', },
  multipleNew: { ar: 'أرقام قياسية جديدة!', },
  niceWork: { ar: 'عمل رائع — استمر.', },
  close: { ar: 'متابعة', },
  unit: {
    kg: { ar: 'كغ', },
    reps: { ar: 'تكرار', },
    sec: { ar: 'ث', },
    kg_x_reps: { ar: 'كغ×تكرار', },
  },
  kind: {
    max_weight: { ar: 'أعلى وزن', },
    max_reps: { ar: 'أعلى تكرارات', },
    max_e1rm: { ar: 'أفضل 1RM مقدّر', },
    max_volume: { ar: 'أعلى حجم', },
    max_hold: { ar: 'أطول هولد', },
  },
};

export default function PrCelebration({ records, open, onClose, lang }: PrCelebrationProps) {
  // Auto-vibrate on open
  useEffect(() => {
    if (!open || typeof navigator === 'undefined') return;
    if ('vibrate' in navigator) navigator.vibrate?.([180, 90, 180, 90, 360]);
  }, [open]);

  const isMultiple = records.length > 1;

  return (
    <AnimatePresence>
      {open && records.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-sheet bg-background/80 flex items-center justify-center px-4"
          onClick={onClose}
        >
          {/* Confetti */}
          <Confetti />

          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm app-card overflow-hidden p-0"
          >
            <button
              onClick={onClose}
              className="absolute top-3 end-3 w-8 h-8 rounded-full bg-background/15 text-primary-foreground flex items-center justify-center"
              aria-label="close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-7 pb-5 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
                className="inline-flex w-16 h-16 rounded-full bg-primary-foreground items-center justify-center mb-3 "
              >
                <Trophy className="w-9 h-9 text-signal" />
              </motion.div>
              <h2 className="text-title font-bold text-signal leading-tight">
                {isMultiple ? T.multipleNew[lang] : T.newPr[lang]}
              </h2>
              <p className="text-mini text-signal/80 mt-1">{T.niceWork[lang]}</p>
            </div>

            <div className="px-4 pt-4 pb-5 space-y-2">
              {records.slice(0, 4).map((r, i) => {
                const ex = resolveExercise(r.exerciseKey) as Exercise | { isCustom: true; label: { ar: string; } };
                const label = 'isCustom' in ex && ex.isCustom ? ex.label[lang] : (ex as Exercise).label[lang];
                return (
                  <motion.div
                    key={`${r.exerciseKey}-${r.kind}-${i}`}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    className="bg-signal border border-signal rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-mini font-bold text-foreground truncate">{label}</p>
                      <p className="text-micro text-muted-foreground mt-0.5">{T.kind[r.kind][lang]}</p>
                    </div>
                    <div className="text-end shrink-0" dir="ltr">
                      <p className="text-body font-bold tabular-nums text-signal">
                        {r.value}
                        <span className="text-micro text-signal ms-0.5">
                          {T.unit[r.unit][lang]}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {records.length > 4 && (
                <p className="text-micro text-center text-muted-foreground">
                  +{records.length - 4}
                </p>
              )}
              <Button
                onClick={onClose}
                className="w-full bg-warning text-warning-foreground hover:bg-warning/90 mt-2"
              >
                {T.close[lang]}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────── Confetti ─────────── */

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  const colors = ['hsl(var(--data-1))', 'hsl(var(--data-2))', 'hsl(var(--data-3))', 'hsl(var(--data-4))', 'hsl(var(--data-5))', 'hsl(var(--data-6))'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((i) => {
        const x = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 2.5 + Math.random() * 1.5;
        const size = 6 + Math.floor(Math.random() * 6);
        const color = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            initial={{ y: -40, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', opacity: [1, 1, 0], rotate: 720 }}
            transition={{ duration: dur, delay, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: 0,
              width: size,
              height: size * 1.4,
              background: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}
