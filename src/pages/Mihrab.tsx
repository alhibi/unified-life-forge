/**
 * /mihrab — "محراب" hub.
 *
 * The landing surface in front of the Qur'an, dhikr, sunnah and literature
 * experiences. It keeps the seven-grammar G1 priority the north star asks for:
 * the next prayer, today's wird and the streak come BEFORE the tabs, because
 * "users keep their prayers" is the product's own measure.
 *
 * Composition (this revision):
 *   • The display header keeps the module identity (eyebrow + «محراب») and now
 *     carries ONE masthead instrument — a hairline grid of four equal cells:
 *     date · next prayer (+ prayer-window progress) · wird · streak. The four
 *     facts used to be four independent pills of slightly different heights,
 *     borders and gaps, which read as an unfinished row rather than as one
 *     instrument. Cells share geometry because they share a surface.
 *   • The 28-day activity is a 4×7 calendar block next to its caption instead
 *     of a full-width barcode of empty bars; inactive days are track-coloured,
 *     active days carry the accent at the completion share (data, not decor).
 *   • The next-prayer cell states the truth at every stage — no cached city →
 *     a real "set your prayer times" link; resolving → a progress sentence;
 *     no timings → the retry/setup escape. It never leaves the slot blank.
 *   • Tabs stay swipeable with roving tabIndex (see MihrabTabs); each tab is a
 *     separate lazy chunk so the hub's cold paint stays small.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { useNextPrayer } from '@/components/portal/useNextPrayer';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import MihrabTabs, { type MihrabTabDef } from '@/features/mihrab/components/MihrabTabs';
import { usePractice } from '@/features/mihrab/lib/usePractice';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { BookOpen, Feather, HandHeart, Moon } from '@/lib/icons';
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

/** One cell of the masthead instrument. Same anatomy, same height, no pills. */
function MastheadCell({
  label,
  value,
  meta,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  /** 0..1 — renders a hairline window bar under the value. */
  progress?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-card p-3">
      <span className="text-micro leading-none text-muted-foreground">{label}</span>
      <span className="truncate text-meta font-semibold text-foreground">{value}</span>
      {typeof progress === 'number' && (
        <span className="mt-0.5 block h-0.5 overflow-hidden rounded-full bg-track" aria-hidden>
          <span
            className="block h-full bg-primary"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </span>
      )}
      {meta != null && (
        <span className="truncate text-micro tabular-nums text-muted-foreground-subtle">{meta}</span>
      )}
    </div>
  );
}

/**
 * The masthead's state — hijri date, next prayer, wird share and streak, plus
 * the 28-day activity calendar. One instrument, four equal readings.
 */
function MihrabMasthead() {
  const { hijri } = useLiveHijriDate();
  const { next, loading: prayerLoading } = useNextPrayer();
  const { location, status: locationStatus } = useDeviceLocation();
  const { state, progress, streak, recentDays } = usePractice();

  const percent = Math.round(progress.overall * 100);
  const activeDays = recentDays.filter((day) => day.active).length;

  let prayerValue: React.ReactNode;
  let prayerMeta: React.ReactNode;
  let prayerProgress: number | undefined;
  if (!location) {
    if (locationStatus === 'requesting') {
      prayerValue = <span className="font-normal text-muted-foreground">جارٍ تحديد موقعك…</span>;
    } else {
      prayerValue = (
        <Link
          to="/settings/prayer"
          className="app-focus-ring inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline"
        >
          اضبط أوقات الصلاة
        </Link>
      );
      prayerMeta = 'لم تُحدَّد مدينة بعد';
    }
  } else if (prayerLoading) {
    prayerValue = <span className="font-normal text-muted-foreground">جارٍ حساب الأوقات…</span>;
  } else if (next) {
    prayerValue = (
      <>
        {next.label}{' '}
        <span className="text-mini font-normal text-muted-foreground">{next.relative}</span>
      </>
    );
    prayerMeta = next.clock;
    prayerProgress = next.progress;
  } else {
    prayerValue = (
      <Link
        to="/settings/prayer"
        className="app-focus-ring inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline"
      >
        أعد ضبط أوقات الصلاة
      </Link>
    );
    prayerMeta = 'تعذّر حساب الأوقات الآن';
  }

  return (
    <PageHeader variant="display" hideBack eyebrow="بوابة السكينة" title="محراب">
      <div className="mt-3 w-full">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
          <MastheadCell label="التاريخ الهجري" value={formatHijriDate(hijri)} />
          <MastheadCell
            label="الصلاة القادمة"
            value={prayerValue}
            meta={prayerMeta}
            progress={prayerProgress}
          />
          <MastheadCell
            label="ورد اليوم"
            value={progress.wirdSet ? `${percent}%` : 'لم يُضبط'}
            meta={
              progress.wirdSet
                ? progress.wirdDone
                  ? 'أُنجز اليوم'
                  : 'لم يُنجز بعد'
                : 'اختر قدرك من تبويب القرآن'
            }
            progress={progress.wirdSet ? (progress.wirdDone ? 1 : 0) : undefined}
          />
          <MastheadCell
            label="التتابع"
            value={`${streak.current} يوم`}
            meta={streak.best > 0 ? `الأفضل ${streak.best} يوم` : 'لم يبدأ بعد'}
          />
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-micro font-medium text-muted-foreground">
              نشاط الورد · آخر أربعة أسابيع
            </p>
            <p className="mt-0.5 text-mini tabular-nums text-muted-foreground-subtle">
              {activeDays} يوماً نشطاً من 28
            </p>
          </div>
          <div
            className="inline-grid shrink-0 grid-cols-7 gap-1"
            role="img"
            aria-label={`نشاط الورد اليومي في آخر 28 يوماً: ${activeDays} يوماً نشطاً`}
          >
            {recentDays.map((day) => (
              <span
                key={day.key}
                title={day.key}
                aria-hidden
                className={cn('size-3.5 rounded-xs', day.active ? 'bg-primary' : 'bg-track')}
                style={
                  day.active
                    ? { opacity: 0.35 + Math.min(1, day.progress) * 0.65 }
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {streak.total > 0 && (
          <p className="mt-1.5 text-micro tabular-nums text-muted-foreground">
            {streak.total} يوماً نشطاً في آخر أربعة أشهر
            {state.wird ? ` · الورد ${state.wird.pages} صفحات` : ''}
          </p>
        )}
      </div>
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

  const handleChange = useCallback((nextTab: TabKey, dir: 1 | -1) => {
    setDirection(dir);
    setTab(nextTab);
  }, []);

  return (
    <PageShell header={<MihrabMasthead />}>
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

      <MihrabTabs tabs={TABS} active={tab} direction={direction} onChange={handleChange}>
        <Suspense fallback={<TabSkeleton />}>
          {tab === 'quran' && <QuranTab />}
          {tab === 'dhikr' && <DhikrTab />}
          {tab === 'sunnah' && <SunnahTab />}
          {tab === 'literature' && <LiteratureTab />}
        </Suspense>
      </MihrabTabs>
    </PageShell>
  );
}
