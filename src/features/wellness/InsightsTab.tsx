import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, ShieldCheck, Sparkles, Utensils, Activity, Clock } from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';
import { DISCLAIMER, type Lang } from './wellnessData';
import { runAllInsights, type Insight } from './wellnessAnalysis';
import type { DietLog, IntakeLog, SkinHairLog, Supplement } from './wellnessDb';
import StackAdvisor from './StackAdvisor';
import { SoftSurface, withAlpha } from './premium/surfaces';

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
  const isAr = lang === 'ar';

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
        <SoftSurface accent="hsl(var(--primary))" variant="mesh" intensity={0.65} className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {'خصوصيتك محفوظة'}
              </h3>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                {'كل البيانات محفوظة على جهازك فقط. لا شيء يُرسل لأي خادم.'}
              </p>
            </div>
          </div>
        </SoftSurface>
      </motion.div>

      {/* Empty state */}
      {insights.length === 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <SoftSurface variant="flat" className="p-8 border-dashed">
            <div className="text-center">
              <Info className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {'لا توجد ملاحظات بعد. أضف مكملاتك وسجل بعض الوجبات لترى تحليلاً.'}
              </p>
            </div>
          </SoftSurface>
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
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {KIND_LABEL[kind][lang]}
            </p>
            <div className="space-y-2">
              {list.map((ins) => {
                const isWarn = ins.severity === 'warn';
                const accent = isWarn ? '#ef4444' : 'hsl(var(--primary))';
                return (
                  <SoftSurface
                    key={ins.id}
                    accent={accent}
                    variant="mesh"
                    intensity={isWarn ? 0.9 : 0.5}
                    className="p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: withAlpha(accent, 0.16), color: accent }}
                      >
                        {isWarn ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-bold text-foreground">
                          {ins.title[lang]}
                        </h4>
                        <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                          {ins.message[lang]}
                        </p>
                      </div>
                    </div>
                  </SoftSurface>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Disclaimer */}
      <motion.div variants={item} initial="hidden" animate="show">
        <SoftSurface variant="flat" className="p-3.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <AlertTriangle className="inline w-3.5 h-3.5 me-1 text-muted-foreground/60" />
            {DISCLAIMER[lang]}
          </p>
        </SoftSurface>
      </motion.div>
    </div>
  );
}
