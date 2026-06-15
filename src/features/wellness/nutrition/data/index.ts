/**
 * Nutrition Database Index — Combines all food category databases
 * into a single searchable, filterable collection.
 * 
 * Total: 479+ food items with full nutritional profiles
 * Extended with 171+ new items across all categories (v2)
 */

import { FRUITS_DATA } from './fruits';
import { VEGETABLES_DATA } from './vegetables';
import { PROTEINS_DATA } from './proteins';
import { DAIRY_DATA } from './dairy';
import { GRAINS_DATA } from './grains';
import { LEGUMES_DATA } from './legumes';
import { NUTS_SEEDS_DATA } from './nuts-seeds';
import { OILS_SPICES_DATA } from './oils-spices';
import { BEVERAGES_DATA } from './beverages';
import { PREPARED_FOODS_DATA } from './prepared-foods';
import { SNACKS_CONDIMENTS_DATA } from './snacks-condiments';

// ── Extended databases (v2) ──────────────────────────────────────────
import { FRUITS_EXTENDED_DATA } from './fruits-extended';
import { VEGETABLES_EXTENDED_DATA } from './vegetables-extended';
import { PROTEINS_EXTENDED_DATA } from './proteins-extended';
import { DAIRY_EXTENDED_DATA } from './dairy-extended';
import { GRAINS_LEGUMES_EXTENDED_DATA } from './grains-legumes-extended';
import { NUTS_SEEDS_EXTENDED_DATA } from './nuts-seeds-extended';

import type { NutritionFoodItem, NutritionCategory } from '../types';

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
export const CATEGORY_INFO: Record<NutritionCategory, { emoji: string; color: string; label: { ar: string; de: string }; count: number }> = {
  fruits: { emoji: '🍎', color: '#e53e3e', label: { ar: 'فواكه', de: 'Obst' }, count: FRUITS_DATA.length + FRUITS_EXTENDED_DATA.length },
  vegetables: { emoji: '🥦', color: '#48bb78', label: { ar: 'خضروات', de: 'Gemüse' }, count: VEGETABLES_DATA.length + VEGETABLES_EXTENDED_DATA.length },
  meat_poultry: { emoji: '🥩', color: '#c53030', label: { ar: 'لحوم ودواجن', de: 'Fleisch & Geflügel' }, count: PROTEINS_DATA.filter(f => f.category === 'meat_poultry').length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'meat_poultry').length },
  fish_seafood: { emoji: '🐟', color: '#4299e1', label: { ar: 'أسماك ومأكولات بحرية', de: 'Fisch & Meeresfrüchte' }, count: PROTEINS_DATA.filter(f => f.category === 'fish_seafood').length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'fish_seafood').length },
  dairy_eggs: { emoji: '🥛', color: '#f7fafc', label: { ar: 'ألبان وبيض', de: 'Milch & Eier' }, count: DAIRY_DATA.length + DAIRY_EXTENDED_DATA.length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'dairy_eggs').length },
  grains_cereals: { emoji: '🌾', color: '#d69e2e', label: { ar: 'حبوب ونشويات', de: 'Getreide' }, count: GRAINS_DATA.length + GRAINS_LEGUMES_EXTENDED_DATA.filter(f => f.category === 'grains_cereals').length },
  legumes_pulses: { emoji: '🫘', color: '#6b8e23', label: { ar: 'بقوليات', de: 'Hülsenfrüchte' }, count: LEGUMES_DATA.length + GRAINS_LEGUMES_EXTENDED_DATA.filter(f => f.category === 'legumes_pulses').length + PROTEINS_EXTENDED_DATA.filter(f => f.category === 'legumes_pulses').length },
  nuts_seeds: { emoji: '🌰', color: '#8b4513', label: { ar: 'مكسرات وبذور', de: 'Nüsse & Samen' }, count: NUTS_SEEDS_DATA.length + NUTS_SEEDS_EXTENDED_DATA.length },
  oils_fats: { emoji: '🫒', color: '#6b8e23', label: { ar: 'زيوت ودهون', de: 'Öle & Fette' }, count: OILS_SPICES_DATA.filter(f => f.category === 'oils_fats').length },
  beverages: { emoji: '🍵', color: '#48bb78', label: { ar: 'مشروبات', de: 'Getränke' }, count: BEVERAGES_DATA.length },
  spices_herbs: { emoji: '🌿', color: '#276749', label: { ar: 'توابل وأعشاب', de: 'Gewürze & Kräuter' }, count: OILS_SPICES_DATA.filter(f => f.category === 'spices_herbs').length },
  sweets_desserts: { emoji: '🍯', color: '#f6ad55', label: { ar: 'حلويات', de: 'Süßigkeiten' }, count: OILS_SPICES_DATA.filter(f => f.category === 'sweets_desserts').length },
  prepared_foods: { emoji: '🍽️', color: '#4a5568', label: { ar: 'أطعمة محضرة', de: 'Fertiggerichte' }, count: PREPARED_FOODS_DATA.length },
  breads_bakery: { emoji: '🍞', color: '#a0522d', label: { ar: 'خبز ومخبوزات', de: 'Brot & Backwaren' }, count: 0 },
  condiments_sauces: { emoji: '🥫', color: '#e53e3e', label: { ar: 'صلصات وبهارات', de: 'Saucen & Würzmittel' }, count: SNACKS_CONDIMENTS_DATA.filter(f => f.category === 'condiments_sauces').length },
  snacks: { emoji: '🍿', color: '#ecc94b', label: { ar: 'وجبات خفيفة', de: 'Snacks' }, count: SNACKS_CONDIMENTS_DATA.filter(f => f.category === 'snacks').length },
};

/** Get total food count */
export const TOTAL_FOOD_COUNT = NUTRITION_DATABASE.length;

// Re-export original databases
export { FRUITS_DATA, VEGETABLES_DATA, PROTEINS_DATA, DAIRY_DATA, GRAINS_DATA, LEGUMES_DATA, NUTS_SEEDS_DATA, OILS_SPICES_DATA, BEVERAGES_DATA, PREPARED_FOODS_DATA, SNACKS_CONDIMENTS_DATA };
// Re-export extended databases (v2)
export { FRUITS_EXTENDED_DATA, VEGETABLES_EXTENDED_DATA, PROTEINS_EXTENDED_DATA, DAIRY_EXTENDED_DATA, GRAINS_LEGUMES_EXTENDED_DATA, NUTS_SEEDS_EXTENDED_DATA };
