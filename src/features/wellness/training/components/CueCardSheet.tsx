/**
 * Bottom sheet that displays a coaching cue card for an exercise — setup,
 * execution, mistakes, breathing, and a finisher quote. Reusable across
 * the active session and the program detail view.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, BookOpen, CheckCircle, Info, Wind, X } from '@/lib/icons';
import { cuesFor, GENERIC_SAFETY, GENERIC_WARMUP } from '../coachingCues';
import type { CueCard, LocalizedString } from '../types';

export interface CueCardSheetProps {
  exerciseKey: string | null;
  exerciseLabel?: string;
  open: boolean;
  onClose: () => void;
  lang: 'ar' | 'de';
}

const T = {
  setup: { ar: 'الإعداد', de: 'Setup' },
  execution: { ar: 'التنفيذ', de: 'Ausführung' },
  mistakes: { ar: 'أخطاء شائعة', de: 'Häufige Fehler' },
  breathing: { ar: 'التنفس', de: 'Atmung' },
  prerequisites: { ar: 'المتطلبات', de: 'Voraussetzungen' },
  injury: { ar: 'تنبيه إصابة', de: 'Verletzungs-Hinweis' },
  noCues: {
    ar: 'لا توجد تعليمات مخصصة لهذا التمرين بعد. أرسل ملاحظاتك للتطوير.',
    de: 'Noch keine spezifischen Cues für diese Übung. Feedback willkommen.',
  },
};

export default function CueCardSheet({
  exerciseKey,
  exerciseLabel,
  open,
  onClose,
  lang,
}: CueCardSheetProps) {
  const cues = exerciseKey ? cuesFor(exerciseKey) : null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    {exerciseLabel ?? exerciseKey}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cues ? <CardBody c={cues} lang={lang} /> : <FallbackBody lang={lang} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CardBody({ c, lang }: { c: CueCard; lang: 'ar' | 'de' }) {
  return (
    <>
      <Section
        icon={<Info className="w-3.5 h-3.5 text-blue-500" />}
        title={T.setup[lang]}
        items={c.setupCues.map((s) => s[lang])}
        accent="blue"
      />
      <Section
        icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
        title={T.execution[lang]}
        items={c.executionCues.map((s) => s[lang])}
        accent="emerald"
      />
      {c.commonMistakes.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            {T.mistakes[lang]}
          </h4>
          <ul className="space-y-1.5">
            {c.commonMistakes.map((m, i) => (
              <li
                key={i}
                className={`p-2 rounded-lg border ${
                  m.severity === 'critical'
                    ? 'bg-rose-500/8 border-rose-500/30'
                    : m.severity === 'warning'
                      ? 'bg-amber-500/8 border-amber-500/30'
                      : 'bg-muted/30 border-border/30'
                }`}
              >
                <p className={`text-[12px] font-semibold ${
                  m.severity === 'critical' ? 'text-rose-500' : m.severity === 'warning' ? 'text-amber-500' : 'text-foreground'
                }`}>
                  {m.text[lang]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-cyan-500/8 border border-cyan-500/30 rounded-xl p-3 flex items-start gap-2">
        <Wind className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-cyan-500 font-semibold mb-0.5">
            {T.breathing[lang]}
          </p>
          <p className="text-[12px] text-foreground/90">{c.breathingCue[lang]}</p>
        </div>
      </div>

      {c.injuryWatch && c.injuryWatch.length > 0 && (
        <Section
          icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
          title={T.injury[lang]}
          items={c.injuryWatch.map((s) => s[lang])}
          accent="rose"
        />
      )}

      {c.prerequisites && c.prerequisites.length > 0 && (
        <Section
          icon={<CheckCircle className="w-3.5 h-3.5 text-violet-500" />}
          title={T.prerequisites[lang]}
          items={c.prerequisites.map((s) => s[lang])}
          accent="violet"
        />
      )}

      {c.finisherQuote && (
        <p className="text-center text-[13px] italic text-muted-foreground py-2">
          "{c.finisherQuote[lang]}"
        </p>
      )}
    </>
  );
}

function FallbackBody({ lang }: { lang: 'ar' | 'de' }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">{T.noCues[lang]}</p>
      <div className="bg-muted/30 border border-border/30 rounded-xl p-3">
        <p className="text-[12px] text-foreground">{GENERIC_WARMUP[lang]}</p>
      </div>
      <div className="bg-rose-500/8 border border-rose-500/30 rounded-xl p-3">
        <p className="text-[12px] text-foreground">{GENERIC_SAFETY[lang]}</p>
      </div>
    </div>
  );
}

function Section({
  icon, title, items,
}: { icon: React.ReactNode; title: string; items: string[]; accent: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
        {icon} {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="bg-card border border-border/40 rounded-lg p-2">
            <p className="text-[12px] text-foreground/90 leading-relaxed">{s}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Helper: bilingual fallback localised string. */
export function locText(s: LocalizedString | undefined, lang: 'ar' | 'de'): string {
  return s ? s[lang] : '';
}
