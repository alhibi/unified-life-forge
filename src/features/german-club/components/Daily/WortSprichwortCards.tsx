import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { BookOpen, Quote, Sparkles } from '@/lib/icons';

import type { DailySprichwort, DailyWort } from '../../lib/daily';
import { GENDER_COLORS } from '../../types';

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

  // Same gender keys the entry dots use — the card cannot drift from them.
  const genderColor = wort.gender ? GENDER_COLORS[wort.gender] : null;

  return (
    <motion.div
      initial={animate && !shouldReduceMotion ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <AppCard as="div" className="group">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden />
          <span className="font-mono text-micro font-bold uppercase tracking-widest text-primary">
            Wort des Tages
          </span>
        </div>

        {/* Main word — oversized */}
        <div
          className="mb-2 flex flex-wrap items-baseline gap-2"
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
        >
          {genderColor && (
            <span
              className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: genderColor }}
              aria-hidden="true"
            />
          )}
          <h3 className="text-hero font-black tracking-tight text-foreground">{wort.wort}</h3>
          {wort.ipa && (
            <span className="ms-1 font-mono text-mini text-muted-foreground" dir="ltr">
              [{wort.ipa}]
            </span>
          )}
        </div>

        {/* Arabic translation */}
        <p className="mb-1.5 text-lead font-semibold leading-snug text-foreground">
          {wort.arabic}
        </p>

        {/* Hint — the punchy line */}
        <p className="text-mini leading-relaxed text-muted-foreground sm:text-body">{wort.hint_ar}</p>

        {/* Footer — register tag (subtle) */}
        {wort.register !== 'neutral' && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-track pt-3">
            <BookOpen className="h-3 w-3 text-muted-foreground" aria-hidden />
            <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
              {wort.register === 'formal' && 'رسمي'}
              {wort.register === 'informal' && 'غير رسمي'}
              {wort.register === 'slang' && 'عامي'}
            </span>
          </div>
        )}
      </AppCard>
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
    >
      <AppCard as="div">
        <div className="mb-3 flex items-center gap-2">
          <Quote className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="font-mono text-micro font-bold uppercase tracking-widest text-primary">
            Sprichwort
          </span>
        </div>

        {/* The proverb — large */}
        <p
          className="mb-3 text-title font-bold leading-snug text-foreground"
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
        >
          „{sprichwort.sprichwort}"
        </p>

        {/* Literal — always shown */}
        <div className="mb-3 border-b border-track pb-3">
          <span className="mb-1 block font-mono text-micro uppercase tracking-wider text-muted-foreground">
            حرفياً
          </span>
          <p className="text-body italic leading-relaxed text-foreground">
            {sprichwort.literal_ar}
          </p>
        </div>

        {/* Real meaning — tap to reveal */}
        <button type="button" onClick={() => setRevealed((v) => !v)} className="w-full text-start">
          <span className="mb-1 block font-mono text-micro uppercase tracking-wider text-muted-foreground">
            {revealed ? 'المعنى' : 'المعنى — اضغط للقراءة'}
          </span>
          {revealed ? (
            <motion.p
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-body font-medium leading-relaxed text-foreground"
            >
              {sprichwort.meaning_ar}
            </motion.p>
          ) : (
            <p className="select-none text-body leading-relaxed text-muted-foreground">
              <span className="opacity-50">— — — — —</span>
            </p>
          )}
        </button>
      </AppCard>
    </motion.div>
  );
};
