/**
 * Calisthenics programs library — browse, view a program detail, and start.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronRight, Clock, Library, Users, X } from '@/lib/icons';
import { CALI_EXP_LABELS, CALI_PROGRAMS, caliProgramByKey, caliProgramsForExperience } from '../caliPrograms';
import type { CaliProgramDef, ProgramExperience } from '../types';
import { skillByKey } from '../caliSkillTree';

export interface CaliProgramViewProps {
  activeKey?: string | null;
  onPickProgram: (key: string) => void;
  lang: 'ar';
  className?: string;
}

const T = {
  title: { ar: 'برامج الكاليستنيكس', },
  subtitle: { ar: 'برامج جاهزة من المبتدئ للنخبة', },
  current: { ar: 'الحالي', },
  start: { ar: 'بدء', },
  details: { ar: 'تفاصيل', },
  daysWk: { ar: 'يوم/أسبوع', },
  weeks: { ar: 'أسابيع', },
  minutes: { ar: 'دقيقة', },
  by: { ar: 'بقلم', },
  highlights: { ar: 'المميزات', },
  prereq: { ar: 'متطلبات', },
  equipment: { ar: 'المعدات', },
  description: { ar: 'الوصف', },
  preview: { ar: 'معاينة الجلسات', },
  exercises: { ar: 'تمارين', },
  skillsCovered: { ar: 'المهارات المغطّاة', },
  all: { ar: 'الكل', },
};

const EXPERIENCE_OPTS: ('all' | ProgramExperience)[] = ['all', 'beginner', 'intermediate', 'advanced'];

export default function CaliProgramView({
  activeKey,
  onPickProgram,
  lang,
  className = '',
}: CaliProgramViewProps) {
  const [expFilter, setExpFilter] = useState<typeof EXPERIENCE_OPTS[number]>('all');
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (expFilter === 'all') return CALI_PROGRAMS;
    return caliProgramsForExperience(expFilter);
  }, [expFilter]);

  const detail = detailKey ? caliProgramByKey(detailKey) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5" />
          {T.title[lang]}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{T.subtitle[lang]}</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {EXPERIENCE_OPTS.map((e) => (
          <button
            key={e}
            onClick={() => setExpFilter(e)}
            className={`shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border ${
              expFilter === e ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border/40'
            }`}
          >
            {e === 'all' ? T.all[lang] : CALI_EXP_LABELS[e][lang]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((p, i) => (
          <CaliProgramCard
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

      <CaliDetailSheet
        program={detail}
        onClose={() => setDetailKey(null)}
        onStart={() => { if (detail) onPickProgram(detail.key); setDetailKey(null); }}
        lang={lang}
      />
    </div>
  );
}

function CaliProgramCard({
  program: p, isActive, onDetails, onStart, lang, delay,
}: { program: CaliProgramDef; isActive: boolean; onDetails: () => void; onStart: () => void; lang: 'ar'; delay: number }) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className={`rounded-2xl p-3.5 border ${
        isActive ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30' : 'bg-card border-border/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          {isActive && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded mb-1">
              {T.current[lang]}
            </span>
          )}
          <h3 className="text-[14px] font-bold text-foreground leading-tight">{p.name[lang]}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{T.by[lang]} {p.author}</p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0"
          style={{
            background: p.experience === 'beginner' ? '#22c55e20' : p.experience === 'intermediate' ? '#f59e0b20' : '#ef444420',
            color: p.experience === 'beginner' ? '#22c55e' : p.experience === 'intermediate' ? '#f59e0b' : '#ef4444',
          }}
        >
          {CALI_EXP_LABELS[p.experience][lang]}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground/90 leading-relaxed mb-2 line-clamp-2">
        {p.description[lang]}
      </p>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <Stat icon={<Calendar className="w-3 h-3" />} value={`${p.daysPerWeek}`} label={T.daysWk[lang]} />
        <Stat icon={<Clock className="w-3 h-3" />} value={`${p.weeks}`} label={T.weeks[lang]} />
        <Stat icon={<Users className="w-3 h-3" />} value={`${p.sessionMinutes}`} label={T.minutes[lang]} />
      </div>

      <div className="flex gap-1.5">
        <button onClick={onDetails} className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-[11px] font-semibold">
          {T.details[lang]}
        </button>
        <button
          onClick={onStart}
          disabled={isActive}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50"
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
        <span className="text-[12px] font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{label}</p>
    </div>
  );
}

function CaliDetailSheet({
  program, onClose, onStart, lang,
}: { program: CaliProgramDef | null; onClose: () => void; onStart: () => void; lang: 'ar' }) {
  const open = !!program;
  const skillsCovered = useMemo(() => {
    if (!program) return [];
    const set = new Set<string>();
    for (const w of program.weekTemplate) {
      for (const s of w.sessions) {
        for (const ex of s.exercises) set.add(ex.skillKey);
      }
    }
    return Array.from(set).map((k) => skillByKey(k)).filter(Boolean);
  }, [program]);

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
                  <h2 className="text-lg font-bold text-foreground">{program.name[lang]}</h2>
                  <p className="text-[11px] text-muted-foreground">{T.by[lang]} {program.author}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Section title={T.description[lang]} body={
                <p className="text-[12px] text-foreground/90 leading-relaxed">{program.description[lang]}</p>
              } />

              <div className="grid grid-cols-3 gap-2">
                <Stat icon={<Calendar className="w-3 h-3" />} value={`${program.daysPerWeek}`} label={T.daysWk[lang]} />
                <Stat icon={<Clock className="w-3 h-3" />} value={`${program.weeks}`} label={T.weeks[lang]} />
                <Stat icon={<Users className="w-3 h-3" />} value={`${program.sessionMinutes}`} label={T.minutes[lang]} />
              </div>

              <Section title={T.highlights[lang]} body={
                <ul className="space-y-1">
                  {program.highlights.map((h, i) => (
                    <li key={i} className="bg-card border border-border/40 rounded-lg p-2 text-[12px]">• {h[lang]}</li>
                  ))}
                </ul>
              } />

              {program.prerequisites && program.prerequisites.length > 0 && (
                <Section title={T.prereq[lang]} body={
                  <ul className="space-y-1">
                    {program.prerequisites.map((s, i) => (
                      <li key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[12px] text-amber-700 dark:text-amber-400">
                        • {s[lang]}
                      </li>
                    ))}
                  </ul>
                } />
              )}

              <Section title={T.equipment[lang]} body={
                <div className="flex flex-wrap gap-1">
                  {program.equipment.map((eq) => (
                    <span key={eq} className="px-2 py-1 rounded-md bg-muted text-[10px] font-semibold text-foreground/90">{eq}</span>
                  ))}
                </div>
              } />

              {/* Skills covered */}
              {skillsCovered.length > 0 && (
                <Section title={T.skillsCovered[lang]} body={
                  <div className="grid grid-cols-2 gap-1.5">
                    {skillsCovered.map((s) => s ? (
                      <div
                        key={s.key}
                        className="rounded-lg bg-card border border-border/40 p-1.5 flex items-center gap-1.5"
                      >
                        <span className="text-[14px]">{s.emoji}</span>
                        <span className="text-[10px] font-semibold text-foreground truncate">{s.name[lang]}</span>
                      </div>
                    ) : null)}
                  </div>
                } />
              )}

              <Section title={T.preview[lang]} body={
                <div className="space-y-1.5">
                  {program.weekTemplate[0]?.sessions.slice(0, 4).map((s) => (
                    <div key={s.key} className="bg-card border border-border/40 rounded-lg p-2.5">
                      <p className="text-[11px] font-bold text-foreground">{s.name[lang]}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{s.exercises.length} {T.exercises[lang]} · {s.estMinutes} {T.minutes[lang]}</p>
                    </div>
                  ))}
                </div>
              } />

              <button
                onClick={onStart}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
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

function Section({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{title}</h4>
      {body}
    </div>
  );
}
