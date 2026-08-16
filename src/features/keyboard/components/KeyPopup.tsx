import { memo } from 'react';

import { haptics } from '@/lib/native';

interface KeyPopupProps {
  label: string;
  popups?: string[];
  onSelectPopup?: (ch: string) => void;
  onClose?: () => void;
  positionStyle?: React.CSSProperties;
}

/**
 * Key press magnifier bubble & long-press popup selection menu (like Gboard).
 */
export const KeyPopup = memo(function KeyPopup({
  label,
  popups,
  onSelectPopup,
  positionStyle,
}: KeyPopupProps) {
  return (
    <div
      style={positionStyle}
      className="pointer-events-auto absolute bottom-full mb-1 z-50 flex -translate-x-1/2 flex-col items-center"
    >
      {/* Extended Popup Menu for Variants */}
      {popups && popups.length > 0 && (
        <div className="mb-2 flex items-center gap-1 rounded-xl border border-white/10 bg-[hsl(var(--surface-1))]/95 p-1 shadow-2xl backdrop-blur-md">
          {popups.map((variant) => (
            <button
              key={variant}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onSelectPopup) onSelectPopup(variant);
                haptics('selection');
              }}
              className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))] text-lg font-medium text-foreground transition-all active:scale-110 active:bg-[hsl(var(--live))] active:text-white"
            >
              {variant}
            </button>
          ))}
        </div>
      )}

      {/* Magnifier Bubble for Single Key Press */}
      {(!popups || popups.length === 0) && (
        <div className="flex h-14 min-w-12 animate-in fade-in zoom-in-95 items-center justify-center rounded-2xl border border-white/10 bg-[hsl(var(--surface-2))] px-3 shadow-xl backdrop-blur-md">
          <span className="text-2xl font-bold text-foreground">{label}</span>
        </div>
      )}
    </div>
  );
});
