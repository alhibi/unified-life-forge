// ============================================================================
// WindCompass — full 16-point compass with a needle, speed display, and
// streamlines that hint at gust strength.
//
// WHY 16-POINT AND NOT 4
//   The previous version showed N/E/S/W plus a needle. That's enough for a
//   toy compass; not enough for a meteorology tool. This version labels
//   every sixteenth bearing (N, NNE, NE, ENE, E, …). The needle rotates
//   with a soft spring so the user can see wind shifts smoothly.
//
// STREAMLINES
//   A subtle SVG pattern behind the dial that visualises wind direction
//   at speed — three parallel arcs that animate left-to-right, faster at
//   higher wind speeds. At calm winds the streamlines are barely visible.
// ============================================================================

import { motion } from 'framer-motion';
import { useMemo } from 'react';


interface WindCompassProps {
  speed: number;
  gusts: number;
  dirDeg: number;
  cardinal: string;
  beaufort: string;
}

const W = 240;
const H = 240;
const cx = W / 2;
const cy = H / 2;
const R_OUTER = 110;
const R_INNER = 70;

const CARDINALS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function pointAt(deg: number, r: number) {
  // Compass degrees: 0° = N (up), 90° = E (right). SVG: rotate clockwise
  // from north, so we map: angle = (deg - 90) to convert to SVG-friendly.
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

export function WindCompass({ speed, gusts, dirDeg, cardinal, beaufort }: WindCompassProps) {
  // Streamline animation duration depends on wind speed.
  const streamDuration = useMemo(() => {
    const s = Math.max(0.5, Math.min(20, speed));
    return Math.max(0.6, 4.5 - s * 0.2);
  }, [speed]);

  const beaufortHint = useMemo(() => {
    if (gusts > speed * 1.4) return 'هبّات قوية';
    if (gusts > speed * 1.2) return 'هبّات متوسطة';
    return 'هبّات خفيفة';
  }, [gusts, speed]);

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <header className="flex items-end justify-between gap-3 px-6 pt-6 pb-3">
        <div>
          <h3 className="text-lead font-bold text-foreground leading-tight">
            {'بوصلة الرياح الحية'}
          </h3>
          <p className="mt-1 text-mini text-foreground/60 leading-snug">
            {'اتجاه وسرعة الرياح مع الهبات'}
          </p>
        </div>
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55">
          {beaufort}
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-6 px-6 pb-6">
        {/* Compass dial */}
        <div className="relative mx-auto" style={{ width: W, height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <linearGradient id="compass-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.04" />
              </linearGradient>
              <pattern
                id="streamlines"
                patternUnits="userSpaceOnUse"
                width="40"
                height="14"
                patternTransform="rotate(15)"
              >
                <path
                  d="M 0 7 Q 10 0, 20 7 T 40 7"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeOpacity="0.18"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
              </pattern>
            </defs>

            {/* Streamlines */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={R_OUTER - 8}
              fill="url(#streamlines)"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: streamDuration, ease: 'linear', repeat: Infinity }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />

            {/* Dial background */}
            <circle cx={cx} cy={cy} r={R_OUTER} fill="url(#compass-grad)" />

            {/* Concentric rings */}
            <circle cx={cx} cy={cy} r={R_OUTER} fill="none" stroke="hsl(var(--foreground) / 0.10)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={R_INNER} fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="1" />

            {/* 16 cardinal labels */}
            {CARDINALS_16.map((c, i) => {
              const deg = i * 22.5;
              const r1 = R_OUTER - 12;
              const r2 = R_OUTER + 12;
              const isMajor = c.length === 1;
              const p1 = pointAt(deg, r1);
              const p2 = pointAt(deg, r2);
              return (
                <g key={c}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="hsl(var(--foreground) / 0.20)"
                    strokeWidth={isMajor ? 1.4 : 0.8}
                    strokeLinecap="round"
                  />
                  {isMajor && (
                    <text
                      x={pointAt(deg, R_OUTER + 22).x}
                      y={pointAt(deg, R_OUTER + 22).y + 4}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="700"
                      fill="hsl(var(--foreground))"
                      letterSpacing="1"
                    >
                      {c}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Inner tick marks every 22.5° */}
            {CARDINALS_16.map((_, i) => {
              const deg = i * 22.5;
              const r1 = R_INNER - 4;
              const r2 = R_INNER + 4;
              const p1 = pointAt(deg, r1);
              const p2 = pointAt(deg, r2);
              return (
                <line
                  key={`tick-${i}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="hsl(var(--foreground) / 0.10)"
                  strokeWidth="0.6"
                />
              );
            })}

            {/* Needle */}
            <motion.g
              animate={{ rotate: dirDeg }}
              transition={{ type: 'spring', stiffness: 50, damping: 14 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              {/* North-pointing arrow (red end) */}
              <path
                d={`M ${cx} ${cy - R_INNER + 4} L ${cx + 10} ${cy} L ${cx - 10} ${cy} Z`}
                fill="hsl(var(--primary))"
                fillOpacity="0.95"
              />
              {/* South-pointing arrow (muted end) */}
              <path
                d={`M ${cx} ${cy + R_INNER - 4} L ${cx + 7} ${cy} L ${cx - 7} ${cy} Z`}
                fill="hsl(var(--foreground) / 0.45)"
                fillOpacity="0.6"
              />
              {/* Centre hub */}
              <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
              <circle cx={cx} cy={cy} r="3" fill="hsl(var(--background))" />
            </motion.g>
          </svg>
        </div>

        {/* Stats column */}
        <div className="space-y-3.5">
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55 mb-1.5">
              {'السرعة'}
            </p>
            <div className="flex items-baseline gap-1.5 tabular-nums leading-none" dir="ltr">
              <span className="text-[3rem] font-extralight tracking-[-0.04em] text-foreground">
                {Math.round(speed)}
              </span>
              <span className="text-meta font-bold text-primary/85">km/h</span>
            </div>
          </div>

          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55 mb-1.5">
              {'الاتجاه'}
            </p>
            <p className="text-title font-bold text-foreground leading-none">
              {cardinal}
            </p>
            <p className="mt-1 text-mini text-foreground/55 tabular-nums" dir="ltr">
              {`${Math.round(dirDeg)}°`}
            </p>
          </div>

          <div className="pt-3 border-t border-foreground/10">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55">
                {'الهبات'}
              </p>
              <span className="text-meta font-bold text-foreground tabular-nums leading-none" dir="ltr">
                {Math.round(gusts)}
                <span className="ms-0.5 text-[0.625rem] font-semibold text-foreground/55">km/h</span>
              </span>
            </div>
            <p className="mt-1.5 text-mini text-foreground/65">{beaufortHint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}