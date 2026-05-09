import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, ShieldCheck, Sparkles, Utensils, Activity, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { DISCLAIMER, type Lang } from './wellnessData';
import { runAllInsights, type Insight } from './wellnessAnalysis';
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
  habit: Activity,
};

const KIND_LABEL: Record<Insight['kind'], Record<Lang, string>> = {
  interaction: { ar: 'تفاعل', de: 'Wechselwirkung' },
  timing: { ar: 'توقيت', de: 'Timing' },
  overlap: { ar: 'تداخل مع التغذية', de: 'Ernährungsüberschneidung' },
  gap: { ar: 'نقص محتمل', de: 'Möglicher Mangel' },
  correlation: { ar: 'ارتباط', de: 'Korrelation' },
  habit: { ar: 'عادة', de: 'Gewohnheit' },
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
      {/* Privacy banner */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {isAr ? 'خصوصيتك محفوظة' : 'Deine Privatsphäre'}
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
              {isAr
                ? 'كل البيانات محفوظة على جهازك فقط. لا شيء يُرسل لأي خادم.'
                : 'Alle Daten bleiben nur auf deinem Gerät. Nichts wird an Server gesendet.'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Empty state */}
      {insights.length === 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-8 text-center">
            <Info className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'لا توجد ملاحظات بعد. أضف مكملاتك وسجل بعض الوجبات لترى تحليلاً.'
                : 'Noch keine Hinweise. Füge Supplemente und Mahlzeiten hinzu.'}
            </p>
          </div>
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
                return (
                  <div
                    key={ins.id}
                    className={`rounded-2xl border p-3.5 ${
                      isWarn
                        ? 'bg-destructive/5 border-destructive/30'
                        : 'bg-card border-border/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isWarn ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'
                        }`}
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
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Disclaimer */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-muted/40 border border-border/40 rounded-2xl p-3.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <AlertTriangle className="inline w-3.5 h-3.5 me-1 text-muted-foreground/60" />
            {DISCLAIMER[lang]}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
