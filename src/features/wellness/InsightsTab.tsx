import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import { useApp } from '@/contexts/AppContext';
import { Activity, AlertTriangle, Clock,Info, ShieldCheck, Sparkles, Utensils } from '@/lib/icons';

import { withAlpha } from './premium/surfaces';
import StackAdvisor from './StackAdvisor';
import { type Insight,runAllInsights } from './wellnessAnalysis';
import { DISCLAIMER, type Lang } from './wellnessData';
import type { DietLog, IntakeLog, SkinHairLog, Supplement } from './wellnessDb';

interface Props {
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  dietLogs: DietLog[];
  skinHair: SkinHairLog[];
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const KIND_ICON: Record<Insight['kind'], any> = {
  interaction: AlertTriangle,
  timing: Clock,
  overlap: Utensils,
  gap: Utensils,
  correlation: Sparkles,
  synergy: Sparkles,
  habit: Activity,
};

const KIND_LABEL: Record<Insight['kind'], Record<Lang, string>> = {
  interaction: { ar: 'تفاعل', },
  timing: { ar: 'توقيت', },
  overlap: { ar: 'تداخل مع التغذية', },
  gap: { ar: 'نقص محتمل', },
  correlation: { ar: 'ارتباط', },
  synergy: { ar: 'تركيبة فعّالة', },
  habit: { ar: 'عادة', },
};

export default function InsightsTab({
  supplements,
  intakeLogs,
  dietLogs,
  skinHair,
}: Props) {
  const { language } = useApp();
  const lang = language as Lang;

  const insights = useMemo(
    () => runAllInsights({ supplements, intakeLogs, dietLogs, skinHair }),
    [supplements, intakeLogs, dietLogs, skinHair],
  );

  const grouped = useMemo(() => {
    const map = new Map<Insight['kind'], Insight[]>();
    for (const ins of insights) {
      const arr = map.get(ins.kind) ?? [];
      arr.push(ins);
      map.set(ins.kind, arr);
    }
    return Array.from(map.entries());
  }, [insights]);

  return (
    <div className="space-y-5">
      {/* Stack Advisor — the heart of the integration */}
      <motion.div variants={item} initial="hidden" animate="show">
        <StackAdvisor supplements={supplements} />
      </motion.div>

      {/* Privacy banner */}
      <motion.div variants={item} initial="hidden" animate="show">
        <AppCard className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div>
              <h3 className="text-meta font-bold text-foreground">
                {'خصوصيتك محفوظة'}
              </h3>
              <p className="text-mini text-muted-foreground mt-0.5 leading-relaxed">
                {'كل البيانات محفوظة على جهازك فقط. لا شيء يُرسل لأي خادم.'}
              </p>
            </div>
          </div>
        </AppCard>
      </motion.div>

      {/* Empty state */}
      {insights.length === 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <StateView
            kind="empty"
            title="لا توجد ملاحظات بعد"
            body="أضف مكملاتك وسجل بعض الوجبات لترى تحليلاً مبنياً على بياناتك."
          />
        </motion.div>
      )}

      {/* Insights grouped by kind */}
      {grouped.map(([kind, list]) => {
        const Icon = KIND_ICON[kind];
        return (
          <motion.div
            key={kind}
            variants={item}
            initial="hidden"
            animate="show"
            className="space-y-1"
          >
            <p className="text-micro font-semibold text-muted-foreground-subtle uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {KIND_LABEL[kind][lang]}
            </p>
            <div className="space-y-2">
              {list.map((ins) => {
                const isWarn = ins.severity === 'warn';
                const accent = isWarn ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';
                return (
                  <AppCard
                    key={ins.id}
                    className="p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: withAlpha(accent, 0.16), color: accent }}
                      >
                        {isWarn ? <AlertTriangle className="w-4 h-4" aria-hidden /> : <Info className="w-4 h-4" aria-hidden />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-mini font-bold text-foreground">
                          {ins.title[lang]}
                        </h4>
                        <p className="text-mini text-muted-foreground leading-relaxed mt-0.5">
                          {ins.message[lang]}
                        </p>
                      </div>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Disclaimer */}
      <motion.div variants={item} initial="hidden" animate="show">
        <AppCard className="p-3.5">
          <p className="text-micro text-muted-foreground leading-relaxed">
            <AlertTriangle className="inline w-3.5 h-3.5 me-1 text-muted-foreground-subtle" aria-hidden />
            {DISCLAIMER[lang]}
          </p>
        </AppCard>
      </motion.div>
    </div>
  );
}
