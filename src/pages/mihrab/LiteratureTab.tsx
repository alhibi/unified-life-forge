import React, { useState, lazy, Suspense } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { Leaf, ChevronLeft, ChevronRight } from '@/lib/icons';

/**
 * Mihrab → Literature tab.
 *
 * Embeds the existing Diwan adab.com library (`DiwanLibraryPage`)
 * directly inside the tab. The library already supports `tab` mode
 * (it was the home of the legacy `/diwan` tab), so it slots in here
 * with no further modification — its surahs/poets/timeline UI is
 * structurally a tab body.
 *
 * Adds a single placeholder card for the upcoming "مختارات /
 * Selections" feature so the user knows where it will live.
 */

// Lazy because the library data is large; defer until the user
// actually opens the Literature tab.
const DiwanLibraryPage = lazy(() => import('../diwan/Library'));

const LibrarySkeleton = () => (
  <div className="space-y-2 pt-1">
    <div className="h-24 rounded-xl animate-pulse bg-muted/30" />
    <div className="h-16 rounded-xl animate-pulse bg-muted/20" />
    <div className="h-20 rounded-xl animate-pulse bg-muted/25" />
  </div>
);

export default function LiteratureTab() {
  const { language, dir } = useApp();
  const isAr = language === 'ar';
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const [showSoon, setShowSoon] = useState(false);
  const onSelectionsClick = () => {
    setShowSoon(true);
    window.setTimeout(() => setShowSoon(false), 1200);
  };

  return (
    <div className="space-y-3">
      {/* Placeholder for upcoming Selections feature */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onSelectionsClick}
        className="surface-depth surface-depth-pressable w-full flex items-center gap-3 p-4 rounded-2xl opacity-80 text-start"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Leaf className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {showSoon
              ? (isAr ? 'قريباً' : 'Bald verfügbar')
              : (isAr ? 'مختارات' : 'Auswahl')}
          </p>
          {!showSoon && (
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              {isAr
                ? 'قطوف منتقاة من القصائد والنصوص الأدبية. (قريباً)'
                : 'Ausgewählte Gedichte und literarische Texte — bald verfügbar.'}
            </p>
          )}
        </div>
        <Arrow className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.button>

      {/* Embedded Diwan library — already supports tab mode */}
      <Suspense fallback={<LibrarySkeleton />}>
        <DiwanLibraryPage tab />
      </Suspense>
    </div>
  );
}
