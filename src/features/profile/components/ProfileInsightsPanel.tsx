/**
 * Profile Insights Panel — cross-module insight cards.
 *
 * Was a "luxury dark analytics panel": glow rings, gradient washes,
 * blur-3xl ambience and drop-shadow filters. Now each insight is a flat
 * card; the insight *type* stays a documented colour key (data-* tokens),
 * and the confidence ring still encodes the real percentage it always did.
 */
import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import { AppCard, IconChip } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import {
  Activity,
  ArrowRight,
  Brain,
  Lightbulb,
  Settings,
  Target,
  TrendingUp,
  Users,
  Zap,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

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

/** Insight type colour key — data-* tokens label the category, not decor. */
const TYPE_STYLES: Record<string, { color: string; bg: string; border: string; labelAr: string }> = {
  correlation: { color: 'text-data-6', bg: 'bg-data-6/10', border: 'border-data-6/20', labelAr: 'ارتباط' },
  pattern: { color: 'text-data-4', bg: 'bg-data-4/10', border: 'border-data-4/20', labelAr: 'نمط' },
  recommendation: { color: 'text-signal', bg: 'bg-signal/10', border: 'border-signal/20', labelAr: 'توصية' },
  milestone: { color: 'text-data-1', bg: 'bg-data-1/10', border: 'border-data-1/20', labelAr: 'معلم' },
};

const CATEGORY_ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  identity: Settings,
  activity: Activity,
  customization: Zap,
  social: Users,
};

function renderCategoryIcon(tab: string) {
  const Component = CATEGORY_ICON_COMPONENTS[tab] || Settings;
  return <Component className="w-3.5 h-3.5 text-muted-foreground-subtle" aria-hidden />;
}

export function ProfileInsightsPanel({
  summary,
  badges,
  completionMetrics,
  onActionClick,
  className = '',
}: ProfileInsightsPanelProps) {
  const insights = useMemo(
    () => generateCrossModuleInsights(summary, badges, completionMetrics),
    [summary, badges, completionMetrics]
  );

  if (insights.length === 0) {
    return (
      <StateView
        kind="empty"
        title="لا توجد رؤى متاحة حالياً"
        body="استمر في بناء نشاطك عبر الوحدات المختلفة — الرؤى الذكية ستظهر مع ازدياد البيانات"
        className={className}
      />
    );
  }

  return (
    <AppCard className={cn('space-y-5', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <IconChip aria-hidden>
          <Brain className="w-5 h-5" />
        </IconChip>
        <div className="min-w-0">
          <h2 className="text-title font-bold text-foreground">رؤى ذكية</h2>
          <p className="text-mini text-muted-foreground">تحليلات وارتباطات من نشاطك عبر الوحدات المختلفة</p>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((insight: CrossModuleInsight, index: number) => {
          const style = TYPE_STYLES[insight.type] || TYPE_STYLES.correlation;
          const TypeIcon = TYPE_ICONS[insight.type] || Brain;
          const actionable = Boolean(insight.actionable && onActionClick);
          return (
            <motion.div
              key={`${insight.type}-${index}-${insight.titleAr}`}
              initial={{ opacity: 0, x: -24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <AppCard
                flat
                pressable={actionable}
                onClick={actionable ? () => onActionClick?.(insight.actionTab || 'overview') : undefined}
                className={cn('group relative space-y-3', actionable && 'cursor-pointer')}
              >
                {/* Type badge */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-micro font-extrabold border ${style.color} ${style.bg} ${style.border}`}
                  >
                    <TypeIcon className="w-3 h-3" aria-hidden />
                    <span>{style.labelAr}</span>
                  </span>

                  {actionable && (
                    <span className="flex items-center gap-1 text-micro font-extrabold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-fast shrink-0 whitespace-nowrap">
                      <ArrowRight className="w-3 h-3 rotate-180" aria-hidden />
                      عرض
                    </span>
                  )}
                </div>

                {/* Main content */}
                <div className="flex gap-4">
                  {/* Confidence ring — encodes the analysis confidence percentage */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
                        <circle
                          cx="28" cy="28" r="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          className="text-track"
                        />
                      </svg>
                      <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
                        <circle
                          cx="28" cy="28" r="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeDasharray={`${insight.confidence * 100} 100`}
                          className="text-primary transition-motion duration-slow ease-enter"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-mini font-extrabold text-foreground tabular-nums">
                        {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                    <span className="text-micro text-muted-foreground">ثقة التحليل</span>
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h4 className="text-body font-bold text-foreground leading-snug">{insight.titleAr}</h4>

                    <p className="text-mini text-muted-foreground leading-relaxed">
                      {insight.descriptionAr}
                    </p>

                    {/* Related badges */}
                    {insight.relatedBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {insight.relatedBadges.slice(0, 4).map((badgeId: string) => (
                          <span
                            key={badgeId}
                            className="px-2 py-0.5 rounded-full text-micro font-bold bg-secondary text-muted-foreground"
                          >
                            {badgeId.replace('badge_', '').replace(/_/g, ' ')}
                          </span>
                        ))}
                        {insight.relatedBadges.length > 4 && (
                          <span className="px-2 py-0.5 rounded-full text-micro font-bold bg-secondary text-muted-foreground">
                            +{insight.relatedBadges.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action hint */}
                    {insight.actionable && insight.actionTab && (
                      <div className="flex items-center gap-2 text-micro text-muted-foreground">
                        {renderCategoryIcon(insight.actionTab)}
                        <span>
                          انتقل إلى تبويب:{' '}
                          <span className="text-foreground font-bold">{insight.actionTab}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </AppCard>
            </motion.div>
          );
        })}
      </div>
    </AppCard>
  );
}
