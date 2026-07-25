/**
 * Static hold timer for calisthenics (planche / front lever / handstand).
 *
 * Shows a target hold time and counts up. Hits a "personal best" marker
 * when the user's hold beats their stored PR. Vibrates on milestones
 * (5s / 10s / target).
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

import { Pause, Play, RotateCcw, Trophy, X } from '@/lib/icons';

export interface CaliHoldTimerProps {
  open: boolean;
  onClose: () => void;
  /** Skill name shown above the timer. */
  skillName: string;
  /** Target hold time in seconds. */
  targetSec: number;
  /** Personal best in seconds (so the timer can highlight beating it). */
  personalBest?: number;
  /** Notify with the final hold time. */
  onSave: (heldSec: number) => void;
  lang: 'ar';
  /** Optional accent colour. */
  accent?: string;
}

const T = {
  target: { ar: 'الهدف', },
  pb: { ar: 'الأفضل', },
  pbBeaten: { ar: 'حطمت رقمك!', },
  targetReached: { ar: 'الهدف ✓', },
  start: { ar: 'ابدأ', },
  pause: { ar: 'إيقاف', },
  reset: { ar: 'إعادة', },
  save: { ar: 'حفظ', },
};

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  if ('vibrate' in navigator) navigator.vibrate?.(pattern);
}

export default function CaliHoldTimer({
  open, onClose, skillName, targetSec, personalBest, onSave, lang, accent = '#0ea5e9',
}: CaliHoldTimerProps) {
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  const milestonesHitRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!open) {
      setSec(0);
      setRunning(false);
      milestonesHitRef.current.clear();
    }
  }, [open]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Milestone vibrations
  useEffect(() => {
    if (sec === 0) return;
    const milestones = [5, 10, targetSec, personalBest ?? -1].filter((m) => m > 0);
    for (const m of milestones) {
      if (sec === m && !milestonesHitRef.current.has(m)) {
        milestonesHitRef.current.add(m);
        if (m === personalBest) vibrate([200, 80, 200, 80, 400]);
        else if (m === targetSec) vibrate([300, 100, 300]);
        else vibrate(80);
      }
    }
  }, [sec, targetSec, personalBest]);

  const targetReached = targetSec > 0 && sec >= targetSec;
  const pbBeaten = personalBest != null && sec > personalBest;
  const pct = targetSec > 0 ? Math.min(100, (sec / targetSec) * 100) : 0;
  const radius = 110;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - pct / 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-sheet bg-black/85 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm px-6"
          >
            <button
              onClick={onClose}
              className="absolute top-0 end-0 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center"
              aria-label="close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pt-12">
              <p className="text-white/60 text-[0.75rem] uppercase tracking-[0.2em] font-semibold mb-1">
                {skillName}
              </p>
              <p className="text-white/40 text-[0.625rem] mb-3 tabular-nums" dir="ltr">
                {T.target[lang]}: {targetSec}s {personalBest != null && ` · ${T.pb[lang]}: ${personalBest}s`}
              </p>

              <div className="relative inline-flex items-center justify-center">
                <svg width={260} height={260} className="-rotate-90">
                  <circle cx={130} cy={130} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
                  <motion.circle
                    cx={130} cy={130} r={radius}
                    fill="none"
                    stroke={pbBeaten ? '#fbbf24' : targetReached ? '#10b981' : accent}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[4.25rem] font-bold tabular-nums text-white leading-none" dir="ltr">{sec}</div>
                  <div className="text-[0.75rem] text-white/50 mt-1">sec</div>
                </div>
              </div>

              <AnimatePresence>
                {pbBeaten && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    className="mt-3 inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[0.6875rem] font-bold"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    {T.pbBeaten[lang]}
                  </motion.div>
                )}
                {!pbBeaten && targetReached && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-[0.6875rem] font-bold"
                  >
                    {T.targetReached[lang]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                onClick={() => { setSec(0); setRunning(false); milestonesHitRef.current.clear(); }}
                className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95"
                aria-label={T.reset[lang]}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRunning((r) => !r)}
                className="w-16 h-16 rounded-full text-white flex items-center justify-center active:scale-95"
                style={{ background: accent }}
                aria-label={running ? T.pause[lang] : T.start[lang]}
              >
                {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ms-1" />}
              </button>
              <button
                onClick={() => { onSave(sec); onClose(); }}
                disabled={sec === 0}
                className="px-4 h-11 rounded-full bg-emerald-500 text-white text-[0.75rem] font-bold disabled:opacity-50"
              >
                {T.save[lang]}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
