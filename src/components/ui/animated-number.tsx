/**
 * AnimatedNumber — the one way a meaningful figure changes in this app.
 *
 * Why it exists
 *   A counter that snaps from 6 to 7 reads as a repaint; a counter that
 *   travels reads as progress. But a travelling number is only acceptable
 *   if it can never move the layout while it travels, so:
 *
 *   • `font-variant-numeric: tabular-nums` — every digit occupies the same
 *     advance width, so 111 → 999 never reflows its neighbours.
 *   • The animation runs on a framer-motion MotionValue and writes to
 *     `textContent`, so no React re-render happens per frame.
 *   • `dir="ltr"` — the app is RTL, but numerals are global (123) and must
 *     never be re-ordered by bidi resolution.
 *   • Reduced motion (OS setting or the in-app switch) → the value is set
 *     instantly, with no tween.
 *
 * Use it for figures that *mean* something as they move: streaks, counts,
 * points, totals. Do not use it for prices ticking every two seconds —
 * those get `tabular-nums` only (see `<NumericText>`), because animating
 * them would turn a data feed into a slot machine.
 */
import { animate, useReducedMotion } from 'framer-motion';
import type { HTMLAttributes } from 'react';
import { memo, useEffect, useRef } from 'react';

import { DURATION, EASE_OUT_QUAD } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface AnimatedNumberProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  /** Decimal places to render. Default 0. */
  decimals?: number;
  /** Thousands grouping. Default true for |value| >= 10000. */
  group?: boolean;
  /** Rendered before the number, inside the same span (e.g. '+'). */
  prefix?: string;
  /** Rendered after the number (e.g. '%', ' يوم'). */
  suffix?: string;
  /** Tween length in seconds. Defaults to the `normal` motion token. */
  duration?: number;
}

/** Global (Latin) numerals with optional grouping — never Arabic-Indic. */
export function formatNumber(value: number, decimals = 0, group?: boolean): string {
  const useGroup = group ?? Math.abs(value) >= 10000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: useGroup,
  }).format(value);
}

function AnimatedNumberImpl({
  value,
  decimals = 0,
  group,
  prefix = '',
  suffix = '',
  duration,
  className,
  style,
  ...rest
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const write = (n: number) => {
      node.textContent = `${prefix}${formatNumber(n, decimals, group)}${suffix}`;
    };

    const from = shown.current;
    if (reduce || from === value) {
      shown.current = value;
      write(value);
      return;
    }

    const controls = animate(from, value, {
      duration: duration ?? DURATION.slow,
      ease: [...EASE_OUT_QUAD] as [number, number, number, number],
      onUpdate: (n) => {
        shown.current = n;
        write(n);
      },
      onComplete: () => {
        shown.current = value;
        write(value);
      },
    });

    return () => controls.stop();
  }, [value, decimals, group, prefix, suffix, duration, reduce]);

  return (
    <span
      ref={ref}
      dir="ltr"
      // The server/first paint value, so there is never an empty frame.
      className={cn('tabular-nums', className)}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      {...rest}
    >
      {`${prefix}${formatNumber(value, decimals, group)}${suffix}`}
    </span>
  );
}

export const AnimatedNumber = memo(AnimatedNumberImpl);

/**
 * A figure that changes but must NOT be animated (live prices, clocks).
 * Same digit metrics, zero motion — the layout stays frozen while the
 * value updates underneath.
 */
export function NumericText({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      dir="ltr"
      className={cn('tabular-nums', className)}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      {...rest}
    >
      {children}
    </span>
  );
}

export default AnimatedNumber;
