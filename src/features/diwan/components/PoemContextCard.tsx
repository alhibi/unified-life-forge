import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, MapPin } from '@/lib/icons';
import { poemContexts } from '@/features/diwan/data/poetTimelines';

interface PoemContextCardProps {
  poemTitle: string;
  poetId: string;
}

export default function PoemContextCard({ poemTitle, poetId }: PoemContextCardProps) {
  // Find matching context
  const ctx = poemContexts.find(
    c => c.poemTitle === poemTitle && c.poetId === poetId
  );

  if (!ctx) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-amber-500/20 p-3.5 mb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            السياق التاريخي
          </span>
        </div>

        {/* Event title */}
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <p className="text-[12px] font-semibold text-foreground">
            {ctx.event}
          </p>
        </div>

        {/* Context description */}
        <p className="text-[12px] text-foreground/75 leading-[1.9] ps-5">
          {ctx.context}
        </p>

        {/* Year badge */}
        {ctx.year && (
          <div className="flex items-center gap-1.5 mt-2.5 ps-5">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
              {ctx.year}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Utility to check if a poem has context available
export function hasPoemContext(poemTitle: string, poetId: string): boolean {
  return poemContexts.some(c => c.poemTitle === poemTitle && c.poetId === poetId);
}
