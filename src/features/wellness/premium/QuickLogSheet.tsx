/**
 * Quick-log bottom sheet — one-tap entry for the daily metrics that
 * matter on the Today dashboard.
 *
 * Why this exists: previously a user wanting to log "I slept 7.5 h"
 * had to navigate to Vitals, scroll to find the field, type into a
 * keyboard, then come back to see the score change. With QuickLogSheet,
 * the same action is two taps from the Today screen.
 *
 * Inputs use the new `inputs.tsx` primitives (Stepper, RatingScale,
 * NumberSlider) so no field requires the soft keyboard. The sheet
 * preselects the metric the user tapped, so the relevant control
 * appears front-and-centre — but every metric is editable in one
 * place if the user wants to log them all at once.
 *
 *  Save model:
 *   • The sheet writes a single `upsertVital({date: today, ...patched})`
 *     so values that aren't touched are preserved (the resolver will
 *     read them back on next render).
 *   • Hydration goes to its own store via `addHydration(amountMl)`,
 *     not into vitals — the legacy hydrationLiters field is left
 *     alone so old data still reads back correctly.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  BatteryCharging, Droplets, Footprints, Heart, HeartPulse, Moon, Save, Scale,
  Smile,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  Drawer, Field, RatingScale, Stepper,
} from './inputs';
import type { VitalLog } from '../wellnessDb';
import { todayIso } from '../wellnessDb';

export type QuickMetric =
  | 'water' | 'weight' | 'sleep' | 'sleepQuality'
  | 'hrv' | 'restingHR' | 'steps' | 'energy' | 'mood';

export interface QuickLogSheetProps {
  open: boolean;
  /** Initially focused metric — controls the order. */
  metric?: QuickMetric;
  /** Date to log for — defaults to today. */
  forDate?: string;
  /** Today's existing vital — used to seed defaults. */
  todayVital: VitalLog | null;
  /** Hydration so far today (ml). */
  hydrationTodayMl: number;
  /** User weight from profile/vitals — used as default if vitals.weightKg is empty. */
  fallbackWeightKg?: number | null;
  /** Hide the hydration card (e.g. when picking a non-today date). */
  hideHydration?: boolean;
  onClose: () => void;
  /** Persist a vital patch for the chosen date. */
  onSaveVital: (patch: Partial<Omit<VitalLog, 'id' | 'loggedAt' | 'date'>>) => Promise<void>;
  /** Add a hydration event (today only). */
  onAddHydration: (ml: number) => Promise<void>;
}

const T = {
  title: { ar: 'تسجيل سريع', de: 'Schnell loggen' },
  save: { ar: 'حفظ', de: 'Speichern' },
  cancel: { ar: 'إلغاء', de: 'Abbrechen' },
  saved: { ar: 'تم الحفظ ✓', de: 'Gespeichert ✓' },
  water: { ar: 'الترطيب', de: 'Hydration' },
  waterDesc: { ar: 'ما شربته الآن', de: 'Eben getrunken' },
  weight: { ar: 'الوزن', de: 'Gewicht' },
  weightDesc: { ar: 'القياس الصباحي عادةً', de: 'Üblich morgens' },
  sleep: { ar: 'ساعات النوم', de: 'Schlafdauer' },
  sleepDesc: { ar: 'ليلة أمس', de: 'Letzte Nacht' },
  sleepQuality: { ar: 'جودة النوم', de: 'Schlafqualität' },
  sleepQualityLow: { ar: 'سيئة', de: 'Schlecht' },
  sleepQualityHigh: { ar: 'ممتازة', de: 'Top' },
  hrv: { ar: 'تباين النبض', de: 'HRV' },
  hrvDesc: { ar: 'بالميلي ثانية، صباحاً', de: 'in ms, morgens' },
  rhr: { ar: 'نبض الراحة', de: 'Ruhepuls' },
  rhrDesc: { ar: 'نبضة/دقيقة', de: 'bpm' },
  steps: { ar: 'الخطوات', de: 'Schritte' },
  stepsDesc: { ar: 'مجموع اليوم', de: 'Tagesgesamt' },
  energy: { ar: 'الطاقة', de: 'Energie' },
  energyLow: { ar: 'منهك', de: 'Erschöpft' },
  energyHigh: { ar: 'منتعش', de: 'Frisch' },
  mood: { ar: 'المزاج', de: 'Stimmung' },
  moodLow: { ar: 'سيئ', de: 'Schlecht' },
  moodHigh: { ar: 'رائع', de: 'Großartig' },
  more: { ar: 'مزيد من القياسات', de: 'Mehr Werte' },
  ml: { ar: 'مل', de: 'ml' },
  kg: { ar: 'كغ', de: 'kg' },
  hr: { ar: 'س', de: 'h' },
  bpm: { ar: 'نبضة', de: 'bpm' },
};

interface FormState {
  hydrationToAddMl: number;        // standalone — written to hydration_events
  weightKg?: number;
  sleepHours?: number;
  sleepQuality?: number;
  hrv?: number;
  restingHR?: number;
  steps?: number;
  energy?: number;
  mood?: number;
}

const METRIC_ICON: Record<QuickMetric, LucideIcon> = {
  water: Droplets,
  weight: Scale,
  sleep: Moon,
  sleepQuality: Moon,
  hrv: Heart,
  restingHR: HeartPulse,
  steps: Footprints,
  energy: BatteryCharging,
  mood: Smile,
};

const METRIC_COLOR: Record<QuickMetric, string> = {
  water:        '#06b6d4',
  weight:       '#f59e0b',
  sleep:        '#8b5cf6',
  sleepQuality: '#8b5cf6',
  hrv:          '#10b981',
  restingHR:    '#ef4444',
  steps:        '#0ea5e9',
  energy:       '#22c55e',
  mood:         '#ec4899',
};

export default function QuickLogSheet({
  open,
  metric,
  forDate,
  todayVital,
  hydrationTodayMl,
  fallbackWeightKg,
  hideHydration = false,
  onClose,
  onSaveVital,
  onAddHydration,
}: QuickLogSheetProps) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';
  const isAr = lang === 'ar';

  const [form, setForm] = useState<FormState>({
    hydrationToAddMl: 0,
    weightKg: undefined,
    sleepHours: undefined,
    sleepQuality: undefined,
    hrv: undefined,
    restingHR: undefined,
    steps: undefined,
    energy: undefined,
    mood: undefined,
  });

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Seed from today's vital whenever the sheet opens
  useEffect(() => {
    if (!open) return;
    setForm({
      hydrationToAddMl: 0,
      weightKg: todayVital?.weightKg ?? fallbackWeightKg ?? undefined,
      sleepHours: todayVital?.sleepHours,
      sleepQuality: todayVital?.sleepQuality,
      hrv: todayVital?.hrv,
      restingHR: todayVital?.restingHR,
      steps: todayVital?.steps,
      energy: todayVital?.energy,
      mood: todayVital?.mood,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, todayVital?.id]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Order metrics so the highlighted one renders first
  const orderedMetrics: QuickMetric[] = useMemo(() => {
    const all: QuickMetric[] = [
      ...(hideHydration ? [] : ['water' as QuickMetric]),
      'weight', 'sleep', 'sleepQuality',
      'energy', 'mood', 'hrv', 'restingHR', 'steps',
    ];
    if (metric && all.includes(metric)) {
      return [metric, ...all.filter((m) => m !== metric)];
    }
    return all;
  }, [metric, hideHydration]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Hydration first (standalone)
      if (form.hydrationToAddMl > 0) {
        await onAddHydration(form.hydrationToAddMl);
      }
      // Vital patch — only include touched fields (different from seeded)
      const patch: Partial<Omit<VitalLog, 'id' | 'loggedAt' | 'date'>> = {};
      const seedW = todayVital?.weightKg ?? fallbackWeightKg;
      if (form.weightKg != null && form.weightKg !== seedW) patch.weightKg = form.weightKg;
      if (form.sleepHours != null && form.sleepHours !== todayVital?.sleepHours) patch.sleepHours = form.sleepHours;
      if (form.sleepQuality != null && form.sleepQuality !== todayVital?.sleepQuality) patch.sleepQuality = form.sleepQuality;
      if (form.hrv != null && form.hrv !== todayVital?.hrv) patch.hrv = form.hrv;
      if (form.restingHR != null && form.restingHR !== todayVital?.restingHR) patch.restingHR = form.restingHR;
      if (form.steps != null && form.steps !== todayVital?.steps) patch.steps = form.steps;
      if (form.energy != null && form.energy !== todayVital?.energy) patch.energy = form.energy;
      if (form.mood != null && form.mood !== todayVital?.mood) patch.mood = form.mood;

      // We still need to send the existing values that shouldn't be cleared.
      // upsertVital does a full row write, so merge before save.
      if (Object.keys(patch).length > 0 || (todayVital && Object.keys(todayVital).length > 0)) {
        await onSaveVital({
          steps: patch.steps ?? todayVital?.steps,
          sleepHours: patch.sleepHours ?? todayVital?.sleepHours,
          sleepQuality: patch.sleepQuality ?? todayVital?.sleepQuality,
          restingHR: patch.restingHR ?? todayVital?.restingHR,
          hrv: patch.hrv ?? todayVital?.hrv,
          weightKg: patch.weightKg ?? todayVital?.weightKg,
          bpSystolic: todayVital?.bpSystolic,
          bpDiastolic: todayVital?.bpDiastolic,
          hydrationLiters: todayVital?.hydrationLiters,
          energy: patch.energy ?? todayVital?.energy,
          mood: patch.mood ?? todayVital?.mood,
          notes: todayVital?.notes,
        });
      }

      setSavedFlash(true);
      setTimeout(() => {
        setSavedFlash(false);
        onClose();
      }, 700);
    } finally {
      setSaving(false);
    }
  };

  const renderMetric = (m: QuickMetric) => {
    const Icon = METRIC_ICON[m];
    const accent = METRIC_COLOR[m];
    const heading = (
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}1f` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <span className="text-[13px] font-bold text-foreground">
          {T[m as keyof typeof T] ? (T as any)[m][lang] : m}
        </span>
      </div>
    );

    switch (m) {
      case 'water':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field hint={`${(hydrationTodayMl / 1000).toFixed(1)} ${isAr ? 'لتر اليوم' : 'L heute'}`} icon={Icon}>
              <Stepper
                value={form.hydrationToAddMl}
                onChange={(v) => update('hydrationToAddMl', v ?? 0)}
                min={0}
                max={2000}
                step={50}
                accent={accent}
                unit={T.ml[lang]}
                presets={[200, 300, 500]}
                presetLabel={(v) => `+${v}`}
                editable
              />
            </Field>
          </div>
        );
      case 'weight':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon} hint={T.weightDesc[lang]}>
              <Stepper
                value={form.weightKg}
                onChange={(v) => update('weightKg', v)}
                min={30} max={250} step={0.1} digits={1}
                accent={accent} unit={T.kg[lang]}
                editable
              />
            </Field>
          </div>
        );
      case 'sleep':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon} hint={T.sleepDesc[lang]}>
              <Stepper
                value={form.sleepHours}
                onChange={(v) => update('sleepHours', v)}
                min={0} max={14} step={0.25} digits={2}
                accent={accent} unit={T.hr[lang]}
                withSlider
                presets={[6, 7, 8]}
                presetLabel={(v) => `${v}${T.hr[lang]}`}
              />
            </Field>
          </div>
        );
      case 'sleepQuality':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon} label={T.sleepQuality[lang]}>
              <RatingScale
                value={form.sleepQuality}
                onChange={(v) => update('sleepQuality', v)}
                lowLabel={T.sleepQualityLow[lang]}
                highLabel={T.sleepQualityHigh[lang]}
                accent={accent}
              />
            </Field>
          </div>
        );
      case 'hrv':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon} hint={T.hrvDesc[lang]}>
              <Stepper
                value={form.hrv}
                onChange={(v) => update('hrv', v)}
                min={10} max={200} step={1}
                accent={accent} unit="ms"
                editable
              />
            </Field>
          </div>
        );
      case 'restingHR':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon} hint={T.rhrDesc[lang]}>
              <Stepper
                value={form.restingHR}
                onChange={(v) => update('restingHR', v)}
                min={30} max={140} step={1}
                accent={accent} unit={T.bpm[lang]}
                editable
              />
            </Field>
          </div>
        );
      case 'steps':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon} hint={T.stepsDesc[lang]}>
              <Stepper
                value={form.steps}
                onChange={(v) => update('steps', v)}
                min={0} max={50000} step={500}
                accent={accent}
                editable
                presets={[5000, 8000, 10000]}
                presetLabel={(v) => `${v / 1000}k`}
              />
            </Field>
          </div>
        );
      case 'energy':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon}>
              <RatingScale
                value={form.energy}
                onChange={(v) => update('energy', v)}
                lowLabel={T.energyLow[lang]}
                highLabel={T.energyHigh[lang]}
                accent={accent}
              />
            </Field>
          </div>
        );
      case 'mood':
        return (
          <div key={m} className="space-y-2">
            {heading}
            <Field icon={Icon}>
              <RatingScale
                value={form.mood}
                onChange={(v) => update('mood', v)}
                lowLabel={T.moodLow[lang]}
                highLabel={T.moodHigh[lang]}
                accent={accent}
              />
            </Field>
          </div>
        );
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={T.title[lang]}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-[13px] font-semibold"
          >
            {T.cancel[lang]}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {savedFlash ? T.saved[lang] : T.save[lang]}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {orderedMetrics.map(renderMetric)}
      </div>
    </Drawer>
  );
}
