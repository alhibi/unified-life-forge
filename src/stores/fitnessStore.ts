import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { haversineDistance } from '../utils/helpers/math';
import { FitnessActivity, FitnessActivitySchema, GeoCoordinate, GeoCoordinateSchema } from '../utils/validation/schemas';

// ============================================================================
// State & Action Interfaces
// ============================================================================

export interface FitnessState {
  activities: FitnessActivity[];
  currentActivity: FitnessActivity | null;
  isTracking: boolean;
  totalDistance: number;
  lastSyncTime: string | null;
  activeMetrics: {
    averageSpeedMps: number;
    currentSpeedMps: number;
    caloriesBurnedEst: number;
  };
}

export interface FitnessActions {
  /**
   * Starts tracking a new fitness activity of the specified type.
   * Safety guard: prevents starting if tracking is already active.
   */
  startActivity: (type: FitnessActivity['type'], userId: string) => { success: boolean; error: string | null };

  /**
   * Completes tracking of the active activity, compiles duration, parses against strict Zod schema,
   * saves to activities log, and updates accumulated statistics.
   */
  stopActivity: () => { success: boolean; activity: FitnessActivity | null; error: string | null };

  /**
   * Adds a GeoCoordinate to the active route, filters noise, rejects GPS static drift and excess speed spikes,
   * and calculates real-time metrics (speed, distance, and calories).
   */
  addCoordinate: (coord: GeoCoordinate) => { accepted: boolean; reason: string | null };

  /**
   * Clears all activity history and resets statistics.
   */
  clearHistory: () => void;

  /**
   * Updates last-sync time for Supabase/offline queues.
   */
  recordSync: () => void;
}

const initialFitnessState: FitnessState = {
  activities: [],
  currentActivity: null,
  isTracking: false,
  totalDistance: 0,
  lastSyncTime: null,
  activeMetrics: {
    averageSpeedMps: 0,
    currentSpeedMps: 0,
    caloriesBurnedEst: 0,
  },
};

// ============================================================================
// Precision Instrument Fitness Engine Store
// ============================================================================

export const useFitnessStore = create<FitnessState & FitnessActions>()(
  persist(
    (set, get) => ({
      ...initialFitnessState,

      startActivity: (type, userId) => {
        const state = get();
        if (state.isTracking) {
          return { success: false, error: 'Cannot start: An activity is already tracking.' };
        }

        const newActivity: FitnessActivity = {
          id: crypto.randomUUID(),
          user_id: userId,
          type,
          start_time: new Date().toISOString(),
          end_time: null,
          distance_meters: 0,
          duration_seconds: 0,
          calories_burned: 0,
          route_coordinates: [],
        };

        set({
          isTracking: true,
          currentActivity: newActivity,
          activeMetrics: {
            averageSpeedMps: 0,
            currentSpeedMps: 0,
            caloriesBurnedEst: 0,
          },
        });

        return { success: true, error: null };
      },

      stopActivity: () => {
        const state = get();
        if (!state.currentActivity) {
          return { success: false, activity: null, error: 'No active activity is tracking' };
        }

        const endTime = new Date().toISOString();
        const startTime = new Date(state.currentActivity.start_time).getTime();
        const durationSec = Math.floor((new Date(endTime).getTime() - startTime) / 1000);

        // Calculate final calorie burn estimation based on activity METs (Metabolic Equivalent of Task)
        // METs: Cycling=8, Running=10, Hiking=6, Walking=3.5, Swimming=7
        let met = 4;
        switch (state.currentActivity.type) {
          case 'walking': met = 3.5; break;
          case 'hiking': met = 6.0; break;
          case 'swimming': met = 7.0; break;
          case 'cycling': met = 8.0; break;
          case 'running': met = 10.0; break;
        }

        // Calories = MET * 3.5 * weight_kg (default 75kg) / 200 * duration_mins
        const durationMin = durationSec / 60;
        const calories = Math.round(met * 3.5 * 75 / 200 * durationMin);

        const completedActivity: FitnessActivity = {
          ...state.currentActivity,
          end_time: endTime,
          duration_seconds: durationSec,
          calories_burned: calories,
        };

        try {
          // Parse completed activity with strict Zod validator
          const validatedActivity = FitnessActivitySchema.parse(completedActivity);

          set({
            isTracking: false,
            currentActivity: null,
            activities: [...state.activities, validatedActivity],
            totalDistance: state.totalDistance + validatedActivity.distance_meters,
            activeMetrics: {
              averageSpeedMps: 0,
              currentSpeedMps: 0,
              caloriesBurnedEst: 0,
            },
          });

          return { success: true, activity: validatedActivity, error: null };
        } catch (err: any) {
          console.error('[FitnessStore] Completed activity schema violation:', err);
          return { success: false, activity: null, error: err?.message || 'Schema violation' };
        }
      },

      addCoordinate: (coord) => {
        const state = get();
        if (!state.currentActivity || !state.isTracking) {
          return { accepted: false, reason: 'No active tracking session' };
        }

        try {
          // Validate input coordinate format
          const validatedCoord = GeoCoordinateSchema.parse(coord);
          const coordsList = state.currentActivity.route_coordinates;
          const lastCoord = coordsList.length > 0 ? coordsList[coordsList.length - 1] : null;

          let addedDistance = 0;
          let currentSpeed = 0;

          if (lastCoord) {
            addedDistance = haversineDistance(
              lastCoord.lat,
              lastCoord.lng,
              validatedCoord.lat,
              validatedCoord.lng
            );

            const lastTime = new Date(lastCoord.timestamp || state.currentActivity.start_time).getTime();
            const currTime = new Date(validatedCoord.timestamp || new Date().toISOString()).getTime();
            const timeDiffSec = (currTime - lastTime) / 1000;

            currentSpeed = timeDiffSec > 0 ? addedDistance / timeDiffSec : 0;

            // GPS Noise Filters:
            // 1. Static Drift: Ignore updates with <1 meter of movement
            // 2. Teleportation Spike: Ignore speed updates exceeding 15 m/s (54 km/h) unless cycling
            const maxSpeedLimit = state.currentActivity.type === 'cycling' ? 25 : 15;
            if (addedDistance < 1) {
              return { accepted: false, reason: 'Static GPS drift filtered' };
            }
            if (currentSpeed > maxSpeedLimit) {
              return { accepted: false, reason: 'Speed anomaly filtered (GPS teleportation spike)' };
            }
          }

          const newDistance = state.currentActivity.distance_meters + addedDistance;
          const newCoords = [...coordsList, validatedCoord];

          // Re-estimate average speed
          const elapsedSec = Math.floor(
            (new Date(validatedCoord.timestamp || new Date().toISOString()).getTime() -
              new Date(state.currentActivity.start_time).getTime()) /
              1000
          );
          const avgSpeed = elapsedSec > 0 ? newDistance / elapsedSec : 0;

          // MET estimate
          let met = 4;
          switch (state.currentActivity.type) {
            case 'walking': met = 3.5; break;
            case 'hiking': met = 6.0; break;
            case 'swimming': met = 7.0; break;
            case 'cycling': met = 8.0; break;
            case 'running': met = 10.0; break;
          }
          const caloriesEst = Math.round(met * 3.5 * 75 / 200 * (elapsedSec / 60));

          set({
            currentActivity: {
              ...state.currentActivity,
              distance_meters: newDistance,
              route_coordinates: newCoords,
            },
            activeMetrics: {
              averageSpeedMps: avgSpeed,
              currentSpeedMps: currentSpeed,
              caloriesBurnedEst: caloriesEst,
            },
          });

          return { accepted: true, reason: null };
        } catch (err: any) {
          console.error('[FitnessStore] Coordinate schema violation:', err);
          return { accepted: false, reason: err?.message || 'Invalid format' };
        }
      },

      clearHistory: () => set(initialFitnessState),

      recordSync: () => set({ lastSyncTime: new Date().toISOString() }),
    }),
    {
      name: 'zen-elite-fitness-store',
      storage: createJSONStorage(() => localStorage),
      // Selectively persist compiled historical logs, while keeping live session metrics out of localstorage
      partialize: (state) => ({
        activities: state.activities,
        totalDistance: state.totalDistance,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
