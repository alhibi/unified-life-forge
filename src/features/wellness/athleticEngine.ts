/**
 * Athletic calculation engine — pure, offline, deterministic.
 *
 * All formulas are well-established sports-science references:
 *   • BMR:        Mifflin–St Jeor (1990) — gold standard for non-athletes,
 *                 plus Katch–McArdle for users with known body fat %.
 *   • TDEE:       BMR × activity multiplier (Harris–Benedict multipliers).
 *   • BF %:       U.S. Navy circumference method.
 *   • 1RM:        Epley, Brzycki, Lombardi — averaged for robustness.
 *   • VO₂max:     Uth–Sørensen–Overgaard–Pedersen (RHR-based, no test).
 *   • Water:      ACSM baseline 35 ml/kg + activity uplift.
 *   • Sweat rate: pre/post-workout mass differential + fluid intake.
 *   • Strength std: % of bodyweight thresholds widely cited in lifting circles.
 *
 * Nothing here calls the network. Nothing throws — bad input returns null
 * so the UI can render "—" instead of crashing.
 */

import type { AthleteProfile, Sex, ActivityLevel, FitnessGoal, WorkoutSession, SetEntry } from './wellnessDb';

/* ─────────────────────────── Helpers ─────────────────────────── */

const safeNum = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? n : null;

const round = (n: number, digits = 0): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const ageFromYear = (birthYear: number): number => {
  const now = new Date();
  return now.getFullYear() - birthYear;
};

/* ─────────────────────── Body composition ─────────────────────── */

/** kg/m² — classic. */
export function bmi(heightCm: number, weightKg: number): number | null {
  const h = safeNum(heightCm);
  const w = safeNum(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return round(w / (h / 100) ** 2, 1);
}

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25)   return 'healthy';
  if (value < 30)   return 'overweight';
  return 'obese';
}

/**
 * U.S. Navy body-fat estimate (cm).
 * Men:   86.010·log10(waist - neck) - 70.041·log10(height) + 36.76
 * Women: 163.205·log10(waist + hip - neck) - 97.684·log10(height) - 78.387
 */
export function navyBodyFat(p: {
  sex: Sex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
}): number | null {
  const h = safeNum(p.heightCm);
  const n = safeNum(p.neckCm);
  const w = safeNum(p.waistCm);
  if (!h || !n || !w || h <= 0 || n <= 0 || w <= 0) return null;
  if (p.sex === 'male') {
    if (w <= n) return null;
    const bf = 86.010 * Math.log10(w - n) - 70.041 * Math.log10(h) + 36.76;
    return bf > 0 && bf < 60 ? round(bf, 1) : null;
  }
  const hip = safeNum(p.hipCm);
  if (!hip || hip <= 0) return null;
  if (w + hip <= n) return null;
  const bf = 163.205 * Math.log10(w + hip - n) - 97.684 * Math.log10(h) - 78.387;
  return bf > 0 && bf < 60 ? round(bf, 1) : null;
}

export type BodyFatBracket = 'essential' | 'athlete' | 'fit' | 'average' | 'high';

export function bodyFatBracket(bf: number, sex: Sex): BodyFatBracket {
  if (sex === 'male') {
    if (bf < 6)  return 'essential';
    if (bf < 14) return 'athlete';
    if (bf < 18) return 'fit';
    if (bf < 25) return 'average';
    return 'high';
  }
  if (bf < 14) return 'essential';
  if (bf < 21) return 'athlete';
  if (bf < 25) return 'fit';
  if (bf < 32) return 'average';
  return 'high';
}

/** Lean body mass — kg of you that isn't fat. */
export function leanBodyMass(weightKg: number, bodyFatPct: number): number | null {
  const w = safeNum(weightKg);
  const bf = safeNum(bodyFatPct);
  if (!w || bf == null || w <= 0 || bf < 0 || bf >= 100) return null;
  return round(w * (1 - bf / 100), 1);
}

/**
 * Devine ideal body weight (1974) — the most-cited clinical formula.
 *  Men:   50.0 kg + 2.3 kg per inch over 5 ft
 *  Women: 45.5 kg + 2.3 kg per inch over 5 ft
 */
export function idealWeight(heightCm: number, sex: Sex): number | null {
  const h = safeNum(heightCm);
  if (!h || h <= 0) return null;
  const inchesOver5ft = h / 2.54 - 60;
  if (inchesOver5ft < 0) return null;
  const base = sex === 'male' ? 50 : 45.5;
  return round(base + 2.3 * inchesOver5ft, 1);
}

/* ─────────────────────────── Energy ─────────────────────────── */

/** Mifflin–St Jeor — most accurate among non-athlete BMR formulas. */
export function bmrMifflin(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number | null {
  const { sex, weightKg, heightCm, ageYears } = p;
  if (!safeNum(weightKg) || !safeNum(heightCm) || !safeNum(ageYears)) return null;
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Katch–McArdle — uses lean body mass directly, more accurate for lifters.
 *   BMR = 370 + 21.6 × LBM (kg)
 */
export function bmrKatchMcArdle(leanMassKg: number): number | null {
  const l = safeNum(leanMassKg);
  if (!l || l <= 0) return null;
  return round(370 + 21.6 * l);
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725,
  athlete:   1.9,
};

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[level] ?? 1.55;
}

export function tdee(bmr: number, level: ActivityLevel): number {
  return round(bmr * activityMultiplier(level));
}

/** Goal-adjusted daily calories. */
export function calorieTarget(tdeeKcal: number, goal: FitnessGoal): number {
  const map: Record<FitnessGoal, number> = {
    cut:         -500,
    recomp:      -200,
    maintain:    0,
    lean_bulk:   +250,
    bulk:        +500,
    performance: +150,
  };
  return Math.max(1200, round(tdeeKcal + (map[goal] ?? 0)));
}

/* ────────────────────────── Macros ────────────────────────── */

export interface MacroTarget {
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  totalKcal: number;
}

/**
 * Macro split tuned per goal. Protein scales with body weight (g/kg)
 * because that's how sports nutrition actually works — not as a percent
 * of calories. Fat is bottomed at 0.8 g/kg for hormonal health. Carbs
 * fill the remainder.
 */
export function macroTarget(
  weightKg: number,
  totalKcal: number,
  goal: FitnessGoal,
): MacroTarget | null {
  if (!safeNum(weightKg) || !safeNum(totalKcal) || weightKg <= 0 || totalKcal <= 0) return null;

  const proteinPerKg: Record<FitnessGoal, number> = {
    cut:         2.4,
    recomp:      2.2,
    maintain:    1.6,
    lean_bulk:   2.0,
    bulk:        1.8,
    performance: 2.0,
  };
  const fatPerKg = goal === 'cut' ? 0.8 : 1.0;

  const protein = round(weightKg * (proteinPerKg[goal] ?? 1.8));
  const fat = round(weightKg * fatPerKg);
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbsKcal = Math.max(0, totalKcal - proteinKcal - fatKcal);
  const carbs = round(carbsKcal / 4);

  return {
    protein, carbs, fat,
    proteinKcal, carbsKcal: round(carbsKcal), fatKcal,
    totalKcal: round(totalKcal),
  };
}

/* ────────────────────── 1RM (one-rep-max) ────────────────────── */

/** Epley:    1RM = w × (1 + r/30)  */
export const epley = (w: number, r: number): number => w * (1 + r / 30);
/** Brzycki:  1RM = w × 36 / (37 - r)  — best for r ≤ 10 */
export const brzycki = (w: number, r: number): number => (w * 36) / (37 - r);
/** Lombardi: 1RM = w × r^0.10  */
export const lombardi = (w: number, r: number): number => w * Math.pow(r, 0.1);

/**
 * Estimated 1RM averaged across three formulas — more robust than any single one.
 * If reps == 1, returns the actual weight.
 * Returns null for invalid input.
 */
export function estimate1RM(weightKg: number, reps: number): number | null {
  const w = safeNum(weightKg);
  const r = safeNum(reps);
  if (!w || !r || w <= 0 || r < 1 || r > 20) return null;
  if (r === 1) return round(w, 1);
  const e = epley(w, r);
  const b = reps <= 10 ? brzycki(w, r) : e; // Brzycki collapses past 10 reps
  const l = lombardi(w, r);
  return round((e + b + l) / 3, 1);
}

/** Best 1RM across all sets of an exercise. */
export function bestE1RMFromSets(sets: SetEntry[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.weightKg && s.reps && s.weightKg > 0 && s.reps > 0) {
      const v = estimate1RM(s.weightKg, s.reps);
      if (v != null && (best == null || v > best)) best = v;
    }
  }
  return best;
}

/* ───────────────── Strength standards (BW ratio) ───────────────── */

/**
 * Ratios of 1RM to bodyweight. Cross-referenced against ExRx, Greg Nuckols
 * surveys and Symmetric Strength tables. Female ratios are ~70% of male.
 */
export type StrengthLevel = 'untrained' | 'novice' | 'intermediate' | 'advanced' | 'elite';

const STRENGTH_BW_TABLE_MALE: Record<string, Record<StrengthLevel, number>> = {
  squat:    { untrained: 0.50, novice: 1.00, intermediate: 1.50, advanced: 2.25, elite: 2.75 },
  bench:    { untrained: 0.50, novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.10 },
  deadlift: { untrained: 0.75, novice: 1.25, intermediate: 1.75, advanced: 2.50, elite: 3.00 },
  ohp:      { untrained: 0.35, novice: 0.55, intermediate: 0.85, advanced: 1.20, elite: 1.45 },
};

const FEMALE_FACTOR = 0.70;

export function strengthLevel(
  exerciseKey: 'squat' | 'bench' | 'deadlift' | 'ohp',
  oneRm: number,
  bodyweightKg: number,
  sex: Sex,
): { level: StrengthLevel; ratio: number; nextTarget: number | null } | null {
  const o = safeNum(oneRm);
  const bw = safeNum(bodyweightKg);
  if (!o || !bw || o <= 0 || bw <= 0) return null;
  const table = STRENGTH_BW_TABLE_MALE[exerciseKey];
  if (!table) return null;
  const factor = sex === 'female' ? FEMALE_FACTOR : 1;
  const ratio = o / bw;

  const order: StrengthLevel[] = ['untrained', 'novice', 'intermediate', 'advanced', 'elite'];
  let level: StrengthLevel = 'untrained';
  let nextTarget: number | null = null;
  for (let i = order.length - 1; i >= 0; i--) {
    const threshold = table[order[i]] * factor;
    if (ratio >= threshold) {
      level = order[i];
      const next = order[i + 1];
      nextTarget = next ? round(table[next] * factor * bw, 1) : null;
      break;
    }
  }
  if (level === 'untrained') {
    nextTarget = round(table.novice * factor * bw, 1);
  }
  return { level, ratio: round(ratio, 2), nextTarget };
}

/* ────────────────────────── Cardio ────────────────────────── */

/**
 * Uth–Sørensen–Overgaard–Pedersen: VO₂max ≈ 15 × (HRmax / HRrest)
 * Estimates HRmax from age via Tanaka (208 − 0.7·age).
 */
export function vo2maxFromRhr(restingHR: number, ageYears: number): number | null {
  const r = safeNum(restingHR);
  const a = safeNum(ageYears);
  if (!r || !a || r <= 0 || a <= 0) return null;
  const hrMax = 208 - 0.7 * a;
  return round(15 * (hrMax / r), 1);
}

/** Tanaka HRmax — replaces the old 220 - age. */
export function hrMaxTanaka(ageYears: number): number {
  return Math.round(208 - 0.7 * ageYears);
}

/** Karvonen heart-rate zones (1-5) using HR reserve. */
export interface HrZone {
  zone: 1 | 2 | 3 | 4 | 5;
  low: number;
  high: number;
  /** descriptive label key for the UI */
  label: 'recovery' | 'aerobic' | 'tempo' | 'threshold' | 'vo2max';
}
export function karvonenZones(restingHR: number, ageYears: number): HrZone[] | null {
  const r = safeNum(restingHR);
  if (!r || r <= 0) return null;
  const max = hrMaxTanaka(ageYears);
  const reserve = max - r;
  if (reserve <= 0) return null;
  const z = (lowPct: number, highPct: number) => ({
    low: Math.round(r + reserve * lowPct),
    high: Math.round(r + reserve * highPct),
  });
  return [
    { zone: 1, ...z(0.50, 0.60), label: 'recovery' },
    { zone: 2, ...z(0.60, 0.70), label: 'aerobic' },
    { zone: 3, ...z(0.70, 0.80), label: 'tempo' },
    { zone: 4, ...z(0.80, 0.90), label: 'threshold' },
    { zone: 5, ...z(0.90, 1.00), label: 'vo2max' },
  ];
}

/* ─────────────────────── Hydration ─────────────────────── */

/**
 * Daily target ml = 35 ml/kg + 500 ml per training hour + 500 ml in heat.
 * Useful, not gospel — research diverges below ±15 %.
 */
export function dailyWaterMl(p: {
  weightKg: number;
  trainingHours?: number;
  hot?: boolean;
}): number | null {
  const w = safeNum(p.weightKg);
  if (!w || w <= 0) return null;
  let ml = 35 * w;
  if (p.trainingHours && p.trainingHours > 0) ml += 500 * p.trainingHours;
  if (p.hot) ml += 500;
  return Math.round(ml);
}

/**
 * Sweat-rate liters per hour from pre/post workout mass + fluid intake.
 * 1 kg of mass loss ≈ 1 L sweat.
 */
export function sweatRateLph(p: {
  preKg: number;
  postKg: number;
  drankMl: number;
  durationMin: number;
}): number | null {
  const pre = safeNum(p.preKg);
  const post = safeNum(p.postKg);
  const drank = safeNum(p.drankMl);
  const dur = safeNum(p.durationMin);
  if (pre == null || post == null || drank == null || dur == null) return null;
  if (pre <= 0 || post <= 0 || dur <= 0) return null;
  const massLoss = pre - post;
  const lossL = massLoss + drank / 1000;
  return round((lossL / dur) * 60, 2);
}

/* ─────────────────── Workout volume / load ─────────────────── */

/** Total tonnage = Σ weight × reps over the session. */
export function sessionVolumeKg(s: WorkoutSession): number {
  let total = 0;
  for (const ex of s.exercises) {
    for (const set of ex.sets) {
      if (set.weightKg && set.reps) total += set.weightKg * set.reps;
    }
  }
  return round(total, 1);
}

/** sRPE training-load = session RPE × duration min — Foster (2001). */
export function sessionLoad(s: WorkoutSession): number | null {
  const dur =
    s.endedAt && s.startedAt ? (s.endedAt - s.startedAt) / 60_000 : null;
  if (!dur || !s.sessionRpe) return null;
  return round(s.sessionRpe * dur);
}

/**
 * Acute:Chronic Workload Ratio.
 *   acute = avg load last 7 days
 *   chronic = avg load last 28 days
 * Sweet spot: 0.8 - 1.3. Above 1.5 = injury risk.
 */
export interface AcwrResult {
  acute: number;
  chronic: number;
  ratio: number;
  zone: 'undertraining' | 'sweet_spot' | 'caution' | 'danger';
}
export function acwr(workouts: WorkoutSession[]): AcwrResult | null {
  if (workouts.length === 0) return null;
  const now = Date.now();
  const dayMs = 86_400_000;

  let acute7 = 0;
  let chronic28 = 0;
  for (const w of workouts) {
    const load = sessionLoad(w) ?? sessionVolumeKg(w) / 50; // fallback proxy
    const ageDays = (now - w.startedAt) / dayMs;
    if (ageDays <= 7)  acute7  += load;
    if (ageDays <= 28) chronic28 += load;
  }
  const acute = acute7 / 7;
  const chronic = chronic28 / 28;
  if (chronic <= 0.001) return null;
  const ratio = acute / chronic;
  let zone: AcwrResult['zone'] = 'sweet_spot';
  if (ratio < 0.8) zone = 'undertraining';
  else if (ratio > 1.5) zone = 'danger';
  else if (ratio > 1.3) zone = 'caution';
  return { acute: round(acute, 1), chronic: round(chronic, 1), ratio: round(ratio, 2), zone };
}

/* ─────────────────── Profile-derived helpers ─────────────────── */

/**
 * Resolve the most current weight: prefer the supplied vital snapshot,
 * fall back to profile.weightKg.
 */
export function effectiveWeight(profile: AthleteProfile | null, latestVitalKg?: number): number | null {
  if (latestVitalKg && latestVitalKg > 0) return latestVitalKg;
  return profile?.weightKg ?? null;
}

export function profileAge(profile: AthleteProfile): number {
  return ageFromYear(profile.birthYear);
}

/**
 * One-shot summary used by the dashboard / hub. All fields are nullable so
 * the UI can degrade gracefully on incomplete profiles.
 */
export interface AthleticSummary {
  age: number;
  weightKg: number | null;
  bmi: number | null;
  bmiCategory: BmiCategory | null;
  bodyFat: number | null;
  bodyFatBracket: BodyFatBracket | null;
  leanMass: number | null;
  idealWeight: number | null;
  bmr: number | null;
  tdee: number | null;
  calorieTarget: number | null;
  macros: MacroTarget | null;
  hrMax: number | null;
  vo2max: number | null;
  hrZones: HrZone[] | null;
  waterMl: number | null;
}

export function athleticSummary(p: {
  profile: AthleteProfile;
  weightKg?: number;
  restingHR?: number;
  trainingHoursPerDay?: number;
}): AthleticSummary {
  const age = profileAge(p.profile);
  const weight = effectiveWeight(p.profile, p.weightKg) ?? p.profile.weightKg ?? null;
  const bmiV = weight ? bmi(p.profile.heightCm, weight) : null;
  const bmiCat = bmiV ? bmiCategory(bmiV) : null;

  const bf = weight
    ? navyBodyFat({
        sex: p.profile.sex,
        heightCm: p.profile.heightCm,
        neckCm: p.profile.neckCm ?? 0,
        waistCm: p.profile.waistCm ?? 0,
        hipCm: p.profile.hipCm,
      })
    : null;
  const bfBracket = bf != null ? bodyFatBracket(bf, p.profile.sex) : null;
  const lbm = weight && bf != null ? leanBodyMass(weight, bf) : null;
  const ideal = idealWeight(p.profile.heightCm, p.profile.sex);

  const bmrV = weight
    ? lbm != null
      ? bmrKatchMcArdle(lbm)            // more accurate when LBM known
      : bmrMifflin({ sex: p.profile.sex, weightKg: weight, heightCm: p.profile.heightCm, ageYears: age })
    : null;
  const tdeeV = bmrV ? tdee(bmrV, p.profile.activityLevel) : null;
  const target = tdeeV ? calorieTarget(tdeeV, p.profile.goal) : null;
  const macros = weight && target ? macroTarget(weight, target, p.profile.goal) : null;

  const hrMax = hrMaxTanaka(age);
  const vo2 = p.restingHR ? vo2maxFromRhr(p.restingHR, age) : null;
  const zones = p.restingHR ? karvonenZones(p.restingHR, age) : null;

  const water = weight ? dailyWaterMl({ weightKg: weight, trainingHours: p.trainingHoursPerDay }) : null;

  return {
    age,
    weightKg: weight,
    bmi: bmiV,
    bmiCategory: bmiCat,
    bodyFat: bf,
    bodyFatBracket: bfBracket,
    leanMass: lbm,
    idealWeight: ideal,
    bmr: bmrV,
    tdee: tdeeV,
    calorieTarget: target,
    macros,
    hrMax,
    vo2max: vo2,
    hrZones: zones,
    waterMl: water,
  };
}
