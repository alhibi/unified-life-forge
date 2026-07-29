import React from 'react';
import type { FitnessActivity, RoutePoint } from './types';

export interface RouteThumbnailProps {
  activity?: FitnessActivity;
  route?: RoutePoint[] | null;
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * RouteThumbnail: A lightweight, pure SVG component that draws a fitness activity's route
 * as a simple, scaled, and centered vector path to fit any card area.
 * It does not load external map tiles or make any network requests.
 * Styled using the Zen Elite design tokens.
 */
export function RouteThumbnail({
  activity,
  route,
  className = '',
  width = '100%',
  height = 80,
}: RouteThumbnailProps) {
  // Resolve raw route points from props
  const pts = route || activity?.route;

  if (!pts || pts.length === 0) {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center rounded-lg border border-border/20 bg-muted/5 text-[0.6875rem] text-muted-foreground/60 ${className}`}
      >
        <span>لا مسار مسجّل</span>
      </div>
    );
  }

  // Find bounding box coordinates
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  pts.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const maxSpan = Math.max(latSpan, lngSpan, 0.0001);

  // SVG Viewport constraints
  const pad = 6; // Padding to ensure lines are not clipped at edges
  const viewWidth = 120;
  const viewHeight = 70;

  // Aspect-ratio preserving scaling
  const scaleX = (viewWidth - pad * 2) / maxSpan;
  const scaleY = (viewHeight - pad * 2) / maxSpan;
  const scale = Math.min(scaleX, scaleY);

  // Centering calculations
  const offsetX = (viewWidth - lngSpan * scale) / 2;
  const offsetY = (viewHeight - latSpan * scale) / 2;

  // Compile points into SVG Path
  const pathData = pts
    .map((p, idx) => {
      const x = offsetX + (p.lng - minLng) * scale;
      // Flip Y since lat increases upwards and SVG coordinate Y increases downwards
      const y = viewHeight - (offsetY + (p.lat - minLat) * scale);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  // Start and End normalized coordinates for markers
  const startPt = pts[0];
  const endPt = pts[pts.length - 1];

  const startX = offsetX + (startPt.lng - minLng) * scale;
  const startY = viewHeight - (offsetY + (startPt.lat - minLat) * scale);

  const endX = offsetX + (endPt.lng - minLng) * scale;
  const endY = viewHeight - (offsetY + (endPt.lat - minLat) * scale);

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      width={width}
      height={height}
      className={`block select-none overflow-visible ${className}`}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      {/* Route Line */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[#B8492E] dark:text-[#B8492E]" // Fallback to copper/olive accent
        style={{ stroke: 'var(--live, #B8492E)' }}
      />

      {/* Start Point Marker (Green dot) */}
      <circle
        cx={startX.toFixed(2)}
        cy={startY.toFixed(2)}
        r="2.5"
        fill="#10b981"
      />

      {/* End Point Marker (Copper/accent dot) */}
      {pts.length > 1 && (
        <circle
          cx={endX.toFixed(2)}
          cy={endY.toFixed(2)}
          r="2.5"
          fill="var(--live, #B8492E)"
        />
      )}
    </svg>
  );
}

export default RouteThumbnail;
