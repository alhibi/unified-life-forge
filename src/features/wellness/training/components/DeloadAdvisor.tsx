/**
 * Deload advisor card.
 *
 * Reads the workout history → ACWR + soreness → recommendation.
 */

import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import { Activity, AlertTriangle,ShieldAlert, Sparkles } from '@/lib/icons';

import type { WorkoutSession } from '../../wellnessDb';
import {
  acwr,
  READINESS_LABEL_COLOR,
  READINESS_LABEL_TEXT,
  readinessLabel,
  shouldDeload,
} from '../periodizationEngine';

export interface DeloadAdvisorProps {
  workouts: WorkoutSession[];
  /** Latest soreness reports (1-5). */
  recentSoreness?: number[];
  /** Optional cycle setting. */
  scheduledEveryWeeks?: number;
  currentWeek?: number;
  lang: 'ar';
  className?: string;
}

const T = {
  ready: { ar: 'الجاهزية', },
  acwr: { ar: 'حمل حاد:مزمن', },
  weekLoad: { ar: 'حمل الأسبوع', },
  trainingDays: { ar: 'أيام متتالية', },
  sweetSpot: { ar: 'منطقة مثالية', },
  caution: { ar: 'يحتاج انتباه', },
  danger: { ar: 'منطقة خطر', },
  ramp: { ar: 'يمكنك زيادة الحمل', },
  noData: { ar: 'لم تسجل تمارين كافية لتقييم الحمل.', },
};

export default function DeloadAdvisor({
  workouts,
  recentSoreness,
  scheduledEveryWeeks,
  currentWeek,
  lang,
  className = '',
}: DeloadAdvisorProps) {
  const advice = useMemo(() => shouldDeload({
    workouts,
    recentSoreness,
    scheduledEveryWeeks,
    currentWeek,
  }), [workouts, recentSoreness, scheduledEveryWeeks, currentWeek]);

  const a = useMemo(() => acwr(workouts), [workouts]);
  const ready = useMemo(() => readinessLabel(workouts), [workouts]);

  if (!a || !ready) {
    return (
      <div className={`bg-card border border-border/40 rounded-2xl p-4 text-center ${className}`}>
        <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-[12px] text-muted-foreground">{T.noData[lang]}</p>
      </div>
    );
  }

  const color = READINESS_LABEL_COLOR[ready];

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`rounded-2xl border p-4 space-y-3 ${className}`}
      style={{
        
        borderColor: `${color}40`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}25` }}>
            {advice.shouldDeload ? <ShieldAlert className="w-4 h-4" style={{ color }} /> : <Sparkles className="w-4 h-4" style={{ color }} />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>
              {T.ready[lang]}
            </p>
            <p className="text-[14px] font-bold leading-tight text-foreground">
              {READINESS_LABEL_TEXT[ready][lang]}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-foreground/85 leading-relaxed">
        {advice.summary[lang]}
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        <Metric label={T.acwr[lang]} value={a.ratio.toFixed(2)} color={color} />
        <Metric label={T.weekLoad[lang]} value={`${advice.metrics.weeklyLoad}`} />
        <Metric label={T.trainingDays[lang]} value={`${advice.metrics.consecutiveDays}`} />
      </div>

      {/* ACWR scale */}
      <div className="space-y-1">
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          {/* Zones */}
          <div className="absolute inset-y-0 start-0" style={{ width: '40%', background: '#94a3b850' }} />
          <div className="absolute inset-y-0" style={{ left: '40%', width: '30%', background: '#10b98150' }} />
          <div className="absolute inset-y-0" style={{ left: '70%', width: '15%', background: '#f59e0b50' }} />
          <div className="absolute inset-y-0" style={{ left: '85%', right: 0, background: '#ef444450' }} />
          {/* Marker */}
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${Math.min(100, (a.ratio / 2.0) * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -translate-x-1/2 -top-0.5 w-3 h-3 rounded-full bg-foreground border-2 border-background"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground/70 tabular-nums" dir="ltr">
          <span>0.0</span>
          <span>0.8</span>
          <span>1.3</span>
          <span>1.5</span>
          <span>2.0</span>
        </div>
      </div>

      {advice.shouldDeload && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
            {`قلّل الحجم إلى ${Math.round(advice.volumeMultiplier * 100)}% والكثافة إلى ${Math.round(advice.intensityMultiplier * 100)}% لمدة أسبوع.`}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</p>
      <p className="text-[14px] font-bold tabular-nums" style={{ color: color ?? 'currentColor' }}>{value}</p>
    </div>
  );
}
