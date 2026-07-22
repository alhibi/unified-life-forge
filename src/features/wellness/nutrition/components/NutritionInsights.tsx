/**
 * NutritionInsights — Smart analytics and recommendations.
 * Shows nutrient-dense foods, comparisons, and personalized tips.
 */
import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import { useApp } from '@/contexts/AppContext';
import { Award, Brain, Dumbbell, Leaf, Shield, Sparkles, Star, Zap } from '@/lib/icons';

import {
  bestProteinSources,
  foodsHighInMineral,
  foodsHighInVitamin,
  highestFiberFoods,
  mostNutrientDense,
  TOTAL_FOOD_COUNT,
} from '../index';
import type { NutritionFoodItem } from '../types';

type Lang = 'ar' | 'de';

const T = {
  title: { ar: 'تحليلات التغذية الذكية', de: 'Smarte Ernährungsanalyse' },
  topNutrient: { ar: 'أغنى الأطعمة بالمغذيات', de: 'Nährstoffdichteste Lebensmittel' },
  topProtein: {
    ar: 'أفضل مصادر البروتين (نسبة للسعرات)',
    de: 'Beste Proteinquellen (pro Kalorie)',
  },
  topFiber: { ar: 'أعلى الأطعمة بالألياف', de: 'Ballaststoffreichste Lebensmittel' },
  topVitC: { ar: 'أغنى بفيتامين سي', de: 'Vitamin-C-reichste' },
  topIron: { ar: 'أغنى بالحديد', de: 'Eisenreichste' },
  topCalcium: { ar: 'أغنى بالكالسيوم', de: 'Kalziumreichste' },
  topMagnesium: { ar: 'أغنى بالمغنيسيوم', de: 'Magnesiumreichste' },
  score: { ar: 'نقاط', de: 'Punkte' },
  per100g: { ar: 'لكل 100غ', de: 'pro 100g' },
};

interface InsightSection {
  key: string;
  title: { ar: string; de: string };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  foods: NutritionFoodItem[];
  metric: (f: NutritionFoodItem) => string;
}

export default function NutritionInsights() {
  const { language } = useApp();
  const lang: Lang = language === 'ar' ? 'ar' : 'de';

  const sections: InsightSection[] = useMemo(
    () => [
      {
        key: 'dense',
        title: T.topNutrient,
        icon: Award,
        color: '#f59e0b',
        foods: mostNutrientDense(8) as NutritionFoodItem[],
        metric: (f) => `${Math.round(f.nutrition.kcal)} kcal`,
      },
      {
        key: 'protein',
        title: T.topProtein,
        icon: Dumbbell,
        color: '#ef4444',
        foods: bestProteinSources(8),
        metric: (f) => `${f.nutrition.protein}g P`,
      },
      {
        key: 'fiber',
        title: T.topFiber,
        icon: Leaf,
        color: '#22c55e',
        foods: highestFiberFoods(8),
        metric: (f) => `${f.nutrition.fiber}g`,
      },
      {
        key: 'vitC',
        title: T.topVitC,
        icon: Shield,
        color: '#f97316',
        foods: foodsHighInVitamin('vitC', 8),
        metric: (f) => `${f.nutrition.vitamins.vitC || 0}mg`,
      },
      {
        key: 'iron',
        title: T.topIron,
        icon: Zap,
        color: '#dc2626',
        foods: foodsHighInMineral('iron', 8),
        metric: (f) => `${f.nutrition.minerals.iron || 0}mg`,
      },
      {
        key: 'calcium',
        title: T.topCalcium,
        icon: Star,
        color: '#0ea5e9',
        foods: foodsHighInMineral('calcium', 8),
        metric: (f) => `${f.nutrition.minerals.calcium || 0}mg`,
      },
      {
        key: 'magnesium',
        title: T.topMagnesium,
        icon: Brain,
        color: '#8b5cf6',
        foods: foodsHighInMineral('magnesium', 8),
        metric: (f) => `${f.nutrition.minerals.magnesium || 0}mg`,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2 rounded-xl p-3 border border-purple-500/20">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <div>
          <p className="text-[11px] text-muted-foreground">{T.title[lang]}</p>
          <p className="text-xs font-bold text-foreground">
            {lang === 'ar'
              ? `تحليل ${TOTAL_FOOD_COUNT} عنصر غذائي`
              : `Analyse von ${TOTAL_FOOD_COUNT} Lebensmitteln`}
          </p>
        </div>
      </div>

      {/* Insight sections */}
      {sections.map(({ key, title, icon: Icon, color, foods, metric }) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sections.indexOf(sections.find((s) => s.key === key)!) * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-3 h-3" {...({ style: { color } } as any)} />
            </div>
            <h3 className="text-xs font-semibold text-foreground">{title[lang]}</h3>
          </div>

          <div className="space-y-1">
            {foods.map((food, i) => (
              <div
                key={food.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">
                  {i + 1}
                </span>
                <span className="text-sm">{food.emoji}</span>
                <span className="text-[11px] font-medium text-foreground flex-1 truncate">
                  {food.name[lang]}
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: `${color}10`, color }}
                >
                  {metric(food)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
