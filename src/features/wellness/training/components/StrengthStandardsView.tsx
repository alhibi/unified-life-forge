/**
 * Strength Standards page.
 *
 * Shows the user's current 1RM (estimated from their workout history) for
 * each big lift, classified into a tier (untrained → elite). The tier card
 * shows the next-tier target weight.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, ChevronRight, Trophy } from '@/lib/icons';
import {
  classifyLift,
  LEVEL_COLORS,
  LEVEL_LABELS,
  STRENGTH_LEVELS,
  listStandardsExercises,
  powerliftingTotal,
} from '../strengthStandards';
import { wilks } from '../progressionEngine';
import { bestsByExercise } from '../prDetector';
import type { AthleteProfile, WorkoutSession } from '../../wellnessDb';
import { EXERCISES } from '../../exerciseCatalog';

export interface StrengthStandardsViewProps {
  workouts: WorkoutSession[];
  profile: AthleteProfile | null;
  lang: 'ar';
  className?: string;
}

const T = {
  title: { ar: 'معايير القوة', },
  noProfile: { ar: 'حدد جنسك ووزنك في الملف لتصنيف قوتك.', },
  noData: { ar: 'لا أرقام قياسية بعد.', },
  next: { ar: 'الهدف التالي', },
  total: { ar: 'الإجمالي الباور', },
  wilks: { ar: 'Wilks', },
  per_lift: { ar: 'لكل تمرين', },
  ratio: { ar: 'النسبة', },
};

export default function StrengthStandardsView({
  workouts,
  profile,
  lang,
  className = '',
}: StrengthStandardsViewProps) {
  const bests = useMemo(() => bestsByExercise(workouts), [workouts]);
  const standardsKeys = listStandardsExercises();

  const rows = useMemo(() => {
    if (!profile?.weightKg) return [];
    return standardsKeys
      .map((key) => {
        const b = bests.get(key);
        if (!b || b.maxE1rm <= 0) return null;
        const cls = classifyLift({
          exerciseKey: key,
          oneRmKg: b.maxE1rm,
          bodyweightKg: profile.weightKg!,
          sex: profile.sex,
        });
        if (!cls) return null;
        const def = EXERCISES[key];
        return { key, def, e1rm: b.maxE1rm, ...cls };
      })
      .filter(Boolean) as {
        key: string;
        def: typeof EXERCISES[string];
        e1rm: number;
        level: typeof STRENGTH_LEVELS[number];
        ratio: number;
        nextTargetKg: number | null;
        nextLevel: typeof STRENGTH_LEVELS[number] | null;
        eliteTargetKg: number;
      }[];
  }, [bests, profile, standardsKeys]);

  const total = useMemo(() => {
    if (!profile?.weightKg) return null;
    const sq = bests.get('squat')?.maxE1rm ?? 0;
    const bp = bests.get('bench')?.maxE1rm ?? 0;
    const dl = bests.get('deadlift')?.maxE1rm ?? 0;
 if (sq <= 0 || bp <= 0 || dl <= 0) return null;
 const t = powerliftingTotal({
 squat: sq, bench: bp, deadlift: dl, bodyweightKg: profile.weightKg, sex: profile.sex,
 });
 const w = wilks(t.total, profile.weightKg, profile.sex);
 return { ...t, wilks: w };
 }, [bests, profile]);

 if (!profile?.weightKg) {
 return (
 <div className={`bg-card border border-border/40 rounded-2xl p-6 text-center ${className}`}>
 <Award className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
 <p className="text-[12px] text-muted-foreground">{T.noProfile[lang]}</p>
 </div>
 );
 }

 return (
 <div className={`space-y-3 ${className}`}>
 {/* Powerlifting total card */}
 {total && (
 <motion.div
 initial={{ y: 10, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 className="rounded-2xl p-4 border border-amber-500/30"
 >
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">{T.total[lang]}</p>
 <p className="text-[24px] font-bold tabular-nums text-foreground" dir="ltr">{total.total} kg</p>
 </div>
 <div className="text-end">
 <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">{T.wilks[lang]}</p>
 <p className="text-[18px] font-bold tabular-nums text-foreground" dir="ltr">{total.wilks ?? '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {total.perLift.map((p) => (
              <div key={p.exerciseKey} className="bg-white/60 dark:bg-white/5 rounded-lg p-1.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
                  {p.exerciseKey === 'squat' ? ('سكوات') : p.exerciseKey === 'bench' ? ('بنش') : ('ديدليفت')}
                </p>
                <p className="text-[14px] font-bold tabular-nums text-foreground" dir="ltr">{p.oneRm}</p>
                <p className="text-[10px] font-bold uppercase" style={{ color: LEVEL_COLORS[p.level] }}>
                  {LEVEL_LABELS[p.level][lang]}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Per-lift cards */}
      {rows.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-2xl p-6 text-center">
          <Trophy className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">{T.noData[lang]}</p>
        </div>
      ) : (
        rows.map((r, i) => (
          <LiftRow key={r.key} row={r} lang={lang} delay={i * 0.04} />
        ))
      )}
    </div>
  );
}

function LiftRow({
  row,
  lang,
  delay,
}: {
  row: {
    key: string;
    def: typeof EXERCISES[string];
    e1rm: number;
    level: typeof STRENGTH_LEVELS[number];
    ratio: number;
    nextTargetKg: number | null;
    nextLevel: typeof STRENGTH_LEVELS[number] | null;
    eliteTargetKg: number;
  };
  lang: 'ar';
  delay: number;
}) {
  const color = LEVEL_COLORS[row.level];
  const idx = STRENGTH_LEVELS.indexOf(row.level);
  const pct = ((idx + 1) / STRENGTH_LEVELS.length) * 100;
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="bg-card border border-border/40 rounded-2xl p-3 space-y-2"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold text-foreground">{row.def?.label[lang]}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">{T.ratio[lang]}: ×{row.ratio}</p>
        </div>
        <div className="text-end">
          <p className="text-[18px] font-bold tabular-nums text-foreground" dir="ltr">{row.e1rm} kg</p>
          <p className="text-[10px] font-bold uppercase" style={{ color }}>
            {LEVEL_LABELS[row.level][lang]}
          </p>
        </div>
      </div>

      {/* Tier ladder */}
      <div className="relative h-2.5 rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 start-0 rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: delay + 0.1 }}
        />
        {STRENGTH_LEVELS.slice(1).map((lvl, j) => (
          <div
            key={lvl}
            className="absolute inset-y-0"
            style={{ left: `${((j + 1) / STRENGTH_LEVELS.length) * 100}%`, width: 1, background: 'rgba(255,255,255,0.3)' }}
          />
        ))}
      </div>

      {row.nextTargetKg && row.nextLevel && (
        <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1" dir="ltr">
          <ChevronRight className="w-3 h-3" />
          {T.next[lang]}: <span className="font-bold tabular-nums text-foreground">{row.nextTargetKg} kg</span>
          <span style={{ color: LEVEL_COLORS[row.nextLevel] }}>{LEVEL_LABELS[row.nextLevel][lang]}</span>
        </p>
      )}
    </motion.div>
  );
}
