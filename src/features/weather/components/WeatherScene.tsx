// ============================================================================
// WeatherScene — abstract atmospheric canvas layered behind every major
// surface on the page. Single source of truth for "what does the weather
// LOOK like right now" — replaces the AmbientBackdrop's per-component
// animation with a coordinated scene.
//
// WHAT THE SCENE KNOWS
//   • Day or night (drives colour palette).
//   • Current weather code (drives particles: rain / snow / dust / clear).
//   • Solar elevation (drives tint — dawn is warmer than noon).
//
// WHY ONE SCENE, NOT ONE PER CARD
//   Each card used to draw its own little backdrop. The result was jittery
//   and the cards never looked like they belonged to the same sky. One
//   scene, positioned absolutely on the page (or a card), gives the page
//   a single coherent atmosphere.
// ============================================================================

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface WeatherSceneProps {
  code: number;
  isDay: boolean;
  /** Solar elevation degrees, -90..90. Used for warmth/tint. */
  solarElevationDeg?: number;
  className?: string;
}

/** Map weather code → particle shape & count. */
function particlePlan(code: number): { kind: 'rain' | 'snow' | 'dust' | 'none'; count: number } {
  // Open-Meteo WMO codes — simplified to four buckets.
  if (code >= 51 && code <= 67) return { kind: 'rain', count: 32 };
  if (code >= 71 && code <= 77) return { kind: 'snow', count: 28 };
  if (code === 0) return { kind: 'none', count: 0 };
  return { kind: 'dust', count: 14 };
}

/** Hue temp based on solar elevation. Dawn/dusk: warm. Noon: cool. Night: cold. */
function tint(elev: number | undefined, isDay: boolean): string {
  if (!isDay) return 'hsl(var(--secondary) / 0.12)';
  if (elev === undefined) return 'hsl(var(--primary) / 0.05)';
  if (elev < 12) return 'hsl(var(--tertiary) / 0.08)';
  if (elev < 35) return 'hsl(var(--information) / 0.06)';
  return 'hsl(var(--primary) / 0.04)';
}

export function WeatherScene({
  code,
  isDay,
  solarElevationDeg,
  className,
}: WeatherSceneProps) {
  const plan = useMemo(() => particlePlan(code), [code]);
  const tintColor = useMemo(() => tint(solarElevationDeg, isDay), [solarElevationDeg, isDay]);

  // Pre-compute particle positions so re-renders don't shuffle them.
  const particles = useMemo(() => {
    return Array.from({ length: plan.count }, (_, i) => ({
      id: i,
      left: (i * 7 + (i * i * 3) % 100) % 100,
      delay: (i * 0.13) % 1.6,
      duration: plan.kind === 'snow' ? 6 + (i % 4) : 1.4 + (i % 5) * 0.2,
      size: plan.kind === 'snow' ? 2 + (i % 3) : 1.2,
      drift: ((i * 13) % 30) - 15,
    }));
  }, [plan]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      {/* Base tint — warm/cool/night wash. */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: tintColor }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />

      {/* Particles — rain / snow / dust falling across the scene. */}
      {plan.kind !== 'none' && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute block"
              style={{
                left: `${p.left}%`,
                top: '-10%',
                width: `${p.size}px`,
                height: plan.kind === 'snow' ? `${p.size}px` : `${p.size * 6}px`,
                borderRadius: plan.kind === 'snow' ? '999px' : '1px',
                background:
                  plan.kind === 'snow'
                    ? 'hsl(var(--foreground) / 0.65)'
                    : plan.kind === 'rain'
                      ? 'hsl(var(--information) / 0.5)'
                      : 'hsl(var(--tertiary) / 0.3)',
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: '110vh',
                x: p.drift,
                opacity: [0, 0.9, 0.9, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle horizon line — gives the eye a baseline. */}
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.10), transparent)',
        }}
      />
    </div>
  );
}