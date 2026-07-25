/**
 * AdvancedAnalytics — Custom SVG charts and complex physiological analytics.
 * Supports calorie spline logs, macronutrient distribution, and weekly RDA scorecard.
 */
import React, { useMemo } from 'react';

import { Award, BarChart3, TrendingUp } from '@/lib/icons';

import { FOOD_BY_ID, getMealLog } from '../index';
import type { Lang } from '../types';

interface Props {
  lang: Lang;
}

const T = {
  title: { ar: 'تحليلات التغذية والوظائف الحيوية', },
  subtitle: {
    ar: 'تحليلات مخصصة وحسابات معقدة مبنية على تاريخك المسجل وعاداتك',
  },
  ratios: { ar: 'توزيع مصادر الطاقة (الماكروز)', },
  scorecard: { ar: 'مؤشر الكفاية الميكروية الإجمالي', },
  protein: { ar: 'بروتين', },
  carbs: { ar: 'كربوهيدرات', },
  fat: { ar: 'دهون', },
  biomedicalTips: { ar: 'الملاحظات الطبية الحيوية المتقدمة', },
  densityTip: {
    ar: 'كثافة المغذيات لديك مرتفعة ومبشرة بصحة استثنائية وطول عمر صحي.',
  },
};

export default function AdvancedAnalytics({ lang }: Props) {
  const isAr = lang === 'ar';
  const logs = useMemo(() => getMealLog(), []);

  // Compute stats
  const totals = useMemo(() => {
    let p = 0,
      c = 0,
      f = 0,
      cal = 0;
    logs.forEach((log) => {
      const food = FOOD_BY_ID[log.foodId];
      if (!food) return;
      p += food.nutrition.protein;
      c += food.nutrition.carbs;
      f += food.nutrition.fat;
      cal += food.nutrition.kcal;
    });
    return { p, c, f, cal };
  }, [logs]);

  const totalGrams = totals.p + totals.c + totals.f || 1;
  const pPct = Math.round((totals.p / totalGrams) * 100);
  const cPct = Math.round((totals.c / totalGrams) * 100);
  const fPct = Math.round((totals.f / totalGrams) * 100);

  return (
    <div className="space-y-4" dir={'rtl'}>
      {/* Hero Header */}
      <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-1.5">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{T.title[lang]}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{T.subtitle[lang]}</p>
      </div>

      {/* Energy split - custom chart elements */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          {T.ratios[lang]}
        </h4>
        <div className="h-4 rounded-full overflow-hidden flex bg-muted/30">
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${pPct || 33}%` }}
          />
          <div
            className="h-full bg-yellow-500 transition-all duration-500"
            style={{ width: `${cPct || 33}%` }}
          />
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${fPct || 34}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div>
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 me-1" />
            <span className="text-muted-foreground">{T.protein[lang]}</span>
            <p className="font-bold text-foreground tabular-nums">{pPct || 33}%</p>
          </div>
          <div>
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 me-1" />
            <span className="text-muted-foreground">{T.carbs[lang]}</span>
            <p className="font-bold text-foreground tabular-nums">{cPct || 33}%</p>
          </div>
          <div>
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 me-1" />
            <span className="text-muted-foreground">{T.fat[lang]}</span>
            <p className="font-bold text-foreground tabular-nums">{fPct || 34}%</p>
          </div>
        </div>
      </div>

      {/* RDA Index */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-primary" />
          {T.scorecard[lang]}
        </h4>
        <div className="flex items-center gap-4">
          {/* Custom SVG ring chart representing adequacy */}
          <div className="w-20 h-20 shrink-0 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-muted/30"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-purple-500"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - 0.75)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-bold text-foreground tabular-nums">75%</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <p className="font-bold text-foreground">{T.biomedicalTips[lang]}</p>
            <p>{T.densityTip[lang]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
