import type { RoutePoint } from './types';

/**
 * Calculates the perpendicular distance from point p to the line segment defined by start and end.
 */
export function getPerpendicularDistance(p: RoutePoint, start: RoutePoint, end: RoutePoint): number {
  const x0 = p.lng;
  const y0 = p.lat;
  const x1 = start.lng;
  const y1 = start.lat;
  const x2 = end.lng;
  const y2 = end.lat;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // start and end are the same point
    return Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1));
  }

  // Calculate projection parameter t, clamped to [0, 1]
  let t = ((x0 - x1) * dx + (y0 - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const distX = x0 - projX;
  const distY = y0 - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Core recursive Douglas-Peucker implementation.
 */
function douglasPeuckerRecursive(
  points: RoutePoint[],
  startIndex: number,
  endIndex: number,
  epsilon: number,
  keepIndices: Set<number>
): void {
  if (startIndex >= endIndex - 1) {
    return;
  }

  const startPoint = points[startIndex];
  const endPoint = points[endIndex];

  let maxDistance = 0;
  let maxIndex = startIndex;

  for (let i = startIndex + 1; i < endIndex; i++) {
    const dist = getPerpendicularDistance(points[i], startPoint, endPoint);
    if (dist > maxDistance) {
      maxDistance = dist;
      maxIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    keepIndices.add(maxIndex);
    // Recursively simplify left and right sub-curves
    douglasPeuckerRecursive(points, startIndex, maxIndex, epsilon, keepIndices);
    douglasPeuckerRecursive(points, maxIndex, endIndex, epsilon, keepIndices);
  }
}

/**
 * Simplifies a route using the Douglas-Peucker algorithm with a fixed epsilon.
 */
export function simplifyRouteFixed(points: RoutePoint[], epsilon: number): RoutePoint[] {
  if (points.length <= 2) {
    return [...points];
  }

  const keepIndices = new Set<number>([0, points.length - 1]);
  douglasPeuckerRecursive(points, 0, points.length - 1, epsilon, keepIndices);

  const sortedIndices = Array.from(keepIndices).sort((a, b) => a - b);
  return sortedIndices.map((idx) => ({ ...points[idx] }));
}

/**
 * Simplifies a route to ensure it does not exceed maxPoints (target: max ~100 points)
 * using a binary search on epsilon to find the optimal simplification threshold.
 */
export function simplifyRoute(points: RoutePoint[], maxPoints: number = 100): RoutePoint[] {
  if (points.length <= maxPoints) {
    return [...points];
  }

  // If we only want 1 or 2 points, just return boundary points
  if (maxPoints <= 2) {
    if (points.length === 0) return [];
    if (points.length === 1) return [...points];
    return [points[0], points[points.length - 1]];
  }

  // Find bounding box to set reasonable bounds for epsilon binary search
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  points.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const diag = Math.sqrt(latSpan * latSpan + lngSpan * lngSpan);

  // Binary search bounds for epsilon
  let low = 0.0;
  let high = Math.max(diag, 0.01); // Avoid extremely narrow high bounds for flat lines
  let bestResult: RoutePoint[] = [];

  // Up to 15 iterations of binary search is extremely fast and gives high precision
  for (let iter = 0; iter < 15; iter++) {
    const mid = (low + high) / 2;
    const simplified = simplifyRouteFixed(points, mid);

    if (simplified.length <= maxPoints) {
      bestResult = simplified;
      // We met the target. Try to get more detail by decreasing epsilon
      high = mid;
    } else {
      // Too many points. Simplify more by increasing epsilon
      low = mid;
    }
  }

  // If binary search failed to produce a valid route for some reason, fallback
  if (bestResult.length === 0 || bestResult.length > maxPoints) {
    // Subsample evenly to strictly respect maxPoints
    const step = (points.length - 1) / (maxPoints - 1);
    const fallback: RoutePoint[] = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      const idx = Math.round(i * step);
      fallback.push({ ...points[idx] });
    }
    fallback.push({ ...points[points.length - 1] });
    return fallback;
  }

  return bestResult;
}
