/**
 * Premium exercise picker.
 *
 * A bottom-sheet picker with:
 *  • Search box
 *  • Filter chips: muscle group, equipment, type
 *  • Body silhouette filter — tap a muscle to filter
 *  • Quick toggle "big lifts only"
 *  • Custom exercise creation when no match
 *  • Recent picks for quick re-add
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { Plus, Search, Star, X } from '@/lib/icons';

import {
  type Equipment,
  type Exercise,
  EXERCISE_LIST,
  MUSCLE_LABELS,
  type MuscleGroup,
  TYPE_LABELS,
} from '../../exerciseCatalog';
import BodySilhouette from './BodySilhouette';

export interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (key: string) => void;
  /** Recent exercise keys for quick re-pick. */
  recent?: string[];
  /** When true, custom-text exercise creation is allowed. */
  allowCustom?: boolean;
  lang: 'ar';
}

const T = {
  add: { ar: 'إضافة تمرين', },
  search: { ar: 'ابحث عن تمرين...', },
  custom: { ar: 'تمرين مخصص', },
  all: { ar: 'الكل', },
  bigLifts: { ar: 'مركّبات أساسية', },
  recent: { ar: 'استخدمت مؤخراً', },
  noResults: { ar: 'لا نتائج', },
  byMuscle: { ar: 'حسب العضلة', },
  byType: { ar: 'حسب النوع', },
};

const TYPE_OPTS: ('all' | 'strength' | 'cardio' | 'mobility' | 'plyo' | 'core')[] = [
  'all', 'strength', 'cardio', 'core', 'plyo', 'mobility',
];

const MUSCLE_OPTS: (MuscleGroup | 'all')[] = [
  'all', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'traps', 'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

export default function ExercisePickerSheet({
  open,
  onClose,
  onPick,
  recent = [],
  allowCustom = true,
  lang,
}: ExercisePickerSheetProps) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [type, setType] = useState<typeof TYPE_OPTS[number]>('all');
  const [bigOnly, setBigOnly] = useState(false);
  const [showSilhouette, setShowSilhouette] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return EXERCISE_LIST.filter((e: Exercise) => {
      if (muscle !== 'all' && e.primary !== muscle && !(e.secondary?.includes(muscle))) return false;
      if (type !== 'all' && e.type !== type) return false;
      if (bigOnly && !e.isBigLift) return false;
      if (!query) return true;
      return (
        e.label.ar.toLowerCase().includes(query) ||
        e.key.includes(query)
      );
    });
  }, [q, muscle, type, bigOnly]);

  const recentExercises = useMemo(() => {
    return recent
      .map((k) => EXERCISE_LIST.find((e) => e.key === k))
      .filter((e): e is Exercise => Boolean(e))
      .slice(0, 6);
  }, [recent]);

  const handleClose = () => { setQ(''); setMuscle('all'); setType('all'); setBigOnly(false); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-drawer bg-black/60 flex items-end sm:items-center justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">{T.add[lang]}</h3>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={T.search[lang]}
                  className="w-full bg-card border border-border/40 rounded-xl ps-9 pe-3 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
                  autoFocus
                />
              </div>

              {/* Quick toggles */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setBigOnly((b) => !b)}
                  className={`shrink-0 inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                    bigOnly
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-card text-muted-foreground border-border/40'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  {T.bigLifts[lang]}
                </button>
                <button
                  onClick={() => setShowSilhouette((s) => !s)}
                  className={`shrink-0 text-[0.6875rem] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                    showSilhouette
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border/40'
                  }`}
                >
                  {T.byMuscle[lang]}
                </button>
              </div>

              {/* Body silhouette */}
              {showSilhouette && (
                <div className="flex justify-center bg-card border border-border/40 rounded-2xl p-2">
                  <BodySilhouette
                    view="both"
                    width={280}
                    height={220}
                    highlighted={muscle === 'all' ? [] : [muscle]}
                    onSelect={(m) => setMuscle(m)}
                    activeColor="hsl(var(--primary))"
                    lang={lang}
                  />
                </div>
              )}

              {/* Muscle chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {MUSCLE_OPTS.map((m) => {
                  const active = muscle === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMuscle(m)}
                      className={`shrink-0 text-[0.6875rem] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border/40'
                      }`}
                    >
                      {m === 'all' ? T.all[lang] : MUSCLE_LABELS[m as MuscleGroup][lang]}
                    </button>
                  );
                })}
              </div>

              {/* Type chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {TYPE_OPTS.map((t) => {
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`shrink-0 text-[0.625rem] font-semibold px-2 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-card text-muted-foreground/80 border-border/40'
                      }`}
                    >
                      {t === 'all' ? T.all[lang] : TYPE_LABELS[t as keyof typeof TYPE_LABELS][lang]}
                    </button>
                  );
                })}
              </div>

              {/* Recent */}
              {recentExercises.length > 0 && q.trim() === '' && muscle === 'all' && type === 'all' && (
                <div className="space-y-1.5">
                  <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground/70 font-semibold">{T.recent[lang]}</p>
                  <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
                    {recentExercises.map((e) => (
                      <button
                        key={`r-${e.key}`}
                        onClick={() => { onPick(e.key); handleClose(); }}
                        className="shrink-0 px-3 py-2 rounded-xl bg-primary/10 text-primary text-[0.6875rem] font-semibold border border-primary/30"
                      >
                        {e.label[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="space-y-1">
                {filtered.length === 0 && q.trim() === '' && (
                  <p className="text-[0.75rem] text-muted-foreground text-center py-8">{T.noResults[lang]}</p>
                )}
                {filtered.map((e) => (
                  <ExerciseRow key={e.key} exercise={e} lang={lang} onPick={() => { onPick(e.key); handleClose(); }} />
                ))}
                {allowCustom && q.trim() && filtered.length === 0 && (
                  <button
                    onClick={() => { onPick(`custom:${q.trim()}`); handleClose(); }}
                    className="w-full p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[0.75rem] font-semibold"
                  >
                    + {T.custom[lang]}: "{q.trim()}"
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExerciseRow({ exercise, lang, onPick }: { exercise: Exercise; lang: 'ar'; onPick: () => void }) {
  const e = exercise;
  return (
    <button
      onClick={onPick}
      className="w-full text-start rounded-xl bg-card border border-border/40 p-3 flex items-center justify-between gap-2 active:scale-[0.99] transition-transform"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-bold text-foreground truncate">{e.label[lang]}</p>
        <p className="text-[0.625rem] text-muted-foreground mt-0.5">
          {MUSCLE_LABELS[e.primary][lang]}
          {e.secondary && e.secondary.length > 0 && (
            <span className="opacity-60"> · {e.secondary.map(m => MUSCLE_LABELS[m][lang]).join(', ')}</span>
          )}
          {e.isBigLift && <span className="ms-1.5 text-amber-500">★</span>}
        </p>
      </div>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Plus className="w-4 h-4 text-primary" />
      </div>
    </button>
  );
}

/* ──────────────── Equipment label exporter ──────────────── */

export const EQUIPMENT_BADGE_COLOR: Record<Equipment, string> = {
  barbell:        '#3b82f6',
  dumbbell:       '#8b5cf6',
  machine:        '#64748b',
  bodyweight:     '#10b981',
  kettlebell:     '#f97316',
  cable:          '#06b6d4',
  band:           '#a855f7',
  cardio_machine: '#ef4444',
  none:           '#94a3b8',
};
