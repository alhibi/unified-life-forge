/**
 * /mihrab — "محراب" hub.
 *
 * Unified home for the Qur'an, dhikr, sunnah and literary material that used to
 * be scattered across /tafsir, /section/*, /duas and /diwan. Those deep pages
 * keep their own routes; Mihrab is the landing surface in front of them.
 *
 * What changed in this revision:
 *   • The tab bar is now a real `tablist` with roving tabIndex, RTL-correct
 *     arrow keys and a spring `layoutId` indicator, and the panes are
 *     SWIPEABLE (see MihrabTabs). Previously it was a 4-column grid of tiles
 *     forced to `dir="ltr"`, with no gesture and no ARIA.
 *   • The masthead is now the shared <PageHeader variant="display"> with the
 *     hijri date, next prayer, wird progress and streak as chip rails under
 *     the title. The former bespoke AppCard header held the same state; the
 *     system-unification pass moved it onto the one header primitive.
 *   • Each tab gained something to *do* rather than only links: a tasbih
 *     counter (Dhikr), a daily Qur'an wird plus sūrah search (Qur'an), and a
 *     self-composed sunnah checklist (Sunnah) — all persisted locally and all
 *     feeding one streak. The placeholder card that flashed «قريباً» is gone.
 *
 * Each sub-tab stays in its own lazy chunk, so cold paint of the hub is still
 * trivial and the heavy Diwan library only loads if the user opens Literature.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { useNextPrayer } from '@/components/portal/useNextPrayer';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import MihrabTabs, { type MihrabTabDef } from '@/features/mihrab/components/MihrabTabs';
import { usePractice } from '@/features/mihrab/lib/usePractice';
import { BookOpen, Feather, Flame, HandHeart, Moon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const QuranTab = lazy(() => import('./mihrab/QuranTab'));
const DhikrTab = lazy(() => import('./mihrab/DhikrTab'));
const SunnahTab = lazy(() => import('./mihrab/SunnahTab'));
const LiteratureTab = lazy(() => import('./mihrab/LiteratureTab'));

type TabKey = 'quran' | 'dhikr' | 'sunnah' | 'literature';

const STORAGE_KEY = 'mihrab:lastTab';

const TABS: readonly MihrabTabDef<TabKey>[] = [
  { key: 'quran', label: 'القرآن', icon: BookOpen },
  { key: 'dhikr', label: 'الذكر', icon: HandHeart },
  { key: 'sunnah', label: 'السنّة', icon: Moon },
  { key: 'literature', label: 'الأدب', icon: Feather },
];

const TabSkeleton = () => (
  <div className="space-y-2 pt-1">
    <div className="skeleton h-24 rounded-lg" />
    <div className="skeleton h-16 rounded-lg" />
    <div className="skeleton h-20 rounded-lg" />
  </div>
);

function readInitialTab(urlTab: string | null): TabKey {
  if (urlTab && TABS.some((t) => t.key === urlTab)) return urlTab as TabKey;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && TABS.some((t) => t.key === saved)) return saved as TabKey;
  } catch {
    /* storage blocked — fall through to the default */
  }
  return 'quran';
}

/** The masthead's state — hijri date, next prayer, wird share and streak. */
function MihrabMasthead() {
  const { hijri } = useLiveHijriDate();
  const { next } = useNextPrayer();
  const { progress, streak, recentDays } = usePractice();

  const percent = Math.round(progress.overall * 100);

  return (
    <PageHeader variant="display" hideBack eyebrow="بوابة السكينة" title="محراب">
      <div className="flex w-full flex-wrap items-center justify-center gap-2 pt-1">
        <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-mini tabular-nums text-muted-foreground">
          {formatHijriDate(hijri)}
        </span>
        {next && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-mini text-foreground">
            {next.label} <span className="text-muted-foreground">{next.relative}</span>
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-mini font-semibold tabular-nums',
            streak.current > 0
              ? 'border-primary/60 text-foreground'
              : 'border-border text-muted-foreground',
          )}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden />
          <span dir="ltr">{streak.current}</span>
          يوم متتابع
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-mini tabular-nums text-muted-foreground">
          ورد اليوم
          <span dir="ltr" className="font-semibold text-foreground">
            {percent}%
          </span>
        </span>
      </div>

      {/* 28-day activity strip. Each cell encodes one day's completion share —
          this is data, so it keeps the accent at varying alpha (the documented
          data-colour exception on the single-accent contract). */}
      <div className="mt-2 flex w-full max-w-xs items-end gap-[3px]" aria-hidden>
        {recentDays.map((day) => (
          <span
            key={day.key}
            className="h-6 flex-1 rounded-xs bg-muted"
            style={{
              backgroundColor: day.active
                ? `hsl(var(--primary) / ${0.28 + Math.min(1, day.progress) * 0.72})`
                : undefined,
            }}
          />
        ))}
      </div>
      {/* Only claim a record once one exists — "أفضل تتابع ٠ يوم" is noise. */}
      {streak.total > 0 && (
        <p className="mt-1.5 text-micro tabular-nums text-muted-foreground">
          أفضل تتابع {streak.best} يوماً · {streak.total} يوماً نشِطاً في آخر ٤ أشهر
        </p>
      )}
    </PageHeader>
  );
}

export default function MihrabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => readInitialTab(searchParams.get('tab')));
  const [direction, setDirection] = useState<1 | -1>(1);

  // Persist + reflect in the URL so a tab is shareable and survives a reload.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
    // Never write an identical URL from inside an effect: the write re-renders,
    // the effect re-runs, and the two chase each other — burning the thread
    // and starving every timer (this loop wedged the route-smoke suite).
    // Only replace when the param actually differs.
    if (searchParams.get('tab') === tab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  }, [tab, searchParams, setSearchParams]);

  const handleChange = useCallback((next: TabKey, dir: 1 | -1) => {
    setDirection(dir);
    setTab(next);
  }, []);

  return (
    <PageShell flush centered={false} className="px-4 pt-4 sm:pt-6">
      <SEO
        title="محراب — قرآن وذكر وسنّة وأدب — SmartHub"
        description="مركز موحّد للقرآن والتفسير والأذكار وعدّاد التسبيح والسنن النبوية والديوان الأدبي، مع متابعة يومية للورد."
        path="/mihrab"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'محراب — قرآن وذكر وسنّة وأدب',
          description:
            'مركز موحّد للقرآن والتفسير والأذكار وعدّاد التسبيح والسنن النبوية والديوان الأدبي.',
          url: 'https://amv.life/mihrab',
        }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        <MihrabMasthead />

        <MihrabTabs tabs={TABS} active={tab} direction={direction} onChange={handleChange}>
          <Suspense fallback={<TabSkeleton />}>
            {tab === 'quran' && <QuranTab />}
            {tab === 'dhikr' && <DhikrTab />}
            {tab === 'sunnah' && <SunnahTab />}
            {tab === 'literature' && <LiteratureTab />}
          </Suspense>
        </MihrabTabs>
      </div>
    </PageShell>
  );
}
