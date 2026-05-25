/**
 * Beverages Database — Comprehensive nutritional data per 100ml/100g
 * Sources: USDA FoodData Central, German BLS 3.02
 */
import type { NutritionFoodItem } from '../types';

export const BEVERAGES_DATA: NutritionFoodItem[] = [
  {
    id: 'green_tea',
    name: { ar: 'شاي أخضر', de: 'Grüner Tee' },
    category: 'beverages',
    subCategory: 'tea',
    emoji: '🍵',
    color: '#68d391',
    nutrition: {
      kcal: 1, protein: 0.2, carbs: 0, fat: 0, fiber: 0,
      water: 99.7,
      vitamins: { vitC: 0.3, vitB2: 0.01 },
      minerals: { potassium: 8, manganese: 0.18, magnesium: 1 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Tasse' }, grams: 237 },
    ],
    tags: ['vegan', 'gluten_free', 'brain_food', 'anti_inflammatory', 'weight_loss', 'heart_healthy'],
    allergens: [],
    glycemicIndex: 0,
    benefits: {
      ar: ['EGCG أقوى مضاد أكسدة في الطبيعة', 'L-ثيانين يحسن التركيز بدون قلق', 'يعزز حرق الدهون', 'يحمي من أمراض القلب والسرطان'],
      de: ['EGCG stärkstes Antioxidans der Natur', 'L-Theanin verbessert Fokus ohne Angst', 'Fördert Fettverbrennung', 'Schützt vor Herzkrankheiten & Krebs'],
    },
  },
  {
    id: 'black_coffee',
    name: { ar: 'قهوة سوداء', de: 'Schwarzer Kaffee' },
    category: 'beverages',
    subCategory: 'coffee',
    emoji: '☕',
    color: '#4a2c2a',
    nutrition: {
      kcal: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0,
      water: 99.4,
      vitamins: { vitB3: 0.19, vitB2: 0.01, vitB5: 0.03 },
      minerals: { potassium: 49, magnesium: 3, manganese: 0.02 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Tasse' }, grams: 237 },
      { description: { ar: 'إسبرسو', de: 'Espresso' }, grams: 30 },
    ],
    tags: ['vegan', 'gluten_free', 'brain_food', 'energy_boost', 'weight_loss'],
    allergens: [],
    glycemicIndex: 0,
    benefits: {
      ar: ['يحسن الأداء البدني والذهني', 'مضادات أكسدة (حمض الكلوروجينيك)', 'يحمي الكبد', 'يعزز حرق الدهون وثرموجينيسيس'],
      de: ['Verbessert physische & mentale Leistung', 'Antioxidantien (Chlorogensäure)', 'Schützt die Leber', 'Fördert Fettverbrennung & Thermogenese'],
    },
  },
  {
    id: 'matcha',
    name: { ar: 'ماتشا', de: 'Matcha' },
    category: 'beverages',
    subCategory: 'tea',
    emoji: '🍵',
    color: '#48bb78',
    nutrition: {
      kcal: 324, protein: 30.6, carbs: 38.9, fat: 5.3, fiber: 38.5,
      vitamins: { vitC: 60, vitA: 10, vitE: 28.1, vitK: 29.6, vitB2: 1.35 },
      minerals: { potassium: 2700, iron: 17, calcium: 420, magnesium: 230, manganese: 6.8, zinc: 6.3 },
    },
    servings: [
      { description: { ar: 'ملعقة صغيرة (لكوب)', de: 'Teelöffel (für Tasse)' }, grams: 2 },
      { description: { ar: 'ملعقتان (قوي)', de: 'Zwei Teelöffel (stark)' }, grams: 4 },
    ],
    tags: ['vegan', 'gluten_free', 'brain_food', 'energy_boost', 'anti_inflammatory', 'weight_loss'],
    allergens: [],
    glycemicIndex: 0,
    benefits: {
      ar: ['EGCG بتركيز 137 ضعف الشاي الأخضر العادي', 'طاقة هادئة ومركزة (L-ثيانين + كافيين)', 'يحرق الدهون بشكل أقوى', 'حماية فائقة من الشوارد الحرة'],
      de: ['137x mehr EGCG als normaler Grüntee', 'Ruhige fokussierte Energie (L-Theanin + Koffein)', 'Stärkere Fettverbrennung', 'Überlegener Schutz vor freien Radikalen'],
    },
  },
  {
    id: 'coconut_water',
    name: { ar: 'ماء جوز هند', de: 'Kokoswasser' },
    category: 'beverages',
    subCategory: 'natural_drinks',
    emoji: '🥥',
    color: '#f7fafc',
    nutrition: {
      kcal: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1, sugar: 2.6,
      water: 95.0,
      vitamins: { vitC: 2.4, vitB6: 0.03, vitB9: 3 },
      minerals: { potassium: 250, sodium: 105, magnesium: 25, calcium: 24, manganese: 0.14, phosphorus: 20 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Glas' }, grams: 240 },
    ],
    tags: ['vegan', 'gluten_free', 'energy_boost', 'muscle_building'],
    allergens: [],
    glycemicIndex: 3,
    benefits: {
      ar: ['إلكتروليتات طبيعية أفضل من المشروبات الرياضية', 'بوتاسيوم يمنع التشنجات', 'ترطيب مثالي بعد التمرين', 'منخفض السعرات'],
      de: ['Natürliche Elektrolyte besser als Sportgetränke', 'Kalium verhindert Krämpfe', 'Ideale Hydratation nach Training', 'Kalorienarm'],
    },
  },
  {
    id: 'pomegranate_juice',
    name: { ar: 'عصير رمان طبيعي', de: 'Natürlicher Granatapfelsaft' },
    category: 'beverages',
    subCategory: 'fruit_juice',
    emoji: '🍷',
    color: '#9b2c2c',
    nutrition: {
      kcal: 54, protein: 0.2, carbs: 13.1, fat: 0.3, fiber: 0.1, sugar: 12.6,
      water: 85.9,
      vitamins: { vitK: 10.4, vitC: 0.1, vitB9: 24 },
      minerals: { potassium: 214, calcium: 11, phosphorus: 11, magnesium: 7, sodium: 9 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Glas' }, grams: 249 },
    ],
    tags: ['vegan', 'gluten_free', 'heart_healthy', 'anti_inflammatory', 'halal'],
    allergens: [],
    glycemicIndex: 53,
    benefits: {
      ar: ['مضادات أكسدة 3 أضعاف الشاي الأخضر', 'يحسن تدفق الدم', 'يخفض ضغط الدم', 'يحسن الذاكرة والتركيز'],
      de: ['3x mehr Antioxidantien als Grüntee', 'Verbessert Blutfluss', 'Senkt Blutdruck', 'Verbessert Gedächtnis & Fokus'],
    },
  },
  {
    id: 'oat_milk',
    name: { ar: 'حليب شوفان', de: 'Hafermilch' },
    category: 'beverages',
    subCategory: 'plant_milk',
    emoji: '🥛',
    color: '#f6e05e',
    nutrition: {
      kcal: 48, protein: 1.0, carbs: 9.3, fat: 1.5, fiber: 0.8, sugar: 4.0,
      water: 88.2,
      vitamins: { vitD: 1.2, vitB12: 0.38, vitB2: 0.17, vitE: 0.5 },
      minerals: { calcium: 120, potassium: 56, phosphorus: 60, sodium: 39 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Glas' }, grams: 240 },
    ],
    tags: ['vegan', 'dairy_free', 'heart_healthy', 'gut_health'],
    allergens: ['gluten'],
    glycemicIndex: 69,
    benefits: {
      ar: ['بيتا جلوكان يخفض الكوليسترول', 'بديل نباتي مدعم بالكالسيوم', 'قوام كريمي مشابه للحليب', 'ألياف تغذي بكتيريا الأمعاء'],
      de: ['Beta-Glucan senkt Cholesterin', 'Pflanzliche Alternative mit Kalzium', 'Cremige Textur wie Milch', 'Ballaststoffe nähren Darmbakterien'],
    },
  },
  {
    id: 'almond_milk',
    name: { ar: 'حليب لوز', de: 'Mandelmilch' },
    category: 'beverages',
    subCategory: 'plant_milk',
    emoji: '🥛',
    color: '#f7fafc',
    nutrition: {
      kcal: 17, protein: 0.6, carbs: 1.5, fat: 1.1, fiber: 0.2, sugar: 0,
      water: 97.0,
      vitamins: { vitE: 6.3, vitD: 1.0, vitB2: 0.07 },
      minerals: { calcium: 184, potassium: 67, magnesium: 7, sodium: 63 },
    },
    servings: [
      { description: { ar: 'كوب', de: 'Glas' }, grams: 240 },
    ],
    tags: ['vegan', 'gluten_free', 'dairy_free', 'low_carb', 'keto_friendly', 'weight_loss'],
    allergens: ['nuts'],
    glycemicIndex: 25,
    benefits: {
      ar: ['أقل حليب نباتي في السعرات', 'فيتامين هـ لصحة البشرة', 'خالي من اللاكتوز والغلوتين', 'مدعم بالكالسيوم'],
      de: ['Kalorienärmste Pflanzenmilch', 'Vitamin E für Hautgesundheit', 'Laktose- & glutenfrei', 'Mit Kalzium angereichert'],
    },
  },
];
