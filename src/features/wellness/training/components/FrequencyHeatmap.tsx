/**
 * GitHub-style training frequency heatmap.
 *
 * Each cell is a day; colour saturation = volume on that day.
 * Last `weeks` weeks shown.
 */

import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import type { WorkoutSession } from '../../wellnessDb';
import { frequencyHeatmap } from '../analyticsEngine';

export interface FrequencyHeatmapProps {
  workouts: WorkoutSession[];
  weeks?: number;
  lang: 'ar';
  className?: string;
}

const T = {
  title: { ar: 'تكرار التدريب', },
  desc: { ar: 'الأشهر الثلاثة الماضية', },
  none: { ar: 'لا تدريب', },
  light: { ar: 'خفيف', },
  moderate: { ar: 'متوسط', },
  heavy: { ar: 'ثقيل', },
  intense: { ar: 'مكثف', },
};

const DAYS_AR = ['أ', 'إ', 'ث', 'أ', 'خ', 'ج', 'س'];

const COLORS = ['#1e293b22', '#10b98140', '#10b98180', '#10b981c0', '#10b981'];

export default function FrequencyHeatmap({
  workouts,
  weeks = 13,
  lang,
  className = '',
}: FrequencyHeatmapProps) {
  const days = weeks * 7;
  const cells = useMemo(() => frequencyHeatmap(workouts, days), [workouts, days]);

  const cellMap = useMemo(() => {
    const m = new Map<string, number>();
    let max = 0;
    for (const c of cells) {
      m.set(c.date, c.totalVolumeKg);
      if (c.totalVolumeKg > max) max = c.totalVolumeKg;
    }
    return { map: m, max };
  }, [cells]);

  const grid = useMemo(() => {
    const out: { date: string; volume: number; level: number }[][] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from `weeks` ago, aligned to Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    const cursor = new Date(start);
    while (cursor <= today) {
      const week: { date: string; volume: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        const v = cellMap.map.get(iso) ?? 0;
        const ratio = cellMap.max > 0 ? v / cellMap.max : 0;
        const level = v === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(ratio * 4)));
        week.push({ date: iso, volume: v, level });
        cursor.setDate(cursor.getDate() + 1);
      }
      out.push(week);
    }
    return out;
  }, [cellMap, days]);

  const dayLabels = DAYS_AR;

  const cellSize = 10;
  const cellGap = 2;

  return (
    <div className={`bg-card border border-border/40 rounded-2xl p-4 space-y-3 ${className}`}>
      <div>
        <h3 className="text-[0.75rem] font-bold text-foreground">{T.title[lang]}</h3>
        <p className="text-[0.625rem] text-muted-foreground">{T.desc[lang]}</p>
      </div>

      <div className="flex gap-1.5" dir="ltr">
        <div className="flex flex-col gap-[2px] text-[0.625rem] text-muted-foreground/70 pe-1 w-3 text-center pt-[12px]">
          {[1, 3, 5].map((di) => (
            <span key={di} style={{ height: cellSize, marginBottom: cellGap, lineHeight: `${cellSize}px` }}>
              {dayLabels[di]}
            </span>
          ))}
        </div>

        <div className="flex gap-[2px] overflow-x-auto scrollbar-none">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((cell) => (
                <motion.div
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: wi * 0.005 }}
                  className="rounded-[2px]"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: COLORS[cell.level],
                  }}
                  title={`${cell.date} — ${Math.round(cell.volume)} kg`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] text-muted-foreground">{T.none[lang]}</span>
        <div className="flex items-center gap-[2px]">
          {COLORS.map((c, i) => (
            <span key={i} className="rounded-[2px]" style={{ width: cellSize, height: cellSize, background: c }} />
          ))}
        </div>
        <span className="text-[0.625rem] text-muted-foreground">{T.intense[lang]}</span>
      </div>
    </div>
  );
}
