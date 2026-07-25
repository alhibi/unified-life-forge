import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Slider } from '@/components/ui/slider';
import { Check } from '@/lib/icons';
import { pageItem as item } from '@/lib/motion';

/**
 * The shared atoms of the appearance surface.
 *
 * Both settings screens — المظهر and الواجهة — are built exclusively from
 * these four pieces, so a section about colour and a section about corner
 * radius read as the same product rather than two screens that happen to
 * live next to each other. Everything here is presentational: no context,
 * no persistence, no local state beyond what framer-motion needs.
 */

// ─── Section ────────────────────────────────────────────────

interface SettingsSectionProps {
  title: string;
  /** One line explaining what the section actually changes. */
  subtitle?: string;
  /** Decorative glyph — wrap in nothing, the section supplies `.row-icon`. */
  icon?: ReactNode;
  children: ReactNode;
}

/** One card, one heading, one stack. Every section on both pages uses it. */
export function SettingsSection({ title, subtitle, icon, children }: SettingsSectionProps) {
  return (
    <motion.section variants={item}>
      <AppCard className="space-y-4">
        <div className="flex items-start gap-3">
          {icon ? <span className="row-icon">{icon}</span> : null}
          <div className="min-w-0 flex-1 text-start">
            <h2 className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-mini text-muted-foreground/80">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {children}
      </AppCard>
    </motion.section>
  );
}

// ─── Segmented control ──────────────────────────────────────

export interface SegmentedOption {
  id: string;
  label: string;
  /** Optional second line — the px of a size step, the ratio of a scale… */
  sublabel?: string;
}

interface SegmentedControlProps {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  /**
   * framer-motion shared-layout id. Must be unique per control on a page,
   * otherwise two controls fight over the same travelling pill.
   */
  layoutId: string;
  'aria-label'?: string;
}

/** The canonical one-of-N picker: the active pill slides between options. */
export function SegmentedControl({
  options,
  value,
  onChange,
  layoutId,
  'aria-label': ariaLabel,
}: SegmentedControlProps) {
  return (
    <div className="flex gap-1 rounded-md bg-secondary p-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={isActive}
            className={`relative min-h-[var(--ui-touch-min)] min-w-0 flex-1 rounded-md px-1 py-2 text-center text-meta font-medium transition-colors ${
              isActive ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-raised block truncate">{option.label}</span>
            {option.sublabel ? (
              <span className="relative z-raised mt-0.5 block truncate text-micro tabular-nums">
                {option.sublabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ─── Option card ────────────────────────────────────────────

interface OptionCardProps {
  title: string;
  note?: string;
  active: boolean;
  onClick: () => void;
  /** Extra content under the note — a live preview line, a swatch row… */
  children?: ReactNode;
}

/** A selectable surface. The Check badge is the only active affordance. */
export function OptionCard({ title, note, active, onClick, children }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`app-card app-card-pressable flex w-full items-start justify-between gap-3 text-start ${
        active ? 'border-primary/50' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-body font-semibold text-foreground">{title}</div>
        {children}
        {note ? <div className="mt-1 text-mini text-muted-foreground">{note}</div> : null}
      </div>
      {active && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary"
          aria-hidden
        >
          <Check className="h-4 w-4 stroke-[2.5] text-primary-foreground" />
        </motion.span>
      )}
    </button>
  );
}

// ─── Slider row ─────────────────────────────────────────────

export interface SliderPreset {
  value: number;
  label: string;
}

interface SliderRowProps {
  label: string;
  /** Right-aligned readout — a percentage, a preset name, a raw number. */
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Optional shortcut chips for the values that were actually designed. */
  presets?: readonly SliderPreset[];
}

/** Label + readout + slider, with optional preset chips underneath. */
export function SliderRow({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
  presets,
}: SliderRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-meta text-muted-foreground">{label}</span>
        <span className="text-meta font-semibold tabular-nums text-foreground">{valueLabel}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        min={min}
        max={max}
        step={step}
        aria-label={label}
      />
      {presets && presets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const isActive = Math.abs(preset.value - value) < step / 2;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.value)}
                aria-pressed={isActive}
                className={`min-h-[var(--ui-touch-min)] rounded-sm px-2.5 py-1 text-mini font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
