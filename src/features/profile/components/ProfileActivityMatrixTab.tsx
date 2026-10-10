import { AnimatePresence } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { AppCard, AppList, AppRow, IconChip, Stat, StatGrid } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import {
  Activity,
  BrainCircuit,
  Calendar,
  ChevronDown,
  ChevronUp,
  Compass,
  Feather,
  Flame,
  Globe,
  HeartHandshake,
  Languages,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
} from '@/lib/icons';

import {
  calculate365DayContributions,
  calculateProfileActivitySummary,
} from '../lib/activityAggregator';
import type { StreakSnapshot } from '../lib/streakEngine';
import { useStreakSnapshot } from '../lib/streakStore';
import {
  ActivityCategory,
  ContributionActivityEvent,
  DailyContribution,
  ProfileActivitySummary,
} from '../types';
import { DayDetailCard } from './DayDetailCard';
import { ProfileStreakPanel } from './ProfileStreakPanel';

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

const DAY_LABELS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Rows that carry a visible weekday label (mirrors GitHub's every-other-row rhythm). */
const LABELED_ROWS = new Set([0, 2, 4, 6]);

const CELL_PX = 14;
const CELL_GAP_PX = 3;
const EVENTS_PER_MONTH_PAGE = 15;

/**
 * Density ladder — the matrix encodes volume with one tinted ramp:
 * `--track` is the resting cell, then `primary` at rising opacity for
 * intensity 1→4. (Was: eight per-category gradient palettes with glows.)
 * The count itself stays in each cell's tooltip/aria-label.
 */
const HEAT_STEPS = ['bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'] as const;

const EMPTY_CELL_CLASS = 'bg-track';

/** Filter rail pills — one primary accent, no per-category hues or shadows. */
const PILL_BASE =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-micro font-semibold transition-motion shrink-0';
const PILL_ACTIVE = 'bg-primary/15 text-primary border border-primary/40';
const PILL_IDLE =
  'border border-border/40 text-muted-foreground hover:text-foreground hover:border-border';

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
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [expandedMonthPages, setExpandedMonthPages] = useState<Record<string, number>>({});

  // Year options are derived from the clock — never hardcoded, so the selector
  // stays correct as calendars roll over.
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  // Compute 365-day GitHub contribution summary
  const yearlyData = useMemo(() => {
    return calculate365DayContributions(selectedYear, selectedCategory);
  }, [selectedYear, selectedCategory]);

  // Streak state comes from the central store — same instance the Portal
  // badge and hero chip read, invalidated live when new activity lands.
  // The matrix view always shows the trailing-365-day window streaks.
  const storeSnapshot = useStreakSnapshot();
  const streakSnapshot = storeSnapshot as StreakSnapshot | null;

  const rangeLabelAr = selectedYear ? `عام ${selectedYear}` : 'آخر 12 شهراً';

  // Organize week columns for the matrix grid (each column = one calendar week).
  const weekColumns = useMemo(() => {
    const weeks: DailyContribution[][] = [];
    yearlyData.dailyContributions.forEach((day) => {
      if (!weeks[day.weekIndex]) {
        weeks[day.weekIndex] = [];
      }
      weeks[day.weekIndex].push(day);
    });
    return weeks.filter(Boolean);
  }, [yearlyData.dailyContributions]);

  // Month headers as column spans so labels can never drift out of alignment.
  const monthSpans = useMemo(() => {
    const spans: Array<{ labelAr: string; monthIndex: number; span: number }> = [];
    weekColumns.forEach((week) => {
      // A week belongs to the month owning most of its in-range days.
      const inRange = week.filter((d) => !d.isPadding);
      const source = inRange.length > 0 ? inRange : week;
      const tally = new Map<number, number>();
      source.forEach((d) => tally.set(d.monthIndex, (tally.get(d.monthIndex) ?? 0) + 1));
      let monthIndex = source[0].monthIndex;
      let best = 0;
      tally.forEach((n, m) => {
        if (n > best) {
          best = n;
          monthIndex = m;
        }
      });

      const last = spans[spans.length - 1];
      if (last && last.monthIndex === monthIndex) {
        last.span += 1;
      } else {
        spans.push({ labelAr: MONTH_NAMES_AR[monthIndex], monthIndex, span: 1 });
      }
    });
    // Very narrow spans would collide with their neighbour's label.
    return spans.map((s) => ({ ...s, showLabel: s.span >= 2 }));
  }, [weekColumns]);

  // Filtered Activity Timeline Events
  const filteredEvents = useMemo(() => {
    let events = yearlyData.activityEvents;

    if (selectedCategory !== 'all') {
      events = events.filter((e) => e.category === selectedCategory);
    }

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
  }, [yearlyData.activityEvents, searchQuery, selectedDay, selectedCategory]);

  // Group events by Month for GitHub-style timeline (newest month first).
  const eventsByMonth = useMemo(() => {
    const grouped = new Map<string, ContributionActivityEvent[]>();
    filteredEvents.forEach((evt) => {
      const d = new Date(evt.timestamp);
      const monthKey = `${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}`;
      const bucket = grouped.get(monthKey);
      if (bucket) bucket.push(evt);
      else grouped.set(monthKey, [evt]);
    });
    return Array.from(grouped.entries());
  }, [filteredEvents]);

  const hasActiveFilters =
    Boolean(searchQuery) || Boolean(selectedDay) || selectedCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDay(null);
    setSelectedCategory('all');
  };

  const getIntensityClass = (intensity: number) => {
    if (intensity >= 1 && intensity <= 4) return HEAT_STEPS[intensity - 1];
    return EMPTY_CELL_CLASS;
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

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
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
        <AppCard className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro text-muted-foreground">إجمالي النشاطات</span>
            <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-display font-bold text-foreground tabular-nums">
            {yearlyData.totalContributions}
          </p>
          <span className="text-micro text-muted-foreground block truncate">{rangeLabelAr}</span>
        </AppCard>

        <AppCard className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro text-muted-foreground">المواظبة الحالية</span>
            <Flame className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-display font-bold text-foreground tabular-nums">
            {yearlyData.currentStreakDays} يوم
          </p>
          <span className="text-micro text-muted-foreground block truncate">سلسلة التفاعل المستمر</span>
        </AppCard>

        <AppCard className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro text-muted-foreground">أطول سلسلة</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-display font-bold text-foreground tabular-nums">
            {yearlyData.longestStreakDays} يوم
          </p>
          <span className="text-micro text-muted-foreground block truncate">أعلى معدل استمرارية</span>
        </AppCard>

        <AppCard className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro text-muted-foreground">الأيام النشطة</span>
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-display font-bold text-foreground tabular-nums">
            {yearlyData.activeDaysCount}
          </p>
          <span className="text-micro text-muted-foreground block truncate">
            بمعدل {yearlyData.averageDaily} نشاط / يوم
          </span>
        </AppCard>
      </div>

      {/* 2. GitHub-Style Contribution Heatmap Graph */}
      <AppCard as="section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <IconChip aria-hidden>
              <Sparkles className="h-5 w-5" />
            </IconChip>
            <div>
              <h2 className="text-lead font-bold text-foreground">مصفوفة النشاطات</h2>
              <p className="text-micro text-muted-foreground">
                {rangeLabelAr} — {weekColumns.length} أسبوعاً من التفاعل اليومي
              </p>
            </div>
          </div>

          {/* Period / Year Selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-secondary/50 p-1 rounded-xl">
            <button
              onClick={() => {
                setSelectedYear(undefined);
                setSelectedDay(null);
              }}
              aria-pressed={selectedYear === undefined}
              className={`px-3 py-1 rounded-lg text-micro font-semibold transition-motion ${
                selectedYear === undefined
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              آخر 12 شهراً
            </button>
            {yearOptions.map((year) => (
              <button
                key={year}
                onClick={() => {
                  setSelectedYear(year);
                  setSelectedDay(null);
                }}
                aria-pressed={selectedYear === year}
                className={`px-3 py-1 rounded-lg text-micro font-semibold tabular-nums transition-motion ${
                  selectedYear === year
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {year}
              </button>
            ))}
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
                aria-pressed={isSelected}
                className={`${PILL_BASE} ${isSelected ? PILL_ACTIVE : PILL_IDLE}`}
              >
                <IconComponent className="w-3.5 h-3.5" aria-hidden />
                <span>{cat.labelAr}</span>
              </button>
            );
          })}
        </div>

        {/* Heatmap — time always flows left → right, so the grid is pinned to LTR */}
        <div className="overflow-x-auto no-scrollbar pt-1 pb-1" dir="ltr">
          <div className="inline-flex gap-2">
            {/* Weekday label column, row-aligned with the grid */}
            <div
              className="grid shrink-0 text-micro font-semibold text-muted-foreground-subtle"
              style={{
                gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
                rowGap: `${CELL_GAP_PX}px`,
              }}
              aria-hidden="true"
            >
              {DAY_LABELS_AR.map((label, row) => (
                <span key={label} className="leading-none flex items-center justify-end pe-0.5">
                  {LABELED_ROWS.has(row) ? label : ''}
                </span>
              ))}
            </div>

            <div className="space-y-1">
              {/* Month labels as spans over their own week columns */}
              <div
                className="grid text-micro font-bold text-muted-foreground-subtle"
                style={{ columnGap: `${CELL_GAP_PX}px` }}
              >
                <div
                  className="col-start-1 row-start-1 grid"
                  style={{
                    gridTemplateColumns: monthSpans
                      .map((s) => `${s.span * CELL_PX + (s.span - 1) * CELL_GAP_PX}px`)
                      .join(` ${CELL_GAP_PX}px `),
                    columnGap: 0,
                  }}
                >
                  {monthSpans.map((s, idx) => (
                    <React.Fragment key={`${s.labelAr}-${idx}`}>
                      {idx > 0 && <span style={{ width: CELL_GAP_PX }} />}
                      <span className="whitespace-nowrap overflow-hidden">
                        {s.showLabel ? s.labelAr : ''}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Week columns */}
              <div className="flex" style={{ gap: `${CELL_GAP_PX}px` }}>
                {weekColumns.map((weekDays, wIdx) => (
                  <div
                    key={wIdx}
                    className="grid"
                    style={{
                      gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
                      rowGap: `${CELL_GAP_PX}px`,
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                      const day = weekDays.find((d) => d.dayOfWeek === dayOfWeek);

                      if (!day || day.isPadding) {
                        return (
                          <span
                            key={`${wIdx}-${dayOfWeek}`}
                            className="rounded-xs"
                            style={{ width: CELL_PX, height: CELL_PX }}
                          />
                        );
                      }

                      if (day.isFuture) {
                        return (
                          <span
                            key={day.dateISO}
                            className="rounded-xs border border-dashed border-border/30"
                            style={{ width: CELL_PX, height: CELL_PX }}
                          />
                        );
                      }

                      const isSelected = selectedDay?.dateISO === day.dateISO;

                      return (
                        <button
                          key={day.dateISO}
                          type="button"
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          style={{ width: CELL_PX, height: CELL_PX }}
                          className={`rounded-xs transition-motion duration-fast hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getIntensityClass(
                            day.intensity
                          )} ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-125 relative z-10' : ''}`}
                          title={`${day.dateFormattedAr} — ${day.count} نشاط`}
                          aria-label={`${day.dateFormattedAr}: ${day.count} نشاط`}
                          aria-pressed={isSelected}
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
          <div className="flex items-center gap-1.5" dir="ltr">
            <span>أقل</span>
            <div className={`w-3 h-3 rounded-xs ${EMPTY_CELL_CLASS}`} />
            <div className={`w-3 h-3 rounded-xs ${HEAT_STEPS[0]}`} />
            <div className={`w-3 h-3 rounded-xs ${HEAT_STEPS[1]}`} />
            <div className={`w-3 h-3 rounded-xs ${HEAT_STEPS[2]}`} />
            <div className={`w-3 h-3 rounded-xs ${HEAT_STEPS[3]}`} />
            <span>أكثر</span>
          </div>

          {selectedDay ? (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
              <span>
                {selectedDay.dateFormattedAr}: <strong className="tabular-nums">{selectedDay.count}</strong> نشاط
              </span>
              <button
                onClick={() => setSelectedDay(null)}
                aria-label="إلغاء تحديد اليوم"
                className="hover:opacity-80 font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-micro">اضغط على أي مربع لاستعراض أنشطة اليوم المحدد</span>
          )}
        </div>
      </AppCard>

      {/* 3. GitHub-Style Chronological Activity Stream / Feed */}
      <AppCard as="section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lead font-bold text-foreground">سجل النشاط التفصيلي</h2>
            <p className="text-micro text-muted-foreground">
              {filteredEvents.length} نشاط مرتّب من الأحدث إلى الأقدم
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في سجل الأنشطة…"
              aria-label="بحث في سجل الأنشطة"
              className="ps-8 pe-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="مسح البحث"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-micro hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Banner */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-micro">
            <span className="text-primary font-semibold">
              {selectedDay
                ? `أنشطة يوم ${selectedDay.dateFormattedAr}`
                : 'تصفية مُطبّقة على السجل'}
              {selectedCategory !== 'all' &&
                ` — ${CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.labelAr}`}
            </span>
            <Button variant="link" size="xs" className="gap-1" onClick={resetFilters}>
              <RotateCcw className="w-3 h-3" aria-hidden /> إعادة الضبط
            </Button>
          </div>
        )}

        {/* Activity Feed Grouped by Month */}
        {eventsByMonth.length > 0 ? (
          <div className="space-y-6 pt-1">
            {eventsByMonth.map(([monthKey, events]) => {
              const isCollapsed = collapsedMonths[monthKey] === true;
              const pages = expandedMonthPages[monthKey] ?? 1;
              const visibleEvents = events.slice(0, pages * EVENTS_PER_MONTH_PAGE);
              const remaining = events.length - visibleEvents.length;

              return (
                <div key={monthKey} className="space-y-3">
                  {/* Month Header Divider */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" aria-hidden />
                      <h3 className="text-meta font-bold text-foreground">{monthKey}</h3>
                      <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground tabular-nums">
                        {events.length} نشاط
                      </span>
                    </div>

                    <button
                      onClick={() => toggleMonthCollapse(monthKey)}
                      aria-expanded={!isCollapsed}
                      className="text-micro font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {isCollapsed ? (
                        <>
                          إظهار <ChevronDown className="w-3.5 h-3.5" aria-hidden />
                        </>
                      ) : (
                        <>
                          طي <ChevronUp className="w-3.5 h-3.5" aria-hidden />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Month Events Timeline List */}
                  {!isCollapsed && (
                    <div className="space-y-2">
                      <AppList>
                        {visibleEvents.map((evt) => {
                          const IconComp = getCategoryIcon(evt.category);
                          const evtDate = new Date(evt.timestamp);
                          const dateFormatted = `${evtDate.getDate()} ${MONTH_NAMES_AR[evtDate.getMonth()]}`;
                          const timeFormatted = evtDate.toLocaleTimeString('ar', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <AppRow
                              key={evt.id}
                              as="div"
                              leading={
                                <IconChip size="sm" tone="plain" aria-hidden>
                                  <IconComp className="w-3.5 h-3.5" />
                                </IconChip>
                              }
                              title={evt.titleAr}
                              subtitle={
                                [evt.subtitleAr, evt.detailsAr].filter(Boolean).join(' — ') ||
                                undefined
                              }
                              value={
                                <span className="flex flex-col gap-0.5 text-end">
                                  <span className="font-semibold text-foreground/80 tabular-nums">
                                    {dateFormatted}
                                  </span>
                                  <span className="tabular-nums">{timeFormatted}</span>
                                </span>
                              }
                            />
                          );
                        })}
                      </AppList>

                      {remaining > 0 && (
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() =>
                            setExpandedMonthPages((prev) => ({
                              ...prev,
                              [monthKey]: (prev[monthKey] ?? 1) + 1,
                            }))
                          }
                        >
                          إظهار {Math.min(remaining, EVENTS_PER_MONTH_PAGE)} نشاطاً إضافياً (تبقّى {remaining})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <StateView
            kind="search"
            title="لم يتم العثور على أنشطة مطابقة"
            body="جرّب تغيير فئة البحث أو اختيار فترة زمنية مختلفة لاستعراض سجل المساهمات"
            action={
              hasActiveFilters
                ? { label: 'إعادة ضبط جميع الفلاتر', onClick: resetFilters }
                : undefined
            }
          />
        )}
      </AppCard>

      {/* 4. Cross-Module Statistics Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fitness Card */}
        <AppCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h3 className="text-meta font-bold text-foreground">اللياقة والتتبع</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Fitness</span>
          </div>

          <StatGrid cols={3}>
            <Stat value={summary.totalDistanceKm} label="كم مسافة" />
            <Stat value={summary.totalWorkouts} label="أنشطة" />
            <Stat value={summary.totalCalories} label="سعرة" />
          </StatGrid>
        </AppCard>

        {/* German Club Card */}
        <AppCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h3 className="text-meta font-bold text-foreground">النادي الألماني</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Der Club</span>
          </div>

          <StatGrid cols={3}>
            <Stat value={summary.masteredWords} label="مفردة" />
            <Stat value={`${summary.shelfMasteryPercent}%`} label="إتقان الأرفف" />
            <Stat value={`${summary.surgeStreakDays}d`} label="سلسلة الاندفاع" />
          </StatGrid>
        </AppCard>

        {/* Diwan Poetry Card */}
        <AppCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Feather className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h3 className="text-meta font-bold text-foreground">الديوان والمكتبة</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Diwan</span>
          </div>

          <StatGrid cols={2}>
            <Stat value={summary.savedPoemsCount} label="قصائد محفوظة" />
            <Stat value={`${summary.readingHours}س`} label="ساعات القراءة" />
          </StatGrid>
        </AppCard>

        {/* PKM & Memory Card */}
        <AppCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h3 className="text-meta font-bold text-foreground">الذاكرة والملاحظات</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">PKM</span>
          </div>

          <StatGrid cols={2}>
            <Stat value={summary.activeNotesCount} label="ملاحظات نشطة" />
            <Stat value={summary.journalEntriesCount} label="تدوينات اليوميات" />
          </StatGrid>
        </AppCard>

        {/* Travel Atlas Card */}
        <AppCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h3 className="text-meta font-bold text-foreground">أطلس الأسفار</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Atlas</span>
          </div>

          <StatGrid cols={2}>
            <Stat value={summary.visitedCountriesCount} label="بلدان مستكشفة" />
            <Stat value={summary.travelStampsCount} label="أختام سفر" />
          </StatGrid>
        </AppCard>

        {/* Spiritual Quran & Dhikr Card */}
        <AppCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h3 className="text-meta font-bold text-foreground">الأذكار والقرآن</h3>
            </div>
            <span className="text-micro font-bold text-muted-foreground">Dhikr</span>
          </div>

          <StatGrid cols={2}>
            <Stat value={summary.totalDhikrCount} label="تسبيحة ومودّة" />
            <Stat value={`${summary.dhikrStreakDays}d`} label="سلسلة المواظبة" />
          </StatGrid>
        </AppCard>
      </div>
    </div>
  );
};
