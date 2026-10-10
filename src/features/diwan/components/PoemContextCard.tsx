import { motion } from 'framer-motion';
import React from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { poemContexts } from '@/features/diwan/data/poetTimelines';
import { Calendar, MapPin } from '@/lib/icons';
import { MOTION } from '@/lib/motion';

interface PoemContextCardProps {
  poemTitle: string;
  poetId: string;
}

/**
 * بطاقة السياق التاريخي — ملاحظة هامشية على القصيدة: الحدث وسنته وسياقه.
 * في السابق كانت بطاقة تحمل ميلاً بصراحاً وعلامة ◆ وقيمًا خامًا؛ الآن
 * سطح <AppCard> قياسي بإطار منقّط يعلن أنها ملاحظة، بلا زخرفة حوله.
 */
export default function PoemContextCard({ poemTitle, poetId }: PoemContextCardProps) {
  // Find matching context
  const ctx = poemContexts.find((c) => c.poemTitle === poemTitle && c.poetId === poetId);

  if (!ctx) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={MOTION.settle}
      className="mt-4 mb-6"
    >
      <AppCard className="border border-dashed border-border">
        {/* Event Title */}
        <div className="mb-2.5 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <p className="font-tajawal text-mini font-bold text-foreground">{ctx.event}</p>
        </div>

        {/* Context description */}
        <p className="ps-1 font-tajawal text-mini leading-[1.85] text-muted-foreground">
          {ctx.context}
        </p>

        {/* Year badge */}
        {ctx.year && (
          <div className="mt-3 flex items-center gap-1.5 ps-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="rounded-sm border border-border/50 bg-muted px-2.5 py-0.5 font-sans text-micro font-semibold text-muted-foreground">
              {ctx.year}
            </span>
          </div>
        )}
      </AppCard>
    </motion.div>
  );
}
