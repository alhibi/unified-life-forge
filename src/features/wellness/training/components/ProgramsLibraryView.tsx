/**
 * Programs Library — browse and start a strength program.
 *
 * Filters by experience and goal. Each card shows author, days/week, weeks
 * total, equipment requirements, and the highlights bullet list.
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { Calendar, ChevronRight, Clock, Filter, Library, Users, X } from '@/lib/icons';

import {
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  programByKey,
  PROGRAMS,
} from '../programsLibrary';
import type { LocalizedString,ProgramDef, ProgramExperience } from '../types';

export interface ProgramsLibraryViewProps {
  /** Currently active program key (drawn highlighted). */
  activeKey?: string | null;
  onPickProgram: (key: string) => void;
  lang: 'ar';
  className?: string;
}

const T = {
  title: { ar: 'مكتبة البرامج', },
  subtitle: { ar: 'اختر برنامجاً لبدء تطور منهجي', },
  current: { ar: 'برنامجك الحالي', },
  filters: { ar: 'تصفية', },
  all: { ar: 'الكل', },
  details: { ar: 'تفاصيل', },
  start: { ar: 'بدء', },
  daysWk: { ar: 'يوم/أسبوع', },
  weeks: { ar: 'أسابيع', },
  minutes: { ar: 'دقيقة/جلسة', },
  by: { ar: 'بقلم', },
  highlights: { ar: 'مميزات', },
  prereq: { ar: 'متطلبات', },
  scheme: { ar: 'النظام', },
  description: { ar: 'الوصف', },
  equipment: { ar: 'المعدات', },
  experience: { ar: 'الخبرة', },
  goal: { ar: 'الهدف', },
};

const EXPERIENCE_OPTS: ('all' | ProgramExperience)[] = ['all', 'beginner', 'intermediate', 'advanced'];
const GOAL_OPTS: ('all' | ProgramDef['goal'])[] = ['all', 'strength', 'hypertrophy', 'powerbuilding', 'general'];

export default function ProgramsLibraryView({
  activeKey,
  onPickProgram,
  lang,
  className = '',
}: ProgramsLibraryViewProps) {
  const [expFilter, setExpFilter] = useState<typeof EXPERIENCE_OPTS[number]>('all');
  const [goalFilter, setGoalFilter] = useState<typeof GOAL_OPTS[number]>('all');
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return PROGRAMS.filter((p) => {
      if (expFilter !== 'all' && p.experience !== expFilter) return false;
      if (goalFilter !== 'all' && p.goal !== goalFilter) return false;
      return true;
    });
  }, [expFilter, goalFilter]);

  const detail = detailKey ? programByKey(detailKey) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <p className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5" />
          {T.title[lang]}
        </p>
        <p className="text-micro text-muted-foreground mt-0.5">{T.subtitle[lang]}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-micro text-muted-foreground/70 font-semibold">
          <Filter className="w-3 h-3" />
          {T.experience[lang]}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {EXPERIENCE_OPTS.map((e) => (
            <button
              key={e}
              onClick={() => setExpFilter(e)}
              className={`shrink-0 text-micro font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                expFilter === e
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border/40'
              }`}
            >
              {e === 'all' ? T.all[lang] : EXPERIENCE_LABELS[e][lang]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-micro text-muted-foreground/70 font-semibold pt-1">
          <Filter className="w-3 h-3" />
          {T.goal[lang]}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {GOAL_OPTS.map((g) => (
            <button
              key={g}
              onClick={() => setGoalFilter(g)}
              className={`shrink-0 text-micro font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                goalFilter === g
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border/40'
              }`}
            >
              {g === 'all' ? T.all[lang] : GOAL_LABELS[g][lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((p, i) => (
          <ProgramCard
            key={p.key}
            program={p}
            isActive={activeKey === p.key}
            onDetails={() => setDetailKey(p.key)}
            onStart={() => onPickProgram(p.key)}
            lang={lang}
            delay={i * 0.04}
          />
        ))}
      </div>

      <DetailSheet
        program={detail}
        onClose={() => setDetailKey(null)}
        onStart={() => { if (detail) onPickProgram(detail.key); setDetailKey(null); }}
        lang={lang}
      />
    </div>
  );
}

function ProgramCard({
  program: p,
  isActive,
  onDetails,
  onStart,
  lang,
  delay,
}: {
  program: ProgramDef;
  isActive: boolean;
  onDetails: () => void;
  onStart: () => void;
  lang: 'ar';
  delay: number;
}) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className={`rounded-2xl p-3.5 border transition-all ${
        isActive
          ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
          : 'bg-card border-border/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          {isActive && (
            <span className="inline-block text-micro font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded mb-1">
              {T.current[lang]}
            </span>
          )}
          <h3 className="text-meta font-bold text-foreground leading-tight">{p.name[lang]}</h3>
          <p className="text-micro text-muted-foreground mt-0.5">{T.by[lang]} {p.author}</p>
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-micro font-bold uppercase"
            style={{
              background: p.experience === 'beginner' ? '#22c55e20' : p.experience === 'intermediate' ? '#f59e0b20' : '#ef444420',
              color: p.experience === 'beginner' ? '#22c55e' : p.experience === 'intermediate' ? '#f59e0b' : '#ef4444',
            }}
          >
            {EXPERIENCE_LABELS[p.experience][lang]}
          </span>
          <span className="px-2 py-0.5 rounded-full text-micro font-bold bg-muted/60 text-muted-foreground">
            {GOAL_LABELS[p.goal][lang]}
          </span>
        </div>
      </div>

      <p className="text-micro text-muted-foreground/90 leading-relaxed mb-2 line-clamp-2">
        {p.description[lang]}
      </p>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <Stat icon={<Calendar className="w-3 h-3" />} value={`${p.daysPerWeek}`} label={T.daysWk[lang]} />
        <Stat icon={<Clock className="w-3 h-3" />} value={`${p.weeks}`} label={T.weeks[lang]} />
        <Stat icon={<Users className="w-3 h-3" />} value={`${p.sessionMinutes}`} label={T.minutes[lang]} />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onDetails}
          className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-micro font-semibold"
        >
          {T.details[lang]}
        </button>
        <button
          onClick={onStart}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-micro font-bold inline-flex items-center justify-center gap-1 active:scale-[0.98]"
          disabled={isActive}
          style={{ opacity: isActive ? 0.5 : 1 }}
        >
          {T.start[lang]} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-mini font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="text-micro text-muted-foreground/70 mt-0.5">{label}</p>
    </div>
  );
}

function DetailSheet({
  program,
  onClose,
  onStart,
  lang,
}: {
  program: ProgramDef | null;
  onClose: () => void;
  onStart: () => void;
  lang: 'ar';
}) {
  const open = !!program;
  return (
    <AnimatePresence>
      {open && program && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-drawer bg-black/60 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3 }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 pb-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lead font-bold text-foreground">{program.name[lang]}</h2>
                  <p className="text-micro text-muted-foreground">{T.by[lang]} {program.author}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.description[lang]}</h4>
                <p className="text-mini text-foreground/90 leading-relaxed">{program.description[lang]}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat icon={<Calendar className="w-3 h-3" />} value={`${program.daysPerWeek}`} label={T.daysWk[lang]} />
                <Stat icon={<Clock className="w-3 h-3" />} value={`${program.weeks}`} label={T.weeks[lang]} />
                <Stat icon={<Users className="w-3 h-3" />} value={`${program.sessionMinutes}`} label={T.minutes[lang]} />
              </div>

              <div className="space-y-1">
                <h4 className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.highlights[lang]}</h4>
                <ul className="space-y-1">
                  {program.highlights.map((h, i) => (
                    <li key={i} className="bg-card border border-border/40 rounded-lg p-2 text-mini text-foreground/90">
                      • {h[lang]}
                    </li>
                  ))}
                </ul>
              </div>

              {program.prerequisites && program.prerequisites.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.prereq[lang]}</h4>
                  <ul className="space-y-1">
                    {program.prerequisites.map((h: LocalizedString, i: number) => (
                      <li key={i} className="bg-warning/10 border border-warning/30 rounded-lg p-2 text-mini text-warning">
                        • {h[lang]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="text-micro uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.equipment[lang]}</h4>
                <div className="flex flex-wrap gap-1">
                  {program.equipment.map((eq) => (
                    <span key={eq} className="px-2 py-1 rounded-md bg-muted text-micro font-semibold text-foreground/90">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-micro text-muted-foreground/70 uppercase tracking-wider font-semibold">{T.scheme[lang]}</p>
                  <p className="text-micro font-semibold text-foreground">{program.scheme[lang]}</p>
                </div>
              </div>

              <button
                onClick={onStart}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-meta font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                {T.start[lang]} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
