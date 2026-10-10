/**
 * Premium surfaces — soft, banding-free gradient primitives.
 *
 * The previous PremiumCard used a single 2-stop radial gradient
 * (`color`, `transparent 70%`) which renders perceptually as a hard
 * ring on most LCDs and creates visible "puddle" edges around blurred
 * halo divs. This module replaces it with three composable layers:
 *
 *   1. <SoftWash>     — multi-stop radial / linear gradient that
 *                       follows a perceptually smooth alpha curve.
 *                       Five hand-tuned stops mean the eye never sees
 *                       a single contour line.
 *   2. <MeshGlow>     — two off-axis, soft-light radial blooms blended
 *                       together. Mesh-gradient feel without WebGL.
 *   3. <DitherLayer>  — SVG fractal-noise overlay at ~3% opacity which
 *                       breaks up any residual banding. The browser
 *                       composes this above the gradient at zero cost
 *                       (it's a single 64×64 tiled SVG, GPU-uploadable).
 *
 *  All three live behind `pointer-events:none`, are aria-hidden, and
 *  never push out of their containing rounded box (they live inside
 *  `overflow-hidden`). They are stacked in z-index but not in DOM
 *  order to keep accessible content first.
 *
 *  <SoftSurface> is the convenience wrapper that combines all three
 *  inside a rounded card chrome.
 */

import React, { type ReactNode } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Color helpers ─────────────────────────── */

/** Robust HSL var or hex/rgb passthrough — returns rgba with given alpha. */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  // hsl(var(--primary)) → use color-mix so theme values stay live.
  if (color.startsWith('hsl(') || color.startsWith('hsla(')) {
    return `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
  }
  // Hex
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  // rgb(...)
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
  }
  return color;
}

/**
 * Build a radial gradient with a perceptually smooth alpha falloff.
 *
 * Uses a five-stop curve that approximates a Gaussian:
 *   0%  → α
 *   18% → α · 0.78
 *   38% → α · 0.46
 *   62% → α · 0.18
 *   82% → α · 0.05
 *   100% → 0
 *
 * The narrow steps at the extremes (0-18 and 82-100) keep the falloff
 * gentle, while the wider middle bands let the bulk of the wash live
 * mid-card, where banding would otherwise be most visible.
 */
export function softRadial(
  color: string,
  alpha: number,
  shape = 'ellipse 75% 100% at 50% 0%',
): string {
  // Gradients disabled project-wide — return a flat translucent wash.
  void shape;
  return withAlpha(color, alpha * 0.18);
}

/**
 * Smooth linear gradient with same five-stop curve.
 * Direction defaults to top-.
 */
export function softLinear(color: string, alpha: number, direction = '180deg'): string {
  void direction;
  return withAlpha(color, alpha * 0.18);
}

/**
 * Multi-stop linear gradient that interpolates through ANY number of
 * colors, with each segment getting its own smooth easing. Used for
 * the ACWR zone bar so the band reads as one continuous spectrum
 * instead of four hard rectangles.
 */
export function smoothSpectrum(
  stops: { color: string; at: number }[],
  direction = '90deg',
): string {
  if (stops.length === 0) return 'transparent';
  if (stops.length === 1) return stops[0].color;

  // This is a data-encoding exception to the no-decorative-gradient rule:
  // positions represent real zones on the metric scale.
  const encodedStops = stops
    .map(({ color, at }) => `${color} ${Math.max(0, Math.min(100, at))}%`)
    .join(', ');
  return `linear-gradient(${direction}, ${encodedStops})`;
}

/* ─────────────────────────── DitherLayer ─────────────────────────── */

/**
 * A 64×64 tiled SVG with a fractal-noise fill that breaks up banding.
 *
 * Why this matters: even a perfectly tuned radial gradient on an 8-bit
 * display will band when the alpha range is narrow (which it must be
 * for "premium" subtlety). Adding ~3% high-frequency noise on top
 * randomizes the per-pixel quantization and the human eye reads the
 * gradient as smooth.
 *
 * The SVG ships inline as a data-URL so there's no extra HTTP request.
 */
export function DitherLayer({
  opacity = 0.025,
  className,
}: {
  opacity?: number;
  className?: string;
}) {
  // Noise overlays are intentionally disabled by the flat-surface contract.
  void opacity;
  void className;
  return null;
}

/* ─────────────────────────── MeshGlow ─────────────────────────── */

export interface MeshGlowProps {
  /** First glow color. */
  a: string;
  /** Second glow color (defaults to same as `a` for monochrome wash). */
  b?: string;
  /** Overall intensity (0..1). */
  intensity?: number;
  className?: string;
}

/**
 * Two off-axis radial blooms blended together. The blooms are large
 * (140% radius) so their soft ends fall well outside the card,
 * eliminating any visible edge falloff inside it.
 */
export function MeshGlow({ a, b, intensity = 1, className }: MeshGlowProps) {
  // Decorative glows are intentionally disabled; semantic content stays intact.
  void a;
  void b;
  void intensity;
  void className;
  return null;
}

/* ─────────────────────────── SoftWash ─────────────────────────── */

export interface SoftWashProps {
  /** Anchor for the wash. Top = banner-style accent. */
  anchor?: 'top' | 'bottom' | 'centre' | 'topRight' | 'topLeft';
  color: string;
  intensity?: number; // 0..1
  className?: string;
}

export function SoftWash({ anchor = 'top', color, intensity = 1, className }: SoftWashProps) {
  void anchor;
  void color;
  void intensity;
  void className;
  return null;
}

/* ─────────────────────────── SoftSurface ─────────────────────────── */

export interface SoftSurfaceProps {
  /** Card chrome — defaults to the standard `bg-card`. */
  base?: string;
  /** Accent colour for the wash + mesh glow. */
  accent?: string;
  /** 0..1 — overall accent visibility. */
  intensity?: number;
  /** Mesh = two off-axis bloops (richer); Wash = single soft top wash. */
  variant?: 'mesh' | 'wash' | 'flat';
  /** Add a 1px highlight at the top for "glass" feel. */
  highlight?: boolean;
  /** Add the dither overlay (default true — recommended). */
  dither?: boolean;
  /** Inner radius — defaults to 1.25rem (rounded-2xl). */
  radius?: string;
  /** Optional border. */
  border?: boolean;
  /** Card padding, ms tailwind classes. */
  className?: string;
  children?: ReactNode;
  /** Optional onClick. */
  onClick?: () => void;
  role?: string;
  ariaLabel?: string;
  as?: 'div' | 'button';
}

/**
 * The canonical card surface. The decorative layers (wash, mesh, dither,
 * glass lip) are gone — `<AppCard>` owns the chrome and reads the same
 * tokens as every other card in the app. Props stay in the signature for
 * API compatibility with the tabs that still pass them.
 */
export function SoftSurface({
  className,
  children,
  onClick,
  role,
  ariaLabel,
  as = 'div',
}: SoftSurfaceProps) {
  if (as === 'button') {
    return (
      <AppCard
        as="button"
        onClick={onClick}
        role={role}
        aria-label={ariaLabel}
        className={cn('text-start w-full block', className)}
      >
        {children}
      </AppCard>
    );
  }
  return (
    <AppCard onClick={onClick} role={role} aria-label={ariaLabel} className={className}>
      {children}
    </AppCard>
  );
}

/* ─────────────────────────── HaloOrb ─────────────────────────── */

/**
 * A small standalone orb with a smooth multi-stop falloff — drop
 * anywhere as decoration without worrying about a visible disc edge.
 * Replaces the old `blur-2xl` `bg-color` divs that were producing
 * "puddle" artifacts.
 */
export function HaloOrb({
  color,
  size = 220,
  intensity = 1,
  className,
  style,
}: {
  color: string;
  size?: number;
  intensity?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Standalone decorative halos are intentionally disabled.
  void color;
  void size;
  void intensity;
  void className;
  void style;
  return null;
}

/* ─────────────────────────── SmoothBar ─────────────────────────── */

export interface SmoothBarProps {
  /** Spectrum stops, e.g. four zones for ACWR. */
  spectrum: { color: string; at: number }[];
  /** Marker position 0..1. */
  marker?: number;
  /** Marker color — defaults to current spectrum colour at marker. */
  markerColor?: string;
  /** Height in px. */
  height?: number;
  className?: string;
}

/**
 * A horizontal spectrum bar with a moving dot.
 *
 * The previous implementation stacked four hard-edged divs. Here we
 * blend through `color-mix(in oklab, …)` mid-stops, so transitions
 * between zones look like one continuous gradient. The marker outline
 * uses the bar background so it pops without needing a hard ring.
 */
export function SmoothBar({
  spectrum,
  marker,
  markerColor,
  height = 8,
  className,
}: SmoothBarProps) {
  return (
    <div
      className={`relative w-full rounded-full overflow-visible ${className ?? ''}`}
      style={{ height }}
      dir="ltr"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: smoothSpectrum(spectrum, '90deg'),
        }}
      />
      {/* Subtle inner  at the top for depth */}
      <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{}} />
      {marker != null && (
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `calc(${Math.max(0, Math.min(1, marker)) * 100}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: markerColor ?? 'hsl(var(--card))',
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Background helper ─────────────────────────── */

/**
 * The page-level wash that sits behind <WellnessPage>. Single big mesh
 * glow that ties the section together without flooding the viewport.
 */
export function PageBackdrop({ accent }: { accent?: string }) {
  // Page-level decorative scenery is disabled; the canonical canvas owns the background.
  void accent;
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PREMIUM V3 — Glass, Aurora, and elevated surfaces
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────── GlassSurface ─────────────────────────── */

export interface GlassSurfaceProps {
  /** Accent colour for the subtle tint. */
  accent?: string;
  /** 0..1 — blur + frost intensity. */
  frost?: number;
  /** Glass border highlight intensity. */
  highlight?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
}

/**
 * A flat semantic surface kept under the legacy name for API compatibility —
 * it delegates to the canonical <AppCard> chrome. Accent/highlight proofs
 * stay in the signature but no blur, gradient or shadow is rendered.
 */
export function GlassSurface({ children, className, onClick, as = 'div' }: GlassSurfaceProps) {
  if (as === 'button') {
    return (
      <AppCard as="button" onClick={onClick} className={cn('text-start w-full block', className)}>
        {children}
      </AppCard>
    );
  }
  return (
    <AppCard onClick={onClick} className={className}>
      {children}
    </AppCard>
  );
}

/* ─────────────────────────── AuroraGlow ─────────────────────────── */

export interface AuroraGlowProps {
  /** Three colours for the aurora shift. */
  colors?: [string, string, string];
  /** 0..1. */
  intensity?: number;
  className?: string;
}

/**
 * Multi-coloured aurora-style glow using layered radial gradients at
 * different positions. Gives a rich, organic "northern lights" feel
 * without any animation (pure CSS, zero-cost).
 */
export function AuroraGlow({
  colors = ['hsl(var(--primary))', 'hsl(var(--primary))', 'hsl(var(--primary))'],
  intensity = 0.7,
  className,
}: AuroraGlowProps) {
  void colors;
  void intensity;
  void className;
  return null;
}

/* ─────────────────────────── AuroraCard ─────────────────────────── */

export interface AuroraCardProps {
  /** Three-colour palette for the aurora. */
  colors?: [string, string, string];
  intensity?: number;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
}

/**
 * Premium card kept under the legacy name — delegates to <AppCard>.
 * The aurora palette/intensity props stay in the signature for call
 * sites that still pass them; no glow layer is rendered.
 */
export function AuroraCard({ children, className, onClick, as = 'div' }: AuroraCardProps) {
  if (as === 'button') {
    return (
      <AppCard as="button" onClick={onClick} className={cn('text-start w-full block', className)}>
        {children}
      </AppCard>
    );
  }
  return (
    <AppCard onClick={onClick} className={className}>
      {children}
    </AppCard>
  );
}

/* ─────────────────────────── ElevatedCard ─────────────────────────── */

export interface ElevatedCardProps {
  /** Accent for the subtle coloured shadow. */
  accent?: string;
  /** Elevation level 1..3. */
  elevation?: 1 | 2 | 3;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
}

/**
 * Elevated card kept under the legacy name — delegates to <AppCard>.
 * The elevation/accent props stay in the signature for call sites that
 * still pass them; the ambient coloured shadow is gone (depth comes from
 * the canonical surface + hairline, never from shadows).
 */
export function ElevatedCard({ children, className, onClick, as = 'div' }: ElevatedCardProps) {
  if (as === 'button') {
    return (
      <AppCard as="button" onClick={onClick} className={cn('text-start w-full block', className)}>
        {children}
      </AppCard>
    );
  }
  return (
    <AppCard onClick={onClick} className={className}>
      {children}
    </AppCard>
  );
}

/* ─────────────────────────── ShimmerBorder ─────────────────────────── */

export interface ShimmerBorderProps {
  /** Colours for the shimmer gradient. */
  colors?: string[];
  /** Border width in px. */
  width?: number;
  children?: ReactNode;
  className?: string;
  /** Border radius — defaults to 1.25rem. */
  radius?: string;
}

/**
 * Flat bordered container kept under the legacy name — delegates to
 * <AppCard>. The shimmer animation and conic gradient are gone; the
 * colour/width props stay in the signature for call sites that pass them.
 */
export function ShimmerBorder({ children, className, radius }: ShimmerBorderProps) {
  return (
    <AppCard className={className} style={{ borderRadius: radius }}>
      {children}
    </AppCard>
  );
}

/* ─────────────────────────── PulseRing ─────────────────────────── */

export interface PulseRingProps {
  /** Color of the pulse. */
  color?: string;
  /** Size of the ring in px. */
  size?: number;
  /** Whether the ring is actively pulsing. */
  active?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * A pulsing ring indicator for live data (e.g. active fasting, live HR).
 * Two concentric rings expand and fade on a staggered loop.
 */
export function PulseRing({
  color = 'hsl(var(--primary))',
  size = 48,
  active = true,
  children,
  className,
}: PulseRingProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {active && (
        <>
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              border: `2px solid ${withAlpha(color, 0.3)}`,
              animationDuration: '2s',
            }}
          />
          <div
            className="absolute inset-[3px] rounded-full animate-ping"
            style={{
              border: `1.5px solid ${withAlpha(color, 0.15)}`,
              animationDuration: '2s',
              animationDelay: '0.5s',
            }}
          />
        </>
      )}
      <div className="relative flex items-center justify-center w-full h-full">{children}</div>
    </div>
  );
}

/* ─────────────────────────── MetricBadge ─────────────────────────── */

export interface MetricBadgeProps {
  value: string;
  label: string;
  color?: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * A compact pill-shaped badge for displaying a single metric value.
 * Used in headers and inline stats.
 */
export function MetricBadge({
  value,
  label,
  color = 'hsl(var(--primary))',
  icon,
  className,
}: MetricBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${className ?? ''}`}
      style={{
        background: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.15)}`,
      }}
    >
      {icon && (
        <span className="shrink-0" style={{ color }}>
          {icon}
        </span>
      )}
      <span className="text-micro font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-micro font-medium text-muted-foreground-subtle">{label}</span>
    </div>
  );
}
