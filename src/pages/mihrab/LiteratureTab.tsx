import React, { lazy, Suspense } from 'react';

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
const DiwanLibraryPage = lazy(() => import('@/features/diwan/pages/Library'));

const LibrarySkeleton = () => (
  <div className="space-y-2 pt-1">
    <div className="h-24 rounded-xl animate-pulse bg-muted/30" />
    <div className="h-16 rounded-xl animate-pulse bg-muted/20" />
    <div className="h-20 rounded-xl animate-pulse bg-muted/25" />
  </div>
);

export default function LiteratureTab() {
  return (
    <div className="w-full">
      <Suspense fallback={<LibrarySkeleton />}>
        <DiwanLibraryPage tab />
      </Suspense>
    </div>
  );
}
