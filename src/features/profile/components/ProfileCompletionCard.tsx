import { motion } from 'framer-motion';
import React, { useState } from 'react';

import { AppCard, IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, Circle, Sparkles } from '@/lib/icons';

import { ProfileCompletionMetrics } from '../types';

export interface ProfileCompletionCardProps {
  metrics: ProfileCompletionMetrics;
  onActionClick: (tab: string, fieldKey?: string) => void;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  metrics,
  onActionClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (metrics.percentage >= 100) {
    return (
      <AppCard className="flex items-center gap-3">
        <IconChip tone="success" aria-hidden>
          <Sparkles className="h-5 w-5" />
        </IconChip>
        <div className="min-w-0 flex-1">
          <h3 className="text-meta font-bold text-foreground">الملف الشخصي مكتمل بالكامل (100%)</h3>
          <p className="text-micro text-muted-foreground mt-0.5">
            تهانينا! هويتك الرقمية موثقة ومتألقة بجميع التفاصيل.
          </p>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <IconChip aria-hidden>
            <span className="text-meta font-extrabold">{metrics.percentage}%</span>
          </IconChip>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-meta font-bold text-foreground">مستوى اكتمال الملف الشخصي</h3>
              <span className="text-micro px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold tabular-nums">
                {metrics.completedCount}/{metrics.totalCount} خطوات
              </span>
            </div>
            <p className="text-micro text-muted-foreground mt-0.5">
              أضف التفاصيل المتبقية لرفع مستوى توثيق حسابك في المنصة.
            </p>
          </div>
        </div>

        <button
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="عرض التفاصيل"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-fast ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
        <motion.div
          className="bg-primary h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${metrics.percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Expanded Checklist */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pt-2 border-t border-border/40 space-y-2"
        >
          {metrics.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {item.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                )}
                <span
                  className={`text-mini font-medium ${
                    item.isCompleted
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {item.labelAr}
                </span>
              </div>

              {!item.isCompleted && item.actionTab && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => onActionClick(item.actionTab!, item.fieldKey)}
                >
                  إكمال الآن
                </Button>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </AppCard>
  );
};
