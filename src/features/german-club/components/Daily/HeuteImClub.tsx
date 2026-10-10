import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { Coffee } from '@/lib/icons';

import { getDailyBundle } from '../../lib/daily';
import { KulturperleCard, SatzCard } from './SatzKulturperleCards';
import { SprichwortCard, WortCard } from './WortSprichwortCards';

/**
 * Heute im Club — the daily content wall.
 *
 * Four small cards stacked: Wort → Sprichwort → Satz → Kulturperle.
 * Same content for the whole day, deterministic by date.
 *
 * No streak. No reminder. Just a fresh page every visit.
 */
export const HeuteImClub: React.FC = () => {
  const bundle = React.useMemo(() => getDailyBundle(), []);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="space-y-3 sm:space-y-4" aria-label="محتوى اليوم في النادي">
      {/* Section header — like a chalkboard sign */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-baseline justify-between px-1"
      >
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-foreground" aria-hidden />
          <h2 className="type-section text-foreground">Heute im Club</h2>
        </div>
        <span className="font-mono text-micro font-bold uppercase tracking-widest text-muted-foreground">
          محتوى اليوم
        </span>
      </motion.div>

      {/* The four cards */}
      <div className="space-y-3 sm:space-y-4">
        <WortCard wort={bundle.wort} />
        <SprichwortCard sprichwort={bundle.sprichwort} />
        <SatzCard satz={bundle.satz} />
        <KulturperleCard perle={bundle.kulturperle} />
      </div>
    </section>
  );
};
