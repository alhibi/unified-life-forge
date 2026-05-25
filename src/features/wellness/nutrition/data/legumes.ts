/**
 * Legumes & Pulses Database — Comprehensive nutritional data per 100g
 * Sources: USDA FoodData Central, German BLS 3.02
 */
import type { NutritionFoodItem } from '../types';

export const LEGUMES_DATA: NutritionFoodItem[] = [
  {
    id: 'lentils_green',
    name: { ar: 'عدس أخضر', de: 'Grüne Linsen' },
    category: 'legumes_pulses',
    subCategory: 'lentils',
    emoji: '🫘',
    color: '#6b8e23',
    nutrition: {
      kcal: 352, protein: 24.6, carbs: 63.4, fat: 1.1, fiber: 10.7, sugar: 2.0,
      water: 8.3,
      vitamins: { vitB9: 479, vitB1: 0.87, vitB6: 0.54, vitB5: 2.14 },
      minerals: { iron: 6.5, potassium: 677, phosphorus: 281, magnesium: 47, zinc: 3.3, manganese: 1.4, copper: 0.75, selenium: 0.1 },
    },
    servings: [
      { description: { ar: 'كوب مطبوخ', de: 'Tasse gekocht' }, grams: 198 },
    ],
    tags: ['vegan', 'gluten_free', 'high_protein', 'high_fiber', 'heart_healthy', 'gut_health', 'halal'],
    allergens: [],
    glycemicIndex: 30,
    benefits: {
      ar: ['أعلى البقوليات في الفولات', 'بروتين نباتي عالي جداً', 'حديد غير هيم وفير', 'ألياف تخفض الكوليسترول'],
      de: ['Höchster Folatgehalt aller Hülsenfrüchte', 'Sehr hohes pflanzliches Protein', 'Reichlich Nicht-Häm-Eisen', 'Ballaststoffe senken Cholesterin'],
    },
  },
  {
    id: 'chickpeas',
    name: { ar: 'حمص', de: 'Kichererbsen' },
    category: 'legumes_pulses',
    subCategory: 'beans',
    emoji: '🫘',
    color: '#d69e2e',
    nutrition: {
      kcal: 364, protein: 19.3, carbs: 60.7, fat: 6.0, fiber: 17.4, sugar: 10.7,
      water: 7.7,
      vitamins: { vitB9: 557, vitB6: 0.54, vitB1: 0.48, vitE: 0.82 },
      minerals: { manganese: 2.2, phosphorus: 366, iron: 6.2, magnesium: 115, zinc: 3.4, potassium: 875, copper: 0.85 },
    },
    servings: [
      { description: { ar: 'كوب مطبوخ', de: 'Tasse gekocht' }, grams: 164 },
    ],
    tags: ['vegan', 'gluten_free', 'high_protein', 'high_fiber', 'gut_health', 'heart_healthy', 'halal'],
    allergens: [],
    glycemicIndex: 28,
    benefits: {
      ar: ['ألياف استثنائية (أعلى البقوليات)', 'بروتين وحديد نباتي', 'فولات لصحة الدم والحمل', 'يحسن حساسية الإنسولين'],
      de: ['Außergewöhnliche Ballaststoffe', 'Pflanzliches Protein & Eisen', 'Folat für Blut & Schwangerschaft', 'Verbessert Insulinsensitivität'],
    },
  },

  {
    id: 'black_beans',
    name: { ar: 'فاصوليا سوداء', de: 'Schwarze Bohnen' },
    category: 'legumes_pulses',
    subCategory: 'beans',
    emoji: '🫘',
    color: '#1a202c',
    nutrition: {
      kcal: 341, protein: 21.6, carbs: 62.4, fat: 1.4, fiber: 15.5, sugar: 2.1,
      water: 11.0,
      vitamins: { vitB9: 444, vitB1: 0.9, vitB6: 0.29, vitK: 3.3 },
      minerals: { iron: 5.0, magnesium: 171, phosphorus: 352, potassium: 1483, zinc: 3.7, manganese: 1.1 },
    },
    servings: [
      { description: { ar: 'كوب مطبوخ', de: 'Tasse gekocht' }, grams: 172 },
    ],
    tags: ['vegan', 'gluten_free', 'high_protein', 'high_fiber', 'heart_healthy', 'brain_food'],
    allergens: [],
    glycemicIndex: 30,
    benefits: {
      ar: ['أنثوسيانين (مثل التوت الأزرق!)', 'بوتاسيوم أعلى من الموز', 'ألياف وبروتين في آن واحد', 'تغذي بكتيريا الأمعاء'],
      de: ['Anthocyane (wie Blaubeeren!)', 'Mehr Kalium als Banane', 'Ballaststoffe & Protein zugleich', 'Nährt Darmbakterien'],
    },
  },
  {
    id: 'fava_beans',
    name: { ar: 'فول مدمس', de: 'Dicke Bohnen (Fava)' },
    category: 'legumes_pulses',
    subCategory: 'beans',
    emoji: '🫘',
    color: '#6b8e23',
    nutrition: {
      kcal: 341, protein: 26.1, carbs: 58.3, fat: 1.5, fiber: 25.0, sugar: 5.7,
      water: 11.0,
      vitamins: { vitB9: 423, vitB1: 0.56, vitB6: 0.37, vitC: 1.4 },
      minerals: { iron: 6.7, magnesium: 192, phosphorus: 421, potassium: 1062, manganese: 1.6, zinc: 3.1, copper: 0.82 },
    },
    servings: [
      { description: { ar: 'كوب مطبوخ', de: 'Tasse gekocht' }, grams: 170 },
      { description: { ar: 'طبق فول', de: 'Portion Ful' }, grams: 200 },
    ],
    tags: ['vegan', 'gluten_free', 'high_protein', 'high_fiber', 'muscle_building', 'energy_boost', 'halal'],
    allergens: [],
    glycemicIndex: 40,
    benefits: {
      ar: ['أعلى البقوليات بالبروتين والألياف', 'L-DOPA طبيعي يحسن المزاج', 'تقليد عربي غذائي أصيل', 'حديد ومغنيسيوم عاليان جداً'],
      de: ['Höchster Protein- & Ballaststoffgehalt', 'Natürliches L-DOPA verbessert Stimmung', 'Arabische Ernährungstradition', 'Sehr hoher Eisen- & Magnesiumgehalt'],
    },
  },
  {
    id: 'hummus',
    name: { ar: 'حمص بطحينة', de: 'Hummus' },
    category: 'legumes_pulses',
    subCategory: 'prepared',
    emoji: '🫕',
    color: '#d69e2e',
    nutrition: {
      kcal: 166, protein: 7.9, carbs: 14.3, fat: 9.6, fiber: 6.0, sugar: 0.3,
      saturatedFat: 1.4, water: 64.9,
      vitamins: { vitB9: 83, vitB6: 0.2, vitE: 0.7, vitK: 3.0 },
      minerals: { iron: 2.4, phosphorus: 176, magnesium: 71, potassium: 228, zinc: 1.8, manganese: 0.77, copper: 0.53 },
    },
    servings: [
      { description: { ar: 'ملعقتان كبيرتان', de: 'Zwei Esslöffel' }, grams: 30 },
      { description: { ar: 'ربع كوب', de: 'Viertel Tasse' }, grams: 62 },
    ],
    tags: ['vegan', 'gluten_free', 'heart_healthy', 'gut_health', 'anti_inflammatory', 'halal'],
    allergens: ['sesame'],
    glycemicIndex: 6,
    benefits: {
      ar: ['مؤشر جلايسيمي منخفض جداً', 'دهون صحية من الطحينة وزيت الزيتون', 'ألياف وبروتين نباتي', 'تراث عربي غذائي رائع'],
      de: ['Sehr niedriger GI', 'Gesunde Fette aus Tahini & Olivenöl', 'Ballaststoffe & pflanzliches Protein', 'Arabische Ernährungstradition'],
    },
  },
  {
    id: 'tofu_firm',
    name: { ar: 'توفو متماسك', de: 'Fester Tofu' },
    category: 'legumes_pulses',
    subCategory: 'soy_products',
    emoji: '🫧',
    color: '#f7fafc',
    nutrition: {
      kcal: 144, protein: 17.3, carbs: 2.8, fat: 8.7, fiber: 2.3,
      saturatedFat: 1.3, water: 69.8,
      vitamins: { vitB9: 29, vitB1: 0.16, vitK: 2.0 },
      minerals: { calcium: 350, iron: 5.4, magnesium: 58, phosphorus: 190, potassium: 237, zinc: 2.0, manganese: 1.2, selenium: 17.4 },
    },
    servings: [
      { description: { ar: 'نصف كتلة', de: 'Halber Block' }, grams: 126 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['vegan', 'gluten_free', 'high_protein', 'bone_health', 'low_carb', 'keto_friendly'],
    allergens: ['soy'],
    glycemicIndex: 15,
    benefits: {
      ar: ['بروتين كامل نباتي', 'كالسيوم عالي (أعلى من الحليب!)', 'إيسوفلافون لصحة القلب', 'منخفض الكربوهيدرات'],
      de: ['Vollständiges pflanzliches Protein', 'Hoher Kalziumgehalt (mehr als Milch!)', 'Isoflavone für Herzgesundheit', 'Low-Carb'],
    },
  },
  {
    id: 'red_lentils',
    name: { ar: 'عدس أحمر', de: 'Rote Linsen' },
    category: 'legumes_pulses',
    subCategory: 'lentils',
    emoji: '🫘',
    color: '#e53e3e',
    nutrition: {
      kcal: 358, protein: 23.9, carbs: 63.1, fat: 1.1, fiber: 7.9, sugar: 1.8,
      water: 10.0,
      vitamins: { vitB9: 430, vitB1: 0.51, vitB6: 0.53, vitB5: 1.8 },
      minerals: { iron: 7.4, potassium: 668, phosphorus: 294, magnesium: 59, zinc: 3.6, copper: 0.66, manganese: 1.1 },
    },
    servings: [
      { description: { ar: 'كوب مطبوخ', de: 'Tasse gekocht' }, grams: 198 },
    ],
    tags: ['vegan', 'gluten_free', 'high_protein', 'high_fiber', 'energy_boost', 'halal'],
    allergens: [],
    glycemicIndex: 26,
    benefits: {
      ar: ['أسرع البقوليات طبخاً', 'حديد نباتي عالي جداً', 'أقل مؤشر جلايسيمي بين العدس', 'بروتين وفولات عاليان'],
      de: ['Schnellste Kochzeit aller Hülsenfrüchte', 'Sehr hoher pflanzlicher Eisengehalt', 'Niedrigster GI unter Linsen', 'Protein & Folat hoch'],
    },
  },
];
