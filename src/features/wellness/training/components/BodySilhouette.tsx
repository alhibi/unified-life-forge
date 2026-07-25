/**
 * Body silhouette with selectable muscle regions.
 *
 * Click a muscle group to filter exercises / show volume. Used by the
 * exercise picker, the volume chart, and the strength-standards page.
 *
 * Pure SVG — no external dependency. Sized to fit any container.
 */

import { motion } from 'framer-motion';
import React from 'react';

import type { MuscleGroup } from '../../exerciseCatalog';
import { MUSCLE_LABELS } from '../../exerciseCatalog';

export interface BodySilhouetteProps {
  /** Muscles currently highlighted. */
  highlighted?: Set<MuscleGroup> | MuscleGroup[];
  /** Muscle groups with a relative intensity 0-1, drives colour saturation. */
  intensities?: Partial<Record<MuscleGroup, number>>;
  /** Click handler — region is the canonical muscle group. */
  onSelect?: (muscle: MuscleGroup) => void;
  /** Side displayed: front, back, or both. */
  view?: 'front' | 'back' | 'both';
  /** Override base colour. */
  baseColor?: string;
  /** Fill colour for active muscle. */
  activeColor?: string;
  /** Show labels next to highlighted muscles. */
  showLabels?: boolean;
  lang?: 'ar';
  width?: number;
  height?: number;
  className?: string;
}

const REGION_DEFS: Record<MuscleGroup, { front?: string; back?: string }> = {
  // Coordinates inside a viewBox of 200×400 per panel
  chest:      { front: 'M70,90 Q100,80 130,90 L130,130 Q100,140 70,130 Z' },
  shoulders:  { front: 'M55,80 Q70,72 80,82 L75,105 L60,105 Z M145,82 Q130,72 120,80 L125,105 L140,105 Z',
                back:  'M55,80 Q70,72 80,82 L75,105 L60,105 Z M145,82 Q130,72 120,80 L125,105 L140,105 Z' },
  biceps:     { front: 'M55,108 Q60,128 65,148 L80,148 L80,108 Z M145,108 Q140,128 135,148 L120,148 L120,108 Z' },
  triceps:    { back:  'M55,108 Q60,128 65,148 L80,148 L80,108 Z M145,108 Q140,128 135,148 L120,148 L120,108 Z' },
  forearms:   { front: 'M65,150 L70,200 L82,200 L82,150 Z M135,150 L130,200 L118,200 L118,150 Z',
                back:  'M65,150 L70,200 L82,200 L82,150 Z M135,150 L130,200 L118,200 L118,150 Z' },
  back:       { back: 'M70,90 Q100,80 130,90 L130,180 Q100,190 70,180 Z' },
  traps:      { back: 'M75,72 Q100,68 125,72 L130,90 L70,90 Z' },
  core:       { front: 'M80,140 Q100,135 120,140 L120,210 Q100,220 80,210 Z' },
  glutes:     { back: 'M75,210 Q100,205 125,210 L125,255 Q100,260 75,255 Z' },
  quads:      { front: 'M75,210 L80,300 L98,300 L98,210 Z M125,210 L120,300 L102,300 L102,210 Z' },
  hamstrings: { back:  'M75,210 L80,300 L98,300 L98,210 Z M125,210 L120,300 L102,300 L102,210 Z' },
  calves:     { back: 'M80,300 L85,360 L97,360 L97,300 Z M120,300 L115,360 L103,360 L103,300 Z' },
  fullbody:   { },
  cardio:     { },
};

const SET = (h?: Set<MuscleGroup> | MuscleGroup[]): Set<MuscleGroup> => {
  if (!h) return new Set();
  return Array.isArray(h) ? new Set(h) : h;
};

export default function BodySilhouette({
  highlighted,
  intensities,
  onSelect,
  view = 'both',
  baseColor = 'hsl(var(--muted))',
  activeColor = 'hsl(var(--primary))',
  showLabels = false,
  lang = 'ar',
  width = 320,
  height = 400,
  className = '',
}: BodySilhouetteProps) {
  const setH = SET(highlighted);

  const renderPanel = (panel: 'front' | 'back') => {
    const muscles = Object.keys(REGION_DEFS) as MuscleGroup[];
    return (
      <g key={panel} transform={panel === 'back' ? 'translate(220, 0)' : undefined}>
        {/* Outline */}
        <BodyOutline />

        {muscles.map((m) => {
          const path = REGION_DEFS[m]?.[panel];
          if (!path) return null;
          const intensity = intensities?.[m] ?? 0;
          const isActive = setH.has(m);
          const fill = isActive ? activeColor : intensity > 0 ? `${activeColor}${alphaForIntensity(intensity)}` : baseColor;
          return (
            <motion.path
              key={`${panel}-${m}`}
              d={path}
              fill={fill}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={0.5}
              onClick={() => onSelect?.(m)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
              animate={{ opacity: 1 }}
              whileHover={onSelect ? { opacity: 0.8 } : undefined}
            >
              <title>{MUSCLE_LABELS[m]?.[lang]}</title>
            </motion.path>
          );
        })}
      </g>
    );
  };

  return (
    <svg
      viewBox={view === 'both' ? '0 0 440 400' : '0 0 220 400'}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="body silhouette"
    >
      {(view === 'front' || view === 'both') && renderPanel('front')}
      {(view === 'back' || view === 'both') && (
        <g transform={view === 'back' ? 'translate(0, 0)' : undefined}>
          {view === 'back' ? renderPanel('back') : renderPanel('back')}
        </g>
      )}
      {showLabels && (
        <g>
          {Array.from(setH).map((m) => (
            <text
              key={`lbl-${m}`}
              x={view === 'both' ? 110 : 110}
              y={labelYFor(m)}
              textAnchor="middle"
              fontSize={9}
              fill={activeColor}
              fontWeight={700}
            >
              {MUSCLE_LABELS[m]?.[lang]}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Returns hex alpha suffix (e.g. "80") for a 0-1 intensity. */
function alphaForIntensity(i: number): string {
  const a = Math.round(Math.max(0.15, Math.min(1, i)) * 255);
  return a.toString(16).padStart(2, '0');
}

function labelYFor(m: MuscleGroup): number {
  switch (m) {
    case 'chest': return 110;
    case 'shoulders': return 92;
    case 'biceps':
    case 'triceps': return 130;
    case 'core': return 175;
    case 'quads':
    case 'hamstrings': return 250;
    case 'calves': return 330;
    case 'glutes': return 230;
    case 'traps': return 80;
    case 'forearms': return 175;
    case 'back': return 140;
    default: return 200;
  }
}

/* Minimal silhouette outline */
function BodyOutline() {
  return (
    <path
      d="M100,30 Q120,30 120,55 Q120,72 110,75 L130,80 Q145,80 150,100 L145,150 L138,205 L130,260 Q128,290 125,330 L120,380 L105,380 L102,330 L98,330 L95,380 L80,380 L75,330 Q72,290 70,260 L62,205 L55,150 L50,100 Q55,80 70,80 L90,75 Q80,72 80,55 Q80,30 100,30 Z"
      fill="none"
      stroke="rgba(0,0,0,0.2)"
      strokeWidth={1}
    />
  );
}
