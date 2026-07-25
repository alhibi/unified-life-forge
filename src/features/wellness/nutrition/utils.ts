/**
 * Nutrition Utilities — Search, filter, calculate, and analyze
 * Pure functions, no React, no I/O.
 */

import type {
  NutritionFoodItem, NutritionSearchFilters, NutritionCategory,
  DietaryTag, AllergenType, FullNutrition, MacroNutrients,
  MealEntry, DailyNutritionGoal, DailyIntakeSummary, MealType,
  VitaminProfile, MineralProfile, NutrientRDA, Lang,
} from './types';
import { RDA_MALE as RDA_MALE_VAL, RDA_FEMALE as RDA_FEMALE_VAL } from './types';
import { NUTRITION_DATABASE, FOOD_BY_ID } from './data';

/* ═══════════════════════════════════════════════════════
 *  SEARCH & FILTER
 * ═══════════════════════════════════════════════════════ */

/** Normalize Arabic/German text for fuzzy search */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/ß/g, 'ss')
    .trim();
}


/** Search foods by query (Arabic-normalised fuzzy match). */
export function searchFoods(query: string, foods = NUTRITION_DATABASE): NutritionFoodItem[] {
  if (!query || query.trim().length === 0) return foods;
  const q = normalize(query);
  return foods.filter(food => {
    const nameAr = normalize(food.name.ar);
    const id = food.id.replace(/_/g, ' ');
    return nameAr.includes(q) || id.includes(q)
      || food.subCategory?.includes(q)
      || food.tags.some(t => t.replace(/_/g, ' ').includes(q));
  });
}

/** Filter foods by multiple criteria */
export function filterFoods(
  filters: NutritionSearchFilters,
  foods = NUTRITION_DATABASE
): NutritionFoodItem[] {
  let result = foods;

  if (filters.query) {
    result = searchFoods(filters.query, result);
  }

  if (filters.category) {
    result = result.filter(f => f.category === filters.category);
  }

  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(f => 
      filters.tags!.every(tag => f.tags.includes(tag))
    );
  }

  if (filters.allergenFree && filters.allergenFree.length > 0) {
    result = result.filter(f =>
      !f.allergens.some(a => filters.allergenFree!.includes(a))
    );
  }

  if (filters.maxCalories != null) {
    result = result.filter(f => f.nutrition.kcal <= filters.maxCalories!);
  }

  if (filters.minProtein != null) {
    result = result.filter(f => f.nutrition.protein >= filters.minProtein!);
  }

  if (filters.maxCarbs != null) {
    result = result.filter(f => f.nutrition.carbs <= filters.maxCarbs!);
  }

  if (filters.maxFat != null) {
    result = result.filter(f => f.nutrition.fat <= filters.maxFat!);
  }

  if (filters.minFiber != null) {
    result = result.filter(f => f.nutrition.fiber >= filters.minFiber!);
  }

  if (filters.glycemicIndexMax != null) {
    result = result.filter(f => 
      f.glycemicIndex != null && f.glycemicIndex <= filters.glycemicIndexMax!
    );
  }

  return result;
}


/* ═══════════════════════════════════════════════════════
 *  NUTRITION CALCULATIONS
 * ═══════════════════════════════════════════════════════ */

/** Calculate nutrition for a specific serving */
export function calculateServing(
  food: NutritionFoodItem,
  servingIndex: number,
  quantity: number
): FullNutrition {
  const serving = food.servings[servingIndex] || food.servings[0];
  const multiplier = (serving.grams * quantity) / 100;
  const n = food.nutrition;

  return {
    kcal: Math.round(n.kcal * multiplier),
    protein: round1(n.protein * multiplier),
    carbs: round1(n.carbs * multiplier),
    fat: round1(n.fat * multiplier),
    fiber: round1(n.fiber * multiplier),
    sugar: n.sugar ? round1(n.sugar * multiplier) : undefined,
    saturatedFat: n.saturatedFat ? round1(n.saturatedFat * multiplier) : undefined,
    monoFat: n.monoFat ? round1(n.monoFat * multiplier) : undefined,
    polyFat: n.polyFat ? round1(n.polyFat * multiplier) : undefined,
    transFat: n.transFat ? round1(n.transFat * multiplier) : undefined,
    cholesterol: n.cholesterol ? round1(n.cholesterol * multiplier) : undefined,
    water: n.water ? round1(n.water * multiplier) : undefined,
    vitamins: scaleVitamins(n.vitamins, multiplier),
    minerals: scaleMinerals(n.minerals, multiplier),
  };
}

function scaleVitamins(v: VitaminProfile, m: number): VitaminProfile {
  const out: VitaminProfile = {};
  for (const [k, val] of Object.entries(v)) {
    if (val != null) (out as any)[k] = round2(val * m);
  }
  return out;
}

function scaleMinerals(min: MineralProfile, m: number): MineralProfile {
  const out: MineralProfile = {};
  for (const [k, val] of Object.entries(min)) {
    if (val != null) (out as any)[k] = round2(val * m);
  }
  return out;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }


/** Sum multiple nutrition profiles */
export function sumNutrition(items: FullNutrition[]): FullNutrition {
  const result: FullNutrition = {
    kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
    vitamins: {}, minerals: {},
  };

  for (const item of items) {
    result.kcal += item.kcal;
    result.protein += item.protein;
    result.carbs += item.carbs;
    result.fat += item.fat;
    result.fiber += item.fiber;
    if (item.sugar) result.sugar = (result.sugar || 0) + item.sugar;
    if (item.saturatedFat) result.saturatedFat = (result.saturatedFat || 0) + item.saturatedFat;
    if (item.cholesterol) result.cholesterol = (result.cholesterol || 0) + item.cholesterol;

    // Sum vitamins
    for (const [k, v] of Object.entries(item.vitamins)) {
      if (v != null) (result.vitamins as any)[k] = ((result.vitamins as any)[k] || 0) + v;
    }
    // Sum minerals
    for (const [k, v] of Object.entries(item.minerals)) {
      if (v != null) (result.minerals as any)[k] = ((result.minerals as any)[k] || 0) + v;
    }
  }

  return result;
}

/** Calculate daily intake summary from meal entries */
export function calculateDailySummary(
  entries: MealEntry[],
  date: string,
  goal?: DailyNutritionGoal | null
): DailyIntakeSummary {
  const dayEntries = entries.filter(e => e.date === date);
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];

  const meals = mealTypes.map(type => {
    const typeEntries = dayEntries.filter(e => e.mealType === type);
    const nutritions = typeEntries.map(e => {
      const food = FOOD_BY_ID[e.foodId];
      if (!food) return null;
      return calculateServing(food, e.servingIndex, e.quantity);
    }).filter(Boolean) as FullNutrition[];

    return {
      type,
      entries: typeEntries,
      subtotal: {
        kcal: nutritions.reduce((s, n) => s + n.kcal, 0),
        protein: nutritions.reduce((s, n) => s + n.protein, 0),
        carbs: nutritions.reduce((s, n) => s + n.carbs, 0),
        fat: nutritions.reduce((s, n) => s + n.fat, 0),
        fiber: nutritions.reduce((s, n) => s + n.fiber, 0),
      },
    };
  }).filter(m => m.entries.length > 0);

  const totalNutrition = sumNutrition(
    dayEntries.map(e => {
      const food = FOOD_BY_ID[e.foodId];
      if (!food) return null;
      return calculateServing(food, e.servingIndex, e.quantity);
    }).filter(Boolean) as FullNutrition[]
  );

  const goalProgress = goal ? {
    kcalPercent: Math.min(100, Math.round((totalNutrition.kcal / goal.kcal) * 100)),
    proteinPercent: Math.min(100, Math.round((totalNutrition.protein / goal.protein) * 100)),
    carbsPercent: Math.min(100, Math.round((totalNutrition.carbs / goal.carbs) * 100)),
    fatPercent: Math.min(100, Math.round((totalNutrition.fat / goal.fat) * 100)),
    fiberPercent: Math.min(100, Math.round((totalNutrition.fiber / goal.fiber) * 100)),
  } : undefined;

  return { date, totalNutrition, meals, goalProgress };
}


/* ═══════════════════════════════════════════════════════
 *  SMART RECOMMENDATIONS
 * ═══════════════════════════════════════════════════════ */

/** Get foods high in a specific vitamin */
export function foodsHighInVitamin(
  vitamin: keyof VitaminProfile,
  limit = 10
): NutritionFoodItem[] {
  return [...NUTRITION_DATABASE]
    .filter(f => f.nutrition.vitamins[vitamin] != null && f.nutrition.vitamins[vitamin]! > 0)
    .sort((a, b) => (b.nutrition.vitamins[vitamin] || 0) - (a.nutrition.vitamins[vitamin] || 0))
    .slice(0, limit);
}

/** Get foods high in a specific mineral */
export function foodsHighInMineral(
  mineral: keyof MineralProfile,
  limit = 10
): NutritionFoodItem[] {
  return [...NUTRITION_DATABASE]
    .filter(f => f.nutrition.minerals[mineral] != null && f.nutrition.minerals[mineral]! > 0)
    .sort((a, b) => (b.nutrition.minerals[mineral] || 0) - (a.nutrition.minerals[mineral] || 0))
    .slice(0, limit);
}

/** Get best protein sources (protein per calorie ratio) */
export function bestProteinSources(limit = 15): NutritionFoodItem[] {
  return [...NUTRITION_DATABASE]
    .filter(f => f.nutrition.protein > 5)
    .sort((a, b) => (b.nutrition.protein / b.nutrition.kcal) - (a.nutrition.protein / a.nutrition.kcal))
    .slice(0, limit);
}

/** Get lowest glycemic index foods */
export function lowestGIFoods(limit = 15): NutritionFoodItem[] {
  return [...NUTRITION_DATABASE]
    .filter(f => f.glycemicIndex != null && f.glycemicIndex > 0)
    .sort((a, b) => (a.glycemicIndex || 100) - (b.glycemicIndex || 100))
    .slice(0, limit);
}

/** Get highest fiber foods */
export function highestFiberFoods(limit = 15): NutritionFoodItem[] {
  return [...NUTRITION_DATABASE]
    .filter(f => f.nutrition.fiber > 0)
    .sort((a, b) => b.nutrition.fiber - a.nutrition.fiber)
    .slice(0, limit);
}

/** Get anti-inflammatory foods */
export function antiInflammatoryFoods(): NutritionFoodItem[] {
  return NUTRITION_DATABASE.filter(f => f.tags.includes('anti_inflammatory'));
}

/** Get foods by dietary tag */
export function foodsByTag(tag: DietaryTag): NutritionFoodItem[] {
  return NUTRITION_DATABASE.filter(f => f.tags.includes(tag));
}

/** Suggest complementary foods based on what's missing from daily intake */
export function suggestComplementary(
  currentIntake: FullNutrition,
  goal: DailyNutritionGoal
): { need: string; foods: NutritionFoodItem[] }[] {
  const suggestions: { need: string; foods: NutritionFoodItem[] }[] = [];

  if (currentIntake.protein < goal.protein * 0.7) {
    suggestions.push({
      need: 'protein',
      foods: bestProteinSources(5),
    });
  }

  if (currentIntake.fiber < goal.fiber * 0.5) {
    suggestions.push({
      need: 'fiber',
      foods: highestFiberFoods(5),
    });
  }

  const iron = currentIntake.minerals.iron || 0;
  if (iron < 8) {
    suggestions.push({
      need: 'iron',
      foods: foodsHighInMineral('iron', 5),
    });
  }

  const vitC = currentIntake.vitamins.vitC || 0;
  if (vitC < 45) {
    suggestions.push({
      need: 'vitaminC',
      foods: foodsHighInVitamin('vitC', 5),
    });
  }

  return suggestions;
}


/* ═══════════════════════════════════════════════════════
 *  COMPARISON & ANALYSIS
 * ═══════════════════════════════════════════════════════ */

export interface NutrientComparison {
  food: NutritionFoodItem;
  value: number;
}

/** Compare foods on a specific nutrient */
export function compareFoodsOnNutrient(
  foodIds: string[],
  nutrient: 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'
): NutrientComparison[] {
  return foodIds
    .map(id => FOOD_BY_ID[id])
    .filter(Boolean)
    .map(food => ({
      food: food!,
      value: food!.nutrition[nutrient],
    }))
    .sort((a, b) => b.value - a.value);
}

/** Calculate macro ratios as percentages */
export function macroRatios(n: MacroNutrients): { proteinPct: number; carbsPct: number; fatPct: number } {
  const totalCal = (n.protein * 4) + (n.carbs * 4) + (n.fat * 9);
  if (totalCal === 0) return { proteinPct: 0, carbsPct: 0, fatPct: 0 };
  return {
    proteinPct: Math.round((n.protein * 4 / totalCal) * 100),
    carbsPct: Math.round((n.carbs * 4 / totalCal) * 100),
    fatPct: Math.round((n.fat * 9 / totalCal) * 100),
  };
}

/** Calculate RDA percentage for a nutrient value */
export function rdaPercent(
  nutrient: keyof NutrientRDA,
  value: number,
  sex: 'male' | 'female' = 'male'
): number {
  const rda = sex === 'male' ? RDA_MALE_VAL : RDA_FEMALE_VAL;
  const target = rda[nutrient];
  if (!target) return 0;
  return Math.round((value / target) * 100);
}

/** Get nutrient density score (nutrients per calorie) */
export function nutrientDensityScore(food: NutritionFoodItem): number {
  const n = food.nutrition;
  if (n.kcal === 0) return 0;
  
  let score = 0;
  score += (n.protein / n.kcal) * 50;
  score += (n.fiber / n.kcal) * 30;
  
  // Vitamin contributions
  const vits = n.vitamins;
  if (vits.vitC) score += Math.min(10, (vits.vitC / 90) * 10);
  if (vits.vitA) score += Math.min(10, (vits.vitA / 900) * 10);
  if (vits.vitD) score += Math.min(10, (vits.vitD / 15) * 10);
  if (vits.vitK) score += Math.min(5, (vits.vitK / 120) * 5);
  if (vits.vitB12) score += Math.min(5, (vits.vitB12 / 2.4) * 5);
  
  // Mineral contributions
  const mins = n.minerals;
  if (mins.iron) score += Math.min(10, (mins.iron / 8) * 10);
  if (mins.calcium) score += Math.min(8, (mins.calcium / 1000) * 8);
  if (mins.magnesium) score += Math.min(8, (mins.magnesium / 400) * 8);
  if (mins.potassium) score += Math.min(5, (mins.potassium / 3400) * 5);
  if (mins.selenium) score += Math.min(5, (mins.selenium / 55) * 5);

  // Penalize very high sugar
  if (n.sugar && n.sugar > 20) score -= 5;
  
  return Math.round(score * 10) / 10;
}

/** Get top nutrient-dense foods */
export function mostNutrientDense(limit = 20): (NutritionFoodItem & { densityScore: number })[] {
  return [...NUTRITION_DATABASE]
    .map(f => ({ ...f, densityScore: nutrientDensityScore(f) }))
    .sort((a, b) => b.densityScore - a.densityScore)
    .slice(0, limit);
}


/* ═══════════════════════════════════════════════════════
 *  FAVORITES & HISTORY  (cloud-backed via wellness_records → kind='kv')
 *  ---------------------------------------------------------------------
 *  These helpers keep their original synchronous signatures so the
 *  many call sites don't need to change. Under the hood, values live
 *  in an in-memory cache that hydrates from Cloud on first import
 *  (and again whenever the auth session changes). Writes update the
 *  cache immediately and are pushed to Cloud in the background.
 *  ═══════════════════════════════════════════════════════ */

import { getKV, setKV } from '@/features/wellness/wellnessDb';
import { supabase } from '@/integrations/supabase/client';

const FAVORITES_KEY = 'nutrition:favorites';
const HISTORY_KEY = 'nutrition:recent';
const MEAL_LOG_KEY = 'nutrition:mealLog';

interface NutritionCache {
  favorites: string[];
  recent: string[];
  mealLog: MealEntry[];
  hydrated: boolean;
}

const cache: NutritionCache = {
  favorites: [],
  recent: [],
  mealLog: [],
  hydrated: false,
};

async function hydrate(): Promise<void> {
  const [fav, rec, log] = await Promise.all([
    getKV<string[]>(FAVORITES_KEY, []),
    getKV<string[]>(HISTORY_KEY, []),
    getKV<MealEntry[]>(MEAL_LOG_KEY, []),
  ]);
  cache.favorites = fav ?? [];
  cache.recent = rec ?? [];
  cache.mealLog = log ?? [];
  cache.hydrated = true;
  // Notify subscribers so React components can re-read.
  for (const cb of subscribers) cb();
}

// Simple subscriber list so components can force a re-render once the
// initial hydration completes (they render empty first, then real data).
const subscribers = new Set<() => void>();
export function subscribeNutritionCache(cb: () => void): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

// Kick off hydration once. Re-hydrate on auth changes.
if (typeof window !== 'undefined') {
  void hydrate();
  supabase.auth.onAuthStateChange(() => {
    cache.favorites = [];
    cache.recent = [];
    cache.mealLog = [];
    cache.hydrated = false;
    for (const cb of subscribers) cb();
    void hydrate();
  });
}

export function getFavorites(): string[] {
  return cache.favorites;
}

export function toggleFavorite(foodId: string): boolean {
  const idx = cache.favorites.indexOf(foodId);
  if (idx >= 0) cache.favorites.splice(idx, 1);
  else cache.favorites.push(foodId);
  cache.favorites = [...cache.favorites];
  void setKV(FAVORITES_KEY, cache.favorites);
  for (const cb of subscribers) cb();
  return idx < 0;
}

export function isFavorite(foodId: string): boolean {
  return cache.favorites.includes(foodId);
}

export function getRecentFoods(): string[] {
  return cache.recent;
}

export function addToRecent(foodId: string): void {
  cache.recent = [foodId, ...cache.recent.filter((id) => id !== foodId)].slice(0, 30);
  void setKV(HISTORY_KEY, cache.recent);
  for (const cb of subscribers) cb();
}

/** Get favorite food items */
export function getFavoriteFoods(): NutritionFoodItem[] {
  return getFavorites()
    .map(id => FOOD_BY_ID[id])
    .filter(Boolean) as NutritionFoodItem[];
}

/** Get recently viewed food items */
export function getRecentFoodItems(): NutritionFoodItem[] {
  return getRecentFoods()
    .map(id => FOOD_BY_ID[id])
    .filter(Boolean) as NutritionFoodItem[];
}

/* ═══════════════════════════════════════════════════════
 *  MEAL LOG (cloud-backed via wellness_records → kind='kv')
 *  ═══════════════════════════════════════════════════════ */

export function getMealLog(): MealEntry[] {
  return cache.mealLog;
}

export function saveMealEntry(entry: MealEntry): void {
  cache.mealLog = [...cache.mealLog, entry];
  void setKV(MEAL_LOG_KEY, cache.mealLog);
  for (const cb of subscribers) cb();
}

export function removeMealEntry(entryId: string): void {
  cache.mealLog = cache.mealLog.filter((e) => e.id !== entryId);
  void setKV(MEAL_LOG_KEY, cache.mealLog);
  for (const cb of subscribers) cb();
}

export function getMealLogForDate(date: string): MealEntry[] {
  return cache.mealLog.filter((e) => e.date === date);
}

export function clearMealLog(): void {
  cache.mealLog = [];
  void setKV(MEAL_LOG_KEY, []);
  for (const cb of subscribers) cb();
}

/**
 * React hook that forces a re-render whenever the nutrition cache
 * (favorites, recent foods, meal log) changes — including the initial
 * hydrate from Cloud and auth-change re-hydrates.
 */
import { useSyncExternalStore } from 'react';
let version = 0;
subscribers.add(() => { version += 1; });
export function useNutritionCache(): number {
  return useSyncExternalStore(
    (cb) => subscribeNutritionCache(cb),
    () => version,
    () => version,
  );
}

/** Generate unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Get today's date as ISO string (YYYY-MM-DD) */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
