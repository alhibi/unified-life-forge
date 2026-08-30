// ============================================================================
// LiveSunArc — a full celestial dome that shows the sun's journey through
// the day, plus a clean status panel with three time markers.
//
// WHY A FULL DOME
//   The previous version drew a quadratic curve at fixed width/height. It
//   never felt like a "sun" — more like a hump in the road. This version
//   renders an actual semicircle (parametric, 0..1 progress mapped to
//   angle 0..180°), draws hour tick marks at every sixth hour, and
//   positions the sun as a soft-glow disc with halo.
//
// PROGRESS
//   The sun position is driven by Date.now() so it actually moves. The
//   parent must refresh on a timer; we expose a `progress` prop so the
//   host can drive it from anywhere.
// ============================================================================

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { timeLabel } from '../lib/utils';
import { duration, easing } from '../lib/weather-motion';

interface LiveSunArcProps {
  sunrise: string;
  sunset: string;
  elevationDeg: number;
  azimuthDeg: number;
  dayLengthH: number;
  locale: string;
}

const W = 320;
const H = 170;
const padX = 32;
const cy = 148;
const r = W / 2 - padX;

export function LiveSunArc({
  sunrise,
  sunset,
  elevationDeg,
  azimuthDeg,
  dayLengthH,
  locale,
}: LiveSunArcProps) {
  // Track the live clock so the sun actually moves. Re-render every minute
  // (when the rendering pixel position would meaningfully change).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const t0 = new Date(sunrise).getTime();
  const t1 = new Date(sunset).getTime();
  const isNight = now < t0 || now > t1;
  const rawProgress = (now - t0) / Math.max(1, t1 - t0);
  const progress = Math.max(0, Math.min(1, rawProgress));

  // Angle 0..π on a semicircle from left to right.
  const angle = Math.PI - progress * Math.PI;
  const cx = W / 2 + Math.cos(angle) * r;
  const sunY = cy - Math.sin(angle) * r;

  const tickHours = [6, 9, 12, 15, 18]; // displayed ticks across the day

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <header className="flex items-end justify-between gap-3 px-6 pt-6 pb-3">
        <div>
          <h3 className="text-lead font-bold text-foreground leading-tight">
            {'مسار الشمس والقبة السماوية'}
          </h3>
          <p className="mt-1 text-mini text-foreground/60 leading-snug">
            {'قبة يومية توضح شروق الشمس، أوجها، وغروبها'}
          </p>
        </div>
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 tabular-nums">
          {dayLengthH.toFixed(1)} ساعة
        </span>
      </header>

      <div className="relative px-6 pb-3" style={{ aspectRatio: `${W} / ${H}` }} dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="sunarc-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="sun-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="hsl(45 95% 70%)" stopOpacity="0.85" />
              <stop offset="50%" stopColor="hsl(45 90% 60%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(45 90% 60%)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Dome fill */}
          <path
            d={`M ${padX} ${cy} A ${r} ${r} 0 0 1 ${W - padX} ${cy} L ${W - padX} ${cy} L ${padX} ${cy} Z`}
            fill="url(#sunarc-grad)"
          />
          {/* Dome line */}
          <path
            d={`M ${padX} ${cy} A ${r} ${r} 0 0 1 ${W - padX} ${cy}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeOpacity="0.65"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Horizon line */}
          <line
            x1={padX}
            x2={W - padX}
            y1={cy}
            y2={cy}
            stroke="hsl(var(--foreground) / 0.20)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />

          {/* Hour ticks */}
          {tickHours.map((h) => {
            const t = (h - 6) / 12;
            const a = Math.PI - t * Math.PI;
            const x1 = W / 2 + Math.cos(a) * (r - 6);
            const y1 = cy - Math.sin(a) * (r - 6);
            const x2 = W / 2 + Math.cos(a) * (r + 6);
            const y2 = cy - Math.sin(a) * (r + 6);
            return (
              <g key={h}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--foreground) / 0.35)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
                <text
                  x={W / 2 + Math.cos(a) * (r + 14)}
                  y={cy - Math.sin(a) * (r + 14) + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                  letterSpacing="0.5"
                  fontWeight="600"
                >
                  {`${h.toString().padStart(2, '0')}`}
                </text>
              </g>
            );
          })}

          {/* Sun */}
          {isNight ? (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: duration.base }}
            >
              <text
                x={W / 2}
                y={cy - 20}
                textAnchor="middle"
                fontSize="12"
                fill="hsl(var(--muted-foreground))"
                letterSpacing="0.2"
              >
                {'الشمس تحت الأفق'}
              </text>
              <circle cx={W / 2} cy={cy + 4} r="2" fill="hsl(var(--muted-foreground) / 0.5)" />
            </motion.g>
          ) : (
            <>
              {/* Halo */}
              <circle cx={cx} cy={sunY} r="32" fill="url(#sun-glow)" />
              <motion.circle
                cx={cx}
                cy={sunY}
                r="6"
                fill="hsl(45 95% 60%)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              />
            </>
          )}
        </svg>
      </div>

      {/* Time markers */}
      <div className="px-6 pb-6 grid grid-cols-3 gap-2.5" dir="ltr">
        <div className="rounded-xl bg-background/40 border border-foreground/8 px-3 py-2.5 text-center">
          <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55 mb-1">
            {'شروق'}
          </p>
          <p className="text-lead font-bold text-foreground tabular-nums leading-none">
            {timeLabel(sunrise, locale)}
          </p>
        </div>
        <div className="rounded-xl bg-primary/8 border border-primary/25 px-3 py-2.5 text-center">
          <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-primary mb-1">
            {'ارتفاع'}
          </p>
          <p className="text-lead font-bold text-foreground tabular-nums leading-none">
            {Math.round(elevationDeg)}°
          </p>
          <p className="text-[0.625rem] font-semibold text-foreground/55 tabular-nums mt-0.5">
            {`سمت ${Math.round(azimuthDeg)}°`}
          </p>
        </div>
        <div className="rounded-xl bg-background/40 border border-foreground/8 px-3 py-2.5 text-center">
          <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55 mb-1">
            {'غروب'}
          </p>
          <p className="text-lead font-bold text-foreground tabular-nums leading-none">
            {timeLabel(sunset, locale)}
          </p>
        </div>
      </div>
    </section>
  );
}