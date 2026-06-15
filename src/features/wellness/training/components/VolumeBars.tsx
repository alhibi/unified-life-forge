/**
 * Per-muscle weekly volume bars with MEV/MAV/MRV markers.
 *
 * The bar shows hard-set count for each muscle. The colour zone tells the
 * user instantly whether they're undertraining, in the sweet spot, or
 * overshooting their recovery capacity.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from '@/lib/icons';
import {
  classifyVolume,
  VOLUME_LANDMARKS,
  ZONE_ADVICE,
  ZONE_COLOR,
  ZONE_LABEL,
} from '../volumeLandmarks';
import { hardSetsByMuscle } from '../analyticsEngine';
import type { WorkoutSession } from '../../wellnessDb';
import { MUSCLE_LABELS, type MuscleGroup } from '../../exerciseCatalog';

export interface VolumeBarsProps {
  workouts: WorkoutSession[];
  windowDays?: number;
  lang: 'ar' | 'de';
  /** Muscles to show. If omitted, shows the 8 most-trained. */
  muscles?: MuscleGroup[];
  className?: string;
}

const T = {
  title: { ar: 'حجم الأسبوع لكل عضلة', de: 'Wochenvolumen pro Muskel' },
  noData: { ar: 'لا توجد بيانات حجم بعد.', de: 'Noch keine Volumendaten.' },
  setsLabel: { ar: 'مج', de: 'Sätze' },
  weekly: { ar: 'أسبوعياً', de: 'pro Woche' },
};

export default function VolumeBars({
  workouts,
  windowDays = 7,
  lang,
  muscles,
  className = '',
}: VolumeBarsProps) {
  const data = useMemo(() => {
    const map = hardSetsByMuscle(workouts, windowDays);
    const rows: { muscle: MuscleGroup; sets: number }[] = [];
    if (muscles) {
      for (const m of muscles) rows.push({ muscle: m, sets: map.get(m) ?? 0 });
    } else {
      const arr = Array.from(map.entries())
        .filter(([m]) => m !== 'fullbody' && m !== 'cardio')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [m, s] of arr) rows.push({ muscle: m, sets: s });
    }
    return rows;
  }, [workouts, windowDays, muscles]);

  if (data.length === 0) {
    return (
      <div className={`bg-card border border-border/40 rounded-2xl p-6 text-center ${className}`}>
        <p className="text-[12px] text-muted-foreground">{T.noData[lang]}</p>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border/40 rounded-2xl p-4 space-y-3 ${className}`}>
      <h3 className="text-[12px] font-bold text-foreground">{T.title[lang]}</h3>
      <div className="space-y-2">
        {data.map((row, i) => (
          <BarRow key={row.muscle} muscle={row.muscle} sets={row.sets} delay={i * 0.04} lang={lang} />
        ))}
      </div>
    </div>
  );
}

function BarRow({
  muscle,
  sets,
  lang,
  delay,
}: {
  muscle: MuscleGroup;
  sets: number;
  lang: 'ar' | 'de';
  delay: number;
}) {
  const lm = VOLUME_LANDMARKS[muscle];
  const zone = classifyVolume(muscle, sets);
  const color = ZONE_COLOR[zone];

  // X-axis is 0 → MRV * 1.2 to leave a "danger" tail
  const xMax = Math.max(lm?.mrv ? lm.mrv * 1.2 : 25, sets);
  const xPct = (v: number) => Math.min(100, (v / xMax) * 100);

  const trendIcon = zone === 'mev_to_mav' ? <Minus className="w-3 h-3" />
    : zone === 'below_mv' || zone === 'mv_to_mev' ? <TrendingDown className="w-3 h-3" />
    : <TrendingUp className="w-3 h-3" />;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-foreground">
          {MUSCLE_LABELS[muscle]?.[lang]}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] tabular-nums" style={{ color }}>
          {trendIcon}
          {Math.round(sets)} {T.setsLabel[lang]}
          <span className="text-muted-foreground/70 ms-1">· {ZONE_LABEL[zone][lang]}</span>
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-muted/40 overflow-hidden">
        {/* Landmark markers */}
        {lm && lm.mrv > 0 && (
          <>
            <div className="absolute inset-y-0" style={{ left: `${xPct(lm.mev)}%`, width: 1, background: 'rgba(255,255,255,0.4)' }} />
            <div className="absolute inset-y-0" style={{ left: `${xPct(lm.mav)}%`, width: 1, background: 'rgba(255,255,255,0.4)' }} />
            <div className="absolute inset-y-0" style={{ left: `${xPct(lm.mrv)}%`, width: 1, background: 'rgba(239,68,68,0.6)' }} />
          </>
        )}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${xPct(sets)}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
        />
      </div>
      {lm && lm.mrv > 0 && (
        <div className="flex justify-between text-[8.5px] text-muted-foreground/60 tabular-nums" dir="ltr">
          <span>0</span>
          <span style={{ marginLeft: `${xPct(lm.mev)}%` }} className="-translate-x-1/2 absolute">MEV {lm.mev}</span>
          <span style={{ marginLeft: `${xPct(lm.mrv)}%` }} className="-translate-x-1/2 absolute">MRV {lm.mrv}</span>
        </div>
      )}
    </div>
  );
}

/* Compact vertical-bar legend for showing zone meanings. */
export function VolumeZoneLegend({ lang }: { lang: 'ar' | 'de' }) {
  const zones: (keyof typeof ZONE_COLOR)[] = ['below_mv', 'mv_to_mev', 'mev_to_mav', 'mav_to_mrv', 'above_mrv'];
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px]">
      {zones.map((z) => (
        <div key={z} className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: ZONE_COLOR[z] }} />
          <span className="text-muted-foreground">{ZONE_LABEL[z][lang]}</span>
        </div>
      ))}
    </div>
  );
}

/** Get the recommendation text for a single muscle's current volume. */
export function VolumeAdvice({ muscle, sets, lang }: { muscle: MuscleGroup; sets: number; lang: 'ar' | 'de' }) {
  const zone = classifyVolume(muscle, sets);
  return (
    <p className="text-[11px] text-foreground/80" style={{ color: ZONE_COLOR[zone] }}>
      {ZONE_ADVICE[zone][lang]}
    </p>
  );
}
