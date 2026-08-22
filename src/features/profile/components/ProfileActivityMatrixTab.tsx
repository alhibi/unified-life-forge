import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import {
  Activity,
  BookOpen,
  BrainCircuit,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Feather,
  Filter,
  Flame,
  Globe,
  HeartHandshake,
  Info,
  Languages,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
} from '@/lib/icons';

import { DayDetailCard } from './DayDetailCard';
import { ProfileStreakPanel } from './ProfileStreakPanel';
import {
  calculate365DayContributions,
  calculateProfileActivitySummary,
} from '../lib/activityAggregator';
import { buildStreakSnapshot, type StreakSnapshot } from '../lib/streakEngine';
import {
  ActivityCategory,
  ContributionActivityEvent,
  DailyContribution,
  ProfileActivitySummary,
} from '../types';

export interface ProfileActivityMatrixTabProps {
  summary?: ProfileActivitySummary | null;
}

const CATEGORY_OPTIONS: Array<{
  id: ActivityCategory;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', labelAr: 'كافة الأنشطة', icon: Sparkles },
  { id: 'visits', labelAr: 'زيارات التطبيق', icon: Globe },
  { id: 'fitness', labelAr: 'اللياقة', icon: Activity },
  { id: 'german', labelAr: 'الألمانية', icon: Languages },
  { id: 'diwan', labelAr: 'الديوان', icon: Feather },
  { id: 'pkm', labelAr: 'الذاكرة', icon: BrainCircuit },
  { id: 'atlas', labelAr: 'الأطلس', icon: Compass },
  { id: 'spiritual', labelAr: 'الأذكار', icon: HeartHandshake },
];

const MONTH_NAMES_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const ProfileActivityMatrixTab: React.FC<ProfileActivityMatrixTabProps> = ({
  summary: propSummary,
}) => {
  const summary = useMemo(() => {
    return propSummary || calculateProfileActivitySummary();
  }, [propSummary]);

  // State Filters
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined); // undefined = Past 12 Months
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<DailyContribution | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Compute 365-day GitHub contribution summary
  const yearlyData = useMemo(() => {
    return calculate365DayContributions(selectedYear, selectedCategory);
  }, [selectedYear, selectedCategory]);

  // Full-year unfiltered cells power the streak engine (never category-filtered)
  const fullYearCells = useMemo(() => {
    return calculate365DayContributions(selectedYear).dailyContributions;
  }, [selectedYear]);

  const streakSnapshot = useMemo<StreakSnapshot | null>(() => {
    try {
      return buildStreakSnapshot(fullYearCells);
    } catch {
      return null;
    }
  }, [fullYearCells]);

  // Organize 52-week columns for matrix grid
  const weekColumns = useMemo(() => {
    const weeks: DailyContribution[][] = [];
    yearlyData.dailyContributions.forEach((day) => {
      if (!weeks[day.weekIndex]) {
        weeks[day.weekIndex] = [];
      }
      weeks[day.weekIndex].push(day);
    });
    return weeks;
  }, [yearlyData.dailyContributions]);

  // Compute Month Header positions over 52 week columns
  const monthHeaders = useMemo(() => {
    const headers: Array<{ labelAr: string; colIndex: number }> = [];
    let lastMonth = -1;

    weekColumns.forEach((week, wIdx) => {
      // Look at middle or first day of the week
      const day = week.find((d) => d.monthIndex !== undefined) || week[0];
      if (day && day.monthIndex !== lastMonth) {
        headers.push({
          labelAr: MONTH_NAMES_AR[day.monthIndex],
          colIndex: wIdx,
        });
        lastMonth = day.monthIndex;
      }
    });

    return headers;
  }, [weekColumns]);

  // Filtered Activity Timeline Events
  const filteredEvents = useMemo(() => {
    let events = yearlyData.activityEvents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      events = events.filter(
        (e) =>
          e.titleAr.toLowerCase().includes(q) ||
          (e.subtitleAr && e.subtitleAr.toLowerCase().includes(q)) ||
          (e.detailsAr && e.detailsAr.toLowerCase().includes(q))
      );
    }

    if (selectedDay) {
      events = events.filter((e) => e.dateISO === selectedDay.dateISO);
    }

    return events;
  }, [yearlyData.activityEvents, searchQuery, selectedDay]);

  // Group events by Month for GitHub-style timeline
  const eventsByMonth = useMemo(() => {
    const grouped: Record<string, ContributionActivityEvent[]> = {};
    filteredEvents.forEach((evt) => {
      const d = new Date(evt.timestamp);
      const monthKey = `${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(evt);
    });
    return grouped;
  }, [filteredEvents]);

  // Intensity Styling Classes
  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 1:
        return 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:border-emerald-400';
      case 2:
        return 'bg-emerald-500/45 border border-emerald-500/60 text-emerald-300 hover:border-emerald-300';
      case 3:
        return 'bg-emerald-500/75 border border-emerald-500/80 text-white hover:border-emerald-200';
      case 4:
        return 'bg-emerald-500 border border-emerald-400 shadow-sm shadow-emerald-500/30 text-white hover:scale-110';
      case 0:
      default:
        return 'bg-muted/30 border border-border/20 text-muted-foreground hover:border-border/60';
    }
  };

  const getCategoryIcon = (cat: ActivityCategory) => {
    switch (cat) {
      case 'visits':
        return Globe;
      case 'fitness':
        return Activity;
      case 'german':
        return Languages;
      case 'diwan':
        return Feather;
      case 'pkm':
        return BrainCircuit;
      case 'atlas':
        return Compass;
      case 'spiritual':
        return HeartHandshake;
      default:
        return Sparkles;
    }
  };

  const toggleMonthExpansion = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: prev[monthKey] === false ? true : false,
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 0. Deep Commitment Streaks Panel */}
      {streakSnapshot && <ProfileStreakPanel snapshot={streakSnapshot} />}

      {/* 0.5 Selected Day Detail Card */}
      <AnimatePresence>
        {selectedDay && yearlyData && (
          <DayDetailCard
            day={selectedDay}
            allDays={yearlyData.dailyContributions}
            events={yearlyData.activityEvents.filter(
              (e) => e.dateISO === selectedDay.dateISO
            )}
            streakSnapshot={streakSnapshot}
            onSelectDay={setSelectedDay}
            onClearSelection={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>

      {/* 1. Header Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-depth rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-micro">
            <span>إجمالي النشاطات</span>
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{yearlyData.totalContributions}</p>
          <span className="text-micro text-muted-foreground block truncate">في الـ 12 شهراً الماضية</span>
        </div>

        <div className="surface-depth rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-micro">
            <span>المواظبة الحالية</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-amber-500">{yearlyData.currentStreakDays} يوم</p>
          <span className="text-micro text-muted-foreground block truncate">سلسلة التفاعل المستمر</span>
        </div>

        <div className="surface-depth rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-micro">
            <span>أطول سلسلة</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-400">{yearlyData.longestStreakDays} يوم</p>
          <span className="text-micro text-muted-foreground block truncate">أعلى معدل استمرارية</span>
        </div>

        <div className="surface-depth rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-micro">
            <span>المعدل اليومي</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{yearlyData.averageDaily}</p>
          <span className="text-micro text-muted-foreground block truncate">نشاط / يوم في المتوسط</span>
        </div>
      </div>

      {/* 2. GitHub-Style 52-Week Contribution Heatmap Graph */}
      <section className="surface-depth rounded-2xl p-5 space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lead font-bold text-foreground">مصفوفة النشاطات الحقيقية</h2>
              <p className="text-micro text-muted-foreground">
                سجل الزيارات والتفاعل اليومي على نمط GitHub (52 أسبوعاً)
              </p>
            </div>
          </div>

          {/* Period / Year Selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-card border border-border/50 p-1 rounded-xl">
            <button
              onClick={() => setSelectedYear(undefined)}
              className={`px-3 py-1 rounded-lg text-micro font-semibold transition-all ${
                selectedYear === undefined
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              آخر 12 شهراً
            </button>
            <button
              onClick={() => setSelectedYear(2025)}
              className={`px-3 py-1 rounded-lg text-micro font-semibold transition-all ${
                selectedYear === 2025
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              2025
            </button>
            <button
              onClick={() => setSelectedYear(2024)}
              className={`px-3 py-1 rounded-lg text-micro font-semibold transition-all ${
                selectedYear === 2024
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              2024
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const IconComponent = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedDay(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-micro font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-primary/15 text-primary border border-primary/40'
                    : 'bg-card border border-border/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{cat.labelAr}</span>
              </button>
            );
          })}
        </div>

        {/* 52-Week Heatmap Container with Horizontal Scroll */}
        <div className="overflow-x-auto no-scrollbar pt-2 pb-1">
          <div className="min-w-[720px] space-y-1">
            {/* Month Labels Row - Aligned over 52 Week Columns */}
            <div className="relative h-5 text-micro font-bold text-muted-foreground/80 ps-12">
              {monthHeaders.map((m, idx) => (
                <span
                  key={idx}
                  style={{
                    insetInlineStart: `calc(3rem + ${m.colIndex * 1.125}rem)`,
                  }}
                  className="absolute text-micro font-bold text-muted-foreground/80 whitespace-nowrap"
                >
                  {m.labelAr}
                </span>
              ))}
            </div>

            {/* Matrix Body: Day of Week Labels + 52 Week Columns */}
            <div className="flex gap-1">
              {/* Day Labels Column */}
              <div className="w-11 flex flex-col justify-between text-[10px] font-semibold text-muted-foreground pe-2 pt-0.5 shrink-0">
                <span>الأحد</span>
                <span>الثلاثاء</span>
                <span>الخميس</span>
              </div>

              {/* Week Columns Grid */}
              <div className="flex gap-1 flex-1">
                {weekColumns.map((weekDays, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 min-w-[14px]">
                    {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                      const day = weekDays.find((d) => d.dayOfWeek === dayOfWeek);
                      if (!day) {
                        return <div key={dayOfWeek} className="w-3 h-3 rounded-xs opacity-0" />;
                      }

                      const isSelected = selectedDay?.dateISO === day.dateISO;

                      return (
                        <div
                          key={day.dateISO}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`w-3.5 h-3.5 rounded-xs transition-all cursor-pointer ${getIntensityClass(
                            day.intensity
                          )} ${isSelected ? 'ring-2 ring-primary ring-offset-1 scale-125 z-10' : ''}`}
                          title={`${day.dateFormattedAr}: ${day.count} نشاطات`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Footer Legend & Selected Day Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-micro text-muted-foreground pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <span>أقل</span>
            <div className="w-3 h-3 rounded-xs bg-muted/30 border border-border/20" />
            <div className="w-3 h-3 rounded-xs bg-emerald-500/20 border border-emerald-500/30" />
            <div className="w-3 h-3 rounded-xs bg-emerald-500/45 border border-emerald-500/60" />
            <div className="w-3 h-3 rounded-xs bg-emerald-500/75 border border-emerald-500/80" />
            <div className="w-3 h-3 rounded-xs bg-emerald-500 border border-emerald-400" />
            <span>أكثر</span>
          </div>

          {selectedDay ? (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
              <span>
                {selectedDay.dateFormattedAr}: <strong>{selectedDay.count}</strong> نشاط
              </span>
              <button
                onClick={() => setSelectedDay(null)}
                className="hover:opacity-80 font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-micro">اضغط على أي مربع لاستعراض أنشطة اليوم المحدد</span>
          )}
        </div>
      </section>

      {/* 3. GitHub-Style Chronological Activity Stream / Feed */}
      <section className="surface-depth rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lead font-bold text-foreground">سجل المساهمات والنشاطات التفصيلي</h2>
            <p className="text-micro text-muted-foreground">
              تصفح التفاعل الزمني الكامل المرتب حسب الأشهر والأيام
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في سجل الأنشطة…"
              className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-card border border-border/50 text-micro text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-micro hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Selected Day Reset Banner */}
        {selectedDay && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-micro">
            <span className="text-primary font-semibold">
              تصفية الأنشطة ليوم {selectedDay.dateFormattedAr} ({selectedDay.count} نشاط)
            </span>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-primary font-bold hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> عرض كافة الأيام
            </button>
          </div>
        )}

        {/* Activity Feed Grouped by Month */}
        {Object.keys(eventsByMonth).length > 0 ? (
          <div className="space-y-6 pt-2">
            {Object.entries(eventsByMonth).map(([monthKey, events]) => {
              const isCollapsed = expandedMonths[monthKey] === true;

              return (
                <div key={monthKey} className="space-y-3">
                  {/* Month Header Divider */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="text-meta font-bold text-foreground">{monthKey}</h3>
                      <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
                        {events.length} نشاط
                      </span>
                    </div>

                    <button
                      onClick={() => toggleMonthExpansion(monthKey)}
                      className="text-micro font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {isCollapsed ? (
                        <>
                          إظهار التفاصيل <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          طي <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Month Events Timeline List */}
                  {!isCollapsed && (
                    <div className="space-y-2.5 ps-3 border-s-2 border-border/40 ms-2">
                      {events.map((evt) => {
                        const IconComp = getCategoryIcon(evt.category);
                        const evtDate = new Date(evt.timestamp);
                        const dateFormatted = `${evtDate.getDate()} ${MONTH_NAMES_AR[evtDate.getMonth()]}`;

                        return (
                          <div
                            key={evt.id}
                            className="relative ps-6 group flex items-start justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-all"
                          >
                            {/* Bullet icon node */}
                            <div className="absolute -start-[17px] top-3.5 w-7 h-7 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center text-primary group-hover:border-primary group-hover:scale-110 transition-transform">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>

                            {/* Event Details */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-meta font-bold text-foreground">
                                  {evt.titleAr}
                                </h4>
                                {evt.subtitleAr && (
                                  <span className="text-micro font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                                    {evt.subtitleAr}
                                  </span>
                                )}
                              </div>

                              {evt.detailsAr && (
                                <p className="text-micro text-muted-foreground">
                                  {evt.detailsAr}
                                </p>
                              )}
                            </div>

                            <div className="text-end shrink-0">
                              <span className="text-micro font-semibold text-muted-foreground">
                                {dateFormatted}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-meta font-semibold text-foreground">لم يتم العثور على أنشطة مطابقة</p>
            <p className="text-micro text-muted-foreground max-w-sm mx-auto">
              جرّب تغيير فئة البحث أو اختيار فترة زمنية مختلفة لاستعراض سجل المساهمات
            </p>
            {(searchQuery || selectedDay || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDay(null);
                  setSelectedCategory('all');
                }}
                className="text-micro font-bold text-primary hover:underline"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            )}
          </div>
        )}
      </section>

      {/* 4. Cross-Module Statistics Breakdown Cards */}
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
