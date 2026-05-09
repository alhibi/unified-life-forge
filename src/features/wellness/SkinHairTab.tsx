import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Sparkles, Wind, Moon, Heart, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { Lang } from './wellnessData';
import type { SkinHairLog } from './wellnessDb';
import { todayIso } from './wellnessDb';

interface Props {
  skinHair: SkinHairLog[];
  onSave: (entry: Omit<SkinHairLog, 'id' | 'loggedAt'>) => Promise<void>;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

type Form = Omit<SkinHairLog, 'id' | 'loggedAt'>;

const DEFAULT_FORM: Form = {
  date: todayIso(),
  skinHydration: 3,
  skinOiliness: 3,
  skinBreakouts: 2,
  hairFall: 2,
  hairLuster: 3,
  sleepHours: 7,
  waterGlasses: 6,
  stress: 3,
  notes: '',
};

export default function SkinHairTab({ skinHair, onSave }: Props) {
  const { language } = useApp();
  const lang = language as Lang;
  const isAr = lang === 'ar';

  const today = todayIso();
  const todayLog = useMemo(
    () => skinHair.find((l) => l.date === today) ?? null,
    [skinHair, today],
  );

  const [form, setForm] = useState<Form>(todayLog ? {
    date: todayLog.date,
    skinHydration: todayLog.skinHydration,
    skinOiliness: todayLog.skinOiliness,
    skinBreakouts: todayLog.skinBreakouts,
    hairFall: todayLog.hairFall,
    hairLuster: todayLog.hairLuster,
    sleepHours: todayLog.sleepHours,
    waterGlasses: todayLog.waterGlasses,
    stress: todayLog.stress,
    notes: todayLog.notes ?? '',
  } : DEFAULT_FORM);

  const [saved, setSaved] = useState(false);

  // Reload form when today's log loads/changes
  useEffect(() => {
    if (todayLog) {
      setForm({
        date: todayLog.date,
        skinHydration: todayLog.skinHydration,
        skinOiliness: todayLog.skinOiliness,
        skinBreakouts: todayLog.skinBreakouts,
        hairFall: todayLog.hairFall,
        hairLuster: todayLog.hairLuster,
        sleepHours: todayLog.sleepHours,
        waterGlasses: todayLog.waterGlasses,
        stress: todayLog.stress,
        notes: todayLog.notes ?? '',
      });
    }
  }, [todayLog]);

  const update = <K extends keyof Form,>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  type NumberKey =
    | 'skinHydration'
    | 'skinOiliness'
    | 'skinBreakouts'
    | 'hairFall'
    | 'hairLuster'
    | 'sleepHours'
    | 'waterGlasses'
    | 'stress';

  const updateNumber = (k: NumberKey, v: number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const scaleRow = (
    labelAr: string,
    labelDe: string,
    key: NumberKey,
    hints?: [string, string],
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          {isAr ? labelAr : labelDe}
        </span>
        <span className="text-[12px] font-bold text-primary">{form[key]}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={form[key]}
        onChange={(e) => updateNumber(key, Number(e.target.value))}
        className="w-full accent-primary"
        dir="ltr"
      />
      {hints && (
        <div className="flex justify-between text-[10px] text-muted-foreground/70 px-0.5">
          <span>{hints[0]}</span>
          <span>{hints[1]}</span>
        </div>
      )}
    </div>
  );

  const numberRow = (
    labelAr: string,
    labelDe: string,
    key: NumberKey,
    min: number,
    max: number,
    unit: [string, string],
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          {isAr ? labelAr : labelDe}
        </span>
        <span className="text-[12px] font-bold text-primary">
          {form[key]} {isAr ? unit[0] : unit[1]}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={key === 'sleepHours' ? 0.5 : 1}
        value={form[key]}
        onChange={(e) => updateNumber(key, Number(e.target.value))}
        className="w-full accent-primary"
        dir="ltr"
      />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Date */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-card border border-border/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {isAr ? 'تسجيل يومي' : 'Tägliches Check-in'}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{form.date}</p>
          </div>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            className="bg-muted/60 border border-border/40 rounded-lg px-2 py-1 text-sm text-foreground outline-none"
            dir="ltr"
          />
        </div>
      </motion.div>

      {/* Skin card */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {isAr ? 'البشرة' : 'Haut'}
            </h3>
          </div>
          {scaleRow('ترطيب البشرة', 'Hautfeuchtigkeit', 'skinHydration',
            [isAr ? 'جاف' : 'Trocken', isAr ? 'رطب' : 'Feucht'])}
          {scaleRow('الدهنية', 'Fettigkeit', 'skinOiliness',
            [isAr ? 'جاف' : 'Trocken', isAr ? 'دهني' : 'Fettig'])}
          {scaleRow('الحبوب', 'Unreinheiten', 'skinBreakouts',
            [isAr ? 'لا شيء' : 'Keine', isAr ? 'شديدة' : 'Stark'])}
        </div>
      </motion.div>

      {/* Hair card */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {isAr ? 'الشعر' : 'Haar'}
            </h3>
          </div>
          {scaleRow('تساقط الشعر', 'Haarausfall', 'hairFall',
            [isAr ? 'لا شيء' : 'Keiner', isAr ? 'شديد' : 'Stark'])}
          {scaleRow('اللمعان', 'Glanz', 'hairLuster',
            [isAr ? 'باهت' : 'Matt', isAr ? 'لامع' : 'Glänzend'])}
        </div>
      </motion.div>

      {/* Lifestyle card */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {isAr ? 'نمط الحياة' : 'Lifestyle'}
            </h3>
          </div>
          {numberRow('ساعات النوم', 'Schlafstunden', 'sleepHours', 0, 14,
            [isAr ? 'س' : 'h', isAr ? 'س' : 'h'])}
          {numberRow('أكواب الماء', 'Wassergläser', 'waterGlasses', 0, 20,
            [isAr ? 'كوب' : 'Gläser', 'Gläser'])}
          {scaleRow('الإجهاد', 'Stress', 'stress',
            [isAr ? 'منخفض' : 'Niedrig', isAr ? 'مرتفع' : 'Hoch'])}
        </div>
      </motion.div>

      {/* Notes + save */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-2">
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          placeholder={isAr ? 'ملاحظات (اختياري)' : 'Notizen (optional)'}
          className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
        />
        <button
          onClick={save}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved
            ? (isAr ? 'تم الحفظ' : 'Gespeichert')
            : (isAr ? 'حفظ' : 'Speichern')}
        </button>
      </motion.div>

      {/* History peek */}
      {skinHair.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show" className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2">
            {isAr ? 'السجل' : 'Verlauf'}
          </p>
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/30">
            {skinHair.slice(0, 7).map((l) => (
              <div key={l.id} className="flex items-center justify-between p-3">
                <span className="text-sm font-medium text-foreground">{l.date}</span>
                <div className="flex gap-3 text-[11px] text-muted-foreground" dir="ltr">
                  <span><Droplets className="inline w-3 h-3" /> {l.skinHydration}</span>
                  <span><Sparkles className="inline w-3 h-3" /> {l.hairLuster}</span>
                  <span><Moon className="inline w-3 h-3" /> {l.sleepHours}h</span>
                  <span><Wind className="inline w-3 h-3" /> {l.stress}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
