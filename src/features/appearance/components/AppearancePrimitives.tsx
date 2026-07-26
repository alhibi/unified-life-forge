import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Check } from '@/lib/icons';
import { MOTION, pageItem as item } from '@/lib/motion';

/**
 * The shared atoms of the settings surfaces.
 *
 * المظهر, الواجهة والأبعاد and الحركة والأداء are all built exclusively from
 * these pieces, so a section about colour, a section about corner radius and a
 * section about frame pacing read as the same product rather than three screens
 * that happen to live next to each other.
 *
 * Everything here is presentational: no context, no persistence, no local state
 * beyond what framer-motion needs. Timings come from `MOTION`, never from a
 * literal — these components are inside the very screens that configure motion,
 * so they must demonstrate the settings they are editing.
 */

// ─── Section ────────────────────────────────────────────────

interface SettingsSectionProps {
  title: string;
  /** One line explaining what the section actually changes. */
  subtitle?: string;
  /** Decorative glyph — wrap in nothing, the section supplies `.row-icon`. */
  icon?: ReactNode;
  /** Right-aligned affordance: a per-section reset, a live readout, a badge. */
  action?: ReactNode;
  children: ReactNode;
}

/** One card, one heading, one stack. Every section on every screen uses it. */
export function SettingsSection({ title, subtitle, icon, action, children }: SettingsSectionProps) {
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
          {action ? <div className="shrink-0">{action}</div> : null}
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

/**
 * The canonical one-of-N picker: the active pill slides between options.
 *
 * The pill rides `MOTION.spring`, which means it inherits the user's speed and
 * bounce settings — and, critically, stops overshooting entirely when the easing
 * profile forbids overshoot. It used to carry a hardcoded stiffness/damping pair
 * that always overshot slightly, which is exactly the kind of small, repeated
 * rebound the motion brief rules out.
 */
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
                transition={MOTION.spring}
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
          transition={MOTION.overlayIn}
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
  /** One line explaining what moving this slider actually does. */
  note?: string;
  /**
   * The exact value this setting resolves to, in the unit it is applied in.
   * A percentage tells the user nothing about whether a gutter became 14px or
   * 22px; this does. Shown in a monospace readout beside the label.
   */
  resolved?: string;
}

/** Label + readout + slider, with optional preset chips and a resolved value. */
export function SliderRow({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
  presets,
  note,
  resolved,
}: SliderRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-meta text-muted-foreground">{label}</span>
        <span className="flex shrink-0 items-baseline gap-2">
          {resolved ? (
            <span className="font-mono text-micro tabular-nums text-muted-foreground/70">
              {resolved}
            </span>
          ) : null}
          <span className="text-meta font-semibold tabular-nums text-foreground">{valueLabel}</span>
        </span>
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
      {note ? <p className="text-micro text-muted-foreground">{note}</p> : null}
    </div>
  );
}

// ─── Toggle row ─────────────────────────────────────────────

interface ToggleRowProps {
  id: string;
  label: string;
  note: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Label + explanation + switch. The one shape for every boolean setting. */
export function ToggleRow({ id, label, note, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex min-h-[var(--ui-touch-min)] items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-start">
        <span className="block text-body font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-mini text-muted-foreground">{note}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ─── Choice row ─────────────────────────────────────────────

export interface ChoiceOption {
  id: string;
  label: string;
  note?: string;
}

interface ChoiceRowProps {
  label: string;
  options: readonly ChoiceOption[];
  value: string;
  onChange: (id: string) => void;
  layoutId: string;
  /** Shown under the control: the note belonging to the ACTIVE option. */
  showActiveNote?: boolean;
}

/**
 * A labelled segmented control that also explains the option currently
 * selected. Nine of these stacked would be unreadable without the label, and
 * unusable without the note.
 */
export function ChoiceRow({
  label,
  options,
  value,
  onChange,
  layoutId,
  showActiveNote = true,
}: ChoiceRowProps) {
  const active = options.find((option) => option.id === value);
  return (
    <div className="space-y-2">
      <span className="block text-meta text-muted-foreground">{label}</span>
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        layoutId={layoutId}
        aria-label={label}
      />
      {showActiveNote && active?.note ? (
        <p className="text-micro text-muted-foreground">{active.note}</p>
      ) : null}
    </div>
  );
}

// ─── Token inspector ────────────────────────────────────────

export interface InspectorEntry {
  /** The CSS custom property or concept, e.g. `--ui-pad-card`. */
  token: string;
  /** What it controls, in one short phrase. */
  label: string;
  /** The resolved value, e.g. `16px`. */
  value: string;
}

/**
 * A monospace readout of what the current settings actually compile to.
 *
 * This is the difference between a settings screen that says "110%" and one the
 * user can reason about: every number below is the literal value written onto
 * `<html>`, so a designer can verify a spec and a power user can see precisely
 * which px their choices produced.
 */
export function TokenInspector({ entries }: { entries: readonly InspectorEntry[] }) {
  return (
    <div className="overflow-hidden rounded-md bg-secondary/60">
      <dl className="divide-y">
        {entries.map((entry) => (
          <div key={entry.token} className="flex items-baseline justify-between gap-3 px-3 py-2">
            <dt className="min-w-0">
              <span className="block truncate text-mini text-foreground">{entry.label}</span>
              <span className="block truncate font-mono text-micro text-muted-foreground/70">
                {entry.token}
              </span>
            </dt>
            <dd className="shrink-0 font-mono text-mini font-semibold tabular-nums text-foreground">
              {entry.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Feedback line ──────────────────────────────────────────

/** The one shape for a success/error line under a destructive or IO action. */
export function FeedbackLine({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`text-meta ${tone === 'error' ? 'text-destructive' : 'text-foreground'}`}
    >
      {message}
    </p>
  );
}
