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

import { ProfileActivitySummary } from '../types';

export interface ProfileActivityMatrixTabProps {
  summary?: ProfileActivitySummary | null;
}

export const ProfileActivityMatrixTab: React.FC<ProfileActivityMatrixTabProps> = ({
  summary = {
    totalDistanceKm: 38.4,
    totalWorkouts: 14,
    totalCalories: 2850,
    masteredWords: 84,
    shelfMasteryPercent: 78,
    surgeStreakDays: 6,
    savedPoemsCount: 18,
    readingHours: 12.5,
    activeNotesCount: 22,
    journalEntriesCount: 9,
    visitedCountriesCount: 4,
    travelStampsCount: 7,
    totalDhikrCount: 1420,
    dhikrStreakDays: 12,
  },
}) => {
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
    'bg-muted/30 border border-border/20',
    'bg-primary/20 border border-primary/30',
    'bg-primary/40 border border-primary/50',
    'bg-primary/70 border border-primary/80',
    'bg-primary shadow-sm shadow-primary/30',
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. 30-Day Activity Heatmap Grid */}
      <section className="surface-depth rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-meta font-bold text-foreground">سجل النشاط والتركيز اليومي</h2>
              <p className="text-micro text-muted-foreground">التفاعل التراكمي خلال الـ 30 يوماً الماضية</p>
            </div>
          </div>
          <span className="text-micro font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            نشط بانتظام
          </span>
        </div>

        {/* Heatmap Grid (5x6 matrix) */}
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
              <span className="text-lead font-extrabold text-foreground">{summary?.totalDistanceKm || 0}</span>
              <span className="block text-micro text-muted-foreground">كم مسافة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary?.totalWorkouts || 0}</span>
              <span className="block text-micro text-muted-foreground">أنشطة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-primary">{summary?.totalCalories || 0}</span>
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
              <span className="text-lead font-extrabold text-foreground">{summary?.masteredWords || 0}</span>
              <span className="block text-micro text-muted-foreground">مفردة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-foreground">{summary?.shelfMasteryPercent || 0}%</span>
              <span className="block text-micro text-muted-foreground">إتقان الأرفف</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-amber-400">{summary?.surgeStreakDays || 0}d</span>
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
              <span className="text-lead font-extrabold text-foreground">{summary?.savedPoemsCount || 0}</span>
              <span className="block text-micro text-muted-foreground">قصائد محفوظة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-indigo-400">{summary?.readingHours || 0}س</span>
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
              <span className="text-lead font-extrabold text-foreground">{summary?.activeNotesCount || 0}</span>
              <span className="block text-micro text-muted-foreground">ملاحظات نشطة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-cyan-400">{summary?.journalEntriesCount || 0}</span>
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
              <span className="text-lead font-extrabold text-foreground">{summary?.visitedCountriesCount || 0}</span>
              <span className="block text-micro text-muted-foreground">بلدان مستكشفة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-amber-500">{summary?.travelStampsCount || 0}</span>
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
              <span className="text-lead font-extrabold text-foreground">{summary?.totalDhikrCount || 0}</span>
              <span className="block text-micro text-muted-foreground">تسبيحة ومودّة</span>
            </div>
            <div className="p-2 rounded-xl bg-card border border-border/40">
              <span className="text-lead font-extrabold text-emerald-400">{summary?.dhikrStreakDays || 0}d</span>
              <span className="block text-micro text-muted-foreground">سلسلة المواظبة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
