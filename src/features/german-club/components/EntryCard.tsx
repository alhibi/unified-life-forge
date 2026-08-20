import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Sparkles, Volume2 } from '@/lib/icons';
import { GenderDot } from './GenderDot';
import { GERMAN_CLUB_TOKENS, GermanEntry, REGISTER_LABELS_AR } from '../types';

interface EntryCardProps {
  entry: GermanEntry;
  initialMastered?: boolean;
  onToggleMastered?: (id: string, mastered: boolean) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, initialMastered = false, onToggleMastered }) => {
  const [showExample, setShowExample] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isMastered, setIsMastered] = useState(initialMastered);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setIsMastered(initialMastered);
  }, [initialMastered, entry.id]);

  const handleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMastered;
    setIsMastered(next);
    if (onToggleMastered) onToggleMastered(entry.id, next);
  };

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
  let prefix = entry.separable_prefix || '';

  if (entry.is_separable_verb && prefix && baseVerb.toLowerCase().startsWith(prefix.toLowerCase())) {
    baseVerb = baseVerb.slice(prefix.length);
  }

  return (
    <motion.div
      layout={!shouldReduceMotion}
      onClick={handleCardClick}
      className={`relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 active:scale-[0.99] ${
        isMastered ? 'opacity-80 bg-emerald-950/5 border-emerald-800/20' : ''
      }`}
      style={{
        backgroundColor: `${GERMAN_CLUB_TOKENS.paper}`,
        borderColor: isMastered ? '#22c55e33' : `${GERMAN_CLUB_TOKENS.oak}26`,
        boxShadow: '0 2px 12px -2px rgba(23, 24, 28, 0.04)',
      }}
    >
      {/* Top row: Gender Dot, Headword (German), and Action Triggers */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
          {entry.gender !== 'n_a' && <GenderDot gender={entry.gender} size={11} className="mt-1.5" />}

          <div className="flex flex-wrap items-baseline gap-2" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {entry.is_separable_verb && entry.separable_prefix ? (
              <div className="inline-flex items-baseline font-mono text-xl sm:text-2xl font-black tracking-tight text-[#17181C]">
                {/* Prefix Motion Element */}
                <motion.span
                  animate={
                    isSplitting && !shouldReduceMotion
                      ? {
                          x: [0, 40, 0],
                          y: [0, -10, 0],
                          color: [GERMAN_CLUB_TOKENS.prussian, '#dc2626', GERMAN_CLUB_TOKENS.prussian],
                        }
                      : {}
                  }
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  className="text-[#17324D] underline decoration-dotted underline-offset-4"
                >
                  {prefix}
                </motion.span>
                <span>{baseVerb}</span>
              </div>
            ) : (
              <span className="font-mono text-xl sm:text-2xl font-black tracking-tight text-[#17181C]">
                {entry.german_text}
              </span>
            )}

            {entry.ipa && (
              <span className="text-xs font-mono text-stone-500 font-normal dir-ltr" dir="ltr">
                [{entry.ipa}]
              </span>
            )}
          </div>
        </div>

        {/* Mastered & Audio Triggers */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {entry.audio_url && (
            <button
              type="button"
              onClick={() => {
                const audio = new Audio(entry.audio_url!);
                audio.play().catch(() => {});
              }}
              className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 transition-colors"
              title="استماع للنطق"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleMastered}
            className={`p-1.5 rounded-lg border transition-all ${
              isMastered
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-stone-300 text-stone-400 hover:text-stone-600 hover:bg-stone-200/50'
            }`}
            title={isMastered ? 'تم الحفظ' : 'تحديد كـ متقن'}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Arabic Translation Subtitle */}
      <div className="mt-2 text-start">
        <p className="text-sm font-normal text-stone-800 leading-snug">{entry.arabic_translation}</p>
      </div>

      {/* Meta tags row */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-stone-200/60">
        <div className="flex items-center gap-2">
          {entry.register && entry.register !== 'neutral' && (
            <span className="text-[0.6875rem] font-medium text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-md">
              {REGISTER_LABELS_AR[entry.register]}
            </span>
          )}
          {entry.is_separable_verb && (
            <span className="text-[0.6875rem] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-600" />
              فعل منفصل
            </span>
          )}
        </div>

        {entry.example_sentence_de && (
          <span className="text-xs font-medium text-[#17324D] flex items-center gap-1 hover:underline">
            {showExample ? 'إخفاء المثال' : 'عرض مثال بالجملة'}
            <ArrowLeft className={`w-3 h-3 transition-transform ${showExample ? 'rotate-90' : ''}`} />
          </span>
        )}
      </div>

      {/* Revealed Example Sentence Block */}
      {showExample && entry.example_sentence_de && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          className="mt-3 rounded-xl p-3.5 border text-start"
          style={{
            backgroundColor: 'rgba(23, 50, 77, 0.04)',
            borderColor: 'rgba(23, 50, 77, 0.12)',
          }}
        >
          <div className="text-sm font-mono font-bold text-[#17324D] leading-relaxed" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {entry.example_sentence_de}
          </div>
          {entry.example_sentence_ar && (
            <div className="mt-1.5 text-xs text-stone-600 font-normal leading-normal">
              {entry.example_sentence_ar}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
