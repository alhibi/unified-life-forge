import React, { useMemo } from 'react';

interface FurnaceButtonProps {
  currentCount: number;
  targetCount?: number;
  isJobRunning?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Furnace Ember Button ("الفرن")
 * Instrument button whose glow intensity is dynamically derived from the shelf's real fill ratio.
 * Hunger Ratio = 1 - (current_count / target_count), clamped so it's never fully dark
 * and settles into a low banked ember when target is met.
 */
export const FurnaceButton: React.FC<FurnaceButtonProps> = ({
  currentCount,
  targetCount = 25,
  isJobRunning = false,
  onClick,
  className = '',
}) => {
  // Hunger ratio calculation
  const hungerRatio = useMemo(() => {
    const ratio = 1 - currentCount / Math.max(targetCount, 1);
    // Clamp: minimum 0.2 (low banked ember when target met), maximum 1.0
    return Math.min(Math.max(ratio, 0.2), 1.0);
  }, [currentCount, targetCount]);

  // Dynamic opacity and box-shadow based on hunger ratio
  const shadowGlow = useMemo(() => {
    const spread = Math.round(hungerRatio * 14);
    const alpha = (0.25 + hungerRatio * 0.55).toFixed(2);
    return `0 0 ${spread}px rgba(201, 112, 59, ${alpha})`;
  }, [hungerRatio]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`الفرن — نسبة الاحتياج: ${Math.round(hungerRatio * 100)}% (${currentCount}/${targetCount})`}
      style={{
        boxShadow: isJobRunning ? '0 0 18px rgba(201, 112, 59, 0.85)' : shadowGlow,
      }}
      className={`w-9 h-9 rounded-full border border-[#C9703B]/60 bg-[#C9703B]/15 hover:bg-[#C9703B]/30 transition-all flex items-center justify-center relative group shrink-0 active:scale-95 ${className}`}
    >
      {/* Ember Core Symbol */}
      <span
        style={{ opacity: 0.6 + hungerRatio * 0.4 }}
        className={`font-bold text-sm text-[#C9703B] select-none ${
          isJobRunning ? 'motion-safe:animate-pulse font-black text-amber-500 scale-110' : ''
        }`}
      >
        D
      </span>

      {/* Active Job Energy Flicker Overlay */}
      {isJobRunning && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-[#C9703B] motion-safe:animate-ping opacity-75 pointer-events-none" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-stone-900 motion-safe:animate-bounce" />
        </>
      )}

      {/* Hover tooltip hint */}
      <span className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-stone-900 text-stone-100 text-[0.625rem] font-bold py-1 px-2 rounded-md whitespace-nowrap shadow-md pointer-events-none">
        الفرن ({currentCount}/{targetCount})
      </span>
    </button>
  );
};
