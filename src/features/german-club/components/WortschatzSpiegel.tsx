import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { Bookmark } from '@/lib/icons';

import { useDictionaryStore } from '../useDictionaryStore';
import { GERMAN_CLUB_TOKENS } from '../types';

/**
 * WortschatzSpiegel — "vocabulary mirror".
 *
 * A tiny, quiet reflection of the user's bookmark count.
 *
 *  - No level. No tier. No streak.
 *  - Just a number: "لديك N كلمة في محفوظاتك".
 *  - Hidden when count is 0 (don't prompt, don't shame).
 *  - Subtle: small, mono-font, decorative line, no animation escalation.
 *
 * The point: the user can look once and see the size of their own
 * collection. Nothing more. No "أحسنت!", no badges.
 */
export const WortschatzSpiegel: React.FC = () => {
  const bookmarkedIds = useDictionaryStore((s) => s.bookmarkedIds);
  const shouldReduceMotion = useReducedMotion();

  const count = bookmarkedIds.length;
  if (count === 0) return null;

  // Tone the number visually — singular vs plural
  const countWord = count === 1 ? 'كلمة واحدة' : `${count} كلمة`;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border"
      style={{
        borderColor: `${GERMAN_CLUB_TOKENS.oak}40`,
        backgroundColor: 'rgba(255, 253, 246, 0.6)',
      }}
    >
      <Bookmark className="w-3.5 h-3.5 text-amber-700" />
      <span className="text-xs text-stone-600">في محفوظاتك</span>
      <span className="text-sm font-black text-[#17324D] tabular-nums">{countWord}</span>
    </motion.div>
  );
};