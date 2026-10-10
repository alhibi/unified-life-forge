import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Compass, Sparkles } from '@/lib/icons';

import { discoverRandom, type DiscoveryResult } from '../lib/discovery';

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
    <AppCard as="section">
      {/* Top: label + wander button */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="font-mono text-micro font-bold uppercase tracking-widest text-primary">
            Zufallsfund
          </span>
          <span className="text-micro text-muted-foreground">·</span>
          <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground">
            {reasonMeta.text}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={handleWander}
          whileHover={shouldReduceMotion ? undefined : { rotate: 15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="app-icon-btn shrink-0"
          aria-label="كلمة عشوائية جديدة"
        >
          <Compass className="h-4 w-4" />
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
          <h3 className="text-hero font-black leading-tight text-foreground" dir="ltr">
            {entry.german}
          </h3>
          {entry.ipa && (
            <span className="ms-0.5 font-mono text-mini text-muted-foreground" dir="ltr">
              [{entry.ipa}]
            </span>
          )}

          <p className="mb-1.5 mt-2 text-lead font-semibold leading-snug text-foreground">
            {entry.arabic}
          </p>

          {/* Meta line — category + CEFR */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-micro uppercase tracking-wider text-muted-foreground">
            <span>{entry.category}</span>
            <span className="text-muted-foreground">·</span>
            <span>{entry.cefr}</span>
            <span className="text-muted-foreground">·</span>
            <span>{entry.word_type}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom hint */}
      <div className="mt-4 flex items-center justify-between border-t border-track pt-3">
        <span className="text-mini italic text-muted-foreground">
          {reason === 'synonym' && 'كلمة بمعنى مشابه — لا تخلط بينهما'}
          {reason === 'antonym' && 'الضد تماماً — جرّب استخدامهما في جملة'}
          {reason === 'same-level' && 'في نفس مستواك — قرّب منه'}
          {reason === 'same-category' && 'من نفس عالم الكلمات — تعرّف على رفقته'}
          {reason === 'mixed' && 'عشوائية سعيدة — اضغط البوصلة لمزيد'}
          {reason === 'fresh' && 'ابدأ من هنا — اضغط البوصلة للمزيد'}
        </span>
        <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden />
      </div>
    </AppCard>
  );
};

export default DiscoveryCard;
