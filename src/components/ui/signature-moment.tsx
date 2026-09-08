/**
 * Signature moments — the two or three places the app is allowed to celebrate.
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ THE SCARCITY IS THE FEATURE                                        ║
 * ║                                                                    ║
 * ║ Overshoot, bloom and sound exist in exactly these moments:          ║
 * ║                                                                    ║
 * ║   • a dhikr round closing (mihrab counter reaching its target)       ║
 * ║   • a Bayan analysis arriving (Diwan result revealed)                ║
 * ║                                                                    ║
 * ║ Everywhere else the app uses SETTLE or SNAP and nothing more. If a  ║
 * ║ third moment is ever added, one of these should be reconsidered —   ║
 * ║ four celebrations is no celebration.                                ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * What the flourish actually is
 *   A single copper hairline ring expanding out of the element's centre and
 *   fading — the visual echo of a struck bell, in the same accent as the
 *   rest of the Architectural Copper system. It is one absolutely-positioned
 *   `pointer-events-none` layer animating transform + opacity only, so it
 *   cannot shift layout, cannot intercept a tap, and costs one compositor
 *   layer for ~600ms.
 *
 * Accessibility contract
 *   Nothing here is load-bearing. The count, the result and the state change
 *   are all already committed before the flourish runs; if motion is reduced
 *   (OS setting or the in-app switch) the ring is not rendered at all, and a
 *   polite live-region message carries the same information instead.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EASE_SETTLE } from '@/lib/motion';
import { playSignatureSound, type SignatureSound } from '@/lib/signatureSound';
import { cn } from '@/lib/utils';

/** Haptic pattern per moment — short, and never repeated within a burst. */
const HAPTIC: Record<SignatureSound, number[]> = {
  complete: [14, 36, 22],
  reveal: [10],
};

function vibrate(pattern: number[]): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported — the visual half still carries the moment */
  }
}

export interface SignatureMomentOptions {
  /** Which of the sanctioned moments this is. */
  kind: SignatureSound;
  /** Screen-reader announcement, Arabic. Required — the ring is decorative. */
  announce: string;
}

export interface SignatureMomentHandle {
  /** Fire the moment. Safe to call from an event handler or an effect. */
  fire: () => void;
  /** True while the ring is on screen. Feed to `<SignatureBloom active>`. */
  active: boolean;
  /** Text for the live region; render it inside an `aria-live="polite"` node. */
  announcement: string;
}

const BLOOM_MS = 620;

/**
 * Drives one signature moment: haptic + optional sound + bloom + announcement.
 * The sound is silent unless the user enabled it; the bloom is skipped under
 * reduced motion; the announcement always happens.
 */
export function useSignatureMoment({ kind, announce }: SignatureMomentOptions): SignatureMomentHandle {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const fire = useCallback(() => {
    vibrate(HAPTIC[kind]);
    playSignatureSound(kind);
    // Re-announcing the identical string would be ignored by some screen
    // readers, so alternate a hairspace to force the live region to fire.
    setAnnouncement((prev) => (prev === announce ? `${announce}\u200a` : announce));

    if (reduce) return;
    setActive(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(false), BLOOM_MS);
  }, [announce, kind, reduce]);

  return { fire, active, announcement };
}

export interface SignatureBloomProps {
  active: boolean;
  /** Ring diameter as a CSS length. Defaults to filling the parent. */
  className?: string;
}

/**
 * The ring itself. Render inside a `relative` parent; it never affects layout.
 */
export function SignatureBloom({ active, className }: SignatureBloomProps) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.span
          key="bloom"
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full border border-primary/70',
            className,
          )}
          initial={{ opacity: 0.85, scale: 0.82 }}
          animate={{ opacity: 0, scale: 1.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: BLOOM_MS / 1000, ease: [...EASE_SETTLE] as [number, number, number, number] }}
          style={{ willChange: 'transform, opacity' }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * The polite live region paired with a moment. Kept visually hidden — the
 * flourish is decoration, this is the actual information channel.
 */
export function SignatureAnnouncement({ text }: { text: string }) {
  return (
    <span aria-live="polite" aria-atomic className="sr-only">
      {text}
    </span>
  );
}
