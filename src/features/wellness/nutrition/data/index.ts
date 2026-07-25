/**
 * Nutrition Database Index — Combines all food category databases
 * into a single searchable, filterable collection.
 * 
 * Total: 479+ food items with full nutritional profiles
 * Extended with 171+ new items across all categories (v2)
 */

import type { NutritionCategory,NutritionFoodItem } from '../types';
import { BEVERAGES_DATA } from './beverages';
import { DAIRY_DATA } from './dairy';
import { DAIRY_EXTENDED_DATA } from './dairy-extended';
import { FRUITS_DATA } from './fruits';
// ── Extended databases (v2) ──────────────────────────────────────────
import { FRUITS_EXTENDED_DATA } from './fruits-extended';
import { GRAINS_DATA } from './grains';
import { GRAINS_LEGUMES_EXTENDED_DATA } from './grains-legumes-extended';
import { LEGUMES_DATA } from './legumes';
import { NUTS_SEEDS_DATA } from './nuts-seeds';
import { NUTS_SEEDS_EXTENDED_DATA } from './nuts-seeds-extended';
import { OILS_SPICES_DATA } from './oils-spices';
import { PREPARED_FOODS_DATA } from './prepared-foods';
import { PROTEINS_DATA } from './proteins';
import { PROTEINS_EXTENDED_DATA } from './proteins-extended';
import { SNACKS_CONDIMENTS_DATA } from './snacks-condiments';
import { VEGETABLES_DATA } from './vegetables';
import { VEGETABLES_EXTENDED_DATA } from './vegetables-extended';

/** Complete food database — all categories combined (v2: 479+ items) */
export const NUTRITION_DATABASE: NutritionFoodItem[] = [
  // ── Original databases ──
  ...FRUITS_DATA,
  ...VEGETABLES_DATA,
  ...PROTEINS_DATA,
  ...DAIRY_DATA,
  ...GRAINS_DATA,
  ...LEGUMES_DATA,
  ...NUTS_SEEDS_DATA,
  ...OILS_SPICES_DATA,
  ...BEVERAGES_DATA,
  ...PREPARED_FOODS_DATA,
  ...SNACKS_CONDIMENTS_DATA,
  // ── Extended databases (v2) ──
  ...FRUITS_EXTENDED_DATA,
  ...VEGETABLES_EXTENDED_DATA,
  ...PROTEINS_EXTENDED_DATA,
  ...DAIRY_EXTENDED_DATA,
  ...GRAINS_LEGUMES_EXTENDED_DATA,
  ...NUTS_SEEDS_EXTENDED_DATA,
];

/** Index by ID for O(1) lookup */
export const FOOD_BY_ID: Record<string, NutritionFoodItem> = (() => {
  const map: Record<string, NutritionFoodItem> = {};
  for (const food of NUTRITION_DATABASE) {
    map[food.id] = food;
  }
  return map;
})();

/** Group by category */
export const FOODS_BY_CATEGORY: Record<NutritionCategory, NutritionFoodItem[]> = (() => {
  const map = {} as Record<NutritionCategory, NutritionFoodItem[]>;
  for (const food of NUTRITION_DATABASE) {
    if (!map[food.category]) map[food.category] = [];
    map[food.category].push(food);
  }
  return map;
})();

/** Category metadata for UI */
export const CATEGORY_INFO: Record<NutritionCategory, { emoji: string; color: string; label: { ar: string; }; count: number }> = {
  fruits: { emoji: '🍎', color: '#e53e3e', label: { ar: 'فواكه', }, count: FRUITS_DATA.length + FRUITS_EXTENDED_DATA.length },
  vegetables: { emoji: '🥦', color: '#48bb78', label: { ar: 'خضروات', }, count: VEGETABLES_DATA.length + VEGETABLES_EXTENDED_DATA.length },
  meat_poultry: { emoji: '🥩', color: '#c53030', label: { ar: 'لحوم ودواجن', }, count: PROTEINS_DATA.filter(f => f.category === 'meat_poultry').length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'meat_poultry').length },
  fish_seafood: { emoji: '🐟', color: '#4299e1', label: { ar: 'أسماك ومأكولات بحرية', }, count: PROTEINS_DATA.filter(f => f.category === 'fish_seafood').length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'fish_seafood').length },
  dairy_eggs: { emoji: '🥛', color: '#f7fafc', label: { ar: 'ألبان وبيض', }, count: DAIRY_DATA.length + DAIRY_EXTENDED_DATA.length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'dairy_eggs').length },
  grains_cereals: { emoji: '🌾', color: '#d69e2e', label: { ar: 'حبوب ونشويات', }, count: GRAINS_DATA.length + GRAINS_LEGUMES_EXTENDED_DATA.filter(f => f.category === 'grains_cereals').length },
  legumes_pulses: { emoji: '🫘', color: '#6b8e23', label: { ar: 'بقوليات', }, count: LEGUMES_DATA.length + GRAINS_LEGUMES_EXTENDED_DATA.filter(f => f.category === 'legumes_pulses').length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'legumes_pulses').length },
  nuts_seeds: { emoji: '🌰', color: '#8b4513', label: { ar: 'مكسرات وبذور', }, count: NUTS_SEEDS_DATA.length + NUTS_SEEDS_EXTENDED_DATA.length },
  oils_fats: { emoji: '🫒', color: '#6b8e23', label: { ar: 'زيوت ودهون', }, count: OILS_SPICES_DATA.filter(f => f.category === 'oils_fats').length },
  beverages: { emoji: '🍵', color: '#48bb78', label: { ar: 'مشروبات', }, count: BEVERAGES_DATA.length },
  spices_herbs: { emoji: '🌿', color: '#276749', label: { ar: 'توابل وأعشاب', }, count: OILS_SPICES_DATA.filter(f => f.category === 'spices_herbs').length },
  sweets_desserts: { emoji: '🍯', color: '#f6ad55', label: { ar: 'حلويات', }, count: OILS_SPICES_DATA.filter(f => f.category === 'sweets_desserts').length },
  prepared_foods: { emoji: '🍽️', color: '#4a5568', label: { ar: 'أطعمة محضرة', }, count: PREPARED_FOODS_DATA.length },
  breads_bakery: { emoji: '🍞', color: '#a0522d', label: { ar: 'خبز ومخبوزات', }, count: 0 },
  condiments_sauces: { emoji: '🥫', color: '#e53e3e', label: { ar: 'صلصات وبهارات', }, count: SNACKS_CONDIMENTS_DATA.filter(f => f.category === 'condiments_sauces').length },
  snacks: { emoji: '🍿', color: '#ecc94b', label: { ar: 'وجبات خفيفة', }, count: SNACKS_CONDIMENTS_DATA.filter(f => f.category === 'snacks').length },
};

/** Get total food count */
export const TOTAL_FOOD_COUNT = NUTRITION_DATABASE.length;

// Re-export original databases
export { BEVERAGES_DATA, DAIRY_DATA, FRUITS_DATA, GRAINS_DATA, LEGUMES_DATA, NUTS_SEEDS_DATA, OILS_SPICES_DATA, PREPARED_FOODS_DATA, PROTEINS_DATA, SNACKS_CONDIMENTS_DATA,VEGETABLES_DATA };
// Re-export extended databases (v2)
export { DAIRY_EXTENDED_DATA, FRUITS_EXTENDED_DATA, GRAINS_LEGUMES_EXTENDED_DATA, NUTS_SEEDS_EXTENDED_DATA,PROTEINS_EXTENDED_DATA, VEGETABLES_EXTENDED_DATA };
