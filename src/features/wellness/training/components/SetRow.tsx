/**
 * Single-set row inside the session player.
 *
 * Layout: # · weight × reps · RPE picker (optional) · "done" toggle.
 */

import React from 'react';

import { Check, X } from '@/lib/icons';

import type { SetEntry } from '../../wellnessDb';
import RpeRirPicker from './RpeRirPicker';

export interface SetRowProps {
  index: number;
  set: SetEntry;
  isCardio?: boolean;
  isCompleted?: boolean;
  /** Suggested values shown in placeholder. */
  suggestion?: { weightKg?: number; reps?: number };
  onChange: (patch: Partial<SetEntry>) => void;
  onRemove: () => void;
  onComplete?: (completed: boolean) => void;
  showRpe?: boolean;
  lang: 'ar';
}

const T = {
  weight: { ar: 'الوزن', },
  reps: { ar: 'تكرار', },
  duration: { ar: 'المدة', },
  distance: { ar: 'كم', },
  done: { ar: 'تم', },
  rpe: { ar: 'الصعوبة', },
};

export default function SetRow({
  index,
  set,
  isCardio = false,
  isCompleted = false,
  suggestion,
  onChange,
  onRemove,
  onComplete,
  showRpe = false,
  lang,
}: SetRowProps) {
  return (
    <div
      className={`rounded-xl border p-2.5 space-y-2 transition-colors ${
        isCompleted
          ? 'bg-success/10 border-success/40'
          : 'bg-muted/30 border-border/30'
      }`}
    >
      <div className="flex items-center gap-2" dir="ltr">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold tabular-nums ${
          isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {index + 1}
        </div>

        {isCardio ? (
          <>
            <input
              type="number"
              inputMode="numeric"
              value={set.durationSec ? Math.round(set.durationSec / 60) : ''}
              onChange={(e) => onChange({ durationSec: Math.max(0, parseInt(e.target.value, 10) || 0) * 60 })}
              placeholder={'دقيقة'}
              aria-label={T.duration[lang]}
              className="flex-1 min-w-0 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[15px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={set.distanceKm ?? ''}
              onChange={(e) => onChange({ distanceKm: parseFloat(e.target.value) || 0 })}
              placeholder="km"
              aria-label={T.distance[lang]}
              className="flex-1 min-w-0 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[15px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
            />
          </>
        ) : (
          <>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={set.weightKg ?? ''}
              onChange={(e) => onChange({ weightKg: parseFloat(e.target.value) || 0 })}
              placeholder={suggestion?.weightKg != null ? `${suggestion.weightKg}` : 'kg'}
              aria-label={T.weight[lang]}
              className="flex-1 min-w-0 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[15px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
            />
            <span className="text-[12px] text-muted-foreground">×</span>
            <input
              type="number"
              inputMode="numeric"
              value={set.reps ?? ''}
              onChange={(e) => onChange({ reps: parseInt(e.target.value, 10) || 0 })}
              placeholder={suggestion?.reps != null ? `${suggestion.reps}` : T.reps[lang]}
              aria-label={T.reps[lang]}
              className="flex-1 min-w-0 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[15px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
            />
          </>
        )}

        {onComplete && (
          <button
            type="button"
            onClick={() => onComplete(!isCompleted)}
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            aria-label={T.done[lang]}
          >
            <Check className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-1.5 text-muted-foreground/60 hover:text-destructive"
          aria-label="remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {showRpe && !isCardio && (
        <div>
          <RpeRirPicker
            value={set.rpe ?? null}
            onChange={(v) => onChange({ rpe: v })}
            lang={lang}
            size="sm"
            compact
          />
        </div>
      )}
    </div>
  );
}
