/**
 * NutritionTab — Main entry point for the revolutionary nutrition system.
 * Combines the food explorer, meal tracker, smart insights, food comparer,
 * symptoms advisor, and advanced biophysical logs into a modular tabbed interface.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { BarChart3, Clock, Droplet, Scale, Search, Sparkles, UtensilsCrossed } from '@/lib/icons';

import AdvancedAnalytics from './AdvancedAnalytics';
import FastingLog from './FastingLog';
import FoodComparer from './FoodComparer';
import HydrationLog from './HydrationLog';
import MealTracker from './MealTracker';
import NutritionExplorer from './NutritionExplorer';
import SymptomAdvisor from './SymptomAdvisor';

type SubTab =
  'explore' | 'log' | 'insights' | 'compare' | 'symptoms' | 'hydration' | 'fasting' | 'analytics';
type Lang = 'ar';

const T = {
  explore: { ar: 'استكشاف', },
  log: { ar: 'السجل', },
  insights: { ar: 'تحليلات', },
  compare: { ar: 'المقارن', },
  symptoms: { ar: 'الأعراض', },
  hydration: { ar: 'الترطيب', },
  fasting: { ar: 'الصيام', },
  analytics: { ar: 'الذكية', },
};

const SUB_TABS: {
  key: SubTab;
  label: typeof T.explore;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'explore', label: T.explore, icon: Search },
  { key: 'log', label: T.log, icon: UtensilsCrossed },
  { key: 'compare', label: T.compare, icon: Scale },
  { key: 'symptoms', label: T.symptoms, icon: Sparkles },
  { key: 'hydration', label: T.hydration, icon: Droplet },
  { key: 'fasting', label: T.fasting, icon: Clock },
  { key: 'analytics', label: T.analytics, icon: BarChart3 },
];

export default function NutritionTab() {
  const { language } = useApp();
  const lang: Lang = 'ar';
  const [subTab, setSubTab] = useState<SubTab>('explore');

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div
        className="flex bg-muted/40 rounded-xl p-1 border border-border/30 overflow-x-auto scrollbar-none gap-0.5"
        dir={'rtl'}
      >
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
              subTab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label[lang]}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {subTab === 'explore' && <NutritionExplorer />}
          {subTab === 'log' && <MealTracker />}
          {subTab === 'compare' && <FoodComparer lang={lang} />}
          {subTab === 'symptoms' && <SymptomAdvisor lang={lang} />}
          {subTab === 'hydration' && <HydrationLog lang={lang} />}
          {subTab === 'fasting' && <FastingLog lang={lang} />}
          {subTab === 'analytics' && <AdvancedAnalytics lang={lang} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
export { NutritionTab };
