import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useState } from 'react';

import { IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, MapPin, Volume2, Wand2 } from '@/lib/icons';

import { buildSpaziergang, type SpaziergangStop } from '../lib/spaziergang';
import { CEFRLevelLabels, DictionaryWordTypeLabels, GENDER_COLORS } from '../types';

interface WortspaziergangProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Wortspaziergang — a 7-step "word walk" modal.
 *
 * Press a single button to wander through 7 hand-curated but algorithmically
 * connected dictionary entries. No streak, no XP. Just flow.
 *
 * The first stop is always a beginner-friendly entry. The next 6 connect
 * it via shared category, synonyms, antonyms, and tags. Each stop shows
 * up with a fade-slide animation; the word itself slides in from a
 * different direction than the meta to draw the eye.
 *
 * The hand-rolled overlay (its own scrim, blur and shadow) is gone — the
 * walk rides the shared <Dialog>, which owns the scrim, stacking, focus
 * trap and timings.
 */
export const Wortspaziergang: React.FC<WortspaziergangProps> = ({ open, onClose }) => {
  const [activeWalk, setActiveWalk] = useState<SpaziergangStop[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const start = () => {
    setActiveWalk(buildSpaziergang(null));
    setStepIdx(0);
  };

  const close = () => {
    setActiveWalk(null);
    setStepIdx(0);
    onClose();
  };

  const next = () => {
    if (!activeWalk) return;
    if (stepIdx + 1 >= activeWalk.length) {
      // End of walk — restart or close
      setStepIdx(0);
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  if (!open) return null;

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" aria-hidden />
            <DialogTitle className="text-title font-bold tracking-tight">
              Wortspaziergang
            </DialogTitle>
            <span className="font-mono text-micro uppercase tracking-widest text-muted-foreground">
              · 7 خطوات
            </span>
          </div>
          <DialogDescription className="sr-only">
            جولة قصيرة من سبع كلمات عبر القاموس، كل خطوة تفتح التي بعدها.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex min-h-[340px] flex-col">
          {!activeWalk ? (
            <IntroScreen onStart={start} />
          ) : (
            <>
              {/* Progress dots */}
              <div className="mb-5 flex items-center justify-center gap-1.5">
                {activeWalk.map((s, i) => (
                  <button
                    key={s.entry.id + i}
                    type="button"
                    onClick={() => setStepIdx(i)}
                    aria-label={`الخطوة ${s.step}`}
                    className={`rounded-full transition-motion ${
                      i === stepIdx
                        ? 'h-1.5 w-6 bg-primary'
                        : i < stepIdx
                          ? 'h-1.5 w-1.5 bg-primary/60'
                          : 'h-1.5 w-1.5 bg-secondary'
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <StopCard key={activeWalk[stepIdx].entry.id} stop={activeWalk[stepIdx]} />
              </AnimatePresence>

              {/* Controls */}
              <div className="mt-6 flex items-center justify-between border-t border-track pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={prev}
                  disabled={stepIdx === 0}
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  رجوع
                </Button>

                <span className="font-mono text-mini tabular-nums text-muted-foreground">
                  {stepIdx + 1} / {activeWalk.length}
                </span>

                <Button size="sm" className="gap-1.5" onClick={next}>
                  {stepIdx + 1 >= activeWalk.length ? 'إعادة' : 'الكلمة التالية'}
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface IntroScreenProps {
  onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => (
  <div className="space-y-4 py-6 text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
    >
      <Wand2 className="h-8 w-8 text-primary" aria-hidden />
    </motion.div>

    <div>
      <h3 className="mb-1.5 text-title font-black tracking-tight text-foreground">
        جولة لغوية قصيرة
      </h3>
      <p className="mx-auto max-w-xs text-body leading-relaxed text-muted-foreground">
        سبع كلمات تتدفق معاً، من نفس العالم اللغوي ثم تقفز إلى عوالم أخرى. بدون أي التزام.
      </p>
    </div>

    <Button size="lg" className="gap-2" onClick={onStart}>
      ابدأ الجولة
      <ArrowLeft className="h-4 w-4" aria-hidden />
    </Button>
  </div>
);

interface StopCardProps {
  stop: SpaziergangStop;
}

const StopCard: React.FC<StopCardProps> = ({ stop }) => {
  const shouldReduceMotion = useReducedMotion();
  const { entry, reason, emoji, step } = stop;
  const genderColor = entry.gender ? GENDER_COLORS[entry.gender] : null;
  const cefrInfo = CEFRLevelLabels[entry.cefr];

  const speak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(entry.german);
      u.lang = 'de-DE';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <motion.div
      key={entry.id}
      initial={shouldReduceMotion ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 space-y-4"
    >
      {/* Step reason */}
      <div className="flex items-center gap-1.5 text-mini">
        <span className="text-lead leading-none">{emoji}</span>
        <span className="font-mono uppercase tracking-wider text-muted-foreground">
          الخطوة {step}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="font-bold text-primary">{reason}</span>
      </div>

      {/* Word */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {genderColor && (
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: genderColor }}
            />
          )}
          <h3 className="text-hero font-black tracking-tight text-foreground" dir="ltr">
            {entry.german}
          </h3>
          <IconButton onClick={speak} title="نطق" aria-label="نطق">
            <Volume2 className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>

        {entry.ipa && (
          <p dir="ltr" className="font-mono text-mini text-muted-foreground">
            [{entry.ipa}]
          </p>
        )}
      </div>

      {/* Arabic */}
      <p className="text-lead font-bold leading-snug text-foreground">{entry.arabic}</p>

      {/* Meta tags */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-micro uppercase tracking-wider">
        <span className={`rounded-full border px-2 py-0.5 font-bold ${cefrInfo.badge_color}`}>
          {entry.cefr}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-foreground">
          {DictionaryWordTypeLabels[entry.word_type]}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-muted-foreground">
          <MapPin className="h-2.5 w-2.5" aria-hidden />
          {entry.category}
        </span>
      </div>

      {/* First example if available */}
      {entry.examples[0] && (
        <div className="rounded-lg border border-track bg-secondary/40 p-3">
          <p dir="ltr" className="text-body font-bold leading-snug text-primary">
            „{entry.examples[0].de}"
          </p>
          <p className="mt-1 text-mini leading-snug text-muted-foreground">
            {entry.examples[0].ar}
          </p>
        </div>
      )}
    </motion.div>
  );
};
