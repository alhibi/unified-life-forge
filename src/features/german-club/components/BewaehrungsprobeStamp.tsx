import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import {
  REDUCED_SURGE_VARIANTS,
  STAMP_SURGE_VARIANTS,
  WASH_SURGE_VARIANTS,
} from '../lib/surgeAnimation';
import { GERMAN_CLUB_TOKENS, SURGE_TOKENS } from '../types';

interface BewaehrungsprobeStampProps {
  status: 'passed' | 'failed' | null;
  shelfTitleAr?: string;
  onComplete?: () => void;
}

export const BewaehrungsprobeStamp: React.FC<BewaehrungsprobeStampProps> = ({
  status,
  shelfTitleAr,
  onComplete,
}) => {
  const [stage, setSetage] = useState<'idle' | 'anticipate' | 'payoff' | 'settle'>('idle');
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (status !== 'passed') {
      setSetage('idle');
      return;
    }

    if (shouldReduceMotion) {
      setSetage('settle');
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Sequence choreography
    setSetage('anticipate');

    // 120ms anticipation compress
    const timer1 = setTimeout(() => {
      setSetage('payoff');
    }, 120);

    // 470ms payoff overshoot
    const timer2 = setTimeout(() => {
      setSetage('settle');
    }, 590);

    // 1200ms total settle recession back to calm baseline
    const timer3 = setTimeout(() => {
      onComplete?.();
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [status, shouldReduceMotion, onComplete]);

  if (!status || status !== 'passed') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 overflow-hidden">
        {/* Single bold surge wash sweep behind the stamp */}
        {!shouldReduceMotion ? (
          <motion.div
            key="surge-wash"
            variants={WASH_SURGE_VARIANTS}
            initial="initial"
            animate="sweep"
            className="absolute inset-0 z-0 opacity-90"
            style={{
              background: `linear-gradient(135deg, ${GERMAN_CLUB_TOKENS.prussian} 0%, ${SURGE_TOKENS.surgeCobalt} 40%, ${SURGE_TOKENS.surgeEmberHot} 100%)`,
            }}
          />
        ) : (
          <motion.div
            key="surge-wash-reduced"
            variants={REDUCED_SURGE_VARIANTS}
            initial="initial"
            animate="animate"
            className="absolute inset-0 z-0 bg-[#17324D]/90"
          />
        )}

        {/* Passport Stamp Seal Container */}
        <motion.div
          key="surge-stamp-seal"
          variants={STAMP_SURGE_VARIANTS}
          initial="initial"
          animate={stage}
          className="relative z-10 flex flex-col items-center justify-center p-8 rounded-3xl border-4 shadow-2xl text-center backdrop-blur-md"
          style={{
            backgroundColor: `${GERMAN_CLUB_TOKENS.paper}`,
            borderColor: SURGE_TOKENS.surgeEmberHot,
            color: GERMAN_CLUB_TOKENS.ink,
            boxShadow: `0 20px 50px -10px ${SURGE_TOKENS.surgeCobalt}66, inset 0 0 20px ${SURGE_TOKENS.surgeEmberHot}33`,
          }}
        >
          {/* Outer Passport Stamp Double Ring Design */}
          <div className="border-2 border-dashed border-[#17324D]/40 p-6 rounded-2xl flex flex-col items-center gap-2">
            <span className="text-[0.625rem] font-mono font-black tracking-widest uppercase text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-800/30">
              BEWÄHRUNGSPROBE — BESTANDEN
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17324D] tracking-tight mt-1">
              اختبار الإتقان — اجتياز بنجاح
            </h2>

            {shelfTitleAr && (
              <p className="text-xs font-semibold text-stone-600 mt-0.5">
                الرف: {shelfTitleAr}
              </p>

            )}

            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-mono text-[#17324D] font-bold">
              <span>ختم التوثيق الرسمي</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
