// Per-page dynamic theme tinting for the podcast section.
//
// Podium uses Material 3's `DynamicMaterialExpressiveTheme(seedColor)`
// which fully reskins primary/secondary/tertiary tokens from a single
// hue. We don't want to disrupt the rest of the app's theme, so this
// component is intentionally narrower: it sets a small palette of
// `--podcast-*` CSS custom properties scoped to its subtree, and the
// podcast components opt into them explicitly. Outside this subtree,
// nothing changes.
//
// CSS variables exposed (all HSL space):
//   --podcast-seed-h / -s / -l   — raw seed
//   --podcast-primary            — solid color, good on light/dark
//   --podcast-primary-soft       — ~12% alpha tint for fills
//   --podcast-primary-subtle     — ~6%  alpha tint for surfaces
//   --podcast-primary-fg         — readable foreground over -primary
//   --podcast-on-art             — readable text over the cover image
//                                  backdrop (always white-ish)

import { CSSProperties, ReactNode, useMemo } from 'react';

interface DynamicPodcastThemeProps {
  /** HSL components, each in its native range (h:0–360, s/l:0–100). */
  seedH: number | null | undefined;
  seedS: number | null | undefined;
  seedL: number | null | undefined;
  /** Render-prop style: receive style + className to apply to your own
   *  root element. We don't wrap children in a div so layout-sensitive
   *  pages can keep full control. */
  children: ReactNode | ((style: CSSProperties) => ReactNode);
  /** When the seed is missing, fall through to a transparent style so
   *  consumers don't need to special-case "no theme". */
  className?: string;
}

export default function DynamicPodcastTheme({
  seedH,
  seedS,
  seedL,
  children,
  className,
}: DynamicPodcastThemeProps) {
  const style = useMemo<CSSProperties>(() => {
    if (seedH == null || seedS == null || seedL == null) return {};
    // We expose the raw seed and a few derived tokens. Everything is
    // expressed via `hsl()` with the same hue/sat so consumers can
    // dial saturation/lightness up or down per use without recomputing
    // the full token set.
    return {
      // CSS custom properties typed as `--name: value` — TS doesn't
      // know about them so cast through `as unknown as CSSProperties`.
      '--podcast-seed-h': String(seedH),
      '--podcast-seed-s': `${seedS}%`,
      '--podcast-seed-l': `${seedL}%`,
      '--podcast-primary': `hsl(${seedH} ${seedS}% ${seedL}%)`,
      '--podcast-primary-soft': `hsl(${seedH} ${seedS}% ${seedL}% / 0.18)`,
      '--podcast-primary-subtle': `hsl(${seedH} ${seedS}% ${seedL}% / 0.08)`,
      // Foreground over the primary-color fill: pick white if the seed
      // is dark-ish, near-black if it's light. We only have lightness
      // here so this is a fine approximation of WCAG contrast.
      '--podcast-primary-fg': seedL < 55 ? '#ffffff' : '#0b0b0b',
      '--podcast-on-art': '#ffffff',
    } as unknown as CSSProperties;
  }, [seedH, seedS, seedL]);

  if (typeof children === 'function') return <>{children(style)}</>;
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
