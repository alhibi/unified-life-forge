/**
 * Supplements tab — manage active supplements + log doses.
 *
 * v2 changes:
 *   • Cards use SoftSurface chrome.
 *   • The editor's nutrients picker is now a single <SearchableChips>
 *     popover instead of an inline 80-checkbox grid (which was the
 *     biggest UX problem in the previous form — users had to scroll
 *     a tall block to find common nutrients).
 *   • Times use <TimeChip> — a pill that opens the native time picker
 *     directly, avoiding the keyboard for non-textual data.
 *   • The "with food" choice uses <ChoiceCardGrid>.
 *   • Toggle is replaced with the styled <Toggle> primitive.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Plus, Check, Trash2, Edit3, Clock, Utensils } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { NUTRIENTS, NUTRIENT_LIST, type Lang } from './wellnessData';
import type { IntakeLog, Supplement, UUID } from './wellnessDb';
import { todayIso } from './wellnessDb';
import { SoftSurface, withAlpha } from './premium/surfaces';
import {
  ChoiceCardGrid, Field, SearchableChips, TimeChip, Toggle,
} from './premium/inputs';

interface Props {
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  onSave: (
    s: Omit<Supplement, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number },
  ) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
  onLogIntake: (id: UUID, scheduledTime?: string) => Promise<void>;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function parseTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatRemaining(min: number, lang: Lang) {
  if (min <= 0) return lang === 'ar' ? 'حان الوقت' : 'Jetzt fällig';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return lang === 'ar' ? `بعد ${m} د` : `in ${m} Min`;
  return lang === 'ar' ? `بعد ${h}س ${m}د` : `in ${h}h ${m}m`;
}

export default function SupplementsTab({
  supplements,
  intakeLogs,
  onSave,
  onDelete,
  onLogIntake,
}: Props) {
  const { language } = useApp();
  const lang = language as Lang;
  const isAr = lang === 'ar';
  const [editing, setEditing] = useState<Supplement | 'new' | null>(null);

  const today = todayIso();

  const takenToday = useMemo(() => {
    const set = new Set<string>();
    for (const l of intakeLogs) {
      const d = new Date(l.takenAt).toISOString().slice(0, 10);
      if (d === today && l.scheduledTime) {
        set.add(`${l.supplementId}@${l.scheduledTime}`);
      }
    }
    return set;
  }, [intakeLogs, today]);

  const now = nowMinutes();

  const scheduleToday = useMemo(() => {
    const rows: Array<{ sup: Supplement; time: string; minutes: number; taken: boolean }> = [];
    for (const s of supplements) {
      if (!s.active) continue;
      for (const t of s.times) {
        const m = parseTime(t);
        if (m == null) continue;
        rows.push({
          sup: s,
          time: t,
          minutes: m,
          taken: takenToday.has(`${s.id}@${t}`),
        });
      }
    }
    rows.sort((a, b) => a.minutes - b.minutes);
    return rows;
  }, [supplements, takenToday]);

  const nextDose = scheduleToday.find((r) => !r.taken && r.minutes >= now);

  return (
    <div className="space-y-5">
      {/* Today banner */}
      <motion.div variants={item} initial="hidden" animate="show">
        <SoftSurface accent="hsl(var(--primary))" variant="mesh" intensity={0.7} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {isAr ? 'اليوم' : 'Heute'}
              </p>
              <h3 className="text-base font-bold text-foreground mt-0.5 truncate">
                {nextDose
                  ? `${nextDose.sup.name} · ${nextDose.time}`
                  : isAr
                  ? 'لا جرعات معلقة'
                  : 'Keine offenen Dosen'}
              </h3>
              {nextDose && (
                <p className="text-[12px] text-primary mt-0.5">
                  {formatRemaining(nextDose.minutes - now, lang)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/12 flex items-center justify-center shrink-0">
              <Pill className="w-6 h-6 text-primary" />
            </div>
          </div>
          {scheduleToday.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/30">
              {scheduleToday.map((r) => (
                <button
                  key={`${r.sup.id}-${r.time}`}
                  onClick={() => !r.taken && onLogIntake(r.sup.id, r.time)}
                  disabled={r.taken}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors"
                  style={{
                    background: r.taken
                      ? withAlpha('hsl(var(--primary))', 0.18)
                      : r.minutes < now
                      ? withAlpha('#ef4444', 0.10)
                      : 'hsl(var(--muted) / 0.4)',
                    borderColor: r.taken
                      ? withAlpha('hsl(var(--primary))', 0.3)
                      : r.minutes < now
                      ? withAlpha('#ef4444', 0.3)
                      : 'hsl(var(--border) / 0.4)',
                    color: r.taken
                      ? 'hsl(var(--primary))'
                      : r.minutes < now
                      ? '#ef4444'
                      : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {r.taken && <Check className="inline w-3 h-3 me-1" />}
                  {r.time} · {r.sup.name}
                </button>
              ))}
            </div>
          )}
        </SoftSurface>
      </motion.div>

      {/* Supplement list */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-1">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            {isAr ? 'مكملاتي' : 'Meine Supplemente'}
          </p>
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة' : 'Hinzufügen'}
          </button>
        </div>

        {supplements.length === 0 ? (
          <SoftSurface variant="flat" className="p-8" border>
            <div className="text-center">
              <Pill className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'لم تُضف أي مكملات بعد' : 'Noch keine Supplemente hinzugefügt'}
              </p>
            </div>
          </SoftSurface>
        ) : (
          <SoftSurface variant="flat" className="overflow-hidden">
            <div className="divide-y divide-border/30">
              {supplements.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-bold text-foreground truncate">{s.name}</h4>
                        {!s.active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {isAr ? 'موقوف' : 'pausiert'}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{s.dose}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.times.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 text-[11px] bg-muted/60 text-foreground/80 px-2 py-0.5 rounded-full"
                          >
                            <Clock className="w-3 h-3" />
                            {t}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 text-foreground/80 px-2 py-0.5 rounded-full">
                          <Utensils className="w-3 h-3" />
                          {s.withFood === 'with'
                            ? isAr ? 'مع الطعام' : 'mit Essen'
                            : s.withFood === 'without'
                            ? isAr ? 'دون طعام' : 'nüchtern'
                            : isAr ? 'أي وقت' : 'egal'}
                        </span>
                      </div>
                      {s.nutrientKeys.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.nutrientKeys.map((n) => (
                            <span key={n} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {NUTRIENTS[n]?.label[lang] ?? n}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => onLogIntake(s.id)}
                        className="p-2 rounded-lg bg-primary/10 text-primary active:scale-90 transition-transform"
                        aria-label={isAr ? 'تسجيل جرعة' : 'Dosis loggen'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditing(s)}
                        className="p-2 rounded-lg bg-muted text-muted-foreground active:scale-90 transition-transform"
                        aria-label={isAr ? 'تعديل' : 'Bearbeiten'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive active:scale-90 transition-transform"
                        aria-label={isAr ? 'حذف' : 'Löschen'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SoftSurface>
        )}
      </motion.div>

      <AnimatePresence>
        {editing && (
          <SupplementEditor
            initial={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (val) => {
              await onSave(val);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────── Editor ──────────────────────── */

function SupplementEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: Supplement | null;
  onCancel: () => void;
  onSave: (
    s: Omit<Supplement, 'id' | 'createdAt'> & { id?: UUID; createdAt?: number },
  ) => Promise<void>;
}) {
  const { language } = useApp();
  const lang = language as Lang;
  const isAr = lang === 'ar';

  const [name, setName] = useState(initial?.name ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [times, setTimes] = useState<string[]>(initial?.times ?? ['09:00']);
  const [withFood, setWithFood] = useState<Supplement['withFood']>(initial?.withFood ?? 'any');
  const [nutrientKeys, setNutrientKeys] = useState<string[]>(initial?.nutrientKeys ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [active, setActive] = useState(initial?.active ?? true);

  const updateTime = (idx: number, val: string) =>
    setTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  const addTime = () => setTimes((p) => [...p, '12:00']);
  const removeTime = (idx: number) => setTimes((p) => p.filter((_, i) => i !== idx));

  const canSave = name.trim().length > 0;

  const withFoodOptions = [
    { value: 'with' as const,    label: isAr ? 'مع الطعام' : 'Mit Essen', icon: Utensils, color: '#10b981' },
    { value: 'without' as const, label: isAr ? 'دون طعام' : 'Nüchtern',   icon: Utensils, color: '#f59e0b' },
    { value: 'any' as const,     label: isAr ? 'أي وقت' : 'Egal',         icon: Clock,    color: '#06b6d4' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-2 pb-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            {initial
              ? isAr ? 'تعديل مكمل' : 'Supplement bearbeiten'
              : isAr ? 'مكمل جديد' : 'Neues Supplement'}
          </h2>

          <Field label={isAr ? 'الاسم' : 'Name'}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثل: فيتامين د' : 'z.B. Vitamin D'}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50"
            />
          </Field>

          <Field label={isAr ? 'الجرعة' : 'Dosis'}>
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder={isAr ? 'مثل: 1000 وحدة' : 'z.B. 1000 IE'}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50"
            />
          </Field>

          <Field
            label={isAr ? 'الأوقات' : 'Zeiten'}
            hint={isAr ? `${times.length} وقت` : `${times.length} Zeit`}
          >
            <div className="flex flex-wrap gap-2 items-center">
              {times.map((t, idx) => (
                <TimeChip
                  key={idx}
                  value={t}
                  onChange={(v) => updateTime(idx, v)}
                  onRemove={times.length > 1 ? () => removeTime(idx) : undefined}
                />
              ))}
              <button
                type="button"
                onClick={addTime}
                className="inline-flex items-center gap-1 text-[12px] font-semibold rounded-full ps-2 pe-2.5 py-1 border border-dashed text-primary border-primary/40"
              >
                <Plus className="w-3 h-3" />
                {isAr ? 'وقت' : 'Zeit'}
              </button>
            </div>
          </Field>

          <Field label={isAr ? 'مع الطعام' : 'Einnahme'}>
            <ChoiceCardGrid
              options={withFoodOptions}
              value={withFood}
              onChange={(v) => setWithFood(v)}
              columns={3}
            />
          </Field>

          <Field
            label={isAr ? 'العناصر الغذائية' : 'Nährstoffe'}
            hint={isAr ? `${nutrientKeys.length} مختار` : `${nutrientKeys.length} ausgewählt`}
          >
            <SearchableChips
              options={NUTRIENT_LIST}
              value={nutrientKeys}
              onChange={setNutrientKeys}
              getId={(o) => o.key}
              getLabel={(o) => o.label[lang]}
              placeholder={isAr ? 'إضافة عنصر' : 'Hinzufügen'}
              modalTitle={isAr ? 'العناصر الغذائية' : 'Nährstoffe'}
            />
          </Field>

          <Field label={isAr ? 'ملاحظات' : 'Notizen'}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50 resize-none"
            />
          </Field>

          <Toggle
            label={isAr ? 'نشط' : 'Aktiv'}
            description={isAr ? 'يظهر في جدول اليوم' : 'Erscheint im Tagesplan'}
            value={active}
            onChange={setActive}
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
            >
              {isAr ? 'إلغاء' : 'Abbrechen'}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() =>
                onSave({
                  id: initial?.id,
                  createdAt: initial?.createdAt,
                  name: name.trim(),
                  dose: dose.trim(),
                  times,
                  withFood,
                  nutrientKeys,
                  notes: notes.trim() || undefined,
                  active,
                })
              }
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {isAr ? 'حفظ' : 'Speichern'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
