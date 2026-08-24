import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { invalidateStreakStore } from '@/features/profile/lib/streakStore';
import { recordAppVisit, seedHistoricalVisitsIfEmpty } from '@/features/profile/lib/visitTracker';

/**
 * Hook that listens to route changes and records real user application/site visits.
 */
export function useVisitTracker() {
  const location = useLocation();
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Seed baseline visits on initial mount if empty
  useEffect(() => {
    seedHistoricalVisitsIfEmpty();
    recordAppVisit(location.pathname);
  }, []);

  // Track route visits
  useEffect(() => {
    const currentPath = location.pathname;
    const now = Date.now();
    const durationSecs = Math.max(1, Math.round((now - sessionStartTimeRef.current) / 1000));

    recordAppVisit(currentPath, durationSecs);
    sessionStartTimeRef.current = now;
    // A new visit may extend today's streak — refresh every live consumer.
    invalidateStreakStore();
     
  }, [location.pathname]);
}

/**
 * Component runner for App.tsx
 */
export function VisitTrackerRunner() {
  useVisitTracker();
  return null;
}
