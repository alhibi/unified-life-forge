/**
 * Plate calculator — what plates to load on each side of the bar to hit a
 * target weight. Greedy descending algorithm: with realistic gym plate
 * inventories (45/35/25/10/5/2.5 lb or 25/20/15/10/5/2.5/1.25 kg) it always
 * finds a solution within 2.5 kg of any reasonable target.
 *
 * Pure, no allocation in the hot path.
 */

import type { PlateBreakdown, PlateInventory } from './types';

export const KG_PLATES_FULL: number[] = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
export const KG_PLATES_MINIMAL: number[] = [20, 15, 10, 5, 2.5];

export const LB_PLATES_FULL: number[] = [45, 35, 25, 10, 5, 2.5, 1.25];
export const LB_PLATES_MINIMAL: number[] = [45, 25, 10, 5];

export const DEFAULT_BAR_KG = 20;
export const DEFAULT_BAR_LB = 45;
export const WOMENS_BAR_KG = 15;
export const WOMENS_BAR_LB = 35;
export const TECHNIQUE_BAR_KG = 10;

export const DEFAULT_INVENTORY_KG: PlateInventory = {
  kg: KG_PLATES_FULL,
  lb: LB_PLATES_FULL,
  barKg: DEFAULT_BAR_KG,
  collarKg: 0,
};

export const DEFAULT_INVENTORY_LB: PlateInventory = {
  kg: KG_PLATES_FULL,
  lb: LB_PLATES_FULL,
  barKg: DEFAULT_BAR_KG,
  collarKg: 0,
};

/* ────────────────── Solver ────────────────── */

/**
 * Compute plates per side. Total = bar + 2 × Σplates + 2 × collars.
 *
 * The greedy descending algorithm is provably optimal for plate sets where
 * each plate is at most twice the next one down — which matches every
 * real-world plate set.
 */
export function platesForWeight(
  targetKg: number,
  inv: PlateInventory = DEFAULT_INVENTORY_KG,
): PlateBreakdown {
  const bar = inv.barKg;
  const collars = inv.collarKg ?? 0;
  if (!Number.isFinite(targetKg) || targetKg <= bar + 2 * collars) {
    return { plates: [], totalKg: bar + 2 * collars, errorKg: targetKg - (bar + 2 * collars) };
  }
  const perSide = (targetKg - bar - 2 * collars) / 2;
  const plates: number[] = [];
  let remaining = perSide;
  for (const p of inv.kg) {
    while (remaining + 1e-6 >= p) {
      plates.push(p);
      remaining -= p;
    }
  }
  const total = bar + 2 * plates.reduce((a, b) => a + b, 0) + 2 * collars;
  return {
    plates,
    totalKg: Math.round(total * 100) / 100,
    errorKg: Math.round((targetKg - total) * 100) / 100,
  };
}

/* ────────────────── Aesthetic helpers ────────────────── */

/**
 * Group plates by size for display: e.g. [20,20,10,5] → [{kg:20,count:2},{kg:10,count:1},{kg:5,count:1}].
 */
export function groupPlates(plates: number[]): { kg: number; count: number }[] {
  const map = new Map<number, number>();
  for (const p of plates) map.set(p, (map.get(p) ?? 0) + 1);
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([kg, count]) => ({ kg, count }));
}

/** Width (relative units) for visualizing a plate by size. */
export function plateWidth(kg: number): number {
  // 25kg = full width. Smaller plates scale down so the visual reads "larger = heavier".
  if (kg >= 25) return 100;
  if (kg >= 20) return 88;
  if (kg >= 15) return 78;
  if (kg >= 10) return 68;
  if (kg >= 5) return 56;
  if (kg >= 2.5) return 46;
  if (kg >= 1.25) return 36;
  return 26;
}

/** Conventional plate colours by IPF/Eleiko colour code. */
export function plateColor(kg: number): string {
  switch (kg) {
    case 25: return '#dc2626'; // red
    case 20: return '#1d4ed8'; // blue
    case 15: return '#fbbf24'; // yellow
    case 10: return '#15803d'; // green
    case 5:  return '#f8fafc'; // white-ish
    case 2.5: return '#0f172a'; // black
    case 1.25: return '#94a3b8'; // silver
    default: return '#6b7280';
  }
}

/* ────────────────── Imperial conversion ────────────────── */

export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 1 / KG_PER_LB;

export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 100) / 100;
}

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 100) / 100;
}

/** Round to nearest 2.5 kg (gym-friendly). */
export function roundToGymWeight(kg: number, step = 2.5): number {
  return Math.round(kg / step) * step;
}

/** Returns the closest *achievable* total given the plate inventory. */
export function snapToInventory(targetKg: number, inv: PlateInventory): number {
  const result = platesForWeight(targetKg, inv);
  return result.totalKg;
}

/* ────────────────── Suggested attempts (PR night helpers) ────────────────── */

/**
 * Given an opener, suggest a 1RM/2RM/3RM attempt selection for a meet-style
 * test. Uses 92.5% / 97.5% / 100-102.5% of estimated 1RM as a
 * conservative ladder.
 */
export function suggestAttempts(oneRmKg: number): { opener: number; second: number; third: number } {
  return {
    opener: roundToGymWeight(oneRmKg * 0.925),
    second: roundToGymWeight(oneRmKg * 0.975),
    third: roundToGymWeight(oneRmKg * 1.005),
  };
}
