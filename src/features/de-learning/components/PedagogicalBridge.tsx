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
      className={`relative overflow-hidden rounded-2xl border border-[hsl(var(--live))]/20 bg-[hsl(var(--live))]/[0.02] p-5 space-y-4 shadow-sm ${className}`}
      dir="rtl"
    >
      <div className="absolute top-0 right-0 -mt-8 -me-8 h-24 w-24 rounded-full bg-[hsl(var(--live))]/10 blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--live))]/10 text-[hsl(var(--live))]">
          <Compass className="h-4.5 w-4.5" />
        </div>
        <div>
          <h4 className="font-tajawal text-meta font-bold text-foreground">الجسر اللغوي العربي-الألماني</h4>
          <span className="text-mini font-plex-mono uppercase tracking-widest text-[hsl(var(--live))] font-semibold">
            Pedagogical Bridge
          </span>
        </div>
      </div>

      <div className="space-y-1.5 relative z-10">
        <h5 className="font-tajawal text-mini font-bold text-foreground">{title}</h5>
        <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
          {explanationAr}
        </p>
      </div>

      {contrastiveNoteAr && (
        <div className="border-t border-border/40 pt-3 mt-3 relative z-10">
          <div className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-[hsl(var(--live))]/10 text-[hsl(var(--live))] mt-0.5">
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-tajawal text-micro font-bold text-[hsl(var(--live))] uppercase tracking-wider">
                مقارنة مع النحو العربي
              </span>
              <p className="font-amiri text-meta text-foreground/90 leading-relaxed antialiased">
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
