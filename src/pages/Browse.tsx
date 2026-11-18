import { AnimatePresence, motion } from 'framer-motion';
import React, { lazy, Suspense, useEffect, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { Mic, Newspaper, Sparkles } from '@/lib/icons';

// Lazy — each tab pulls in its own data hook. Users usually pick one.
const PodcastsTab = lazy(() => import('./browse/PodcastsTab'));
const ArticlesTab = lazy(() => import('./browse/ArticlesTab'));

/**
 * /browse — "اطلاع" hub.
 *
 * Lightweight content-consumption hub that groups two surfaces the user
 * previously had to find via different entry points:
 *   • Podcasts  — was buried inside the IslamicSections grid on Home.
 *   • Articles  — was reachable only via a Newspaper icon in the Home header.
 *
 * Both heavy pages (/podcasts*, /reading) keep their own routes, own data
 * hooks and own back-button flows; this hub is intentionally a thin landing
 * on top of them so we don't re-implement their state.
 *
 * The page is composed as a G1 overview rather than a lone pill row: a short
 * intro states what the hub is for, the two surfaces are presented as a real
 * pair of destinations, and the chosen surface renders underneath with its
 * own entry points.
 */

type TabKey = 'podcasts' | 'articles';

const STORAGE_KEY = 'browse:lastTab';

interface TabDef {
  key: TabKey;
  labelAr: string;
  /** One line that says what the surface holds. */
  noteAr: string;
  icon: typeof Mic;
}

const TABS: TabDef[] = [
  {
    key: 'podcasts',
    labelAr: 'بودكاست',
    noteAr: 'استكشاف ومكتبة وسجل استماع',
    icon: Mic,
  },
  {
    key: 'articles',
    labelAr: 'اقرأ',
    noteAr: 'مقالات ومصادر ومحفوظات',
    icon: Newspaper,
  },
];

export default function BrowsePage() {
  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TabKey | null;
      if (saved && TABS.some((t) => t.key === saved)) return saved;
    } catch {
      /* noop */
    }
    return 'podcasts';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* noop */
    }
  }, [tab]);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <PageShell
      header={
        <PageHeader
          title="اطلاع"
          subtitle="الاستماع والقراءة في مكان واحد"
          backTo="/"
        />
      }
    >
      <SEO
        title={'اطلاع — بودكاست ومقالات — amv.life'}
        description={
          'مركز الاكتشاف: بودكاست من العالم العربي والألماني والإنجليزي، ومقالات من مصادرك المختارة.'
        }
        path="/browse"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'اطلاع — بودكاست ومقالات',
          description: 'مركز الاكتشاف: بودكاست ومقالات في مكان واحد.',
          url: 'https://amv.life/browse',
        }}
      />

      <div className="app-stack">
        {/* What this hub is. Two lines, in the product's own voice. */}
        <div className="flex items-start gap-3">
          <span className="row-icon shrink-0" aria-hidden>
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="min-w-0 text-meta leading-relaxed text-muted-foreground">
            كل ما تسمعه وتقرأه في مكان واحد. اختر الوجهة، ثم أكمل من حيث توقفت —
            المكتبة والسجل والمحفوظات تبقى في صفحاتها.
          </p>
        </div>

        {/* Destination pair, not a segmented pill floating alone: each segment
            carries its own icon, name and one line of purpose. */}
        <div
          role="tablist"
          aria-label="وجهات الاطلاع"
          className="grid grid-cols-2 gap-2"
        >
          {TABS.map((entry) => {
            const active = tab === entry.key;
            const Icon = entry.icon;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.key)}
                className={`relative flex min-h-[var(--ui-touch-min)] items-center gap-2.5 rounded-card border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? 'border-primary/50 bg-primary-container text-on-primary-container'
                    : 'border-border/60 bg-secondary text-secondary-foreground hover:bg-interactive-hover'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'
                  }`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-meta font-semibold">{entry.labelAr}</span>
                  <span
                    className={`mt-0.5 block text-mini leading-snug ${
                      active ? 'text-secondary-muted' : 'text-secondary-muted/90'
                    }`}
                  >
                    {entry.noteAr}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab body */}
        <section aria-label={activeTab.labelAr} className="pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Suspense
                fallback={
                  <div className="app-stack-sm">
                    <div className="h-24 animate-pulse rounded-card bg-muted/30" />
                    <div className="h-24 animate-pulse rounded-card bg-muted/25" />
                  </div>
                }
              >
                {tab === 'podcasts' ? <PodcastsTab /> : <ArticlesTab />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* The hub explains what lives beyond its own two shortcuts. */}
        <AppCard className="flex items-start gap-3">
          <span className="row-icon shrink-0" aria-hidden>
            <Newspaper className="h-4 w-4" />
          </span>
          <p className="min-w-0 text-mini leading-relaxed text-muted-foreground">
            البودكاست والمقالات صفحات كاملة مستقلة: لكل واحدة رأسها وبحثها وحفظها.
            من هنا تصل إليها في نقرة، ثم تعود إلى البوابة متى شئت.
          </p>
        </AppCard>
      </div>
    </PageShell>
  );
}
