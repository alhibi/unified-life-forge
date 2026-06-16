/**
 * Premium input primitives — built for one-handed mobile data entry.
 *
 * The original wellness forms were 100% `<input type="number">` with
 * tiny tap targets and no haptic affordances. On mobile, that means
 * the keyboard appears for every field, which is a friction tax on
 * data the user is supposed to enter daily. These primitives replace
 * that with native-feel controls:
 *
 *  • <Stepper>       — −/+ buttons + tap-and-hold accelerate, 44pt
 *                      tap targets, optional slider companion.
 *  • <RatingScale>   — 1-5 pill row with active fill that slides.
 *  • <ChoiceCardGrid>— 2-/3-col grid of icon cards for enums (sex,
 *                      goal, activity level, experience).
 *  • <NumberSlider>  — vertical thumb slider with snap stops; the
 *                      label updates live, the keyboard never opens.
 *  • <YearWheel>     — quick year picker (1940..now) with momentum
 *                      scroll. Avoids `<input type="number">` for the
 *                      `birthYear` field.
 *  • <TimeChip>      — used by SupplementsTab; renders a pill that
 *                      opens a dial-style picker on tap (no keyboard).
 *  • <SearchableChips>— large pickers (e.g. nutrients) collapse to a
 *                      single popover with search; selected items show
 *                      as compact removable chips outside.
 *  • <Field>         — consistent label+helper wrapper.
 *
 *  All controls call back synchronously with primitive values; they
 *  never own form state themselves. Tap haptics use `navigator.vibrate`
 *  when available so the UI feels physical without a dependency.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Minus, Plus, Search, X } from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';
import { withAlpha, softLinear } from './surfaces';

const haptic = (ms = 8) => {
  try { (navigator as any).vibrate?.(ms); } catch { /* noop */ }
};

/* ─────────────────────────── Field wrapper ─────────────────────────── */

export function Field({
  label,
  hint,
  icon: Icon,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/80">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </span>
          {hint && <span className="text-[10px] text-muted-foreground/60">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────── Stepper ─────────────────────────── */

export interface StepperProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Decimals to render. */
  digits?: number;
  /** Defaults shown when value is undefined. */
  placeholder?: string;
  unit?: string;
  /** Accent color for the active state. */
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Allow direct keyboard entry by tapping the number. */
  editable?: boolean;
  /** Optional companion slider (renders below). */
  withSlider?: boolean;
  /** Quick presets shown as chips below the stepper. */
  presets?: number[];
  /** Renders a unit shortcut row (e.g. ml: 200/300/500). */
  presetLabel?: (v: number) => string;
}

/**
 * The workhorse numeric input.
 *
 * UX:
 *  • −/+ buttons are 44×44pt with 8% colored backgrounds.
 *  • Tap-and-hold the −/+ button accelerates after 600ms (3× speed).
 *  • The middle reads as the live value, big and tabular.
 *  • Tapping the value opens a tiny inline number input (no keyboard
 *    by default — keyboard only appears if `editable=true`).
 *  • Optional slider companion provides whole-range jumps quickly.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  digits = 0,
  placeholder = '—',
  unit,
  accent = 'hsl(var(--primary))',
  size = 'md',
  editable = false,
  withSlider = false,
  presets,
  presetLabel,
}: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const sizes = {
    sm: { btn: 'w-9 h-9', text: 'text-[18px]', unit: 'text-[10px]' },
    md: { btn: 'w-11 h-11', text: 'text-[24px]', unit: 'text-[11px]' },
    lg: { btn: 'w-12 h-12', text: 'text-[32px]', unit: 'text-[12px]' },
  }[size];

  const display = value == null || Number.isNaN(value) ? placeholder : value.toFixed(digits);

  const apply = useCallback(
    (next: number | undefined) => {
      if (next == null) return onChange(undefined);
      const clamped = Math.max(min, Math.min(max, next));
      onChange(Number(clamped.toFixed(digits)));
      haptic(6);
    },
    [onChange, min, max, digits],
  );

  // Press-and-hold accelerator
  const holdRef = useRef<{ id: number | null; start: number; dir: number; speed: number }>({
    id: null,
    start: 0,
    dir: 0,
    speed: 1,
  });

  const stop = () => {
    if (holdRef.current.id != null) {
      window.clearInterval(holdRef.current.id);
      holdRef.current.id = null;
    }
  };

  const tick = (dir: number) => {
    apply((value ?? 0) + dir * step * holdRef.current.speed);
  };

  const press = (dir: number) => {
    stop();
    tick(dir);
    holdRef.current.start = performance.now();
    holdRef.current.dir = dir;
    holdRef.current.speed = 1;
    holdRef.current.id = window.setInterval(() => {
      const elapsed = performance.now() - holdRef.current.start;
      if (elapsed > 600) holdRef.current.speed = 3;
      if (elapsed > 1500) holdRef.current.speed = 8;
      tick(dir);
    }, 110) as unknown as number;
  };

  // Cleanup
  useEffect(() => stop, []);

  const commit = () => {
    setEditing(false);
    if (draft.trim() === '') return apply(undefined);
    const n = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    apply(n);
  };

  return (
    <div className="space-y-2">
      <div
        className="relative flex items-center justify-between gap-2 p-1.5 rounded-2xl"
        style={{ background: withAlpha(accent, 0.06), border: `1px solid ${withAlpha(accent, 0.15)}` }}
      >
        <button
          type="button"
          onPointerDown={() => press(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className={`${sizes.btn} rounded-xl flex items-center justify-center text-foreground active:scale-90 transition-transform`}
          style={{ background: withAlpha(accent, 0.12) }}
          aria-label="decrease"
        >
          <Minus className="w-5 h-5" style={{ color: accent }} />
        </button>

        <div className="flex-1 text-center min-w-0">
          {editing ? (
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^\d.,-]/g, ''))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className={`w-full bg-transparent text-foreground font-bold tabular-nums text-center outline-none ${sizes.text}`}
              dir="ltr"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!editable) return;
                setDraft(value == null ? '' : value.toFixed(digits));
                setEditing(true);
              }}
              className="w-full"
              dir="ltr"
            >
              <span className={`${sizes.text} font-bold tabular-nums leading-none`} style={{ color: value == null ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}>
                {display}
              </span>
              {unit && <span className={`${sizes.unit} text-muted-foreground ms-1`}>{unit}</span>}
            </button>
          )}
        </div>

        <button
          type="button"
          onPointerDown={() => press(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className={`${sizes.btn} rounded-xl flex items-center justify-center text-foreground active:scale-90 transition-transform`}
          style={{ background: withAlpha(accent, 0.12) }}
          aria-label="increase"
        >
          <Plus className="w-5 h-5" style={{ color: accent }} />
        </button>
      </div>

      {/* Companion slider */}
      {withSlider && (
        <NumberSlider
          value={value ?? min}
          min={min}
          max={max}
          step={step}
          onChange={apply}
          accent={accent}
        />
      )}

      {/* Preset chips */}
      {presets && presets.length > 0 && (
        <div className="flex gap-1.5" dir="ltr">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => apply(p)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border active:scale-95 transition-transform"
              style={{
                borderColor: withAlpha(accent, 0.25),
                background: value === p ? withAlpha(accent, 0.15) : withAlpha(accent, 0.04),
                color: accent,
              }}
            >
              {presetLabel ? presetLabel(p) : p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── NumberSlider ─────────────────────────── */

export interface NumberSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  accent?: string;
}

/**
 * Single-row range slider with the active band gradient-filled and the
 * thumb large enough for fingertip use. Uses native `<input type="range">`
 * for accessibility/keyboard, but visually styled.
 */
export function NumberSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  accent = 'hsl(var(--primary))',
}: NumberSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-9 flex items-center" dir="ltr">
      <div
        className="absolute inset-x-0 h-1.5 rounded-full"
        style={{ background: 'hsl(var(--muted) / 0.6)' }}
      />
      <div
        className="absolute h-1.5 rounded-full pointer-events-none"
        style={{
          left: 0,
          width: `${pct}%`,
          
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer
 [&::-webkit-slider-thumb]:appearance-none
 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
 [&::-webkit-slider-thumb]:rounded-full
 [&::-webkit-slider-thumb]:border-2
 [&::-webkit-slider-thumb]:border-card
 [&::-webkit-slider-thumb]:
 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
 [&::-moz-range-thumb]:rounded-full
 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-card
 [&::-moz-range-thumb]:
 [&::-moz-range-thumb]:bg-[var(--thumb)]
 [&::-webkit-slider-thumb]:bg-[var(--thumb)]"
        style={{ ['--thumb' as any]: accent }}
      />
    </div>
  );
}

/* ─────────────────────────── RatingScale ─────────────────────────── */

export interface RatingScaleProps {
  value: number | undefined;
  onChange: (v: number) => void;
  /** Default 1-5. */
  max?: number;
  /** Optional emoji/word labels for endpoints. */
  lowLabel?: string;
  highLabel?: string;
  accent?: string;
}

/**
 * 1-5 pill row with sliding active background. Used for sleep quality,
 * energy, and mood — replaces three separate `<input type="number">`
 * fields with a single tap.
 */
export function RatingScale({
  value,
  onChange,
  max = 5,
  lowLabel,
  highLabel,
  accent = 'hsl(var(--primary))',
}: RatingScaleProps) {
  const layoutId = useRef(`rs-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className="space-y-1">
      <div
        className="flex p-0.5 rounded-full border"
        style={{
          background: 'hsl(var(--muted) / 0.4)',
          borderColor: 'hsl(var(--border) / 0.45)',
        }}
        dir="ltr"
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => { haptic(6); onChange(n); }}
              className="relative flex-1 py-1.5 text-[12px] font-bold tabular-nums transition-colors"
              style={{ color: active ? '#fff' : 'hsl(var(--muted-foreground))' }}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full"
                  style={{ background: accent }}
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative">{n}</span>
            </button>
          );
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-[10px] text-muted-foreground/70 px-1" dir="ltr">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── ChoiceCardGrid ─────────────────────────── */

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
}

export interface ChoiceCardGridProps<T extends string> {
  options: Choice<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}

/**
 * Replaces `<select>` and pill rows for enums where the user benefits
 * from a visual reminder of each option (e.g. activity level, fitness
 * goal). Each card has an icon, a label, an optional description, and
 * a check tick when selected.
 */
export function ChoiceCardGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: ChoiceCardGridProps<T>) {
  const cols = columns === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className={`grid ${cols} gap-2`}>
      {options.map((o) => {
        const active = value === o.value;
        const accent = o.color ?? 'hsl(var(--primary))';
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => { haptic(8); onChange(o.value); }}
            className="relative rounded-2xl p-3 text-start overflow-hidden transition-all"
            style={{
              background: active ? withAlpha(accent, 0.10) : 'hsl(var(--card))',
              border: `1px solid ${active ? withAlpha(accent, 0.45) : 'hsl(var(--border) / 0.45)'}`,
               0.6)}` : undefined,
            }}
          >
            {/* Soft top wash on active */}
            {active && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: softLinear(accent, 0.10, '180deg'),
                }}
              />
            )}
            <div className="relative flex items-start gap-2">
              {Icon && (
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: withAlpha(accent, 0.12) }}
                >
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold text-foreground truncate">{o.label}</div>
                {o.description && (
                  <div className="text-[10px] text-muted-foreground/70 truncate">{o.description}</div>
                )}
              </div>
              {active && (
                <Check className="w-4 h-4 shrink-0" style={{ color: accent }} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── YearWheel ─────────────────────────── */

export interface YearWheelProps {
  value: number;
  onChange: (year: number) => void;
  min?: number;
  max?: number;
  accent?: string;
}

/**
 * A vertical scrollable wheel of years with snap. Replaces the
 * `<input type="number">` for `birthYear`. The current year is bigger
 * and centered; flanking years fade into the edges.
 *
 * Implementation note: native scroll-snap gives us momentum + snap
 * for free. We listen to scroll position and emit `onChange` after
 * idle for ~120ms so we don't fire during the flick.
 */
export function YearWheel({
  value,
  onChange,
  min = 1940,
  max = new Date().getFullYear(),
  accent = 'hsl(var(--primary))',
}: YearWheelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const idleRef = useRef<number | null>(null);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = max; y >= min; y--) out.push(y);
    return out;
  }, [min, max]);

  const ITEM_H = 40;

  // Scroll to value on mount / value change.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = years.indexOf(value);
    if (idx < 0) return;
    el.scrollTo({ top: idx * ITEM_H, behavior: 'auto' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, years.length]);

  const onScroll = () => {
    if (idleRef.current) window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const y = years[Math.max(0, Math.min(years.length - 1, idx))];
      if (y !== value) {
        haptic(4);
        onChange(y);
      }
    }, 130) as unknown as number;
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border"
      style={{
        background: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border) / 0.45)',
        height: ITEM_H * 5,
      }}
    >
      {/* Top + bottom fade masks */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-10 z-10 pointer-events-none"
        style={{
          
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-10 z-10 pointer-events-none"
        style={{
          
        }}
      />
      {/* Centre highlight strip */}
      <div
        aria-hidden
        className="absolute inset-x-3 top-1/2 -translate-y-1/2 z-0 pointer-events-none rounded-xl"
        style={{
          height: ITEM_H,
          background: withAlpha(accent, 0.08),
          border: `1px solid ${withAlpha(accent, 0.2)}`,
        }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto scrollbar-none"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: ITEM_H * 2,
          paddingBottom: ITEM_H * 2,
        }}
      >
        {years.map((y) => {
          const active = y === value;
          return (
            <div
              key={y}
              className="flex items-center justify-center font-bold tabular-nums"
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                color: active ? accent : 'hsl(var(--muted-foreground))',
                fontSize: active ? 22 : 16,
                transition: 'color 150ms linear, font-size 150ms linear',
              }}
            >
              {y}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── TimeChip ─────────────────────────── */

/**
 * Pill-style time-of-day editor that opens the native time picker
 * when tapped. Visually consistent with the other input chips —
 * importantly, the keyboard never opens.
 */
export function TimeChip({
  value,
  onChange,
  onRemove,
  accent = 'hsl(var(--primary))',
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  accent?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full ps-2.5 pe-1 py-1"
      style={{
        background: withAlpha(accent, 0.10),
        border: `1px solid ${withAlpha(accent, 0.25)}`,
      }}
    >
      <button
        type="button"
        onClick={() => ref.current?.showPicker?.() ?? ref.current?.focus()}
        className="text-[12px] font-bold tabular-nums"
        style={{ color: accent }}
        dir="ltr"
      >
        {value}
      </button>
      <input
        ref={ref}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-label="time"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ color: accent }}
          aria-label="remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── SearchableChips ─────────────────────────── */

export interface SearchableChipsProps<T> {
  options: T[];
  /** Selected values as IDs (deduped). */
  value: string[];
  onChange: (next: string[]) => void;
  getId: (o: T) => string;
  getLabel: (o: T) => string;
  /** Optional: extra category for grouping. */
  getGroup?: (o: T) => string;
  placeholder?: string;
  /** Title in the modal. */
  modalTitle?: string;
  accent?: string;
}

/**
 * Compact selected-as-chips display + a button that opens a full
 * search modal. Avoids the 80-checkbox grid that previously lived
 * inside SupplementsTab.
 */
export function SearchableChips<T>({
  options,
  value,
  onChange,
  getId,
  getLabel,
  getGroup,
  placeholder = '',
  modalTitle,
  accent = 'hsl(var(--primary))',
}: SearchableChipsProps<T>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const byId = useMemo(() => {
    const m = new Map<string, T>();
    for (const o of options) m.set(getId(o), o);
    return m;
  }, [options, getId]);

  const selected = useMemo(
    () => value.map((id) => byId.get(id)).filter((x): x is T => !!x),
    [value, byId],
  );

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    const list = norm
      ? options.filter((o) => getLabel(o).toLowerCase().includes(norm))
      : options;
    if (!getGroup) return [['', list] as const];
    const groups = new Map<string, T[]>();
    for (const o of list) {
      const g = getGroup(o);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(o);
    }
    return Array.from(groups.entries());
  }, [options, q, getLabel, getGroup]);

  const toggle = (id: string) => {
    haptic(6);
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 items-center">
        {selected.map((o) => (
          <span
            key={getId(o)}
            className="inline-flex items-center gap-1 rounded-full ps-2.5 pe-1 py-1 text-[11px] font-semibold"
            style={{
              background: withAlpha(accent, 0.10),
              color: accent,
              border: `1px solid ${withAlpha(accent, 0.25)}`,
            }}
          >
            {getLabel(o)}
            <button
              type="button"
              onClick={() => toggle(getId(o))}
              className="w-5 h-5 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full ps-2 pe-2.5 py-1 border border-dashed"
          style={{
            color: accent,
            borderColor: withAlpha(accent, 0.4),
          }}
        >
          <Plus className="w-3 h-3" />
          {placeholder}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 pt-2 pb-3 flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold text-foreground">{modalTitle}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[12px] font-semibold"
                  style={{ color: accent }}
                >
                  {value.length}
                </button>
              </div>
              <div className="px-4 pb-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="…"
                    className="w-full bg-muted/50 border border-border/40 rounded-full ps-9 pe-3 py-2 text-[13px] text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {filtered.map(([group, list], gi) => (
                  <div key={group || gi} className="mb-2">
                    {group && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3 py-1.5">
                        {group}
                      </p>
                    )}
                    <div className="grid grid-cols-1">
                      {list.map((o) => {
                        const id = getId(o);
                        const sel = value.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggle(id)}
                            className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-start active:scale-[0.99] transition-transform"
                            style={{
                              background: sel ? withAlpha(accent, 0.08) : 'transparent',
                            }}
                          >
                            <span className="text-[13px] font-medium text-foreground">
                              {getLabel(o)}
                            </span>
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{
                                background: sel ? accent : 'transparent',
                                border: sel ? 'none' : '1.5px solid hsl(var(--border))',
                              }}
                            >
                              {sel && <Check className="w-3 h-3 text-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── Toggle ─────────────────────────── */

export function Toggle({
  value,
  onChange,
  label,
  description,
  accent = 'hsl(var(--primary))',
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => { haptic(6); onChange(!value); }}
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border"
      style={{
        background: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border) / 0.45)',
      }}
    >
      <div className="text-start min-w-0">
        <div className="text-[13px] font-semibold text-foreground truncate">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground/70 truncate">{description}</div>}
      </div>
      <span
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: value ? accent : 'hsl(var(--muted))' }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
 className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
 style={{ [value ? 'right' : 'left']: 2 }}
        />
      </span>
    </button>
  );
}

/* ─────────────────────────── Drawer ─────────────────────────── */

export function Drawer({
  open,
  onClose,
  title,
  children,
  /** Footer rendered after children — typically save/cancel buttons. */
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {title && (
              <div className="px-5 pt-2 pb-3 flex items-center justify-between gap-2 shrink-0">
                <h2 className="text-[16px] font-bold text-foreground">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
                  aria-label="close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {children}
            </div>
            {footer && (
              <div className="px-5 py-3 border-t border-border/40 shrink-0 safe-bottom">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
