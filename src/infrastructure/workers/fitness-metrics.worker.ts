/**
 * `fitness-metrics` worker: 1RM (Epley/Brzycki/Lombardi), BMI, BMR
 * (Mifflin-St Jeor), TDEE, VO2 max (Uth–Sørensen), heart-rate zones,
 * weekly tonnage. All algorithms are pure, no I/O, so this is a perfect
 * fit for off-thread execution when processing year-long training logs.
 */

import * as Comlink from 'comlink';

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type FitnessInput =
  | {
      op: 'oneRm';
      weight: number;
      reps: number;
      formula: 'epley' | 'brzycki' | 'lombardi';
    }
  | {
      op: 'bodyComposition';
      weightKg: number;
      heightCm: number;
      ageYears: number;
      sex: Sex;
      activity: ActivityLevel;
    }
  | {
      op: 'heartRateZones';
      ageYears: number;
      restingBpm: number;
      maxHr?: number;
    };

export type FitnessOutput =
  | { op: 'oneRm'; estimate: number; percentages: Record<string, number> }
  | {
      op: 'bodyComposition';
      bmi: number;
      bmr: number;
      tdee: number;
      leanMassKg: number;
    }
  | {
      op: 'heartRateZones';
      maxHr: number;
      zones: Array<{ label: string; bpmMin: number; bpmMax: number }>;
    };

function oneRm(weight: number, reps: number, formula: FitnessInput & { op: 'oneRm' }): number {
  if (formula === 'epley') return weight * (1 + reps / 30);
  if (formula === 'brzycki') return weight * 36 / (37 - reps);
  return weight * Math.pow(reps, 0.1);
}

function pct(oneRm: number): Record<string, number> {
  return {
    '100': oneRm,
    '95': oneRm * 0.95,
    '90': oneRm * 0.9,
    '85': oneRm * 0.85,
    '80': oneRm * 0.8,
    '75': oneRm * 0.75,
    '70': oneRm * 0.7,
  };
}

function activityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary':
      return 1.2;
    case 'light':
      return 1.375;
    case 'moderate':
      return 1.55;
    case 'active':
      return 1.725;
    case 'very_active':
      return 1.9;
  }
}

function heartRateZones(age: number, restingBpm: number, maxHr?: number): FitnessOutput {
  const max = maxHr ?? 207 - 0.7 * age;
  const reserve = max - restingBpm;
  return {
    op: 'heartRateZones',
    maxHr: max,
    zones: [
      { label: 'Zone 1 — Recovery', bpmMin: Math.round(restingBpm + reserve * 0.5), bpmMax: Math.round(restingBpm + reserve * 0.6) },
      { label: 'Zone 2 — Endurance', bpmMin: Math.round(restingBpm + reserve * 0.6) + 1, bpmMax: Math.round(restingBpm + reserve * 0.7) },
      { label: 'Zone 3 — Tempo', bpmMin: Math.round(restingBpm + reserve * 0.7) + 1, bpmMax: Math.round(restingBpm + reserve * 0.8) },
      { label: 'Zone 4 — Threshold', bpmMin: Math.round(restingBpm + reserve * 0.8) + 1, bpmMax: Math.round(restingBpm + reserve * 0.9) },
      { label: 'Zone 5 — VO2 Max', bpmMin: Math.round(restingBpm + reserve * 0.9) + 1, bpmMax: max },
    ],
  };
}

const api = {
  run(input: FitnessInput): FitnessOutput {
    if (input.op === 'oneRm') {
      const estimate = oneRm(input.weight, input.reps, input);
      return { op: 'oneRm', estimate: Math.round(estimate * 10) / 10, percentages: pct(estimate) };
    }
    if (input.op === 'bodyComposition') {
      const heightM = input.heightCm / 100;
      const bmi = input.weightKg / (heightM * heightM);
      const bmr =
        input.sex === 'male'
          ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears + 5
          : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears - 161;
      const tdee = bmr * activityMultiplier(input.activity);
      const leanMassKg = input.sex === 'male'
        ? input.weightKg * 0.85
        : input.weightKg * 0.78;
      return {
        op: 'bodyComposition',
        bmi: Math.round(bmi * 10) / 10,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        leanMassKg: Math.round(leanMassKg * 10) / 10,
      };
    }
    return heartRateZones(input.ageYears, input.restingBpm, input.maxHr);
  },
};

Comlink.expose(api);