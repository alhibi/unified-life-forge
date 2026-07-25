/**
 * MihrabTabs — the hub's tab bar and swipeable pane container.
 *
 * What the previous implementation got wrong:
 *   • The bar was a 4-column grid of 64px tiles forced to `dir="ltr"`, so the
 *     Arabic labels read left-to-right against the document direction.
 *   • Panes only cross-faded with a fixed 16px nudge; there was no gesture, so
 *     on a phone the only way between tabs was a precise tap.
 *   • No ARIA tab semantics and no keyboard support at all.
 *
 * This component fixes all three:
 *   • A proper `tablist` / `tab` / `tabpanel` triad with roving `tabIndex`,
 *     RTL-correct arrow keys, Home/End, and 44px minimum targets.
 *   • A spring `layoutId` indicator that travels between tabs.
 *   • Horizontal drag to change tab, committed by offset OR velocity (a fast
 *     flick counts even if short — that is what makes a swipe feel native),
 *     with rubber-band resistance at the ends so the container never slides
 *     into emptiness.
 *   • Direction-aware pane transitions: the incoming pane always enters from
 *     the side you swiped from, which is the only thing that makes a tab strip
 *     feel spatial rather than random.
 *
 * Motion is transform + opacity only, and the whole gesture layer is disabled
 * under `prefers-reduced-motion` (the taps still work).
 */
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'framer-motion';
import { useCallback, useId, useRef } from 'react';

import { useApp } from '@/contexts/AppContext';
import type { IconComponent } from '@/lib/icons';
import { EASE_IN, EASE_OUT_EXPO } from '@/lib/motion';
import { cn } from '@/lib/utils';

/** Distance (px) past which a drag commits regardless of speed. */
const COMMIT_OFFSET = 72;
/** Flick speed (px/s) that commits a short drag. */
const COMMIT_VELOCITY = 420;

export interface MihrabTabDef<K extends string> {
  key: K;
  label: string;
  icon: IconComponent;
  /** Optional count / status shown as a small trailing figure. */
  badge?: string;
}

interface Props<K extends string> {
  tabs: readonly MihrabTabDef<K>[];
  active: K;
  onChange: (key: K, direction: 1 | -1) => void;
  /** Rendered pane for the active tab. */
  children: React.ReactNode;
  /** +1 when moving toward a later tab, −1 backwards. Drives the slide. */
  direction: 1 | -1;
}

export default function MihrabTabs<K extends string>({
  tabs,
  active,
  onChange,
  children,
  direction,
}: Props<K>) {
  const { dir } = useApp();
  const rtl = dir === 'rtl';
  const reduce = useReducedMotion();
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = tabs.findIndex((t) => t.key === active);

  const go = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= tabs.length || nextIndex === activeIndex) return;
      onChange(tabs[nextIndex].key, nextIndex > activeIndex ? 1 : -1);
    },
    [activeIndex, onChange, tabs],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let next = activeIndex;
      // RTL: ArrowLeft moves to the NEXT tab because the strip runs right→left.
      if (event.key === 'ArrowLeft') next = activeIndex + (rtl ? 1 : -1);
      else if (event.key === 'ArrowRight') next = activeIndex + (rtl ? -1 : 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      if (next < 0 || next >= tabs.length) return;
      go(next);
      tabRefs.current[next]?.focus();
    },
    [activeIndex, go, rtl, tabs.length],
  );

  const onDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      // Vertical intent wins: a mostly-vertical drag is the user scrolling.
      if (Math.abs(offset.y) > Math.abs(offset.x)) return;
      const committed = Math.abs(offset.x) > COMMIT_OFFSET || Math.abs(velocity.x) > COMMIT_VELOCITY;
      if (!committed) return;
      // Dragging content to the left reveals the tab that follows it — mirrored
      // for RTL, where "later" tabs sit to the left.
      const forward = rtl ? offset.x > 0 : offset.x < 0;
      go(activeIndex + (forward ? 1 : -1));
    },
    [activeIndex, go, rtl],
  );

  // Slide sign: entering pane comes from the trailing edge when moving forward.
  const enterFrom = direction * (rtl ? -1 : 1) * 24;

  return (
    <>
      <div
        role="tablist"
        aria-label="تبويبات المحراب"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex w-full items-center gap-1 rounded-md border border-border bg-muted p-1"
      >
        {tabs.map((tab, index) => {
          const selected = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              // Roving tabIndex: one stop for the whole strip, arrows move
              // inside it. Four separate tab stops would be four Tab presses
              // just to leave the bar.
              tabIndex={selected ? 0 : -1}
              onClick={() => go(index)}
              className={cn(
                'relative isolate flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm px-2',
                'text-mini font-semibold transition-colors duration-normal ease-out-expo sm:text-meta',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {selected && (
                <motion.span
                  layoutId="mihrab-tab-indicator"
                  className="absolute inset-0 rounded-sm bg-primary"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 38, mass: 0.8 }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          id={`${baseId}-panel-${active}`}
          aria-labelledby={`${baseId}-tab-${active}`}
          tabIndex={0}
          drag={reduce ? false : 'x'}
          dragDirectionLock
          dragElastic={0.12}
          // Zero constraints + elastic = rubber band: the pane follows the
          // finger a little and always snaps back, so a cancelled swipe leaves
          // no trace.
          dragConstraints={{ left: 0, right: 0 }}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: enterFrom }}
          animate={{ opacity: 1, x: 0, transition: reduce ? { duration: 0.1 } : { duration: 0.26, ease: EASE_OUT_EXPO } }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.08 } }
              : { opacity: 0, x: -enterFrom * 0.5, transition: { duration: 0.14, ease: EASE_IN } }
          }
          style={{ willChange: 'transform, opacity', touchAction: 'pan-y' }}
          className="focus-visible:outline-none"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
