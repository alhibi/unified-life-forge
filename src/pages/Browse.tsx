import React, { useEffect, useState, lazy, Suspense } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Newspaper,
} from '@/lib/icons';

// Lazy — each tab pulls in its own data hook. Users usually pick one.
const PodcastsTab = lazy(() => import('./browse/PodcastsTab'));
const ArticlesTab = lazy(() => import('./browse/ArticlesTab'));

/**
 * /browse — "اطلاع" hub.
 *
 * Lightweight content-consumption hub that groups two surfaces the user
 * previously had to find via different entry points:
 *   • Podcasts  — was buried inside the IslamicSections grid on Home.
 *   • Articles  — was reachable only via a Newspaper icon in the Home
 *                 header.
 *
 * Both heavy pages (`/podcasts*`, `/reading`) keep their own routes,
 * own data hooks and own back-button flows; this hub is intentionally
 * a thin landing on top of them so we don't re-implement their state.
 *
 * The horizontal tab dock is the same visual language as Wellness, so
 * users who already know the Wellness layout pick this up instantly.
 */

type TabKey = 'podcasts' | 'articles';

const STORAGE_KEY = 'browse:lastTab';

interface TabDef {
  key: TabKey;
  labelAr: string;
  icon: typeof Mic;
}

const TABS: TabDef[] = [
  { key: 'podcasts', labelAr: 'بودكاست', icon: Mic },
  { key: 'articles', labelAr: 'اقرأ',    icon: Newspaper },
];

export default function BrowsePage() {
  const { } = useApp();

  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TabKey | null;
      if (saved && TABS.some(t => t.key === saved)) return saved;
    } catch { /* noop */ }
    return 'podcasts';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* noop */ }
  }, [tab]);

  return (
    <div className="min-h-screen bg-background pb-page px-5 pt-10">
      <SEO
        title={'اطلاع — بودكاست ومقالات — SmartHub'}
        description={'مركز الاكتشاف: بودكاست ومقالات في مكان واحد.'}
        path="/browse"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "اطلاع — بودكاست ومقالات",
          "description": "مركز الاكتشاف: بودكاست ومقالات في مكان واحد.",
          "url": "https://amv.life/browse"
        }}
      />

      <div className="max-w-lg mx-auto space-y-4">
        {/* Title row */}
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {'اطلاع'}
          </h1>
        </header>

        {/* Horizontal tab dock — same visual idiom as Wellness */}
        <nav aria-label={'تبويبات الاطلاع'}>
          <div
            className="bg-card border border-border rounded-xl p-1 flex items-center gap-0.5"
            dir="ltr"
          >
            {TABS.map(t => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-pressed={active}
                  aria-label={t.labelAr}
                  className={`relative flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg transition-colors duration-150 ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 {active && (
 <motion.span
 layoutId="browse-dock-pill"
                      className="absolute inset-0 rounded-lg bg-primary"
 transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon className="w-4 h-4" strokeWidth={active ? 2.4 : 2} />
                    <span className="text-[12px] font-semibold whitespace-nowrap leading-none">
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <Suspense
              fallback={
                <div className="space-y-2 pt-2">
                  <div className="h-24 rounded-2xl animate-pulse bg-muted/30" />
                  <div className="h-24 rounded-2xl animate-pulse bg-muted/25" />
                </div>
              }
            >
              {tab === 'podcasts' ? <PodcastsTab /> : <ArticlesTab />}
            </Suspense>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
