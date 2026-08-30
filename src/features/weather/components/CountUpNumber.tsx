// ============================================================================
// CountUpNumber — animates a numeric value from 0 (or `from`) to `value`
// using an expo ease-out curve. The user's eye lands on the final digit at
// the moment they enter the page.
//
// USAGE
//   <CountUpNumber value={22} />
//   <CountUpNumber value={22} decimals={1} duration={1200} />
//
// DESIGN CHOICES
//   • requestAnimationFrame instead of framer-motion's tween — we get a
//     continuous value, not a JSX node, so the host can compose it
//     however it wants (inside an h1, a tabular-nums span, etc.).
//   • Respects prefers-reduced-motion — when the user opts out, we render
//     the final value immediately.
//   • Re-runs on `value` change — every snapshot update triggers a fresh
//     count-up so the user can feel "new data arrived".
// ============================================================================

import { useEffect, useRef, useState } from 'react';

import { countUpValue, formatCount } from '../lib/weather-motion';

interface CountUpNumberProps {
  /** Target value — usually the live snapshot number. */
  value: number;
  /** Starting value. Defaults to 0. */
  from?: number;
  /** Animation duration in ms. Defaults to 1100. */
  duration?: number;
  /** Number of decimal places to display. Default 0. */
  decimals?: number;
  /** Pad with leading zeros up to this many digits. */
  pad?: number;
  /** Optional className passed through to the wrapper. */
  className?: string;
  /** Extra leading content — e.g. "+". */
  prefix?: string;
  /** Extra trailing content — e.g. "°". */
  suffix?: string;
  /** Trigger key — when this changes, restart the animation. */
  trigger?: string | number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function CountUpNumber({
  value,
  from = 0,
  duration = 1100,
  decimals = 0,
  pad = 0,
  className,
  prefix = '',
  suffix = '',
  trigger,
}: CountUpNumberProps) {
  const [display, setDisplay] = useState(() => reducedMotion() ? value : from);
  const fromRef = useRef(from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Re-trigger from the previous displayed value, not from 0 — that way
    // live refreshes don't always count up from zero. The hero animation
    // is initial-mount-only via the trigger prop.
    fromRef.current = display;
    if (reducedMotion()) {
      setDisplay(value);
      return;
    }
    const startTs = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTs;
      const v = countUpValue(elapsed, fromRef.current, value, duration);
      setDisplay(v);
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Snap to exact target to avoid floating-point noise.
        setDisplay(value);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, trigger]);

  const rounded = decimals === 0
    ? formatCount(display, pad)
    : display.toFixed(decimals);

  return (
    <span className={className} dir="ltr">
      {prefix}
      {rounded}
      {suffix}
    </span>
  );
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}