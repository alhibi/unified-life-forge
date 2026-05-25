/**
 * NutritionTab — Main entry point for the revolutionary nutrition system.
 * Combines the food explorer, meal tracker, and smart insights
 * into a tabbed interface within the wellness page.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UtensilsCrossed, Sparkles, BarChart3 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import NutritionExplorer from './NutritionExplorer';
import MealTracker from './MealTracker';
import NutritionInsights from './NutritionInsights';

type SubTab = 'explore' | 'log' | 'insights';
type Lang = 'ar' | 'de';

const T = {
  explore: { ar: 'استكشاف', de: 'Erkunden' },
  log: { ar: 'السجل', de: 'Log' },
  insights: { ar: 'تحليلات', de: 'Insights' },
};

const SUB_TABS: { key: SubTab; label: typeof T.explore; icon: any }[] = [
  { key: 'explore', label: T.explore, icon: Search },
  { key: 'log', label: T.log, icon: UtensilsCrossed },
  { key: 'insights', label: T.insights, icon: BarChart3 },
];

export default function NutritionTab() {
  const { language } = useApp();
  const lang: Lang = language === 'ar' ? 'ar' : 'de';
  const [subTab, setSubTab] = useState<SubTab>('explore');

  return (
    <div className="space-y-3">
      {/* Sub-tab switcher */}
      <div className="flex bg-muted/40 rounded-xl p-1 border border-border/30">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
              subTab === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label[lang]}
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
          {subTab === 'insights' && <NutritionInsights />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
