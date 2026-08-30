/**
 * Profile Insights Panel — Deep Enhanced Visual Design
 * ----------------------------------------------------
 * Luxury dark analytics panel with animated confidence rings,
 * staggered motion entry, refined typography, and deep shadow layers.
 */
import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import {
  Activity, ArrowRight, Brain, Lightbulb, Settings,
  Target, TrendingUp, Users, Zap,
  Flame, Compass, Trophy, Sparkles
} from '@/lib/icons';

import { CrossModuleInsight, generateCrossModuleInsights } from '../lib/badgeStore';
import { ProfileCompletionMetrics } from '../lib/profileCompletionEngine';
import { ProfileActivitySummary, ProfileBadge } from '../types';

interface ProfileInsightsPanelProps {
  summary: ProfileActivitySummary;
  badges: ProfileBadge[];
  completionMetrics: ProfileCompletionMetrics;
  onActionClick?: (tab: string) => void;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  correlation: Brain,
  pattern: TrendingUp,
  recommendation: Lightbulb,
  milestone: Target,
};

const TYPE_STYLES: Record<string, { color: string; bg: string; border: string; labelAr: string; glow: string }> = {
  correlation: { color: 'text-violet-300', bg: 'bg-violet-500/[0.06]', border: 'border-violet-400/15', labelAr: 'ارتباط', glow: 'shadow-violet-900/10' },
  pattern: { color: 'text-sky-300', bg: 'bg-sky-500/[0.06]', border: 'border-sky-400/15', labelAr: 'نمط', glow: 'shadow-sky-900/10' },
  recommendation: { color: 'text-amber-300', bg: 'bg-amber-500/[0.06]', border: 'border-amber-400/15', labelAr: 'توصية', glow: 'shadow-amber-900/10' },
  milestone: { color: 'text-emerald-300', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-400/15', labelAr: 'معلم', glow: 'shadow-emerald-900/10' },
};

const CATEGORY_ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  identity: Settings,
  activity: Activity,
  customization: Zap,
  social: Users,
};

function renderTypeIcon(type: CrossModuleInsight['type']) {
  const IconComponent = TYPE_ICONS[type] || Brain;
  const style = TYPE_STYLES[type] || TYPE_STYLES.correlation;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.6rem] font-extrabold ${style.color} ${style.bg} border ${style.border} backdrop-blur-sm`}>
      <IconComponent className="w-3 h-3" />
      <span>{style.labelAr}</span>
    </span>
  );
}

function renderCategoryIcon(tab: string) {
  const Component = CATEGORY_ICON_COMPONENTS[tab] || Settings;
  return <Component className="w-3.5 h-3.5 text-muted-foreground/70" />;
}

/* Custom decorative icons for different insight themes */
const DECOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  correlation: Compass,
  pattern: Flame,
  recommendation: Sparkles,
  milestone: Trophy,
};

export function ProfileInsightsPanel({
  summary,
  badges,
  completionMetrics,
  onActionClick,
  className = '',
}: ProfileInsightsPanelProps) {
  const insights = useMemo(
    () => generateCrossModuleInsights(summary, badges, completionMetrics),
    [summary, badges, completionMetrics.byCategory]
  );

  if (insights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`surface-depth rounded-[1.75rem] p-7 md:p-8 text-center overflow-hidden relative ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-4 py-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 flex items-center justify-center shadow-inner ring-1 ring-violet-400/10">
            <Lightbulb className="w-8 h-8 text-violet-300/50" />
          </div>
          <div>
            <h3 className="text-[1.05rem] font-extrabold text-foreground mb-1.5 tracking-tight">لا توجد رؤى متاحة حالياً</h3>
            <p className="text-[0.75rem] text-muted-foreground font-medium">استمر في بناء نشاطك عبر الوحدات المختلفة — الرؤى الذكية ستظهر مع ازدياد البيانات</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`surface-depth rounded-[1.75rem] p-6 md:p-7 overflow-hidden relative ${className}`}
    >
      {/* Subtle ambient gradient */}
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-gradient-to-br from-violet-400/5 via-transparent to-amber-300/5 blur-3xl -translate-x-1/3 -translate-y-1/2 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 flex items-center justify-center shadow-inner ring-1 ring-violet-400/15 shrink-0">
          <Brain className="w-5 h-5 text-violet-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[1.1rem] font-extrabold text-foreground tracking-tight leading-tight">رؤى ذكية</h2>
          <p className="text-[0.7rem] text-muted-foreground font-medium leading-relaxed">تحليلات وارتباطات من نشاطك عبر الوحدات المختلفة</p>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3 relative z-10">
        {insights.map((insight: CrossModuleInsight, index: number) => {
          const style = TYPE_STYLES[insight.type] || TYPE_STYLES.correlation;
          const DecorIcon = DECOR_ICONS[insight.type] || Brain;
          return (
            <motion.div
              key={`${insight.type}-${index}-${insight.titleAr}`}
              initial={{ opacity: 0, x: -24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                delay: index * 0.08,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`group relative p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 ${style.bg} ${style.border}`}
              onClick={() => insight.actionable && onActionClick?.(insight.actionTab || 'overview')}
              style={{ cursor: insight.actionable && onActionClick ? 'pointer' : 'default' }}
            >
              {/* Top-right decorative icon */}
              <DecorIcon className="absolute top-4 end-4 w-10 h-10 text-white/[0.03] rotate-[12deg]" />

              {/* Type badge */}
              <div className="absolute top-4 start-4">
                {renderTypeIcon(insight.type)}
              </div>

              {/* Main content */}
              <div className="flex gap-4 mt-10">
                {/* Confidence ring */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative w-14 h-14">
                    {/* Background ring */}
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle
                        cx="28" cy="28" r="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        className="text-white/[0.06]"
                      />
                    </svg>
                    {/* Progress ring */}
                    <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle
                        cx="28" cy="28" r="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={`${insight.confidence * 100} 100`}
                        className="text-violet-300 transition-all duration-700 ease-out"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[0.75rem] font-extrabold text-foreground tracking-tight">
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                  <span className="text-[0.55rem] text-muted-foreground/50 font-medium">ثقة التحليل</span>
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <h4 className="text-[0.9rem] font-extrabold text-foreground tracking-tight leading-snug">
                      {insight.titleAr}
                    </h4>
                    {insight.actionable && onActionClick && (
                      <span className="flex items-center gap-1 text-[0.6rem] font-extrabold text-violet-300/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 whitespace-nowrap">
                        <ArrowRight className="w-3 h-3 rotate-180" />
                        عرض
                      </span>
                    )}
                  </div>

                  <p className="text-[0.73rem] text-muted-foreground/80 font-medium leading-[1.7] mb-3">
                    {insight.descriptionAr}
                  </p>

                  {/* Related badges */}
                  {insight.relatedBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {insight.relatedBadges.slice(0, 4).map((badgeId: string) => (
                        <span
                          key={badgeId}
                          className="px-2 py-0.5 rounded-full text-[0.58rem] font-bold bg-white/[0.04] border border-white/[0.08] text-muted-foreground/70"
                        >
                          {badgeId.replace('badge_', '').replace(/_/g, ' ')}
                        </span>
                      ))}
                      {insight.relatedBadges.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full text-[0.58rem] font-bold bg-white/[0.03] border border-white/[0.06] text-muted-foreground/40">
                          +{insight.relatedBadges.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action hint */}
                  {insight.actionable && insight.actionTab && (
                    <div className="flex items-center gap-2 text-[0.6rem] text-muted-foreground/40 font-medium">
                      {renderCategoryIcon(insight.actionTab)}
                      <span>انتقل إلى تبويب: <span className="text-muted-foreground/60 font-bold">{insight.actionTab}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
