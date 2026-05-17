import React, { useMemo, useState } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, Star, Sparkles } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  islamicOccasions,
  getUpcomingOccasions,
  getPastOccasions,
  getDaysUntil,
  formatGregorianDate,
  getTodayHijri,
  formatHijriDate,
  HIJRI_MONTHS,
  toHijri,
} from '@/data/islamicOccasions';
import type { IslamicOccasion, HijriDate } from '@/data/islamicOccasions';

// ─── Accent hex per Tailwind border class ────────────────────────────────────
const ACCENT: Record<string, string> = {
  'border-l-emerald-500': '#10b981',
  'border-l-emerald-600': '#059669',
  'border-l-sky-500':     '#0ea5e9',
  'border-l-violet-500':  '#8b5cf6',
  'border-l-amber-500':   '#f59e0b',
  'border-l-yellow-500':  '#eab308',
  'border-l-yellow-600':  '#ca8a04',
};

// ─── Month-group helpers ──────────────────────────────────────────────────────
interface MonthGroup {
  monthName: string;
  monthIndex: number; // 1-based
  year: number;
  occasions: IslamicOccasion[];
}

function groupByHijriMonth(occasions: IslamicOccasion[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const occ of occasions) {
    const h: HijriDate = toHijri(new Date(occ.gregorianDate));
    const key = `${h.year}-${h.month}`;
    if (!map.has(key)) {
      map.set(key, {
        monthName: h.monthName,
        monthIndex: h.month,
        year: h.year,
        occasions: [],
      });
    }
    map.get(key)!.occasions.push(occ);
  }
  return Array.from(map.values());
}

// ─── Single occasion card ─────────────────────────────────────────────────────
function OccasionCard({
  occasion,
  isPast,
  t,
  language,
}: {
  occasion: IslamicOccasion;
  isPast?: boolean;
  t: (k: string) => string;
  language: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft  = getDaysUntil(occasion.gregorianDate);
  const isToday   = daysLeft === 0;
  const accent    = ACCENT[occasion.color] ?? '#10b981';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isPast ? 0.65 : 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden"
      style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
      <button
        className="w-full text-right px-4 py-3 flex items-center gap-3"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Day badge */}
        <div
          className="flex flex-col items-center justify-center min-w-[46px] rounded-xl py-2"
          style={{ background: `${accent}18` }}
        >
          <span className="text-[22px] font-black leading-none" style={{ color: accent }}>
            {occasion.hijriDay}
          </span>
          <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight font-medium">
            {occasion.hijriMonth}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-foreground leading-snug flex-1">
              {occasion.name}
            </h3>
            {isToday && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${accent}20`, color: accent }}
              >
                {language === 'ar' ? 'اليوم' : 'Today'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatGregorianDate(occasion.gregorianDate)}
            {' · '}
            {isPast ? (
              <span className="text-muted-foreground/60">{t('occasions.past')}</span>
            ) : isToday ? (
              <span className="font-semibold" style={{ color: accent }}>
                {t('occasions.today')}
              </span>
            ) : (
              <span>
                {t('occasions.after')} <span className="font-semibold tabular-nums">{daysLeft}</span> {t('occasions.day')}
              </span>
            )}
          </p>
        </div>

        {/* Expand chevron */}
        <ChevronRight
          className="w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Expandable description */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="desc"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 text-[12px] text-muted-foreground leading-relaxed border-t border-border/30"
              dir="rtl"
            >
              {occasion.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Month section header ──────────────────────────────────────────────────────
function MonthHeader({ group, language }: { group: MonthGroup; language: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-2">
      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-muted/50 shrink-0">
        <span className="text-[11px] font-black text-primary leading-none">{group.monthIndex}</span>
        <span className="text-[7px] text-muted-foreground mt-0.5 leading-none font-medium">
          {language === 'ar' ? 'هجري' : 'H'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-[15px] font-black text-foreground">{group.monthName}</h2>
        <p className="text-[10px] text-muted-foreground">{group.year} هـ</p>
      </div>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}

// ─── Today Hijri hero banner ───────────────────────────────────────────────────
function HijriHero({ hijri, language }: { hijri: HijriDate; language: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/20 px-5 py-4 flex items-center gap-4">
      <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0" dir="rtl">
        <p className="text-[10px] font-semibold tracking-wide text-primary/80 uppercase mb-0.5">
          {language === 'ar' ? 'التاريخ الهجري اليوم' : "Today's Hijri Date"}
        </p>
        <p className="text-[20px] font-black text-foreground leading-tight">
          {formatHijriDate(hijri)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Month selector tabs ───────────────────────────────────────────────────────
function MonthTabs({
  groups,
  activeKey,
  onSelect,
}: {
  groups: MonthGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      dir="rtl"
    >
      {groups.map(g => {
        const key = `${g.year}-${g.monthIndex}`;
        const isActive = key === activeKey;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            {g.monthName}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AllOccasions() {
  const { t, language } = useApp();
  const hijri    = useMemo(() => getTodayHijri(), []);
  const upcoming = useMemo(() => getUpcomingOccasions(), []);
  const past     = useMemo(() => getPastOccasions(), []);

  const upcomingGroups = useMemo(() => groupByHijriMonth(upcoming), [upcoming]);
  const pastGroups     = useMemo(() => groupByHijriMonth(past), [past]);

  const allGroups   = useMemo(() => [...upcomingGroups, ...pastGroups], [upcomingGroups, pastGroups]);
  const firstKey    = allGroups[0] ? `${allGroups[0].year}-${allGroups[0].monthIndex}` : '';
  const [activeTab, setActiveTab] = useState(firstKey);

  const activeGroup = useMemo(
    () => allGroups.find(g => `${g.year}-${g.monthIndex}` === activeTab),
    [allGroups, activeTab]
  );
  const isActivePast = useMemo(
    () => pastGroups.some(g => `${g.year}-${g.monthIndex}` === activeTab),
    [pastGroups, activeTab]
  );

  // count upcoming occasions
  const upcomingCount = upcoming.length;
  const nextOcc       = upcoming[0];
  const daysToNext    = nextOcc ? getDaysUntil(nextOcc.gregorianDate) : null;

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      <SEO
        title="التقويم الهجري — SmartHub"
        description="التقويم الهجري الكامل للمناسبات الإسلامية مع التاريخ الهجري والعد التنازلي."
        path="/occasions"
      />
      <div className="max-w-lg mx-auto space-y-5">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-black text-foreground leading-tight">
              {language === 'ar' ? 'التقويم الهجري' : 'Hijri Calendar'}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {language === 'ar'
                ? `${upcomingCount} مناسبة قادمة · 1447 هـ`
                : `${upcomingCount} upcoming · 1447 AH`}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* ── Today Hijri hero ──────────────────────────────────────── */}
        <HijriHero hijri={hijri} language={language} />

        {/* ── Next occasion callout ─────────────────────────────────── */}
        {nextOcc && daysToNext !== null && (
          <div className="rounded-2xl border border-border/50 bg-card/60 px-4 py-3 flex items-center gap-3">
            <Star className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0" dir="rtl">
              <p className="text-[10px] text-muted-foreground">
                {language === 'ar' ? 'المناسبة القادمة' : 'Next occasion'}
              </p>
              <p className="text-[13px] font-bold text-foreground truncate">{nextOcc.name}</p>
            </div>
            <span
              className="text-[11px] font-black tabular-nums px-2.5 py-1 rounded-full bg-primary/10 text-primary shrink-0"
            >
              {daysToNext === 0
                ? (language === 'ar' ? 'اليوم' : 'Today')
                : language === 'ar'
                  ? `${daysToNext} يوم`
                  : `${daysToNext}d`}
            </span>
          </div>
        )}

        {/* ── Month tabs ────────────────────────────────────────────── */}
        {allGroups.length > 1 && (
          <MonthTabs
            groups={allGroups}
            activeKey={activeTab}
            onSelect={setActiveTab}
          />
        )}

        {/* ── Active month occasions ────────────────────────────────── */}
        {activeGroup && (
          <motion.section
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <MonthHeader group={activeGroup} language={language} />
            <div className="space-y-2.5">
              {activeGroup.occasions.map(occ => (
                <OccasionCard
                  key={occ.id}
                  occasion={occ}
                  isPast={isActivePast}
                  t={t}
                  language={language}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── All months fallback (no tab selected) ─────────────────── */}
        {!activeGroup && (
          <>
            {upcomingGroups.map(group => {
              const key = `${group.year}-${group.monthIndex}`;
              return (
                <section key={key} className="space-y-3">
                  <MonthHeader group={group} language={language} />
                  <div className="space-y-2.5">
                    {group.occasions.map(occ => (
                      <OccasionCard key={occ.id} occasion={occ} t={t} language={language} />
                    ))}
                  </div>
                </section>
              );
            })}

            {pastGroups.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-[13px] font-bold text-muted-foreground">
                    {t('occasions.pastTitle')}
                  </h2>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                {pastGroups.map(group => {
                  const key = `${group.year}-${group.monthIndex}`;
                  return (
                    <section key={key} className="space-y-3">
                      <MonthHeader group={group} language={language} />
                      <div className="space-y-2.5">
                        {group.occasions.map(occ => (
                          <OccasionCard key={occ.id} occasion={occ} isPast t={t} language={language} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
