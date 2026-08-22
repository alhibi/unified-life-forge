import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo } from 'react';

import {
  Activity,
  Brain,
  CloudSnow,
  Compass,
  Crown,
  Feather,
  Flame,
  Globe,
  HandHeart,
  Languages,
  ShieldAlert,
  Sparkles,
  Trophy,
} from '@/lib/icons';

import type {
  ModuleStreak,
  StreakRiskLevel,
  StreakSnapshot,
} from '../lib/streakEngine';
import { getModuleLabelAr } from '../lib/streakEngine';

export interface ProfileStreakPanelProps {
  snapshot: StreakSnapshot;
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  visits: Globe,
  spiritual: HandHeart,
  german: Languages,
  fitness: Activity,
  diwan: Feather,
  pkm: Brain,
  atlas: Compass,
};

const RISK_STYLES: Record<
  StreakRiskLevel,
  { ring: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  safe: {
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: Sparkles,
  },
  warning: {
    ring: 'ring-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    icon: ShieldAlert,
  },
  critical: {
    ring: 'ring-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    icon: ShieldAlert,
  },
  frozen: {
    ring: 'ring-sky-500/40',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    icon: CloudSnow,
  },
};

/** Maps a streak length to a flame heat tier (drives glow intensity). */
function flameTier(days: number): number {
  if (days >= 100) return 5;
  if (days >= 30) return 4;
  if (days >= 14) return 3;
  if (days >= 7) return 2;
  if (days >= 3) return 1;
  return 0;
}

const FLAME_GLOW: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-orange-300 drop-shadow-[0_0_6px_rgba(253,186,116,0.35)]',
  2: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.45)]',
  3: 'text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]',
  4: 'text-amber-500 drop-shadow-[0_0_14px_rgba(245,158,11,0.7)]',
  5: 'text-red-400 drop-shadow-[0_0_18px_rgba(248,113,113,0.8)]',
};

function formatMilestoneProgress(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

export const ProfileStreakPanel: React.FC<ProfileStreakPanelProps> = ({ snapshot }) => {
  const { unified, modules, rhythm, bestDay } = snapshot;
  const riskStyle = RISK_STYLES[unified.risk.level];
  const RiskIcon = riskStyle.icon;

  const activeModules = useMemo(
    () => [...modules].sort((a, b) => b.currentStreakDays - a.currentStreakDays),
    [modules]
  );

  const tier = flameTier(unified.currentStreakDays);
  const milestoneProgress = unified.nextMilestone
    ? formatMilestoneProgress(unified.currentStreakDays, unified.nextMilestone.days)
    : 100;

  const maxModuleAvg = Math.max(...rhythm.averagesByDayOfWeek, 0.0001);

  // Week starts on Sunday for Arabic audiences; render Saturday→Sunday RTL.
  const rhythmBars = [6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="space-y-5" dir="rtl">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. Unified Streak Hero Card                                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section
        className={`surface-depth rounded-2xl p-5 relative overflow-hidden ring-1 ${riskStyle.ring}`}
      >
        {/* Ambient flame aura that intensifies with the streak tier */}
        <motion.div
          aria-hidden
          className="absolute -inset-16 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.12), transparent 65%)',
          }}
          animate={{ opacity: [0.35 + tier * 0.08, 0.6 + tier * 0.08, 0.35 + tier * 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Big live flame + count */}
          <div className="flex items-center gap-4 shrink-0">
            <motion.div
              key={unified.currentStreakDays}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className={`w-20 h-20 rounded-3xl bg-card border border-border/50 flex items-center justify-center shadow-lg`}
            >
              <Flame className={`w-10 h-10 transition-colors ${FLAME_GLOW[tier]}`} />
            </motion.div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black tracking-tight text-foreground tabular-nums">
                  {unified.currentStreakDays}
                </span>
                <span className="text-meta font-bold text-muted-foreground">يوم متتالٍ</span>
              </div>
              <p className="text-micro text-muted-foreground mt-0.5">
                سلسلة النشاط الموحّدة عبر كل وحدات التطبيق
              </p>
            </div>
          </div>

          {/* Stats cluster */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center space-y-0.5">
              <Trophy className="w-4 h-4 mx-auto text-emerald-400" />
              <span className="block text-lead font-extrabold text-foreground tabular-nums">
                {unified.longestStreakDays}
              </span>
              <span className="block text-micro text-muted-foreground">أطول سلسلة</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center space-y-0.5">
              <Sparkles className="w-4 h-4 mx-auto text-primary" />
              <span className="block text-lead font-extrabold text-foreground tabular-nums">
                {unified.activeDaysCount}
              </span>
              <span className="block text-micro text-muted-foreground">يوم نشط</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center space-y-0.5">
              <Flame className={`w-4 h-4 mx-auto ${FLAME_GLOW[tier]}`} />
              <span className="block text-lead font-extrabold text-foreground tabular-nums">
                {unified.totalContributions}
              </span>
              <span className="block text-micro text-muted-foreground">نشاط كلي</span>
            </div>
          </div>
        </div>

        {/* Milestone progress rail */}
        <div className="relative mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-micro">
            {unified.nextMilestone ? (
              <>
                <span className="font-semibold text-muted-foreground">
                  الوسام التالي:{' '}
                  <span className="text-primary font-bold">{unified.nextMilestone.labelAr}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {unified.currentStreakDays}/{unified.nextMilestone.days} يوم (
                  {unified.nextMilestone.days - unified.currentStreakDays} متبقية)
                </span>
              </>
            ) : (
              <span className="font-bold text-amber-400">
                🏆 أتممتَ جميع معالم السلاسل — أنت أسطورة الالتزام!
              </span>
            )}
          </div>
          <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-amber-400 via-orange-400 to-red-400"
              initial={{ width: 0 }}
              animate={{ width: `${milestoneProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Live risk banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={unified.risk.level + unified.risk.messageAr}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mt-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl ${riskStyle.bg} ${riskStyle.text}`}
          >
            <RiskIcon className="w-4 h-4 shrink-0" />
            <span className="text-mini font-semibold">{unified.risk.messageAr}</span>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. Per-module streak grid                                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-meta font-bold text-foreground px-1">
          سلاسل الوحدات — أين التزامك الأقوى؟
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeModules.map((m: ModuleStreak) => {
            const Icon = MODULE_ICONS[m.category] || Sparkles;
            const mTier = flameTier(m.currentStreakDays);
            const isActive = m.currentStreakDays > 0;

            return (
              <motion.div
                key={m.category}
                whileHover={{ y: -2 }}
                className={`surface-depth rounded-2xl p-4 space-y-2.5 border transition-colors ${
                  isActive ? 'border-border/60 hover:border-amber-500/40' : 'opacity-70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-mini font-bold text-foreground leading-tight">
                        {getModuleLabelAr(m.category)}
                      </h4>
                      <span className="text-micro text-muted-foreground">
                        {isActive
                          ? `آخر نشاط: ${m.lastActiveDateISO === snapshot.lastActiveDateISO && m.currentStreakDays === unified.currentStreakDays ? 'اليوم' : m.lastActiveDateISO}`
                          : 'لا نشاط بعد'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-end">
                    <Flame className={`w-4 h-4 ${FLAME_GLOW[mTier]}`} />
                    <span className="text-lead font-black text-foreground tabular-nums">
                      {m.currentStreakDays}
                    </span>
                  </div>
                </div>

                {/* Micro stats row */}
                <div className="flex items-center gap-3 text-micro text-muted-foreground">
                  <span>
                    أطول: <strong className="text-foreground">{m.longestStreakDays}</strong> يوم
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span>
                    أيام نشطة: <strong className="text-foreground">{m.activeDaysCount}</strong>
                  </span>
                </div>

                {/* Next milestone micro-rail */}
                {m.nextMilestone ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-micro">
                      <span className="text-muted-foreground">{m.nextMilestone.labelAr}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {m.currentStreakDays}/{m.nextMilestone.days}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{
                          width: `${formatMilestoneProgress(m.currentStreakDays, m.nextMilestone.days)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-micro font-bold text-amber-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> كل المعالم مُكتملة
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. Weekly rhythm insight + golden day                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Rhythm chart */}
        <section className="surface-depth rounded-2xl p-5 space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-meta font-bold text-foreground">إيقاعك الأسبوعي</h3>
              <p className="text-micro text-muted-foreground mt-0.5">
                متوسط نشاطك الحقيقي لكل يوم من أيام الأسبوع
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-36 pt-2">
            {rhythmBars.map((dow) => {
              const avg = rhythm.averagesByDayOfWeek[dow] || 0;
              const heightPct = Math.max(4, Math.round((avg / maxModuleAvg) * 100));
              const isStrongest = dow === rhythm.strongestDayIndex && avg > 0;
              const isWeakest = dow === rhythm.weakestDayIndex && avg === 0;

              return (
                <div key={dow} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                  <span className="text-micro tabular-nums text-muted-foreground font-semibold">
                    {avg > 0 ? avg.toFixed(1).replace('.0', '') : '—'}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: dow * 0.05 }}
                      className={`w-full rounded-t-lg ${
                        isStrongest
                          ? 'bg-gradient-to-t from-amber-500 to-orange-400 shadow-md shadow-amber-500/20'
                          : isWeakest
                            ? 'bg-muted/30'
                            : 'bg-primary/60'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-micro font-bold ${isStrongest ? 'text-amber-400' : 'text-muted-foreground'}`}
                  >
                    {[ 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت' ][dow]}
                  </span>
                </div>
              );
            })}
          </div>

          {rhythm.averagesByDayOfWeek.some((a) => a > 0) && (
            <p className="text-mini text-muted-foreground bg-muted/20 rounded-xl p-3 leading-relaxed">
              💡 تحليل الإيقاع:{' '}
              <strong className="text-amber-400">{rhythm.strongestDayNameAr}</strong> هو أقوى
              أيامك بمتوسط{' '}
              <strong className="text-foreground">
                {rhythm.averagesByDayOfWeek[rhythm.strongestDayIndex]}
              </strong>{' '}
              نشاطات — جدول مهامك المهمة فيه قبل غيره.
              {rhythm.averagesByDayOfWeek[rhythm.weakestDayIndex] === 0 &&
                ` ويوم ${rhythm.weakestDayNameAr} لم يُسجَّل فيه أي نشاط؛ نشاط واحد فيه يكسر رتابة الأسبوع.`}
            </p>
          )}
        </section>

        {/* Golden day card */}
        <section className="surface-depth rounded-2xl p-5 space-y-3 lg:col-span-2 relative overflow-hidden">
          <motion.div
            aria-hidden
            className="absolute -inset-10 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 0%, rgba(245, 200, 60, 0.14), transparent 70%)',
            }}
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <h3 className="text-meta font-bold text-foreground">يومك الذهبي</h3>
            </div>

            {bestDay ? (
              <>
                <p className="text-mini font-semibold text-foreground">{bestDay.dateFormattedAr}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-amber-400 tabular-nums">
                    {bestDay.count}
                  </span>
                  <span className="text-mini text-muted-foreground">نشاط في يوم واحد</span>
                </div>
                {bestDay.breakdown && Object.keys(bestDay.breakdown).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(bestDay.breakdown)
                      .filter(([, c]) => (c || 0) > 0)
                      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                      .map(([cat, count]) => {
                        const Icon = MODULE_ICONS[cat] || Sparkles;
                        return (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-muted-foreground"
                          >
                            <Icon className="w-3 h-3 text-primary" />
                            {getModuleLabelAr(cat as never)} · {count}
                          </span>
                        );
                      })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-mini text-muted-foreground leading-relaxed">
                لا يوجد يوم ذهبي بعد — أول يوم تجمع فيه 5+ أنشطة سيُتوَّج هنا بتاج ذهبي دائم.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
