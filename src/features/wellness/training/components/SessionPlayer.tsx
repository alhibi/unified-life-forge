/**
 * Active Session Player — the main "I'm training right now" interface.
 *
 * Owns the running draft of a session: exercises, sets, RPE, notes. Handles
 *   • Add/remove exercises via picker
 *   • Per-set entry with RPE
 *   • Mark sets done → auto-fires rest timer
 *   • Open coaching cue card per exercise
 *   • Open warm-up sheet per exercise
 *   • Open plate calculator (compact widget)
 *   • Save the session → triggers PR detection in the parent
 *
 * Strictly UI — persistence is the parent's job (passed via `onFinish`).
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calculator, Flame, Plus, Save,
  Trash2, X,
} from '@/lib/icons';
import type {
  ExerciseEntry,
  SetEntry,
  UUID,
  WorkoutSession,
} from '../../wellnessDb';
import { todayIso } from '../../wellnessDb';
import {
  EXERCISES,
  resolveExercise,
  type Exercise,
  MUSCLE_LABELS,
} from '../../exerciseCatalog';
import { sessionVolumeKg } from '../progressionEngine';
import ExercisePickerSheet from './ExercisePickerSheet';
import CueCardSheet from './CueCardSheet';
import WarmupSheet from './WarmupSheet';
import RestTimer from './RestTimer';
import RpeRirPicker from './RpeRirPicker';
import SetRow from './SetRow';
import PlateCalculator from './PlateCalculator';
import { confirmDialog } from '@/lib/confirmDialog';

export type SessionType = 'strength' | 'cardio' | 'hiit' | 'mobility' | 'sport';

export interface SessionPlayerProps {
  /** When the user explicitly cancels. */
  onCancel: () => void;
  /** When the user finishes — caller should persist & detect PRs. */
  onFinish: (s: Omit<WorkoutSession, 'id'> & { id?: UUID }) => Promise<void>;
  /** Optional preloaded draft (for resume / template). */
  initial?: {
    title?: string;
    type?: SessionType;
    exercises?: ExerciseEntry[];
    sessionRpe?: number;
    notes?: string;
  };
  /** Recent exercises for quick add. */
  recentExercises?: string[];
  /** Last-session lookup for "previous performance" hints. */
  lastByExercise?: Map<string, { weightKg?: number; reps?: number }>;
  lang: 'ar';
}

interface Draft {
  title?: string;
  type: SessionType;
  startedAt: number;
  exercises: ExerciseEntry[];
  /** ISO date YYYY-MM-DD */
  date: string;
  sessionRpe?: number;
  notes?: string;
}

const T = {
  active: { ar: 'تمرين جارٍ', },
  finish: { ar: 'إنهاء وحفظ', },
  cancel: { ar: 'إلغاء', },
  duration: { ar: 'المدة', },
  volume: { ar: 'الحجم', },
  exercises: { ar: 'تمارين', },
  noEntries: { ar: 'لم تُضف تمارين بعد — ابدأ بإضافة أول تمرين.', },
  addExercise: { ar: 'إضافة تمرين', },
  addSet: { ar: 'إضافة مجموعة', },
  notes: { ar: 'ملاحظات', },
  optional: { ar: 'اختياري', },
  sessionRpe: { ar: 'صعوبة الجلسة', },
  cues: { ar: 'تعليمات الفورم', },
  warmup: { ar: 'إحماء', },
  plate: { ar: 'حساب الأوزان', },
  remove: { ar: 'حذف', },
  prev: { ar: 'سابقاً', },
  type_strength: { ar: 'قوة', },
  type_cardio: { ar: 'كارديو', },
  type_hiit: { ar: 'هيت', },
  type_mobility: { ar: 'مرونة', },
  type_sport: { ar: 'رياضة', },
  cancelConfirm: { ar: 'إلغاء التمرين بدون حفظ؟', },
  setComplete: { ar: 'مجموعة مكتملة', },
};

const TYPE_OPTS: SessionType[] = ['strength', 'cardio', 'hiit', 'mobility'];

function fmtDuration(ms: number, lang: 'ar'): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}${'ث'}`;
  return `${m}${'د'} ${String(s).padStart(2, '0')}`;
}

export default function SessionPlayer({
  onCancel,
  onFinish,
  initial,
  recentExercises = [],
  lastByExercise,
  lang,
}: SessionPlayerProps) {
  const [draft, setDraft] = useState<Draft>(() => ({
    title: initial?.title,
    type: initial?.type ?? 'strength',
    startedAt: Date.now(),
    exercises: initial?.exercises ?? [],
    date: todayIso(),
    sessionRpe: initial?.sessionRpe,
    notes: initial?.notes,
  }));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [cueExercise, setCueExercise] = useState<string | null>(null);
  const [warmupExercise, setWarmupExercise] = useState<{ key: string; label: string; weight: number } | null>(null);
  const [restOpen, setRestOpen] = useState<{ sec: number } | null>(null);
  const [plateOpen, setPlateOpen] = useState<{ initial: number } | null>(null);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());

  // Tick the elapsed clock
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Date.now() - draft.startedAt;
  const totalVol = useMemo(
    () => Math.round(sessionVolumeKg({ ...draft, id: 'temp', endedAt: Date.now() } as WorkoutSession)),
    [draft],
  );

  /* ────────── Draft mutations ────────── */

  const addExercise = useCallback((key: string) => {
    const ex = resolveExercise(key);
    const isCardio = 'isCustom' in ex ? false : (ex as Exercise).type === 'cardio';
    const defaultSets = 'isCustom' in ex ? 3 : ((ex as Exercise).defaultSets ?? 3);
    const defaultReps = 'isCustom' in ex ? 10 : ((ex as Exercise).defaultReps ?? 10);

    const last = lastByExercise?.get(key);
    const initWeight = last?.weightKg ?? 20;
    const initReps = last?.reps ?? defaultReps;

    const sets: SetEntry[] = isCardio
      ? Array.from({ length: defaultSets }, () => ({ durationSec: 600, distanceKm: 0 }))
      : Array.from({ length: defaultSets }, () => ({ weightKg: initWeight, reps: initReps }));

    setDraft((d) => ({ ...d, exercises: [...d.exercises, { exerciseKey: key, sets }] }));
  }, [lastByExercise]);

  const updateExercise = (i: number, patch: ExerciseEntry) => {
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e, idx) => idx === i ? patch : e) }));
  };

  const removeExercise = (i: number) => {
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, idx) => idx !== i) }));
  };

  const addSet = (exIdx: number) => {
    setDraft((d) => {
      const ex = d.exercises[exIdx];
      const last = ex.sets[ex.sets.length - 1];
      const def = resolveExercise(ex.exerciseKey);
      const isCardio = 'isCustom' in def ? false : (def as Exercise).type === 'cardio';
      const next: SetEntry = isCardio
        ? { durationSec: last?.durationSec ?? 600, distanceKm: last?.distanceKm ?? 0 }
        : { weightKg: last?.weightKg ?? 20, reps: last?.reps ?? 10 };
      return {
        ...d,
        exercises: d.exercises.map((e, idx) => idx === exIdx ? { ...e, sets: [...e.sets, next] } : e),
      };
    });
  };

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetEntry>) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, ei) => ei !== exIdx ? e : {
        ...e,
        sets: e.sets.map((s, si) => si === setIdx ? { ...s, ...patch } : s),
      }),
    }));
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, ei) => ei !== exIdx ? e : {
        ...e,
        sets: e.sets.filter((_, si) => si !== setIdx),
      }),
    }));
  };

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    const id = `${exIdx}-${setIdx}`;
    const next = new Set(completedSets);
    const becomingDone = !next.has(id);
    if (becomingDone) {
      next.add(id);
      // Auto-open rest timer with a sensible default for the lift.
      const exKey = draft.exercises[exIdx].exerciseKey;
      const def = resolveExercise(exKey);
      const isCompound = 'isCustom' in def ? false : (def as Exercise).isBigLift;
 const restSec = isCompound ? 180 : 90;
 setRestOpen({ sec: restSec });
 } else {
 next.delete(id);
 }
 setCompletedSets(next);
 };

 /* ────────── Finish ────────── */

 const handleFinish = async () => {
 if (draft.exercises.length === 0) return;
 await onFinish({
 date: draft.date,
 startedAt: draft.startedAt,
 endedAt: Date.now(),
 type: draft.type,
 title: draft.title,
 exercises: draft.exercises,
 sessionRpe: draft.sessionRpe,
 notes: draft.notes,
 });
 };

 const handleCancel = async () => {
 if (draft.exercises.length === 0) { onCancel(); return; }
 const ok = await confirmDialog({
 message: T.cancelConfirm[lang],
 destructive: true,
 });
 if (ok) onCancel();
 };

 /* ────────── Render ────────── */

 return (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.2 }}
 className="rounded-2xl border-2 border-primary/30 p-4 space-y-3"
 >
 {/* Header */}
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0 flex-1">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-primary inline-flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
 {T.active[lang]}
 </p>
 {draft.title && (
 <p className="text-[15px] font-bold text-foreground mt-0.5 truncate">{draft.title}</p>
 )}
 {/* Type segmented */}
 <div className="mt-2 inline-flex bg-muted/50 rounded-lg p-0.5">
 {TYPE_OPTS.map((t) => (
 <button
 key={t}
 onClick={() => setDraft((d) => ({ ...d, type: t }))}
 className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
 draft.type === t ? 'bg-card text-foreground ' : 'text-muted-foreground'
                }`}
              >
                {(T as Record<string, { ar: string; }>)[`type_${t}`][lang]}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          aria-label="cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label={T.duration[lang]} value={fmtDuration(elapsed, lang)} />
        <Stat label={T.volume[lang]} value={`${totalVol} kg`} />
        <Stat label={T.exercises[lang]} value={`${draft.exercises.length}`} />
      </div>

      {/* Exercises */}
      <div className="space-y-2">
        {draft.exercises.length === 0 ? (
          <p className="text-[12px] text-center py-6 text-muted-foreground">{T.noEntries[lang]}</p>
        ) : (
          draft.exercises.map((entry, i) => (
            <ExerciseBlock
              key={`${entry.exerciseKey}-${i}`}
              entry={entry}
              index={i}
              completedSets={completedSets}
              previous={lastByExercise?.get(entry.exerciseKey)}
              onUpdate={(patch) => updateExercise(i, patch)}
              onRemove={() => removeExercise(i)}
              onAddSet={() => addSet(i)}
              onUpdateSet={(si, p) => updateSet(i, si, p)}
              onRemoveSet={(si) => removeSet(i, si)}
              onToggleSetComplete={(si) => toggleSetComplete(i, si)}
              onShowCues={() => setCueExercise(entry.exerciseKey)}
              onShowWarmup={(label, weight) => setWarmupExercise({ key: entry.exerciseKey, label, weight })}
              onOpenPlate={(weight) => setPlateOpen({ initial: weight })}
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
      <div className="bg-card rounded-xl p-3 border border-border/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-foreground">{T.sessionRpe[lang]}</span>
        </div>
        <RpeRirPicker
          value={draft.sessionRpe ?? null}
          onChange={(v) => setDraft((d) => ({ ...d, sessionRpe: v }))}
          lang={lang}
          size="sm"
        />
      </div>

      {/* Notes */}
      <textarea
        value={draft.notes ?? ''}
        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        rows={2}
        placeholder={`${T.notes[lang]} (${T.optional[lang]})`}
        className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold"
        >
          {T.cancel[lang]}
        </button>
        <button
          onClick={handleFinish}
          disabled={draft.exercises.length === 0}
          className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
        >
          <Save className="w-4 h-4" /> {T.finish[lang]}
        </button>
      </div>

      {/* Sub-sheets */}
      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        recent={recentExercises}
        lang={lang}
      />
      <CueCardSheet
        open={cueExercise != null}
        exerciseKey={cueExercise}
        exerciseLabel={cueExercise ? labelFor(cueExercise, lang) : undefined}
        onClose={() => setCueExercise(null)}
        lang={lang}
      />
      {warmupExercise && (
        <WarmupSheet
          open={true}
          onClose={() => setWarmupExercise(null)}
          exerciseKey={warmupExercise.key}
          exerciseLabel={warmupExercise.label}
          workingKg={warmupExercise.weight}
          lang={lang}
        />
      )}
      {restOpen && (
        <RestTimer
          defaultSec={restOpen.sec}
          autoStart
          onComplete={() => { /* timer keeps running visually until close */ }}
          onClose={() => setRestOpen(null)}
          lang={lang}
        />
      )}

      {/* Plate calculator sheet */}
      <AnimatePresence>
        {plateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setPlateOpen(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3 }}
              className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{T.plate[lang]}</h3>
                  <button onClick={() => setPlateOpen(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <PlateCalculator initialKg={plateOpen.initial} lang={lang} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────── Exercise block ──────────────── */

function ExerciseBlock({
  entry, index, completedSets, previous,
  onUpdate, onRemove, onAddSet, onUpdateSet, onRemoveSet, onToggleSetComplete,
  onShowCues, onShowWarmup, onOpenPlate,
  lang,
}: {
  entry: ExerciseEntry;
  index: number;
  completedSets: Set<string>;
  previous?: { weightKg?: number; reps?: number };
  onUpdate: (e: ExerciseEntry) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (i: number, p: Partial<SetEntry>) => void;
  onRemoveSet: (i: number) => void;
  onToggleSetComplete: (i: number) => void;
  onShowCues: () => void;
  onShowWarmup: (label: string, weight: number) => void;
  onOpenPlate: (weight: number) => void;
  lang: 'ar';
}) {
  const def = resolveExercise(entry.exerciseKey);
  const ex = (def as Exercise);
  const isCustom = 'isCustom' in def && def.isCustom;
  const isCardio = !isCustom && ex.type === 'cardio';
  const label = isCustom ? (def as { label: { ar: string; } }).label[lang] : ex.label[lang];
  const muscle = isCustom ? '' : MUSCLE_LABELS[ex.primary]?.[lang];
  const lastSetWeight = entry.sets[entry.sets.length - 1]?.weightKg ?? 0;

  return (
    <div className="rounded-xl bg-card border border-border/40 p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-foreground truncate">{label}</p>
            {!isCustom && ex.isBigLift && <span className="text-amber-500 text-[10px]">★</span>}
          </div>
          {muscle && <p className="text-[10px] text-muted-foreground">{muscle}</p>}
          {previous && (
            <p className="text-[10px] text-muted-foreground/70 tabular-nums" dir="ltr">
              {T.prev[lang]}: {previous.weightKg ?? '—'} kg × {previous.reps ?? '—'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isCustom && (
            <button
              onClick={onShowCues}
              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-primary flex items-center justify-center"
              title={T.cues[lang]}
              aria-label={T.cues[lang]}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}
          {!isCardio && lastSetWeight >= 30 && (
            <button
              onClick={() => onShowWarmup(label, lastSetWeight)}
              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-orange-500 flex items-center justify-center"
              title={T.warmup[lang]}
              aria-label={T.warmup[lang]}
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
          )}
          {!isCardio && lastSetWeight >= 25 && (
            <button
              onClick={() => onOpenPlate(lastSetWeight)}
              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-blue-500 flex items-center justify-center"
              title={T.plate[lang]}
              aria-label={T.plate[lang]}
            >
              <Calculator className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
            aria-label={T.remove[lang]}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {entry.sets.map((s, si) => (
          <SetRow
            key={si}
            index={si}
            set={s}
            isCardio={isCardio}
            isCompleted={completedSets.has(`${index}-${si}`)}
            suggestion={previous}
            onChange={(p) => onUpdateSet(si, p)}
            onRemove={() => onRemoveSet(si)}
            onComplete={() => onToggleSetComplete(si)}
            showRpe={!isCardio}
            lang={lang}
          />
        ))}
      </div>

      <button
        onClick={onAddSet}
        className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold inline-flex items-center justify-center gap-1 active:scale-[0.98]"
      >
        <Plus className="w-3 h-3" /> {T.addSet[lang]}
      </button>

      {/* Per-exercise notes */}
      <input
        value={entry.notes ?? ''}
        onChange={(e) => onUpdate({ ...entry, notes: e.target.value })}
        placeholder={`${T.notes[lang]} (${T.optional[lang]})`}
        className="w-full bg-muted/30 border border-border/30 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-primary/40"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl p-2 text-center border border-border/30">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</p>
      <p className="text-[14px] font-bold tabular-nums text-foreground" dir="ltr">{value}</p>
    </div>
  );
}

function labelFor(key: string, lang: 'ar'): string {
  if (key.startsWith('custom:')) return key.slice(7);
  const ex = EXERCISES[key];
  return ex?.label[lang] ?? key;
}
