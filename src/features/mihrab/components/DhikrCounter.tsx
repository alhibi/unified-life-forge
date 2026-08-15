/**
 * DhikrCounter — the tasbih the hub was missing.
 *
 * A devotional companion with no counter is an odd omission; Mihrab previously
 * had four screens of links and nothing you could actually *do*. This is the
 * one interactive surface, so it is built to be used one-handed, repeatedly,
 * without looking:
 *
 *   • The whole plate is the tap target (min 200px tall), not a small button.
 *   • Haptic pulse on every count, a distinct triple pulse when the target is
 *     reached — the only feedback that works when the screen is at arm's length
 *     or the eyes are closed.
 *   • Counts persist per day through the practice store, so closing the app
 *     mid-round loses nothing.
 *   • Completed rounds are tracked separately from the running count, because
 *     "١٠٠ × ٣" is the unit people actually think in.
 *   • Space / Enter count too, and the plate is a real button for screen
 *     readers with a live region announcing the running total.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';

import ProgressRing from '@/components/ProgressRing';
import { AppCard } from '@/components/ui/app-shell';
import { Minus, Pin, RotateCcw } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { DHIKR_CATALOGUE, findDhikr } from '../data/catalogue';
import { selectDhikrCount } from '../lib/practice';
import { usePractice } from '../lib/usePractice';

const TARGET_PRESETS = [33, 100, 313, 1000];

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* blocked by the platform — the visual feedback still lands */
  }
}

/**
 * Live figures use LATIN numerals on purpose.
 *
 * Arabic-Indic zero is U+0660 «٠» — a single dot. At 68px a fresh counter
 * rendered as a large floating dot, which reads as a rendering fault rather
 * than as "zero". Latin numerals also line up under `tabular-nums`, which
 * matters for a figure that changes on every tap. Prose keeps Arabic-Indic.
 */

export default function DhikrCounter() {
  const { state, today, countDhikr, resetDhikr, setDhikrTarget, toggleDhikrPinned } = usePractice();
  const reduce = useReducedMotion();
  const [selectedId, setSelectedId] = useState(() => state.dhikrTargets[0]?.id ?? DHIKR_CATALOGUE[0].id);
  const [pulse, setPulse] = useState(0);
  const lastTapRef = useRef(0);

  const pinned = state.dhikrTargets;
  const activeId = pinned.some((t) => t.id === selectedId) ? selectedId : (pinned[0]?.id ?? DHIKR_CATALOGUE[0].id);
  const entry = findDhikr(activeId) ?? DHIKR_CATALOGUE[0];
  const target = pinned.find((t) => t.id === activeId)?.target ?? entry.defaultTarget;
  const count = selectDhikrCount(state, activeId, today);

  const withinRound = target > 0 ? count % target : 0;
  const rounds = target > 0 ? Math.floor(count / target) : 0;
  // A finished round shows a full ring rather than snapping back to empty.
  const ringProgress = target > 0 ? (withinRound === 0 && count > 0 ? 1 : withinRound / target) : 0;

  const increment = useCallback(() => {
    // Guard against a double-fire from a synthetic click after a touch.
    const now = Date.now();
    if (now - lastTapRef.current < 40) return;
    lastTapRef.current = now;

    const next = count + 1;
    countDhikr(activeId, 1);
    setPulse((p) => p + 1);
    if (target > 0 && next % target === 0) vibrate([18, 40, 18, 40, 24]);
    else vibrate(8);
  }, [activeId, count, countDhikr, target]);

  return (
    <AppCard as="section" aria-label="عدّاد الذكر" className="p-0">
      {/* Pinned dhikr selector */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border p-3 scrollbar-none">
        {pinned.map((t) => {
          const item = findDhikr(t.id);
          if (!item) return null;
          const selected = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              aria-pressed={selected}
              className={cn(
                'min-h-11 shrink-0 rounded-sm border px-3 text-mini font-semibold transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* The plate. Everything inside is decorative; the button owns the tap. */}
      <button
        type="button"
        onClick={increment}
        aria-label={`${entry.label} — عدّ. الحالي ${count} من ${target}`}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-4 px-4 py-8',
          'transition-colors duration-fast active:bg-muted/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        style={{ minHeight: 220, touchAction: 'manipulation' }}
      >
        <p
          className="max-w-md text-center text-lead leading-loose text-foreground"
          style={{ fontFamily: "'Amiri', 'Noto Sans Arabic', serif" }}
          dir="rtl"
        >
          {entry.text}
        </p>

        <ProgressRing progress={ringProgress} size={168} thickness={4} label={`${withinRound} من ${target}`}>
          <span className="flex flex-col items-center">
            {/* The figure itself pulses on count: a scale tick is the cheapest
                possible confirmation and never shifts layout. */}
            <motion.span
              key={pulse}
              initial={reduce ? false : { scale: 0.88 }}
              animate={{ scale: 1 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 620, damping: 26 }}
              className="text-hero font-semibold leading-none tabular-nums text-foreground"
              dir="ltr"
            >
              {count}
            </motion.span>
            <span className="mt-1 text-mini tabular-nums text-muted-foreground">
              الهدف {target}
              {rounds > 0 && ` · ${rounds} دورة`}
            </span>
          </span>
        </ProgressRing>

        <span className="text-micro text-muted-foreground">اضغط في أي مكان للعدّ</span>
      </button>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={() => countDhikr(activeId, -1)}
          disabled={count === 0}
          aria-label="إنقاص واحد"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => resetDhikr(activeId)}
          disabled={count === 0}
          aria-label="تصفير العدّاد"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>

        <div className="ms-auto flex items-center gap-1.5">
          <span className="text-micro text-muted-foreground">الهدف</span>
          {TARGET_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDhikrTarget(activeId, preset)}
              aria-pressed={target === preset}
              className={cn(
                'min-h-11 rounded-sm border px-2.5 text-mini font-semibold tabular-nums transition-colors duration-fast',
                target === preset
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Catalogue — pin more dhikr onto the selector */}
      <div className="border-t border-border p-3">
        <p className="app-section-label mb-2">أذكار للتثبيت</p>
        <div className="flex flex-wrap gap-1.5">
          {DHIKR_CATALOGUE.map((item) => {
            const isPinned = pinned.some((t) => t.id === item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleDhikrPinned(item.id, item.defaultTarget)}
                aria-pressed={isPinned}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-sm border px-2.5 text-mini transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isPinned
                    ? 'border-primary/60 bg-accent/40 font-semibold text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {isPinned && <Pin className="h-3 w-3" aria-hidden fill="currentColor" />}
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-micro text-muted-foreground">
          {entry.source}
          {entry.when ? ` · ${entry.when}` : ''}
        </p>
      </div>

      {/* Announce the running total without re-reading the whole plate. */}
      <p className="sr-only" aria-live="polite">
        {count}
      </p>
    </AppCard>
  );
}
