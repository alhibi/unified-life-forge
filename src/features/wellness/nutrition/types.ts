/**
 * Nutrition Module — Core Type Definitions
 * 
 * Comprehensive type system for the revolutionary nutrition database.
 * All nutritional values are per 100g unless otherwise specified.
 * Data sourced from USDA FoodData Central, German BLS, and WHO standards.
 */

export type Lang = 'ar';

/* ─────────────────────── Vitamin & Mineral Types ─────────────────────── */

export interface VitaminProfile {
  /** Vitamin A (μg RAE) */
  vitA?: number;
  /** Vitamin B1 - Thiamine (mg) */
  vitB1?: number;
  /** Vitamin B2 - Riboflavin (mg) */
  vitB2?: number;
  /** Vitamin B3 - Niacin (mg) */
  vitB3?: number;
  /** Vitamin B5 - Pantothenic acid (mg) */
  vitB5?: number;
  /** Vitamin B6 - Pyridoxine (mg) */
  vitB6?: number;
  /** Vitamin B7 - Biotin (μg) */
  vitB7?: number;
  /** Vitamin B9 - Folate (μg DFE) */
  vitB9?: number;
  /** Vitamin B12 - Cobalamin (μg) */
  vitB12?: number;
  /** Vitamin C - Ascorbic acid (mg) */
  vitC?: number;
  /** Vitamin D (μg) */
  vitD?: number;
  /** Vitamin E - Alpha-tocopherol (mg) */
  vitE?: number;
  /** Vitamin K (μg) */
  vitK?: number;
}

export interface MineralProfile {
  /** Calcium (mg) */
  calcium?: number;
  /** Iron (mg) */
  iron?: number;
  /** Magnesium (mg) */
  magnesium?: number;
  /** Phosphorus (mg) */
  phosphorus?: number;
  /** Potassium (mg) */
  potassium?: number;
  /** Sodium (mg) */
  sodium?: number;
  /** Zinc (mg) */
  zinc?: number;
  /** Copper (mg) */
  copper?: number;
  /** Manganese (mg) */
  manganese?: number;
  /** Selenium (μg) */
  selenium?: number;
  /** Iodine (μg) */
  iodine?: number;
  /** Chromium (μg) */
  chromium?: number;
  /** Molybdenum (μg) */
  molybdenum?: number;
}

/* ─────────────────────── Macro & Full Nutrition ─────────────────────── */

export interface MacroNutrients {
  /** Calories (kcal) */
  kcal: number;
  /** Protein (g) */
  protein: number;
  /** Total Carbohydrates (g) */
  carbs: number;
  /** Total Fat (g) */
  fat: number;
  /** Dietary Fiber (g) */
  fiber: number;
  /** Sugars (g) */
  sugar?: number;
  /** Saturated Fat (g) */
  saturatedFat?: number;
  /** Monounsaturated Fat (g) */
  monoFat?: number;
  /** Polyunsaturated Fat (g) */
  polyFat?: number;
  /** Trans Fat (g) */
  transFat?: number;
  /** Cholesterol (mg) */
  cholesterol?: number;
  /** Water content (g) */
  water?: number;
}

export interface FullNutrition extends MacroNutrients {
  vitamins: VitaminProfile;
  minerals: MineralProfile;
}

/* ─────────────────────── Food Categories ─────────────────────── */

export type NutritionCategory =
  | 'fruits'
  | 'vegetables'
  | 'grains_cereals'
  | 'meat_poultry'
  | 'fish_seafood'
  | 'dairy_eggs'
  | 'legumes_pulses'
  | 'nuts_seeds'
  | 'oils_fats'
  | 'beverages'
  | 'spices_herbs'
  | 'sweets_desserts'
  | 'prepared_foods'
  | 'breads_bakery'
  | 'condiments_sauces'
  | 'snacks';

export type DietaryTag =
  | 'halal'
  | 'vegan'
  | 'vegetarian'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'low_carb'
  | 'high_protein'
  | 'high_fiber'
  | 'keto_friendly'
  | 'heart_healthy'
  | 'anti_inflammatory'
  | 'bone_health'
  | 'brain_food'
  | 'energy_boost'
  | 'muscle_building'
  | 'weight_loss'
  | 'gut_health'
  | 'immune_boost'
  | 'skin_health'
  | 'hormone_balance'
  | 'whole_grain'
  | 'low_fat';

export type AllergenType =
  | 'gluten'
  | 'dairy'
  | 'eggs'
  | 'nuts'
  | 'peanuts'
  | 'soy'
  | 'fish'
  | 'shellfish'
  | 'sesame'
  | 'sulfites'
  | 'mustard'
  | 'celery';

/* ─────────────────────── Serving & Portion ─────────────────────── */

export interface ServingSize {
  /** Default serving description */
  description: Record<Lang, string>;
  /** Grams per serving */
  grams: number;
}

/* ─────────────────────── Main Food Item ─────────────────────── */

export interface NutritionFoodItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: Record<Lang, string>;
  /** Category */
  category: NutritionCategory;
  /** Sub-category for finer grouping */
  subCategory?: string;
  /** Nutrition per 100g */
  nutrition: FullNutrition;
  /** Common serving sizes */
  servings: ServingSize[];
  /** Dietary tags */
  tags: DietaryTag[];
  /** Allergens */
  allergens: AllergenType[];
  /** Glycemic Index (0-100, null if not applicable) */
  glycemicIndex?: number | null;
  /** Glycemic Load per serving */
  glycemicLoad?: number | null;
  /** Health benefits */
  benefits: Record<Lang, string[]>;
  /** Best time to consume */
  bestTime?: string[];
  /** Origin/Region */
  origin?: string;
  /** Season availability */
  season?: string[];
  /** Storage tips */
  storageTip?: Record<Lang, string>;
  /** Emoji icon */
  emoji: string;
  /** Color for UI */
  color: string;
}

/* ─────────────────────── Meal & Plan Types ─────────────────────── */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface MealEntry {
  id: string;
  foodId: string;
  servingIndex: number;
  quantity: number;
  mealType: MealType;
  date: string;
  time?: string;
  notes?: string;
}

export interface DailyNutritionGoal {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number; // ml
}

export interface MealPlan {
  id: string;
  name: Record<Lang, string>;
  description?: Record<Lang, string>;
  days: MealPlanDay[];
  goal?: DailyNutritionGoal;
  tags: DietaryTag[];
  createdAt: number;
}

export interface MealPlanDay {
  dayIndex: number; // 0-6 for weekly plans
  meals: MealPlanMeal[];
}

export interface MealPlanMeal {
  mealType: MealType;
  items: { foodId: string; servingIndex: number; quantity: number }[];
}

/* ─────────────────────── Search & Filter ─────────────────────── */

export interface NutritionSearchFilters {
  query?: string;
  category?: NutritionCategory;
  tags?: DietaryTag[];
  allergenFree?: AllergenType[];
  maxCalories?: number;
  minProtein?: number;
  maxCarbs?: number;
  maxFat?: number;
  minFiber?: number;
  glycemicIndexMax?: number;
}

/* ─────────────────────── Daily Intake Summary ─────────────────────── */

export interface DailyIntakeSummary {
  date: string;
  totalNutrition: FullNutrition;
  meals: {
    type: MealType;
    entries: MealEntry[];
    subtotal: MacroNutrients;
  }[];
  goalProgress?: {
    kcalPercent: number;
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
    fiberPercent: number;
  };
}

/* ─────────────────────── Nutrient RDA (Reference Daily Allowances) ─── */

export interface NutrientRDA {
  vitA: number; // μg
  vitB1: number; // mg
  vitB2: number; // mg
  vitB3: number; // mg
  vitB5: number; // mg
  vitB6: number; // mg
  vitB7: number; // μg
  vitB9: number; // μg
  vitB12: number; // μg
  vitC: number; // mg
  vitD: number; // μg
  vitE: number; // mg
  vitK: number; // μg
  calcium: number; // mg
  iron: number; // mg
  magnesium: number; // mg
  phosphorus: number; // mg
  potassium: number; // mg
  sodium: number; // mg (max)
  zinc: number; // mg
  copper: number; // mg
  manganese: number; // mg
  selenium: number; // μg
  iodine: number; // μg
}

/** RDA for adult males (19-30) */
export const RDA_MALE: NutrientRDA = {
  vitA: 900, vitB1: 1.2, vitB2: 1.3, vitB3: 16, vitB5: 5,
  vitB6: 1.3, vitB7: 30, vitB9: 400, vitB12: 2.4,
  vitC: 90, vitD: 15, vitE: 15, vitK: 120,
  calcium: 1000, iron: 8, magnesium: 400, phosphorus: 700,
  potassium: 3400, sodium: 2300, zinc: 11, copper: 0.9,
  manganese: 2.3, selenium: 55, iodine: 150,
};

/** RDA for adult females (19-30) */
export const RDA_FEMALE: NutrientRDA = {
  vitA: 700, vitB1: 1.1, vitB2: 1.1, vitB3: 14, vitB5: 5,
  vitB6: 1.3, vitB7: 30, vitB9: 400, vitB12: 2.4,
  vitC: 75, vitD: 15, vitE: 15, vitK: 90,
  calcium: 1000, iron: 18, magnesium: 310, phosphorus: 700,
  potassium: 2600, sodium: 2300, zinc: 8, copper: 0.9,
  manganese: 1.8, selenium: 55, iodine: 150,
};
