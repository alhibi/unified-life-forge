/**
 * RPE / RIR scale input.
 *
 * Renders a 10-step horizontal scale from 1 (easy) to 10 (max). Each step
 * has a colour gradient (cool → hot) and a tooltip describing what the RPE
 * value *feels like*. Tapping a step picks it; long-pressing reveals the
 * RIR-equivalent description.
 *
 * Bilingual labels for accessibility.
 */

import { motion } from 'framer-motion';
import React, { useState } from 'react';

export interface RpeRirPickerProps {
  value: number | null;
  onChange: (v: number) => void;
  lang: 'ar';
  /** RIR variant: shows "reps in reserve" labels alongside RPE. */
  showRir?: boolean;
  /** Half-step granularity (RPE 6.5 etc.). */
  halfSteps?: boolean;
  /** Compact: only emoji + value, no description. */
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RPE_DESCRIPTIONS: Record<number, { ar: string; emoji: string; color: string }> = {
  1:  { ar: 'سهل جداً', emoji: '😴', color: '#94a3b8' },
  2:  { ar: 'خفيف جداً', emoji: '🙂', color: '#60a5fa' },
  3:  { ar: 'إحماء', emoji: '😊', color: '#22c55e' },
  4:  { ar: 'مريح', emoji: '😌', color: '#10b981' },
  5:  { ar: 'متوسط', emoji: '🙂', color: '#84cc16' },
  6:  { ar: 'صعب قليلاً (4 RIR)', emoji: '😐', color: '#eab308' },
  7:  { ar: 'صعب (3 RIR)', emoji: '😤', color: '#f59e0b' },
  8:  { ar: 'صعب جداً (2 RIR)', emoji: '😣', color: '#fb923c' },
  9:  { ar: 'قريب من الفشل (1 RIR)', emoji: '🥵', color: '#ef4444' },
  10: { ar: 'فشل تام (0 RIR)', emoji: '🔥', color: '#dc2626' },
};

export default function RpeRirPicker({
  value,
  onChange,
  lang,
  halfSteps = false,
  compact = false,
  size = 'md',
}: RpeRirPickerProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const desc = display ? RPE_DESCRIPTIONS[Math.min(10, Math.max(1, Math.round(display)))] : null;

  const steps = halfSteps
    ? [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const buttonSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 34;
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px';

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1" dir="ltr">
        {steps.map((s) => {
          const active = value != null && Math.abs(value - s) < 0.001;
          const bg = active
            ? RPE_DESCRIPTIONS[Math.round(s)]?.color
            : hover === s
              ? `${RPE_DESCRIPTIONS[Math.round(s)]?.color}20`
              : 'transparent';
          return (
            <motion.button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              whileTap={{ scale: 0.92 }}
              className="shrink-0 rounded-lg flex items-center justify-center font-bold tabular-nums"
              style={{
                width: buttonSize,
                height: buttonSize,
                fontSize,
                background: bg,
                color: active ? '#fff' : RPE_DESCRIPTIONS[Math.round(s)]?.color,
                border: active ? 'none' : `1px solid ${RPE_DESCRIPTIONS[Math.round(s)]?.color}40`,
              }}
            >
              {s}
            </motion.button>
          );
        })}
      </div>
      {!compact && desc && (
        <motion.div
          key={String(display)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 text-mini"
        >
          <span className="text-body">{desc.emoji}</span>
          <span className="font-semibold" style={{ color: desc.color }}>
            RPE {display} — {desc[lang]}
          </span>
        </motion.div>
      )}
    </div>
  );
}
