import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { BookOpen, Quote, Sparkles } from '@/lib/icons';

import { GERMAN_CLUB_TOKENS } from '../../types';
import type { DailySprichwort, DailyWort } from '../../lib/daily';

interface WortCardProps {
  wort: DailyWort;
  /** Whether to play the entrance animation. Skip on subsequent renders. */
  animate?: boolean;
}

/**
 * WortCard — a single beautiful German word for today.
 *
 * Visual: an oversized serif word with IPA + gender dot, the Arabic
 * translation, and a tiny one-line hint. No CTA. No "save" button.
 * Just a card you read and walk past.
 */
export const WortCard: React.FC<WortCardProps> = ({ wort, animate = true }) => {
  const shouldReduceMotion = useReducedMotion();

  const genderColor = wort.gender
    ? wort.gender === 'der'
      ? GERMAN_CLUB_TOKENS.derBlue
      : wort.gender === 'die'
      ? GERMAN_CLUB_TOKENS.dieRose
      : wort.gender === 'das'
      ? GERMAN_CLUB_TOKENS.dasStone
      : '#7E7259'
    : null;

  return (
    <motion.div
      initial={animate && !shouldReduceMotion ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6 group"
      style={{
        backgroundColor: '#FDFCF7',
        borderColor: `${GERMAN_CLUB_TOKENS.oak}33`,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(23,24,28,0.18)',
      }}
    >
      {/* Subtle paper texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(199, 112, 59, 0.06), transparent 60%)',
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span className="text-[0.625rem] font-mono font-bold uppercase tracking-widest text-[#17324D]">
            Wort des Tages
          </span>
        </div>

        {/* Main word — oversized */}
        <div className="flex items-baseline gap-2 mb-2 flex-wrap" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
          {genderColor && (
            <span
              className="w-2.5 h-2.5 rounded-full mt-2 shrink-0"
              style={{ backgroundColor: genderColor }}
              aria-hidden="true"
            />
          )}
          <h3
            className="font-black tracking-tight text-[#17181C]"
            style={{
              fontFamily: '"Inter", "SF Pro", system-ui, sans-serif',
              fontSize: 'clamp(1.875rem, 7vw, 2.625rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.035em',
            }}
          >
            {wort.wort}
          </h3>
          {wort.ipa && (
            <span className="text-xs sm:text-sm font-mono text-stone-500 ms-1" dir="ltr">
              [{wort.ipa}]
            </span>
          )}
        </div>

        {/* Arabic translation */}
        <p className="text-base font-semibold text-[#17181C] mb-1.5 leading-snug">{wort.arabic}</p>

        {/* Hint — the punchy line */}
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{wort.hint_ar}</p>

        {/* Footer — register tag (subtle) */}
        {wort.register !== 'neutral' && (
          <div className="mt-3 pt-3 border-t border-stone-200/70 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-stone-400" />
            <span className="text-[0.625rem] font-mono text-stone-500 uppercase tracking-wider">
              {wort.register === 'formal' && 'رسمي'}
              {wort.register === 'informal' && 'غير رسمي'}
              {wort.register === 'slang' && 'عامي'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface SprichwortCardProps {
  sprichwort: DailySprichwort;
  animate?: boolean;
}

/**
 * SprichwortCard — a German proverb with literal + real meaning.
 *
 * The magic: show the literal Arabic translation (which is usually
 * hilarious or poetic), then reveal the actual meaning.
 */
export const SprichwortCard: React.FC<SprichwortCardProps> = ({ sprichwort, animate = true }) => {
  const shouldReduceMotion = useReducedMotion();
  const [revealed, setRevealed] = React.useState(false);

  return (
    <motion.div
      initial={animate && !shouldReduceMotion ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        backgroundColor: '#FFFDF6',
        borderColor: `${GERMAN_CLUB_TOKENS.oak}33`,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(23,24,28,0.18)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Quote className="w-3.5 h-3.5 text-[#17324D]" />
        <span className="text-[0.625rem] font-mono font-bold uppercase tracking-widest text-[#17324D]">
          Sprichwort
        </span>
      </div>

      {/* The proverb — large */}
      <p
        className="text-lg sm:text-xl font-bold text-[#17181C] leading-snug mb-3"
        dir="ltr"
        style={{ unicodeBidi: 'isolate' }}
      >
        „{sprichwort.sprichwort}"
      </p>

      {/* Literal — always shown */}
      <div className="mb-3 pb-3 border-b border-stone-200/60">
        <span className="text-[0.625rem] font-mono uppercase tracking-wider text-stone-500 block mb-1">
          حرفياً
        </span>
        <p className="text-sm text-stone-700 leading-relaxed italic">{sprichwort.literal_ar}</p>
      </div>

      {/* Real meaning — tap to reveal */}
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="w-full text-start"
      >
        <span className="text-[0.625rem] font-mono uppercase tracking-wider text-stone-500 block mb-1">
          {revealed ? 'المعنى' : 'المعنى — اضغط للقراءة'}
        </span>
        {revealed ? (
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-medium text-[#17181C] leading-relaxed"
          >
            {sprichwort.meaning_ar}
          </motion.p>
        ) : (
          <p className="text-sm text-stone-500 leading-relaxed select-none">
            <span className="opacity-50">— — — — —</span>
          </p>
        )}
      </button>
    </motion.div>
  );
};