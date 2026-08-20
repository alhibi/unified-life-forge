import { motion } from 'framer-motion';
import React, { useState } from 'react';

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
      <div className="surface-depth rounded-2xl p-4 ring-1 ring-emerald-500/20 bg-emerald-500/[0.03] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-meta font-bold text-foreground">الملف الشخصي مكتمل بالكامل (100%)</h3>
          <p className="text-micro text-muted-foreground mt-0.5">
            تهانينا! هويتك الرقمية موثقة ومتألقة بجميع التفاصيل.
          </p>
        </div>
      </div>
    );
  }

  const missingItems = metrics.items.filter((item) => !item.isCompleted);

  return (
    <div className="surface-depth rounded-2xl p-4 space-y-3 transition-all">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-meta font-extrabold text-primary">{metrics.percentage}%</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-meta font-bold text-foreground">مستوى اكتمال الملف الشخصي</h3>
              <span className="text-micro px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {metrics.completedCount}/{metrics.totalCount} خطوات
              </span>
            </div>
            <p className="text-micro text-muted-foreground mt-0.5">
              أضف التفاصيل المتبقية لرفع مستوى توثيق حسابك في المنصة.
            </p>
          </div>
        </div>

        <button
          className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="عرض التفاصيل"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
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
                <button
                  onClick={() => onActionClick(item.actionTab!, item.fieldKey)}
                  className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-micro font-bold hover:bg-primary/20 transition-colors active:scale-95"
                >
                  إكمال الآن
                </button>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
