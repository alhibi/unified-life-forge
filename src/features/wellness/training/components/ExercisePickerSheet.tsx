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

import { AppList, AppRow, IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
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
          className="fixed inset-0 z-drawer bg-background/80 flex items-end sm:items-center justify-center"
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
                <h3 className="text-body font-bold text-foreground">{T.add[lang]}</h3>
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
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={T.search[lang]}
                  className="ps-9"
                  autoFocus
                />
              </div>

              {/* Quick toggles */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setBigOnly((b) => !b)}
                  className={`shrink-0 inline-flex items-center gap-1 text-micro font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                    bigOnly
                      ? 'bg-signal text-primary-foreground border-signal'
                      : 'bg-background text-muted-foreground border-border/40'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  {T.bigLifts[lang]}
                </button>
                <button
                  onClick={() => setShowSilhouette((s) => !s)}
                  className={`shrink-0 text-micro font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                    showSilhouette
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border/40'
                  }`}
                >
                  {T.byMuscle[lang]}
                </button>
              </div>

              {/* Body silhouette */}
              {showSilhouette && (
                <div className="app-card app-card-flat flex justify-center p-2">
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
                      className={`shrink-0 text-micro font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border/40'
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
                      className={`shrink-0 text-micro font-semibold px-2 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-muted-foreground-subtle border-border/40'
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
                  <p className="text-micro uppercase tracking-wider text-muted-foreground-subtle font-semibold">{T.recent[lang]}</p>
                  <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
                    {recentExercises.map((e) => (
                      <button
                        key={`r-${e.key}`}
                        onClick={() => { onPick(e.key); handleClose(); }}
                        className="shrink-0 px-3 py-2 rounded-xl bg-primary/10 text-primary text-micro font-semibold border border-primary/30"
                      >
                        {e.label[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="space-y-1.5">
                {filtered.length === 0 && q.trim() === '' && (
                  <StateView
                    kind="search"
                    compact
                    title={T.noResults[lang]}
                    body="لم يطابق البحث أي تمرين في المكتبة — جرّب كلمة أخرى."
                  />
                )}
                {filtered.length > 0 && (
                  <AppList>
                    {filtered.map((e) => (
                      <ExerciseRow key={e.key} exercise={e} lang={lang} onPick={() => { onPick(e.key); handleClose(); }} />
                    ))}
                  </AppList>
                )}
                {allowCustom && q.trim() && filtered.length === 0 && (
                  <Button
                    variant="outline"
                    className="w-full text-primary"
                    onClick={() => { onPick(`custom:${q.trim()}`); handleClose(); }}
                  >
                    + {T.custom[lang]}: "{q.trim()}"
                  </Button>
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
    <AppRow
      onClick={onPick}
      leading={
        <IconChip tone="plain" aria-hidden>
          <Plus className="h-5 w-5" />
        </IconChip>
      }
      title={e.label[lang]}
      subtitle={
        <>
          {MUSCLE_LABELS[e.primary][lang]}
          {e.secondary && e.secondary.length > 0 && (
            <span className="opacity-60"> · {e.secondary.map(m => MUSCLE_LABELS[m][lang]).join(', ')}</span>
          )}
          {e.isBigLift && <span className="ms-1.5 text-signal">★</span>}
        </>
      }
      chevron
    />
  );
}

/* ──────────────── Equipment label exporter ──────────────── */

export const EQUIPMENT_BADGE_COLOR: Record<Equipment, string> = {
  barbell:        'hsl(var(--data-1))',
  dumbbell:       'hsl(var(--data-2))',
  machine:        'hsl(var(--data-3))',
  bodyweight:     'hsl(var(--data-4))',
  kettlebell:     'hsl(var(--data-5))',
  cable:          'hsl(var(--data-6))',
  band:           'hsl(var(--data-2))',
  cardio_machine: 'hsl(var(--destructive))',
  none:           'hsl(var(--muted-foreground))',
};
