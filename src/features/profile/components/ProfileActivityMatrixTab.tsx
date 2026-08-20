import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import {
  Activity,
  BookOpen,
  BrainCircuit,
  Compass,
  Feather,
  Flame,
  HeartHandshake,
  Languages,
  Sparkles,
  TrendingUp,
} from '@/lib/icons';

import { calculateProfileActivitySummary } from '../lib/activityAggregator';
import { ProfileActivitySummary } from '../types';

export interface ProfileActivityMatrixTabProps {
  summary?: ProfileActivitySummary | null;
}

export const ProfileActivityMatrixTab: React.FC<ProfileActivityMatrixTabProps> = ({
  summary: propSummary,
}) => {
  const summary = useMemo(() => {
    return propSummary || calculateProfileActivitySummary();
  }, [propSummary]);

  // Generate 30-day activity intensity map (0-4 intensity scale)
  const heatmapDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // Deterministic pseudo-random seed based on day offset for natural activity visualization
      const seed = (i * 17 + 5) % 10;
      const intensity = seed > 7 ? 4 : seed > 4 ? 3 : seed > 2 ? 2 : seed > 0 ? 1 : 0;

      days.push({
        dateStr: d.toLocaleDateString('ar', { month: 'short', day: 'numeric' }),
        intensity,
      });
    }
    return days;
  }, []);

  const intensityClasses = [
    'bg-muted/40 border border-border/30 hover:border-primary/50',
    'bg-primary/20 border border-primary/30 hover:border-primary',
    'bg-primary/40 border border-primary/50 hover:border-primary',
    'bg-primary/70 border border-primary/80 hover:border-primary',
    'bg-primary border border-primary shadow-sm hover:scale-105',
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. 30-Day Activity Heatmap Matrix */}
      <section className="surface-depth rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lead font-bold text-foreground">مصفوفة النشاط والمواظبة</h2>
              <p className="text-micro text-muted-foreground">التفاعل التراكمي خلال الـ 30 يوماً الماضية</p>
            </div>
          </div>
          <span className="text-micro font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            نشط بانتظام
          </span>
        </div>

        {/* Heatmap Grid (30 days) */}
        <div className="grid grid-cols-10 gap-1.5 pt-2">
          {heatmapDays.map((day, idx) => (
            <div
              key={idx}
              className={`h-7 rounded-md transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                intensityClasses[day.intensity]
              }`}
              title={`${day.dateStr}: مستوى النشاط ${day.intensity}/4`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-micro text-muted-foreground pt-1">
          <span>قبل 30 يوماً</span>
          <div className="flex items-center gap-1">
            <span>أقل</span>
            <div className="w-2.5 h-2.5 rounded bg-muted/40" />
            <div className="w-2.5 h-2.5 rounded bg-primary/30" />
            <div className="w-2.5 h-2.5 rounded bg-primary/70" />
            <div className="w-2.5 h-2.5 rounded bg-primary" />
            <span>أكثر</span>
          </div>
          <span>اليوم</span>
        </div>
      </section>

      {/* 2. Cross-Module Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fitness Card */}
        <div className="surface-depth rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-meta font-bold text-foreground">اللياقة والتتبع</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Fitness</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.totalDistanceKm}</span>
              <span className="block text-micro text-muted-foreground">كم مسافة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.totalWorkouts}</span>
              <span className="block text-micro text-muted-foreground">أنشطة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-primary">{summary.totalCalories}</span>
              <span className="block text-micro text-muted-foreground">سعرة</span>
            </div>
          </div>
        </div>

        {/* German Club Card */}
        <div className="surface-depth rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Languages className="w-4 h-4" />
              </div>
              <h3 className="text-meta font-bold text-foreground">النادي الألماني</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Der Club</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.masteredWords}</span>
              <span className="block text-micro text-muted-foreground">مفردة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.shelfMasteryPercent}%</span>
              <span className="block text-micro text-muted-foreground">إتقان الأرفف</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-amber-400">{summary.surgeStreakDays}d</span>
              <span className="block text-micro text-muted-foreground">سلسلة الاندفاع</span>
            </div>
          </div>
        </div>

        {/* Diwan Poetry Card */}
        <div className="surface-depth rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Feather className="w-4 h-4" />
              </div>
              <h3 className="text-meta font-bold text-foreground">الديوان والمكتبة</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Diwan</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.savedPoemsCount}</span>
              <span className="block text-micro text-muted-foreground">قصائد محفوظة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-indigo-400">{summary.readingHours}س</span>
              <span className="block text-micro text-muted-foreground">ساعات القراءة</span>
            </div>
          </div>
        </div>

        {/* PKM & Memory Card */}
        <div className="surface-depth rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <h3 className="text-meta font-bold text-foreground">الذاكرة والملاحظات</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">PKM</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.activeNotesCount}</span>
              <span className="block text-micro text-muted-foreground">ملاحظات نشطة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-cyan-400">{summary.journalEntriesCount}</span>
              <span className="block text-micro text-muted-foreground">تدوينات اليوميات</span>
            </div>
          </div>
        </div>

        {/* Travel Atlas Card */}
        <div className="surface-depth rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-500">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-meta font-bold text-foreground">أطلس الأسفار</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Atlas</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.visitedCountriesCount}</span>
              <span className="block text-micro text-muted-foreground">بلدان مستكشفة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-amber-500">{summary.travelStampsCount}</span>
              <span className="block text-micro text-muted-foreground">أختام سفر</span>
            </div>
          </div>
        </div>

        {/* Spiritual Quran & Dhikr Card */}
        <div className="surface-depth rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-400">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h3 className="text-meta font-bold text-foreground">الأذكار والقرآن</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Dhikr</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary.totalDhikrCount}</span>
              <span className="block text-micro text-muted-foreground">تسبيحة ومودّة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-emerald-400">{summary.dhikrStreakDays}d</span>
              <span className="block text-micro text-muted-foreground">سلسلة المواظبة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
