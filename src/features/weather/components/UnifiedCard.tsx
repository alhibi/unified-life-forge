// ============================================================================
// UnifiedCard — single card primitive for the entire weather feature.
//
// Five variants tuned for different content densities:
//
//   hero     — full-bleed gradient backdrop, large primary value, generous
//              padding. Used once per tab (current conditions).
//   section  — standard section card. Used by 80% of components.
//   tile     — compact metric tile (Bento grid). Equal height siblings.
//   inline   — borderless card with subtle bg. For nested groupings.
//   ghost    — transparent wrapper with only a header. For list-like layouts.
//
// Every variant shares:
//   • the app's `surface-depth` utility when elevated=true
//   • semantic HTML — section as the default
//
// The card is the foundation. Components compose it with their own header,
// metrics, and content. They never invent their own card chrome.
// ============================================================================

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type UnifiedCardVariant = 'hero' | 'section' | 'tile' | 'inline' | 'ghost';

export interface UnifiedCardProps {
  variant?: UnifiedCardVariant;
  /** Use the elevated card surface. Default true for hero/section. */
  elevated?: boolean;
  /** Custom className for layout overrides. */
  className?: string;
  /** Padding override — 'tight' for dense metrics, 'cozy' for breathing room. */
  padding?: 'none' | 'tight' | 'default' | 'cozy' | 'spacious';
  /** Render the card as an interactive <button>. */
  onClick?: () => void;
  /** Accessible label when the card is interactive. */
  'aria-label'?: string;
  children: ReactNode;
}

const variantClass: Record<UnifiedCardVariant, string> = {
  hero:    'rounded-3xl border border-border/40',
  section: 'rounded-2xl border border-border/40',
  tile:    'rounded-2xl border border-border/40',
  inline:  'rounded-xl border border-border/30',
  ghost:   'rounded-xl',
};

const paddingClass: Record<NonNullable<UnifiedCardProps['padding']>, string> = {
  none:      'p-0',
  tight:     'p-3',
  default:   'p-4',
  cozy:      'p-5',
  spacious:  'p-6',
};

const elevatedDefault: Record<UnifiedCardVariant, boolean> = {
  hero:    true,
  section: true,
  tile:    true,
  inline:  false,
  ghost:   false,
};

export function UnifiedCard(props: UnifiedCardProps) {
  const {
    variant = 'section',
    elevated,
    className = '',
    padding = 'default',
    onClick,
    children,
    ...rest
  } = props;

  const isInteractive = typeof onClick === 'function';
  const showElevated = elevated ?? elevatedDefault[variant];

  const interactiveClass = isInteractive
    ? 'text-start w-full transition-motion cursor-pointer hover:border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
    : '';

  const cardClassName = cn(
    'relative overflow-hidden',
    variantClass[variant],
    showElevated ? 'surface-depth' : 'app-card-flat',
    paddingClass[padding],
    interactiveClass,
    className,
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cardClassName}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <section className={cardClassName} {...rest}>
      {children}
    </section>
  );
}

/* ── Helpers used across the feature ───────────────────────────────────── */

/** Thin divider inside a card — a quiet 1px tonal rule. */
export function CardDivider() {
  return <div aria-hidden className="rule-x -mx-4 my-3" />;
}

/** Small uppercase eyebrow label used inside card headers. */
export function CardEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[0.6875rem] font-bold tracking-[0.18em] uppercase text-foreground/60 mb-1.5', className)}>
      {children}
    </p>
  );
}

/** Right-aligned monospace pair used in tiles — e.g. "label / value". */
export function CardMetaPair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-mini tabular-nums">
      <span className="text-foreground/70 font-medium">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}