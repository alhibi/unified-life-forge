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
AllergenType,
DailyIntakeSummary,
DailyNutritionGoal, DietaryTag,   FullNutrition, Lang,
MacroNutrients,   MealEntry,   MealPlan, MealPlanDay, MealPlanMeal,
MealType, MineralProfile,
NutrientRDA, NutritionCategory,   NutritionFoodItem,   NutritionSearchFilters, ServingSize, VitaminProfile, } from './types';
export { RDA_FEMALE,RDA_MALE } from './types';

// Data
export {
BEVERAGES_DATA,
  CATEGORY_INFO,   DAIRY_DATA,   DAIRY_EXTENDED_DATA, FOOD_BY_ID, FOODS_BY_CATEGORY,
  FRUITS_DATA, 
  // Extended (v2)
  FRUITS_EXTENDED_DATA, GRAINS_DATA, GRAINS_LEGUMES_EXTENDED_DATA, LEGUMES_DATA,
  NUTRITION_DATABASE,   NUTS_SEEDS_DATA, NUTS_SEEDS_EXTENDED_DATA,
OILS_SPICES_DATA,   PREPARED_FOODS_DATA,
PROTEINS_DATA,
PROTEINS_EXTENDED_DATA,
TOTAL_FOOD_COUNT,
VEGETABLES_DATA, VEGETABLES_EXTENDED_DATA, } from './data';

// Utilities
export {
addToRecent,   antiInflammatoryFoods,   bestProteinSources, calculateDailySummary,
  calculateServing,   clearMealLog,   compareFoodsOnNutrient, filterFoods,
foodsByTag, foodsHighInMineral,
  foodsHighInVitamin, generateId, getFavoriteFoods,   getFavorites,   getMealLog, getMealLogForDate,
getRecentFoodItems,
  getRecentFoods, highestFiberFoods,
isFavorite,
lowestGIFoods, macroRatios,   mostNutrientDense,
nutrientDensityScore,
removeMealEntry, saveMealEntry,   searchFoods, subscribeNutritionCache,
suggestComplementary,
sumNutrition, todayStr,
toggleFavorite,   useNutritionCache, } from './utils';
