import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { MessageSquareQuote, Sparkles } from '@/lib/icons';

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
    >
      <AppCard as="div">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquareQuote className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="font-mono text-micro font-bold uppercase tracking-widest text-primary">
            Satz des Tages
          </span>
        </div>

        {/* The actual sentence */}
        <p
          className="mb-2 text-title font-bold leading-snug text-foreground"
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
        >
          „{satz.satz}"
        </p>

        <p className="mb-3 text-body font-semibold leading-snug text-foreground">{satz.arabic}</p>

        {/* Context — italic small */}
        <p className="text-mini italic leading-relaxed text-muted-foreground">{satz.context_ar}</p>

        {/* Register tag — minimal */}
        <div className="mt-3 flex items-center gap-1.5 border-t border-track pt-3">
          <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
            {satz.register === 'formal' && 'رسمي'}
            {satz.register === 'neutral' && 'محايد'}
            {satz.register === 'informal' && 'غير رسمي'}
            {satz.register === 'slang' && 'عامي'}
          </span>
        </div>
      </AppCard>
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
    >
      <AppCard as="div">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden />
          <span className="font-mono text-micro font-bold uppercase tracking-widest text-signal">
            Kulturperle
          </span>
        </div>

        {/* Title — German + Arabic */}
        <h3
          className="mb-1 text-title font-black leading-tight text-foreground"
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
        >
          {perle.title_de}
        </h3>
        <p className="mb-3 text-body font-semibold leading-snug text-primary">{perle.title_ar}</p>

        {/* Body — the pearl */}
        <p className="text-body leading-relaxed text-foreground">{perle.body_ar}</p>
      </AppCard>
    </motion.div>
  );
};
