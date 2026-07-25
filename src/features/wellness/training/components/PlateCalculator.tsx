/**
 * Visual barbell-plate calculator.
 *
 * The display shows a stylised bar with plates on both sides — exact same
 * as you'd see on a rack. Useful both as a standalone tool and as a hint
 * inside the active session ("load 80 kg → 20 + 10 + 10 per side").
 *
 * Internally uses `platesForWeight` from `plateMath.ts`.
 */

import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { Minus, Plus } from '@/lib/icons';

import {
  DEFAULT_BAR_KG,
  DEFAULT_INVENTORY_KG,
  groupPlates,
  plateColor,
  platesForWeight,
  plateWidth,
  roundToGymWeight,
  TECHNIQUE_BAR_KG,
  WOMENS_BAR_KG,
} from '../plateMath';

interface PlateCalculatorProps {
  initialKg?: number;
  /** Notify caller when user changes the weight via stepper. */
  onChange?: (kg: number) => void;
  lang: 'ar';
  /** Show the bar selector (20/15/10 kg). */
  showBarPicker?: boolean;
  className?: string;
}

const T = {
  perSide: { ar: 'لكل جانب', },
  total: { ar: 'الكلي', },
  noPlates: { ar: 'البار فقط', },
  cantHit: { ar: 'لا يمكن الوصول لهذا الوزن بدقة', },
  bar: { ar: 'البار', },
  std: { ar: 'قياسي 20', },
  womens: { ar: 'نسائي 15', },
  tech: { ar: 'تقني 10', },
};

const BAR_OPTIONS = [
  { kg: DEFAULT_BAR_KG, labelKey: 'std' as const },
  { kg: WOMENS_BAR_KG, labelKey: 'womens' as const },
  { kg: TECHNIQUE_BAR_KG, labelKey: 'tech' as const },
];

export default function PlateCalculator({
  initialKg = 60,
  onChange,
  lang,
  showBarPicker = true,
  className = '',
}: PlateCalculatorProps) {
  const [target, setTarget] = useState(initialKg);
  const [barKg, setBarKg] = useState(DEFAULT_BAR_KG);

  const breakdown = useMemo(() => {
    return platesForWeight(target, { ...DEFAULT_INVENTORY_KG, barKg });
  }, [target, barKg]);

  const groups = groupPlates(breakdown.plates);
  const updateTarget = (next: number) => {
    const clamped = Math.max(barKg, Math.min(500, next));
    setTarget(clamped);
    onChange?.(clamped);
  };

  return (
    <div className={`bg-card border border-border/40 rounded-2xl p-4 space-y-4 ${className}`}>
      {/* Total + stepper */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {T.total[lang]}
          </p>
          <p className="text-[28px] font-bold tabular-nums leading-none text-foreground" dir="ltr">
            {target} <span className="text-[14px] text-muted-foreground">kg</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1" dir="ltr">
            {T.perSide[lang]}: {breakdown.plates.length === 0 ? T.noPlates[lang] : breakdown.plates.map((p) => p).join(' + ')}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => updateTarget(roundToGymWeight(target - 2.5))}
            className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center active:scale-95"
            aria-label="-2.5"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateTarget(roundToGymWeight(target + 2.5))}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
            aria-label="+2.5"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bar visualization */}
      <BarrellSvg
        plates={breakdown.plates}
        groups={groups}
      />

      {/* Plate legend */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <div
              key={g.kg}
              className="px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums flex items-center gap-1"
              style={{ background: `${plateColor(g.kg)}20`, color: plateColor(g.kg) === '#f8fafc' ? '#475569' : plateColor(g.kg) }}
              dir="ltr"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: plateColor(g.kg), border: g.kg === 5 ? '1px solid #94a3b8' : 'none' }} />
              {g.count}× {g.kg}kg
            </div>
          ))}
        </div>
      )}

      {Math.abs(breakdown.errorKg) > 0.5 && (
        <p className="text-[10px] text-amber-500" dir="ltr">
          {T.cantHit[lang]} (Δ {breakdown.errorKg > 0 ? '+' : ''}{breakdown.errorKg}kg)
        </p>
      )}

      {/* Bar picker */}
      {showBarPicker && (
        <div className="border-t border-border/30 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.bar[lang]}</p>
          <div className="flex gap-1.5 flex-wrap">
            {BAR_OPTIONS.map((b) => (
              <button
                key={b.kg}
                onClick={() => { setBarKg(b.kg); updateTarget(Math.max(b.kg, target)); }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${
                  barKg === b.kg
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-muted text-muted-foreground border border-border/40'
                }`}
              >
                {T[b.labelKey][lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────── Barbell SVG ────────────────── */

function BarrellSvg({
  plates,
}: {
  plates: number[];
  groups: { kg: number; count: number }[];
}) {
  // We display plates from outermost (smallest) to innermost (largest)
  // so the visual reads correctly (heavy plates are closest to the centre).
  const half = [...plates].sort((a, b) => b - a); // largest first
  const sleeve = 90;
  const totalCount = plates.length;
  const plateThickness = totalCount === 0 ? 0 : Math.max(8, Math.min(18, sleeve / Math.max(3, totalCount)));

  const renderSide = (side: 'left' | 'right') => (
    <div className={`flex items-center ${side === 'left' ? 'flex-row' : 'flex-row-reverse'}`} aria-hidden>
      {half.map((p, i) => {
        const w = plateWidth(p);
        const heightPct = w; // height scales with width
        return (
          <motion.div
            key={`${side}-${i}-${p}`}
            initial={{ scaleY: 0.8, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: 0.04 * i, type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              width: plateThickness,
              height: `${heightPct}%`,
              
              border: p === 5 ? '1.5px solid #94a3b8' : 'none',
              borderRadius: 2,
              marginInline: 0.5,
              
            }}
            title={`${p}kg`}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex items-center justify-center w-full">
      <div className="flex items-center w-full max-w-md">
        {/* Left sleeve */}
        <div className="flex items-center justify-end" style={{ width: '38%', height: 80 }}>
          {renderSide('left')}
        </div>
        {/* Centre bar */}
        <div className="relative" style={{ width: '24%', height: 12 }}>
          <div
            className="absolute inset-0"
            style={{
              
              borderRadius: 4,
            }}
          />
          <div
            className="absolute inset-y-0 start-0 end-0 mx-auto"
            style={{ width: '20%', background: '#9ca3af', height: '100%', borderRadius: 2 }}
          />
        </div>
        {/* Right sleeve */}
        <div className="flex items-center justify-start" style={{ width: '38%', height: 80 }}>
          {renderSide('right')}
        </div>
      </div>
    </div>
  );
}
