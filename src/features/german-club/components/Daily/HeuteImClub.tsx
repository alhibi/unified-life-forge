import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { Coffee } from '@/lib/icons';

import { getDailyBundle } from '../../lib/daily';
import { GERMAN_CLUB_TOKENS } from '../../types';
import {
  KulturperleCard,
  SatzCard,
} from './SatzKulturperleCards';
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
          <Coffee className="w-4 h-4 text-stone-700" />
          <h2
            className="text-sm sm:text-base font-black tracking-tight text-[#17181C]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Heute im Club
          </h2>
        </div>
        <span
          className="text-[0.625rem] font-mono font-bold uppercase tracking-widest"
          style={{ color: GERMAN_CLUB_TOKENS.oak }}
        >
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