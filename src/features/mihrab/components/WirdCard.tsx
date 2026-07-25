/**
 * WirdCard — the daily Qur'an portion.
 *
 * The Quran tab had a "continue reading" peek and two links. What was missing is
 * the commitment itself: a portion the user sets once and then meets (or does
 * not) every day. Everything here writes into the shared practice store, so the
 * header ring and the streak reflect it immediately.
 *
 * The estimate under the picker is deliberate: "٤ صفحات ≈ جزء كل ١٥ يوماً"
 * turns an abstract number into a plan, which is what makes a daily portion
 * stick. 20 pages ≈ one juz' in the standard Madani muṣḥaf.
 */
import { useMemo } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { BookOpen, Check } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { usePractice } from '../lib/usePractice';

const PAGE_PRESETS = [2, 4, 10, 20];
const PAGES_PER_JUZ = 20;

/**
 * Arabic counted-noun agreement for «صفحة».
 *
 * Arabic does not pluralise like English: 1 takes the singular, 2 takes the
 * dual, 3–10 take the broken plural, and 11+ revert to the singular. "٢٠
 * صفحات" is simply wrong — and it was also the longest label in the row, so
 * getting the grammar right happens to make the presets fit one line.
 */
function pagesLabel(n: number): string {
  if (n === 1) return 'صفحة';
  if (n === 2) return 'صفحتان';
  if (n <= 10) return `${n} صفحات`;
  return `${n} صفحة`;
}

function daysLabel(n: number): string {
  if (n === 1) return 'يوم';
  if (n === 2) return 'يومان';
  if (n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

export default function WirdCard() {
  const { state, progress, setWird, toggleWird } = usePractice();
  const pages = state.wird?.pages ?? null;

  const plan = useMemo(() => {
    if (!pages) return null;
    const daysPerJuz = PAGES_PER_JUZ / pages;
    const daysPerKhatma = (PAGES_PER_JUZ * 30) / pages;
    return {
      // Rounded to whole days: "١٥ يوماً للجزء" is actionable, "14.7" is not.
      daysPerJuz: Math.max(1, Math.round(daysPerJuz)),
      monthsPerKhatma: daysPerKhatma / 30,
      daysPerKhatma: Math.round(daysPerKhatma),
    };
  }, [pages]);

  return (
    <AppCard as="section" aria-label="ورد القرآن اليومي">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
          <BookOpen className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold text-foreground">ورد القرآن</h2>
          <p className="mt-0.5 text-mini text-muted-foreground">
            {pages ? `${pagesLabel(pages)} كل يوم` : 'اختر قدراً ثابتاً تلتزم به'}
          </p>
        </div>
        {pages !== null && (
          <button
            type="button"
            onClick={toggleWird}
            aria-pressed={progress.wirdDone}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-1.5 rounded-button border px-3 text-meta font-semibold',
              'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              progress.wirdDone
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-foreground hover:bg-muted',
            )}
          >
            <Check className="h-4 w-4" aria-hidden />
            {progress.wirdDone ? 'أُنجز' : 'أنجزته'}
          </button>
        )}
      </header>

      <div className="mt-4">
        <p className="app-section-label mb-2">القدر اليومي</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {PAGE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setWird(preset)}
              aria-pressed={pages === preset}
              className={cn(
                'min-h-11 rounded-sm border px-3 text-mini font-semibold tabular-nums transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pages === preset
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {pagesLabel(preset)}
            </button>
          ))}
          {pages !== null && (
            <button
              type="button"
              onClick={() => setWird(null)}
              className="min-h-11 rounded-sm px-3 text-mini text-muted-foreground transition-colors duration-fast hover:text-foreground"
            >
              إلغاء الورد
            </button>
          )}
        </div>

        {plan && (
          <p className="mt-3 text-mini tabular-nums text-muted-foreground">
            بهذا القدر تُتمّ جزءاً كل {daysLabel(plan.daysPerJuz)}، وخَتمة كل{' '}
            {plan.daysPerKhatma >= 60
              ? `${Math.round(plan.monthsPerKhatma)} أشهر`
              : daysLabel(plan.daysPerKhatma)}
            .
          </p>
        )}
      </div>
    </AppCard>
  );
}
