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
 * A deep circular instrument button featuring a burning/flaming ember 'D' symbol.
 * The outer glow intensity dynamically derives from the shelf's real fill ratio (hunger ratio).
 * Pulsates and flickers with intense fiery flame energy when an active AI generation job is running.
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

  // Size dimensions map
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'w-7 h-7 text-xs';
      case 'lg':
        return 'w-11 h-11 text-base';
      case 'md':
      default:
        return 'w-9 h-9 text-sm';
    }
  }, [size]);

  // Dynamic box shadow and flaming halo
  const shadowGlow = useMemo(() => {
    if (isJobRunning) {
      return '0 0 20px rgba(255, 122, 41, 0.9), 0 0 35px rgba(201, 112, 59, 0.6), inset 0 0 10px rgba(255, 200, 50, 0.8)';
    }
    const spread = Math.round(hungerRatio * 16);
    const alpha = (0.3 + hungerRatio * 0.55).toFixed(2);
    return `0 0 ${spread}px rgba(201, 112, 59, ${alpha}), inset 0 0 6px rgba(255, 122, 41, 0.25)`;
  }, [hungerRatio, isJobRunning]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={`الفرن (OpenRouter AI) — نسبة الاحتياج: ${Math.round(hungerRatio * 100)}% (${currentCount}/${targetCount})`}
      style={{
        boxShadow: shadowGlow,
      }}
      className={`rounded-full border border-[#FF7A29]/70 bg-gradient-to-b from-[#2A170F] via-[#1A0E08] to-[#0D0704] hover:border-[#FF9E4A] hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group shrink-0 cursor-pointer overflow-hidden ${sizeClasses} ${className}`}
    >
      {/* Background Fiery Glow Surface */}
      <span
        style={{ opacity: isJobRunning ? 0.9 : 0.4 + hungerRatio * 0.5 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,41,0.45)_0%,rgba(201,112,59,0.15)_60%,transparent_100%)] pointer-events-none"
      />

      {/* Flaming Core Symbol "D" */}
      <span
        style={{
          opacity: isJobRunning ? 1 : 0.75 + hungerRatio * 0.25,
          textShadow: isJobRunning
            ? '0 0 12px #FF7A29, 0 0 20px #FF9E4A, 0 0 2px #FFFFFF'
            : '0 0 8px rgba(255, 122, 41, 0.7)',
        }}
        className={`font-black font-mono tracking-tighter text-[#FF9E4A] select-none relative z-10 transition-all ${
          isJobRunning ? 'motion-safe:animate-pulse text-amber-300 scale-110' : 'group-hover:text-amber-200'
        }`}
      >
        D
      </span>

      {/* Fiery Corona / Active Flame Flicker Effect */}
      {isJobRunning && (
        <>
          <span className="absolute inset-0 rounded-full border border-[#FF9E4A] motion-safe:animate-ping opacity-80 pointer-events-none" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-t from-[#FF7A29]/30 to-transparent motion-safe:animate-pulse pointer-events-none" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-stone-900 motion-safe:animate-bounce z-20" />
        </>
      )}

      {/* Hover Tooltip Hint */}
      <span className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-stone-950 text-amber-100 text-[0.625rem] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl border border-amber-500/30 pointer-events-none">
        الفرن: توليد الذكاء الاصطناعي ({currentCount}/{targetCount})
      </span>
    </button>
  );
};
