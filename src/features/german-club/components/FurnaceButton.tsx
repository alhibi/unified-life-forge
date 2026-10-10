import React, { useMemo } from 'react';

interface FurnaceButtonProps {
  currentCount?: number;
  targetCount?: number;
  isJobRunning?: boolean;
  onClick: (e?: React.MouseEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Furnace Ember Button ("الفرن — حرف D الملتهب")
 * A deep circular instrument button featuring the ember 'D' glyph.
 *
 * Emphasis follows the design contract, not decoration: one accent colour
 * (signal) + size + a hairline border carry the identity. The hunger ratio
 * (1 - current/target, clamped) still drives the button, but through the
 * allowed channels only — the glyph's opacity, the border alpha and the
 * running pulse (transform/opacity). No glow, no gradient, no inset shadow.
 */
export const FurnaceButton: React.FC<FurnaceButtonProps> = ({
  currentCount = 0,
  targetCount = 25,
  isJobRunning = false,
  onClick,
  className = '',
  size = 'md',
}) => {
  // Hunger ratio calculation: 1 - (currentCount / targetCount), clamped [0.25, 1.0]
  const hungerRatio = useMemo(() => {
    const ratio = 1 - currentCount / Math.max(targetCount, 1);
    return Math.min(Math.max(ratio, 0.25), 1.0);
  }, [currentCount, targetCount]);

  // Size map — every size keeps the 44px minimum touch target; the steps
  // change the glyph rung and the largest outer ring.
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'h-11 w-11 text-meta';
      case 'lg':
        return 'h-12 w-12 text-title';
      case 'md':
      default:
        return 'h-11 w-11 text-lead';
    }
  }, [size]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={`الفرن (OpenRouter AI) — نسبة الاحتياج: ${Math.round(hungerRatio * 100)}% (${currentCount}/${targetCount})`}
      style={{
        // One accent colour, one channel: the border opacity tracks the real
        // fill ratio. No glow — a hairline whose weight says how hungry the
        // shelf is.
        borderColor: isJobRunning
          ? 'hsl(var(--signal))'
          : `hsl(var(--signal) / ${(0.35 + hungerRatio * 0.55).toFixed(2)})`,
      }}
      className={`rounded-full border bg-foreground transition-motion motion-safe:hover:scale-105 flex items-center justify-center relative group shrink-0 cursor-pointer overflow-hidden ${sizeClasses} ${className}`}
    >
      {/* Ember core symbol "D" */}
      <span
        style={{ opacity: isJobRunning ? 1 : 0.75 + hungerRatio * 0.25 }}
        className={`font-black font-mono tracking-tighter text-signal select-none relative z-raised transition-motion ${
          isJobRunning ? 'motion-safe:animate-pulse scale-110' : 'group-hover:scale-105'
        }`}
      >
        D
      </span>

      {/* Active job signal — a real running state, drawn as opacity/transform only. */}
      {isJobRunning && (
        <>
          <span className="absolute inset-0 rounded-full border border-signal motion-safe:animate-ping opacity-80 pointer-events-none" />
          <span className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-track motion-safe:animate-bounce z-raised" />
        </>
      )}

      {/* Hover tooltip hint */}
      <span className="absolute bottom-full mb-2 hidden group-hover:block z-float bg-foreground text-signal text-micro font-bold py-1 px-2.5 rounded-lg whitespace-nowrap border border-signal/30 pointer-events-none">
        الفرن: توليد الذكاء الاصطناعي ({currentCount}/{targetCount})
      </span>
    </button>
  );
};
