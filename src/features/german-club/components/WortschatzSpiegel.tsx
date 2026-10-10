import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { Bookmark } from '@/lib/icons';

import { useDictionaryStore } from '../useDictionaryStore';

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
      className="inline-flex items-center gap-2 rounded-lg border border-track bg-secondary/40 px-3 py-1.5"
    >
      <Bookmark className="h-3.5 w-3.5 text-signal" aria-hidden />
      <span className="text-mini text-muted-foreground">في محفوظاتك</span>
      <span className="text-body font-black tabular-nums text-primary">{countWord}</span>
    </motion.div>
  );
};
