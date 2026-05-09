import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Plus, Check, Trash2, Edit3, Clock, Utensils } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { NUTRIENTS, NUTRIENT_LIST, type Lang } from './wellnessData';
import type { IntakeLog, Supplement, UUID } from './wellnessDb';
import { todayIso } from './wellnessDb';

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
  if (min <= 0) {
    return lang === 'ar' ? 'حان الوقت' : 'Jetzt fällig';
  }
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

  // All upcoming/overdue scheduled doses for today
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
        <div className="bg-card border border-border/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {isAr ? 'اليوم' : 'Heute'}
              </p>
              <h3 className="text-base font-bold text-foreground mt-0.5">
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
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pill className="w-6 h-6 text-primary" />
            </div>
          </div>
          {scheduleToday.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
              {scheduleToday.map((r) => (
                <button
                  key={`${r.sup.id}-${r.time}`}
                  onClick={() => !r.taken && onLogIntake(r.sup.id, r.time)}
                  disabled={r.taken}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    r.taken
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : r.minutes < now
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {r.taken && <Check className="inline w-3 h-3 me-1" />}
                  {r.time} · {r.sup.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* List of supplements */}
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
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-8 text-center">
            <Pill className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لم تُضف أي مكملات بعد' : 'Noch keine Supplemente hinzugefügt'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/30">
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
                        <span key={t} className="inline-flex items-center gap-1 text-[11px] bg-muted/60 text-foreground/80 px-2 py-0.5 rounded-full">
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
        )}
      </motion.div>

      {/* Edit / New drawer */}
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

// ============================================================================
// Editor
// ============================================================================

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

  const toggleNutrient = (k: string) => {
    setNutrientKeys((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  };

  const updateTime = (idx: number, val: string) => {
    setTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  };
  const addTime = () => setTimes((p) => [...p, '12:00']);
  const removeTime = (idx: number) => setTimes((p) => p.filter((_, i) => i !== idx));

  const canSave = name.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {isAr ? 'الاسم' : 'Name'}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثل: فيتامين د' : 'z.B. Vitamin D'}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />
          </div>

          {/* Dose */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {isAr ? 'الجرعة' : 'Dosis'}
            </label>
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder={isAr ? 'مثل: 1000 وحدة' : 'z.B. 1000 IE'}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />
          </div>

          {/* Times */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {isAr ? 'الأوقات' : 'Zeiten'}
              </label>
              <button
                onClick={addTime}
                type="button"
                className="text-[12px] font-semibold text-primary"
              >
                + {isAr ? 'وقت' : 'Zeit'}
              </button>
            </div>
            <div className="space-y-1.5">
              {times.map((t, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => updateTime(idx, e.target.value)}
                    className="flex-1 bg-card border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                    dir="ltr"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(idx)}
                      className="p-2 rounded-xl bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* With food */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {isAr ? 'مع الطعام' : 'Einnahme'}
            </label>
            <div className="flex gap-2" dir="ltr">
              {(['with', 'without', 'any'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setWithFood(v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                    withFood === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {v === 'with' && (isAr ? 'مع الطعام' : 'Mit Essen')}
                  {v === 'without' && (isAr ? 'دون طعام' : 'Nüchtern')}
                  {v === 'any' && (isAr ? 'أي وقت' : 'Egal')}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrients */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {isAr ? 'العناصر الغذائية' : 'Nährstoffe'}
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {NUTRIENT_LIST.map((n) => {
                const selected = nutrientKeys.includes(n.key);
                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => toggleNutrient(n.key)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                      selected
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-muted/40 border-border/40 text-muted-foreground'
                    }`}
                  >
                    {n.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {isAr ? 'ملاحظات' : 'Notizen'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center justify-between bg-card border border-border/40 rounded-xl px-3 py-2.5">
            <span className="text-sm text-foreground">{isAr ? 'نشط' : 'Aktiv'}</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>

          {/* Actions */}
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
