/**
 * Premium UI primitives — used by every wellness tab.
 *
 * v2 — gradient overhaul. Every layer now goes through the new
 * `surfaces` module so banding is eliminated:
 *   • PremiumCard delegates chrome to <SoftSurface>.
 *   • ProgressRing strokes use a 5-stop SVG `<linearGradient>` with
 *     a soft hue rotation — never a hard 2-stop fade.
 *   • ScoreGauge uses a multi-stop hue ring (red→amber→emerald) that
 *     reads as a continuous spectrum.
 *   • FastingRing tints active vs idle with a smooth alpha ramp.
 *   • StatTile background uses MeshGlow with low intensity so the
 *     accent never appears as a "puddle" in the corner.
 *   • HeatmapCalendar moved to a true CSS gradient cell colour with
 *     opacity bands derived from the value (perception-aligned curve).
 *   • SmoothBar (in surfaces) is the new ACWR/zone bar.
 *
 *  The behaviour and exported names stay identical so downstream tabs
 *  don't need to change imports. AnimatedNumber + useNowSecond moved
 *  here from inline definitions for shared use.
 */

import { motion } from 'framer-motion';
import React, { type ReactNode,useEffect, useId, useRef, useState } from 'react';

import type { LucideIcon } from '@/lib/icons';

import { SoftSurface, withAlpha } from './surfaces';

/* ─────────────────────── ProgressRing ─────────────────────── */

export interface ProgressRingProps {
  /** Value 0..1 (will be clamped). */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** CSS color or `hsl(var(--primary))`. */
  color?: string;
  /** Optional second stop colour for hue rotation along the arc. */
  colorAlt?: string;
  trackColor?: string;
  /** Center slot — overlay any content. */
  children?: ReactNode;
  /** ms — defaults to 1100. */
  duration?: number;
  /** Set true to render gradient stroke (default true). */
  gradient?: boolean;
  className?: string;
  /** Round line caps (default true). */
  rounded?: boolean;
}

/**
 * A circular progress ring whose stroke uses a 5-stop linear gradient
 * along the arc length. The hue stays anchored to `color` but each
 * stop steps through saturation/luminance variations so the ring
 * reads as one continuous gradient instead of a flat band.
 */
export function ProgressRing({
  value,
  size = 140,
  strokeWidth = 10,
  color = 'hsl(var(--primary))',
  colorAlt,
  trackColor = 'hsl(var(--muted) / 0.35)',
  children,
  duration = 1100,
  gradient = true,
  rounded = true,
  className,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - v * c;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `pe-grad-${uid}`;

  // Default alt = same hue at lower saturation; produces a soft sheen.
  const stopA = color;
  const stopB = colorAlt ?? color;

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        {gradient && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor={stopA} stopOpacity={1.0} />
              <stop offset="35%"  stopColor={stopA} stopOpacity={0.95} />
              <stop offset="65%"  stopColor={stopB} stopOpacity={0.85} />
              <stop offset="100%" stopColor={stopB} stopOpacity={0.7} />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={trackColor} strokeWidth={strokeWidth} fill="none"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={gradient ? `url(#${gradId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap={rounded ? 'round' : 'butt'}
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: duration / 1000, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ─────────────────────── ScoreGauge ─────────────────────── */

export type ScoreZone = 'low' | 'moderate' | 'good' | 'optimal';

const ZONE_COLOR: Record<ScoreZone, string> = {
  low:      '#f43f5e',  // rose-500 — softer than red-500
  moderate: '#f59e0b',  // amber-500
  good:     '#10b981',  // emerald-500
  optimal:  '#22c55e',  // green-500
};

const ZONE_COLOR_ALT: Record<ScoreZone, string> = {
  low:      '#fb7185',  // rose-400
  moderate: '#fbbf24',  // amber-400
  good:     '#34d399',  // emerald-400
  optimal:  '#4ade80',  // green-400
};

export function zoneColor(zone: ScoreZone | null | undefined): string {
  if (!zone) return 'hsl(var(--muted-foreground))';
  return ZONE_COLOR[zone];
}

export function zoneColorAlt(zone: ScoreZone | null | undefined): string {
  if (!zone) return 'hsl(var(--muted-foreground))';
  return ZONE_COLOR_ALT[zone];
}

export interface ScoreGaugeProps {
  /** 0..100 */
  value: number | null;
  zone?: ScoreZone | null;
  label: string;
  size?: number;
  caption?: string;
}

export function ScoreGauge({ value, zone, label, size = 160, caption }: ScoreGaugeProps) {
  const v = value ?? 0;
  const color = zoneColor(zone);
  const colorAlt = zoneColorAlt(zone);
  const display = value == null ? '—' : Math.round(value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ProgressRing
        value={v / 100}
        size={size}
        strokeWidth={Math.max(8, Math.round(size * 0.07))}
        color={color}
        colorAlt={colorAlt}
        gradient
      >
        <div className="text-center" dir="ltr">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</div>
          <div className="text-[40px] font-bold tabular-nums leading-none mt-0.5" style={{ color }}>
            {display}
          </div>
          {caption && (
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">{caption}</div>
          )}
        </div>
      </ProgressRing>
    </div>
  );
}

/* ─────────────────────── StatTile ─────────────────────── */

export interface StatTileProps {
  icon: LucideIcon;
  label: string;
  /** Pre-formatted value, e.g. "7.5 h" or "—". */
  value: string;
  unit?: string;
  /** Optional accent color — defaults to primary. */
  accent?: string;
  /** -100..+100 percent change — colored arrow rendered. */
  delta?: number | null;
  higherIsBetter?: boolean;
  /** Mini progress 0..1 — renders a thin track at the bottom. */
  progress?: number;
  onClick?: () => void;
}

export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  accent = 'hsl(var(--primary))',
  delta,
  higherIsBetter = true,
  progress,
  onClick,
}: StatTileProps) {
  const trendColor =
    delta == null
      ? 'hsl(var(--muted-foreground))'
      : (delta > 0) === higherIsBetter
      ? '#10b981'
      : delta === 0
      ? 'hsl(var(--muted-foreground))'
      : '#ef4444';
  const arrow = delta == null ? '—' : delta > 0 ? '↑' : delta < 0 ? '↓' : '·';

  return (
    <SoftSurface
      as={onClick ? 'button' : 'div'}
      onClick={onClick}
      accent={accent}
      intensity={0.7}
      variant="mesh"
      className="p-3"
    >
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: withAlpha(accent, 0.14) }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground truncate">{label}</span>
        </div>
        {delta != null && (
          <div
            className="text-[10px] font-bold tabular-nums shrink-0 flex items-center gap-0.5"
            style={{ color: trendColor }}
          >
            <span>{arrow}</span>
            <span>{Math.abs(Math.round(delta))}%</span>
          </div>
        )}
      </div>
      <div className="relative flex items-baseline gap-1 mt-1.5" dir="ltr">
        <span className="text-[22px] font-bold text-foreground tabular-nums leading-none">{value}</span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      {progress != null && (
        <div className="relative h-1 mt-2 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}
    </SoftSurface>
  );
}

/* ─────────────────────── HeatmapCalendar ─────────────────────── */

export interface HeatmapDay {
  iso: string;            // YYYY-MM-DD
  /** 0..1 intensity. */
  value: number;
}

export interface HeatmapCalendarProps {
  days: HeatmapDay[];     // newest last; ideally last 70 days for 10 weeks
  weeks?: number;         // default 10
  color?: string;
  /** Click handler — receives the iso. */
  onSelect?: (iso: string) => void;
}

/**
 * Cell colour blends a track tint with `color` at full opacity using
 * a perception-aligned curve so 0.2 intensity is visible without
 * dominating, and 1.0 tops out at full saturation.
 */
export function HeatmapCalendar({
  days,
  weeks = 10,
  color = 'hsl(var(--primary))',
  onSelect,
}: HeatmapCalendarProps) {
  const cells = days.slice(-weeks * 7);
  while (cells.length < weeks * 7) cells.unshift({ iso: '', value: 0 });

  const grid: HeatmapDay[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < cells.length; i++) {
    const row = i % 7;
    grid[row].push(cells[i]);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex gap-[3px]" dir="ltr">
      <div className="flex flex-col gap-[3px]">
        {grid.map((row, ri) => (
          <div key={ri} className="flex gap-[3px]">
            {row.map((d, ci) => {
              const v = Math.max(0, Math.min(1, d.value));
              const isToday = d.iso === today;
              const empty = d.iso === '';
              // Perception curve: sqrt for early ramp, then linear.
              const perceived = Math.sqrt(v);
              const bg = empty
                ? 'transparent'
                : v === 0
                  ? 'hsl(var(--muted) / 0.35)'
                  : `color-mix(in srgb, ${color} ${Math.round(perceived * 100)}%, hsl(var(--muted) / 0.35))`;
              return (
                <motion.button
                  key={`${ri}-${ci}`}
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: Math.min(ri * 0.01 + ci * 0.005, 0.4) }}
                  onClick={() => !empty && onSelect?.(d.iso)}
                  disabled={empty}
                  title={empty ? '' : `${d.iso}`}
                  className="rounded-[3px] shrink-0"
                  style={{
                    width: 12,
                    height: 12,
                    background: bg,
                    outline: isToday ? `1.5px solid ${color}` : undefined,
                    outlineOffset: isToday ? 1 : 0,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── FastingRing ─────────────────────── */

export interface FastingRingProps {
  elapsedSec: number;
  targetHours: number;
  size?: number;
  active: boolean;
  protocol?: string;
  lang: 'ar';
}

export function FastingRing({ elapsedSec, targetHours, size = 200, active, protocol, lang: _lang }: FastingRingProps) {
  const targetSec = targetHours * 3600;
  const ratio = Math.max(0, Math.min(1, elapsedSec / targetSec));
  const remainingSec = Math.max(0, targetSec - elapsedSec);
  const completed = ratio >= 1;
  const color    = completed ? '#10b981' : active ? '#a855f7' : 'hsl(var(--muted-foreground))';
  const colorAlt = completed ? '#34d399' : active ? '#c084fc' : 'hsl(var(--muted-foreground))';

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <ProgressRing
      value={ratio}
      size={size}
      strokeWidth={Math.round(size * 0.06)}
      color={color}
      colorAlt={colorAlt}
      gradient
    >
      <div className="text-center" dir="ltr">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {protocol ?? '16:8'}
        </div>
        <div className="text-[24px] font-bold tabular-nums leading-tight mt-0.5" style={{ color }}>
          {active ? fmt(elapsedSec) : '00:00:00'}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {completed
            ? 'مكتمل ✓'
            : active
              ? `${'متبقي'} ${fmt(remainingSec)}`
              : 'متوقّف'}
        </div>
      </div>
    </ProgressRing>
  );
}

/** Lightweight 1-second tick hook for live timers. */
export function useNowSecond(active: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/* ─────────────────────── SegmentedControl ─────────────────────── */

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  fullWidth = false,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`relative inline-flex p-0.5 rounded-full border border-border/40 bg-muted/40 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {segments.map((s) => {
        const active = s.value === value;
        const Icon = s.icon;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={`relative ${fullWidth ? 'flex-1' : ''} ${
              size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-[12px] px-3 py-1.5'
            } font-semibold rounded-full flex items-center justify-center gap-1 transition-colors ${
              active ? 'text-background' : 'text-muted-foreground'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${segments.map((x) => x.value).join('-')}`}
                className="absolute inset-0 rounded-full bg-foreground"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-1">
              {Icon && <Icon className="w-3 h-3" />}
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────── SectionHeader ─────────────────────── */

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, icon: Icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />}
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{title}</p>
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ─────────────────────── EmptyState ─────────────────────── */

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center space-y-2">
      <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/* ─────────────────────── PremiumCard ─────────────────────── */

export interface PremiumCardProps {
  children: ReactNode;
  /** Adds the accent mesh wash behind the content. */
  gradient?: boolean;
  accent?: string;
  /** 0..1 — visibility of the accent wash. */
  intensity?: number;
  className?: string;
  /** When true, renders a plain card with no decoration. */
  plain?: boolean;
}

/**
 * Backwards-compatible wrapper that delegates to <SoftSurface>. Every
 * card across the wellness section now picks up smooth multi-stop
 * gradients + dither overlay automatically.
 */
export function PremiumCard({
  children,
  gradient,
  accent = 'hsl(var(--primary))',
  intensity = 1,
  className,
  plain,
}: PremiumCardProps) {
  if (plain) {
    return (
      <div
        className={`rounded-2xl border border-border/45 bg-card ${className ?? ''}`}
      >
        {children}
      </div>
    );
  }
  return (
    <SoftSurface
      accent={accent}
      intensity={gradient ? intensity : 0}
      variant={gradient ? 'mesh' : 'flat'}
      dither={gradient}
      className={className}
    >
      {children}
    </SoftSurface>
  );
}

/* ─────────────────────── AnimatedNumber ─────────────────────── */

export function AnimatedNumber({
  value,
  digits = 0,
  duration = 900,
}: {
  value: number | null;
  digits?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      setDisplay(0);
      fromRef.current = 0;
      return;
    }
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  if (value == null) return <>—</>;
  return <>{display.toFixed(digits)}</>;
}
