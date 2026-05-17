/**
 * Bridge between the lightweight FOODS catalog (used by DietTab for
 * picking) and the rich FOOD_ATLAS (per-100g macros, optimal timing,
 * etc.). Lets us compute calories/protein/carbs/fat for any logged
 * meal — even custom foods, via fallback estimates.
 *
 * Why a separate module:
 *   • FOODS is bilingual labels + tags; no nutrition.
 *   • FOOD_ATLAS has nutrition but only for ~30 curated foods.
 *   • We don't want to duplicate macro tables. Instead we map FOODS
 *     keys to FOOD_ATLAS keys (or to a small generic-fallback table
 *     when no atlas entry exists), and any caller that needs macros
 *     goes through `macrosFor(foodKey, grams)`.
 */

import { FOOD_ATLAS, type FoodAtlasEntry } from './foodAtlas';
import type { DietLog } from './wellnessDb';

export interface MacroBreakdown {
  kcal: number;
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  /** Where the numbers came from, for UI hints. */
  source: 'atlas' | 'fallback' | 'custom' | 'unknown';
}

/* ─────────── Atlas lookup ─────────── */

const ATLAS_BY_KEY: Record<string, FoodAtlasEntry> = (() => {
  const out: Record<string, FoodAtlasEntry> = {};
  for (const f of FOOD_ATLAS) out[f.key] = f;
  return out;
})();

/**
 * Map FOODS-catalog keys (DietTab picker) onto FOOD_ATLAS keys
 * (rich macros). Only keys that aren't an exact name match need a row.
 */
const FOODS_TO_ATLAS: Record<string, string> = {
  // Direct atlas matches happen automatically via the lookup, but here
  // are the FOODS keys that need to be redirected:
  chicken: 'chicken_breast',
  beef: 'beef_lean',
  fish: 'salmon',          // close enough as default oily fish
  yogurt: 'greek_yogurt',
  rice: 'brown_rice',      // healthier proxy
  beans: 'lentils',         // close legume match
  lentils: 'lentils',
  spinach: 'spinach',
  blueberry: 'blueberries',
  beet: 'beetroot',
  // Note: walnuts, almonds, oats, eggs, salmon, tuna, tofu, tempeh,
  // chickpeas, broccoli, sweet_potato, avocado, banana, garlic,
  // honey, olive_oil, dark_chocolate, water, coconut_water, green_tea
  // already match by key.
};

function atlasFor(foodKey: string): FoodAtlasEntry | null {
  if (ATLAS_BY_KEY[foodKey]) return ATLAS_BY_KEY[foodKey];
  const mapped = FOODS_TO_ATLAS[foodKey];
  if (mapped && ATLAS_BY_KEY[mapped]) return ATLAS_BY_KEY[mapped];
  return null;
}

/* ─────────── Generic-category fallback ─────────── */

/**
 * Coarse per-100g averages used when no atlas entry exists.
 * Pulled from USDA average ranges. Better than nothing — and much
 * better than the previous "0 protein" silent failure.
 */
const FALLBACK_PER_100G: Record<string, { kcal: number; protein: number; carbs: number; fat: number }> = {
  // Vegetables / leafy
  veg:        { kcal: 30,  protein: 2, carbs: 6,  fat: 0.3 },
  // Fruits
  fruit:      { kcal: 60,  protein: 1, carbs: 14, fat: 0.3 },
  // Berries
  berry:      { kcal: 50,  protein: 1, carbs: 12, fat: 0.4 },
  // Grains / starches
  grain:      { kcal: 360, protein: 11, carbs: 72, fat: 2.5 },
  // Cooked rice / bread / pasta
  starch_cooked: { kcal: 130, protein: 2.5, carbs: 28, fat: 0.4 },
  // Lean meat / poultry
  meat:       { kcal: 175, protein: 25, carbs: 0, fat: 8 },
  // Fish (oily average)
  fish:       { kcal: 200, protein: 22, carbs: 0, fat: 12 },
  // Eggs
  egg:        { kcal: 155, protein: 13, carbs: 1, fat: 11 },
  // Dairy
  dairy:      { kcal: 100, protein: 6, carbs: 6, fat: 5 },
  cheese:     { kcal: 350, protein: 23, carbs: 2, fat: 28 },
  // Nuts / seeds
  nuts:       { kcal: 600, protein: 18, carbs: 18, fat: 52 },
  seeds:      { kcal: 540, protein: 20, carbs: 24, fat: 42 },
  // Legumes (cooked)
  legumes:    { kcal: 130, protein: 9, carbs: 22, fat: 0.5 },
  // Oils / pure fats
  fat:        { kcal: 880, protein: 0, carbs: 0, fat: 100 },
  // Sweeteners
  sweet:      { kcal: 300, protein: 0, carbs: 80, fat: 0 },
  // Drinks (water, tea, black coffee)
  zero:       { kcal: 0,  protein: 0, carbs: 0, fat: 0 },
};

/**
 * Heuristic categorizer for FOODS keys that don't have an atlas entry.
 * Conservative — when in doubt returns 'veg' (lowest impact).
 */
function fallbackCategory(foodKey: string): keyof typeof FALLBACK_PER_100G {
  const k = foodKey.toLowerCase();
  // Pure-zero drinks
  if (['water', 'tea', 'black_tea', 'herbal_tea', 'coffee'].includes(k)) return 'zero';
  // Eggs
  if (k.startsWith('egg')) return 'egg';
  // Dairy/cheese
  if (['cheese', 'feta'].includes(k) || k.endsWith('_cheese')) return 'cheese';
  if (['milk', 'kefir', 'butter', 'ghee'].includes(k)) return 'dairy';
  // Fats
  if (k.includes('oil') || k === 'butter' || k === 'ghee') return 'fat';
  // Sweeteners
  if (['honey', 'dates', 'raisins', 'prunes', 'molasses'].includes(k)) return 'sweet';
  // Nuts / seeds
  if (['almonds', 'walnuts', 'cashews', 'pistachios', 'hazelnuts', 'pecans', 'peanuts', 'brazil_nuts'].includes(k)) {
    return 'nuts';
  }
  if (k.endsWith('_seeds') || k === 'sesame') return 'seeds';
  // Legumes
  if (['beans', 'black_beans', 'fava_beans', 'lentils', 'chickpeas', 'edamame', 'peas', 'green_beans', 'tofu', 'tempeh', 'hummus', 'falafel'].includes(k)) {
    return 'legumes';
  }
  // Fish
  if (['fish', 'salmon', 'tuna', 'sardines', 'mackerel', 'shrimp', 'oyster'].includes(k)) return 'fish';
  // Meat / poultry
  if (['chicken', 'beef', 'lamb', 'turkey', 'duck', 'liver'].includes(k)) return 'meat';
  // Cooked starches
  if (['rice', 'bread', 'pasta', 'couscous', 'bulgur', 'freekeh', 'barley', 'potato', 'sweet_potato', 'corn'].includes(k)) {
    return 'starch_cooked';
  }
  // Whole grains (raw)
  if (['oats', 'quinoa'].includes(k)) return 'grain';
  // Berries
  if (['blueberry', 'blueberries', 'strawberry', 'raspberry', 'cherry'].includes(k)) return 'berry';
  // Default for fruits
  if (['apple', 'pear', 'grape', 'watermelon', 'melon', 'pineapple', 'mango', 'peach', 'banana', 'orange', 'lemon', 'kiwi', 'papaya', 'guava', 'grapefruit', 'pomegranate', 'fig', 'apricot'].includes(k)) {
    return 'fruit';
  }
  return 'veg';
}

/* ─────────── Default portion (grams) ─────────── */

/**
 * Sensible default portion in grams for each food when the user hasn't
 * specified one. Rough adult-meal sizes; users can tune via the slider.
 */
export function defaultGramsFor(foodKey: string): number {
  const cat = fallbackCategory(foodKey);
  switch (cat) {
    case 'zero':           return 250;  // a glass
    case 'fat':            return 10;   // 1 tbsp
    case 'sweet':          return 30;
    case 'nuts':           return 30;   // small handful
    case 'seeds':          return 15;   // 1 tbsp
    case 'cheese':         return 30;
    case 'dairy':          return 200;  // 1 cup
    case 'egg':            return 100;  // 2 medium
    case 'meat':           return 150;
    case 'fish':           return 150;
    case 'legumes':        return 150;
    case 'starch_cooked':  return 200;
    case 'grain':          return 60;   // 1/2 cup oats raw
    case 'berry':          return 100;
    case 'fruit':          return 150;  // 1 medium apple
    default:               return 100;  // veg
  }
}

/* ─────────── Public API ─────────── */

const round = (n: number, d = 0): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/**
 * Get macros for one logged-food entry. Honors:
 *   1. Explicit `customMacros` (from custom-food creator) — exact.
 *   2. FOOD_ATLAS per-100g — best when available.
 *   3. Heuristic fallback by category — last resort, always returns
 *      something rather than 0.
 */
export function macrosFor(
  foodKey: string,
  grams: number,
  customMacros?: { kcal: number; protein: number; carbs: number; fat: number },
): MacroBreakdown {
  if (!Number.isFinite(grams) || grams <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, source: 'unknown' };
  }
  const factor = grams / 100;

  if (customMacros) {
    return {
      kcal: round(customMacros.kcal * factor),
      protein: round(customMacros.protein * factor, 1),
      carbs: round(customMacros.carbs * factor, 1),
      fat: round(customMacros.fat * factor, 1),
      source: 'custom',
    };
  }

  // Custom foods recorded as `custom:<name>` — no per-food info,
  // use the most generic fallback.
  if (foodKey.startsWith('custom:')) {
    const f = FALLBACK_PER_100G.veg;
    return {
      kcal: round(f.kcal * factor),
      protein: round(f.protein * factor, 1),
      carbs: round(f.carbs * factor, 1),
      fat: round(f.fat * factor, 1),
      source: 'custom',
    };
  }

  const atlas = atlasFor(foodKey);
  if (atlas) {
    return {
      kcal: round(atlas.per100g.kcal * factor),
      protein: round(atlas.per100g.protein * factor, 1),
      carbs: round(atlas.per100g.carbs * factor, 1),
      fat: round(atlas.per100g.fat * factor, 1),
      source: 'atlas',
    };
  }

  const cat = fallbackCategory(foodKey);
  const f = FALLBACK_PER_100G[cat];
  return {
    kcal: round(f.kcal * factor),
    protein: round(f.protein * factor, 1),
    carbs: round(f.carbs * factor, 1),
    fat: round(f.fat * factor, 1),
    source: 'fallback',
  };
}

/**
 * Sum macros across an arbitrary list of diet logs. Used by GoalsTab
 * to wire protein / calories progress, and by InsightsTab if it
 * wants to surface daily totals.
 */
export function dailyMacros(logs: DietLog[]): MacroBreakdown {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const l of logs) {
    // Backwards compat: older logs stored portion=1 with no `grams`.
    // Treat portion as multiplier on default grams, preserving prior
    // behaviour (one logical "serving") without hand-editing data.
    const grams = (l as DietLog & { grams?: number }).grams
      ?? (l.portion ?? 1) * defaultGramsFor(l.foodKey);
    const customMacros = (l as DietLog & {
      customMacros?: { kcal: number; protein: number; carbs: number; fat: number };
    }).customMacros;
    const m = macrosFor(l.foodKey, grams, customMacros);
    kcal += m.kcal;
    protein += m.protein;
    carbs += m.carbs;
    fat += m.fat;
  }
  return {
    kcal: round(kcal),
    protein: round(protein, 1),
    carbs: round(carbs, 1),
    fat: round(fat, 1),
    source: 'atlas',
  };
}
