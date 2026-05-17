/**
 * Workouts tab — log strength and cardio sessions, track PRs and per-muscle volume.
 *
 * Composition:
 *  • Active session header   — start/finish a session, total volume, RPE
 *  • Exercise list           — picker + set logger + per-set rest timer
 *  • Templates strip         — 8 starter sessions (push/pull/leg/full-body/hiit/mobility)
 *  • Weekly volume bars      — per-muscle-group tonnage rollup
 *  • Personal records strip  — best e1RM per big lift
 *  • Session history         — collapsible past sessions
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Check, ChevronDown, Dumbbell, Flame, History,
  Pause, Play, Plus, RotateCcw, Search, Star, Trash2, Trophy, X, Zap,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { ExerciseEntry, SetEntry, WorkoutSession, UUID, AthleteProfile } from '../wellnessDb';
import { todayIso } from '../wellnessDb';
import {
  EXERCISES, EXERCISE_LIST, MUSCLE_LABELS, TEMPLATES, resolveExercise,
  type MuscleGroup, type Exercise,
} from '../exerciseCatalog';
import {
  bestE1RMFromSets, sessionVolumeKg, sessionLoad,
} from '../athleticEngine';
import { PremiumCard, SectionHeader, EmptyState, SegmentedControl, AnimatedNumber } from './primitives';

interface Props {
  workouts: WorkoutSession[];
  profile: AthleteProfile | null;
  onSave: (s: Omit<WorkoutSession, 'id'> & { id?: UUID }) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const T = {
  noProfile: { ar: 'سجّل وزنك في الملف لتقدير الحجم بدقة.', de: 'Erfasse dein Gewicht im Profil für genauere Volumen.' },
  startSession: { ar: 'ابدأ تمريناً', de: 'Training starten' },
  empty: { ar: 'لا توجد تمارين بعد', de: 'Noch keine Trainings' },
  emptyDesc: { ar: 'سجّل تمرينك الأول وستتعقّب الأرقام لك.', de: 'Logge dein erstes Training, der Rest läuft automatisch.' },
  templates: { ar: 'قوالب', de: 'Vorlagen' },
  exercises: { ar: 'تمارين', de: 'Übungen' },
  inProgress: { ar: 'تمرين جارٍ', de: 'Aktive Session' },
  finish: { ar: 'إنهاء', de: 'Beenden' },
  cancel: { ar: 'إلغاء', de: 'Abbrechen' },
  totalVolume: { ar: 'الحمل الكلي', de: 'Gesamtvolumen' },
  duration: { ar: 'المدة', de: 'Dauer' },
  rpe: { ar: 'صعوبة', de: 'RPE' },
  sets: { ar: 'مجموعات', de: 'Sätze' },
  reps: { ar: 'تكرار', de: 'Wdh' },
  weight: { ar: 'وزن', de: 'kg' },
  add: { ar: 'إضافة', de: 'Hinzufügen' },
  addExercise: { ar: 'إضافة تمرين', de: 'Übung hinzufügen' },
  searchExercise: { ar: 'ابحث عن تمرين...', de: 'Übung suchen...' },
  custom: { ar: 'تمرين مخصص', de: 'Eigene Übung' },
  rest: { ar: 'راحة', de: 'Pause' },
  restDone: { ar: 'انتهت الراحة!', de: 'Pause vorbei!' },
  weeklyVolume: { ar: 'حجم الأسبوع', de: 'Wochenvolumen' },
  weeklyVolumeDesc: { ar: 'مجموع الحمل لكل عضلة في 7 أيام', de: 'Tonnage pro Muskel in 7 Tagen' },
  prs: { ar: 'الأرقام القياسية', de: 'Persönliche Rekorde' },
  history: { ar: 'السجل', de: 'Verlauf' },
  e1rm: { ar: '1RM مقدّر', de: 'gesch. 1RM' },
  noPrs: { ar: 'لم تسجل بعد. ارفع وستسجَّل أرقامك.', de: 'Noch keine Rekorde. Hebe los — sie werden automatisch erfasst.' },
  pickType: { ar: 'النوع', de: 'Typ' },
  strength: { ar: 'قوة', de: 'Kraft' },
  cardio: { ar: 'كارديو', de: 'Cardio' },
  hiit: { ar: 'هيت', de: 'HIIT' },
  mobility: { ar: 'مرونة', de: 'Mobilität' },
  templateStart: { ar: 'بدء', de: 'Start' },
  exercisesIn: { ar: 'تمرين', de: 'Übungen' },
  saved: { ar: 'حُفظ ✓', de: 'Gespeichert ✓' },
  delete: { ar: 'حذف', de: 'Löschen' },
  newPr: { ar: 'رقم قياسي جديد!', de: 'Neuer Rekord!' },
  noEntries: { ar: 'لم تُضف تمارين بعد', de: 'Noch keine Übungen' },
  notes: { ar: 'ملاحظات', de: 'Notizen' },
  optional: { ar: 'اختياري', de: 'optional' },
  filter: { ar: 'تصفية', de: 'Filter' },
  all: { ar: 'الكل', de: 'Alle' },
};

const TYPE_OPTS = ['strength', 'cardio', 'hiit', 'mobility'] as const;
type SessionType = typeof TYPE_OPTS[number];

/* ─────────────────── Active session draft ─────────────────── */

interface Draft {
  id?: UUID;
  date: string;
  startedAt: number;
  type: SessionType;
  title?: string;
  exercises: ExerciseEntry[];
  sessionRpe?: number;
  notes?: string;
}

function blankDraft(type: SessionType = 'strength', title?: string): Draft {
  return {
    date: todayIso(),
    startedAt: Date.now(),
    type,
    title,
    exercises: [],
  };
}

function fmtDuration(ms: number, lang: 'ar' | 'de'): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}${lang === 'ar' ? 'ث' : 's'}`;
  return `${m}${lang === 'ar' ? 'د' : 'm'} ${String(s).padStart(2, '0')}`;
}

/* ─────────────────── Rest timer ─────────────────── */

function RestTimer({ defaultSec, lang }: { defaultSec: number; lang: 'ar' | 'de' }) {
  const [secLeft, setSecLeft] = useState(defaultSec);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          if ('vibrate' in navigator) navigator.vibrate?.(100);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const reset = () => { setSecLeft(defaultSec); setRunning(false); };

  return (
    <div className="flex items-center gap-2 bg-muted/40 rounded-full px-2 py-1">
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
      >
        {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
      <span className="text-[12px] font-bold tabular-nums text-foreground" dir="ltr">
        {String(Math.floor(secLeft / 60)).padStart(1, '0')}:{String(secLeft % 60).padStart(2, '0')}
      </span>
      <button type="button" onClick={reset} className="text-muted-foreground">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <span className="text-[10px] text-muted-foreground/70 ms-1">{T.rest[lang]}</span>
    </div>
  );
}

/* ─────────────────── Exercise picker sheet ─────────────────── */

function ExercisePicker({
  open,
  onClose,
  onPick,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (key: string) => void;
  lang: 'ar' | 'de';
}) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return EXERCISE_LIST.filter((e) => {
      if (muscle !== 'all' && e.primary !== muscle && !(e.secondary?.includes(muscle))) return false;
      if (!query) return true;
      return (
        e.label.ar.toLowerCase().includes(query) ||
        e.label.de.toLowerCase().includes(query) ||
        e.key.includes(query)
      );
    });
  }, [q, muscle]);

  const muscleOptions: (MuscleGroup | 'all')[] = [
    'all', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
    'hamstrings', 'glutes', 'calves', 'core', 'cardio',
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">{T.addExercise[lang]}</h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={T.searchExercise[lang]}
                  className="w-full bg-card border border-border/40 rounded-xl ps-9 pe-3 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
                />
              </div>

              {/* Muscle filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {muscleOptions.map((m) => {
                  const active = muscle === m;
                  const label = m === 'all' ? T.all[lang] : MUSCLE_LABELS[m as MuscleGroup][lang];
                  return (
                    <button
                      key={m}
                      onClick={() => setMuscle(m)}
                      className={`shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border/40'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Results */}
              <div className="space-y-1">
                {filtered.map((e) => (
                  <button
                    key={e.key}
                    onClick={() => { onPick(e.key); onClose(); }}
                    className="w-full text-start rounded-xl bg-card border border-border/40 p-3 active:scale-[0.99] transition-transform flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">{e.label[lang]}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {MUSCLE_LABELS[e.primary][lang]}
                        {e.isBigLift && <span className="ms-1.5 text-amber-500">★</span>}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-primary shrink-0" />
                  </button>
                ))}
                {q.trim() && filtered.length === 0 && (
                  <button
                    onClick={() => { onPick(`custom:${q.trim()}`); onClose(); }}
                    className="w-full p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[12px] font-semibold"
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



/* ─────────────────── Single exercise row in the active session ─────────────────── */

function ExerciseRow({
  entry,
  onChange,
  onRemove,
  lang,
}: {
  entry: ExerciseEntry;
  onChange: (e: ExerciseEntry) => void;
  onRemove: () => void;
  lang: 'ar' | 'de';
}) {
  const ex = resolveExercise(entry.exerciseKey);
  const isCustom = 'isCustom' in ex && ex.isCustom;
  const isCardio = !isCustom && (ex as Exercise).type === 'cardio';

  const updateSet = (i: number, patch: Partial<SetEntry>) => {
    onChange({ ...entry, sets: entry.sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  };
  const addSet = () => {
    const last = entry.sets[entry.sets.length - 1];
    onChange({
      ...entry,
      sets: [...entry.sets, isCardio
        ? { durationSec: last?.durationSec ?? 600, distanceKm: last?.distanceKm ?? 0 }
        : { reps: last?.reps ?? 10, weightKg: last?.weightKg ?? 20 }],
    });
  };
  const removeSet = (i: number) => {
    onChange({ ...entry, sets: entry.sets.filter((_, idx) => idx !== i) });
  };

  return (
    <PremiumCard className="p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-foreground truncate">{ex.label[lang]}</p>
          {!isCustom && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {MUSCLE_LABELS[(ex as Exercise).primary][lang]}
            </p>
          )}
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sets header */}
      <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1" dir="ltr">
        <span className="col-span-1">#</span>
        {isCardio ? (
          <>
            <span className="col-span-5">{lang === 'ar' ? 'مدة' : 'Dauer'}</span>
            <span className="col-span-5">{lang === 'ar' ? 'كم' : 'km'}</span>
          </>
        ) : (
          <>
            <span className="col-span-5">{T.weight[lang]}</span>
            <span className="col-span-5">{T.reps[lang]}</span>
          </>
        )}
        <span className="col-span-1" />
      </div>

      {/* Sets */}
      <div className="space-y-1.5">
        {entry.sets.map((s, i) => (
          <div key={i} className="grid grid-cols-12 gap-1 items-center" dir="ltr">
            <span className="col-span-1 text-[12px] font-bold text-muted-foreground tabular-nums">{i + 1}</span>
            {isCardio ? (
              <>
                <input
                  type="number" inputMode="numeric"
                  value={s.durationSec ? Math.round(s.durationSec / 60) : ''}
                  onChange={(e) => updateSet(i, { durationSec: Math.max(0, parseInt(e.target.value, 10) || 0) * 60 })}
                  placeholder={lang === 'ar' ? 'دقيقة' : 'Min'}
                  className="col-span-5 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[16px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
                />
                <input
                  type="number" inputMode="decimal" step="0.1"
                  value={s.distanceKm ?? ''}
                  onChange={(e) => updateSet(i, { distanceKm: parseFloat(e.target.value) || 0 })}
                  placeholder="km"
                  className="col-span-5 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[16px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
                />
              </>
            ) : (
              <>
                <input
                  type="number" inputMode="decimal" step="0.5"
                  value={s.weightKg ?? ''}
                  onChange={(e) => updateSet(i, { weightKg: parseFloat(e.target.value) || 0 })}
                  placeholder="kg"
                  className="col-span-5 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[16px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
                />
                <input
                  type="number" inputMode="numeric"
                  value={s.reps ?? ''}
                  onChange={(e) => updateSet(i, { reps: parseInt(e.target.value, 10) || 0 })}
                  placeholder={T.reps[lang]}
                  className="col-span-5 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-[16px] tabular-nums text-foreground focus:outline-none focus:border-primary/40"
                />
              </>
            )}
            <button onClick={() => removeSet(i)} className="col-span-1 p-1 text-muted-foreground/50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={addSet}
          className="text-[11px] font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 active:scale-95 transition-transform"
        >
          + {T.sets[lang]}
        </button>
        <RestTimer defaultSec={isCardio ? 60 : 90} lang={lang} />
      </div>
    </PremiumCard>
  );
}

/* ─────────────────── Active session card ─────────────────── */

function ActiveSession({
  draft,
  setDraft,
  onSave,
  onCancel,
  lang,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  lang: 'ar' | 'de';
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const totalVol = useMemo(() => {
    let total = 0;
    for (const e of draft.exercises) {
      for (const s of e.sets) {
        if (s.weightKg && s.reps) total += s.weightKg * s.reps;
      }
    }
    return Math.round(total);
  }, [draft.exercises]);

  const elapsed = Date.now() - draft.startedAt;

  const addExercise = (key: string) => {
    const ex = resolveExercise(key);
    const isCardio = 'isCustom' in ex ? false : (ex as Exercise).type === 'cardio';
    const sets: SetEntry[] = isCardio
      ? [{ durationSec: 600, distanceKm: 0 }]
      : Array.from({ length: ('isCustom' in ex ? 3 : ((ex as Exercise).defaultSets ?? 3)) }, () => ({
          weightKg: 20,
          reps: ('isCustom' in ex ? 10 : ((ex as Exercise).defaultReps ?? 10)),
        }));
    setDraft({ ...draft, exercises: [...draft.exercises, { exerciseKey: key, sets }] });
  };

  const updateExercise = (i: number, patch: ExerciseEntry) => {
    setDraft({ ...draft, exercises: draft.exercises.map((e, idx) => (idx === i ? patch : e)) });
  };
  const removeExercise = (i: number) => {
    setDraft({ ...draft, exercises: draft.exercises.filter((_, idx) => idx !== i) });
  };

  return (
    <PremiumCard gradient accent="hsl(var(--primary))" className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            {T.inProgress[lang]}
          </p>
          {draft.title && (
            <p className="text-[15px] font-bold text-foreground mt-0.5">{draft.title}</p>
          )}
          <SegmentedControl
            segments={TYPE_OPTS.map((t) => ({ value: t, label: T[t][lang] }))}
            value={draft.type}
            onChange={(v) => setDraft({ ...draft, type: v })}
            size="sm"
          />
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/30 rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {T.duration[lang]}
          </div>
          <div className="text-[14px] font-bold tabular-nums text-foreground" dir="ltr">
            {fmtDuration(elapsed, lang)}
          </div>
        </div>
        <div className="bg-muted/30 rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {T.totalVolume[lang]}
          </div>
          <div className="text-[14px] font-bold tabular-nums text-foreground" dir="ltr">
            <AnimatedNumber value={totalVol} digits={0} /> kg
          </div>
        </div>
        <div className="bg-muted/30 rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {T.exercises[lang]}
          </div>
          <div className="text-[14px] font-bold tabular-nums text-foreground" dir="ltr">
            {draft.exercises.length}
          </div>
        </div>
      </div>

      {/* Exercise rows */}
      <div className="space-y-2">
        {draft.exercises.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-muted-foreground">
            {T.noEntries[lang]}
          </div>
        ) : (
          draft.exercises.map((e, i) => (
            <ExerciseRow
              key={i}
              entry={e}
              onChange={(p) => updateExercise(i, p)}
              onRemove={() => removeExercise(i)}
              lang={lang}
            />
          ))
        )}
      </div>

      <button
        onClick={() => setPickerOpen(true)}
        className="w-full py-2.5 rounded-xl bg-primary/10 border border-dashed border-primary/30 text-primary text-[12px] font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
      >
        <Plus className="w-4 h-4" /> {T.addExercise[lang]}
      </button>

      {/* Session RPE */}
      <div className="bg-muted/30 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-foreground">{T.rpe[lang]} (1-10)</span>
          <span className="text-[12px] font-bold text-primary tabular-nums">{draft.sessionRpe ?? '—'}</span>
        </div>
        <input
          type="range" min={1} max={10} step={1}
          value={draft.sessionRpe ?? 5}
          onChange={(e) => setDraft({ ...draft, sessionRpe: parseInt(e.target.value, 10) })}
          className="w-full accent-primary"
          dir="ltr"
        />
      </div>

      {/* Notes */}
      <textarea
        value={draft.notes ?? ''}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        rows={2}
        placeholder={`${T.notes[lang]} (${T.optional[lang]})`}
        className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
        >
          {T.cancel[lang]}
        </button>
        <button
          onClick={onSave}
          disabled={draft.exercises.length === 0}
          className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" /> {T.finish[lang]}
        </button>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} lang={lang} />
    </PremiumCard>
  );
}



/* ─────────────────── Templates strip ─────────────────── */

function Templates({
  onPick,
  lang,
}: {
  onPick: (templateKey: string) => void;
  lang: 'ar' | 'de';
}) {
  return (
    <PremiumCard className="p-4 space-y-3">
      <SectionHeader title={T.templates[lang]} icon={Star} />
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => {
          const Icon =
            t.type === 'strength' ? Dumbbell
            : t.type === 'cardio'   ? Activity
            : t.type === 'hiit'     ? Zap
            : Flame;
          const accent =
            t.type === 'strength' ? '#3b82f6'
            : t.type === 'cardio'   ? '#06b6d4'
            : t.type === 'hiit'     ? '#ef4444'
            : '#a855f7';
          return (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              className="text-start bg-card border border-border/40 rounded-2xl p-3 active:scale-[0.98] transition-transform overflow-hidden relative"
            >
              <div
                aria-hidden
                className="absolute -top-8 -end-8 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                style={{ background: accent, opacity: 0.12 }}
              />
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `${accent}1f` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
              </div>
              <p className="text-[12px] font-bold text-foreground leading-tight">{t.name[lang]}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                {t.description[lang]}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1.5 tabular-nums" dir="ltr">
                {t.exerciseKeys.length} {T.exercisesIn[lang]} · {t.durationMin}min
              </p>
            </button>
          );
        })}
      </div>
    </PremiumCard>
  );
}

/* ─────────────────── Weekly volume per muscle ─────────────────── */

function WeeklyVolume({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' | 'de' }) {
  const data = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    const byMuscle = new Map<MuscleGroup, number>();
    for (const w of workouts) {
      if (w.startedAt < cutoff) continue;
      for (const ex of w.exercises) {
        const def = EXERCISES[ex.exerciseKey];
        if (!def) continue;
        const muscles: MuscleGroup[] = [def.primary, ...(def.secondary ?? [])];
        let exVol = 0;
        for (const s of ex.sets) {
          if (s.weightKg && s.reps) exVol += s.weightKg * s.reps;
        }
        if (exVol === 0) continue;
        for (const m of muscles) {
          byMuscle.set(m, (byMuscle.get(m) ?? 0) + exVol * (m === def.primary ? 1 : 0.5));
        }
      }
    }
    const arr = Array.from(byMuscle.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const max = Math.max(...arr.map((r) => r[1]), 1);
    return { rows: arr, max };
  }, [workouts]);

  if (data.rows.length === 0) return null;

  return (
    <PremiumCard gradient accent="#3b82f6" className="p-4 space-y-3">
      <SectionHeader title={T.weeklyVolume[lang]} subtitle={T.weeklyVolumeDesc[lang]} icon={Trophy} />
      <div className="space-y-2">
        {data.rows.map(([muscle, vol]) => {
          const pct = (vol / data.max) * 100;
          return (
            <div key={muscle} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[11px] font-semibold text-foreground">
                {MUSCLE_LABELS[muscle][lang]}
              </span>
              <div className="flex-1 h-2.5 bg-muted/40 rounded-full overflow-hidden" dir="ltr">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground shrink-0" dir="ltr">
                {Math.round(vol).toLocaleString()} kg
              </span>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}

/* ─────────────────── Personal records ─────────────────── */

function PersonalRecords({ workouts, lang }: { workouts: WorkoutSession[]; lang: 'ar' | 'de' }) {
  const prs = useMemo(() => {
    const map = new Map<string, { e1rm: number; date: string }>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.exerciseKey.startsWith('custom:')) continue;
        const def = EXERCISES[ex.exerciseKey];
        if (!def || def.type !== 'strength') continue;
        const e = bestE1RMFromSets(ex.sets);
        if (e == null) continue;
        const cur = map.get(ex.exerciseKey);
        if (!cur || e > cur.e1rm) map.set(ex.exerciseKey, { e1rm: e, date: w.date });
      }
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v, def: EXERCISES[key] }))
      .sort((a, b) => (b.def?.isBigLift ? 1 : 0) - (a.def?.isBigLift ? 1 : 0))
      .slice(0, 6);
  }, [workouts]);

  return (
    <PremiumCard gradient accent="#fbbf24" className="p-4 space-y-3">
      <SectionHeader title={T.prs[lang]} icon={Trophy} />
      {prs.length === 0 ? (
        <p className="text-[12px] text-muted-foreground text-center py-3">{T.noPrs[lang]}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {prs.map((p) => (
            <div key={p.key} className="rounded-xl bg-muted/30 border border-border/30 p-2.5">
              <div className="flex items-center gap-1.5">
                {p.def?.isBigLift && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                <p className="text-[11px] font-bold text-foreground truncate">
                  {p.def?.label[lang] ?? p.key}
                </p>
              </div>
              <p className="text-[18px] font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5" dir="ltr">
                {p.e1rm.toFixed(1)} <span className="text-[10px] text-muted-foreground">kg</span>
              </p>
              <p className="text-[9px] text-muted-foreground/70 tabular-nums" dir="ltr">{p.date}</p>
            </div>
          ))}
        </div>
      )}
    </PremiumCard>
  );
}

/* ─────────────────── History ─────────────────── */

function HistoryRow({
  w,
  onDelete,
  lang,
}: {
  w: WorkoutSession;
  onDelete: () => void;
  lang: 'ar' | 'de';
}) {
  const [open, setOpen] = useState(false);
  const vol = sessionVolumeKg(w);
  const dur = w.endedAt ? Math.round((w.endedAt - w.startedAt) / 60000) : null;

  return (
    <div className="rounded-xl bg-card border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3 flex items-center justify-between gap-2 active:scale-[0.99] transition-transform text-start"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-foreground truncate">
            {w.title ?? T[w.type as SessionType]?.[lang] ?? w.type}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">
            {w.date}
            {dur != null && <> · {dur}min</>}
            {vol > 0 && <> · {Math.round(vol).toLocaleString()} kg</>}
          </p>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="p-3 space-y-2">
              {w.exercises.map((ex, i) => {
                const def = resolveExercise(ex.exerciseKey);
                return (
                  <div key={i} className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{def.label[lang]}: </span>
                    <span dir="ltr">
                      {ex.sets
                        .map((s) =>
                          s.weightKg && s.reps
                            ? `${s.weightKg}×${s.reps}`
                            : s.durationSec
                            ? `${Math.round(s.durationSec / 60)}min`
                            : '—',
                        )
                        .join(' · ')}
                    </span>
                  </div>
                );
              })}
              <button
                onClick={onDelete}
                className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-2"
              >
                <Trash2 className="w-3 h-3" /> {T.delete[lang]}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────── Main component ─────────────────── */

export default function WorkoutsTab({ workouts, profile, onSave, onDelete }: Props) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Restore draft from sessionStorage so a tab switch doesn't lose work.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('wellness:draft');
      if (raw) setDraft(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try {
      if (draft) sessionStorage.setItem('wellness:draft', JSON.stringify(draft));
      else sessionStorage.removeItem('wellness:draft');
    } catch { /* noop */ }
  }, [draft]);

  const startBlank = (type: SessionType = 'strength') => setDraft(blankDraft(type));
  const startFromTemplate = (templateKey: string) => {
    const t = TEMPLATES.find((x) => x.key === templateKey);
    if (!t) return;
    const exercises: ExerciseEntry[] = t.exerciseKeys.map((k) => {
      const ex = EXERCISES[k];
      const isCardio = ex?.type === 'cardio';
      const sets: SetEntry[] = isCardio
        ? [{ durationSec: 600, distanceKm: 0 }]
        : Array.from({ length: ex?.defaultSets ?? 3 }, () => ({
            weightKg: 20,
            reps: ex?.defaultReps ?? 10,
          }));
      return { exerciseKey: k, sets };
    });
    setDraft({
      ...blankDraft(t.type === 'mobility' ? 'mobility' : t.type),
      title: t.name[lang],
      exercises,
    });
  };

  const finish = async () => {
    if (!draft) return;
    await onSave({
      id: draft.id,
      date: draft.date,
      startedAt: draft.startedAt,
      endedAt: Date.now(),
      type: draft.type,
      title: draft.title,
      exercises: draft.exercises,
      sessionRpe: draft.sessionRpe,
      notes: draft.notes,
    });
    setDraft(null);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {!profile?.weightKg && (
        <motion.div variants={item}>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center px-2">
            {T.noProfile[lang]}
          </p>
        </motion.div>
      )}

      {draft ? (
        <motion.div variants={item}>
          <ActiveSession
            draft={draft}
            setDraft={setDraft}
            onSave={finish}
            onCancel={() => setDraft(null)}
            lang={lang}
          />
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <PremiumCard gradient accent="hsl(var(--primary))" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-foreground">{T.startSession[lang]}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {workouts.length} {T.history[lang]}
                </p>
              </div>
              <button
                onClick={() => startBlank()}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold flex items-center gap-1 active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" /> {T.add[lang]}
              </button>
            </div>
          </PremiumCard>
        </motion.div>
      )}

      <motion.div variants={item}>
        <Templates onPick={startFromTemplate} lang={lang} />
      </motion.div>

      <motion.div variants={item}>
        <WeeklyVolume workouts={workouts} lang={lang} />
      </motion.div>

      <motion.div variants={item}>
        <PersonalRecords workouts={workouts} lang={lang} />
      </motion.div>

      {/* History */}
      <motion.div variants={item} className="space-y-2">
        <SectionHeader title={T.history[lang]} icon={History} />
        {workouts.length === 0 ? (
          <EmptyState icon={Dumbbell} title={T.empty[lang]} description={T.emptyDesc[lang]} />
        ) : (
          <div className="space-y-2">
            {workouts.slice(0, 12).map((w) => (
              <HistoryRow key={w.id} w={w} onDelete={() => onDelete(w.id)} lang={lang} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
