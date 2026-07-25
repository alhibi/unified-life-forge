import { AnimatePresence, motion } from 'framer-motion';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, Feather, HandHeart, Moon } from '@/lib/icons';
import { EASE_IN, EASE_OUT_EXPO } from '@/lib/motion';

/**
 * /mihrab — "محراب" hub.
 *
 * Unified home for everything that the user previously had to discover
 * across multiple destinations:
 *   • Tafsir         (/tafsir)
 *   • Quran Virtues  (/section/quran-virtues)
 *   • Duas           (/duas)
 *   • Forty Hadith of An-Nawawi (inside /duas)
 *   • Timed Sunnah   (/section/timed-sunnah)
 *   • Untimed Sunnah (/section/untimed-sunnah)
 *   • Prophetic Day  (/section/prophetic-day)
 *   • Diwan literary library (/diwan)
 *
 * Four horizontal sub-tabs group these by mental mode:
 *   ┌──────────────┬──────────────┬─────────────┬─────────────┐
 *   │ القرآن       │ الذكر         │ السنّة       │ الأدب        │
 *   │ Quran        │ Dhikr        │ Sunnah      │ Literature  │
 *   ├──────────────┼──────────────┼─────────────┼─────────────┤
 *   │ Tafsir       │ Frequent     │ Timed       │ Diwan       │
 *   │ Virtues      │ Categories   │ Untimed     │ library     │
 *   │              │ Nawawi 40    │ Day         │ Selections  │
 *   └──────────────┴──────────────┴─────────────┴─────────────┘
 *
 * Heavy sub-pages keep their existing routes & back-button flow;
 * Mihrab is a thin landing surface in front of them. The Dhikr and
 * Literature tabs embed their content inline because that content is
 * already structured as a tab body (the legacy /duas tab was just
 * cards, and DiwanLibraryPage already supports `tab` mode).
 *
 * Each sub-tab is split into its own lazy chunk so the cold-paint of
 * the hub itself stays trivial — the user pays for Dhikr and
 * Literature only when they tap into them.
 */

const QuranTab = lazy(() => import('./mihrab/QuranTab'));
const DhikrTab = lazy(() => import('./mihrab/DhikrTab'));
const SunnahTab = lazy(() => import('./mihrab/SunnahTab'));
const LiteratureTab = lazy(() => import('./mihrab/LiteratureTab'));

type TabKey = 'quran' | 'dhikr' | 'sunnah' | 'literature';

const STORAGE_KEY = 'mihrab:lastTab';

interface TabDef {
  key: TabKey;
  labelAr: string;
  icon: typeof BookOpen;
}

const TABS: TabDef[] = [
  { key: 'quran', labelAr: 'القرآن', icon: BookOpen },
  { key: 'dhikr', labelAr: 'الذكر', icon: HandHeart },
  { key: 'sunnah', labelAr: 'السنّة', icon: Moon },
  { key: 'literature', labelAr: 'الأدب', icon: Feather },
];

const TabSkeleton = () => (
  <div className="space-y-2 pt-1">
    <div className="h-20 rounded-2xl skeleton" />
    <div className="h-16 rounded-2xl skeleton" />
    <div className="h-20 rounded-2xl skeleton" />
  </div>
);

export default function MihrabPage() {
  const { dir } = useApp();
  const rtl = dir === 'rtl';
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get('tab') as TabKey | null;

  const [tab, setTab] = useState<TabKey>(() => {
    if (urlTab && TABS.some((t) => t.key === urlTab)) return urlTab;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TabKey | null;
      if (saved && TABS.some((t) => t.key === saved)) return saved;
    } catch {
      /* noop */
    }
    return 'quran';
  });

  // Track previous tab so the body can slide in from the correct side.
  // Spatial cue: moving "right" in the dock slides content in from the
  // trailing edge, moving "left" from the leading edge. Mirrored in RTL.
  const [prevTab, setPrevTab] = useState<TabKey>(tab);
  const idxOf = (k: TabKey) => TABS.findIndex((t) => t.key === k);
  const goingForward = idxOf(tab) > idxOf(prevTab);
  const slideSign = (goingForward ? 1 : -1) * (rtl ? -1 : 1);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* noop */
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  }, [tab, setSearchParams]);

  const handleTabChange = (next: TabKey) => {
    if (next === tab) return;
    setPrevTab(tab);
    setTab(next);
  };

  return (
    <PageShell flush centered={false} className="px-4 pt-4 sm:pt-6">
      <SEO
        title="محراب — قرآن وذكر وسنّة وأدب — SmartHub"
        description="مركز موحّد للقرآن والتفسير والأدعية والسنن النبوية والديوان الأدبي."
        path="/mihrab"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "محراب — قرآن وذكر وسنّة وأدب",
          "description": "مركز موحّد للقرآن والتفسير والأدعية والسنن النبوية والديوان الأدبي.",
          "url": "https://amv.life/mihrab"
        }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="relative overflow-hidden rounded-[1.75rem] surface-depth px-5 py-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-primary/10" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1 text-start">
              <p className="text-[11px] font-semibold text-primary">بوابة السكينة</p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight text-foreground">محراب</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                القرآن، الذكر، السنّة، والأدب في مساحة واحدة مرتبة وواضحة.
              </p>
            </div>
          </div>
        </header>

        <nav aria-label="تبويبات المحراب">
          <div className="surface-depth grid grid-cols-4 gap-2 rounded-[1.5rem] p-2" dir="ltr">
            {TABS.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  aria-pressed={active}
                  aria-label={t.labelAr}
                  className={`relative h-16 w-full min-w-0 overflow-hidden rounded-2xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                    active
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="mihrab-dock-pill"
                      className="absolute inset-0 rounded-2xl bg-primary"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 px-1">
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    <span className="max-w-full truncate text-[12px] font-bold leading-none">
                      {t.labelAr}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab body */}
        <AnimatePresence mode="wait">
          <motion.section
            key={tab}
            initial={{ opacity: 0, x: slideSign * 16 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE_OUT_EXPO } }}
            exit={{ opacity: 0, x: slideSign * -8, transition: { duration: 0.14, ease: EASE_IN } }}
            className="min-h-[58vh]"
          >
            <Suspense fallback={<TabSkeleton />}>
              {tab === 'quran' && <QuranTab />}
              {tab === 'dhikr' && <DhikrTab />}
              {tab === 'sunnah' && <SunnahTab />}
              {tab === 'literature' && <LiteratureTab />}
            </Suspense>
          </motion.section>
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
