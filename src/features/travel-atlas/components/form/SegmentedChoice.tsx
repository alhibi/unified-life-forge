import type { IconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconComponent;
  /** Monospace glyph shown instead of an icon (the price ramp uses this). */
  glyph?: string;
}

interface SegmentedChoiceProps<T extends string | number> {
  value: T | null;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Tapping the active option clears the field. */
  allowClear?: boolean;
  onClear?: () => void;
  ariaLabel: string;
  className?: string;
}

/**
 * A row of mutually exclusive choices. Used for visit status and price level —
 * both short, closed lists where a dropdown would hide the options and cost an
 * extra tap.
 */
export default function SegmentedChoice<T extends string | number>({
  value,
  options,
  onChange,
  allowClear = false,
  onClear,
  ariaLabel,
  className,
}: SegmentedChoiceProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (isActive && allowClear) onClear?.();
              else onChange(option.value);
            }}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-button border px-3 text-mini transition-colors',
              isActive
                ? 'border-[hsl(var(--live))] bg-[hsl(var(--live)/0.1)] text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {option.glyph && (
              <span className="font-mono tabular-nums" aria-hidden="true">
                {option.glyph}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
