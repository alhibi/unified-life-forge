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
 *   • The header carries state instead of decoration: Hijri date, next prayer,
 *     today's practice ring, streak and a 28-day activity strip. It used to be
 *     a `bg-primary/10` colour wash behind a 28px title.
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

import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import MihrabHeader from '@/features/mihrab/components/MihrabHeader';
import MihrabTabs, { type MihrabTabDef } from '@/features/mihrab/components/MihrabTabs';
import { BookOpen, Feather, HandHeart, Moon } from '@/lib/icons';

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
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  }, [tab, setSearchParams]);

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
        <MihrabHeader />

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
