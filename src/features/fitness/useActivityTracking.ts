import { useCallback, useEffect, useRef, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { getProfile } from '../wellness/wellnessDb';
import { insertFitnessActivity, listFitnessActivities } from './api';
import type { FitnessActivity, MotionState, RoutePoint } from './types';

// Haversine distance formula in meters
export function calculateHaversineDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// MET values for basic activities
export const MET_VALUES = {
  walking: 3.8,
  running: 8.5,
};

// Calculate calories based on activity type, duration, and user weight
export function estimateCalories(
  activityType: 'walking' | 'running',
  durationSeconds: number,
  weightKg: number
): number {
  const met = MET_VALUES[activityType] || 4.0;
  // MET formula: Calories = MET * 3.5 * weightKg / 200 * (durationSeconds / 60)
  const calories = met * 3.5 * (weightKg / 200) * (durationSeconds / 60);
  return Math.round(calories * 10) / 10; // Round to 1 decimal place
}

export function useActivityTracking() {
  const [activities, setActivities] = useState<FitnessActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<string>('prompt');

  // Real-time tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [trackingSource, setTrackingSource] = useState<'auto' | 'manual' | null>(null);
  const [activityType, setActivityType] = useState<'walking' | 'running'>('walking');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [calories, setCalories] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Background Auto-Detection Settings
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(() => {
    try {
      return localStorage.getItem('fitness:autoDetect') === 'true';
    } catch {
      return false;
    }
  });

  // Motion analysis states
  const [motionState, setMotionState] = useState<MotionState>('resting');
  const [accelMagnitude, setAccelMagnitude] = useState(0);
  const [secondsSustained, setSecondsSustained] = useState(0);
  const [secondsInactive, setSecondsInactive] = useState(0);

  // Simulation mode
  const [isSimulated, setIsSimulated] = useState(false);
  const [simulatedSpeedMultiplier, setSimulatedSpeedMultiplier] = useState(1); // 1x, 5x, 10x

  // Athlete Profile weight cache
  const [userWeight, setUserWeight] = useState(75); // Fallback weight

  // Refs for background interval operations and real-time state holding
  const watchIdRef = useRef<string | null>(null);
  const routeRef = useRef<RoutePoint[]>([]);
  const isTrackingRef = useRef(false);
  const motionStateRef = useRef<MotionState>('resting');
  const secondsSustainedRef = useRef(0);
  const secondsInactiveRef = useRef(0);
  const gpsTimerRef = useRef<any>(null);
  const motionTimerRef = useRef<any>(null);

  // Sync refs with state to avoid closure issues in callbacks
  useEffect(() => {
    isTrackingRef.current = isTracking;
    routeRef.current = route;
    motionStateRef.current = motionState;
    secondsSustainedRef.current = secondsSustained;
    secondsInactiveRef.current = secondsInactive;
  }, [isTracking, route, motionState, secondsSustained, secondsInactive]);

  // Load activities and user profile
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [list, profile] = await Promise.all([
        listFitnessActivities(),
        getProfile(),
      ]);
      setActivities(list);
      if (profile && profile.weightKg) {
        setUserWeight(profile.weightKg);
      }
    } catch (e) {
      console.error('Error refreshing activity data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    refresh();
    checkPermissions();
  }, [refresh]);

  // Check location permission state
  const checkPermissions = async () => {
    try {
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const perm = await Geolocation.checkPermissions();
        setPermissionState(perm.location);
      } else {
        // Web fallback
        if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: 'geolocation' as any });
          setPermissionState(status.state);
        }
      }
    } catch {
      setPermissionState('prompt');
    }
  };

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const perm = await Geolocation.requestPermissions({ permissions: ['location'] });
        setPermissionState(perm.location);
        return perm.location === 'granted';
      } else {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              setPermissionState('granted');
              resolve(true);
            },
            () => {
              setPermissionState('denied');
              resolve(false);
            }
          );
        });
      }
    } catch (e) {
      console.error('Permission request failed:', e);
      return false;
    }
  };

  // Toggle Auto-Detection setting
  const toggleAutoDetect = useCallback((enabled: boolean) => {
    setAutoDetectEnabled(enabled);
    try {
      localStorage.setItem('fitness:autoDetect', String(enabled));
    } catch { /* noop */ }
  }, []);

  // --- Core Tracking Start & Stop Logic ---

  // Starts a GPS tracking session (manual or auto)
  const startTracking = useCallback(async (source: 'auto' | 'manual', forceType?: 'walking' | 'running') => {
    if (isTrackingRef.current) return;

    // Reset session states
    const startTs = Date.now();
    setStartTime(startTs);
    setRoute([]);
    setDistanceMeters(0);
    setCalories(0);
    setDurationSeconds(0);
    setTrackingSource(source);
    setIsTracking(true);
    setActivityType(forceType || (motionStateRef.current === 'running' ? 'running' : 'walking'));

    // Reset inactivity counter
    setSecondsInactive(0);

    // Initial location grab
    let startPoint: RoutePoint | null = null;
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
      });
      startPoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: pos.timestamp || Date.now(),
      };
      setRoute([startPoint]);
    } catch {
      // Mock initial point if location fails (especially on web desktop or offline)
      startPoint = {
        lat: 24.7136, // Riyadh
        lng: 46.6753,
        timestamp: Date.now(),
      };
      setRoute([startPoint]);
    }

    // High frequency point-sampling interval (every 3 seconds)
    const samplingInterval = 3000;
    gpsTimerRef.current = setInterval(async () => {
      if (!isTrackingRef.current) return;

      const duration = Math.round((Date.now() - startTs) / 1000);
      setDurationSeconds(duration);

      let nextPoint: RoutePoint;
      if (isSimulated) {
        // Generate continuous simulated route points for high-fidelity visualization
        const last = routeRef.current[routeRef.current.length - 1] || startPoint;
        const speed = motionStateRef.current === 'running' ? 0.0003 : 0.0001; // lat/lng change per tick
        // Create an organic curve shape
        const angle = duration * 0.05;
        nextPoint = {
          lat: last.lat + speed * Math.cos(angle) * simulatedSpeedMultiplier,
          lng: last.lng + speed * Math.sin(angle) * simulatedSpeedMultiplier,
          timestamp: Date.now(),
        };
      } else {
        try {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 3000,
          });
          nextPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: pos.timestamp || Date.now(),
          };
        } catch {
          // Graceful fallback for simulator when GPS drops
          const last = routeRef.current[routeRef.current.length - 1] || startPoint;
          nextPoint = {
            lat: last!.lat + 0.00002,
            lng: last!.lng + 0.00002,
            timestamp: Date.now(),
          };
        }
      }

      setRoute((prev) => {
        const updated = [...prev, nextPoint];
        // Calculate new cumulative distance
        let totalD = 0;
        for (let i = 0; i < updated.length - 1; i++) {
          totalD += calculateHaversineDistance(updated[i], updated[i + 1]);
        }
        setDistanceMeters(totalD);

        // Live MET-based Calories burn calculation
        const activeType = motionStateRef.current === 'running' ? 'running' : 'walking';
        setCalories(estimateCalories(activeType, duration, userWeight));

        return updated;
      });

    }, samplingInterval);

  }, [isSimulated, simulatedSpeedMultiplier, userWeight]);

  // Ends a GPS tracking session, saves metrics to DB, clears interval
  const stopTracking = useCallback(async () => {
    if (!isTrackingRef.current) return;

    // Clear GPS watch timer
    if (gpsTimerRef.current) {
      clearInterval(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }

    const currentRoute = routeRef.current;
    const finalDuration = Math.round((Date.now() - (startTime || Date.now())) / 1000);

    // Calculate final distance
    let finalDistance = 0;
    for (let i = 0; i < currentRoute.length - 1; i++) {
      finalDistance += calculateHaversineDistance(currentRoute[i], currentRoute[i + 1]);
    }

    const finalCalories = estimateCalories(activityType, finalDuration, userWeight);

    // Persist activity to Supabase if valid points exist
    if (finalDuration >= 5 && currentRoute.length > 0) {
      try {
        await insertFitnessActivity({
          activity_type: activityType,
          source: trackingSource || 'manual',
          start_time: new Date(startTime || Date.now()).toISOString(),
          end_time: new Date().toISOString(),
          duration_seconds: finalDuration,
          distance_meters: Math.round(finalDistance * 10) / 10,
          calories: finalCalories,
          avg_heart_rate: null,
          route: currentRoute,
        });
        refresh();
      } catch (e) {
        console.error('Error saving fitness activity:', e);
      }
    }

    // Reset state
    setIsTracking(false);
    setTrackingSource(null);
    setStartTime(null);
  }, [activityType, startTime, trackingSource, userWeight, refresh]);

  // --- Motion Detection Engine ---

  // Setup motion sensors
  useEffect(() => {
    if (!autoDetectEnabled) {
      setMotionState('resting');
      setAccelMagnitude(0);
      setSecondsSustained(0);
      return;
    }

    // High frequency accelerometer monitor (1 second checks)
    const accelSamples: number[] = [];

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      // Use acceleration excluding gravity first, fallback to with gravity
      const accel = e.acceleration || e.accelerationIncludingGravity;
      if (!accel) return;

      const x = accel.x || 0;
      const y = accel.y || 0;
      const z = accel.z || 0;

      // Filter gravity offset if including gravity
      let magnitude = 0;
      if (e.acceleration) {
        magnitude = Math.sqrt(x * x + y * y + z * z);
      } else {
        magnitude = Math.abs(Math.sqrt(x * x + y * y + z * z) - 9.80665);
      }

      accelSamples.push(magnitude);
      if (accelSamples.length > 20) accelSamples.shift(); // keep sliding window of last 20 frames

      // Compute average acceleration intensity
      const avg = accelSamples.reduce((sum, val) => sum + val, 0) / (accelSamples.length || 1);
      setAccelMagnitude(Math.round(avg * 100) / 100);

      // Classify motion state
      if (avg > 2.5) {
        setMotionState('running');
      } else if (avg > 0.6) {
        setMotionState('walking');
      } else {
        setMotionState('resting');
      }
    };

    // Listen on window
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    // Continuous 1-second ticks to evaluate state changes and handle Auto-Start / Auto-End timers
    motionTimerRef.current = setInterval(() => {
      // Bypassed if in simulation mode (it handles its own logic)
      if (isSimulated) return;

      const activeState = motionStateRef.current;
      const currentlyTracking = isTrackingRef.current;

      if (activeState === 'walking' || activeState === 'running') {
        // Sustained activity
        setSecondsInactive(0);
        setSecondsSustained((prev) => {
          const next = prev + 1;
          // Sustained walking/running for more than 1 minute (60 seconds) starts a session
          if (next >= 60 && !currentlyTracking) {
            startTracking('auto', activeState);
          }
          return next;
        });
      } else {
        // resting/idle
        setSecondsSustained(0);
        if (currentlyTracking && trackingSource === 'auto') {
          setSecondsInactive((prev) => {
            const next = prev + 1;
            // Dropping below threshold for 2 minutes (120 seconds) automatically ends the session
            if (next >= 120) {
              stopTracking();
            }
            return next;
          });
        }
      }
    }, 1000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
      if (motionTimerRef.current) {
        clearInterval(motionTimerRef.current);
      }
    };
  }, [autoDetectEnabled, isSimulated, startTracking, stopTracking, trackingSource]);

  // --- Simulation Controller Methods ---

  const simulateMotion = useCallback((state: MotionState) => {
    setMotionState(state);
    const mockAccel = state === 'running' ? 3.8 : state === 'walking' ? 1.2 : 0.05;
    setAccelMagnitude(mockAccel);

    if (state === 'resting') {
      setSecondsSustained(0);
    } else {
      setSecondsInactive(0);
    }
  }, []);

  // Tick simulation time forward for quick review checks (bypasses actual 60s/120s waiting)
  const triggerSimulatedTick = useCallback((secondsToAdd: number) => {
    const currentState = motionStateRef.current;
    const currentlyTracking = isTrackingRef.current;

    if (currentState === 'walking' || currentState === 'running') {
      setSecondsInactive(0);
      setSecondsSustained((prev) => {
        const next = prev + secondsToAdd;
        if (next >= 60 && !currentlyTracking) {
          startTracking('auto', currentState);
        }
        return next;
      });
    } else {
      setSecondsSustained(0);
      if (currentlyTracking && trackingSource === 'auto') {
        setSecondsInactive((prev) => {
          const next = prev + secondsToAdd;
          if (next >= 120) {
            stopTracking();
          }
          return next;
        });
      }
    }
  }, [startTracking, stopTracking, trackingSource]);

  return {
    activities,
    loading,
    permissionState,
    isTracking,
    trackingSource,
    activityType,
    startTime,
    route,
    distanceMeters,
    calories,
    durationSeconds,
    autoDetectEnabled,
    motionState,
    accelMagnitude,
    secondsSustained,
    secondsInactive,
    isSimulated,
    simulatedSpeedMultiplier,
    toggleAutoDetect,
    startTracking,
    stopTracking,
    requestLocationPermission,
    checkPermissions,
    setIsSimulated,
    setSimulatedSpeedMultiplier,
    simulateMotion,
    triggerSimulatedTick,
    refresh,
  };
}
