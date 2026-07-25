/**
 * MuscleBodyMap — SVG anatomical body visualization (front + back).
 *
 * Shows which muscles are targeted by an exercise using color coding:
 *  • Primary muscles → vibrant pink/red (high opacity)
 *  • Secondary muscles → lighter pink (medium opacity)
 *  • Untargeted muscles → dark gray (low opacity)
 *
 * Props:
 *  - primary: MuscleGroup[] — main muscles targeted
 *  - secondary?: MuscleGroup[] — supporting muscles
 *  - size?: 'sm' | 'md' | 'lg' — component size
 *  - showLegend?: boolean — show color legend below
 *  - lang?: 'ar' — for legend labels
 */

import React from 'react';
import type { MuscleGroup } from '@/features/wellness/exerciseCatalog';

interface Props {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  lang?: 'ar';
}

const SIZES = {
  sm: { width: 120, height: 200 },
  md: { width: 180, height: 300 },
  lg: { width: 240, height: 400 },
};

// Colors
const PRIMARY_COLOR = '#ec4899';    // pink-500
const SECONDARY_COLOR = '#f9a8d4';  // pink-300
const UNTARGETED_COLOR = '#374151'; // gray-700
const BODY_OUTLINE = '#6b7280';     // gray-500

/**
 * Maps MuscleGroup enum values to which SVG muscle areas
 * should be highlighted (front view and back view).
 */
type ViewSide = 'front' | 'back';

// Each muscle zone maps to one or both views
const MUSCLE_VIEW_MAP: Record<string, ViewSide[]> = {
  chest: ['front'],
  shoulders: ['front', 'back'],
  triceps: ['back'],
  biceps: ['front'],
  forearms: ['front', 'back'],
  core: ['front'],
  quads: ['front'],
  glutes: ['back'],
  hamstrings: ['back'],
  calves: ['front', 'back'],
  back: ['back'],
  traps: ['back'],
  fullbody: ['front', 'back'],
  cardio: [],
};

export default function MuscleBodyMap({
  primary,
  secondary = [],
  size = 'md',
  showLegend = true,
  lang = 'ar',
}: Props) {
  const { width, height } = SIZES[size];
  const bodyW = width / 2 - 8; // each body takes half width
  const bodyH = height - (showLegend ? 36 : 0);

  const getMuscleColor = (muscle: string): string => {
    if (primary.includes(muscle as MuscleGroup)) return PRIMARY_COLOR;
    if (secondary.includes(muscle as MuscleGroup)) return SECONDARY_COLOR;
    if (muscle === 'fullbody' && primary.includes('fullbody' as MuscleGroup)) return PRIMARY_COLOR;
    return UNTARGETED_COLOR;
  };

  const getMuscleOpacity = (muscle: string): number => {
    if (primary.includes(muscle as MuscleGroup)) return 0.9;
    if (secondary.includes(muscle as MuscleGroup)) return 0.55;
    if (muscle === 'fullbody' && primary.includes('fullbody' as MuscleGroup)) return 0.7;
    return 0.18;
  };

  const isHighlighted = (muscle: string): boolean => {
    return primary.includes(muscle as MuscleGroup) || secondary.includes(muscle as MuscleGroup);
  };

  // Scale factor based on size
  const s = bodyH / 200; // base design is 200 units tall

  const legendLabels = {
    primary: 'أساسي',
    secondary: 'ثانوي',
    untargeted: 'غير مستهدف',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-2" style={{ width, height: bodyH }}>
        {/* FRONT VIEW */}
        <svg
          width={bodyW}
          height={bodyH}
          viewBox="0 0 100 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          {/* Body outline */}
          <BodyOutlineFront outline={BODY_OUTLINE} />

          {/* Muscle fills — FRONT */}
          {/* Chest */}
          <path
            d="M35 62 Q38 58 50 58 Q62 58 65 62 L65 75 Q62 78 50 80 Q38 78 35 75 Z"
            fill={getMuscleColor('chest')}
            opacity={getMuscleOpacity('chest')}
          />
          {/* Shoulders (front deltoids) */}
          <path
            d="M28 58 Q30 52 35 55 L35 68 Q30 70 28 66 Z"
            fill={getMuscleColor('shoulders')}
            opacity={getMuscleOpacity('shoulders')}
          />
          <path
            d="M72 58 Q70 52 65 55 L65 68 Q70 70 72 66 Z"
            fill={getMuscleColor('shoulders')}
            opacity={getMuscleOpacity('shoulders')}
          />
          {/* Biceps */}
          <path
            d="M24 70 Q26 68 28 70 L28 90 Q26 92 24 90 Z"
            fill={getMuscleColor('biceps')}
            opacity={getMuscleOpacity('biceps')}
          />
          <path
            d="M76 70 Q74 68 72 70 L72 90 Q74 92 76 90 Z"
            fill={getMuscleColor('biceps')}
            opacity={getMuscleOpacity('biceps')}
          />
          {/* Forearms */}
          <path
            d="M22 92 Q24 90 26 92 L25 112 Q23 114 21 112 Z"
            fill={getMuscleColor('forearms')}
            opacity={getMuscleOpacity('forearms')}
          />
          <path
            d="M78 92 Q76 90 74 92 L75 112 Q77 114 79 112 Z"
            fill={getMuscleColor('forearms')}
            opacity={getMuscleOpacity('forearms')}
          />
          {/* Core / Abs */}
          <path
            d="M38 80 Q44 78 50 80 Q56 78 62 80 L62 105 Q56 108 50 107 Q44 108 38 105 Z"
            fill={getMuscleColor('core')}
            opacity={getMuscleOpacity('core')}
          />
          {/* Quads */}
          <path
            d="M36 110 Q40 108 44 110 L44 148 Q40 152 36 148 Z"
            fill={getMuscleColor('quads')}
            opacity={getMuscleOpacity('quads')}
          />
          <path
            d="M56 110 Q60 108 64 110 L64 148 Q60 152 56 148 Z"
            fill={getMuscleColor('quads')}
            opacity={getMuscleOpacity('quads')}
          />
          {/* Calves (front) */}
          <path
            d="M37 155 Q40 152 43 155 L42 178 Q40 180 38 178 Z"
            fill={getMuscleColor('calves')}
            opacity={getMuscleOpacity('calves')}
          />
          <path
            d="M57 155 Q60 152 63 155 L62 178 Q60 180 58 178 Z"
            fill={getMuscleColor('calves')}
            opacity={getMuscleOpacity('calves')}
          />
        </svg>

        {/* BACK VIEW */}
        <svg
          width={bodyW}
          height={bodyH}
          viewBox="0 0 100 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          {/* Body outline */}
          <BodyOutlineBack outline={BODY_OUTLINE} />

          {/* Muscle fills — BACK */}
          {/* Traps */}
          <path
            d="M38 52 Q44 48 50 48 Q56 48 62 52 L60 60 Q55 58 50 58 Q45 58 40 60 Z"
            fill={getMuscleColor('traps')}
            opacity={getMuscleOpacity('traps')}
          />
          {/* Back (lats) */}
          <path
            d="M35 62 Q38 60 42 62 L42 90 Q38 95 35 90 Z"
            fill={getMuscleColor('back')}
            opacity={getMuscleOpacity('back')}
          />
          <path
            d="M65 62 Q62 60 58 62 L58 90 Q62 95 65 90 Z"
            fill={getMuscleColor('back')}
            opacity={getMuscleOpacity('back')}
          />
          {/* Rear Delts / Shoulders */}
          <path
            d="M28 58 Q30 54 35 56 L35 66 Q30 68 28 64 Z"
            fill={getMuscleColor('shoulders')}
            opacity={getMuscleOpacity('shoulders')}
          />
          <path
            d="M72 58 Q70 54 65 56 L65 66 Q70 68 72 64 Z"
            fill={getMuscleColor('shoulders')}
            opacity={getMuscleOpacity('shoulders')}
          />
          {/* Triceps */}
          <path
            d="M24 68 Q26 66 28 68 L28 90 Q26 92 24 90 Z"
            fill={getMuscleColor('triceps')}
            opacity={getMuscleOpacity('triceps')}
          />
          <path
            d="M76 68 Q74 66 72 68 L72 90 Q74 92 76 90 Z"
            fill={getMuscleColor('triceps')}
            opacity={getMuscleOpacity('triceps')}
          />
          {/* Glutes */}
          <path
            d="M36 100 Q42 97 50 100 Q58 97 64 100 L64 115 Q58 118 50 116 Q42 118 36 115 Z"
            fill={getMuscleColor('glutes')}
            opacity={getMuscleOpacity('glutes')}
          />
          {/* Hamstrings */}
          <path
            d="M36 118 Q40 116 44 118 L44 150 Q40 154 36 150 Z"
            fill={getMuscleColor('hamstrings')}
            opacity={getMuscleOpacity('hamstrings')}
          />
          <path
            d="M56 118 Q60 116 64 118 L64 150 Q60 154 56 150 Z"
            fill={getMuscleColor('hamstrings')}
            opacity={getMuscleOpacity('hamstrings')}
          />
          {/* Calves (back) */}
          <path
            d="M37 155 Q40 152 43 155 L42 178 Q40 180 38 178 Z"
            fill={getMuscleColor('calves')}
            opacity={getMuscleOpacity('calves')}
          />
          <path
            d="M57 155 Q60 152 63 155 L62 178 Q60 180 58 178 Z"
            fill={getMuscleColor('calves')}
            opacity={getMuscleOpacity('calves')}
          />
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }} />
            <span className="text-muted-foreground">{legendLabels.primary}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SECONDARY_COLOR }} />
            <span className="text-muted-foreground">{legendLabels.secondary}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: UNTARGETED_COLOR, opacity: 0.4 }} />
            <span className="text-muted-foreground">{legendLabels.untargeted}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Body Outline SVG Subcomponents ─── */

function BodyOutlineFront({ outline }: { outline: string }) {
  return (
    <g stroke={outline} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5">
      {/* Head */}
      <ellipse cx="50" cy="22" rx="10" ry="12" />
      {/* Neck */}
      <line x1="45" y1="34" x2="45" y2="42" />
      <line x1="55" y1="34" x2="55" y2="42" />
      {/* Torso */}
      <path d="M35 45 Q28 48 26 58 L22 70 L20 95 L22 115 Q24 118 22 120" />
      <path d="M65 45 Q72 48 74 58 L78 70 L80 95 L78 115 Q76 118 78 120" />
      {/* Shoulders to torso */}
      <path d="M35 45 Q42 42 50 42 Q58 42 65 45" />
      {/* Hips */}
      <path d="M35 105 Q38 112 36 118 L34 150 Q35 155 36 158 L38 185 Q39 192 40 195" />
      <path d="M65 105 Q62 112 64 118 L66 150 Q65 155 64 158 L62 185 Q61 192 60 195" />
      {/* Arms */}
      <path d="M26 58 Q22 62 20 72 L18 95 Q17 100 18 110 L20 120" />
      <path d="M74 58 Q78 62 80 72 L82 95 Q83 100 82 110 L80 120" />
    </g>
  );
}

function BodyOutlineBack({ outline }: { outline: string }) {
  return (
    <g stroke={outline} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5">
      {/* Head */}
      <ellipse cx="50" cy="22" rx="10" ry="12" />
      {/* Neck */}
      <line x1="45" y1="34" x2="45" y2="42" />
      <line x1="55" y1="34" x2="55" y2="42" />
      {/* Torso */}
      <path d="M35 45 Q28 48 26 58 L22 70 L20 95 L22 115 Q24 118 22 120" />
      <path d="M65 45 Q72 48 74 58 L78 70 L80 95 L78 115 Q76 118 78 120" />
      {/* Shoulders to torso */}
      <path d="M35 45 Q42 42 50 42 Q58 42 65 45" />
      {/* Spine indication */}
      <line x1="50" y1="45" x2="50" y2="100" strokeDasharray="2 3" opacity="0.3" />
      {/* Hips */}
      <path d="M35 105 Q38 112 36 118 L34 150 Q35 155 36 158 L38 185 Q39 192 40 195" />
      <path d="M65 105 Q62 112 64 118 L66 150 Q65 155 64 158 L62 185 Q61 192 60 195" />
      {/* Arms */}
      <path d="M26 58 Q22 62 20 72 L18 95 Q17 100 18 110 L20 120" />
      <path d="M74 58 Q78 62 80 72 L82 95 Q83 100 82 110 L80 120" />
    </g>
  );
}
