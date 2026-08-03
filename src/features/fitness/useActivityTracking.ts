import { Geolocation } from '@capacitor/geolocation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getProfile } from '../wellness/wellnessDb';
import { insertFitnessActivity, listDailyMetrics, listFitnessActivities } from './api';
import {
  caloriesForSlice,
  computeSplits,
  elevationProfile,
  GeoKalmanFilter,
  haversine,
  speedToPace,
} from './metrics';
import { simplifyRoute } from './routeSimplifier';
import type { DailyMetric } from './stats';
import type { FitnessActivity, MotionState, RoutePoint, TrackSplit } from './types';

/** Haversine distance formula in meters (kept as the public engine helper). */
export const calculateHaversineDistance = haversine;

/** Reject fixes noisier than this (meters of horizontal accuracy). */
const MAX_ACCURACY_METERS = 35;
/** Minimum accepted movement between fixes — anything smaller is GPS drift. */
const MIN_STEP_METERS = 2.5;
/** Physically impossible sprint speed for a human on foot (m/s). */
const MAX_SPEED_MPS = 12;
/** Speed below which we consider the athlete stopped (m/s). */
const PAUSE_SPEED_MPS = 0.5;
/** Speed at which an auto-paused session resumes (m/s). */
const RESUME_SPEED_MPS = 0.9;
/** Sustained stillness before auto-pause kicks in (seconds). */
const AUTO_PAUSE_AFTER_SECONDS = 12;

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
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
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

  // Precision metrics
  const [isPaused, setIsPaused] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [currentSpeedMps, setCurrentSpeedMps] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [splits, setSplits] = useState<TrackSplit[]>([]);
  const [elevationGain, setElevationGain] = useState(0);

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
  const kalmanRef = useRef<GeoKalmanFilter>(new GeoKalmanFilter());
  const speedWindowRef = useRef<number[]>([]);
  const sessionRef = useRef({
    startTs: 0,
    distance: 0,
    calories: 0,
    movingMs: 0,
    stillSeconds: 0,
    paused: false,
    manualPaused: false,
    lastFixTs: 0,
  });

  // Sync refs with state to avoid closure issues in callbacks
  useEffect(() => {
    isTrackingRef.current = isTracking;
    motionStateRef.current = motionState;
    secondsSustainedRef.current = secondsSustained;
    secondsInactiveRef.current = secondsInactive;
  }, [isTracking, motionState, secondsSustained, secondsInactive]);

  // Mirrors of values the engine reads inside timers/callbacks (no stale closures)
  const weightRef = useRef(userWeight);
  const activityTypeRef = useRef<'walking' | 'running'>(activityType);
  const trackingSourceRef = useRef<'auto' | 'manual' | null>(trackingSource);
  const isSimulatedRef = useRef(isSimulated);
  const simulatedSpeedRef = useRef(simulatedSpeedMultiplier);

  useEffect(() => {
    weightRef.current = userWeight;
    activityTypeRef.current = activityType;
    trackingSourceRef.current = trackingSource;
    isSimulatedRef.current = isSimulated;
    simulatedSpeedRef.current = simulatedSpeedMultiplier;
  }, [userWeight, activityType, trackingSource, isSimulated, simulatedSpeedMultiplier]);

  // Load activities, device daily metrics and the athlete profile
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [list, metrics, profile] = await Promise.all([
        listFitnessActivities(),
        listDailyMetrics(120),
        getProfile(),
      ]);
      setActivities(list);
      setDailyMetrics(metrics);
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

  // --- Core Tracking Engine (Kalman filtered, auto-pause aware) ---

  /**
   * Ingests one raw GPS fix: filters noise, accumulates distance, moving time,
   * calories, elevation and manages auto-pause. Runs off refs (no re-render).
   */
  const ingestFix = useCallback(
    (raw: { lat: number; lng: number; timestamp: number; acc?: number; alt?: number }, simulated = false) => {
      const session = sessionRef.current;
      if (!isTrackingRef.current) return;

      const accuracy = raw.acc ?? (simulated ? 5 : 999);
      if (!simulated && accuracy > MAX_ACCURACY_METERS) return; // too noisy to trust

      const filtered = simulated
        ? { lat: raw.lat, lng: raw.lng, accuracy }
        : kalmanRef.current.process(raw.lat, raw.lng, accuracy, raw.timestamp);

      const point: RoutePoint = {
        lat: filtered.lat,
        lng: filtered.lng,
        timestamp: raw.timestamp,
        ...(typeof raw.alt === 'number' ? { alt: Math.round(raw.alt * 10) / 10 } : {}),
        acc: Math.round(filtered.accuracy),
      };

      const previous = routeRef.current[routeRef.current.length - 1];

      if (!previous) {
        routeRef.current = [point];
        session.lastFixTs = raw.timestamp;
        return;
      }

      const dtSeconds = Math.max(0, (raw.timestamp - previous.timestamp) / 1000);
      const stepMeters = haversine(previous, point);
      const speed = dtSeconds > 0 ? stepMeters / dtSeconds : 0;

      // Outlier rejection: teleports and static drift are discarded.
      if (!simulated && (speed > MAX_SPEED_MPS || stepMeters < MIN_STEP_METERS)) {
        speedWindowRef.current.push(0);
        if (speedWindowRef.current.length > 5) speedWindowRef.current.shift();
        session.lastFixTs = raw.timestamp;
        return;
      }

      speedWindowRef.current.push(speed);
      if (speedWindowRef.current.length > 5) speedWindowRef.current.shift();

      routeRef.current = [...routeRef.current, point];
      session.lastFixTs = raw.timestamp;

      if (!session.paused && !session.manualPaused) {
        session.distance += stepMeters;
        session.movingMs += dtSeconds * 1000;
        session.calories += caloriesForSlice(speed, dtSeconds, weightRef.current);
      }
    },
    []
  );

  /** Starts a GPS tracking session (manual or auto). */
  const startTracking = useCallback(
    async (source: 'auto' | 'manual', forceType?: 'walking' | 'running') => {
      if (isTrackingRef.current) return;

      const startTs = Date.now();
      sessionRef.current = {
        startTs,
        distance: 0,
        calories: 0,
        movingMs: 0,
        stillSeconds: 0,
        paused: false,
        manualPaused: false,
        lastFixTs: 0,
      };
      kalmanRef.current.reset();
      speedWindowRef.current = [];
      routeRef.current = [];

      setStartTime(startTs);
      setRoute([]);
      setDistanceMeters(0);
      setCalories(0);
      setDurationSeconds(0);
      setSplits([]);
      setElevationGain(0);
      setIsPaused(false);
      setAutoPaused(false);
      setCurrentSpeedMps(0);
      setGpsAccuracy(null);
      setTrackingSource(source);
      setSecondsInactive(0);
      setActivityType(forceType || (motionStateRef.current === 'running' ? 'running' : 'walking'));
      setIsTracking(true);
      isTrackingRef.current = true;

      if (!isSimulatedRef.current) {
        // Seed the first fix, then hand over to a continuous OS-level watch:
        // event-driven updates are far cheaper and more accurate than polling.
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
          ingestFix({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: pos.timestamp || Date.now(),
            acc: pos.coords.accuracy,
            alt: pos.coords.altitude ?? undefined,
          });
        } catch {
          /* the watch below may still deliver fixes */
        }

        try {
          watchIdRef.current = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 20000 },
            (pos, err) => {
              if (err || !pos) return;
              ingestFix({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: pos.timestamp || Date.now(),
                acc: pos.coords.accuracy,
                alt: pos.coords.altitude ?? undefined,
              });
            }
          );
        } catch (e) {
          console.error('Unable to start GPS watch:', e);
        }
      } else {
        // Simulation seeds a deterministic starting point (Riyadh).
        ingestFix({ lat: 24.7136, lng: 46.6753, timestamp: startTs, acc: 5, alt: 612 }, true);
      }

      // Single 1 Hz publisher: derives all live UI metrics from refs.
      gpsTimerRef.current = setInterval(() => {
        if (!isTrackingRef.current) return;
        const session = sessionRef.current;

        if (isSimulatedRef.current) {
          const last = routeRef.current[routeRef.current.length - 1];
          const step = motionStateRef.current === 'running' ? 0.00006 : 0.000022;
          const angle = (Date.now() - session.startTs) / 8000;
          if (last) {
            ingestFix(
              {
                lat: last.lat + step * Math.cos(angle) * simulatedSpeedRef.current,
                lng: last.lng + step * Math.sin(angle) * simulatedSpeedRef.current,
                timestamp: Date.now(),
                acc: 5,
                alt: (last.alt ?? 612) + Math.sin(angle * 3) * 0.8,
              },
              true
            );
          }
        }

        // Rolling speed (smoothed) + stale-fix decay
        const window = speedWindowRef.current;
        const staleFix = session.lastFixTs > 0 && Date.now() - session.lastFixTs > 8000;
        const smoothed = staleFix
          ? 0
          : window.length
            ? window.reduce((sum, v) => sum + v, 0) / window.length
            : 0;

        // Auto-pause / auto-resume
        if (!session.manualPaused) {
          if (smoothed < PAUSE_SPEED_MPS) {
            session.stillSeconds += 1;
            if (!session.paused && session.stillSeconds >= AUTO_PAUSE_AFTER_SECONDS) {
              session.paused = true;
              setAutoPaused(true);
              setIsPaused(true);
            }
          } else {
            session.stillSeconds = 0;
            if (session.paused && smoothed > RESUME_SPEED_MPS) {
              session.paused = false;
              setAutoPaused(false);
              setIsPaused(false);
            }
          }
        }

        if (!session.paused && !session.manualPaused) {
          // Moving time is authoritative; stationary seconds never inflate it.
          setDurationSeconds(Math.round(session.movingMs / 1000) || Math.round((Date.now() - session.startTs) / 1000));
        }

        setRoute(routeRef.current);
        setDistanceMeters(session.distance);
        setCalories(Math.round(session.calories * 10) / 10);
        setCurrentSpeedMps(Math.round(smoothed * 100) / 100);
        const lastPoint = routeRef.current[routeRef.current.length - 1];
        setGpsAccuracy(lastPoint?.acc ?? null);
        setSplits(computeSplits(routeRef.current));
        setElevationGain(elevationProfile(routeRef.current).gain);
      }, 1000);
    },
    [ingestFix]
  );

  /** Manually pause / resume the running session. */
  const togglePause = useCallback(() => {
    const session = sessionRef.current;
    session.manualPaused = !session.manualPaused;
    session.paused = session.manualPaused;
    session.stillSeconds = 0;
    setAutoPaused(false);
    setIsPaused(session.manualPaused);
  }, []);

  /** Ends the session, persists it to the cloud, and releases all sensors. */
  const stopTracking = useCallback(async () => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;

    if (gpsTimerRef.current) {
      clearInterval(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
    if (watchIdRef.current) {
      try {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } catch { /* noop */ }
      watchIdRef.current = null;
    }

    const session = sessionRef.current;
    const currentRoute = routeRef.current;
    const movingSeconds = Math.round(session.movingMs / 1000);
    const elapsedSeconds = Math.round((Date.now() - session.startTs) / 1000);
    const finalDuration = movingSeconds > 0 ? movingSeconds : elapsedSeconds;
    const finalDistance = session.distance;
    const finalCalories =
      session.calories > 0
        ? Math.round(session.calories * 10) / 10
        : estimateCalories(activityTypeRef.current, finalDuration, weightRef.current);

    // Persist only meaningful sessions (>= 10s of movement and real distance).
    if (finalDuration >= 10 && finalDistance >= 20 && currentRoute.length > 1) {
      try {
        const simplifiedRoute = simplifyRoute(currentRoute, 150);
        await insertFitnessActivity({
          activity_type: activityTypeRef.current,
          source: trackingSourceRef.current || 'manual',
          start_time: new Date(session.startTs).toISOString(),
          end_time: new Date().toISOString(),
          duration_seconds: finalDuration,
          distance_meters: Math.round(finalDistance * 10) / 10,
          calories: finalCalories,
          avg_heart_rate: null,
          route: simplifiedRoute,
        });
        refresh();
      } catch (e) {
        console.error('Error saving fitness activity:', e);
      }
    }

    setIsTracking(false);
    setTrackingSource(null);
    setStartTime(null);
    setIsPaused(false);
    setAutoPaused(false);
    setCurrentSpeedMps(0);
  }, [refresh]);

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
      let magnitude: number;
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
    dailyMetrics,
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
    isPaused,
    autoPaused,
    currentSpeedMps,
    currentPaceSecPerKm: speedToPace(currentSpeedMps),
    avgPaceSecPerKm: distanceMeters > 50 && durationSeconds > 0 ? (durationSeconds / distanceMeters) * 1000 : 0,
    gpsAccuracy,
    splits,
    elevationGain,
    togglePause,
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
