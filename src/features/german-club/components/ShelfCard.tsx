import { motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { Check, Sparkles } from '@/lib/icons';

import { GERMAN_CLUB_TOKENS, GermanShelf,SURGE_TOKENS } from '../types';
import { FurnaceButton } from './FurnaceButton';

interface ShelfCardProps {
  shelf: GermanShelf;
  itemCount?: number;
  isMastered?: boolean;
  hasBeenAnimated?: boolean;
  onMasteryAnimationComplete?: (shelfId: string) => void;
  onOpenFurnace?: (shelf: GermanShelf, e: React.MouseEvent) => void;
  onClick: () => void;
}

export const ShelfCard: React.FC<ShelfCardProps> = ({
  shelf,
  itemCount,
  isMastered = false,
  hasBeenAnimated = false,
  onMasteryAnimationComplete,
  onOpenFurnace,
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [shouldAnimateEmber, setShouldAnimateEmber] = useState(false);

  useEffect(() => {
    // Only trigger traveling ember once per mastery event
    if (isMastered && !hasBeenAnimated) {
      setShouldAnimateEmber(true);
      const timer = setTimeout(() => {
        setShouldAnimateEmber(false);
        onMasteryAnimationComplete?.(shelf.id);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isMastered, hasBeenAnimated, shelf.id, onMasteryAnimationComplete]);

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
        isMastered ? 'border-emerald-800/30' : ''
      }`}
      style={{
        backgroundColor: `${GERMAN_CLUB_TOKENS.paper}`,
        borderColor: isMastered ? '#22c55e33' : `${GERMAN_CLUB_TOKENS.oak}33`,
        boxShadow: '0 4px 20px -4px rgba(23, 24, 28, 0.05)',
      }}
    >
      {/* Background paper texture feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-100/40 via-transparent to-stone-200/20 pointer-events-none" />

      {/* Trigger Moment C: Traveling Ember Border along card edge */}
      {shouldAnimateEmber && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            border: `2px solid ${SURGE_TOKENS.surgeEmberHot}`,
            boxShadow: `0 0 15px ${SURGE_TOKENS.surgeEmberHot}, inset 0 0 15px ${SURGE_TOKENS.surgeEmberHot}33`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 1.2, times: [0, 0.2, 0.8, 1], ease: 'easeInOut' }}
        />
      )}

      {/* Reduced motion fallback for mastery */}
      {shouldAnimateEmber && shouldReduceMotion && (
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            border: `2px solid ${SURGE_TOKENS.surgeEmberHot}`,
          }}
        />
      )}

      {/* Header: Title AR */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-col min-w-0">
          <h3 className="text-lg sm:text-xl font-bold text-[#17181C] tracking-tight group-hover:text-[#17324D] transition-colors">
            {shelf.title_ar}
          </h3>
          {shelf.title_de && (
            <span
              className="text-xs font-mono font-medium text-stone-500 tracking-wide mt-0.5"
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {shelf.title_de}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Flaming Ember Furnace 'D' Button on Card for All Users */}
          {onOpenFurnace && (
            <FurnaceButton
              size="sm"
              currentCount={itemCount ?? 0}
              targetCount={shelf.target_entry_count || 25}
              onClick={(e) => onOpenFurnace(shelf, e!)}
            />
          )}

          {isMastered ? (
            <span className="shrink-0 text-[0.6875rem] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-900 border border-amber-600/30 flex items-center gap-1">
              <Check className="w-3 h-3 text-amber-600" />
              مُتقَن
            </span>
          ) : (
            <span className="shrink-0 text-[0.6875rem] font-medium px-2.5 py-1 rounded-full bg-emerald-950/10 text-emerald-800 border border-emerald-800/20">
              مفتوح
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {shelf.description_ar && (
        <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed mb-4">
          {shelf.description_ar}
        </p>
      )}

      {/* Footer tags + Item count */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-200/80 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {shelf.situation_tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[0.625rem] font-medium text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>

        {typeof itemCount === 'number' && (
          <span className="font-mono text-xs font-semibold text-[#17324D] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            {itemCount} عنصر
          </span>
        )}
      </div>
    </div>
  );
};
