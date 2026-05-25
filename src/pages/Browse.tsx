import React, { useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Newspaper,
} from 'lucide-react';

import PodcastsTab from './browse/PodcastsTab';
import ArticlesTab from './browse/ArticlesTab';

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
  labelDe: string;
  icon: typeof Mic;
}

const TABS: TabDef[] = [
  { key: 'podcasts', labelAr: 'بودكاست', labelDe: 'Podcasts', icon: Mic },
  { key: 'articles', labelAr: 'اقرأ',   labelDe: 'Lesen',    icon: Newspaper },
];

export default function BrowsePage() {
  const { language } = useApp();
  const isAr = language === 'ar';

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
    <div className="min-h-screen bg-background pb-28 px-5 pt-10">
      <SEO
        title={isAr ? 'اطلاع — بودكاست ومقالات — SmartHub' : 'Entdecken — Podcasts & Lesen — SmartHub'}
        description={isAr
          ? 'مركز الاكتشاف: بودكاست ومقالات في مكان واحد.'
          : 'Entdeckungs-Hub: Podcasts & Artikel an einem Ort.'}
        path="/browse"
      />

      <div className="max-w-lg mx-auto space-y-4">
        {/* Title row */}
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {isAr ? 'اطلاع' : 'Entdecken'}
          </h1>
        </header>

        {/* Horizontal tab dock — same visual idiom as Wellness */}
        <nav aria-label={isAr ? 'تبويبات الاطلاع' : 'Browse tabs'}>
          <div
            className="bg-card/80 backdrop-blur border border-border/45 rounded-2xl p-1 flex items-center gap-0.5"
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
                  aria-label={isAr ? t.labelAr : t.labelDe}
                  className={`relative flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-colors duration-150 ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="browse-dock-pill"
                      className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon className="w-4 h-4" strokeWidth={active ? 2.4 : 2} />
                    <span className="text-[12px] font-semibold whitespace-nowrap leading-none">
                      {isAr ? t.labelAr : t.labelDe}
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
            {tab === 'podcasts' ? <PodcastsTab /> : <ArticlesTab />}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
