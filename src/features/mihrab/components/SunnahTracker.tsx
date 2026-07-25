/**
 * SunnahTracker — replaces the card that said «أوسمة نبوية … قريباً».
 *
 * That card was the only "feature" in the Sunnah tab and it did nothing but
 * flash the word "soon" for 1200 ms. This is the real thing: the user commits to
 * a set of sunnahs, ticks them off through the day, and the ticks feed the same
 * streak the header shows.
 *
 * Two modes in one component:
 *   • Empty state → a curated shortlist to commit to, so nobody faces an empty
 *     checklist and a plus button.
 *   • Committed  → today's checklist grouped by time of day, with an edit
 *     affordance to change the commitment without leaving the tab.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Check, Pencil, Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';

import {
  findSunnah,
  SUGGESTED_SUNNAH,
  SUNNAH_CATALOGUE,
  SUNNAH_SLOTS,
  type SunnahSlot,
} from '../data/catalogue';
import { selectSunnahTicked } from '../lib/practice';
import { usePractice } from '../lib/usePractice';

function vibrate(ms: number) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

export default function SunnahTracker() {
  const { state, today, toggleSunnah, commitSunnah } = usePractice();
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);

  const committed = state.committedSunnah;
  const doneCount = committed.filter((id) => selectSunnahTicked(state, id, today)).length;

  const grouped = useMemo(() => {
    const bySlot = new Map<SunnahSlot, string[]>();
    for (const id of committed) {
      const entry = findSunnah(id);
      if (!entry) continue;
      const list = bySlot.get(entry.slot) ?? [];
      list.push(id);
      bySlot.set(entry.slot, list);
    }
    return SUNNAH_SLOTS.map((slot) => ({ slot, ids: bySlot.get(slot.key) ?? [] })).filter(
      (group) => group.ids.length > 0,
    );
  }, [committed]);

  const showPicker = editing || committed.length === 0;

  return (
    <AppCard as="section" aria-label="متابعة السنن اليومية">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold text-foreground">سنن اليوم</h2>
        {committed.length > 0 && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex min-h-11 items-center gap-1.5 text-mini font-semibold text-muted-foreground transition-colors duration-fast hover:text-foreground"
          >
            {editing ? <Check className="h-4 w-4" aria-hidden /> : <Pencil className="h-4 w-4" aria-hidden />}
            {editing ? 'تم' : 'تعديل القائمة'}
          </button>
        )}
      </header>

      {committed.length > 0 && (
        <p className="mt-1 text-mini tabular-nums text-muted-foreground" dir="rtl">
          <span dir="ltr">{doneCount}</span> من <span dir="ltr">{committed.length}</span> اليوم
        </p>
      )}

      {/* Checklist */}
      {committed.length > 0 && (
        <div className="mt-4 space-y-4">
          {grouped.map((group) => (
            <div key={group.slot.key}>
              <p className="app-section-label mb-2">{group.slot.label}</p>
              <ul className="space-y-2">
                {group.ids.map((id) => {
                  const entry = findSunnah(id);
                  if (!entry) return null;
                  const ticked = selectSunnahTicked(state, id, today);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          toggleSunnah(id);
                          if (!ticked) vibrate(10);
                        }}
                        aria-pressed={ticked}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md border p-3 text-start',
                          'transition-[transform,border-color,background-color] duration-normal ease-out-expo',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          ticked
                            ? 'border-primary/60 bg-accent/40'
                            : 'border-border hover:-translate-y-0.5 hover:bg-muted/50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border',
                            ticked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                          )}
                          aria-hidden
                        >
                          <AnimatePresence initial={false}>
                            {ticked && (
                              <motion.span
                                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={
                                  reduce ? { duration: 0.08 } : { type: 'spring', stiffness: 620, damping: 26 }
                                }
                              >
                                <Check className="h-4 w-4" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-meta font-semibold',
                              ticked ? 'text-muted-foreground line-through' : 'text-foreground',
                            )}
                          >
                            {entry.title}
                          </span>
                          <span className="mt-0.5 block text-mini text-muted-foreground">{entry.detail}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Picker — the empty state and the edit state share one surface. */}
      {showPicker && (
        <div className={cn(committed.length > 0 && 'mt-4 border-t border-border pt-4')}>
          <p className="app-section-label mb-1">
            {committed.length === 0 ? 'اختر ما تلتزم به' : 'أضف أو أزل'}
          </p>
          {committed.length === 0 && (
            <p className="mb-3 text-mini text-muted-foreground">
              ابدأ بخمسٍ مقترحة، وعدّلها متى شئت. ما تختاره يظهر كقائمة يومية ويُحسب في تتابعك.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {SUNNAH_CATALOGUE.map((entry) => {
              const isCommitted = committed.includes(entry.id);
              const suggested = SUGGESTED_SUNNAH.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => commitSunnah(entry.id)}
                  aria-pressed={isCommitted}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 rounded-sm border px-2.5 text-mini transition-colors duration-fast',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isCommitted
                      ? 'border-primary bg-primary font-semibold text-primary-foreground'
                      : suggested
                        ? 'border-primary/50 text-foreground hover:bg-muted/60'
                        : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {isCommitted ? <Check className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
                  {entry.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AppCard>
  );
}
