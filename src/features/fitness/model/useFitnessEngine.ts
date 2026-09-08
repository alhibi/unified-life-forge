import { Geolocation } from '@capacitor/geolocation';
import { useCallback, useEffect, useRef } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { useFitnessStore } from '@/stores/fitnessStore';
import { GeoCoordinate } from '@/utils/validation/schemas';

import { estimateCalories } from '../useActivityTracking';

/**
 * Fitness engine binding.
 *
 * Two correctness rules live here:
 *
 * 1. **No whole-store subscription.** Every GPS sample writes to the store, so
 *    reading the store object wholesale re-rendered every consumer at watch
 *    frequency. Each field is selected individually instead.
 * 2. **The GPS watch can never outlive the component.** `watchPosition` is
 *    async: if the component unmounts before the promise settles, a cleanup
 *    that reads a local `let` sees `null` and the OS watch runs for the rest of
 *    the process lifetime. The id is stored in a ref and a `cancelled` flag
 *    clears any watch that resolves after teardown.
 */
export function useFitnessEngine() {
  const isTracking = useFitnessStore((s) => s.isTracking);
  const currentActivity = useFitnessStore((s) => s.currentActivity);
  const activities = useFitnessStore((s) => s.activities);
  const totalDistance = useFitnessStore((s) => s.totalDistance);
  const addCoordinate = useFitnessStore((s) => s.addCoordinate);
  const startActivity = useFitnessStore((s) => s.startActivity);
  const stopActivity = useFitnessStore((s) => s.stopActivity);
  const userId = useAuthStore((state) => state.user?.id);

  const watchIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isTracking) return;
    let cancelled = false;

    const clear = (id: string) => {
      Geolocation.clearWatch({ id }).catch(() => {});
    };

    void (async () => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') await Geolocation.requestPermissions();
        if (cancelled) return;
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          (position, err) => {
            if (cancelled || err || !position) return;
            const coord: GeoCoordinate = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              alt: position.coords.altitude,
              timestamp: new Date(position.timestamp).toISOString(),
            };
            addCoordinate(coord);
          },
        );
        // Unmounted while the watch was being registered — clear it now, the
        // cleanup below already ran and saw an empty ref.
        if (cancelled) {
          clear(id);
          return;
        }
        watchIdRef.current = id;
      } catch {
        /* geolocation watch errors are non-fatal */
      }
    })();

    return () => {
      cancelled = true;
      const id = watchIdRef.current;
      watchIdRef.current = null;
      if (id) clear(id);
    };
  }, [isTracking, addCoordinate]);

  const startTracking = useCallback(
    (type: 'walking' | 'running' | 'cycling') => {
      if (!userId) return;
      startActivity(type, userId);
    },
    [userId, startActivity],
  );

  const stopTracking = useCallback(() => {
    stopActivity();
  }, [stopActivity]);

  return {
    isTracking,
    currentActivity,
    activities,
    totalDistance,
    startTracking,
    stopTracking,
    currentCalories: currentActivity
      ? estimateCalories(
          currentActivity.type as 'walking' | 'running',
          Math.floor(
            (new Date().getTime() - new Date(currentActivity.start_time).getTime()) / 1000,
          ),
          70,
        )
      : 0,
  };
}
