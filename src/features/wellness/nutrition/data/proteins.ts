/**
 * Proteins Database — Meat, Poultry, Fish, Seafood
 * Comprehensive nutritional data per 100g
 * Sources: USDA FoodData Central, German BLS 3.02
 */
import type { NutritionFoodItem } from '../types';

export const PROTEINS_DATA: NutritionFoodItem[] = [
  {
    id: 'chicken_breast',
    name: { ar: 'صدر دجاج (بدون جلد)', de: 'Hähnchenbrust (ohne Haut)' },
    category: 'meat_poultry',
    subCategory: 'poultry',
    emoji: '🍗',
    color: '#fbd38d',
    nutrition: {
      kcal: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, sugar: 0,
      saturatedFat: 1.0, cholesterol: 85, water: 65.3,
      vitamins: { vitB3: 13.7, vitB6: 0.6, vitB5: 0.96, vitB12: 0.34 },
      minerals: { phosphorus: 228, selenium: 27.6, potassium: 256, sodium: 74, zinc: 1.0, magnesium: 29, iron: 1.0 },
    },
    servings: [
      { description: { ar: 'صدر متوسط', de: 'Mittlere Brust' }, grams: 172 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building', 'weight_loss'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أفضل مصدر بروتين خالص', 'منخفض الدهون جداً', 'غني بالنياسين (ب3) للطاقة', 'سيلينيوم لحماية الخلايا'],
      de: ['Beste reine Proteinquelle', 'Sehr fettarm', 'Reich an Niacin (B3) für Energie', 'Selen schützt Zellen'],
    },
  },

  {
    id: 'salmon_atlantic',
    name: { ar: 'سلمون أطلسي', de: 'Atlantischer Lachs' },
    category: 'fish_seafood',
    subCategory: 'fatty_fish',
    emoji: '🐟',
    color: '#fc8181',
    nutrition: {
      kcal: 208, protein: 20.4, carbs: 0, fat: 13.4, fiber: 0,
      saturatedFat: 3.1, monoFat: 3.8, polyFat: 5.3, cholesterol: 55, water: 64.9,
      vitamins: { vitD: 11.0, vitB12: 3.2, vitB3: 8.0, vitB6: 0.64, vitB5: 1.6, vitE: 3.55 },
      minerals: { selenium: 36.5, phosphorus: 240, potassium: 363, magnesium: 27, sodium: 59, zinc: 0.64 },
    },
    servings: [
      { description: { ar: 'فيليه متوسط', de: 'Mittleres Filet' }, grams: 178 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'heart_healthy', 'brain_food', 'anti_inflammatory'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أغنى مصدر لأوميغا 3 (EPA + DHA)', 'فيتامين د طبيعي', 'يحمي القلب والدماغ', 'يقلل الالتهابات المزمنة'],
      de: ['Reichste Omega-3-Quelle (EPA + DHA)', 'Natürliches Vitamin D', 'Schützt Herz & Gehirn', 'Reduziert chronische Entzündungen'],
    },
  },
  {
    id: 'beef_lean',
    name: { ar: 'لحم بقر هبر', de: 'Mageres Rindfleisch' },
    category: 'meat_poultry',
    subCategory: 'red_meat',
    emoji: '🥩',
    color: '#c53030',
    nutrition: {
      kcal: 250, protein: 26.1, carbs: 0, fat: 15.4, fiber: 0,
      saturatedFat: 6.2, cholesterol: 80, water: 57.3,
      vitamins: { vitB12: 2.6, vitB3: 5.4, vitB6: 0.37, vitB5: 0.65, vitB2: 0.18 },
      minerals: { zinc: 6.3, iron: 2.6, phosphorus: 198, selenium: 24.9, potassium: 318, magnesium: 21 },
    },
    servings: [
      { description: { ar: 'شريحة متوسطة', de: 'Mittleres Steak' }, grams: 150 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أفضل مصدر للحديد الهيم (يمتص بسهولة)', 'زنك عالي لمناعة قوية', 'فيتامين ب12 لصحة الأعصاب', 'كرياتين طبيعي للعضلات'],
      de: ['Beste Häm-Eisen-Quelle (leicht absorbierbar)', 'Hoher Zinkgehalt für Immunsystem', 'Vitamin B12 für Nerven', 'Natürliches Kreatin für Muskeln'],
    },
  },
  {
    id: 'lamb_leg',
    name: { ar: 'لحم خروف (فخذ)', de: 'Lammkeule' },
    category: 'meat_poultry',
    subCategory: 'red_meat',
    emoji: '🥩',
    color: '#9b2c2c',
    nutrition: {
      kcal: 258, protein: 25.5, carbs: 0, fat: 16.5, fiber: 0,
      saturatedFat: 7.0, cholesterol: 97, water: 56.7,
      vitamins: { vitB12: 2.4, vitB3: 6.6, vitB6: 0.13, vitB2: 0.25, vitB5: 0.65 },
      minerals: { zinc: 4.7, iron: 1.9, phosphorus: 188, selenium: 26.4, potassium: 310, sodium: 65 },
    },
    servings: [
      { description: { ar: 'قطعة متوسطة', de: 'Mittleres Stück' }, grams: 120 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['غني بالحديد والزنك', 'بروتين كامل عالي الجودة', 'CLA (حمض اللينوليك المرتبط) يدعم الأيض', 'ب12 لصحة الدم'],
      de: ['Reich an Eisen & Zink', 'Hochwertiges Protein', 'CLA unterstützt Stoffwechsel', 'B12 für Blutgesundheit'],
    },
  },
  {
    id: 'turkey_breast',
    name: { ar: 'صدر ديك رومي', de: 'Putenbrust' },
    category: 'meat_poultry',
    subCategory: 'poultry',
    emoji: '🦃',
    color: '#f6e05e',
    nutrition: {
      kcal: 135, protein: 30.0, carbs: 0, fat: 1.0, fiber: 0,
      saturatedFat: 0.3, cholesterol: 83, water: 68.8,
      vitamins: { vitB3: 11.8, vitB6: 0.81, vitB12: 0.42, vitB5: 0.9 },
      minerals: { selenium: 30.2, phosphorus: 230, potassium: 293, zinc: 2.0, magnesium: 27 },
    },
    servings: [
      { description: { ar: 'شريحة سميكة', de: 'Dicke Scheibe' }, grams: 100 },
      { description: { ar: 'صدر كامل', de: 'Ganze Brust' }, grams: 300 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'weight_loss', 'muscle_building'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أقل اللحوم دهوناً', 'بروتين أعلى من الدجاج', 'تريبتوفان يحسن النوم والمزاج', 'سيلينيوم عالي'],
      de: ['Fettärmstes Fleisch', 'Mehr Protein als Hähnchen', 'Tryptophan verbessert Schlaf & Stimmung', 'Hoher Selengehalt'],
    },
  },
  {
    id: 'tuna_fresh',
    name: { ar: 'تونة طازجة', de: 'Frischer Thunfisch' },
    category: 'fish_seafood',
    subCategory: 'fatty_fish',
    emoji: '🐟',
    color: '#4299e1',
    nutrition: {
      kcal: 144, protein: 23.3, carbs: 0, fat: 4.9, fiber: 0,
      saturatedFat: 1.3, cholesterol: 38, water: 71.0,
      vitamins: { vitB12: 9.4, vitD: 7.2, vitB3: 18.5, vitB6: 0.46, vitA: 18 },
      minerals: { selenium: 36.5, phosphorus: 254, potassium: 252, magnesium: 50, iron: 1.0, zinc: 0.6 },
    },
    servings: [
      { description: { ar: 'شريحة متوسطة', de: 'Mittleres Steak' }, grams: 154 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'brain_food', 'heart_healthy'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أعلى مصدر لفيتامين ب12', 'أوميغا 3 لصحة القلب والدماغ', 'بروتين عالي جداً', 'نياسين يدعم إنتاج الطاقة'],
      de: ['Höchste B12-Quelle', 'Omega-3 für Herz & Gehirn', 'Sehr proteinreich', 'Niacin für Energieproduktion'],
    },
  },
  {
    id: 'shrimp',
    name: { ar: 'روبيان (جمبري)', de: 'Garnelen' },
    category: 'fish_seafood',
    subCategory: 'shellfish',
    emoji: '🦐',
    color: '#fc8181',
    nutrition: {
      kcal: 99, protein: 24.0, carbs: 0.2, fat: 0.3, fiber: 0,
      saturatedFat: 0.1, cholesterol: 189, water: 75.9,
      vitamins: { vitB12: 1.1, vitB3: 2.6, vitD: 0.6, vitE: 1.32 },
      minerals: { selenium: 38.0, phosphorus: 201, iodine: 35, zinc: 1.6, sodium: 111, potassium: 259, iron: 2.4, copper: 0.26 },
    },
    servings: [
      { description: { ar: '10 حبات كبيرة', de: '10 große Stück' }, grams: 100 },
      { description: { ar: 'كوب', de: 'Tasse' }, grams: 145 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'weight_loss'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين عالي جداً بسعرات منخفضة', 'أعلى مصدر للسيلينيوم', 'غني باليود لصحة الغدة الدرقية', 'أستازانتين مضاد أكسدة قوي'],
      de: ['Sehr proteinreich bei wenig Kalorien', 'Höchste Selenquelle', 'Jodreich für Schilddrüse', 'Astaxanthin als Antioxidans'],
    },
  },

  {
    id: 'eggs_whole',
    name: { ar: 'بيض كامل', de: 'Ganzes Ei' },
    category: 'dairy_eggs',
    subCategory: 'eggs',
    emoji: '🥚',
    color: '#fbd38d',
    nutrition: {
      kcal: 155, protein: 12.6, carbs: 1.1, fat: 10.6, fiber: 0,
      saturatedFat: 3.3, cholesterol: 373, water: 75.8,
      vitamins: { vitB12: 0.89, vitD: 2.0, vitA: 160, vitB2: 0.46, vitB5: 1.53, vitB7: 25, vitK: 0.3 },
      minerals: { selenium: 30.7, phosphorus: 198, iron: 1.75, zinc: 1.29, calcium: 56, sodium: 124, potassium: 126 },
    },
    servings: [
      { description: { ar: 'بيضة واحدة', de: 'Ein Ei' }, grams: 50 },
      { description: { ar: 'بيضتان', de: 'Zwei Eier' }, grams: 100 },
    ],
    tags: ['vegetarian', 'gluten_free', 'high_protein', 'brain_food', 'muscle_building'],
    allergens: ['eggs'],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين كامل بأعلى قيمة بيولوجية', 'كولين لصحة الدماغ', 'لوتين وزياكسانثين للعين', 'فيتامين د طبيعي'],
      de: ['Vollwertiges Protein (höchster biol. Wert)', 'Cholin für Gehirn', 'Lutein & Zeaxanthin für Augen', 'Natürliches Vitamin D'],
    },
  },
  {
    id: 'sardines_canned',
    name: { ar: 'سردين معلب', de: 'Sardinen (Dose)' },
    category: 'fish_seafood',
    subCategory: 'oily_fish',
    emoji: '🐟',
    color: '#4a5568',
    nutrition: {
      kcal: 208, protein: 24.6, carbs: 0, fat: 11.5, fiber: 0,
      saturatedFat: 1.5, cholesterol: 142, water: 59.6,
      vitamins: { vitB12: 8.9, vitD: 4.8, vitB3: 5.2, vitB2: 0.23 },
      minerals: { calcium: 382, selenium: 52.7, phosphorus: 490, iron: 2.9, sodium: 307, potassium: 397, zinc: 1.3 },
    },
    servings: [
      { description: { ar: 'علبة صغيرة', de: 'Kleine Dose' }, grams: 92 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'bone_health', 'heart_healthy', 'brain_food'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['كالسيوم أعلى من الحليب (بسبب العظام)', 'أوميغا 3 وفيتامين د', 'مستدام بيئياً', 'ب12 عالي جداً'],
      de: ['Mehr Kalzium als Milch (wegen Gräten)', 'Omega-3 & Vitamin D', 'Ökologisch nachhaltig', 'Sehr hoher B12-Gehalt'],
    },
  },
  {
    id: 'liver_beef',
    name: { ar: 'كبد بقر', de: 'Rinderleber' },
    category: 'meat_poultry',
    subCategory: 'organ_meats',
    emoji: '🫀',
    color: '#9b2c2c',
    nutrition: {
      kcal: 135, protein: 20.4, carbs: 3.9, fat: 3.6, fiber: 0,
      saturatedFat: 1.2, cholesterol: 275, water: 70.8,
      vitamins: { vitA: 9442, vitB12: 59.3, vitB9: 290, vitB2: 2.76, vitB3: 13.2, vitB5: 7.17, vitC: 1.3 },
      minerals: { iron: 6.5, copper: 9.76, selenium: 39.7, zinc: 4.0, phosphorus: 387, potassium: 313 },
    },
    servings: [
      { description: { ar: 'قطعة (85غ)', de: 'Stück (85g)' }, grams: 85 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'immune_boost', 'energy_boost'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أغنى طعام بفيتامين أ وب12 على الإطلاق', 'حديد هيم عالي الامتصاص', 'نحاس لصحة الدم والأعصاب', 'فولات طبيعي عالي'],
      de: ['Nährstoffdichtestes Lebensmittel (A & B12)', 'Häm-Eisen hoch absorbierbar', 'Kupfer für Blut & Nerven', 'Hoher natürlicher Folatgehalt'],
    },
  },
  {
    id: 'chicken_thigh',
    name: { ar: 'فخذ دجاج (بدون جلد)', de: 'Hähnchenkeule (ohne Haut)' },
    category: 'meat_poultry',
    subCategory: 'poultry',
    emoji: '🍗',
    color: '#f6ad55',
    nutrition: {
      kcal: 209, protein: 26.0, carbs: 0, fat: 10.9, fiber: 0,
      saturatedFat: 3.0, cholesterol: 105, water: 62.3,
      vitamins: { vitB3: 6.5, vitB6: 0.3, vitB12: 0.44, vitB5: 1.3, vitB2: 0.19 },
      minerals: { phosphorus: 178, selenium: 22.1, potassium: 222, zinc: 2.4, iron: 1.3 },
    },
    servings: [
      { description: { ar: 'فخذ متوسط', de: 'Mittlere Keule' }, grams: 116 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين عالي مع دهون صحية أكثر', 'طعم أغنى من الصدر', 'حديد أعلى من صدر الدجاج', 'زنك لدعم المناعة'],
      de: ['Protein mit mehr gesunden Fetten', 'Reicherer Geschmack als Brust', 'Mehr Eisen als Hähnchenbrust', 'Zink für Immunsystem'],
    },
  },
  {
    id: 'mackerel',
    name: { ar: 'ماكريل (سقمري)', de: 'Makrele' },
    category: 'fish_seafood',
    subCategory: 'fatty_fish',
    emoji: '🐟',
    color: '#2b6cb0',
    nutrition: {
      kcal: 205, protein: 18.6, carbs: 0, fat: 13.9, fiber: 0,
      saturatedFat: 3.3, polyFat: 3.4, cholesterol: 70, water: 63.6,
      vitamins: { vitB12: 8.7, vitD: 16.1, vitB3: 9.1, vitB6: 0.4, vitE: 1.5 },
      minerals: { selenium: 44.1, phosphorus: 217, potassium: 314, magnesium: 76, sodium: 90, iron: 1.6 },
    },
    servings: [
      { description: { ar: 'فيليه', de: 'Filet' }, grams: 112 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'heart_healthy', 'brain_food', 'bone_health'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أعلى سمك في فيتامين د', 'أوميغا 3 بنسبة عالية جداً', 'سيلينيوم لحماية الخلايا', 'مغنيسيوم عالي'],
      de: ['Höchster Vitamin-D-Gehalt aller Fische', 'Sehr hoher Omega-3-Gehalt', 'Selen schützt Zellen', 'Hoher Magnesiumgehalt'],
    },
  },
  {
    id: 'ground_beef_93',
    name: { ar: 'لحم مفروم (93% خالي دهن)', de: 'Rinderhack (93% mager)' },
    category: 'meat_poultry',
    subCategory: 'red_meat',
    emoji: '🥩',
    color: '#c53030',
    nutrition: {
      kcal: 152, protein: 21.4, carbs: 0, fat: 7.0, fiber: 0,
      saturatedFat: 2.9, cholesterol: 65, water: 70.5,
      vitamins: { vitB12: 2.2, vitB3: 5.1, vitB6: 0.35, vitB5: 0.6 },
      minerals: { zinc: 5.3, iron: 2.2, phosphorus: 185, selenium: 17.5, potassium: 305 },
    },
    servings: [
      { description: { ar: 'قطعة برغر', de: 'Burger-Patty' }, grams: 113 },
      { description: { ar: '100 غرام مطبوخ', de: '100g gekocht' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين عالي مع دهون معتدلة', 'حديد هيم سهل الامتصاص', 'زنك لصحة المناعة والهرمونات', 'ب12 للطاقة'],
      de: ['Protein hoch bei moderatem Fett', 'Häm-Eisen leicht absorbierbar', 'Zink für Immunsystem & Hormone', 'B12 für Energie'],
    },
  },
  {
    id: 'cod_fish',
    name: { ar: 'سمك القد', de: 'Kabeljau' },
    category: 'fish_seafood',
    subCategory: 'white_fish',
    emoji: '🐟',
    color: '#e2e8f0',
    nutrition: {
      kcal: 82, protein: 17.8, carbs: 0, fat: 0.7, fiber: 0,
      saturatedFat: 0.1, cholesterol: 43, water: 81.2,
      vitamins: { vitB12: 0.91, vitB3: 2.1, vitB6: 0.25, vitD: 1.0 },
      minerals: { selenium: 33.1, phosphorus: 203, potassium: 413, iodine: 170, sodium: 54, magnesium: 32 },
    },
    servings: [
      { description: { ar: 'فيليه', de: 'Filet' }, grams: 180 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'weight_loss'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين عالي بأقل دهون', 'أغنى مصدر لليود', 'مثالي لأنظمة فقدان الوزن', 'سيلينيوم وفوسفور عاليان'],
      de: ['Proteinreich bei minimalem Fett', 'Reichste Jodquelle', 'Ideal für Gewichtsverlust', 'Selen & Phosphor hoch'],
    },
  },
  {
    id: 'duck_breast',
    name: { ar: 'صدر بط', de: 'Entenbrust' },
    category: 'meat_poultry',
    subCategory: 'poultry',
    emoji: '🦆',
    color: '#9b2c2c',
    nutrition: {
      kcal: 201, protein: 23.5, carbs: 0, fat: 11.2, fiber: 0,
      saturatedFat: 4.2, cholesterol: 77, water: 63.9,
      vitamins: { vitB3: 5.3, vitB12: 0.4, vitB5: 1.6, vitB6: 0.26, vitB1: 0.17 },
      minerals: { iron: 5.3, selenium: 22, phosphorus: 203, zinc: 2.7, potassium: 271 },
    },
    servings: [
      { description: { ar: 'نصف صدر', de: 'Halbe Brust' }, grams: 140 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['حديد عالي (أكثر من لحم البقر!)', 'بروتين ممتاز', 'طعم غني ومميز', 'فيتامينات ب المتعددة'],
      de: ['Hoher Eisengehalt (mehr als Rind!)', 'Exzellentes Protein', 'Reicher Geschmack', 'Multiple B-Vitamine'],
    },
  },


  {
    id: 'venison',
    name: { ar: 'لحم غزال', de: 'Hirschfleisch' },
    category: 'meat_poultry',
    subCategory: 'game',
    emoji: '🦌',
    color: '#7b341e',
    nutrition: {
      kcal: 158, protein: 30.2, carbs: 0, fat: 3.2, fiber: 0,
      saturatedFat: 1.2, cholesterol: 85, water: 65.0,
      vitamins: { vitB12: 6.3, vitB3: 7.6, vitB6: 0.4, vitB2: 0.48, vitB5: 0.8 },
      minerals: { iron: 3.4, zinc: 4.6, selenium: 10.3, phosphorus: 226, potassium: 318, magnesium: 23, sodium: 54 },
    },
    servings: [
      { description: { ar: 'شريحة متوسطة', de: 'Mittleres Steak' }, grams: 120 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'muscle_building', 'low_carb', 'keto_friendly', 'weight_loss'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين عالي جداً مع دهون قليلة', 'غني بفيتامين ب12 لصحة الأعصاب', 'حديد وزنك لمناعة قوية', 'مثالي لبناء العضلات'],
      de: ['Sehr hoher Proteingehalt bei wenig Fett', 'Reich an Vitamin B12 für Nervengesundheit', 'Eisen und Zink für starke Immunität', 'Ideal für Muskelaufbau'],
    },
  },


  {
    id: 'bison',
    name: { ar: 'لحم بيسون', de: 'Bisonfleisch' },
    category: 'meat_poultry',
    subCategory: 'game',
    emoji: '🦬',
    color: '#6b3a2a',
    nutrition: {
      kcal: 143, protein: 28.4, carbs: 0, fat: 2.4, fiber: 0,
      saturatedFat: 0.9, cholesterol: 82, water: 67.5,
      vitamins: { vitB12: 2.9, vitB3: 6.1, vitB6: 0.5, vitB2: 0.26, vitB5: 0.6 },
      minerals: { iron: 3.4, zinc: 4.6, selenium: 32.0, phosphorus: 213, potassium: 353, magnesium: 25, sodium: 57 },
    },
    servings: [
      { description: { ar: 'شريحة متوسطة', de: 'Mittleres Steak' }, grams: 120 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'muscle_building', 'low_carb', 'keto_friendly', 'weight_loss', 'heart_healthy'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أقل دهوناً من لحم البقر بكثير', 'غني بالسيلينيوم المضاد للأكسدة', 'بروتين ممتاز لبناء العضلات', 'حديد عالي لمحاربة فقر الدم'],
      de: ['Viel fettärmer als Rindfleisch', 'Reich an Selen als Antioxidans', 'Exzellentes Protein für Muskelaufbau', 'Hoher Eisengehalt gegen Anämie'],
    },
  },


  {
    id: 'rabbit',
    name: { ar: 'لحم أرنب', de: 'Kaninchenfleisch' },
    category: 'meat_poultry',
    subCategory: 'game',
    emoji: '🐇',
    color: '#a0522d',
    nutrition: {
      kcal: 197, protein: 29.1, carbs: 0, fat: 8.0, fiber: 0,
      saturatedFat: 2.4, cholesterol: 82, water: 61.5,
      vitamins: { vitB12: 7.2, vitB3: 7.3, vitB6: 0.5, vitB2: 0.14, vitB5: 0.8 },
      minerals: { iron: 1.6, zinc: 2.0, selenium: 15.2, phosphorus: 240, potassium: 330, magnesium: 29, sodium: 45 },
    },
    servings: [
      { description: { ar: 'قطعة متوسطة', de: 'Mittleres Stück' }, grams: 130 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building', 'low_carb', 'keto_friendly'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['غني جداً بفيتامين ب12', 'بروتين عالي الجودة', 'نسبة دهون معتدلة', 'مصدر ممتاز للنياسين'],
      de: ['Sehr reich an Vitamin B12', 'Hochwertiges Protein', 'Moderater Fettgehalt', 'Exzellente Niacin-Quelle'],
    },
  },


  {
    id: 'goat',
    name: { ar: 'لحم ماعز', de: 'Ziegenfleisch' },
    category: 'meat_poultry',
    subCategory: 'red_meat',
    emoji: '🐐',
    color: '#8b4513',
    nutrition: {
      kcal: 143, protein: 27.1, carbs: 0, fat: 3.0, fiber: 0,
      saturatedFat: 0.9, cholesterol: 75, water: 68.2,
      vitamins: { vitB12: 1.1, vitB3: 3.8, vitB6: 0.4, vitB2: 0.49, vitB5: 0.5 },
      minerals: { iron: 3.7, zinc: 5.3, selenium: 8.8, phosphorus: 180, potassium: 385, magnesium: 20, sodium: 82 },
    },
    servings: [
      { description: { ar: 'قطعة متوسطة', de: 'Mittleres Stück' }, grams: 120 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building', 'low_carb', 'keto_friendly', 'weight_loss'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['دهون أقل من لحم البقر والخروف', 'زنك عالي لتعزيز المناعة', 'حديد هيم سهل الامتصاص', 'بوتاسيوم لصحة القلب'],
      de: ['Weniger Fett als Rind und Lamm', 'Hoher Zinkgehalt für Immunsystem', 'Leicht absorbierbares Häm-Eisen', 'Kalium für Herzgesundheit'],
    },
  },


  {
    id: 'quail',
    name: { ar: 'لحم سمان', de: 'Wachtelfleisch' },
    category: 'meat_poultry',
    subCategory: 'poultry',
    emoji: '🐦',
    color: '#d4a574',
    nutrition: {
      kcal: 134, protein: 21.8, carbs: 0, fat: 4.5, fiber: 0,
      saturatedFat: 1.3, cholesterol: 70, water: 72.4,
      vitamins: { vitB12: 0.5, vitB3: 8.0, vitB6: 0.6, vitB2: 0.26, vitB5: 0.9 },
      minerals: { selenium: 17.4, iron: 4.5, zinc: 2.7, phosphorus: 307, potassium: 216, magnesium: 25, sodium: 51 },
    },
    servings: [
      { description: { ar: 'سمانة كاملة', de: 'Ganze Wachtel' }, grams: 110 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'immune_boost', 'energy_boost'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['حديد عالي لمحاربة فقر الدم', 'سيلينيوم لحماية الخلايا', 'بروتين خفيف سهل الهضم', 'فسفور عالي لصحة العظام'],
      de: ['Hoher Eisengehalt gegen Anämie', 'Selen zum Zellschutz', 'Leichtes, gut verdauliches Protein', 'Hoher Phosphorgehalt für Knochen'],
    },
  },


  {
    id: 'ostrich',
    name: { ar: 'لحم نعام', de: 'Straußenfleisch' },
    category: 'meat_poultry',
    subCategory: 'poultry',
    emoji: '🦃',
    color: '#b83280',
    nutrition: {
      kcal: 145, protein: 26.9, carbs: 0, fat: 3.0, fiber: 0,
      saturatedFat: 1.0, cholesterol: 83, water: 68.5,
      vitamins: { vitB12: 5.5, vitB3: 5.0, vitB6: 0.5, vitB2: 0.32, vitB5: 1.0 },
      minerals: { iron: 3.2, zinc: 4.2, selenium: 32.8, phosphorus: 210, potassium: 315, magnesium: 22, sodium: 63 },
    },
    servings: [
      { description: { ar: 'شريحة متوسطة', de: 'Mittleres Steak' }, grams: 130 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'muscle_building', 'low_carb', 'keto_friendly', 'weight_loss', 'heart_healthy'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['لحم أحمر قليل الدهون جداً', 'غني بفيتامين ب12 والحديد', 'سيلينيوم عالي للمناعة', 'بديل صحي للحوم الحمراء التقليدية'],
      de: ['Sehr fettarmes rotes Fleisch', 'Reich an Vitamin B12 und Eisen', 'Hoher Selengehalt für Immunsystem', 'Gesunde Alternative zu klassischem Rotfleisch'],
    },
  },


  {
    id: 'chicken_liver',
    name: { ar: 'كبد دجاج', de: 'Hühnerleber' },
    category: 'meat_poultry',
    subCategory: 'organ_meats',
    emoji: '🫀',
    color: '#742a2a',
    nutrition: {
      kcal: 119, protein: 16.9, carbs: 0.7, fat: 4.8, fiber: 0,
      saturatedFat: 1.6, cholesterol: 345, water: 76.5,
      vitamins: { vitA: 3296, vitB12: 16.6, vitB3: 9.7, vitB6: 0.85, vitB2: 1.78, vitB5: 6.2, vitB9: 560 },
      minerals: { iron: 9.0, selenium: 54.6, zinc: 2.7, phosphorus: 297, potassium: 230, magnesium: 19, sodium: 71, copper: 0.49 },
    },
    servings: [
      { description: { ar: 'حصة (4 قطع)', de: 'Portion (4 Stück)' }, grams: 120 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'energy_boost', 'immune_boost'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أغنى مصدر لفيتامين أ الطبيعي', 'ب12 عالي جداً لصحة الأعصاب', 'حديد هيم ممتاز لفقر الدم', 'حمض الفوليك لصحة الدم'],
      de: ['Reichste natürliche Vitamin-A-Quelle', 'Sehr hoher B12-Gehalt für Nerven', 'Exzellentes Häm-Eisen gegen Anämie', 'Folsäure für Blutgesundheit'],
    },
  },


  {
    id: 'lamb_kidney',
    name: { ar: 'كلاوي خروف', de: 'Lammniere' },
    category: 'meat_poultry',
    subCategory: 'organ_meats',
    emoji: '🫘',
    color: '#5a1a1a',
    nutrition: {
      kcal: 97, protein: 15.7, carbs: 0.8, fat: 3.1, fiber: 0,
      saturatedFat: 1.0, cholesterol: 337, water: 79.2,
      vitamins: { vitB12: 52.4, vitB3: 7.4, vitB6: 0.23, vitB2: 2.0, vitB5: 3.3, vitA: 95 },
      minerals: { selenium: 126, iron: 6.2, zinc: 2.5, phosphorus: 246, potassium: 277, magnesium: 17, sodium: 156, copper: 0.42 },
    },
    servings: [
      { description: { ar: 'كلية واحدة', de: 'Eine Niere' }, grams: 80 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'immune_boost', 'energy_boost', 'low_carb'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أعلى مصدر لفيتامين ب12 على الإطلاق', 'سيلينيوم استثنائي لحماية الخلايا', 'حديد عالي لمحاربة الأنيميا', 'منخفض السعرات مع بروتين عالي'],
      de: ['Höchste Vitamin-B12-Quelle überhaupt', 'Außergewöhnliches Selen zum Zellschutz', 'Hoher Eisengehalt gegen Anämie', 'Kalorienarm mit hohem Proteingehalt'],
    },
  },


  {
    id: 'bone_marrow',
    name: { ar: 'نخاع العظم', de: 'Knochenmark' },
    category: 'meat_poultry',
    subCategory: 'organ_meats',
    emoji: '🦴',
    color: '#fffdd0',
    nutrition: {
      kcal: 786, protein: 6.7, carbs: 0, fat: 84.0, fiber: 0,
      saturatedFat: 40.0, cholesterol: 75, water: 8.0,
      vitamins: { vitB12: 2.6, vitA: 60, vitE: 2.0, vitB3: 1.5, vitB6: 0.1 },
      minerals: { iron: 0.4, phosphorus: 6, potassium: 5, sodium: 10, calcium: 7, magnesium: 2, zinc: 0.1 },
    },
    servings: [
      { description: { ar: 'ملعقة كبيرة', de: 'Esslöffel' }, grams: 14 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'keto_friendly', 'energy_boost'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['غني بالكولاجين لصحة المفاصل', 'دهون صحية وأحماض دهنية', 'يدعم صحة العظام والنخاع', 'مصدر طبيعي لفيتامين ب12'],
      de: ['Reich an Kollagen für Gelenkgesundheit', 'Gesunde Fette und Fettsäuren', 'Unterstützt Knochen- und Markgesundheit', 'Natürliche Vitamin-B12-Quelle'],
    },
  },


  {
    id: 'heart_beef',
    name: { ar: 'قلب بقر', de: 'Rinderherz' },
    category: 'meat_poultry',
    subCategory: 'organ_meats',
    emoji: '❤️',
    color: '#8b0000',
    nutrition: {
      kcal: 112, protein: 17.7, carbs: 0.1, fat: 3.9, fiber: 0,
      saturatedFat: 1.1, cholesterol: 124, water: 77.1,
      vitamins: { vitB12: 8.6, vitB2: 0.9, vitB3: 7.4, vitB6: 0.3, vitB5: 1.8, vitB1: 0.24 },
      minerals: { iron: 4.3, zinc: 1.7, selenium: 21.8, phosphorus: 212, potassium: 287, magnesium: 21, sodium: 98, copper: 0.4 },
    },
    servings: [
      { description: { ar: 'شريحة متوسطة', de: 'Mittlere Scheibe' }, grams: 100 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['halal', 'gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'keto_friendly', 'energy_boost', 'heart_healthy'],
    allergens: [],
    glycemicIndex: null,
    benefits: {
      ar: ['أغنى مصدر طبيعي لـ CoQ10', 'ب12 عالي لصحة الأعصاب', 'حديد هيم لمحاربة التعب', 'بروتين عالي وسعرات منخفضة'],
      de: ['Reichste natürliche CoQ10-Quelle', 'Hoher B12-Gehalt für Nervengesundheit', 'Häm-Eisen gegen Müdigkeit', 'Hoher Protein- bei niedrigem Kaloriengehalt'],
    },
  },


  {
    id: 'oysters',
    name: { ar: 'محار', de: 'Austern' },
    category: 'fish_seafood',
    subCategory: 'shellfish',
    emoji: '🦪',
    color: '#90cdf4',
    nutrition: {
      kcal: 68, protein: 7.0, carbs: 3.9, fat: 2.5, fiber: 0,
      saturatedFat: 0.6, cholesterol: 40, water: 85.2,
      vitamins: { vitB12: 16.0, vitD: 8.0, vitB3: 1.5, vitB2: 0.23, vitE: 0.85 },
      minerals: { zinc: 16.6, iron: 5.1, copper: 4.5, selenium: 63.7, phosphorus: 135, potassium: 168, magnesium: 47, sodium: 106, manganese: 0.4 },
    },
    servings: [
      { description: { ar: '6 حبات متوسطة', de: '6 mittlere Stück' }, grams: 84 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'immune_boost', 'brain_food', 'heart_healthy', 'low_carb'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أعلى مصدر غذائي للزنك', 'ب12 عالي جداً لصحة الدم', 'نحاس وسيلينيوم للمناعة', 'منخفض السعرات وغني بالمعادن'],
      de: ['Höchste Nahrungsquelle für Zink', 'Sehr hoher B12-Gehalt für Blutgesundheit', 'Kupfer und Selen für Immunsystem', 'Kalorienarm und mineralstoffreich'],
    },
  },


  {
    id: 'mussels',
    name: { ar: 'بلح البحر', de: 'Miesmuscheln' },
    category: 'fish_seafood',
    subCategory: 'shellfish',
    emoji: '🐚',
    color: '#2d3748',
    nutrition: {
      kcal: 86, protein: 11.9, carbs: 3.7, fat: 2.2, fiber: 0,
      saturatedFat: 0.4, cholesterol: 28, water: 80.6,
      vitamins: { vitB12: 12.0, vitB3: 1.6, vitB2: 0.21, vitB6: 0.05, vitE: 0.55 },
      minerals: { iron: 3.9, selenium: 44.8, manganese: 3.4, zinc: 1.6, phosphorus: 197, potassium: 320, magnesium: 34, sodium: 286, copper: 0.09 },
    },
    servings: [
      { description: { ar: '10-12 حبة', de: '10-12 Stück' }, grams: 100 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'heart_healthy', 'immune_boost', 'energy_boost', 'low_carb'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['ب12 ممتاز لتكوين خلايا الدم', 'منغنيز عالي لصحة العظام', 'حديد وسيلينيوم للطاقة', 'بروتين بحري سهل الهضم'],
      de: ['Exzellentes B12 für Blutzellenbildung', 'Hoher Manganwert für Knochengesundheit', 'Eisen und Selen für Energie', 'Leicht verdauliches Meeresprotein'],
    },
  },


  {
    id: 'octopus',
    name: { ar: 'أخطبوط', de: 'Oktopus' },
    category: 'fish_seafood',
    subCategory: 'cephalopods',
    emoji: '🐙',
    color: '#805ad5',
    nutrition: {
      kcal: 82, protein: 14.9, carbs: 2.2, fat: 1.0, fiber: 0,
      saturatedFat: 0.2, cholesterol: 48, water: 80.3,
      vitamins: { vitB12: 20.0, vitB3: 2.1, vitB6: 0.36, vitB2: 0.04, vitE: 1.0 },
      minerals: { iron: 5.3, selenium: 44.8, zinc: 1.7, phosphorus: 186, potassium: 350, magnesium: 30, sodium: 230, copper: 0.43 },
    },
    servings: [
      { description: { ar: 'حصة متوسطة', de: 'Mittlere Portion' }, grams: 100 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'brain_food', 'low_carb', 'weight_loss', 'immune_boost'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أعلى ب12 بين المأكولات البحرية', 'حديد عالي لمحاربة الأنيميا', 'سيلينيوم لحماية الخلايا', 'منخفض الدهون والسعرات'],
      de: ['Höchster B12-Wert unter Meeresfrüchten', 'Hoher Eisengehalt gegen Anämie', 'Selen zum Zellschutz', 'Fett- und kalorienarm'],
    },
  },


  {
    id: 'squid',
    name: { ar: 'حبار/كاليماري', de: 'Tintenfisch/Calamari' },
    category: 'fish_seafood',
    subCategory: 'cephalopods',
    emoji: '🦑',
    color: '#e2e8f0',
    nutrition: {
      kcal: 92, protein: 15.6, carbs: 3.1, fat: 1.4, fiber: 0,
      saturatedFat: 0.4, cholesterol: 233, water: 78.6,
      vitamins: { vitB12: 1.3, vitB3: 2.2, vitB6: 0.06, vitB2: 0.41, vitE: 1.2 },
      minerals: { selenium: 44.8, phosphorus: 221, copper: 1.9, zinc: 1.5, potassium: 246, magnesium: 33, sodium: 44, iron: 0.7 },
    },
    servings: [
      { description: { ar: 'حصة متوسطة', de: 'Mittlere Portion' }, grams: 100 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'weight_loss', 'brain_food'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['نحاس عالي لتكوين الكولاجين', 'سيلينيوم لمضادات الأكسدة', 'بروتين عالي مع دهون قليلة', 'فسفور لصحة العظام والأسنان'],
      de: ['Hoher Kupfergehalt für Kollagenbildung', 'Selen als Antioxidans', 'Hoher Protein- bei niedrigem Fettgehalt', 'Phosphor für Knochen und Zähne'],
    },
  },


  {
    id: 'anchovies',
    name: { ar: 'أنشوفة', de: 'Sardellen' },
    category: 'fish_seafood',
    subCategory: 'oily_fish',
    emoji: '🐟',
    color: '#4a6741',
    nutrition: {
      kcal: 131, protein: 20.4, carbs: 0, fat: 4.8, fiber: 0,
      saturatedFat: 1.3, cholesterol: 60, water: 73.4,
      vitamins: { vitB12: 0.6, vitB3: 14.0, vitD: 1.7, vitB6: 0.14, vitE: 0.6 },
      minerals: { iron: 3.3, selenium: 36.5, calcium: 147, phosphorus: 174, potassium: 383, magnesium: 41, sodium: 104, zinc: 1.7 },
    },
    servings: [
      { description: { ar: '10 حبات', de: '10 Stück' }, grams: 45 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'heart_healthy', 'brain_food', 'muscle_building', 'immune_boost'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أوميغا 3 عالية لصحة القلب', 'كالسيوم ممتاز لصحة العظام', 'حديد ونياسين للطاقة', 'سيلينيوم لحماية الخلايا'],
      de: ['Hoher Omega-3-Gehalt für Herzgesundheit', 'Exzellentes Kalzium für Knochen', 'Eisen und Niacin für Energie', 'Selen zum Zellschutz'],
    },
  },


  {
    id: 'trout',
    name: { ar: 'سمك السلمون المرقط', de: 'Forelle' },
    category: 'fish_seafood',
    subCategory: 'freshwater',
    emoji: '🐠',
    color: '#f6ad55',
    nutrition: {
      kcal: 148, protein: 20.8, carbs: 0, fat: 6.6, fiber: 0,
      saturatedFat: 1.8, cholesterol: 58, water: 71.4,
      vitamins: { vitB12: 4.4, vitD: 15.9, vitB3: 5.4, vitB6: 0.4, vitB5: 1.0, vitE: 2.3 },
      minerals: { selenium: 12.6, phosphorus: 245, potassium: 361, magnesium: 28, sodium: 52, zinc: 0.7, iron: 0.3 },
    },
    servings: [
      { description: { ar: 'فيليه متوسط', de: 'Mittleres Filet' }, grams: 140 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'heart_healthy', 'brain_food', 'muscle_building'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['فيتامين د عالي جداً لصحة العظام', 'ب12 ممتاز لصحة الأعصاب', 'أوميغا 3 لصحة القلب والدماغ', 'بروتين عالي الجودة'],
      de: ['Sehr hoher Vitamin-D-Gehalt für Knochen', 'Exzellentes B12 für Nervengesundheit', 'Omega-3 für Herz und Gehirn', 'Hochwertiges Protein'],
    },
  },


  {
    id: 'halibut',
    name: { ar: 'سمك الهلبوت', de: 'Heilbutt' },
    category: 'fish_seafood',
    subCategory: 'white_fish',
    emoji: '🐟',
    color: '#bee3f8',
    nutrition: {
      kcal: 111, protein: 22.5, carbs: 0, fat: 1.6, fiber: 0,
      saturatedFat: 0.3, cholesterol: 32, water: 75.4,
      vitamins: { vitB12: 1.0, vitD: 4.7, vitB3: 6.5, vitB6: 0.55, vitB5: 0.3, vitE: 0.74 },
      minerals: { selenium: 36.5, magnesium: 23, phosphorus: 236, potassium: 435, sodium: 54, zinc: 0.4, iron: 0.2 },
    },
    servings: [
      { description: { ar: 'فيليه متوسط', de: 'Mittleres Filet' }, grams: 160 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'weight_loss', 'low_carb', 'heart_healthy', 'muscle_building'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['بروتين عالي مع دهون قليلة جداً', 'سيلينيوم عالي لحماية الخلايا', 'بوتاسيوم لتنظيم ضغط الدم', 'فيتامين د لصحة العظام'],
      de: ['Hoher Protein- bei sehr niedrigem Fettgehalt', 'Hoher Selengehalt zum Zellschutz', 'Kalium zur Blutdruckregulation', 'Vitamin D für Knochengesundheit'],
    },
  },


  {
    id: 'sea_bass',
    name: { ar: 'سمك القاروص', de: 'Wolfsbarsch' },
    category: 'fish_seafood',
    subCategory: 'white_fish',
    emoji: '🐟',
    color: '#a0aec0',
    nutrition: {
      kcal: 97, protein: 18.4, carbs: 0, fat: 2.0, fiber: 0,
      saturatedFat: 0.5, cholesterol: 41, water: 78.7,
      vitamins: { vitB12: 0.3, vitD: 3.0, vitB3: 1.6, vitB6: 0.4, vitB5: 0.75, vitA: 46 },
      minerals: { selenium: 36.2, phosphorus: 194, calcium: 10, potassium: 256, magnesium: 41, sodium: 68, zinc: 0.4, iron: 0.3 },
    },
    servings: [
      { description: { ar: 'فيليه متوسط', de: 'Mittleres Filet' }, grams: 125 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'weight_loss', 'low_carb', 'heart_healthy', 'keto_friendly'],
    allergens: ['fish'],
    glycemicIndex: null,
    benefits: {
      ar: ['سعرات قليلة جداً مع بروتين جيد', 'سيلينيوم لمضادات الأكسدة', 'مغنيسيوم لصحة العضلات', 'سمك خفيف مثالي للحمية'],
      de: ['Sehr kalorienarm mit gutem Protein', 'Selen als Antioxidans', 'Magnesium für Muskelgesundheit', 'Leichter Fisch ideal für Diät'],
    },
  },


  {
    id: 'crab',
    name: { ar: 'سلطعون/كابوريا', de: 'Krabbe' },
    category: 'fish_seafood',
    subCategory: 'shellfish',
    emoji: '🦀',
    color: '#e53e3e',
    nutrition: {
      kcal: 83, protein: 18.1, carbs: 0, fat: 0.6, fiber: 0,
      saturatedFat: 0.1, cholesterol: 53, water: 79.6,
      vitamins: { vitB12: 8.6, vitB3: 3.0, vitB6: 0.15, vitB5: 0.55, vitE: 1.5 },
      minerals: { zinc: 3.8, selenium: 37.4, copper: 0.67, phosphorus: 229, potassium: 259, magnesium: 34, sodium: 395, iron: 0.7 },
    },
    servings: [
      { description: { ar: 'سلطعون متوسط', de: 'Mittlere Krabbe' }, grams: 135 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'weight_loss', 'immune_boost', 'keto_friendly'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['ب12 عالي لصحة الجهاز العصبي', 'زنك وسيلينيوم للمناعة', 'بروتين عالي مع دهون شبه معدومة', 'نحاس لتكوين خلايا الدم الحمراء'],
      de: ['Hoher B12-Wert für Nervensystem', 'Zink und Selen für Immunsystem', 'Hoher Protein- bei fast keinem Fettgehalt', 'Kupfer für Bildung roter Blutkörperchen'],
    },
  },


  {
    id: 'scallops',
    name: { ar: 'إسكالوب', de: 'Jakobsmuscheln' },
    category: 'fish_seafood',
    subCategory: 'shellfish',
    emoji: '🐚',
    color: '#fefcbf',
    nutrition: {
      kcal: 69, protein: 12.1, carbs: 3.2, fat: 0.5, fiber: 0,
      saturatedFat: 0.1, cholesterol: 24, water: 82.5,
      vitamins: { vitB12: 1.4, vitB3: 0.7, vitB6: 0.07, vitB2: 0.02, vitE: 0.5 },
      minerals: { selenium: 22.2, phosphorus: 334, magnesium: 22, zinc: 1.0, potassium: 205, sodium: 392, iron: 0.4, copper: 0.02 },
    },
    servings: [
      { description: { ar: '5-6 حبات', de: '5-6 Stück' }, grams: 100 },
      { description: { ar: '100 غرام', de: '100 Gramm' }, grams: 100 },
    ],
    tags: ['gluten_free', 'dairy_free', 'high_protein', 'low_carb', 'weight_loss', 'heart_healthy', 'keto_friendly'],
    allergens: ['shellfish'],
    glycemicIndex: null,
    benefits: {
      ar: ['أقل المأكولات البحرية سعرات حرارية', 'فسفور عالي جداً لصحة العظام', 'سيلينيوم لحماية الخلايا', 'بروتين خفيف مثالي للحمية'],
      de: ['Kalorienärmste Meeresfrüchte', 'Sehr hoher Phosphorgehalt für Knochen', 'Selen zum Zellschutz', 'Leichtes Protein ideal für Diät'],
    },
  },
];
