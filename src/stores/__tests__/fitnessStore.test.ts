import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFitnessStore } from '../fitnessStore';

describe('useFitnessStore Zustand Engine', () => {
  const userId = '5c4deb4d-3b7d-4bad-9bdd-2b0d7b3dcb7a';

  beforeEach(() => {
    useFitnessStore.setState({
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
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start activity tracking and configure initial states', () => {
    const store = useFitnessStore.getState();
    const result = store.startActivity('running', userId);

    expect(result.success).toBe(true);
    const updated = useFitnessStore.getState();
    expect(updated.isTracking).toBe(true);
    expect(updated.currentActivity).not.toBeNull();
    expect(updated.currentActivity?.type).toBe('running');
    expect(updated.currentActivity?.user_id).toBe(userId);
  });

  it('should reject starting another activity if one is already in progress', () => {
    const store = useFitnessStore.getState();
    store.startActivity('walking', userId);

    const secondStart = useFitnessStore.getState().startActivity('cycling', userId);
    expect(secondStart.success).toBe(false);
    expect(secondStart.error).toBeDefined();
    expect(useFitnessStore.getState().currentActivity?.type).toBe('walking');
  });

  it('should reject static GPS drift during coordinate update', () => {
    const store = useFitnessStore.getState();
    store.startActivity('walking', userId);

    // Initial position
    const pos1 = { lat: 24.7136, lng: 46.6753, timestamp: new Date().toISOString() };
    const res1 = useFitnessStore.getState().addCoordinate(pos1);
    expect(res1.accepted).toBe(true);

    // Add coordinate with identical lat/lng representing static drift
    const pos2 = { lat: 24.7136, lng: 46.6753, timestamp: new Date().toISOString() };
    const res2 = useFitnessStore.getState().addCoordinate(pos2);

    expect(res2.accepted).toBe(false);
    expect(res2.reason).toContain('Static GPS drift filtered');
  });

  it('should accept real coordinate moves and compute elapsed distance', () => {
    const store = useFitnessStore.getState();
    store.startActivity('walking', userId);

    // Use a 30-second window for around 150m move to ensure speed is ~5 m/s (well below 15 m/s limit)
    const pos1 = { lat: 24.7136, lng: 46.6753, timestamp: new Date(Date.now() - 30000).toISOString() };
    const pos2 = { lat: 24.7146, lng: 46.6763, timestamp: new Date().toISOString() };

    useFitnessStore.getState().addCoordinate(pos1);
    const res2 = useFitnessStore.getState().addCoordinate(pos2);

    expect(res2.accepted).toBe(true);
    expect(useFitnessStore.getState().currentActivity?.distance_meters).toBeGreaterThan(0);
    expect(useFitnessStore.getState().activeMetrics.currentSpeedMps).toBeGreaterThan(0);
  });

  it('should reject extreme teleportation speed spikes', () => {
    const store = useFitnessStore.getState();
    store.startActivity('walking', userId);

    const pos1 = { lat: 24.7136, lng: 46.6753, timestamp: new Date(Date.now() - 1000).toISOString() };
    const pos2 = { lat: 25.7136, lng: 47.6753, timestamp: new Date().toISOString() }; // giant shift in 1s (impossible speed)

    useFitnessStore.getState().addCoordinate(pos1);
    const res2 = useFitnessStore.getState().addCoordinate(pos2);

    expect(res2.accepted).toBe(false);
    expect(res2.reason).toContain('Speed anomaly filtered');
  });

  it('should stop tracking, compute metrics and persist completed activity', () => {
    const store = useFitnessStore.getState();
    store.startActivity('running', userId);

    const stopRes = useFitnessStore.getState().stopActivity();
    expect(stopRes.success).toBe(true);
    expect(stopRes.activity).not.toBeNull();
    expect(stopRes.activity?.end_time).not.toBeNull();

    const finalState = useFitnessStore.getState();
    expect(finalState.isTracking).toBe(false);
    expect(finalState.currentActivity).toBeNull();
    expect(finalState.activities).toHaveLength(1);
    expect(finalState.activities[0].type).toBe('running');
  });
});
