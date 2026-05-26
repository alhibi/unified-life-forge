import React from 'react';
import { cn } from '@/lib/utils';

interface LiveWaveformProps {
  /**
   * Amplitude bars in the range [0, 1], oldest first. Zero or one entry
   * renders the silence floor — matches the analyser's behaviour while
   * the mic is initializing.
   */
  bars: number[] | null | undefined;
  /** Color of every bar. Defaults to the design system's primary token. */
  className?: string;
  /** Height of the tallest bar in pixels. Defaults to 22. */
  height?: number;
  /** Width of each bar in pixels. Defaults to 2.5. */
  barWidth?: number;
  /** Gap between bars in pixels. Defaults to 2. */
  gap?: number;
  /** When true, the rightmost bars get extra contrast as a "freshness"
   *  hint. Looks great on mobile where the latest sample stays put on
   *  the trailing edge. */
  emphasizeFresh?: boolean;
}

/**
 * Real-time amplitude waveform renderer.
 *
 * Designed for the chat composer's live recording state — the same set
 * of bars that show during recording can be re-used in the post-record
 * preview pill, just with a static (captured) array instead of a
 * dynamically updating one.
 *
 * Rendering decisions
 * ───────────────────
 * • Plain DOM divs, not canvas. The bar count is small (≤ 40) and
 *   updates at ~30 Hz, well within React's reconcile budget. Skipping
 *   canvas means we avoid pixel-ratio juggling and the bars inherit
 *   theme tokens for free.
 * • `transform: scaleY(...)` instead of explicit height. CPU-cheap, GPU-
 *   accelerated, and avoids layout thrash that explicit height changes
 *   would trigger every frame.
 * • LTR direction is forced so the freshness emphasis on the right edge
 *   remains the right edge in RTL locales. Recording chronology is a
 *   global concept — the rightmost slot is always "now".
 */
const LiveWaveform: React.FC<LiveWaveformProps> = ({
  bars,
  className,
  height = 22,
  barWidth = 2.5,
  gap = 2,
  emphasizeFresh = true,
}) => {
  // Snapshot a fixed-length array even when the analyser is still warming
  // up. Avoids the "0 bars then 40 bars" pop on first paint.
  const safe = React.useMemo(() => {
    const out = new Array<number>(40).fill(0.06);
    if (Array.isArray(bars)) {
      const start = Math.max(0, bars.length - out.length);
      for (let i = 0; i < out.length; i++) {
        const src = bars[start + i];
        if (typeof src === 'number' && isFinite(src)) {
          out[i] = Math.max(0.06, Math.min(1, src));
        }
      }
    }
    return out;
  }, [bars]);

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      style={{ height, gap }}
      dir="ltr"
      aria-hidden="true"
    >
      {safe.map((amp, i) => {
        const fresh = emphasizeFresh && i >= safe.length - 6;
        return (
          <div
            key={i}
            className={cn(
              'rounded-full bg-current',
              fresh ? 'opacity-95' : 'opacity-70',
              // The transition smooths out the analyser's 30 Hz updates
              // into a flowing motion. Short enough that loud peaks
              // still snap forward, long enough that silence decays
              // without flickering.
              'transition-transform duration-75 ease-out',
            )}
            style={{
              width: barWidth,
              height,
              transformOrigin: 'center',
              transform: `scaleY(${amp})`,
            }}
          />
        );
      })}
    </div>
  );
};

export default React.memo(LiveWaveform);
