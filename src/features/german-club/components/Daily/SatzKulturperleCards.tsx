import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { MessageSquareQuote, Sparkles } from '@/lib/icons';

import { GERMAN_CLUB_TOKENS } from '../../types';
import type { DailyKulturperle, DailySatz } from '../../lib/daily';

interface SatzCardProps {
  satz: DailySatz;
  animate?: boolean;
}

/**
 * SatzCard — a real sentence a German would say today.
 *
 * Shows the German phrase + Arabic translation + when/where you'd
 * hear it. Like overhearing something useful on the U-Bahn.
 */
export const SatzCard: React.FC<SatzCardProps> = ({ satz, animate = true }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={animate && !shouldReduceMotion ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        backgroundColor: '#F7F9FB',
        borderColor: `${GERMAN_CLUB_TOKENS.prussian}22`,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(23,24,28,0.18)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareQuote className="w-3.5 h-3.5 text-[#17324D]" />
        <span className="text-[0.625rem] font-mono font-bold uppercase tracking-widest text-[#17324D]">
          Satz des Tages
        </span>
      </div>

      {/* The actual sentence */}
      <p
        className="text-xl sm:text-2xl font-bold text-[#17181C] leading-snug mb-2"
        dir="ltr"
        style={{ unicodeBidi: 'isolate' }}
      >
        „{satz.satz}"
      </p>

      <p className="text-sm font-semibold text-[#17181C] mb-3 leading-snug">{satz.arabic}</p>

      {/* Context — italic small */}
      <p className="text-xs text-stone-500 italic leading-relaxed">
        {satz.context_ar}
      </p>

      {/* Register tag — minimal */}
      <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center gap-1.5">
        <span className="text-[0.625rem] font-mono text-stone-500 uppercase tracking-wider">
          {satz.register === 'formal' && 'رسمي'}
          {satz.register === 'neutral' && 'محايد'}
          {satz.register === 'informal' && 'غير رسمي'}
          {satz.register === 'slang' && 'عامي'}
        </span>
      </div>
    </motion.div>
  );
};

interface KulturperleCardProps {
  perle: DailyKulturperle;
  animate?: boolean;
}

/**
 * KulturperleCard — a tiny cultural fact, like a postcard from Germany.
 *
 * The body is 2-4 short sentences in Arabic. Reads like a tweet thread
 * condensed into one card. No images, no links — just a fact.
 */
export const KulturperleCard: React.FC<KulturperleCardProps> = ({ perle, animate = true }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={animate && !shouldReduceMotion ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        backgroundColor: '#F9F5F0',
        borderColor: `${GERMAN_CLUB_TOKENS.ember}33`,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(23,24,28,0.18)',
      }}
    >
      {/* Decorative gradient */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(199, 112, 59, 0.4), transparent 70%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span className="text-[0.625rem] font-mono font-bold uppercase tracking-widest text-[#C9703B]">
            Kulturperle
          </span>
        </div>

        {/* Title — German + Arabic */}
        <h3
          className="text-lg sm:text-xl font-black text-[#17181C] leading-tight mb-1"
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
        >
          {perle.title_de}
        </h3>
        <p className="text-sm font-semibold text-[#17324D] mb-3 leading-snug">{perle.title_ar}</p>

        {/* Body — the pearl */}
        <p className="text-sm text-stone-700 leading-relaxed">{perle.body_ar}</p>
      </div>
    </motion.div>
  );
};