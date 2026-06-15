/**
 * Bridge between the lightweight `FOODS` log catalog (wellnessData.ts —
 * powers DietTab) and the rich `FOOD_ATLAS` (foodAtlas.ts — powers the
 * Encyclopedia), so the diet tab can display real macros for every
 * logged item and the goal tracker can score calorie/protein progress.
 *
 * Strategy:
 *   1. We try a direct key match (e.g. `salmon` → atlas `salmon`).
 *   2. We fall back to an alias map for foods whose log-key differs
 *      from the atlas key (e.g. `chicken` ↔ `chicken_breast`).
 *   3. For foods absent from the atlas we use a curated fallback
 *      table of conservative typical macros (per 100 g serving).
 *   4. We expose a stable `portionGramsFor(foodKey)` so a "portion = 1"
 *      log corresponds to a sensible grams-based reading (egg = 50 g,
 *      apple = 180 g, etc.) — otherwise everything would be measured
 *      in undefined "100 g" units.
 *
 * Pure data + pure functions. No React, no I/O.
 */

import { FOOD_ATLAS, type FoodAtlasEntry } from './foodAtlas';
import type { DietLog } from './wellnessDb';

export interface MacroSet {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ZERO: MacroSet = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/* ─── Atlas index ─── */
const ATLAS_INDEX: Record<string, FoodAtlasEntry> = (() => {
  const out: Record<string, FoodAtlasEntry> = {};
  for (const e of FOOD_ATLAS) out[e.key] = e;
  return out;
})();

/**
 * When the log key (`FOODS`) and the atlas key differ, map them here.
 * The right-hand side is the atlas key.
 */
const ALIAS: Record<string, string> = {
  chicken: 'chicken_breast',
  beef: 'beef_lean',
  yogurt: 'greek_yogurt',
  fish: 'salmon',
  beet: 'beetroot',
  blueberry: 'blueberries',
};

/**
 * Curated fallback per-100 g macros for foods not in the atlas. These
 * are average values from USDA/SR-Legacy and the German BLS, rounded.
 * Used only when the atlas does not cover an entry.
 */
const FALLBACK_PER_100G: Record<string, MacroSet> = {
  // Dairy
  milk:        { kcal: 61,  protein: 3.2,  carbs: 4.8, fat: 3.3 },
  cheese:      { kcal: 393, protein: 25,   carbs: 1.3, fat: 33  },
  feta:        { kcal: 264, protein: 14,   carbs: 4.1, fat: 21  },
  kefir:       { kcal: 41,  protein: 3.8,  carbs: 4.6, fat: 0.9 },
  butter:      { kcal: 717, protein: 0.9,  carbs: 0.1, fat: 81  },
  ghee:        { kcal: 900, protein: 0,    carbs: 0,   fat: 100 },
  labneh:      { kcal: 165, protein: 8,    carbs: 4,   fat: 13  },
  kishk:       { kcal: 360, protein: 14,   carbs: 65,  fat: 4   },
  // Meat / poultry
  liver:       { kcal: 175, protein: 27,   carbs: 4.4, fat: 5   },
  turkey:      { kcal: 135, protein: 30,   carbs: 0,   fat: 1   },
  lamb:        { kcal: 294, protein: 25,   carbs: 0,   fat: 21  },
  duck:        { kcal: 337, protein: 19,   carbs: 0,   fat: 28  },
  // Seafood
  sardines:    { kcal: 208, protein: 25,   carbs: 0,   fat: 11  },
  mackerel:    { kcal: 305, protein: 19,   carbs: 0,   fat: 25  },
  shrimp:      { kcal: 99,  protein: 24,   carbs: 0.2, fat: 0.3 },
  oyster:      { kcal: 81,  protein: 9,    carbs: 4.7, fat: 2.3 },
  // Eggs
  egg_yolk:    { kcal: 322, protein: 16,   carbs: 3.6, fat: 27  },
  // Plant proteins
  beans:       { kcal: 127, protein: 9,    carbs: 23,  fat: 0.5 },
  black_beans: { kcal: 132, protein: 8.9,  carbs: 24,  fat: 0.5 },
  edamame:     { kcal: 121, protein: 12,   carbs: 9,   fat: 5   },
  hummus:      { kcal: 166, protein: 8,    carbs: 14,  fat: 10  },
  falafel:     { kcal: 333, protein: 14,   carbs: 32,  fat: 18  },
  fava_beans:  { kcal: 110, protein: 8,    carbs: 19,  fat: 0.4 },
  // Nuts & seeds
  pistachios:      { kcal: 562, protein: 20, carbs: 28, fat: 45 },
  cashews:         { kcal: 553, protein: 18, carbs: 30, fat: 44 },
  hazelnuts:       { kcal: 628, protein: 15, carbs: 17, fat: 61 },
  brazil_nuts:     { kcal: 656, protein: 14, carbs: 12, fat: 66 },
  peanuts:         { kcal: 567, protein: 26, carbs: 16, fat: 49 },
  pecans:          { kcal: 691, protein: 9,  carbs: 14, fat: 72 },
  chia_seeds:      { kcal: 486, protein: 17, carbs: 42, fat: 31 },
  flax_seeds:      { kcal: 534, protein: 18, carbs: 29, fat: 42 },
  pumpkin_seeds:   { kcal: 559, protein: 30, carbs: 11, fat: 49 },
  sunflower_seeds: { kcal: 584, protein: 21, carbs: 20, fat: 51 },
  sesame:          { kcal: 573, protein: 18, carbs: 23, fat: 50 },
  tahini:          { kcal: 595, protein: 17, carbs: 21, fat: 54 },
  // Grains & breads
  rice:        { kcal: 130, protein: 2.7, carbs: 28,  fat: 0.3 },
  bulgur:      { kcal: 83,  protein: 3.1, carbs: 19,  fat: 0.2 },
  couscous:    { kcal: 112, protein: 3.8, carbs: 23,  fat: 0.2 },
  barley:      { kcal: 354, protein: 12,  carbs: 73,  fat: 2.3 },
  whole_bread: { kcal: 247, protein: 13,  carbs: 41,  fat: 4.2 },
  pita:        { kcal: 275, protein: 9,   carbs: 56,  fat: 1.2 },
  pasta:       { kcal: 158, protein: 5.8, carbs: 31,  fat: 0.9 },
  freekeh:     { kcal: 352, protein: 13,  carbs: 72,  fat: 2.5 },
  // Fruits
  apple:       { kcal: 52,  protein: 0.3, carbs: 14,  fat: 0.2 },
  pear:        { kcal: 57,  protein: 0.4, carbs: 15,  fat: 0.1 },
  grape:       { kcal: 67,  protein: 0.6, carbs: 17,  fat: 0.2 },
  watermelon:  { kcal: 30,  protein: 0.6, carbs: 7.6, fat: 0.2 },
  melon:       { kcal: 36,  protein: 0.5, carbs: 9,   fat: 0.1 },
  pineapple:   { kcal: 50,  protein: 0.5, carbs: 13,  fat: 0.1 },
  mango:       { kcal: 60,  protein: 0.8, carbs: 15,  fat: 0.4 },
  peach:       { kcal: 39,  protein: 0.9, carbs: 10,  fat: 0.3 },
  cherry:      { kcal: 50,  protein: 1.0, carbs: 12,  fat: 0.3 },
  raspberry:   { kcal: 52,  protein: 1.2, carbs: 12,  fat: 0.7 },
  strawberry:  { kcal: 32,  protein: 0.7, carbs: 7.7, fat: 0.3 },
  banana:      { kcal: 89,  protein: 1.1, carbs: 23,  fat: 0.3 },
  kiwi:        { kcal: 61,  protein: 1.1, carbs: 15,  fat: 0.5 },
  papaya:      { kcal: 43,  protein: 0.5, carbs: 11,  fat: 0.3 },
  guava:       { kcal: 68,  protein: 2.6, carbs: 14,  fat: 0.9 },
  fig:         { kcal: 74,  protein: 0.8, carbs: 19,  fat: 0.3 },
  apricot:     { kcal: 48,  protein: 1.4, carbs: 11,  fat: 0.4 },
  orange:      { kcal: 47,  protein: 0.9, carbs: 12,  fat: 0.1 },
  lemon:       { kcal: 29,  protein: 1.1, carbs: 9,   fat: 0.3 },
  grapefruit:  { kcal: 42,  protein: 0.8, carbs: 11,  fat: 0.1 },
  raisins:     { kcal: 299, protein: 3.1, carbs: 79,  fat: 0.5 },
  prunes:      { kcal: 240, protein: 2.2, carbs: 64,  fat: 0.4 },
  dates:       { kcal: 277, protein: 1.8, carbs: 75,  fat: 0.2 },
  // Vegetables
  tomato:           { kcal: 18,  protein: 0.9, carbs: 3.9, fat: 0.2 },
  cucumber:         { kcal: 16,  protein: 0.7, carbs: 3.6, fat: 0.1 },
  bell_pepper:      { kcal: 31,  protein: 1,   carbs: 6,   fat: 0.3 },
  onion:            { kcal: 40,  protein: 1.1, carbs: 9,   fat: 0.1 },
  carrot:           { kcal: 41,  protein: 0.9, carbs: 10,  fat: 0.2 },
  zucchini:         { kcal: 17,  protein: 1.2, carbs: 3.1, fat: 0.3 },
  eggplant:         { kcal: 25,  protein: 1,   carbs: 6,   fat: 0.2 },
  cauliflower:      { kcal: 25,  protein: 1.9, carbs: 5,   fat: 0.3 },
  cabbage:          { kcal: 25,  protein: 1.3, carbs: 6,   fat: 0.1 },
  brussels_sprouts: { kcal: 43,  protein: 3.4, carbs: 9,   fat: 0.3 },
  asparagus:        { kcal: 20,  protein: 2.2, carbs: 3.9, fat: 0.1 },
  green_beans:      { kcal: 31,  protein: 1.8, carbs: 7,   fat: 0.2 },
  peas:             { kcal: 81,  protein: 5.4, carbs: 14,  fat: 0.4 },
  celery:           { kcal: 16,  protein: 0.7, carbs: 3,   fat: 0.2 },
  arugula:          { kcal: 25,  protein: 2.6, carbs: 3.7, fat: 0.7 },
  lettuce:          { kcal: 15,  protein: 1.4, carbs: 2.9, fat: 0.2 },
  parsley:          { kcal: 36,  protein: 3,   carbs: 6,   fat: 0.8 },
  cilantro:         { kcal: 23,  protein: 2.1, carbs: 3.7, fat: 0.5 },
  mint:             { kcal: 70,  protein: 3.8, carbs: 15,  fat: 0.9 },
  beet:             { kcal: 43,  protein: 1.6, carbs: 10,  fat: 0.2 },
  radish:           { kcal: 16,  protein: 0.7, carbs: 3.4, fat: 0.1 },
  okra:             { kcal: 33,  protein: 1.9, carbs: 7,   fat: 0.2 },
  artichoke:        { kcal: 47,  protein: 3.3, carbs: 11,  fat: 0.2 },
  mushroom:         { kcal: 22,  protein: 3.1, carbs: 3.3, fat: 0.3 },
  kale:             { kcal: 35,  protein: 2.9, carbs: 4.4, fat: 1.5 },
  potato:           { kcal: 77,  protein: 2,   carbs: 17,  fat: 0.1 },
  pumpkin:          { kcal: 26,  protein: 1,   carbs: 7,   fat: 0.1 },
  corn:             { kcal: 86,  protein: 3.3, carbs: 19,  fat: 1.4 },
  molokhia:         { kcal: 40,  protein: 4,   carbs: 6,   fat: 0.4 },
  // Beverages
  coffee:            { kcal: 2,   protein: 0.3, carbs: 0,   fat: 0   },
  tea:               { kcal: 1,   protein: 0,   carbs: 0.3, fat: 0   },
  black_tea:         { kcal: 1,   protein: 0,   carbs: 0.3, fat: 0   },
  herbal_tea:        { kcal: 1,   protein: 0,   carbs: 0.2, fat: 0   },
  matcha:            { kcal: 3,   protein: 0.3, carbs: 0.5, fat: 0.1 },
  orange_juice:      { kcal: 45,  protein: 0.7, carbs: 10,  fat: 0.2 },
  pomegranate_juice: { kcal: 54,  protein: 0.4, carbs: 13,  fat: 0.3 },
  // Water — counted but kcal-free
  water:             { kcal: 0,   protein: 0,   carbs: 0,   fat: 0   },
  // Fats / oils
  coconut_oil:       { kcal: 862, protein: 0,   carbs: 0,   fat: 100 },
  fish_oil:          { kcal: 902, protein: 0,   carbs: 0,   fat: 100 },
  // Spices / herbs (per 100g — typical use is < 5g; portion below)
  turmeric:    { kcal: 312, protein: 10, carbs: 67, fat: 3.3 },
  ginger:      { kcal: 80,  protein: 1.8, carbs: 18, fat: 0.8 },
  cinnamon:    { kcal: 247, protein: 4,   carbs: 81, fat: 1.2 },
  black_seed:  { kcal: 400, protein: 17,  carbs: 50, fat: 22  },
  saffron:     { kcal: 310, protein: 11,  carbs: 65, fat: 6   },
  zaatar:      { kcal: 270, protein: 9,   carbs: 50, fat: 7   },
  // Sweets
  honey:          { kcal: 304, protein: 0.3, carbs: 82, fat: 0   },
  dark_chocolate: { kcal: 546, protein: 5,   carbs: 61, fat: 31  },
};

/**
 * Default grams per "portion = 1" for each known food.
 * Anything not listed defaults to 100 g (the atlas standard).
 */
const PORTION_GRAMS: Record<string, number> = {
  // Liquid / drinks: 1 portion = 1 glass / cup
  milk: 240, water: 250, coffee: 240, tea: 240,
  green_tea: 240, black_tea: 240, herbal_tea: 240, matcha: 240,
  orange_juice: 240, pomegranate_juice: 240, coconut_water: 240,
  kefir: 200,
  // Eggs: per egg
  eggs: 50, egg_yolk: 17,
  // Fruits — average whole piece
  apple: 180, pear: 178, banana: 118, orange: 130, lemon: 60,
  grapefruit: 230, kiwi: 70, peach: 150, mango: 200, papaya: 300,
  pineapple: 165, watermelon: 280, melon: 280, fig: 50, apricot: 35,
  pomegranate: 280, guava: 90, raisins: 30, prunes: 30, dates: 24,
  cherry: 80, raspberry: 80, strawberry: 80, blueberry: 80,
  grape: 80, avocado: 200,
  // Vegetables (typical side serving)
  tomato: 120, cucumber: 100, bell_pepper: 120, onion: 110,
  garlic: 5, carrot: 60, zucchini: 100, eggplant: 80,
  cauliflower: 100, cabbage: 100, brussels_sprouts: 80, asparagus: 100,
  green_beans: 100, peas: 80, celery: 50, arugula: 30, lettuce: 30,
  parsley: 8, cilantro: 8, mint: 5, beet: 80, radish: 40,
  okra: 80, artichoke: 120, mushroom: 70, kale: 70,
  potato: 200, sweet_potato: 200, pumpkin: 100, corn: 100,
  spinach: 30, broccoli: 80, molokhia: 100,
  // Proteins (typical 1-portion serving)
  chicken: 120, turkey: 120, beef: 120, lamb: 120, duck: 120,
  liver: 100,
  fish: 120, salmon: 120, tuna: 100, sardines: 90, mackerel: 120,
  shrimp: 100, oyster: 80,
  // Plant proteins
  beans: 90, black_beans: 90, lentils: 100, chickpeas: 100,
  edamame: 80, tofu: 100, tempeh: 80, hummus: 50, falafel: 60,
  fava_beans: 100,
  // Dairy / cheese
  yogurt: 200, cheese: 30, cottage_cheese: 100, feta: 30,
  butter: 10, ghee: 10, labneh: 50, kishk: 30,
  // Nuts / seeds (handful = 28 g)
  almonds: 28, walnuts: 28, pistachios: 28, cashews: 28, hazelnuts: 28,
  brazil_nuts: 14, peanuts: 28, pecans: 28,
  chia_seeds: 15, flax_seeds: 12, pumpkin_seeds: 28, sunflower_seeds: 28,
  sesame: 10, tahini: 15,
  // Grains
  oats: 50, rice: 150, brown_rice: 150, quinoa: 150, bulgur: 150,
  couscous: 150, barley: 150, whole_bread: 50, pita: 80, pasta: 150,
  freekeh: 150,
  // Fats / oils
  olive_oil: 13, coconut_oil: 13, fish_oil: 5,
  // Spices
  turmeric: 3, ginger: 5, cinnamon: 2, black_seed: 3,
  saffron: 0.5, zaatar: 5,
  // Sweets
  honey: 21, dark_chocolate: 30,
};

/**
 * Resolve a food key (from `FOODS` / log) to a per-100 g macro card.
 * Returns null when nothing is known about the food (custom logs).
 */
export function macrosPer100g(foodKey: string): MacroSet | null {
  // Custom logs: no macro data.
  if (foodKey.startsWith('custom:')) return null;
  // Direct atlas hit
  const direct = ATLAS_INDEX[foodKey];
  if (direct) {
    const p = direct.per100g;
    return { kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat };
  }
  // Aliased atlas hit
  const alias = ALIAS[foodKey];
  if (alias && ATLAS_INDEX[alias]) {
    const p = ATLAS_INDEX[alias].per100g;
    return { kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat };
  }
  // Curated fallback
  return FALLBACK_PER_100G[foodKey] ?? null;
}

/** Default grams in a portion=1 entry. */
export function portionGramsFor(foodKey: string): number {
  if (foodKey.startsWith('custom:')) return 100;
  return PORTION_GRAMS[foodKey] ?? 100;
}

/**
 * Macros for a logged item — `portion` is multiplicative (1 = standard
 * portion). Returns ZERO for foods we don't have macros for.
 */
export function macroFor(foodKey: string, portion: number): MacroSet {
  const per100 = macrosPer100g(foodKey);
  if (!per100) return ZERO;
  const grams = portionGramsFor(foodKey) * (portion || 1);
  const k = grams / 100;
  return {
    kcal: Math.round(per100.kcal * k),
    protein: Math.round(per100.protein * k * 10) / 10,
    carbs: Math.round(per100.carbs * k * 10) / 10,
    fat: Math.round(per100.fat * k * 10) / 10,
  };
}

/** Sum macros for a list of diet logs (typically a single day). */
export function dailyMacros(logs: { foodKey: string; portion: number }[]): MacroSet {
  const total: MacroSet = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const l of logs) {
    const m = macroFor(l.foodKey, l.portion ?? 1);
    total.kcal    += m.kcal;
    total.protein += m.protein;
    total.carbs   += m.carbs;
    total.fat     += m.fat;
  }
  total.protein = Math.round(total.protein * 10) / 10;
  total.carbs   = Math.round(total.carbs   * 10) / 10;
  total.fat     = Math.round(total.fat     * 10) / 10;
  return total;
}

/** Sum macros for diet logs filtered to a single ISO date. */
export function macrosForDate(logs: DietLog[], iso: string): MacroSet {
  return dailyMacros(logs.filter((l) => l.date === iso));
}

/** True when the food has known macros (atlas or fallback). */
export function hasMacros(foodKey: string): boolean {
  return macrosPer100g(foodKey) != null;
}
