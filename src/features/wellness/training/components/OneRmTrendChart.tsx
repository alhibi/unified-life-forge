/**
 * 1RM trend chart for a single exercise.
 *
 * Shows two lines:
 *   • Per-session estimated 1RM (the "actual" data)
 *   • Running maximum (only goes up — the "best ever" reference)
 *
 * Pure SVG to keep the bundle small. Data points are interactive: tap to
 * see the exact value and date.
 */

import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { TrendingUp } from '@/lib/icons';

import { type Exercise,resolveExercise } from '../../exerciseCatalog';
import type { WorkoutSession } from '../../wellnessDb';
import { e1rmRunningMaxSeriesFor, e1rmSeriesFor } from '../analyticsEngine';

export interface OneRmTrendChartProps {
  workouts: WorkoutSession[];
  exerciseKey: string;
  lang: 'ar';
  height?: number;
  className?: string;
}

const T = {
  title: { ar: '1RM المقدّر', },
  noData: { ar: 'لا بيانات كافية بعد.', },
  current: { ar: 'الحالي', },
  best: { ar: 'الأفضل', },
  delta: { ar: 'التقدم', },
};

export default function OneRmTrendChart({
  workouts,
  exerciseKey,
  lang,
  height = 200,
  className = '',
}: OneRmTrendChartProps) {
  const points = useMemo(() => e1rmSeriesFor(workouts, exerciseKey), [workouts, exerciseKey]);
  const runningMax = useMemo(() => e1rmRunningMaxSeriesFor(workouts, exerciseKey), [workouts, exerciseKey]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const ex = resolveExercise(exerciseKey) as Exercise | { isCustom: true; label: { ar: string; } };
  const exLabel = 'isCustom' in ex && ex.isCustom ? ex.label[lang] : (ex as Exercise).label[lang];

  if (points.length < 2) {
    return (
      <div className={`bg-card border border-border/40 rounded-2xl p-6 text-center ${className}`}>
        <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-[12px] text-muted-foreground">{T.noData[lang]}</p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.e1rm), ...runningMax.map((p) => p.e1rm)) * 1.1;
  const min = Math.min(...points.map((p) => p.e1rm)) * 0.9;
  const range = Math.max(1, max - min);
  const w = 320;
  const h = height;
  const padX = 8;
  const padY = 16;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const px = (i: number, total: number) => padX + (i / Math.max(1, total - 1)) * chartW;
  const py = (v: number) => padY + chartH - ((v - min) / range) * chartH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i, points.length).toFixed(1)} ${py(p.e1rm).toFixed(1)}`).join(' ');
  const runPath = runningMax.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i, runningMax.length).toFixed(1)} ${py(p.e1rm).toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${px(points.length - 1, points.length).toFixed(1)} ${(padY + chartH).toFixed(1)} L ${padX} ${(padY + chartH).toFixed(1)} Z`;

  const current = points[points.length - 1].e1rm;
  const best = runningMax[runningMax.length - 1].e1rm;
  const start = points[0].e1rm;
  const delta = current - start;
  const deltaPct = start > 0 ? ((delta / start) * 100) : 0;

  return (
    <div className={`bg-card border border-border/40 rounded-2xl p-4 space-y-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {T.title[lang]} — {exLabel}
          </p>
          <p className="text-[20px] font-bold tabular-nums text-foreground" dir="ltr">
            {current} kg
            <span className={`text-[11px] ms-1.5 ${delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)} ({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="text-end">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{T.best[lang]}</p>
          <p className="text-[14px] font-bold tabular-nums text-amber-500" dir="ltr">{best} kg</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" height={h}>
        <defs>
          <linearGradient id={`grad-${exerciseKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padX}
            y1={padY + chartH * p}
            x2={padX + chartW}
            y2={padY + chartH * p}
            stroke="rgba(127,127,127,0.18)"
            strokeDasharray="2 4"
          />
        ))}

        {/* fill */}
        <motion.path
          d={fillPath}
          fill={`url(#grad-${exerciseKey})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* running max line (dashed amber) */}
        <motion.path
          d={runPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* main line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={px(i, points.length)}
            cy={py(p.e1rm)}
            r={hoveredIdx === i ? 5 : 3}
            fill="hsl(var(--primary))"
            stroke="white"
            strokeWidth={1.5}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>

      {hoveredIdx != null && (
        <div className="flex justify-between text-[10px] text-muted-foreground" dir="ltr">
          <span>{points[hoveredIdx].date}</span>
          <span className="tabular-nums font-semibold text-foreground">{points[hoveredIdx].e1rm} kg</span>
        </div>
      )}
    </div>
  );
}
