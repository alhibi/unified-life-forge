/**
 * Exercise catalog — bilingual (ar/de) reference of common lifts and cardio
 * modes. Used by the Workouts tab as a picker and to drive per-muscle-group
 * volume rollups.
 *
 * Pure data — no React, no network.
 */

export type Lang = 'ar';

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
  chest:      { ar: 'الصدر',        },
  back:       { ar: 'الظهر',       },
  shoulders:  { ar: 'الأكتاف',    },
  biceps:     { ar: 'البايسبس',       },
  triceps:    { ar: 'الترايسبس',      },
  forearms:   { ar: 'الساعدين',    },
  quads:      { ar: 'الفخذين',   },
  hamstrings: { ar: 'الخلفية',   },
  glutes:     { ar: 'الأرداف',        },
  calves:     { ar: 'السمانة',        },
  core:       { ar: 'البطن',        },
  traps:      { ar: 'شبه المنحرفة',  },
  fullbody:   { ar: 'الجسم كاملاً', },
  cardio:     { ar: 'كارديو',       },
};

export const EQUIPMENT_LABELS: Record<Equipment, Record<Lang, string>> = {
  barbell:        { ar: 'بار',   },
  dumbbell:       { ar: 'دمبل',   },
  machine:        { ar: 'جهاز',     },
  bodyweight:     { ar: 'وزن الجسم',},
  kettlebell:     { ar: 'كيتل بل',   },
  cable:          { ar: 'كابل',     },
  band:           { ar: 'مطّاط',         },
  cardio_machine: { ar: 'جهاز كارديو',  },
  none:           { ar: 'بدون',       },
};

export const TYPE_LABELS: Record<ExerciseType, Record<Lang, string>> = {
  strength: { ar: 'قوة',       },
  cardio:   { ar: 'كارديو',      },
  mobility: { ar: 'مرونة',   },
  plyo:     { ar: 'انفجارية',  },
  core:     { ar: 'جذع',       },
};

/* ───────────────────────── The catalog ───────────────────────── */

export const EXERCISES: Record<string, Exercise> = {
  // ─── Big four ───
  squat: {
    key: 'squat', type: 'strength', equipment: 'barbell', primary: 'quads',
    secondary: ['glutes', 'hamstrings', 'core'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'سكوات بالبار', },
  },
  front_squat: {
    key: 'front_squat', type: 'strength', equipment: 'barbell', primary: 'quads',
    secondary: ['core', 'glutes'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'سكوات أمامي', },
  },
  bench: {
    key: 'bench', type: 'strength', equipment: 'barbell', primary: 'chest',
    secondary: ['triceps', 'shoulders'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'بنش برس', },
  },
  incline_bench: {
    key: 'incline_bench', type: 'strength', equipment: 'barbell', primary: 'chest',
    secondary: ['shoulders', 'triceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'بنش مائل', },
  },
  deadlift: {
    key: 'deadlift', type: 'strength', equipment: 'barbell', primary: 'back',
    secondary: ['hamstrings', 'glutes', 'forearms'], defaultSets: 3, defaultReps: 5, isBigLift: true,
    label: { ar: 'ديدليفت', },
  },
  romanian_dl: {
    key: 'romanian_dl', type: 'strength', equipment: 'barbell', primary: 'hamstrings',
    secondary: ['glutes', 'back'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'ديدليفت روماني', },
  },
  ohp: {
    key: 'ohp', type: 'strength', equipment: 'barbell', primary: 'shoulders',
    secondary: ['triceps', 'core'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'ضغط فوق الرأس', },
  },

  // ─── Chest accessories ───
  dumbbell_press: {
    key: 'dumbbell_press', type: 'strength', equipment: 'dumbbell', primary: 'chest',
    secondary: ['shoulders', 'triceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'بنش دمبل', },
  },
  dumbbell_fly: {
    key: 'dumbbell_fly', type: 'strength', equipment: 'dumbbell', primary: 'chest',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'تفتيح دمبل', },
  },
  cable_crossover: {
    key: 'cable_crossover', type: 'strength', equipment: 'cable', primary: 'chest',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'كابل صدر', },
  },
  push_up: {
    key: 'push_up', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'shoulders', 'core'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'تمرين الضغط', },
  },

  // ─── Back accessories ───
  pull_up: {
    key: 'pull_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'forearms'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'سحب لأعلى', },
  },
  chin_up: {
    key: 'chin_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'سحب أمامي', },
  },
  lat_pulldown: {
    key: 'lat_pulldown', type: 'strength', equipment: 'cable', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'سحب علوي', },
  },
  bent_row: {
    key: 'bent_row', type: 'strength', equipment: 'barbell', primary: 'back',
    secondary: ['biceps', 'forearms'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'تجديف منحني', },
  },
  dumbbell_row: {
    key: 'dumbbell_row', type: 'strength', equipment: 'dumbbell', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'تجديف دمبل', },
  },
  cable_row: {
    key: 'cable_row', type: 'strength', equipment: 'cable', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'تجديف كابل', },
  },
  face_pull: {
    key: 'face_pull', type: 'strength', equipment: 'cable', primary: 'shoulders',
    secondary: ['back'], defaultSets: 3, defaultReps: 15,
    label: { ar: 'سحب للوجه', },
  },

  // ─── Shoulder accessories ───
  lateral_raise: {
    key: 'lateral_raise', type: 'strength', equipment: 'dumbbell', primary: 'shoulders',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'رفرفة جانبية', },
  },
  rear_delt_fly: {
    key: 'rear_delt_fly', type: 'strength', equipment: 'dumbbell', primary: 'shoulders',
    secondary: ['back'], defaultSets: 3, defaultReps: 15,
    label: { ar: 'تفتيح خلفي', },
  },
  arnold_press: {
    key: 'arnold_press', type: 'strength', equipment: 'dumbbell', primary: 'shoulders',
    secondary: ['triceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'ضغط أرنولد', },
  },
  shrug: {
    key: 'shrug', type: 'strength', equipment: 'dumbbell', primary: 'traps',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'هز الكتف', },
  },

  // ─── Arms ───
  barbell_curl: {
    key: 'barbell_curl', type: 'strength', equipment: 'barbell', primary: 'biceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'كيرل بار', },
  },
  hammer_curl: {
    key: 'hammer_curl', type: 'strength', equipment: 'dumbbell', primary: 'biceps',
    secondary: ['forearms'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'كيرل مطرقي', },
  },
  preacher_curl: {
    key: 'preacher_curl', type: 'strength', equipment: 'machine', primary: 'biceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'كيرل واعظ', },
  },
  tricep_pushdown: {
    key: 'tricep_pushdown', type: 'strength', equipment: 'cable', primary: 'triceps',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'دفع ترايسبس', },
  },
  skull_crusher: {
    key: 'skull_crusher', type: 'strength', equipment: 'barbell', primary: 'triceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'سكول كراشر', },
  },
  dip: {
    key: 'dip', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest', 'shoulders'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'متوازي', },
  },

  // ─── Legs ───
  leg_press: {
    key: 'leg_press', type: 'strength', equipment: 'machine', primary: 'quads',
    secondary: ['glutes', 'hamstrings'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'ليج برس', },
  },
  bulgarian_split: {
    key: 'bulgarian_split', type: 'strength', equipment: 'dumbbell', primary: 'quads',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'سبليت بلغاري', },
  },
  leg_curl: {
    key: 'leg_curl', type: 'strength', equipment: 'machine', primary: 'hamstrings',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'ليج كيرل', },
  },
  leg_extension: {
    key: 'leg_extension', type: 'strength', equipment: 'machine', primary: 'quads',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'ليج إكستنشن', },
  },
  hip_thrust: {
    key: 'hip_thrust', type: 'strength', equipment: 'barbell', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'هيب ثرست', },
  },
  walking_lunge: {
    key: 'walking_lunge', type: 'strength', equipment: 'dumbbell', primary: 'quads',
    secondary: ['glutes', 'hamstrings'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'لنجز مشي', },
  },
  calf_raise: {
    key: 'calf_raise', type: 'strength', equipment: 'machine', primary: 'calves',
    defaultSets: 4, defaultReps: 15,
    label: { ar: 'رفع كعب', },
  },

  // ─── Core ───
  plank: {
    key: 'plank', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 1,
    label: { ar: 'بلانك', },
  },
  hanging_leg_raise: {
    key: 'hanging_leg_raise', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'رفع رجل معلق', },
  },
  russian_twist: {
    key: 'russian_twist', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 20,
    label: { ar: 'لفّة روسية', },
  },
  cable_crunch: {
    key: 'cable_crunch', type: 'core', equipment: 'cable', primary: 'core',
    defaultSets: 3, defaultReps: 15,
    label: { ar: 'كرنش كابل', },
  },
  ab_rollout: {
    key: 'ab_rollout', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'رولر بطن', },
  },

  // ─── Olympic / power ───
  power_clean: {
    key: 'power_clean', type: 'strength', equipment: 'barbell', primary: 'fullbody',
    secondary: ['back', 'quads', 'shoulders'], defaultSets: 5, defaultReps: 3,
    label: { ar: 'باور كلين', },
  },
  snatch: {
    key: 'snatch', type: 'strength', equipment: 'barbell', primary: 'fullbody',
    secondary: ['back', 'shoulders', 'quads'], defaultSets: 5, defaultReps: 2,
    label: { ar: 'سناتش', },
  },
  kettlebell_swing: {
    key: 'kettlebell_swing', type: 'strength', equipment: 'kettlebell', primary: 'glutes',
    secondary: ['hamstrings', 'core', 'back'], defaultSets: 4, defaultReps: 15,
    label: { ar: 'سوينج كيتلبل', },
  },
  farmer_walk: {
    key: 'farmer_walk', type: 'strength', equipment: 'dumbbell', primary: 'forearms',
    secondary: ['traps', 'core'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'مشية المزارع', },
  },

  // ─── Plyometrics ───
  box_jump: {
    key: 'box_jump', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'calves'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'قفز صندوق', },
  },
  burpee: {
    key: 'burpee', type: 'plyo', equipment: 'bodyweight', primary: 'fullbody',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'بيربي', },
  },

  // ─── Cardio ───
  running: {
    key: 'running', type: 'cardio', equipment: 'none', primary: 'cardio',
    defaultSets: 1, defaultReps: 1,
    label: { ar: 'جري', },
  },
  cycling: {
    key: 'cycling', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    label: { ar: 'دراجة', },
  },
  rowing: {
    key: 'rowing', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    secondary: ['back', 'fullbody'], label: { ar: 'تجديف', },
  },
  jump_rope: {
    key: 'jump_rope', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['calves'], label: { ar: 'حبل قفز', },
  },
  swim: {
    key: 'swim', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['fullbody'], label: { ar: 'سباحة', },
  },
  walk: {
    key: 'walk', type: 'cardio', equipment: 'none', primary: 'cardio',
    label: { ar: 'مشي', },
  },
  elliptical: {
    key: 'elliptical', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    label: { ar: 'إليبتيكال', },
  },
  stair_master: {
    key: 'stair_master', type: 'cardio', equipment: 'cardio_machine', primary: 'cardio',
    secondary: ['quads', 'glutes'], label: { ar: 'سلم متحرّك', },
  },

  // ─── Mobility ───
  yoga_flow: {
    key: 'yoga_flow', type: 'mobility', equipment: 'none', primary: 'fullbody',
    label: { ar: 'يوغا', },
  },
  foam_roll: {
    key: 'foam_roll', type: 'mobility', equipment: 'none', primary: 'fullbody',
    label: { ar: 'فوم رول', },
  },
  cat_cow: {
    key: 'cat_cow', type: 'mobility', equipment: 'bodyweight', primary: 'core',
    secondary: ['back'], defaultSets: 2, defaultReps: 10,
    label: { ar: 'القط والبقرة', },
  },
  hip_opener: {
    key: 'hip_opener', type: 'mobility', equipment: 'bodyweight', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 2, defaultReps: 1,
    label: { ar: 'فاتح الورك', },
  },
  shoulder_dislocate: {
    key: 'shoulder_dislocate', type: 'mobility', equipment: 'band', primary: 'shoulders',
    defaultSets: 2, defaultReps: 12,
    label: { ar: 'فك ارتباط الكتف', },
  },
  thoracic_extension: {
    key: 'thoracic_extension', type: 'mobility', equipment: 'bodyweight', primary: 'back',
    defaultSets: 2, defaultReps: 10,
    label: { ar: 'تمدد صدري ظهري', },
  },
  couch_stretch: {
    key: 'couch_stretch', type: 'mobility', equipment: 'bodyweight', primary: 'quads',
    defaultSets: 2, defaultReps: 1,
    label: { ar: 'تمدد الأريكة', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Push progressions
  // ════════════════════════════════════════════════════════════
  wall_pushup: {
    key: 'wall_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'shoulders'], defaultSets: 3, defaultReps: 15,
    label: { ar: 'ضغط على الحائط', },
  },
  incline_pushup: {
    key: 'incline_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'ضغط مرتفع', },
  },
  knee_pushup: {
    key: 'knee_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'ضغط على الركبة', },
  },
  diamond_pushup: {
    key: 'diamond_pushup', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط الماس', },
  },
  decline_pushup: {
    key: 'decline_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders', 'triceps'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط منخفض', },
  },
  archer_pushup: {
    key: 'archer_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'core'], defaultSets: 3, defaultReps: 6,
    label: { ar: 'ضغط الرامي', },
  },
  pseudo_planche_pushup: {
    key: 'pseudo_planche_pushup', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['chest', 'triceps', 'core'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'ضغط بلانش وهمي', },
  },
  one_arm_pushup: {
    key: 'one_arm_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'core'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'ضغط بيد واحدة', },
  },
  pike_pushup: {
    key: 'pike_pushup', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['triceps'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط بايك', },
  },
  hspu: {
    key: 'hspu', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['triceps', 'traps'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'ضغط الوقوف على اليدين', },
  },
  ring_dip: {
    key: 'ring_dip', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest', 'shoulders'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'ديبس حلقات', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Pull progressions
  // ════════════════════════════════════════════════════════════
  dead_hang: {
    key: 'dead_hang', type: 'strength', equipment: 'bodyweight', primary: 'forearms',
    secondary: ['back', 'core'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'تعليق ميت', },
  },
  scapular_pull: {
    key: 'scapular_pull', type: 'strength', equipment: 'bodyweight', primary: 'back',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'سحب لوح الكتف', },
  },
  negative_pullup: {
    key: 'negative_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'سحب سلبي', },
  },
  band_pullup: {
    key: 'band_pullup', type: 'strength', equipment: 'band', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'سحب بمطّاط', },
  },
  archer_pullup: {
    key: 'archer_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'سحب الرامي', },
  },
  typewriter_pullup: {
    key: 'typewriter_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 3, defaultReps: 4,
    label: { ar: 'سحب الآلة الكاتبة', },
  },
  one_arm_pullup: {
    key: 'one_arm_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'سحب بيد واحدة', },
  },
  muscle_up: {
    key: 'muscle_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['triceps', 'chest', 'biceps'], defaultSets: 5, defaultReps: 3,
    label: { ar: 'ماصل أب', },
  },
  inverted_row: {
    key: 'inverted_row', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'تجديف مقلوب', },
  },
  ring_row: {
    key: 'ring_row', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'تجديف حلقات', },
  },
  front_lever_raise: {
    key: 'front_lever_raise', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['core'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'رفع فرنت ليفر', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Static holds & advanced
  // ════════════════════════════════════════════════════════════
  tuck_planche: {
    key: 'tuck_planche', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core', 'chest'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'بلانش متكوّر', },
  },
  straddle_planche: {
    key: 'straddle_planche', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core', 'chest'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'بلانش مفتوح', },
  },
  full_planche: {
    key: 'full_planche', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core', 'chest'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'بلانش كامل', },
  },
  tuck_front_lever: {
    key: 'tuck_front_lever', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'فرنت ليفر متكوّر', },
  },
  full_front_lever: {
    key: 'full_front_lever', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'فرنت ليفر كامل', },
  },
  back_lever: {
    key: 'back_lever', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['shoulders', 'core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'باك ليفر', },
  },
  human_flag: {
    key: 'human_flag', type: 'strength', equipment: 'bodyweight', primary: 'core',
    secondary: ['shoulders', 'back'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'العلم البشري', },
  },
  l_sit: {
    key: 'l_sit', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['triceps', 'quads'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'إل-سيت', },
  },
  v_sit: {
    key: 'v_sit', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['triceps'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'في-سيت', },
  },
  manna: {
    key: 'manna', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['shoulders'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'منّا', },
  },
  wall_handstand: {
    key: 'wall_handstand', type: 'mobility', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'وقوف يدين بالحائط', },
  },
  free_handstand: {
    key: 'free_handstand', type: 'mobility', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'وقوف يدين حرّ', },
  },
  handstand_walk: {
    key: 'handstand_walk', type: 'mobility', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'مشي على اليدين', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Legs (bodyweight)
  // ════════════════════════════════════════════════════════════
  air_squat: {
    key: 'air_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 20,
    label: { ar: 'سكوات هواء', },
  },
  jump_squat: {
    key: 'jump_squat', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'calves'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'قفز سكوات', },
  },
  cossack_squat: {
    key: 'cossack_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'hamstrings'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'سكوات قوزاقي', },
  },
  pistol_squat: {
    key: 'pistol_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'core'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'بستول سكوات', },
  },
  shrimp_squat: {
    key: 'shrimp_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'core'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'شريمب سكوات', },
  },
  nordic_curl: {
    key: 'nordic_curl', type: 'strength', equipment: 'bodyweight', primary: 'hamstrings',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'كيرل نوردي', },
  },
  glute_bridge: {
    key: 'glute_bridge', type: 'strength', equipment: 'bodyweight', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 3, defaultReps: 15,
    label: { ar: 'جسر الأرداف', },
  },
  single_leg_glute_bridge: {
    key: 'single_leg_glute_bridge', type: 'strength', equipment: 'bodyweight', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'جسر برجل واحدة', },
  },
  step_up: {
    key: 'step_up', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'صعود الدرج', },
  },
  wall_sit: {
    key: 'wall_sit', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'الجلوس على الحائط', },
  },

  // ════════════════════════════════════════════════════════════
  //  CORE — Advanced
  // ════════════════════════════════════════════════════════════
  side_plank: {
    key: 'side_plank', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 1,
    label: { ar: 'بلانك جانبي', },
  },
  hollow_hold: {
    key: 'hollow_hold', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 4, defaultReps: 1,
    label: { ar: 'هولو هولد', },
  },
  arch_hold: {
    key: 'arch_hold', type: 'core', equipment: 'bodyweight', primary: 'back',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'قوس ثابت', },
  },
  dragon_flag: {
    key: 'dragon_flag', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 4, defaultReps: 6,
    label: { ar: 'علم التنّين', },
  },
  toes_to_bar: {
    key: 'toes_to_bar', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['back'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'القدمان إلى البار', },
  },
  windshield_wiper: {
    key: 'windshield_wiper', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 8,
    label: { ar: 'مساحات الزجاج', },
  },
  pallof_press: {
    key: 'pallof_press', type: 'core', equipment: 'cable', primary: 'core',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط بالوف', },
  },
  bird_dog: {
    key: 'bird_dog', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['back', 'glutes'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'الكلب-الطائر', },
  },
  dead_bug: {
    key: 'dead_bug', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'الحشرة الميتة', },
  },
  copenhagen_plank: {
    key: 'copenhagen_plank', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'بلانك كوبنهاجن', },
  },

  // ════════════════════════════════════════════════════════════
  //  PLYO / EXPLOSIVE
  // ════════════════════════════════════════════════════════════
  broad_jump: {
    key: 'broad_jump', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'قفز طولي', },
  },
  tuck_jump: {
    key: 'tuck_jump', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['core', 'calves'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'قفز متكوّر', },
  },
  depth_jump: {
    key: 'depth_jump', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'calves'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'قفز عمق', },
  },
  clap_pushup: {
    key: 'clap_pushup', type: 'plyo', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'shoulders'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'ضغط مع تصفيق', },
  },
  mountain_climber: {
    key: 'mountain_climber', type: 'cardio', equipment: 'bodyweight', primary: 'core',
    secondary: ['cardio', 'shoulders'], defaultSets: 3, defaultReps: 30,
    label: { ar: 'متسلق الجبال', },
  },
  bear_crawl: {
    key: 'bear_crawl', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['shoulders', 'cardio'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'زحف الدّب', },
  },
  crab_walk: {
    key: 'crab_walk', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['glutes', 'shoulders'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'مشي السرطان', },
  },

  // ════════════════════════════════════════════════════════════
  //  SPORT-SPECIFIC / CONDITIONING
  // ════════════════════════════════════════════════════════════
  sprint: {
    key: 'sprint', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['quads', 'glutes', 'calves'], defaultSets: 6, defaultReps: 1,
    label: { ar: 'عدو سريع', },
  },
  hill_sprint: {
    key: 'hill_sprint', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['quads', 'glutes'], defaultSets: 6, defaultReps: 1,
    label: { ar: 'عدو منحدر', },
  },
  shuttle_run: {
    key: 'shuttle_run', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['quads'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'جري مكوكي', },
  },
  battle_ropes: {
    key: 'battle_ropes', type: 'cardio', equipment: 'none', primary: 'cardio',
    secondary: ['shoulders', 'core'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'حبل المعركة', },
  },
  sled_push: {
    key: 'sled_push', type: 'strength', equipment: 'machine', primary: 'fullbody',
    secondary: ['quads', 'glutes', 'cardio'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'دفع المزلجة', },
  },
  goblet_squat: {
    key: 'goblet_squat', type: 'strength', equipment: 'kettlebell', primary: 'quads',
    secondary: ['glutes', 'core'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'سكوات كأس', },
  },
  turkish_getup: {
    key: 'turkish_getup', type: 'strength', equipment: 'kettlebell', primary: 'fullbody',
    secondary: ['core', 'shoulders'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'النهوض التركي', },
  },
  thruster: {
    key: 'thruster', type: 'strength', equipment: 'barbell', primary: 'fullbody',
    secondary: ['quads', 'shoulders'], defaultSets: 5, defaultReps: 8,
    label: { ar: 'ثرستر', },
  },
  wall_ball: {
    key: 'wall_ball', type: 'strength', equipment: 'none', primary: 'fullbody',
    secondary: ['quads', 'shoulders'], defaultSets: 4, defaultReps: 15,
    label: { ar: 'كرة الحائط', },
  },
  jumping_jacks: {
    key: 'jumping_jacks', type: 'cardio', equipment: 'bodyweight', primary: 'cardio',
    defaultSets: 3, defaultReps: 30,
    label: { ar: 'قفز فتح وضم', },
  },
  high_knees: {
    key: 'high_knees', type: 'cardio', equipment: 'bodyweight', primary: 'cardio',
    secondary: ['quads'], defaultSets: 3, defaultReps: 30,
    label: { ar: 'ركبتان عاليتان', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Extended Push Progressions
  // ════════════════════════════════════════════════════════════
  wide_pushup: {
    key: 'wide_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'ضغط واسع', },
  },
  hindu_pushup: {
    key: 'hindu_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders', 'triceps', 'core'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط هندي', },
  },
  dive_bomber_pushup: {
    key: 'dive_bomber_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders', 'triceps', 'core'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'ضغط القاذفة', },
  },
  ring_pushup: {
    key: 'ring_pushup', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['triceps', 'core', 'shoulders'], defaultSets: 4, defaultReps: 10,
    label: { ar: 'ضغط على الحلقات', },
  },
  sphinx_pushup: {
    key: 'sphinx_pushup', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط أبو الهول', },
  },
  tiger_bend_pushup: {
    key: 'tiger_bend_pushup', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['shoulders', 'chest'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'ضغط انحناء النمر', },
  },
  elevated_pike_pushup: {
    key: 'elevated_pike_pushup', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['triceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'بايك مرتفع', },
  },
  wall_hspu: {
    key: 'wall_hspu', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['triceps', 'traps', 'core'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'ضغط يدين بالحائط', },
  },
  deficit_hspu: {
    key: 'deficit_hspu', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['triceps', 'traps'], defaultSets: 4, defaultReps: 4,
    label: { ar: 'HSPU عميق', },
  },
  korean_dip: {
    key: 'korean_dip', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['shoulders', 'chest'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'ديبس كوري', },
  },
  impossible_dip: {
    key: 'impossible_dip', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest', 'shoulders', 'core'], defaultSets: 4, defaultReps: 4,
    label: { ar: 'ديبس مستحيل', },
  },
  bulgarian_dip: {
    key: 'bulgarian_dip', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest', 'shoulders'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'ديبس بلغاري', },
  },
  planche_pushup: {
    key: 'planche_pushup', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['chest', 'core', 'triceps'], defaultSets: 5, defaultReps: 3,
    label: { ar: 'ضغط بلانش', },
  },
  planche_lean: {
    key: 'planche_lean', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core', 'chest'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'ميلان البلانش', },
  },
  frog_stand: {
    key: 'frog_stand', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core', 'triceps'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'وقفة الضفدع', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Extended Pull Progressions
  // ════════════════════════════════════════════════════════════
  close_grip_pullup: {
    key: 'close_grip_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 8,
    label: { ar: 'عقلة ضيقة', },
  },
  wide_pullup: {
    key: 'wide_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'shoulders'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'عقلة واسعة', },
  },
  commando_pullup: {
    key: 'commando_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'core'], defaultSets: 3, defaultReps: 6,
    label: { ar: 'عقلة كوماندوز', },
  },
  l_sit_pullup: {
    key: 'l_sit_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'core'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'عقلة إل-سيت', },
  },
  explosive_pullup: {
    key: 'explosive_pullup', type: 'plyo', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'عقلة انفجارية', },
  },
  false_grip_pullup: {
    key: 'false_grip_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['forearms', 'biceps'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'عقلة قبضة كاذبة', },
  },
  weighted_pullup: {
    key: 'weighted_pullup', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['biceps', 'forearms'], defaultSets: 5, defaultReps: 5, isBigLift: true,
    label: { ar: 'عقلة بأوزان', },
  },
  ring_muscle_up: {
    key: 'ring_muscle_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['triceps', 'chest', 'biceps'], defaultSets: 5, defaultReps: 3,
    label: { ar: 'ماصل أب حلقات', },
  },
  slow_muscle_up: {
    key: 'slow_muscle_up', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['triceps', 'chest'], defaultSets: 4, defaultReps: 3,
    label: { ar: 'ماصل أب بطيء', },
  },
  front_lever_row: {
    key: 'front_lever_row', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['core', 'biceps'], defaultSets: 4, defaultReps: 5,
    label: { ar: 'تجديف فرنت ليفر', },
  },
  ice_cream_maker: {
    key: 'ice_cream_maker', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['core', 'biceps'], defaultSets: 4, defaultReps: 6,
    label: { ar: 'آيس كريم ميكر', },
  },
  skin_the_cat: {
    key: 'skin_the_cat', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['back', 'core'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'سكن ذا كات', },
  },
  pelican_curl: {
    key: 'pelican_curl', type: 'strength', equipment: 'bodyweight', primary: 'biceps',
    secondary: ['forearms', 'shoulders'], defaultSets: 3, defaultReps: 6,
    label: { ar: 'كيرل البجعة', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Extended Legs (Bodyweight)
  // ════════════════════════════════════════════════════════════
  sissy_squat: {
    key: 'sissy_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['core'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'سيسي سكوات', },
  },
  dragon_squat: {
    key: 'dragon_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'core'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'سكوات التنين', },
  },
  natural_leg_extension: {
    key: 'natural_leg_extension', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['core'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'تمديد ساق طبيعي', },
  },
  reverse_nordic: {
    key: 'reverse_nordic', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['core'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'نوردك معكوس', },
  },
  single_leg_rdl: {
    key: 'single_leg_rdl', type: 'strength', equipment: 'bodyweight', primary: 'hamstrings',
    secondary: ['glutes', 'core'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'ديدليفت رجل واحدة', },
  },
  hamstring_slide: {
    key: 'hamstring_slide', type: 'strength', equipment: 'bodyweight', primary: 'hamstrings',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'انزلاق خلفي', },
  },
  single_leg_hip_thrust: {
    key: 'single_leg_hip_thrust', type: 'strength', equipment: 'bodyweight', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'هيب ثرست رجل واحدة', },
  },
  elevated_calf_raise: {
    key: 'elevated_calf_raise', type: 'strength', equipment: 'bodyweight', primary: 'calves',
    defaultSets: 4, defaultReps: 20,
    label: { ar: 'رفع كعب مرتفع', },
  },
  single_leg_calf_raise: {
    key: 'single_leg_calf_raise', type: 'strength', equipment: 'bodyweight', primary: 'calves',
    defaultSets: 4, defaultReps: 15,
    label: { ar: 'رفع كعب رجل واحدة', },
  },
  sprinter_lunge: {
    key: 'sprinter_lunge', type: 'plyo', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'calves'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'لنج العدّاء', },
  },
  lateral_lunge: {
    key: 'lateral_lunge', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'hamstrings'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'لنج جانبي', },
  },
  skater_squat: {
    key: 'skater_squat', type: 'strength', equipment: 'bodyweight', primary: 'quads',
    secondary: ['glutes', 'core'], defaultSets: 3, defaultReps: 6,
    label: { ar: 'سكوات المتزلج', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Extended Core & Statics
  // ════════════════════════════════════════════════════════════
  hanging_windshield_wiper: {
    key: 'hanging_windshield_wiper', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['back'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'مساحات معلقة', },
  },
  front_lever_hold: {
    key: 'front_lever_hold', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'ثبات فرنت ليفر', },
  },
  back_lever_hold: {
    key: 'back_lever_hold', type: 'strength', equipment: 'bodyweight', primary: 'back',
    secondary: ['shoulders', 'core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'ثبات باك ليفر', },
  },
  ring_support_hold: {
    key: 'ring_support_hold', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['shoulders', 'core'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'ثبات على الحلقات', },
  },
  rto_support: {
    key: 'rto_support', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    secondary: ['chest', 'shoulders'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'حلقات مفتوحة RTO', },
  },
  iron_cross_hold: {
    key: 'iron_cross_hold', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders', 'biceps'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'ثبات الصليب الحديدي', },
  },
  maltese_hold: {
    key: 'maltese_hold', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders', 'core'], defaultSets: 5, defaultReps: 1,
    label: { ar: 'ثبات مالتيز', },
  },
  press_to_handstand: {
    key: 'press_to_handstand', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core'], defaultSets: 4, defaultReps: 3,
    label: { ar: 'ضغط للوقوف على اليدين', },
  },
  straddle_press: {
    key: 'straddle_press', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['core'], defaultSets: 4, defaultReps: 3,
    label: { ar: 'ضغط مفتوح للوقوف', },
  },
  ab_wheel_standing: {
    key: 'ab_wheel_standing', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['shoulders'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'عجلة البطن واقفاً', },
  },
  ring_ab_rollout: {
    key: 'ring_ab_rollout', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['shoulders'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'رولأوت حلقات', },
  },
  hanging_knee_raise: {
    key: 'hanging_knee_raise', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 12,
    label: { ar: 'رفع ركبة معلق', },
  },
  body_saw: {
    key: 'body_saw', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['shoulders'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'المنشار', },
  },
  plank_to_pushup: {
    key: 'plank_to_pushup', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['triceps', 'shoulders'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'بلانك إلى ضغط', },
  },
  reverse_plank: {
    key: 'reverse_plank', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['glutes', 'shoulders'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'بلانك معكوس', },
  },
  banana_hold: {
    key: 'banana_hold', type: 'core', equipment: 'bodyweight', primary: 'core',
    defaultSets: 3, defaultReps: 1,
    label: { ar: 'ثبات الموزة', },
  },
  superman_hold: {
    key: 'superman_hold', type: 'core', equipment: 'bodyweight', primary: 'back',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'ثبات سوبرمان', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Rings Specific
  // ════════════════════════════════════════════════════════════
  ring_flies: {
    key: 'ring_flies', type: 'strength', equipment: 'bodyweight', primary: 'chest',
    secondary: ['shoulders', 'core'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'تفتيح حلقات', },
  },
  ring_face_pull: {
    key: 'ring_face_pull', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['back'], defaultSets: 3, defaultReps: 12,
    label: { ar: 'سحب وجه بالحلقات', },
  },
  ring_bicep_curl: {
    key: 'ring_bicep_curl', type: 'strength', equipment: 'bodyweight', primary: 'biceps',
    secondary: ['forearms'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'كيرل حلقات', },
  },
  ring_tricep_extension: {
    key: 'ring_tricep_extension', type: 'strength', equipment: 'bodyweight', primary: 'triceps',
    defaultSets: 3, defaultReps: 10,
    label: { ar: 'تمديد ترايسبس حلقات', },
  },
  ring_pike_pushup: {
    key: 'ring_pike_pushup', type: 'strength', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['triceps', 'core'], defaultSets: 3, defaultReps: 8,
    label: { ar: 'بايك حلقات', },
  },
  ring_l_sit: {
    key: 'ring_l_sit', type: 'core', equipment: 'bodyweight', primary: 'core',
    secondary: ['triceps'], defaultSets: 4, defaultReps: 1,
    label: { ar: 'إل-سيت حلقات', },
  },

  // ════════════════════════════════════════════════════════════
  //  CALISTHENICS — Mobility & Flexibility (for athletes)
  // ════════════════════════════════════════════════════════════
  pike_stretch: {
    key: 'pike_stretch', type: 'mobility', equipment: 'bodyweight', primary: 'hamstrings',
    secondary: ['back'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'تمدد بايك', },
  },
  pancake_stretch: {
    key: 'pancake_stretch', type: 'mobility', equipment: 'bodyweight', primary: 'hamstrings',
    secondary: ['glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'تمدد الفطيرة', },
  },
  bridge: {
    key: 'bridge', type: 'mobility', equipment: 'bodyweight', primary: 'back',
    secondary: ['shoulders', 'glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'الجسر', },
  },
  full_bridge: {
    key: 'full_bridge', type: 'mobility', equipment: 'bodyweight', primary: 'back',
    secondary: ['shoulders', 'glutes', 'quads'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'الجسر الكامل', },
  },
  wrist_prep: {
    key: 'wrist_prep', type: 'mobility', equipment: 'bodyweight', primary: 'forearms',
    defaultSets: 2, defaultReps: 1,
    label: { ar: 'تحضير المعصم', },
  },
  front_split: {
    key: 'front_split', type: 'mobility', equipment: 'bodyweight', primary: 'hamstrings',
    secondary: ['quads', 'glutes'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'سبليت أمامي', },
  },
  middle_split: {
    key: 'middle_split', type: 'mobility', equipment: 'bodyweight', primary: 'glutes',
    secondary: ['hamstrings'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'سبليت وسطي', },
  },
  jefferson_curl: {
    key: 'jefferson_curl', type: 'mobility', equipment: 'bodyweight', primary: 'back',
    secondary: ['hamstrings'], defaultSets: 3, defaultReps: 5,
    label: { ar: 'جيفرسون كيرل', },
  },
  german_hang: {
    key: 'german_hang', type: 'mobility', equipment: 'bodyweight', primary: 'shoulders',
    secondary: ['biceps', 'back'], defaultSets: 3, defaultReps: 1,
    label: { ar: 'التعليق الألماني', },
  },
  scapular_push_up: {
    key: 'scapular_push_up', type: 'mobility', equipment: 'bodyweight', primary: 'back',
    secondary: ['shoulders'], defaultSets: 3, defaultReps: 10,
    label: { ar: 'ضغط لوح الكتف', },
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
    name: { ar: 'يوم الدفع', },
    description: {
      ar: 'صدر، أكتاف، ترايسبس — تمارين مركّبة ثم عزل.',
    },
    exerciseKeys: ['bench', 'incline_bench', 'ohp', 'lateral_raise', 'tricep_pushdown', 'cable_crossover'],
  },
  {
    key: 'pull_day',
    type: 'strength',
    durationMin: 60,
    name: { ar: 'يوم السحب', },
    description: {
      ar: 'ظهر وبايسبس — قوة ثم سماكة الظهر.',
    },
    exerciseKeys: ['deadlift', 'pull_up', 'bent_row', 'lat_pulldown', 'face_pull', 'barbell_curl'],
  },
  {
    key: 'leg_day',
    type: 'strength',
    durationMin: 70,
    name: { ar: 'يوم الأرجل', },
    description: {
      ar: 'سكوات وديدليفت روماني وعزل.',
    },
    exerciseKeys: ['squat', 'romanian_dl', 'leg_press', 'leg_curl', 'walking_lunge', 'calf_raise'],
  },
  {
    key: 'fullbody_a',
    type: 'strength',
    durationMin: 50,
    name: { ar: 'جسم كامل أ', },
    description: {
      ar: 'ثلاث حركات مركّبة + جذع.',
    },
    exerciseKeys: ['squat', 'bench', 'bent_row', 'plank'],
  },
  {
    key: 'fullbody_b',
    type: 'strength',
    durationMin: 50,
    name: { ar: 'جسم كامل ب', },
    description: {
      ar: 'ديدليفت، ضغط فوق الرأس، سحب.',
    },
    exerciseKeys: ['deadlift', 'ohp', 'pull_up', 'hanging_leg_raise'],
  },
  {
    key: 'hiit_20',
    type: 'hiit',
    durationMin: 20,
    name: { ar: 'هيت 20 دقيقة', },
    description: {
      ar: '8 جولات: 30 ثانية عمل / 30 ثانية راحة.',
    },
    exerciseKeys: ['burpee', 'box_jump', 'jump_rope', 'kettlebell_swing'],
  },
  {
    key: 'mobility_15',
    type: 'mobility',
    durationMin: 15,
    name: { ar: 'مرونة 15 دقيقة', },
    description: {
      ar: 'يوغا خفيفة + فوم رول للتعافي.',
    },
    exerciseKeys: ['yoga_flow', 'foam_roll'],
  },
  {
    key: 'core_finisher',
    type: 'strength',
    durationMin: 15,
    name: { ar: 'ختام جذع', },
    description: {
      ar: '3 جولات سريعة لتقوية البطن.',
    },
    exerciseKeys: ['plank', 'hanging_leg_raise', 'russian_twist', 'ab_rollout'],
  },
  {
    key: 'cali_beginner',
    type: 'strength',
    durationMin: 30,
    name: { ar: 'كاليستنيكس مبتدئ', },
    description: {
      ar: 'تأسيس قوة الجسم بوزنه — لا تحتاج معدات.',
    },
    exerciseKeys: ['knee_pushup', 'inverted_row', 'air_squat', 'glute_bridge', 'plank'],
  },
  {
    key: 'cali_intermediate',
    type: 'strength',
    durationMin: 45,
    name: { ar: 'كاليستنيكس متوسّط', },
    description: {
      ar: 'دفع، سحب، أرجل، جذع — تحدّيات حقيقية.',
    },
    exerciseKeys: ['push_up', 'pull_up', 'pistol_squat', 'pike_pushup', 'l_sit', 'hollow_hold'],
  },
  {
    key: 'cali_advanced',
    type: 'strength',
    durationMin: 60,
    name: { ar: 'كاليستنيكس متقدّم', },
    description: {
      ar: 'مهارات نخبوية — بلانش، فرنت ليفر، ماصل أب.',
    },
    exerciseKeys: ['muscle_up', 'tuck_planche', 'tuck_front_lever', 'one_arm_pushup', 'pistol_squat', 'dragon_flag'],
  },
  {
    key: 'street_workout',
    type: 'strength',
    durationMin: 40,
    name: { ar: 'تمرين الشوارع', },
    description: {
      ar: 'دوائر بدون معدات لكامل الجسم.',
    },
    exerciseKeys: ['pull_up', 'dip', 'pistol_squat', 'archer_pushup', 'l_sit', 'human_flag'],
  },
  {
    key: 'morning_mobility',
    type: 'mobility',
    durationMin: 12,
    name: { ar: 'مرونة الصباح', },
    description: {
      ar: 'افتح جسمك بعد النوم — للظهر والورك والكتف.',
    },
    exerciseKeys: ['cat_cow', 'hip_opener', 'shoulder_dislocate', 'thoracic_extension', 'couch_stretch'],
  },
  {
    key: 'sprint_session',
    type: 'hiit',
    durationMin: 25,
    name: { ar: 'جلسة العدو', },
    description: {
      ar: '6 جولات عدو 30 ثانية مع راحة كاملة.',
    },
    exerciseKeys: ['sprint', 'high_knees', 'jumping_jacks'],
  },
  {
    key: 'metcon_30',
    type: 'hiit',
    durationMin: 30,
    name: { ar: 'ميتكون 30', },
    description: {
      ar: 'تكييف أيضي عالي الكثافة — جسم كامل.',
    },
    exerciseKeys: ['thruster', 'burpee', 'kettlebell_swing', 'wall_ball', 'mountain_climber'],
  },
  {
    key: 'rooster_strength',
    type: 'strength',
    durationMin: 75,
    name: { ar: '5×5 قوة', },
    description: {
      ar: 'برنامج قوة كلاسيكي — Stronglifts.',
    },
    exerciseKeys: ['squat', 'bench', 'bent_row', 'ohp', 'deadlift'],
  },
  {
    key: 'cali_push_focus',
    type: 'strength',
    durationMin: 45,
    name: { ar: 'كاليستنيكس — دفع', },
    description: {
      ar: 'صدر، أكتاف، ترايسبس بالكامل بوزن الجسم.',
    },
    exerciseKeys: ['archer_pushup', 'ring_dip', 'pike_pushup', 'pseudo_planche_pushup', 'diamond_pushup', 'hspu'],
  },
  {
    key: 'cali_pull_focus',
    type: 'strength',
    durationMin: 45,
    name: { ar: 'كاليستنيكس — سحب', },
    description: {
      ar: 'ظهر وبايسبس — تدرجات السحب المتقدمة.',
    },
    exerciseKeys: ['pull_up', 'muscle_up', 'archer_pullup', 'front_lever_raise', 'inverted_row', 'pelican_curl'],
  },
  {
    key: 'cali_legs_focus',
    type: 'strength',
    durationMin: 40,
    name: { ar: 'كاليستنيكس — أرجل', },
    description: {
      ar: 'بناء أرجل قوية بدون أوزان — تدرجات من السكوات إلى النوردك.',
    },
    exerciseKeys: ['pistol_squat', 'nordic_curl', 'shrimp_squat', 'cossack_squat', 'sissy_squat', 'single_leg_glute_bridge'],
  },
  {
    key: 'cali_core_destroyer',
    type: 'strength',
    durationMin: 25,
    name: { ar: 'كاليستنيكس — جذع حديدي', },
    description: {
      ar: 'تحدٍّ جذعي شامل — من الهولو إلى علم التنين.',
    },
    exerciseKeys: ['hollow_hold', 'dragon_flag', 'toes_to_bar', 'l_sit', 'windshield_wiper', 'hanging_leg_raise'],
  },
  {
    key: 'cali_rings_intro',
    type: 'strength',
    durationMin: 40,
    name: { ar: 'مقدمة الحلقات', },
    description: {
      ar: 'تمارين أساسية على الحلقات لبناء الاستقرار والقوة.',
    },
    exerciseKeys: ['ring_row', 'ring_pushup', 'ring_dip', 'ring_support_hold', 'ring_l_sit', 'ring_face_pull'],
  },
  {
    key: 'cali_skills_session',
    type: 'strength',
    durationMin: 50,
    name: { ar: 'جلسة مهارات', },
    description: {
      ar: 'تدريب مهارات ثابتة — بلانش، فرنت ليفر، وقوف يدين.',
    },
    exerciseKeys: ['tuck_planche', 'tuck_front_lever', 'free_handstand', 'back_lever', 'l_sit', 'human_flag'],
  },
  {
    key: 'cali_flexibility',
    type: 'mobility',
    durationMin: 20,
    name: { ar: 'مرونة الكاليستنيكس', },
    description: {
      ar: 'تمارين مرونة ضرورية لتقدم المهارات.',
    },
    exerciseKeys: ['pike_stretch', 'pancake_stretch', 'wrist_prep', 'german_hang', 'bridge', 'hip_opener'],
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
export function resolveExercise(key: string): Exercise | { key: string; label: { ar: string; }; isCustom: true } {
  if (key.startsWith('custom:')) {
    const name = key.slice(7);
    return { key, isCustom: true as const, label: { ar: name, } };
  }
  return EXERCISES[key] ?? EXERCISES.squat;
}

export function isCatalogExercise(key: string): boolean {
  return !key.startsWith('custom:') && key in EXERCISES;
}
