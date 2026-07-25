/**
 * ProgressRing — a hairline SVG ring encoding one 0..1 quantity.
 *
 * This is data visualisation, not decoration: the arc encodes the elapsed
 * share of the current prayer window, which is why it is allowed to carry the
 * single accent colour. `stroke-dashoffset` is animated with a CSS transition
 * (paint-only, no layout) and the whole ring collapses to a static arc under
 * `prefers-reduced-motion`.
 */
import { memo } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  /** 0..1. Values outside the range are clamped. */
  progress: number;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke thickness in px. */
  thickness?: number;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}

function ProgressRingImpl({ progress, size = 56, thickness = 3, className, children, label }: Props) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track — the neutral remainder of the window. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={thickness}
        />
        {/* Arc — elapsed share of the window, in the single accent colour.
            Rotated -90° so it starts at 12 o'clock. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset var(--duration-slow, 350ms) var(--ease-out-expo)',
          }}
        />
      </svg>
      {children != null && (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      )}
    </div>
  );
}

export const ProgressRing = memo(ProgressRingImpl);
export default ProgressRing;
