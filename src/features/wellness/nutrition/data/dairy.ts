/**
 * Dairy & Eggs Database — Comprehensive nutritional data per 100g
 * Sources: USDA FoodData Central, German BLS 3.02
 */
import type { NutritionFoodItem } from '../types';

export const DAIRY_DATA: NutritionFoodItem[] = [
  {
    id: 'greek_yogurt',
    name: { ar: 'زبادي يوناني', de: 'Griechischer Joghurt' },
    category: 'dairy_eggs',
    subCategory: 'fermented_dairy',
    emoji: '🥛',
    color: '#f7fafc',
    nutrition: {
      kcal: 97, protein: 9.0, carbs: 3.6, fat: 5.0, fiber: 0, sugar: 3.2,
      saturatedFat: 3.5, cholesterol: 13, water: 81.3,
      vitamins: { vitB12: 0.75, vitB2: 0.28, vitB5: 0.33, vitA: 26 },
      minerals: { calcium: 100, phosphorus: 135, potassium: 141, selenium: 9.7, zinc: 0.52, sodium: 36 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Becher' }, grams: 200 },
      { description: { ar: 'نصف كوب', de: 'Halber Becher' }, grams: 100 },
    ],
    tags: ['vegetarian', 'gluten_free', 'high_protein', 'gut_health', 'bone_health', 'muscle_building'],
    allergens: ['dairy'],
    glycemicIndex: 11,
    benefits: {
      ar: ['بروتين مضاعف مقارنة بالزبادي العادي', 'بروبيوتيك لصحة الأمعاء', 'كالسيوم لصحة العظام', 'يشعرك بالشبع طويلاً'],
      de: ['Doppeltes Protein vs. normaler Joghurt', 'Probiotika für Darmgesundheit', 'Kalzium für Knochen', 'Sättigt langanhaltend'],
    },
  },
  {
    id: 'whole_milk',
    name: { ar: 'حليب كامل الدسم', de: 'Vollmilch' },
    category: 'dairy_eggs',
    subCategory: 'milk',
    emoji: '🥛',
    color: '#f7fafc',
    nutrition: {
      kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 5.0,
      saturatedFat: 1.9, cholesterol: 10, water: 88.1,
      vitamins: { vitD: 1.3, vitB12: 0.45, vitB2: 0.18, vitA: 46 },
      minerals: { calcium: 113, phosphorus: 84, potassium: 132, sodium: 43, selenium: 3.7 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Glas' }, grams: 244 },
    ],
    tags: ['vegetarian', 'gluten_free', 'bone_health'],
    allergens: ['dairy'],
    glycemicIndex: 31,
    benefits: {
      ar: ['كالسيوم وفيتامين د لعظام قوية', 'بروتين كازين بطيء الامتصاص', 'مغذي ومشبع', 'يدعم النمو والتعافي'],
      de: ['Kalzium & Vitamin D für starke Knochen', 'Casein-Protein langsam absorbierbar', 'Nährstoffreich & sättigend', 'Unterstützt Wachstum & Regeneration'],
    },
  },

  {
    id: 'cheddar_cheese',
    name: { ar: 'جبنة شيدر', de: 'Cheddar-Käse' },
    category: 'dairy_eggs',
    subCategory: 'cheese',
    emoji: '🧀',
    color: '#f6ad55',
    nutrition: {
      kcal: 403, protein: 24.9, carbs: 1.3, fat: 33.1, fiber: 0,
      saturatedFat: 21.1, cholesterol: 105, water: 36.8,
      vitamins: { vitA: 265, vitB12: 0.83, vitK: 2.8, vitB2: 0.38, vitD: 0.6 },
      minerals: { calcium: 721, phosphorus: 512, sodium: 621, zinc: 3.1, selenium: 13.9 },
    },
    servings: [
      { description: { ar: 'شريحة', de: 'Scheibe' }, grams: 28 },
      { description: { ar: 'كوب مبشور', de: 'Tasse gerieben' }, grams: 113 },
    ],
    tags: ['vegetarian', 'gluten_free', 'high_protein', 'bone_health', 'keto_friendly'],
    allergens: ['dairy'],
    glycemicIndex: 0,
    benefits: {
      ar: ['أعلى مصادر الكالسيوم', 'بروتين وفيتامين أ', 'فيتامين ك2 لصحة العظام والقلب', 'CLA لدعم الأيض'],
      de: ['Höchste Kalziumquelle', 'Protein & Vitamin A', 'Vitamin K2 für Knochen & Herz', 'CLA unterstützt Stoffwechsel'],
    },
  },
  {
    id: 'cottage_cheese',
    name: { ar: 'جبنة قريش', de: 'Hüttenkäse' },
    category: 'dairy_eggs',
    subCategory: 'cheese',
    emoji: '🧀',
    color: '#f7fafc',
    nutrition: {
      kcal: 98, protein: 11.1, carbs: 3.4, fat: 4.3, fiber: 0, sugar: 2.7,
      saturatedFat: 1.7, cholesterol: 17, water: 80.0,
      vitamins: { vitB12: 0.43, vitB2: 0.16, vitB5: 0.22, vitA: 37 },
      minerals: { calcium: 83, phosphorus: 159, selenium: 9.4, sodium: 364, potassium: 104, zinc: 0.4 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Becher' }, grams: 226 },
      { description: { ar: 'نصف كوب', de: 'Halber Becher' }, grams: 113 },
    ],
    tags: ['vegetarian', 'gluten_free', 'high_protein', 'weight_loss', 'muscle_building'],
    allergens: ['dairy'],
    glycemicIndex: 10,
    benefits: {
      ar: ['كازين بطيء الامتصاص (مثالي قبل النوم)', 'بروتين عالي بسعرات منخفضة', 'سيلينيوم مضاد أكسدة', 'يحافظ على العضلات أثناء التنشيف'],
      de: ['Langsames Casein (ideal vor dem Schlaf)', 'Proteinreich bei wenig Kalorien', 'Selen als Antioxidans', 'Erhält Muskeln beim Abnehmen'],
    },
  },
  {
    id: 'feta_cheese',
    name: { ar: 'جبنة فيتا', de: 'Feta-Käse' },
    category: 'dairy_eggs',
    subCategory: 'cheese',
    emoji: '🧀',
    color: '#f7fafc',
    nutrition: {
      kcal: 264, protein: 14.2, carbs: 4.1, fat: 21.3, fiber: 0,
      saturatedFat: 14.9, cholesterol: 89, water: 55.2,
      vitamins: { vitB12: 1.69, vitB2: 0.84, vitA: 125, vitB6: 0.42 },
      minerals: { calcium: 493, phosphorus: 337, sodium: 1116, zinc: 2.9, selenium: 15 },
    },
    servings: [
      { description: { ar: 'قطعة صغيرة', de: 'Kleines Stück' }, grams: 28 },
    ],
    tags: ['vegetarian', 'gluten_free', 'bone_health', 'gut_health'],
    allergens: ['dairy'],
    glycemicIndex: 0,
    benefits: {
      ar: ['كالسيوم وفوسفور لعظام قوية', 'بروبيوتيك من التخمير', 'ب12 عالي', 'أقل لاكتوز من الأجبان الأخرى'],
      de: ['Kalzium & Phosphor für Knochen', 'Probiotika aus Fermentation', 'Hoher B12-Gehalt', 'Weniger Laktose als andere Käse'],
    },
  },
  {
    id: 'labneh',
    name: { ar: 'لبنة', de: 'Labneh' },
    category: 'dairy_eggs',
    subCategory: 'fermented_dairy',
    emoji: '🥛',
    color: '#f7fafc',
    nutrition: {
      kcal: 140, protein: 8.0, carbs: 4.0, fat: 10.0, fiber: 0, sugar: 3.5,
      saturatedFat: 6.5, cholesterol: 30, water: 73.0,
      vitamins: { vitB12: 0.7, vitB2: 0.2, vitA: 80 },
      minerals: { calcium: 180, phosphorus: 150, potassium: 120, sodium: 250 },
    },
    servings: [
      { description: { ar: 'ملعقتان كبيرتان', de: 'Zwei Esslöffel' }, grams: 50 },
      { description: { ar: 'كوب صغير', de: 'Kleiner Becher' }, grams: 100 },
    ],
    tags: ['vegetarian', 'gluten_free', 'gut_health', 'bone_health', 'halal'],
    allergens: ['dairy'],
    glycemicIndex: 8,
    benefits: {
      ar: ['بروبيوتيك مكثف لصحة الأمعاء', 'كالسيوم عالي', 'أسهل هضماً من الحليب', 'تقليد عربي غذائي غني'],
      de: ['Konzentrierte Probiotika', 'Hoher Kalziumgehalt', 'Leichter verdaulich als Milch', 'Traditionelle arabische Spezialität'],
    },
  },
  {
    id: 'mozzarella',
    name: { ar: 'جبنة موزاريلا', de: 'Mozzarella' },
    category: 'dairy_eggs',
    subCategory: 'cheese',
    emoji: '🧀',
    color: '#f7fafc',
    nutrition: {
      kcal: 280, protein: 28.0, carbs: 3.1, fat: 17.1, fiber: 0,
      saturatedFat: 10.9, cholesterol: 54, water: 50.0,
      vitamins: { vitB12: 2.3, vitB2: 0.28, vitA: 179, vitK: 2.3 },
      minerals: { calcium: 505, phosphorus: 354, sodium: 627, zinc: 2.9, selenium: 17 },
    },
    servings: [
      { description: { ar: 'شريحة', de: 'Scheibe' }, grams: 28 },
      { description: { ar: 'كرة طازجة', de: 'Frische Kugel' }, grams: 125 },
    ],
    tags: ['vegetarian', 'gluten_free', 'high_protein', 'bone_health', 'keto_friendly'],
    allergens: ['dairy'],
    glycemicIndex: 0,
    benefits: {
      ar: ['بروتين عالي جداً', 'كالسيوم وفوسفور', 'بيوتين لصحة البشرة', 'أقل صوديوم من أغلب الأجبان'],
      de: ['Sehr proteinreich', 'Kalzium & Phosphor', 'Biotin für Hautgesundheit', 'Weniger Natrium als meiste Käse'],
    },
  },
  {
    id: 'kefir',
    name: { ar: 'كفير', de: 'Kefir' },
    category: 'dairy_eggs',
    subCategory: 'fermented_dairy',
    emoji: '🥛',
    color: '#f7fafc',
    nutrition: {
      kcal: 63, protein: 3.3, carbs: 4.7, fat: 3.5, fiber: 0, sugar: 4.7,
      saturatedFat: 2.0, cholesterol: 13, water: 87.5,
      vitamins: { vitB12: 0.29, vitB2: 0.19, vitK: 1.0, vitD: 1.0 },
      minerals: { calcium: 130, phosphorus: 105, potassium: 164, magnesium: 12 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Glas' }, grams: 243 },
    ],
    tags: ['vegetarian', 'gluten_free', 'gut_health', 'bone_health', 'immune_boost'],
    allergens: ['dairy'],
    glycemicIndex: 15,
    benefits: {
      ar: ['أقوى بروبيوتيك طبيعي (30+ سلالة)', 'يحسن هضم اللاكتوز', 'يقوي المناعة', 'كالسيوم وفيتامين ك لعظام قوية'],
      de: ['Stärkstes natürliches Probiotikum (30+ Stämme)', 'Verbessert Laktoseverdauung', 'Stärkt Immunsystem', 'Kalzium & Vitamin K für Knochen'],
    },
  },
];
