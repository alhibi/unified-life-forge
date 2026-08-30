// ============================================================================
// MagneticCard — wraps a card with a subtle tilt that follows the pointer.
// On hover, the card rotates ±2° toward the cursor. On leave, it springs
// back. Combined with a soft glow halo, this is the "premium hover" feel.
//
// WHEN TO USE
//   • Hero card and any other card that wants a tactile interaction.
//   • When stacking effects on cards (e.g. ribbon columns), the parent
//     usually picks ONE focus card for the magnetic hover, not every
//     child.
//
// REDUCED MOTION
//   The component reads prefers-reduced-motion and skips tilt + glow. The
//   card still hovers (subtle border change) — that's not animation.
// ============================================================================

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { type ReactNode, useRef } from 'react';

import { cn } from '@/lib/utils';

import { cardHoverTransition, magneticTilt, reducedMotionTransition } from '../lib/weather-motion';

interface MagneticCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees (default 2). */
  maxTilt?: number;
  /** Disable the glow halo (e.g. when stacking inside a busy section). */
  noGlow?: boolean;
  /** Per-axis translate amount in px when hovered (default 0 — no lift). */
  liftPx?: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function MagneticCard({
  children,
  className,
  maxTilt = 2,
  noGlow = false,
  liftPx = 0,
}: MagneticCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useRef(typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY).matches);

  // Pointer position in 0..1.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  // Spring-smoothed values to avoid jittery tilt on fast pointer movement.
  const springConfig = { stiffness: 220, damping: 26, mass: 0.6 };
  const springX = useSpring(px, springConfig);
  const springY = useSpring(py, springConfig);

  const rotateX = useTransform(springY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(springX, [0, 1], [-maxTilt, maxTilt]);

  // Glow position follows the pointer as a radial gradient.
  const glowX = useTransform(springX, [0, 1], ['0%', '100%']);
  const glowY = useTransform(springY, [0, 1], ['0%', '100%']);
  const glowBg = useMotionTemplate`radial-gradient(220px circle at ${glowX} ${glowY}, hsl(var(--primary) / 0.18), transparent 65%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced.current) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const handlePointerLeave = () => {
    // Spring back to centre.
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={reduced.current ? undefined : { y: -liftPx }}
      transition={reduced.current ? reducedMotionTransition : cardHoverTransition}
      style={{
        rotateX: reduced.current ? 0 : rotateX,
        rotateY: reduced.current ? 0 : rotateY,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d',
      }}
      className={cn('relative', className)}
    >
      {!noGlow && !reduced.current && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: glowBg }}
        />
      )}
      {children}
    </motion.div>
  );
}