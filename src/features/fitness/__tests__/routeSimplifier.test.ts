// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { getPerpendicularDistance, simplifyRoute,simplifyRouteFixed } from '../routeSimplifier';
import type { RoutePoint } from '../types';

describe('Route Simplification Engine Tests', () => {
  describe('getPerpendicularDistance', () => {
    it('returns distance of a point from a vertical segment', () => {
      const p: RoutePoint = { lat: 1, lng: 1, timestamp: 0 };
      const start: RoutePoint = { lat: 0, lng: 0, timestamp: 0 };
      const end: RoutePoint = { lat: 2, lng: 0, timestamp: 0 };
      const dist = getPerpendicularDistance(p, start, end);
      expect(dist).toBeCloseTo(1, 4);
    });

    it('returns distance when start and end are the same point', () => {
      const p: RoutePoint = { lat: 1, lng: 1, timestamp: 0 };
      const start: RoutePoint = { lat: 0, lng: 0, timestamp: 0 };
      const dist = getPerpendicularDistance(p, start, start);
      expect(dist).toBeCloseTo(Math.sqrt(2), 4);
    });
  });

  describe('simplifyRouteFixed', () => {
    it('returns coordinates unmodified if points are 2 or fewer', () => {
      const pts: RoutePoint[] = [
        { lat: 10, lng: 10, timestamp: 0 },
        { lat: 10.01, lng: 10.01, timestamp: 0 },
      ];
      const simplified = simplifyRouteFixed(pts, 1);
      expect(simplified).toHaveLength(2);
      expect(simplified[0].lat).toBe(10);
    });

    it('simplifies a straight line to start and end points', () => {
      const pts: RoutePoint[] = [
        { lat: 0, lng: 0, timestamp: 0 },
        { lat: 1, lng: 1, timestamp: 0 },
        { lat: 2, lng: 2, timestamp: 0 },
      ];
      // Since it's a perfect straight line, any positive epsilon should collapse it to start and end points
      const simplified = simplifyRouteFixed(pts, 0.0001);
      expect(simplified).toHaveLength(2);
      expect(simplified[0].lat).toBe(0);
      expect(simplified[1].lat).toBe(2);
    });
  });

  describe('simplifyRoute (Adaptive maxPoints constraint)', () => {
    it('does not simplify if points count is below maxPoints', () => {
      const pts: RoutePoint[] = [
        { lat: 0, lng: 0, timestamp: 0 },
        { lat: 1, lng: 2, timestamp: 0 },
        { lat: 2, lng: 0, timestamp: 0 },
      ];
      const simplified = simplifyRoute(pts, 5);
      expect(simplified).toHaveLength(3);
    });

    it('simplifies a dense circle/path to strictly <= maxPoints', () => {
      // Generate 200 circular path points
      const pts: RoutePoint[] = [];
      for (let i = 0; i < 200; i++) {
        const angle = (i * Math.PI) / 100;
        pts.push({
          lat: Math.sin(angle),
          lng: Math.cos(angle),
          timestamp: i * 1000,
        });
      }

      const maxPoints = 50;
      const simplified = simplifyRoute(pts, maxPoints);
      expect(simplified.length).toBeLessThanOrEqual(maxPoints);
      expect(simplified[0].lat).toBeCloseTo(pts[0].lat, 4);
      expect(simplified[simplified.length - 1].lat).toBeCloseTo(pts[pts.length - 1].lat, 4);
    });
  });
});
