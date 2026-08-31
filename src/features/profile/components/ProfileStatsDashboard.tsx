/**
 * Profile Stats Dashboard — Deep Enhanced Visual Component
 * ----------------------------------------------------------
 * A luxury statistics dashboard showing profile activity with
 * animated progress bars, live data visualization, and elegant typography.
 * Built with Framer Motion for smooth staggered animations.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Compass, Trophy, Sparkles, ShieldCheck, Clock } from '@/lib/icons';
import { ProfileActivitySummary } from '../types';

interface ProfileStatsDashboardProps {
  summary: ProfileActivitySummary;
  unifiedStreakDays?: number;
  className?: string;
}

/* Stat card config */
interface StatDef {
  label: string;
  value: number | string;
  sublabel?: string;
  colorClass: string;
  icon: React.ComponentType<{ className?: string }>;
  format?: (n: number) => string;
}

export function ProfileStatsDashboard({ summary, unifiedStreakDays = 0, className = '' }: ProfileStatsDashboardProps) {
  const stats: StatDef[] = [
    {
      label: 'تمارين اللياقة',
      value: summary.totalWorkouts || 0,
      sublabel: 'تمرين مسجل',
      colorClass: 'text-rose-300',
      icon: Flame,
      format: (n) => `${n}`,
    },
    {
      label: 'المسافة الكلية',
      value: summary.totalDistanceKm || 0,
      sublabel: 'كم',
      colorClass: 'text-amber-300',
      icon: Compass,
      format: (n) => `${n.toFixed(1)} كم`,
    },
    {
      label: 'سلسلة موحدة',
      value: unifiedStreakDays,
      sublabel: 'يوم متتالٍ',
      colorClass: 'text-emerald-300',
      icon: Trophy,
      format: (n) => `${n}`,
    },
    {
      label: 'مفردات محفوظة',
      value: summary.masteredWords || 0,
      sublabel: 'كلمة',
      colorClass: 'text-violet-300',
      icon: Sparkles,
      format: (n) => `${n}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`surface-depth rounded-[1.75rem] p-6 md:p-7 overflow-hidden relative ${className}`}
    >
      {/* Ambient light */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-br from-rose-400/5 via-amber-300/3 to-violet-300/5 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400/15 to-amber-300/10 flex items-center justify-center shadow-inner ring-1 ring-rose-400/15 shrink-0">
            <ShieldCheck className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <h2 className="text-[1.05rem] font-extrabold text-foreground tracking-tight">إحصائيات النشاط</h2>
            <p className="text-[0.7rem] text-muted-foreground font-medium">نظرة سريعة على تقدمك عبر الوحدات</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative rounded-2xl p-4 bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:shadow-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`w-5 h-5 ${stat.colorClass} opacity-80`} />
                  <span className="text-[0.625rem] font-extrabold text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">#{i + 1}</span>
                </div>
                <div className="text-[1.6rem] md:text-[2rem] font-extrabold text-foreground tracking-tight leading-none mb-0.5">
                  {stat.format ? stat.format(stat.value as number) : stat.value}
                </div>
                <div className="text-[0.65rem] font-bold text-muted-foreground/60">{stat.label}</div>
                <div className="text-[0.625rem] text-muted-foreground/30 font-medium">{stat.sublabel}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer bar */}
        <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.625rem] text-muted-foreground/40 font-medium">
            <Clock className="w-3 h-3" />
            <span>آخر تحديث: الآن</span>
          </div>
          <div className="text-[0.625rem] text-muted-foreground/30 font-medium tracking-wide">
            بيانات حية من جميع الوحدات
          </div>
        </div>
      </div>
    </motion.div>
  );
}
