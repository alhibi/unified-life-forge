import React, { Suspense, lazy, useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE_OUT_EXPO, EASE_IN } from '@/lib/motion';
import {
  BookOpen, HandHeart, Moon, Feather,
} from '@/lib/icons';

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

const QuranTab      = lazy(() => import('./mihrab/QuranTab'));
const DhikrTab      = lazy(() => import('./mihrab/DhikrTab'));
const SunnahTab     = lazy(() => import('./mihrab/SunnahTab'));
const LiteratureTab = lazy(() => import('./mihrab/LiteratureTab'));

type TabKey = 'quran' | 'dhikr' | 'sunnah' | 'literature';

const STORAGE_KEY = 'mihrab:lastTab';

interface TabDef {
  key: TabKey;
  labelAr: string;
  labelDe: string;
  icon: typeof BookOpen;
}

const TABS: TabDef[] = [
  { key: 'quran',      labelAr: 'القرآن', labelDe: 'Quran',      icon: BookOpen  },
  { key: 'dhikr',      labelAr: 'الذكر',  labelDe: 'Dhikr',      icon: HandHeart },
  { key: 'sunnah',     labelAr: 'السنّة',  labelDe: 'Sunna',      icon: Moon      },
  { key: 'literature', labelAr: 'الأدب',  labelDe: 'Literatur',  icon: Feather   },
];

const TabSkeleton = () => (
  <div className="space-y-2 pt-1">
    <div className="h-20 rounded-xl animate-pulse bg-muted/30" />
    <div className="h-16 rounded-xl animate-pulse bg-muted/20" />
    <div className="h-20 rounded-xl animate-pulse bg-muted/25" />
  </div>
);

export default function MihrabPage() {
  const { language, dir } = useApp();
  const isAr = language === 'ar';
  const rtl = dir === 'rtl';

  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TabKey | null;
      if (saved && TABS.some(t => t.key === saved)) return saved;
    } catch { /* noop */ }
    return 'quran';
  });

  // Track previous tab so the body can slide in from the correct side.
  // Spatial cue: moving "right" in the dock slides content in from the
  // trailing edge, moving "left" from the leading edge. Mirrored in RTL.
  const [prevTab, setPrevTab] = useState<TabKey>(tab);
  const idxOf = (k: TabKey) => TABS.findIndex(t => t.key === k);
  const goingForward = idxOf(tab) > idxOf(prevTab);
  const slideSign = (goingForward ? 1 : -1) * (rtl ? -1 : 1);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch { /* noop */ }
  }, [tab]);

  const handleTabChange = (next: TabKey) => {
    if (next === tab) return;
    setPrevTab(tab);
    setTab(next);
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-10">
      <SEO
        title={isAr ? 'محراب — قرآن وذكر وسنّة وأدب — SmartHub' : 'Mihrab — Quran, Dhikr, Sunna & Literatur — SmartHub'}
        description={isAr
          ? 'مركز موحّد للقرآن والتفسير والأدعية والسنن النبوية والديوان الأدبي.'
          : 'Vereinter Hub für Quran, Tafsir, Bittgebete, prophetische Sunna und arabische Literatur.'}
        path="/mihrab"
      />

      <div className="max-w-lg mx-auto space-y-4">
        {/* Title — unified PageHeader (top-level hub, no back) */}
        <PageHeader
          hideBack
          title={isAr ? 'محراب' : 'Mihrab'}
          className="px-0 py-0"
        />

        {/* Horizontal tab dock */}
        <nav aria-label={isAr ? 'تبويبات المحراب' : 'Mihrab tabs'}>
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
                  onClick={() => handleTabChange(t.key)}
                  aria-pressed={active}
                  aria-label={isAr ? t.labelAr : t.labelDe}
                  className={`relative flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl transition-colors duration-150 ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="mihrab-dock-pill"
                      className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
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
            initial={{ opacity: 0, x: slideSign * 16 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE_OUT_EXPO } }}
            exit={{ opacity: 0, x: slideSign * -8, transition: { duration: 0.14, ease: EASE_IN } }}
            className="space-y-3"
          >
            <Suspense fallback={<TabSkeleton />}>
              {tab === 'quran'      && <QuranTab />}
              {tab === 'dhikr'      && <DhikrTab />}
              {tab === 'sunnah'     && <SunnahTab />}
              {tab === 'literature' && <LiteratureTab />}
            </Suspense>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
