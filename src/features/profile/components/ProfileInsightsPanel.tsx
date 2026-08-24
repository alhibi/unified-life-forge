/**
 * ProfileInsightsPanel — Displays cross-module analytics and recommendations
 * ---------------------------------------------------------------------------
 * Shows actionable insights generated from badge progress, activity patterns,
 * and profile completion metrics.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  Brain, 
  Zap,
  ArrowRight,
  Clock,
  Award,
  Activity,
  BookOpen,
  Heart,
  Globe,
  Settings,
  Users,
} from '@/lib/icons';
import { ProfileActivitySummary, ProfileBadge } from '../types';
import { ProfileCompletionMetrics } from '../lib/profileCompletionEngine';
import { generateCrossModuleInsights, CrossModuleInsight } from '../lib/badgeStore';

interface ProfileInsightsPanelProps {
  summary: ProfileActivitySummary;
  badges: ProfileBadge[];
  completionMetrics: ProfileCompletionMetrics;
  onActionClick?: (tab: string) => void;
  className?: string;
}

const TYPE_ICONS = {
  correlation: Brain,
  pattern: TrendingUp,
  recommendation: Lightbulb,
  milestone: Target,
};

const TYPE_STYLES = {
  correlation: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', labelAr: 'ارتباط' },
  pattern: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', labelAr: 'نمط' },
  recommendation: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', labelAr: 'توصية' },
  milestone: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', labelAr: 'معلم' },
};

const CATEGORY_ICON_COMPONENTS = {
  identity: Settings,
  activity: Activity,
  customization: Zap,
  social: Users,
};

function renderTypeIcon(type: CrossModuleInsight['type']) {
  const IconComponent = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
  const style = TYPE_STYLES[type as keyof typeof TYPE_STYLES];
  return (
    <>
      <IconComponent className={`w-3.5 h-3.5 ${style.color}`} />
      <span className={`text-[0.625rem] font-bold ${style.color}`}>{style.labelAr}</span>
    </>
  );
}

function renderCategoryIcon(tab: string) {
  const IconComponent = CATEGORY_ICON_COMPONENTS[tab as keyof typeof CATEGORY_ICON_COMPONENTS] || Settings;
  return <IconComponent className="w-3 h-3" />;
}

export function ProfileInsightsPanel({
  summary,
  badges,
  completionMetrics,
  onActionClick,
  className = '',
}: ProfileInsightsPanelProps) {
  const insights = useMemo(() => 
    generateCrossModuleInsights(summary, badges, completionMetrics),
    [summary, badges, completionMetrics.byCategory]
  );

  if (insights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`surface-depth rounded-2xl p-5 ${className}`}
      >
        <div className="flex items-center justify-center py-8">
          <Lightbulb className="w-8 h-8 text-muted-foreground/50" />
          <span className="text-meta text-muted-foreground ms-3">
            لا توجد رؤى متاحة حالياً — استمر في بناء نشاطك
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-depth rounded-2xl p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-meta font-bold text-foreground">رؤى ذكية</h3>
          <p className="text-micro text-muted-foreground">
            تحليلات وارتباطات من نشاطك عبر الوحدات المختلفة
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight: CrossModuleInsight, index: number) => {
          const style = TYPE_STYLES[insight.type];
          return (
            <motion.div
              key={`${insight.type}-${insight.titleAr}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`group relative p-4 rounded-xl border transition-all ${style.bg} ${style.border} hover:border-primary/30 cursor-pointer`}
              onClick={() => insight.actionable && onActionClick?.(insight.actionTab || 'overview')}
            >
              {/* Type Badge */}
              <div className="absolute top-3 end-3 flex items-center gap-1">
                {renderTypeIcon(insight.type)}
              </div>

              {/* Content */}
              <div className="flex gap-3">
                {/* Confidence indicator */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-muted-foreground/20"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray={`${insight.confidence * 100} 100`}
                        strokeLinecap="round"
                        className={`${style.color} transition-all duration-500`}
                        style={{ strokeDasharray: `${insight.confidence * 100} 100` }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-bold text-foreground">
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <h4 className="text-meta font-bold text-foreground flex-1">
                      {insight.titleAr}
                    </h4>
                    {insight.actionable && onActionClick && (
                      <span className="flex items-center gap-1 text-micro text-primary/70 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-3 h-3" />
                        <span>عرض</span>
                      </span>
                    )}
                  </div>
                  <p className="text-micro text-muted-foreground line-clamp-2 mb-2">
                    {insight.descriptionAr}
                  </p>

                  {/* Related badges */}
                  {insight.relatedBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {insight.relatedBadges.slice(0, 3).map((badgeId: string) => (
                        <span
                          key={badgeId}
                          className="px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-muted/50 border border-border/30 text-muted-foreground"
                        >
                          {badgeId.replace('badge_', '')}
                        </span>
                      ))}
                      {insight.relatedBadges.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-muted/50 border border-border/30 text-muted-foreground">
                          +{insight.relatedBadges.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action hint */}
                  {insight.actionable && insight.actionTab && (
                    <div className="flex items-center gap-1.5 text-[0.625rem] text-muted-foreground/70">
                      {renderCategoryIcon(insight.actionTab)}
                      <span>انتقل إلى تبويب: {insight.actionTab}</span>
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