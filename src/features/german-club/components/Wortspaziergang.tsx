import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useState } from 'react';

import { ArrowLeft, ArrowRight, MapPin, Volume2, Wand2, X } from '@/lib/icons';

import {
  buildSpaziergang,
  type SpaziergangStop,
} from '../lib/spaziergang';
import {
  CEFRLevelLabels,
  DictionaryWordTypeLabels,
  GENDER_COLORS,
} from '../types';

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
 */
export const Wortspaziergang: React.FC<WortspaziergangProps> = ({ open, onClose }) => {
  const [activeWalk, setActiveWalk] = useState<SpaziergangStop[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const shouldReduceMotion = useReducedMotion();

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
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={close}
      >
        <motion.div
          key="panel"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-3xl border border-[hsl(var(--track))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--track))]">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] tracking-tight">
                Wortspaziergang
              </h2>
              <span className="text-[0.625rem] font-mono text-muted-foreground uppercase tracking-widest">
                · 7 خطوات
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-7 min-h-[340px] flex flex-col">
            {!activeWalk ? (
              <IntroScreen onStart={start} />
            ) : (
              <>
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-5">
                  {activeWalk.map((s, i) => (
                    <button
                      key={s.entry.id + i}
                      type="button"
                      onClick={() => setStepIdx(i)}
                      aria-label={`الخطوة ${s.step}`}
                      className={`rounded-full transition-motion ${
                        i === stepIdx
                          ? 'w-6 h-1.5 bg-[hsl(var(--primary))]'
                          : i < stepIdx
                          ? 'w-1.5 h-1.5 bg-[hsl(var(--primary))]/60'
                          : 'w-1.5 h-1.5 bg-secondary'
                      }`}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <StopCard key={activeWalk[stepIdx].entry.id} stop={activeWalk[stepIdx]} />
                </AnimatePresence>

                {/* Controls */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[hsl(var(--track))]">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={stepIdx === 0}
                    className="text-xs font-bold px-3 py-2 rounded-xl border border-[hsl(var(--track))] text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    رجوع
                  </button>

                  <span className="text-xs font-mono text-muted-foreground">
                    {stepIdx + 1} / {activeWalk.length}
                  </span>

                  <button
                    type="button"
                    onClick={next}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))] transition-colors flex items-center gap-1.5"
                  >
                    {stepIdx + 1 >= activeWalk.length ? 'إعادة' : 'الكلمة التالية'}
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface IntroScreenProps {
  onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => (
  <div className="text-center space-y-4 py-6">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-16 h-16 mx-auto rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center"
    >
      <Wand2 className="w-8 h-8 text-[hsl(var(--primary))]" />
    </motion.div>

    <div>
      <h3 className="text-xl font-black text-[hsl(var(--foreground))] mb-1.5 tracking-tight">
        جولة لغوية قصيرة
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        سبع كلمات تتدفق معاً، من نفس العالم اللغوي ثم تقفز إلى عوالم أخرى. بدون أي التزام.
      </p>
    </div>

    <button
      type="button"
      onClick={onStart}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[hsl(var(--primary))] text-white text-sm font-bold hover:bg-[hsl(var(--primary))] transition-colors shadow-sm"
    >
      ابدأ الجولة
      <ArrowLeft className="w-4 h-4" />
    </button>
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
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-base leading-none">{emoji}</span>
        <span className="font-mono text-muted-foreground uppercase tracking-wider">
          الخطوة {step}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="font-bold text-[hsl(var(--primary))]">{reason}</span>
      </div>

      {/* Word */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {genderColor && (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: genderColor }}
            />
          )}
          <h3
            className="font-black text-[hsl(var(--foreground))] tracking-tight"
            style={{
              fontFamily: '"Inter", "SF Pro", system-ui, sans-serif',
              fontSize: 'clamp(2rem, 8vw, 2.75rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
            }}
            dir="ltr"
          >
            {entry.german}
          </h3>
          <button
            type="button"
            onClick={speak}
            className="p-2 rounded-xl border border-[hsl(var(--track))] hover:bg-secondary transition-colors"
            title="نطق"
            aria-label="نطق"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {entry.ipa && (
          <p dir="ltr" className="text-xs font-mono text-muted-foreground">
            [{entry.ipa}]
          </p>
        )}
      </div>

      {/* Arabic */}
      <p className="text-lg font-bold text-[hsl(var(--foreground))] leading-snug">
        {entry.arabic}
      </p>

      {/* Meta tags */}
      <div className="flex items-center gap-1.5 flex-wrap text-[0.625rem] font-mono uppercase tracking-wider">
        <span className={`font-bold px-2 py-0.5 rounded-full border ${cefrInfo.badge_color}`}>
          {entry.cefr}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground">
          {DictionaryWordTypeLabels[entry.word_type]}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-card text-muted-foreground flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5" />
          {entry.category}
        </span>
      </div>

      {/* First example if available */}
      {entry.examples[0] && (
        <div className="p-3 rounded-2xl bg-white/80 border border-[hsl(var(--track))]">
          <p
            dir="ltr"
            className="text-sm font-bold text-[hsl(var(--primary))] leading-snug"
          >
            „{entry.examples[0].de}"
          </p>
          <p className="text-xs text-muted-foreground leading-snug mt-1">
            {entry.examples[0].ar}
          </p>
        </div>
      )}
    </motion.div>
  );
};