/**
 * Profile / biometrics tab — the singleton AthleteProfile editor.
 *
 * v2 — input overhaul:
 *   • Sex / Activity / Goal / Experience / Units use <ChoiceCardGrid>
 *     so each option is a tappable card with icon + description.
 *   • Birth-year uses <YearWheel> — a momentum-snap scrollable picker
 *     instead of a number input that summons the keyboard.
 *   • Height / Weight / Neck / Waist / Hip use <Stepper> with optional
 *     companion <NumberSlider>, presets, and tap-and-hold to scrub.
 *   • Weight has an auto-fill chip — when the profile.weightKg is empty
 *     but the user has vitals data, we offer to copy the latest entry.
 *   • Live preview of BMI/BF/BMR/TDEE/calories renders below the
 *     basics card so the user sees their numbers light up as they
 *     change inputs.
 *   • Sticky save bar with dirty-state detection (kept).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Award, Beef, Check, Crown, Dumbbell, Flame, Footprints,
  Ruler, Scale, Sparkles, Target, Trophy, User, Zap,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type {
  AthleteProfile, Sex, ActivityLevel, FitnessGoal, Experience, Units,
  VitalLog,
} from '../wellnessDb';
import { athleticSummary } from '../athleticEngine';
import { resolveWeight } from '../wellnessLink';
import { SoftSurface, withAlpha } from './surfaces';
import { SectionHeader, AnimatedNumber } from './primitives';
import {
  ChoiceCardGrid, Field, Stepper, YearWheel,
} from './inputs';

interface Props {
  profile: AthleteProfile | null;
  vitals?: VitalLog[];   // for weight auto-fill
  onSave: (p: Omit<AthleteProfile, 'id' | 'updatedAt'>) => Promise<void>;
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
  title: { ar: 'الملف الرياضي', de: 'Athletenprofil' },
  subtitle: {
    ar: 'بياناتك تبقى محلية على هذا الجهاز فقط.',
    de: 'Deine Daten bleiben nur auf diesem Gerät.',
  },
  basics: { ar: 'البيانات الأساسية', de: 'Grunddaten' },
  name: { ar: 'الاسم', de: 'Name' },
  namePh: { ar: 'اختياري', de: 'optional' },
  sex: { ar: 'الجنس', de: 'Geschlecht' },
  male: { ar: 'ذكر', de: 'Männlich' },
  female: { ar: 'أنثى', de: 'Weiblich' },
  birthYear: { ar: 'سنة الميلاد', de: 'Geburtsjahr' },
  height: { ar: 'الطول', de: 'Größe' },
  weight: { ar: 'الوزن', de: 'Gewicht' },
  cm: { ar: 'سم', de: 'cm' },
  kg: { ar: 'كغ', de: 'kg' },

  measurements: { ar: 'القياسات (للتقدير الدقيق)', de: 'Maße (für genaue Schätzung)' },
  measurementsDesc: {
    ar: 'تستخدم لحساب نسبة الدهون بطريقة البحرية الأمريكية.',
    de: 'Wird für die US-Navy-Methode zur Körperfettberechnung verwendet.',
  },
  neck: { ar: 'الرقبة', de: 'Hals' },
  waist: { ar: 'الخصر', de: 'Taille' },
  hip: { ar: 'الورك', de: 'Hüfte' },

  activity: { ar: 'مستوى النشاط', de: 'Aktivitätslevel' },
  sedentary: { ar: 'كسل', de: 'Sitzend' },
  light:     { ar: 'خفيف', de: 'Leicht' },
  moderate:  { ar: 'متوسط', de: 'Mittel' },
  active:    { ar: 'نشط', de: 'Aktiv' },
  athlete:   { ar: 'رياضي', de: 'Athlet' },
  activityHint: {
    sedentary: { ar: 'مكتب، لا تمرين', de: 'Büro, kein Training' },
    light:     { ar: '1-2 مرة/أسبوع',   de: '1-2x/Woche' },
    moderate:  { ar: '3-4 مرات/أسبوع',  de: '3-4x/Woche' },
    active:    { ar: '5-6 مرات/أسبوع',  de: '5-6x/Woche' },
    athlete:   { ar: 'يومياً أو منافس',  de: 'Täglich/Wettkampf' },
  } as Record<ActivityLevel, { ar: string; de: string }>,

  goal: { ar: 'الهدف', de: 'Ziel' },
  goalCut:         { ar: 'خفض دهون',     de: 'Definition' },
  goalRecomp:      { ar: 'إعادة تركيب',  de: 'Recomp' },
  goalMaintain:    { ar: 'محافظة',       de: 'Erhalten' },
  goalLeanBulk:    { ar: 'بناء صافٍ',    de: 'Lean Bulk' },
  goalBulk:        { ar: 'تضخيم',         de: 'Aufbau' },
  goalPerformance: { ar: 'أداء',           de: 'Leistung' },

  experience: { ar: 'الخبرة', de: 'Erfahrung' },
  beginner: { ar: 'مبتدئ', de: 'Anfänger' },
  intermediate: { ar: 'متوسط', de: 'Fortgeschritten' },
  advanced: { ar: 'متقدّم', de: 'Erfahren' },

  preview: { ar: 'معاينة الحاسبات', de: 'Vorschau' },
  bmr: { ar: 'استقلاب', de: 'BMR' },
  tdee: { ar: 'إجمالي يومي', de: 'TDEE' },
  target: { ar: 'هدف السعرات', de: 'Kalorienziel' },
  bmi: { ar: 'BMI', de: 'BMI' },
  bf: { ar: 'دهون', de: 'KFA' },
  vo2: { ar: 'VO₂ ماكس', de: 'VO₂max' },
  age: { ar: 'العمر', de: 'Alter' },

  save: { ar: 'حفظ', de: 'Speichern' },
  saved: { ar: 'حُفظ ✓', de: 'Gespeichert ✓' },
  notSaved: { ar: 'لديك تغييرات', de: 'Ungespeicherte Änderungen' },

  unitsLabel: { ar: 'الوحدات', de: 'Einheiten' },
  metric: { ar: 'متري', de: 'Metrisch' },
  imperial: { ar: 'إمبراطوري', de: 'Imperial' },

  weightAutoTitle: { ar: 'اعتماد آخر وزن مسجّل', de: 'Letztes Gewicht übernehmen' },
  weightAutoCta: { ar: 'استخدام', de: 'Übernehmen' },

  recommended: { ar: 'موصى به', de: 'Empfohlen' },
};

const DEFAULT: Omit<AthleteProfile, 'id' | 'updatedAt'> = {
  name: '',
  sex: 'male',
  birthYear: new Date().getFullYear() - 25,
  heightCm: 175,
  weightKg: 75,
  waistCm: undefined,
  neckCm: undefined,
  hipCm: undefined,
  activityLevel: 'moderate',
  goal: 'maintain',
  experience: 'intermediate',
  units: 'metric',
};

export default function ProfileTab({ profile, vitals = [], onSave }: Props) {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';
  const isAr = lang === 'ar';

  const [form, setForm] = useState<Omit<AthleteProfile, 'id' | 'updatedAt'>>(
    profile
      ? {
          name: profile.name ?? '',
          sex: profile.sex,
          birthYear: profile.birthYear,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          waistCm: profile.waistCm,
          neckCm: profile.neckCm,
          hipCm: profile.hipCm,
          activityLevel: profile.activityLevel,
          goal: profile.goal,
          experience: profile.experience,
          units: profile.units,
        }
      : DEFAULT,
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync when profile reloads
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '',
      sex: profile.sex,
      birthYear: profile.birthYear,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      waistCm: profile.waistCm,
      neckCm: profile.neckCm,
      hipCm: profile.hipCm,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      experience: profile.experience,
      units: profile.units,
    });
  }, [profile?.updatedAt]);

  // Auto-fill weight suggestion (latest non-null vitals.weightKg)
  const suggestedWeight = useMemo(() => {
    if (form.weightKg) return null;
    const r = resolveWeight({
      profile: profile ?? null,
      vitals,
      skinHair: [],
      hydration: [],
      workouts: [],
      dietLogs: [],
    });
    if (r.source === 'vitals' && r.value) return r.value;
    return null;
  }, [form.weightKg, profile, vitals]);

  // Live preview summary
  const previewSummary = useMemo(() => {
    const tempProfile: AthleteProfile = {
      id: 'me',
      ...form,
      updatedAt: 0,
    };
    if (!form.heightCm || !form.weightKg || !form.birthYear) return null;
    return athleticSummary({ profile: tempProfile });
  }, [form]);

  const dirty = useMemo(() => {
    if (!profile) return true;
    const keys: Array<keyof typeof form> = [
      'name', 'sex', 'birthYear', 'heightCm', 'weightKg',
      'waistCm', 'neckCm', 'hipCm',
      'activityLevel', 'goal', 'experience', 'units',
    ];
    return keys.some((k) => {
      const a = (form as any)[k];
      const b = (profile as any)[k];
      // Treat empty string and undefined as equivalent so an empty name
      // input doesn't permanently mark the form dirty.
      const norm = (v: unknown) =>
        v === '' || v === null ? undefined : v;
      return norm(a) !== norm(b);
    });
  }, [form, profile]);

  const save = async () => {
    await onSave(form);
    setSavedAt(Date.now());
  };

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const thisYear = new Date().getFullYear();
  const minYear = thisYear - 90;
  const maxYear = thisYear - 12;

  /* ─────────────────── Choice options ─────────────────── */

  const sexOptions = [
    { value: 'male'   as Sex, label: T.male[lang],   icon: User as any, color: '#3b82f6' },
    { value: 'female' as Sex, label: T.female[lang], icon: User as any, color: '#ec4899' },
  ];

  const activityOptions = (['sedentary', 'light', 'moderate', 'active', 'athlete'] as ActivityLevel[]).map((a) => ({
    value: a,
    label: T[a][lang],
    description: T.activityHint[a][lang],
    icon: a === 'sedentary' ? User : a === 'light' ? Footprints : a === 'moderate' ? Activity : a === 'active' ? Dumbbell : Zap,
    color: a === 'sedentary' ? '#9ca3af' : a === 'light' ? '#06b6d4' : a === 'moderate' ? '#10b981' : a === 'active' ? '#f59e0b' : '#ef4444',
  }));

  const goalOptions: Array<{ value: FitnessGoal; label: string; icon: any; color: string }> = [
    { value: 'cut',         label: T.goalCut[lang],         icon: Flame,    color: '#ef4444' },
    { value: 'recomp',      label: T.goalRecomp[lang],      icon: Activity, color: '#06b6d4' },
    { value: 'maintain',    label: T.goalMaintain[lang],    icon: Target,   color: '#10b981' },
    { value: 'lean_bulk',   label: T.goalLeanBulk[lang],    icon: Trophy,   color: '#3b82f6' },
    { value: 'bulk',        label: T.goalBulk[lang],        icon: Crown,    color: '#a855f7' },
    { value: 'performance', label: T.goalPerformance[lang], icon: Zap,      color: '#fbbf24' },
  ];

  const experienceOptions = (['beginner', 'intermediate', 'advanced'] as Experience[]).map((e) => ({
    value: e,
    label: T[e][lang],
    icon: e === 'beginner' ? Sparkles : e === 'intermediate' ? Dumbbell : Trophy,
    color: e === 'beginner' ? '#06b6d4' : e === 'intermediate' ? '#10b981' : '#a855f7',
  }));

  const unitsOptions = [
    { value: 'metric'   as Units, label: T.metric[lang],   icon: Scale, color: '#10b981' },
    { value: 'imperial' as Units, label: T.imperial[lang], icon: Scale, color: '#f59e0b' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <motion.div variants={item}>
        <SoftSurface accent="hsl(var(--primary))" intensity={0.85} className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-foreground">{T.title[lang]}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{T.subtitle[lang]}</p>
            </div>
          </div>
        </SoftSurface>
      </motion.div>

      {/* Live preview */}
      {previewSummary && (
        <motion.div variants={item}>
          <SoftSurface accent="#10b981" variant="mesh" intensity={0.85} className="p-4 space-y-3">
            <SectionHeader title={T.preview[lang]} icon={Award} />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: T.bmi[lang], val: previewSummary.bmi, digits: 1, color: '#10b981', unit: '' },
                { label: T.bf[lang],  val: previewSummary.bodyFat, digits: 1, color: '#f59e0b', unit: '%' },
                { label: T.bmr[lang], val: previewSummary.bmr, digits: 0, color: '#f97316', unit: 'kcal' },
                { label: T.tdee[lang], val: previewSummary.tdee, digits: 0, color: '#f97316', unit: 'kcal' },
                { label: T.target[lang], val: previewSummary.calorieTarget, digits: 0, color: '#10b981', unit: 'kcal' },
                { label: T.age[lang], val: previewSummary.age, digits: 0, color: '#06b6d4', unit: isAr ? 'سنة' : 'J' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-2 text-center" dir="ltr"
                     style={{ background: 'hsl(var(--muted) / 0.45)', border: '1px solid hsl(var(--border) / 0.3)' }}>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                    {s.label}
                  </div>
                  <div className="text-[16px] font-bold tabular-nums leading-none mt-0.5" style={{ color: s.color }}>
                    {s.val != null ? <AnimatedNumber value={s.val} digits={s.digits} /> : '—'}
                  </div>
                  {s.unit && <div className="text-[9px] text-muted-foreground mt-0.5">{s.unit}</div>}
                </div>
              ))}
            </div>
          </SoftSurface>
        </motion.div>
      )}

      {/* Basics */}
      <motion.div variants={item}>
        <SoftSurface variant="flat" className="p-4 space-y-4">
          <SectionHeader title={T.basics[lang]} icon={User} />

          {/* Name */}
          <Field label={T.name[lang]}>
            <input
              value={form.name ?? ''}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={T.namePh[lang]}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50"
            />
          </Field>

          {/* Sex */}
          <Field label={T.sex[lang]}>
            <ChoiceCardGrid
              options={sexOptions}
              value={form.sex}
              onChange={(v) => setField('sex', v)}
              columns={2}
            />
          </Field>

          {/* Birth year — wheel */}
          <Field label={T.birthYear[lang]} hint={`${thisYear - form.birthYear} ${isAr ? 'سنة' : 'J'}`}>
            <YearWheel
              value={form.birthYear}
              onChange={(y) => setField('birthYear', y)}
              min={minYear}
              max={maxYear}
            />
          </Field>

          {/* Height */}
          <Field label={`${T.height[lang]} (${T.cm[lang]})`} icon={Ruler}>
            <Stepper
              value={form.heightCm}
              onChange={(v) => setField('heightCm', v ?? form.heightCm)}
              min={100} max={230} step={0.5} digits={1}
              accent="#06b6d4" unit={T.cm[lang]}
              withSlider
              editable
            />
          </Field>

          {/* Weight */}
          <Field
            label={`${T.weight[lang]} (${T.kg[lang]})`}
            icon={Scale}
            hint={form.weightKg ? '' : (suggestedWeight ? T.weightAutoTitle[lang] : '')}
          >
            <div className="space-y-2">
              <Stepper
                value={form.weightKg}
                onChange={(v) => setField('weightKg', v)}
                min={30} max={250} step={0.1} digits={1}
                accent="#10b981" unit={T.kg[lang]}
                editable
              />
              {!form.weightKg && suggestedWeight != null && (
                <button
                  type="button"
                  onClick={() => setField('weightKg', suggestedWeight)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold border-dashed border"
                  style={{
                    borderColor: withAlpha('#10b981', 0.4),
                    color: '#10b981',
                    background: withAlpha('#10b981', 0.05),
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {T.weightAutoCta[lang]} {suggestedWeight.toFixed(1)} {T.kg[lang]}
                </button>
              )}
            </div>
          </Field>
        </SoftSurface>
      </motion.div>

      {/* Body measurements */}
      <motion.div variants={item}>
        <SoftSurface variant="flat" className="p-4 space-y-4">
          <SectionHeader title={T.measurements[lang]} subtitle={T.measurementsDesc[lang]} icon={Ruler} />

          <Field label={`${T.neck[lang]} (${T.cm[lang]})`}>
            <Stepper
              value={form.neckCm}
              onChange={(v) => setField('neckCm', v)}
              min={20} max={60} step={0.5} digits={1}
              accent="#3b82f6" unit={T.cm[lang]}
              editable
            />
          </Field>
          <Field label={`${T.waist[lang]} (${T.cm[lang]})`}>
            <Stepper
              value={form.waistCm}
              onChange={(v) => setField('waistCm', v)}
              min={50} max={180} step={0.5} digits={1}
              accent="#3b82f6" unit={T.cm[lang]}
              editable
            />
          </Field>
          {form.sex === 'female' && (
            <Field label={`${T.hip[lang]} (${T.cm[lang]})`}>
              <Stepper
                value={form.hipCm}
                onChange={(v) => setField('hipCm', v)}
                min={60} max={180} step={0.5} digits={1}
                accent="#ec4899" unit={T.cm[lang]}
                editable
              />
            </Field>
          )}
        </SoftSurface>
      </motion.div>

      {/* Activity */}
      <motion.div variants={item}>
        <SoftSurface variant="flat" className="p-4 space-y-3">
          <SectionHeader title={T.activity[lang]} icon={Footprints} />
          <ChoiceCardGrid
            options={activityOptions}
            value={form.activityLevel}
            onChange={(v) => setField('activityLevel', v)}
            columns={2}
          />
        </SoftSurface>
      </motion.div>

      {/* Goal */}
      <motion.div variants={item}>
        <SoftSurface variant="flat" className="p-4 space-y-3">
          <SectionHeader title={T.goal[lang]} icon={Target} />
          <ChoiceCardGrid
            options={goalOptions}
            value={form.goal}
            onChange={(v) => setField('goal', v)}
            columns={3}
          />
        </SoftSurface>
      </motion.div>

      {/* Experience */}
      <motion.div variants={item}>
        <SoftSurface variant="flat" className="p-4 space-y-3">
          <SectionHeader title={T.experience[lang]} icon={Dumbbell} />
          <ChoiceCardGrid
            options={experienceOptions}
            value={form.experience}
            onChange={(v) => setField('experience', v)}
            columns={3}
          />
        </SoftSurface>
      </motion.div>

      {/* Units */}
      <motion.div variants={item}>
        <SoftSurface variant="flat" className="p-4 space-y-3">
          <SectionHeader title={T.unitsLabel[lang]} icon={Scale} />
          <ChoiceCardGrid
            options={unitsOptions}
            value={form.units}
            onChange={(v) => setField('units', v)}
            columns={2}
          />
        </SoftSurface>
      </motion.div>

      {/* Sticky save bar — sits a touch above the BottomNav using the
          shared --app-bottom-inset variable so it adapts to the nav's
          real rendered height and the device safe area. */}
      <div className="sticky z-30" style={{ bottom: 'calc(var(--app-bottom-inset, 0px) + 0.5rem)' }}>
        <AnimatePresence>
          {(dirty || savedAt) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl p-2 flex items-center gap-2 shadow-lg"
            >
              <span className="text-[11px] text-muted-foreground flex-1 ps-2">
                {dirty ? T.notSaved[lang] : T.saved[lang]}
              </span>
              {dirty && (
                <button
                  onClick={save}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold flex items-center gap-1 active:scale-[0.98] transition-transform"
                >
                  <Check className="w-3.5 h-3.5" /> {T.save[lang]}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
