import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useState } from 'react';

import { ArrowRight, Compass, Sparkles } from '@/lib/icons';

import { discoverRandom, type DiscoveryResult } from '../lib/discovery';
import { GERMAN_CLUB_TOKENS } from '../types';

const REASON_LABEL: Record<DiscoveryResult['reason'], { text: string; emoji: string }> = {
  fresh: { text: 'اكتشاف جديد', emoji: '✨' },
  'same-category': { text: 'من نفس المجال', emoji: '🗂' },
  'same-level': { text: 'من نفس المستوى', emoji: '⚖️' },
  synonym: { text: 'مرادف قريب', emoji: '🪞' },
  antonym: { text: 'عكس مفاجئ', emoji: '🔁' },
  mixed: { text: 'عشوائي ممتع', emoji: '🎲' },
};

/**
 * DiscoveryCard — "خذني لكلمة عشوائية ذات صلة"
 *
 * One card that shows a single dictionary entry plus the reason it was
 * picked. Click the compass icon to wander again. Click the word itself
 * to open the dictionary detail modal.
 *
 * This is the antidote to the "I never know what to look for" problem.
 */
export const DiscoveryCard: React.FC = () => {
  const [result, setResult] = useState<DiscoveryResult | null>(() => discoverRandom(null));
  const shouldReduceMotion = useReducedMotion();

  const handleWander = () => {
    const lastId = result?.entry.id ?? null;
    setResult(discoverRandom(lastId));
  };

  if (!result) return null;

  const { entry, reason } = result;
  const reasonMeta = REASON_LABEL[reason];

  return (
    <section
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${GERMAN_CLUB_TOKENS.prussian}06, ${GERMAN_CLUB_TOKENS.ember}06)`,
        borderColor: `${GERMAN_CLUB_TOKENS.prussian}22`,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(23,24,28,0.18)',
      }}
    >
      {/* Top: label + wander button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[#17324D]" />
          <span className="text-[0.625rem] font-mono font-bold uppercase tracking-widest text-[#17324D]">
            Zufallsfund
          </span>
          <span className="text-[0.625rem] text-stone-500">·</span>
          <span className="text-[0.625rem] font-mono text-stone-600 uppercase tracking-wider">
            {reasonMeta.text}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={handleWander}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.92, rotate: -90 }}
          whileHover={shouldReduceMotion ? undefined : { rotate: 15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border bg-white"
          style={{
            borderColor: GERMAN_CLUB_TOKENS.prussian,
            color: GERMAN_CLUB_TOKENS.prussian,
            boxShadow: '0 2px 8px -2px rgba(23, 50, 77, 0.18)',
          }}
          aria-label="كلمة عشوائية جديدة"
        >
          <Compass className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Word — animated swap */}
      <AnimatePresence mode="wait">
        <motion.div
          key={entry.id}
          initial={shouldReduceMotion ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <h3
            className="font-black text-[#17181C] mb-1 leading-tight"
            style={{
              fontFamily: '"Inter", "SF Pro", system-ui, sans-serif',
              fontSize: 'clamp(1.5rem, 6vw, 2.125rem)',
              letterSpacing: '-0.025em',
            }}
            dir="ltr"
          >
            {entry.german}
          </h3>
          {entry.ipa && (
            <span className="text-xs font-mono text-stone-500 ml-0.5" dir="ltr">
              [{entry.ipa}]
            </span>
          )}

          <p className="text-base font-semibold text-[#17181C] mt-2 mb-1.5 leading-snug">
            {entry.arabic}
          </p>

          {/* Meta line — category + CEFR */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3 text-[0.625rem] font-mono text-stone-500 uppercase tracking-wider">
            <span>{entry.category}</span>
            <span className="text-stone-300">·</span>
            <span>{entry.cefr}</span>
            <span className="text-stone-300">·</span>
            <span>{entry.word_type}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom hint */}
      <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between">
        <span className="text-xs text-stone-500 italic">
          {reason === 'synonym' && 'كلمة بمعنى مشابه — لا تخلط بينهما'}
          {reason === 'antonym' && 'الضد تماماً — جرّب استخدامهما في جملة'}
          {reason === 'same-level' && 'في نفس مستواك — قرّب منه'}
          {reason === 'same-category' && 'من نفس عالم الكلمات — تعرّف على رفقته'}
          {reason === 'mixed' && 'عشوائية سعيدة — اضغط البوصلة لمزيد'}
          {reason === 'fresh' && 'ابدأ من هنا — اضغط البوصلة للمزيد'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
      </div>
    </section>
  );
};