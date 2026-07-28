// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { calculateHaversineDistance, estimateCalories } from '../useActivityTracking';

// Mock Geolocation and Supabase to isolate tests
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
    getCurrentPosition: vi.fn().mockResolvedValue({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: 1600000000000,
    }),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'mock-user-id' } } },
      }),
    },
  },
}));

describe('Fitness Feature Activity Tracking Engine Tests', () => {
  describe('calculateHaversineDistance (Haversine Formula)', () => {
    it('returns 0 meters for the exact same coordinate', () => {
      const p = { lat: 24.7136, lng: 46.6753 };
      const dist = calculateHaversineDistance(p, p);
      expect(dist).toBe(0);
    });

    it('accurately computes distance between two different coordinates', () => {
      // Riyadh Center to King Khalid Airport (approx 29.5 km or 29500 meters)
      const p1 = { lat: 24.7136, lng: 46.6753 };
      const p2 = { lat: 24.9576, lng: 46.6988 };
      const dist = calculateHaversineDistance(p1, p2);

      // Expected distance is approx 27-30 km
      expect(dist).toBeGreaterThan(26000);
      expect(dist).toBeLessThan(31000);
    });

    it('computes small micro-movements correctly', () => {
      const p1 = { lat: 24.7136, lng: 46.6753 };
      const p2 = { lat: 24.7137, lng: 46.6754 }; // tiny shift
      const dist = calculateHaversineDistance(p1, p2);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(25);
    });
  });

  describe('estimateCalories (MET-based Calculations)', () => {
    it('computes walking calorie burn correctly based on weight and duration', () => {
      // 1 hour (3600 seconds) of walking for a 70kg user
      // Formula: MET (3.8) * 3.5 * weightKg (70) / 200 * (3600 / 60)
      // = 3.8 * 3.5 * 0.35 * 60 = 279.3 kcal
      const calories = estimateCalories('walking', 3600, 70);
      expect(calories).toBeCloseTo(279.3, 1);
    });

    it('computes running calorie burn correctly based on weight and duration', () => {
      // 30 mins (1800 seconds) of running for an 80kg user
      // Formula: MET (8.5) * 3.5 * weightKg (80) / 200 * (1800 / 60)
      // = 8.5 * 3.5 * 0.40 * 30 = 357 kcal
      const calories = estimateCalories('running', 1800, 80);
      expect(calories).toBeCloseTo(357, 1);
    });

    it('returns 0 calories when duration is 0', () => {
      const calories = estimateCalories('walking', 0, 75);
      expect(calories).toBe(0);
    });
  });
});
