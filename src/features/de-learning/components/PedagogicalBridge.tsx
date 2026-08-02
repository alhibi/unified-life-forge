import React from 'react';
import { Compass, Sparkles } from '@/lib/icons';

interface PedagogicalBridgeProps {
  title: string;
  explanationAr: string;
  contrastiveNoteAr: string | null;
  className?: string;
}

export const PedagogicalBridge: React.FC<PedagogicalBridgeProps> = ({
  title,
  explanationAr,
  contrastiveNoteAr,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-teal-500/20 bg-teal-500/[0.02] dark:bg-teal-500/[0.04] p-5 space-y-4 shadow-sm ${className}`}
      dir="rtl"
    >
      {/* Decorative ambient subtle gradient to match Zen Elite system */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
          <Compass className="h-4.5 w-4.5" />
        </div>
        <div>
          <h4 className="font-tajawal text-sm font-bold text-foreground">الجسر اللغوي العربي-الألماني</h4>
          <span className="text-[10px] font-mono uppercase tracking-widest text-teal-600 dark:text-teal-400 font-semibold">
            Pedagogical Bridge
          </span>
        </div>
      </div>

      {/* Concept Title & German Rule */}
      <div className="space-y-1">
        <h5 className="font-tajawal text-xs font-bold text-foreground opacity-90">{title}</h5>
        <p className="font-tajawal text-xs text-muted-foreground leading-relaxed">
          {explanationAr}
        </p>
      </div>

      {/* Contrastive Arabic Comparison - The core differentiator */}
      {contrastiveNoteAr && (
        <div className="border-t border-teal-500/10 pt-3 mt-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 mt-0.5">
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-tajawal text-[11px] font-bold text-teal-700 dark:text-teal-400">
                مقارنة مع النحو العربي:
              </span>
              <p className="font-amiri text-sm text-foreground/90 leading-relaxed antialiased">
                {contrastiveNoteAr}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PedagogicalBridge;
