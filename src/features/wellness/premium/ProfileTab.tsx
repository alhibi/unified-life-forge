/**
 * Profile / biometrics tab — the singleton AthleteProfile editor.
 *
 * Drives every calculator in the Hub, the macro/calorie targets, the
 * recommended goals and the strength standards. Designed as one long
 * scrollable form with section cards, not a dialog — this is the most
 * important screen for new users.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Award, Check, Crown, Dumbbell, Flame, Footprints,
  Ruler, Scale, Target, Trophy, User, Zap,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type {
  AthleteProfile, Sex, ActivityLevel, FitnessGoal, Experience, Units,
} from '../wellnessDb';
import { athleticSummary } from '../athleticEngine';
import { PremiumCard, SectionHeader, AnimatedNumber } from './primitives';

interface Props {
  profile: AthleteProfile | null;
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
  height: { ar: 'الطول (سم)', de: 'Größe (cm)' },
  weight: { ar: 'الوزن (كغ)', de: 'Gewicht (kg)' },

  measurements: { ar: 'القياسات (للتقدير الدقيق)', de: 'Maße (für genaue Schätzung)' },
  measurementsDesc: {
    ar: 'تستخدم لحساب نسبة الدهون بطريقة البحرية الأمريكية.',
    de: 'Wird für die US-Navy-Methode zur Körperfettberechnung verwendet.',
  },
  neck: { ar: 'الرقبة (سم)', de: 'Hals (cm)' },
  waist: { ar: 'الخصر (سم)', de: 'Taille (cm)' },
  hip: { ar: 'الورك (سم)', de: 'Hüfte (cm)' },

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
};

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
const GOALS: Array<{ key: FitnessGoal; label: keyof typeof T; icon: any; color: string }> = [
  { key: 'cut',         label: 'goalCut',         icon: Flame,      color: '#ef4444' },
  { key: 'recomp',      label: 'goalRecomp',      icon: Activity,   color: '#06b6d4' },
  { key: 'maintain',    label: 'goalMaintain',    icon: Target,     color: '#10b981' },
  { key: 'lean_bulk',   label: 'goalLeanBulk',    icon: Trophy,     color: '#3b82f6' },
  { key: 'bulk',        label: 'goalBulk',        icon: Crown,      color: '#a855f7' },
  { key: 'performance', label: 'goalPerformance', icon: Zap,        color: '#fbbf24' },
];
const EXPERIENCES: Experience[] = ['beginner', 'intermediate', 'advanced'];

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

/* ─────────────────── Reusable building blocks ─────────────────── */

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  placeholder,
}: {
  label: string;
  value: number | undefined | '';
  onChange: (v: number | undefined) => void;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value === undefined ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') onChange(undefined);
          else onChange(parseFloat(v));
        }}
        placeholder={placeholder}
        className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50 tabular-nums"
        dir="ltr"
      />
    </div>
  );
}

/* ─────────────────── Main component ─────────────────── */

export default function ProfileTab({ profile, onSave }: Props) {
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

  // Keep in sync if the underlying profile gets reloaded.
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

  // Live preview summary — recomputes on every form change.
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
    return keys.some((k) => (form as any)[k] !== (profile as any)[k]);
  }, [form, profile]);

  const save = async () => {
    await onSave(form);
    setSavedAt(Date.now());
  };

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Year options: 16..90 years old.
  const thisYear = new Date().getFullYear();
  const minYear = thisYear - 90;
  const maxYear = thisYear - 12;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <motion.div variants={item}>
        <PremiumCard gradient accent="hsl(var(--primary))" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-foreground">{T.title[lang]}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{T.subtitle[lang]}</p>
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      {/* Live preview */}
      {previewSummary && (
        <motion.div variants={item}>
          <PremiumCard gradient accent="#10b981" className="p-4 space-y-3">
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
                <div key={s.label} className="bg-muted/30 rounded-xl p-2 text-center" dir="ltr">
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
          </PremiumCard>
        </motion.div>
      )}

      {/* Basics */}
      <motion.div variants={item}>
        <PremiumCard className="p-4 space-y-3">
          <SectionHeader title={T.basics[lang]} icon={User} />

          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {T.name[lang]}
            </label>
            <input
              value={form.name ?? ''}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={T.namePh[lang]}
              className="w-full bg-card border border-border/40 rounded-xl px-3 py-2.5 text-[16px] text-foreground outline-none focus:border-primary/50"
            />
          </div>

          {/* Sex toggle */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {T.sex[lang]}
            </label>
            <div className="flex gap-2" dir="ltr">
              {(['male', 'female'] as Sex[]).map((s) => {
                const sel = form.sex === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField('sex', s)}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      sel
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-base leading-none">{s === 'male' ? '♂' : '♀'}</span>
                    {s === 'male' ? T.male[lang] : T.female[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Birth year + height + weight */}
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label={T.birthYear[lang]}
              value={form.birthYear}
              onChange={(v) => setField('birthYear', Math.max(minYear, Math.min(maxYear, v ?? thisYear - 25)))}
              step={1}
            />
            <NumberField
              label={T.height[lang]}
              value={form.heightCm}
              onChange={(v) => setField('heightCm', Math.max(100, Math.min(250, v ?? 175)))}
              step={0.5}
            />
            <NumberField
              label={T.weight[lang]}
              value={form.weightKg}
              onChange={(v) => setField('weightKg', v == null ? undefined : Math.max(30, Math.min(250, v)))}
              step={0.1}
            />
          </div>
        </PremiumCard>
      </motion.div>

      {/* Body measurements */}
      <motion.div variants={item}>
        <PremiumCard className="p-4 space-y-3">
          <SectionHeader title={T.measurements[lang]} subtitle={T.measurementsDesc[lang]} icon={Ruler} />
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label={T.neck[lang]}
              value={form.neckCm}
              onChange={(v) => setField('neckCm', v)}
              step={0.5}
              placeholder="cm"
            />
            <NumberField
              label={T.waist[lang]}
              value={form.waistCm}
              onChange={(v) => setField('waistCm', v)}
              step={0.5}
              placeholder="cm"
            />
            {form.sex === 'female' && (
              <NumberField
                label={T.hip[lang]}
                value={form.hipCm}
                onChange={(v) => setField('hipCm', v)}
                step={0.5}
                placeholder="cm"
              />
            )}
          </div>
        </PremiumCard>
      </motion.div>

      {/* Activity level */}
      <motion.div variants={item}>
        <PremiumCard className="p-4 space-y-3">
          <SectionHeader title={T.activity[lang]} icon={Footprints} />
          <div className="grid grid-cols-1 gap-1.5">
            {ACTIVITY_LEVELS.map((a) => {
              const sel = form.activityLevel === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setField('activityLevel', a)}
                  className={`flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl border transition-colors ${
                    sel
                      ? 'border-primary bg-primary/10'
                      : 'border-border/40 bg-card'
                  }`}
                >
                  <div className="text-start">
                    <p className={`text-[12px] font-bold ${sel ? 'text-primary' : 'text-foreground'}`}>
                      {T[a][lang]}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{T.activityHint[a][lang]}</p>
                  </div>
                  {sel && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </PremiumCard>
      </motion.div>

      {/* Goal */}
      <motion.div variants={item}>
        <PremiumCard className="p-4 space-y-3">
          <SectionHeader title={T.goal[lang]} icon={Target} />
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => {
              const Icon = g.icon;
              const sel = form.goal === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setField('goal', g.key)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-colors ${
                    sel ? 'border-current' : 'border-border/40 bg-card'
                  }`}
                  style={sel ? { background: `${g.color}1f`, color: g.color } : undefined}
                >
                  <Icon className="w-4 h-4" style={{ color: sel ? g.color : 'hsl(var(--muted-foreground))' }} />
                  <span className={`text-[11px] font-semibold ${sel ? '' : 'text-foreground'}`}>
                    {T[g.label][lang]}
                  </span>
                </button>
              );
            })}
          </div>
        </PremiumCard>
      </motion.div>

      {/* Experience */}
      <motion.div variants={item}>
        <PremiumCard className="p-4 space-y-3">
          <SectionHeader title={T.experience[lang]} icon={Dumbbell} />
          <div className="flex gap-2" dir="ltr">
            {EXPERIENCES.map((e) => {
              const sel = form.experience === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setField('experience', e)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors ${
                    sel ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {T[e][lang]}
                </button>
              );
            })}
          </div>
        </PremiumCard>
      </motion.div>

      {/* Units (metric only for now, future-proof) */}
      <motion.div variants={item}>
        <PremiumCard className="p-4 space-y-3">
          <SectionHeader title={T.unitsLabel[lang]} icon={Scale} />
          <div className="flex gap-2" dir="ltr">
            {(['metric', 'imperial'] as Units[]).map((u) => {
              const sel = form.units === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => setField('units', u)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors ${
                    sel ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {u === 'metric' ? T.metric[lang] : T.imperial[lang]}
                </button>
              );
            })}
          </div>
        </PremiumCard>
      </motion.div>

      {/* Sticky save bar */}
      <div className="sticky bottom-2 z-30">
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
