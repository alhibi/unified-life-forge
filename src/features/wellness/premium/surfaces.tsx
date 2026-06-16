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

import React, { type ReactNode, useId } from 'react';

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
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
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
 return `radial-gradient(${shape},
 ${withAlpha(color, alpha)} 0%,
 ${withAlpha(color, alpha * 0.78)} 18%,
 ${withAlpha(color, alpha * 0.46)} 38%,
 ${withAlpha(color, alpha * 0.18)} 62%,
 ${withAlpha(color, alpha * 0.05)} 82%,
 ${withAlpha(color, 0)} 100%)`;
}

/**
 * Smooth linear gradient with same five-stop curve.
 * Direction defaults to top-.
 */
export function softLinear(
 color: string,
 alpha: number,
 direction = '180deg',
): string {
  return `linear-gradient(${direction},
    ${withAlpha(color, alpha)} 0%,
    ${withAlpha(color, alpha * 0.78)} 18%,
    ${withAlpha(color, alpha * 0.46)} 38%,
    ${withAlpha(color, alpha * 0.18)} 62%,
    ${withAlpha(color, alpha * 0.05)} 82%,
    ${withAlpha(color, 0)} 100%)`;
}

/**
 * Multi-stop linear gradient that interpolates through ANY number of
 * colors, with each segment getting its own smooth easing. Used for
 * the ACWR zone bar so the band reads as one continuous spectrum
 * instead of four hard rectangles.
 */
export function smoothSpectrum(stops: { color: string; at: number }[], direction = '90deg'): string {
  // Insert intermediate easing stops between each pair so segments feel
  // soft. We add an extra mid-stop at the colour mid-point so the eye
  // never sees a sharp colour-A→colour-B contour line.
  const out: string[] = [];
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    out.push(`${s.color} ${s.at}%`);
    const next = stops[i + 1];
    if (next) {
      const mid = (s.at + next.at) / 2;
      out.push(`color-mix(in oklab, ${s.color}, ${next.color}) ${mid}%`);
    }
  }
  return `linear-gradient(${direction}, ${out.join(', ')})`;
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
  // The seed in feTurbulence is fixed so the noise pattern is stable
  // (no flicker on remount). baseFrequency=0.9 produces fine grain.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none mix-blend-overlay ${className ?? ''}`}
      style={{
        backgroundImage: url,
        backgroundSize: '64px 64px',
        opacity,
      }}
    />
  );
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
  const second = b ?? a;
  const alphaA = 0.18 * intensity;
  const alphaB = 0.12 * intensity;
  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none ${className ?? ''}`}
      style={{
        backgroundImage: [
          softRadial(a, alphaA, 'circle 140% at 18% -10%'),
          softRadial(second, alphaB, 'circle 120% at 110% 105%'),
        ].join(', '),
      }}
    />
  );
}

/* ─────────────────────────── SoftWash ─────────────────────────── */

export interface SoftWashProps {
  /** Anchor for the wash. Top = banner-style accent. */
  anchor?: 'top' | 'bottom' | 'centre' | 'topRight' | 'topLeft';
  color: string;
  intensity?: number; // 0..1
  className?: string;
}

const ANCHOR_SHAPES: Record<NonNullable<SoftWashProps['anchor']>, string> = {
  top:       'ellipse 90% 130% at 50% -10%',
  bottom:    'ellipse 90% 130% at 50% 110%',
  centre:    'ellipse 100% 130% at 50% 50%',
  topRight:  'circle 130% at 100% 0%',
  topLeft:   'circle 130% at 0% 0%',
};

export function SoftWash({ anchor = 'top', color, intensity = 1, className }: SoftWashProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none ${className ?? ''}`}
      style={{
        backgroundImage: softRadial(color, 0.16 * intensity, ANCHOR_SHAPES[anchor]),
      }}
    />
  );
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
 * The new building block for every wellness card. Stacks in this order
 * (back → front):
 *
 *   1. base color (solid card)
 *   2. SoftWash or MeshGlow (accent halo)
 *   3. DitherLayer (noise overlay, ~2.5% opacity)
 *   4. children (always on top, fully opaque)
 *
 *  Because every layer is rendered with sub-pixel-stable parameters
 *  and `transform: translateZ(0)` on the root, the GPU compositor
 *  promotes the whole card to its own layer — no banding seams when
 *  the parent scrolls.
 */
export function SoftSurface({
  base = 'hsl(var(--card))',
  accent = 'hsl(var(--primary))',
  intensity = 1,
  variant = 'mesh',
  highlight = true,
  dither = true,
  radius = '1.25rem',
  border = true,
  className,
  children,
  onClick,
  role,
  ariaLabel,
  as = 'div',
}: SoftSurfaceProps) {
  const Tag: any = as === 'button' ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      className={`relative overflow-hidden ${onClick ? 'text-start w-full block' : ''} ${className ?? ''}`}
      style={{
        background: base,
        borderRadius: radius,
        border: border ? '1px solid hsl(var(--border) / 0.45)' : undefined,
        transform: 'translateZ(0)',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Accent layer */}
      {variant === 'mesh' && intensity > 0 && (
        <MeshGlow a={accent} intensity={intensity} />
      )}
      {variant === 'wash' && intensity > 0 && (
        <SoftWash color={accent} intensity={intensity} />
      )}

      {/* Top highlight — 1px gradient hairline gives a subtle "glass" lip */}
      {highlight && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            
          }}
        />
      )}

      {/* Dither — sits above gradient, below content */}
      {dither && <DitherLayer opacity={0.025} />}

      {/* Content */}
      <div className="relative">{children}</div>
    </Tag>
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
  return (
    <div
      aria-hidden
      className={`absolute pointer-events-none ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        backgroundImage: softRadial(color, 0.28 * intensity, 'circle at center'),
        filter: 'blur(2px)', // tiny blur to absorb LCD subpixel artifacts
        ...style,
      }}
    />
  );
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
      <div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          
        }}
      />
      {marker != null && (
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `calc(${Math.max(0, Math.min(1, marker)) * 100}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: markerColor ?? '#fff',
            
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
  const a = accent ?? 'hsl(var(--primary))';
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: [
          softRadial(a, 0.07, 'ellipse 60% 50% at 50% 0%'),
          softRadial(a, 0.04, 'ellipse 80% 50% at 50% 100%'),
        ].join(', '),
      }}
    />
  );
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
 * A frosted-glass surface for premium cards. Uses backdrop-blur with
 * a translucent background, edge highlights, and subtle noise overlay.
 * Looks like native iOS/macOS glass — no WebGL needed.
 */
export function GlassSurface({
  accent = 'hsl(var(--primary))',
  frost = 0.8,
  highlight = true,
  children,
  className,
  onClick,
  as = 'div',
}: GlassSurfaceProps) {
  const Tag: any = as === 'button' ? 'button' : 'div';
  const blur = Math.round(12 + frost * 12); // 12..24px

  return (
    <Tag
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'text-start w-full block' : ''} ${className ?? ''}`}
      style={{
        background: `hsl(var(--card) / ${0.55 + frost * 0.2})`,
        backdropFilter: `blur(${blur}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(1.4)`,
        borderRadius: '1.25rem',
        border: '1px solid hsl(var(--border) / 0.3)',
        
        transform: 'translateZ(0)',
      }}
    >
      {/* Top highlight */}
      {highlight && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            
          }}
        />
      )}
      {/* Subtle accent wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: softRadial(accent, 0.06, 'ellipse 80% 60% at 30% -20%'),
        }}
      />
      {/* Noise */}
      <DitherLayer opacity={0.015} />
      {/* Content */}
      <div className="relative">{children}</div>
    </Tag>
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
  colors = ['#6366f1', '#06b6d4', '#10b981'],
  intensity = 0.7,
  className,
}: AuroraGlowProps) {
  const [a, b, c] = colors;
  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none ${className ?? ''}`}
      style={{
        backgroundImage: [
          softRadial(a, 0.14 * intensity, 'ellipse 60% 80% at 15% 0%'),
          softRadial(b, 0.10 * intensity, 'ellipse 50% 90% at 85% 20%'),
          softRadial(c, 0.08 * intensity, 'ellipse 70% 60% at 50% 100%'),
        ].join(', '),
      }}
    />
  );
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
 * Premium card with an aurora-style glow background. Perfect for
 * hero sections, score displays, and feature highlights.
 */
export function AuroraCard({
  colors = ['#6366f1', '#06b6d4', '#10b981'],
  intensity = 0.8,
  children,
  className,
  onClick,
  as = 'div',
}: AuroraCardProps) {
  const Tag: any = as === 'button' ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'text-start w-full block' : ''} ${className ?? ''}`}
      style={{
        background: 'hsl(var(--card))',
        borderRadius: '1.5rem',
        border: '1px solid hsl(var(--border) / 0.35)',
        
        transform: 'translateZ(0)',
      }}
    >
      <AuroraGlow colors={colors} intensity={intensity} />
      {/* Top edge highlight */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          
        }}
      />
      <DitherLayer opacity={0.02} />
      <div className="relative">{children}</div>
    </Tag>
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
 * Material-like elevated card with a coloured ambient shadow. The
 *  is split into two layers: one tight (definition) and one
 * spread (ambient glow) — looks realistic on both light/dark themes.
 */
export function ElevatedCard({
  accent = 'hsl(var(--primary))',
  elevation = 2,
  children,
  className,
  onClick,
  as = 'div',
}: ElevatedCardProps) {
  const Tag: any = as === 'button' ? 'button' : 'div';

  const shadows = {
    1: `0 2px 8px -4px ${withAlpha(accent, 0.1)}, 0 1px 3px hsl(0 0% 0% / 0.06)`,
    2: `0 6px 24px -8px ${withAlpha(accent, 0.14)}, 0 2px 8px hsl(0 0% 0% / 0.05)`,
    3: `0 12px 40px -12px ${withAlpha(accent, 0.18)}, 0 4px 12px hsl(0 0% 0% / 0.06)`,
  };

  return (
    <Tag
      onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'text-start w-full block' : ''} ${className ?? ''}`}
      style={{
        background: 'hsl(var(--card))',
        borderRadius: '1.25rem',
        border: '1px solid hsl(var(--border) / 0.3)',
        
        transform: 'translateZ(0)',
      }}
    >
      <div className="relative">{children}</div>
    </Tag>
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
 * A subtle animated gradient border that hints at premium status.
 * Uses a conic-gradient background on a pseudo-wrapper. The animation
 * is pure CSS (keyframe rotation) so it's zero-cost on GPU.
 */
export function ShimmerBorder({
  colors = ['hsl(var(--primary))', '#06b6d4', '#10b981', 'hsl(var(--primary))'],
  width = 1,
  children,
  className,
  radius = '1.25rem',
}: ShimmerBorderProps) {
  const gradient = `conic-gradient(from var(--shimmer-angle, 0deg), ${colors.join(', ')})`;

  return (
    <div
      className={`relative ${className ?? ''}`}
      style={{
        borderRadius: radius,
        padding: width,
        background: gradient,
        // CSS custom property animated via @property in a <style>
        animation: 'shimmer-rotate 4s linear infinite',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: `calc(${radius} - ${width}px)`,
          background: 'hsl(var(--card))',
        }}
      >
        {children}
      </div>
      {/* Inject the keyframe animation */}
      <style>{`
        @property --shimmer-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes shimmer-rotate {
          to { --shimmer-angle: 360deg; }
        }
      `}</style>
    </div>
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
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size }}>
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
      <div className="relative flex items-center justify-center w-full h-full">
        {children}
      </div>
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
      {icon && <span className="shrink-0" style={{ color }}>{icon}</span>}
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[9px] font-medium text-muted-foreground/70">{label}</span>
    </div>
  );
}
