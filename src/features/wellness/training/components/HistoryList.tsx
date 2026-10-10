/**
 * Workout history — collapsible list of past sessions, sorted newest-first.
 *
 * Features:
 *   • Filters: type (strength/cardio/hiit/mobility), exercise, date range
 *   • Per-row expand: see all exercises, sets, RPE, notes
 *   • Delete a session
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StateView } from '@/components/ui/state-view';
import { confirmDialog } from '@/lib/confirmDialog';
import { Calendar, ChevronDown, Search, Trash2 } from '@/lib/icons';

import { type Exercise,resolveExercise } from '../../exerciseCatalog';
import type { UUID, WorkoutSession } from '../../wellnessDb';
import { sessionVolumeKg } from '../progressionEngine';

export interface HistoryListProps {
  workouts: WorkoutSession[];
  onDelete: (id: UUID) => Promise<void>;
  lang: 'ar';
  className?: string;
}

const T = {
  title: { ar: 'السجل', },
  empty: { ar: 'لا تمارين سابقة بعد.', },
  search: { ar: 'بحث في تمارين أو ملاحظات...', },
  all: { ar: 'الكل', },
  strength: { ar: 'قوة', },
  cardio: { ar: 'كارديو', },
  hiit: { ar: 'هيت', },
  mobility: { ar: 'مرونة', },
  sport: { ar: 'رياضة', },
  duration: { ar: 'المدة', },
  volume: { ar: 'الحمل', },
  rpe: { ar: 'RPE', },
  delete: { ar: 'حذف', },
  confirmDelete: { ar: 'حذف هذا التمرين؟', },
};

const TYPE_OPTS = ['all', 'strength', 'cardio', 'hiit', 'mobility', 'sport'] as const;

function fmtDate(iso: string, _lang: 'ar'): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function fmtDuration(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  if (m === 0) return `${sec}s`;
  return `${m}m`;
}

export default function HistoryList({ workouts, onDelete, lang, className = '' }: HistoryListProps) {
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<typeof TYPE_OPTS[number]>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return workouts.filter((w) => {
      if (typeFilter !== 'all' && w.type !== typeFilter) return false;
      if (!query) return true;
      const hit =
        (w.title ?? '').toLowerCase().includes(query) ||
        (w.notes ?? '').toLowerCase().includes(query) ||
        w.exercises.some((ex) => ex.exerciseKey.toLowerCase().includes(query));
      return hit;
    });
  }, [workouts, q, typeFilter]);

  if (workouts.length === 0) {
    return (
      <StateView
        kind="empty"
        compact
        className={className}
        title={T.empty[lang]}
        body="ابدأ أول جلسة من تبويب تدريب وستظهر هنا تلقائياً."
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={T.search[lang]}
            className="ps-8 text-mini"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {TYPE_OPTS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            aria-pressed={typeFilter === t}
            className={`shrink-0 text-micro font-semibold px-2 py-1 rounded-full border ${
              typeFilter === t ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border/40'
            }`}
          >
            {t === 'all' ? T.all[lang] : (T as Record<string, { ar: string; }>)[t][lang]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((w) => (
          <SessionRow
            key={w.id}
            session={w}
            expanded={expandedId === w.id}
            onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
            onDelete={onDelete}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  expanded,
  onToggle,
  onDelete,
  lang,
}: {
  session: WorkoutSession;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: UUID) => Promise<void>;
  lang: 'ar';
}) {
  const vol = sessionVolumeKg(session);
  const dur = session.endedAt ? session.endedAt - session.startedAt : 0;
  const exCount = session.exercises.length;
  const setCount = session.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-card overflow-hidden p-0"
    >
      <button
        onClick={onToggle}
        className="w-full p-3 text-start flex items-center justify-between gap-2"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-micro text-muted-foreground tabular-nums" dir="ltr">{fmtDate(session.date, lang)}</span>
            <span className="text-micro uppercase tracking-wider text-muted-foreground-subtle font-semibold">
              {(T as Record<string, { ar: string; }>)[session.type]?.[lang] ?? session.type}
            </span>
          </div>
          {session.title && (
            <p className="text-mini font-bold text-foreground mt-0.5 truncate">{session.title}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-micro text-muted-foreground" dir="ltr">
            <span className="tabular-nums">{exCount} ex / {setCount} sets</span>
            {vol > 0 && <span className="tabular-nums">{Math.round(vol)} kg</span>}
            {dur > 0 && <span className="tabular-nums">{fmtDuration(dur)}</span>}
            {session.sessionRpe && <span className="tabular-nums">RPE {session.sessionRpe}</span>}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 border-t border-border/40 space-y-2">
              {session.exercises.map((ex, i) => {
                const def = resolveExercise(ex.exerciseKey) as Exercise | { isCustom: true; label: { ar: string; } };
                const label = 'isCustom' in def && def.isCustom ? def.label[lang] : (def as Exercise).label[lang];
                return (
                  <div key={i} className="bg-muted/30 rounded-lg p-2 space-y-1">
                    <p className="text-mini font-bold text-foreground">{label}</p>
                    <ul className="text-micro text-muted-foreground tabular-nums space-y-0.5" dir="ltr">
                      {ex.sets.map((s, j) => (
                        <li key={j}>
                          {j + 1}. {s.weightKg ?? '—'} kg × {s.reps ?? '—'} {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                          {s.durationSec ? ` ${s.durationSec}s` : ''}
                          {s.distanceKm ? ` ${s.distanceKm}km` : ''}
                        </li>
                      ))}
                    </ul>
                    {ex.notes && <p className="text-micro text-muted-foreground italic">"{ex.notes}"</p>}
                  </div>
                );
              })}
              {session.notes && (
                <p className="text-micro text-muted-foreground italic bg-muted/30 rounded-lg p-2">
                  "{session.notes}"
                </p>
              )}
              <Button
                variant="outline"
                className="w-full mt-2 text-destructive"
                onClick={async () => {
                  const ok = await confirmDialog({
                    message: T.confirmDelete[lang],
                    confirmLabel: T.delete[lang],
                    destructive: true,
                  });
                  if (ok) await onDelete(session.id);
                }}
              >
                <Trash2 className="w-3 h-3" aria-hidden /> {T.delete[lang]}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
