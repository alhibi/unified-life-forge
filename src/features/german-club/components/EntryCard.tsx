import { motion, useReducedMotion } from 'framer-motion';
import React, { useState } from 'react';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import { ArrowLeft, Sparkles, Volume2 } from '@/lib/icons';

import { GermanEntry, REGISTER_LABELS_AR } from '../types';
import { GenderDot } from './GenderDot';

interface EntryCardProps {
  entry: GermanEntry;
}

/**
 * Entry Card — a reference card for one German entry.
 * Displays the headword, IPA, gender, register, and example sentence.
 * Click anywhere to expand/reveal the example sentence.
 *
 * This is a READ-ONLY reference card. There is no "mastered" toggle,
 * no progress bar, no streak counter — the German Club is a reference,
 * not a teaching app.
 */
export const EntryCard: React.FC<EntryCardProps> = ({ entry }) => {
  const [showExample, setShowExample] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleCardClick = () => {
    if (entry.is_separable_verb) {
      setIsSplitting(true);
      setShowExample(true);
      setTimeout(() => setIsSplitting(false), 1200);
    } else {
      setShowExample((prev) => !prev);
    }
  };

  // Separable Verb split calculation
  let baseVerb = entry.german_text;
  const prefix = entry.separable_prefix || '';

  if (entry.is_separable_verb && prefix && baseVerb.toLowerCase().startsWith(prefix.toLowerCase())) {
    baseVerb = baseVerb.slice(prefix.length);
  }

  return (
    <motion.div layout={!shouldReduceMotion}>
      <AppCard
        as="div"
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="cursor-pointer transition-motion"
      >
        {/* Top row: Gender Dot, Headword (German), and Audio trigger */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
            {entry.gender !== 'n_a' && <GenderDot gender={entry.gender} size={11} className="mt-1.5" />}

            <div className="flex flex-wrap items-baseline gap-2" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {entry.is_separable_verb && entry.separable_prefix ? (
                <div className="inline-flex items-baseline font-mono text-display font-black tracking-tight text-foreground">
                  {/* Prefix Motion Element — the split is drawn with transform
                      only; the colour stays on its accent token. */}
                  <motion.span
                    animate={
                      isSplitting && !shouldReduceMotion
                        ? {
                            x: [0, 40, 0],
                            y: [0, -10, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="text-primary underline decoration-dotted underline-offset-4"
                  >
                    {prefix}
                  </motion.span>
                  <span>{baseVerb}</span>
                </div>
              ) : (
                <span className="font-mono text-display font-black tracking-tight text-foreground">
                  {entry.german_text}
                </span>
              )}

              {entry.ipa && (
                <span className="font-mono text-mini font-normal text-muted-foreground" dir="ltr">
                  [{entry.ipa}]
                </span>
              )}
            </div>
          </div>

          {/* Audio trigger only — no mastered button */}
          {entry.audio_url && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                const audio = new Audio(entry.audio_url!);
                audio.play().catch(() => {});
              }}
              className="shrink-0 text-muted-foreground"
              title="استماع للنطق"
              aria-label="استماع للنطق"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
            </IconButton>
          )}
        </div>

        {/* Arabic Translation Subtitle */}
        <div className="mt-2 text-start">
          <p className="text-body font-normal leading-snug text-foreground">
            {entry.arabic_translation}
          </p>
        </div>

        {/* Meta tags row */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-track pt-2">
          <div className="flex items-center gap-2">
            {entry.register && entry.register !== 'neutral' && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-micro font-medium text-muted-foreground">
                {REGISTER_LABELS_AR[entry.register]}
              </span>
            )}
            {entry.is_separable_verb && (
              <span className="flex items-center gap-1 rounded-md bg-data-4/15 px-2 py-0.5 text-micro font-bold text-data-4">
                <Sparkles className="h-3 w-3 text-data-4" aria-hidden />
                فعل منفصل
              </span>
            )}
          </div>

          {entry.example_sentence_de && (
            <span className="flex items-center gap-1 text-mini font-medium text-primary hover:underline">
              {showExample ? 'إخفاء المثال' : 'عرض مثال بالجملة'}
              <ArrowLeft
                className={`h-3 w-3 transition-transform ${showExample ? 'rotate-90' : ''}`}
                aria-hidden
              />
            </span>
          )}
        </div>

        {/* Revealed Example Sentence Block */}
        {showExample && entry.example_sentence_de && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-3.5 text-start"
          >
            <div
              className="font-mono text-body font-bold leading-relaxed text-primary"
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {entry.example_sentence_de}
            </div>
            {entry.example_sentence_ar && (
              <div className="mt-1.5 text-mini font-normal leading-normal text-muted-foreground">
                {entry.example_sentence_ar}
              </div>
            )}
          </motion.div>
        )}
      </AppCard>
    </motion.div>
  );
};
