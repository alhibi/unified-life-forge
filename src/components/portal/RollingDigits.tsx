/**
 * RollingDigits — a clock/counter readout where only the characters that
 * actually changed animate.
 *
 * A naive implementation re-keys the whole string, so every tick makes the
 * entire clock jump. Here each character position owns its own
 * AnimatePresence, so at 14:59 → 15:00 exactly three glyphs roll and the
 * colon stays perfectly still. Motion is transform + opacity only.
 *
 * The container is `tabular-nums` and each cell has a fixed inline size so a
 * digit change can never reflow the line.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  /** The value to display. Compared per character index. */
  value: string;
  className?: string;
  /** Roll direction: 'up' for counting forward, 'down' for countdowns. */
  direction?: 'up' | 'down';
  'aria-label'?: string;
}

const CELL = 'relative inline-flex items-center justify-center';

function RollingDigitsImpl({ value, className, direction = 'up', 'aria-label': ariaLabel }: Props) {
  const reduce = useReducedMotion();
  const sign = direction === 'up' ? 1 : -1;

  return (
    <span
      className={cn('inline-flex tabular-nums', className)}
      aria-label={ariaLabel ?? value}
      role="text"
      style={{ direction: 'ltr' }}
    >
      {value.split('').map((char, index) => {
        // Separators never animate — they are structural, not data.
        const isSeparator = char === ':' || char === '.' || char === ' ';
        if (isSeparator) {
          return (
            <span key={`sep-${index}`} className={cn(CELL, 'opacity-45')} style={{ width: '0.34em' }}>
              {char}
            </span>
          );
        }
        return (
          <span key={`cell-${index}`} className={cn(CELL, 'overflow-hidden')} style={{ width: '0.62em' }}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={`${index}-${char}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: sign * 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: sign * -14 }}
                transition={
                  reduce
                    ? { duration: 0.1, ease: 'linear' }
                    : { type: 'spring', stiffness: 460, damping: 34, mass: 0.7 }
                }
                style={{ willChange: 'transform, opacity' }}
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

export const RollingDigits = memo(RollingDigitsImpl);
export default RollingDigits;
