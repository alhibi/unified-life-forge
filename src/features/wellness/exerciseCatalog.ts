/**
 * Exercise catalog — bilingual (ar/de) reference of common lifts and cardio
 * modes. Used by the Workouts tab as a picker and to drive per-muscle-group
 * volume rollups.
 *
 * Pure data — no React, no network.
 */

export type Lang = 'ar' | 'de';

export type ExerciseType = 'strength' | 'cardio' | 'mobility' | 'plyo' | 'core';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'bodyweight'
  | 'kettlebell' | 'cable' | 'band' | 'cardio_machine' | 'none';

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'traps'
  | 'fullbody' | 'cardio';

export interface Exercise {
  key: string;
  type: ExerciseType;
  equipment: Equipment;
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  /** Suggested rep range for hypertrophy/strength default. */
  defaultSets?: number;
  defaultReps?: number;
  /** True for the "big four" + similar — used for strength-standards. */
  isBigLift?: boolean;
  label: Record<Lang, string>;
}

/** Bilingual labels for muscle groups (used in UI rollups). */
export const MUSCLE_LABELS: Record<MuscleGroup, Record<Lang, string>> = {
  chest:      { ar: 'الصدر',      de: 'Brust'        },
  back:       { ar: 'الظهر',      de: 'Rücken'       },
  shoulders:  { ar: 'الأكتاف',    de: 'Schultern'    },
  biceps:     { ar: 'البايسبس',   de: 'Bizeps'       },
  triceps:    { ar: 'الترايسبس',  de: 'Trizeps'      },
  forearms:   { ar: 'الساعدين',   de: 'Unterarme'    },
  quads:      { ar: 'الفخذين',    de: 'Quadrizeps'   },
  hamstrings: { ar: 'الخلفية',    de: 'Beinbeuger'   },
  glutes:     { ar: 'الأرداف',    de: 'Gesäß'        },
  calves:     { ar: 'السمانة',    de: 'Waden'        },
  core:       { ar: 'البطن',      de: 'Rumpf'        },
  traps:      { ar: 'شبه المنحرفة', de: 'Trapezius'  },
  fullbody:   { ar: 'الجسم كاملاً', de: 'Ganzkörper' },
  cardio:     { ar: 'كارديو',     de: 'Cardio'       },
};

export const EQUIPMENT_LABELS: Record<Equipment, Record<Lang, string>> = {
  barbell:        { ar: 'بار',          de: 'Langhantel'   },
  dumbbell:       { ar: 'دمبل',         de: 'Kurzhantel'   },
  machine:        { ar: 'جهاز',         de: 'Maschine'     },
  bodyweight:     { ar: 'وزن الجسم',    de: 'Körpergewicht'},
  kettlebell:     { ar: 'كيتل بل',       de: 'Kettlebell'   },
  cable:          { ar: 'كابل',         de: 'Kabelzug'     },
  band:           { ar: 'مطّاط',         de: 'Band'         },
  cardio_machine: { ar: 'جهاز كارديو',   de: 'Cardiogerät'  },
  none:           { ar: 'بدون',         de: 'Keines'       },
};

export const TYPE_LABELS: Record<ExerciseType, Record<Lang, string>> = {
  strength: { ar: 'قوة',     de: 'Kraft'       },
  cardio:   { ar: 'كارديو',  de: 'Cardio'      },
  mobility: { ar: 'مرونة',   de: 'Mobilität'   },
  plyo:     { ar: 'انفجارية',de: 'Plyometrie'  },
  core:     { ar: 'جذع',     de: 'Rumpf'       },
};

/* ───────────────────────── The catalog ───────────────────────── */

export const EXERCISES: Record<string, Exercise> = {
  // ─── Big four ───
  squat: {
    key: 'squat', type: 'strength', equipment: 'barbell', primary: 'quads',
    secondary: ['glutes', 'hamstrings', 'core'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'سكوات بالبار', de: 'Kniebeuge' },
  },
  front_squat: {
    key: 'front_squat', type: 'strength', equipment: 'barbell', primary: 'quads',
    secondary: ['core', 'glutes'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'سكوات أمامي', de: 'Frontkniebeuge' },
  },
  bench: {
    key: 'bench', type: 'strength', equipment: 'barbell', primary: 'chest',
    secondary: ['triceps', 'shoulders'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'بنش برس', de: 'Bankdrücken' },
  },
  incline_bench: {
    key: 'incline_bench', type: 'strength', equipment: 'barbell', primary: 'chest',
    secondary: ['shoulders', 'triceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'بنش مائل', de: 'Schrägbank' },
  },
  deadlift: {
    key: 'deadlift', type: 'strength', equipment: 'barbell', primary: 'back',
    secondary: ['hamstrings', 'glutes', 'forearms'], defaultSets: 3, defaultReps: 5, isBigLift: true,
    label: { ar: 'ديدليفت', de: 'Kreuzheben' },
  },
  romanian_dl: {
    key: 'romanian_dl', type: 'strength', equipment: 'barbell', primary: 'hamstrings',
    secondary: ['glutes', 'back'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'ديدليفت روماني', de: 'Rumänisches Kreuzheben' },
  },
  ohp: {
    key: 'ohp', type: 'strength', equipment: 'barbell', primary: 'shoulders',
    secondary: ['triceps', 'core'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'ضغط فوق الرأس', de: 'Schulterdrücken' },
  },

  // ─── Chest accessories ───
  dumbbell_press: {
    key: 'dumbbell_press', type: 'strength', equipment: 'dumbbell', primary: 'chest',
    secondary: ['shoulders', 'triceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'بنش دمبل', de: 'Kurzhantel-Drücken' },
  },
  dumbbell_fly: {
    key: 'dumbbell_fly', type: 'strength', equipment: 'dumbbell', primary: 'chest',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'تفتيح دمبل', de: 'Fliegende' },
  },
  cable_crossover: {
    key: 'cable_crossover', type: 'strength', equipment: 'cable', primary: 'chest',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'كابل صدر', de: 'Kabelzug Brust' },
  },
  push_up: {
    key: 'push_up', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'shoulders', 'core'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'تمرين الضغط', de: 'Liegestütz' },
  },

  // ─── Back accessories ───
  pull_up: {
    key: 'pull_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'forearms'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'سحب لأعلى', de: 'Klimmzug' },
  },
  chin_up: {
    key: 'chin_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'سحب أمامي', de: 'Chin-Up' },
  },
  lat_pulldown: {
    key: 'lat_pulldown', type: 'strength', equipment: 'cable', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'سحب علوي', de: 'Latzug' },
  },
  bent_row: {
    key: 'bent_row', type: 'strength', equipment: 'barbell', primary: 'back',
    secondary: ['biceps', 'forearms'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'تجديف منحني', de: 'Langhantelrudern' },
  },
  dumbbell_row: {
    key: 'dumbbell_row', type: 'strength', equipment: 'dumbbell', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'تجديف دمبل', de: 'Kurzhantelrudern' },
  },
  cable_row: {
    key: 'cable_row', type: 'strength', equipment: 'cable', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'تجديف كابل', de: 'Kabelrudern' },
  },
  face_pull: {
    key: 'face_pull', type: 'strength', equipment: 'cable', primary: 'shoulders',
    secondary: ['back'], defaultSets: 3, defaultReps: 15,
    label: { ar: 'سحب للوجه', de: 'Face Pull' },
  },

  // ─── Shoulder accessories ───
  lateral_raise: {
    key: 'lateral_raise', type: 'strength', equipment: 'dumbbell', primary: 'shoulders',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'رفرفة جانبية', de: 'Seitheben' },
  },
  rear_delt_fly: {
    key: 'rear_delt_fly', type: 'strength', equipment: 'dumbbell', primary: 'shoulders',
    secondary: ['back'], defaultSets: 3, defaultReps: 15,
    label: { ar: 'تفتيح خلفي', de: 'Hintere Schulter' },
  },
  arnold_press: {
    key: 'arnold_press', type: 'strength', equipment: 'dumbbell', primary: 'shoulders',
    secondary: ['triceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'ضغط أرنولد', de: 'Arnold-Drücken' },
  },
  shrug: {
    key: 'shrug', type: 'strength', equipment: 'dumbbell', primary: 'traps',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'هز الكتف', de: 'Shrugs' },
  },

  // ─── Arms ───
  barbell_curl: {
    key: 'barbell_curl', type: 'strength', equipment: 'barbell', primary: 'biceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'كيرل بار', de: 'Bizepscurl' },
  },
  hammer_curl: {
    key: 'hammer_curl', type: 'strength', equipment: 'dumbbell', primary: 'biceps',
    secondary: ['forearms'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'كيرل مطرقي', de: 'Hammercurl' },
  },
  preacher_curl: {
    key: 'preacher_curl', type: 'strength', equipment: 'machine', primary: 'biceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'كيرل واعظ', de: 'Scott-Curl' },
  },
  tricep_pushdown: {
    key: 'tricep_pushdown', type: 'strength', equipment: 'cable', primary: 'triceps',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'دفع ترايسبس', de: 'Trizepsdrücken' },
  },
  skull_crusher: {
    key: 'skull_crusher', type: 'strength', equipment: 'barbell', primary: 'triceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'سكول كراشر', de: 'Stirndrücken' },
  },
  dip: {
    key: 'dip', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest', 'shoulders'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'متوازي', de: 'Dips' },
  },

  // ─── Legs ───
  leg_press: {
    key: 'leg_press', type: 'strength', equipment: 'machine', primary: 'quads',
    secondary: ['glutes', 'hamstrings'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'ليج برس', de: 'Beinpresse' },
  },
  bulgarian_split: {
    key: 'bulgarian_split', type: 'strength', equipment: 'dumbbell', primary: 'quads',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'سبليت بلغاري', de: 'Bulgarian Split Squat' },
  },
  leg_curl: {
    key: 'leg_curl', type: 'strength', equipment: 'machine', primary: 'hamstrings',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'ليج كيرل', de: 'Beinbeuger' },
  },
  leg_extension: {
    key: 'leg_extension', type: 'strength', equipment: 'machine', primary: 'quads',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'ليج إكستنشن', de: 'Beinstrecker' },
  },
  hip_thrust: {
    key: 'hip_thrust', type: 'strength', equipment: 'barbell', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'هيب ثرست', de: 'Hip Thrust' },
  },
  walking_lunge: {
    key: 'walking_lunge', type: 'strength', equipment: 'dumbbell', primary: 'quads',
    secondary: ['glutes', 'hamstrings'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'لنجز مشي', de: 'Ausfallschritte' },
  },
  calf_raise: {
    key: 'calf_raise', type: 'strength', equipment: 'machine', primary: 'calves',
    defaultSets: 4, defaultReps: 15,
    label: { ar: 'رفع كعب', de: 'Wadenheben' },
  },

  // ─── Core ───
  plank: {
    key: 'plank', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 1,
    label: { ar: 'بلانك', de: 'Plank' },
  },
  hanging_leg_raise: {
    key: 'hanging_leg_raise', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'رفع رجل معلق', de: 'Hängendes Beinheben' },
  },
  russian_twist: {
    key: 'russian_twist', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 20,
    label: { ar: 'لفّة روسية', de: 'Russian Twist' },
  },
  cable_crunch: {
    key: 'cable_crunch', type: 'core', equipment: 'cable', primary: 'core',
    defaultSets: 3, defaultReps: 15,
    label: { ar: 'كرنش كابل', de: 'Cable Crunch' },
  },
  ab_rollout: {
    key: 'ab_rollout', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'رولر بطن', de: 'Ab-Rollout' },
  },

  // ─── Olympic / power ───
  power_clean: {
    key: 'power_clean', type: 'strength', equipment: 'barbell', primary: 'fullbody',
    secondary: ['back', 'quads', 'shoulders'], defaultSets: 5, defaultReps: 3,
    label: { ar: 'باور كلين', de: 'Power Clean' },
  },
  snatch: {
    key: 'snatch', type: 'strength', equipment: 'barbell', primary: 'fullbody',
    secondary: ['back', 'shoulders', 'quads'], defaultSets: 5, defaultReps: 2,
    label: { ar: 'سناتش', de: 'Reißen' },
  },
  kettlebell_swing: {
    key: 'kettlebell_swing', type: 'strength', equipment: 'kettlebell', primary: 'glutes',
    secondary: ['hamstrings', 'core', 'back'], defaultSets: 4, defaultReps: 15,
    label: { ar: 'سوينج كيتلبل', de: 'Kettlebell Swing' },
  },
  farmer_walk: {
    key: 'farmer_walk', type: 'strength', equipment: 'dumbbell', primary: 'forearms',
    secondary: ['traps', 'core'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'مشية المزارع', de: 'Farmers Walk' },
  },

  // ─── Plyometrics ───
  box_jump: {
    key: 'box_jump', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'calves'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'قفز صندوق', de: 'Box Jump' },
  },
  burpee: {
    key: 'burpee', type: 'plyo', equipment: 'bodyweight', primary: 'fullbody',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'بيربي', de: 'Burpee' },
  },

  // ─── Cardio ───
  running: {
    key: 'running', type: 'cardio', equipment: 'none', primary: 'cardio',
    defaultSets: 1, defaultReps: 1,
    label: { ar: 'جري', de: 'Laufen' },
  },
  cycling: {
    key: 'cycling', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    label: { ar: 'دراجة', de: 'Radfahren' },
  },
  rowing: {
    key: 'rowing', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    secondary: ['back', 'fullbody'], label: { ar: 'تجديف', de: 'Rudern' },
  },
  jump_rope: {
    key: 'jump_rope', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['calves'], label: { ar: 'حبل قفز', de: 'Springseil' },
  },
  swim: {
    key: 'swim', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['fullbody'], label: { ar: 'سباحة', de: 'Schwimmen' },
  },
  walk: {
    key: 'walk', type: 'cardio', equipment: 'none', primary: 'cardio',
    label: { ar: 'مشي', de: 'Gehen' },
  },
  elliptical: {
    key: 'elliptical', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    label: { ar: 'إليبتيكال', de: 'Crosstrainer' },
  },
  stair_master: {
    key: 'stair_master', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    secondary: ['quads', 'glutes'], label: { ar: 'سلم متحرّك', de: 'Stair Master' },
  },

  // ─── Mobility ───
  yoga_flow: {
    key: 'yoga_flow', type: 'mobility', equipment: 'none', primary: 'fullbody',
    label: { ar: 'يوغا', de: 'Yoga' },
  },
  foam_roll: {
    key: 'foam_roll', type: 'mobility', equipment: 'none', primary: 'fullbody',
    label: { ar: 'فوم رول', de: 'Foam Rolling' },
  },
};

export const EXERCISE_LIST: Exercise[] = Object.values(EXERCISES);

/* ───────────────────────── Workout templates ───────────────────────── */

export interface WorkoutTemplate {
  key: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  type: 'strength' | 'cardio' | 'hiit' | 'mobility';
  /** Approx total duration in minutes. */
  durationMin: number;
  exerciseKeys: string[];
}

export const TEMPLATES: WorkoutTemplate[] = [
  {
    key: 'push_day',
    type: 'strength',
    durationMin: 60,
    name: { ar: 'يوم الدفع', de: 'Push-Tag' },
    description: {
      ar: 'صدر، أكتاف، ترايسبس — تمارين مركّبة ثم عزل.',
      de: 'Brust, Schultern, Trizeps — Verbund- gefolgt von Isolationsübungen.',
    },
    exerciseKeys: ['bench', 'incline_bench', 'ohp', 'lateral_raise', 'tricep_pushdown', 'cable_crossover'],
  },
  {
    key: 'pull_day',
    type: 'strength',
    durationMin: 60,
    name: { ar: 'يوم السحب', de: 'Pull-Tag' },
    description: {
      ar: 'ظهر وبايسبس — قوة ثم سماكة الظهر.',
      de: 'Rücken & Bizeps — Kraft, dann Volumen.',
    },
    exerciseKeys: ['deadlift', 'pull_up', 'bent_row', 'lat_pulldown', 'face_pull', 'barbell_curl'],
  },
  {
    key: 'leg_day',
    type: 'strength',
    durationMin: 70,
    name: { ar: 'يوم الأرجل', de: 'Beintag' },
    description: {
      ar: 'سكوات وديدليفت روماني وعزل.',
      de: 'Kniebeuge, RDL und Isolation.',
    },
    exerciseKeys: ['squat', 'romanian_dl', 'leg_press', 'leg_curl', 'walking_lunge', 'calf_raise'],
  },
  {
    key: 'fullbody_a',
    type: 'strength',
    durationMin: 50,
    name: { ar: 'جسم كامل أ', de: 'Ganzkörper A' },
    description: {
      ar: 'ثلاث حركات مركّبة + جذع.',
      de: 'Drei Verbundübungen + Rumpf.',
    },
    exerciseKeys: ['squat', 'bench', 'bent_row', 'plank'],
  },
  {
    key: 'fullbody_b',
    type: 'strength',
    durationMin: 50,
    name: { ar: 'جسم كامل ب', de: 'Ganzkörper B' },
    description: {
      ar: 'ديدليفت، ضغط فوق الرأس، سحب.',
      de: 'Kreuzheben, OHP, Klimmzug.',
    },
    exerciseKeys: ['deadlift', 'ohp', 'pull_up', 'hanging_leg_raise'],
  },
  {
    key: 'hiit_20',
    type: 'hiit',
    durationMin: 20,
    name: { ar: 'هيت 20 دقيقة', de: 'HIIT 20 Min' },
    description: {
      ar: '8 جولات: 30 ثانية عمل / 30 ثانية راحة.',
      de: '8 Runden: 30 s Arbeit / 30 s Pause.',
    },
    exerciseKeys: ['burpee', 'box_jump', 'jump_rope', 'kettlebell_swing'],
  },
  {
    key: 'mobility_15',
    type: 'mobility',
    durationMin: 15,
    name: { ar: 'مرونة 15 دقيقة', de: 'Mobilität 15 Min' },
    description: {
      ar: 'يوغا خفيفة + فوم رول للتعافي.',
      de: 'Sanftes Yoga + Foam Rolling.',
    },
    exerciseKeys: ['yoga_flow', 'foam_roll'],
  },
  {
    key: 'core_finisher',
    type: 'strength',
    durationMin: 15,
    name: { ar: 'ختام جذع', de: 'Core-Finisher' },
    description: {
      ar: '3 جولات سريعة لتقوية البطن.',
      de: 'Drei schnelle Runden für den Rumpf.',
    },
    exerciseKeys: ['plank', 'hanging_leg_raise', 'russian_twist', 'ab_rollout'],
  },
];

/* ───────────────────────── Helpers ───────────────────────── */

/** Return exercises matching a muscle group (primary or secondary). */
export function exercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return EXERCISE_LIST.filter(
    (e) => e.primary === muscle || (e.secondary?.includes(muscle) ?? false),
  );
}

/** Resolve an exercise by key, supporting "custom:Name" entries. */
export function resolveExercise(key: string): Exercise | { key: string; label: { ar: string; de: string }; isCustom: true } {
  if (key.startsWith('custom:')) {
    const name = key.slice(7);
    return { key, isCustom: true as const, label: { ar: name, de: name } };
  }
  return EXERCISES[key] ?? EXERCISES.squat;
}

export function isCatalogExercise(key: string): boolean {
  return !key.startsWith('custom:') && key in EXERCISES;
}
