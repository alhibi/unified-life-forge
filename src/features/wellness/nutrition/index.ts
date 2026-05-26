/**
 * Nutrition Module — Public API
 * 
 * This module provides the comprehensive nutrition system including:
 * - 479+ food items with full nutritional profiles (v2: extended with 171+ new items)
 * - Search, filter, and recommendation utilities
 * - Meal logging and tracking
 * - Daily intake analysis
 * - Nutrient comparison tools
 */

// Types
export type {
  NutritionFoodItem, NutritionCategory, DietaryTag, AllergenType,
  FullNutrition, MacroNutrients, VitaminProfile, MineralProfile,
  MealEntry, MealType, DailyNutritionGoal, DailyIntakeSummary,
  MealPlan, MealPlanDay, MealPlanMeal,
  NutritionSearchFilters, ServingSize, NutrientRDA, Lang,
} from './types';

export { RDA_MALE, RDA_FEMALE } from './types';

// Data
export {
  NUTRITION_DATABASE, FOOD_BY_ID, FOODS_BY_CATEGORY,
  CATEGORY_INFO, TOTAL_FOOD_COUNT,
  FRUITS_DATA, VEGETABLES_DATA, PROTEINS_DATA,
  DAIRY_DATA, GRAINS_DATA, LEGUMES_DATA,
  NUTS_SEEDS_DATA, OILS_SPICES_DATA, BEVERAGES_DATA,
  PREPARED_FOODS_DATA,
  // Extended (v2)
  FRUITS_EXTENDED_DATA, VEGETABLES_EXTENDED_DATA, PROTEINS_EXTENDED_DATA,
  DAIRY_EXTENDED_DATA, GRAINS_LEGUMES_EXTENDED_DATA, NUTS_SEEDS_EXTENDED_DATA,
} from './data';

// Utilities
export {
  searchFoods, filterFoods,
  calculateServing, sumNutrition, calculateDailySummary,
  foodsHighInVitamin, foodsHighInMineral,
  bestProteinSources, lowestGIFoods, highestFiberFoods,
  antiInflammatoryFoods, foodsByTag, suggestComplementary,
  compareFoodsOnNutrient, macroRatios, nutrientDensityScore,
  mostNutrientDense,
  getFavorites, toggleFavorite, isFavorite,
  getRecentFoods, addToRecent, getFavoriteFoods, getRecentFoodItems,
  getMealLog, saveMealEntry, removeMealEntry, getMealLogForDate,
  clearMealLog, generateId, todayStr,
} from './utils';
