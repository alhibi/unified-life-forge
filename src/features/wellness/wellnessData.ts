/**
 * Static knowledge base for the wellness feature.
 *
 * IMPORTANT: This is general educational information only.
 * It is NOT medical advice. The UI must display a disclaimer.
 *
 * Everything here is data, pure and offline — no network fetches.
 */

export type Lang = 'ar' | 'de';

export interface NutrientInfo {
  key: string;
  label: Record<Lang, string>;
  /** absorption / timing note shown in insights */
  note?: Record<Lang, string>;
  /** visual category for grouping */
  group: 'vitamin' | 'mineral' | 'omega' | 'amino' | 'other';
}

/**
 * Common vitamins, minerals and compounds that appear in supplements.
 */
export const NUTRIENTS: Record<string, NutrientInfo> = {
  vitaminA: {
    key: 'vitaminA',
    group: 'vitamin',
    label: { ar: 'فيتامين أ', de: 'Vitamin A' },
    note: {
      ar: 'فيتامين دهني — يمتص أفضل مع وجبة تحتوي دهون.',
      de: 'Fettlöslich — besser mit fetthaltiger Mahlzeit einnehmen.',
    },
  },
  vitaminC: {
    key: 'vitaminC',
    group: 'vitamin',
    label: { ar: 'فيتامين سي', de: 'Vitamin C' },
    note: {
      ar: 'يزيد امتصاص الحديد النباتي — جيد مع الوجبات.',
      de: 'Erhöht die Eisenaufnahme aus Pflanzen — gut zu Mahlzeiten.',
    },
  },
  vitaminD: {
    key: 'vitaminD',
    group: 'vitamin',
    label: { ar: 'فيتامين د', de: 'Vitamin D' },
    note: {
      ar: 'دهني — يؤخذ مع وجبة بها دهون لامتصاص أفضل.',
      de: 'Fettlöslich — mit einer Mahlzeit mit Fett einnehmen.',
    },
  },
  vitaminE: {
    key: 'vitaminE',
    group: 'vitamin',
    label: { ar: 'فيتامين هـ', de: 'Vitamin E' },
    note: {
      ar: 'دهني — مع وجبة تحتوي دهون.',
      de: 'Fettlöslich — mit fetthaltiger Mahlzeit.',
    },
  },
  vitaminK: {
    key: 'vitaminK',
    group: 'vitamin',
    label: { ar: 'فيتامين ك', de: 'Vitamin K' },
  },
  vitaminB6: {
    key: 'vitaminB6',
    group: 'vitamin',
    label: { ar: 'فيتامين ب6', de: 'Vitamin B6' },
  },
  vitaminB12: {
    key: 'vitaminB12',
    group: 'vitamin',
    label: { ar: 'فيتامين ب12', de: 'Vitamin B12' },
  },
  folate: {
    key: 'folate',
    group: 'vitamin',
    label: { ar: 'حمض الفوليك', de: 'Folsäure' },
  },
  biotin: {
    key: 'biotin',
    group: 'vitamin',
    label: { ar: 'البيوتين (ب7)', de: 'Biotin (B7)' },
  },
  iron: {
    key: 'iron',
    group: 'mineral',
    label: { ar: 'الحديد', de: 'Eisen' },
    note: {
      ar: 'يمتص أفضل على معدة فارغة ومع فيتامين سي.',
      de: 'Wird nüchtern und mit Vitamin C besser aufgenommen.',
    },
  },
  calcium: {
    key: 'calcium',
    group: 'mineral',
    label: { ar: 'الكالسيوم', de: 'Calcium' },
  },
  magnesium: {
    key: 'magnesium',
    group: 'mineral',
    label: { ar: 'المغنيسيوم', de: 'Magnesium' },
    note: {
      ar: 'كثير من الناس يفضل أخذه مساء لدعم النوم.',
      de: 'Wird oft abends zur Schlafunterstützung eingenommen.',
    },
  },
  zinc: {
    key: 'zinc',
    group: 'mineral',
    label: { ar: 'الزنك', de: 'Zink' },
    note: {
      ar: 'قد يسبب غثياناً على معدة فارغة.',
      de: 'Kann nüchtern Übelkeit auslösen.',
    },
  },
  copper: {
    key: 'copper',
    group: 'mineral',
    label: { ar: 'النحاس', de: 'Kupfer' },
  },
  selenium: {
    key: 'selenium',
    group: 'mineral',
    label: { ar: 'السيلينيوم', de: 'Selen' },
  },
  iodine: {
    key: 'iodine',
    group: 'mineral',
    label: { ar: 'اليود', de: 'Jod' },
  },
  omega3: {
    key: 'omega3',
    group: 'omega',
    label: { ar: 'أوميغا-3', de: 'Omega-3' },
    note: {
      ar: 'يمتص أفضل مع وجبة دسمة.',
      de: 'Bessere Aufnahme mit fettreicher Mahlzeit.',
    },
  },
  collagen: {
    key: 'collagen',
    group: 'amino',
    label: { ar: 'الكولاجين', de: 'Kollagen' },
  },
  protein: {
    key: 'protein',
    group: 'amino',
    label: { ar: 'البروتين', de: 'Protein' },
  },
  fiber: {
    key: 'fiber',
    group: 'other',
    label: { ar: 'الألياف', de: 'Ballaststoffe' },
  },
  probiotics: {
    key: 'probiotics',
    group: 'other',
    label: { ar: 'بروبيوتيك', de: 'Probiotika' },
  },
  caffeine: {
    key: 'caffeine',
    group: 'other',
    label: { ar: 'كافيين', de: 'Koffein' },
  },
};

export const NUTRIENT_LIST: NutrientInfo[] = Object.values(NUTRIENTS);

export interface FoodInfo {
  key: string;
  label: Record<Lang, string>;
  icon: string; // emoji for quick UI
  /** which nutrients this food is a notable source of */
  nutrients: string[];
  /** optional tag: "protein-rich", "fatty", etc. — used for timing hints */
  tags?: ('fatty' | 'caffeine' | 'dairy' | 'citrus' | 'leafy')[];
}

/**
 * Common foods. Not a full nutrition database — just a curated list
 * sufficient to reason about overlaps with supplement content.
 */
export const FOODS: Record<string, FoodInfo> = {
  eggs: {
    key: 'eggs',
    icon: '🥚',
    label: { ar: 'بيض', de: 'Eier' },
    nutrients: ['protein', 'vitaminD', 'vitaminB12', 'biotin', 'iron'],
  },
  chicken: {
    key: 'chicken',
    icon: '🍗',
    label: { ar: 'دجاج', de: 'Hähnchen' },
    nutrients: ['protein', 'vitaminB6', 'zinc'],
  },
  fish: {
    key: 'fish',
    icon: '🐟',
    label: { ar: 'سمك', de: 'Fisch' },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'iodine'],
    tags: ['fatty'],
  },
  salmon: {
    key: 'salmon',
    icon: '🐠',
    label: { ar: 'سلمون', de: 'Lachs' },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'selenium'],
    tags: ['fatty'],
  },
  beef: {
    key: 'beef',
    icon: '🥩',
    label: { ar: 'لحم بقر', de: 'Rindfleisch' },
    nutrients: ['protein', 'iron', 'zinc', 'vitaminB12'],
  },
  liver: {
    key: 'liver',
    icon: '🫘',
    label: { ar: 'كبدة', de: 'Leber' },
    nutrients: ['iron', 'vitaminA', 'vitaminB12', 'folate', 'copper'],
  },
  spinach: {
    key: 'spinach',
    icon: '🥬',
    label: { ar: 'سبانخ', de: 'Spinat' },
    nutrients: ['iron', 'folate', 'vitaminK', 'magnesium', 'vitaminA'],
    tags: ['leafy'],
  },
  kale: {
    key: 'kale',
    icon: '🥬',
    label: { ar: 'كرنب أجعد', de: 'Grünkohl' },
    nutrients: ['vitaminK', 'vitaminC', 'vitaminA', 'calcium'],
    tags: ['leafy'],
  },
  broccoli: {
    key: 'broccoli',
    icon: '🥦',
    label: { ar: 'بروكلي', de: 'Brokkoli' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  carrot: {
    key: 'carrot',
    icon: '🥕',
    label: { ar: 'جزر', de: 'Karotten' },
    nutrients: ['vitaminA', 'fiber'],
  },
  orange: {
    key: 'orange',
    icon: '🍊',
    label: { ar: 'برتقال', de: 'Orange' },
    nutrients: ['vitaminC', 'folate', 'fiber'],
    tags: ['citrus'],
  },
  lemon: {
    key: 'lemon',
    icon: '🍋',
    label: { ar: 'ليمون', de: 'Zitrone' },
    nutrients: ['vitaminC'],
    tags: ['citrus'],
  },
  strawberry: {
    key: 'strawberry',
    icon: '🍓',
    label: { ar: 'فراولة', de: 'Erdbeeren' },
    nutrients: ['vitaminC', 'fiber'],
  },
  banana: {
    key: 'banana',
    icon: '🍌',
    label: { ar: 'موز', de: 'Banane' },
    nutrients: ['vitaminB6', 'magnesium', 'fiber'],
  },
  avocado: {
    key: 'avocado',
    icon: '🥑',
    label: { ar: 'أفوكادو', de: 'Avocado' },
    nutrients: ['vitaminE', 'vitaminK', 'folate', 'fiber'],
    tags: ['fatty'],
  },
  almonds: {
    key: 'almonds',
    icon: '🌰',
    label: { ar: 'لوز', de: 'Mandeln' },
    nutrients: ['vitaminE', 'magnesium', 'protein', 'fiber'],
    tags: ['fatty'],
  },
  walnuts: {
    key: 'walnuts',
    icon: '🌰',
    label: { ar: 'جوز', de: 'Walnüsse' },
    nutrients: ['omega3', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  yogurt: {
    key: 'yogurt',
    icon: '🥣',
    label: { ar: 'زبادي', de: 'Joghurt' },
    nutrients: ['calcium', 'protein', 'probiotics', 'vitaminB12'],
    tags: ['dairy'],
  },
  milk: {
    key: 'milk',
    icon: '🥛',
    label: { ar: 'حليب', de: 'Milch' },
    nutrients: ['calcium', 'protein', 'vitaminD', 'vitaminB12'],
    tags: ['dairy'],
  },
  cheese: {
    key: 'cheese',
    icon: '🧀',
    label: { ar: 'جبن', de: 'Käse' },
    nutrients: ['calcium', 'protein', 'vitaminB12'],
    tags: ['dairy'],
  },
  oats: {
    key: 'oats',
    icon: '🥣',
    label: { ar: 'شوفان', de: 'Hafer' },
    nutrients: ['fiber', 'magnesium', 'iron', 'protein'],
  },
  rice: {
    key: 'rice',
    icon: '🍚',
    label: { ar: 'أرز', de: 'Reis' },
    nutrients: ['magnesium'],
  },
  beans: {
    key: 'beans',
    icon: '🫘',
    label: { ar: 'فاصولياء', de: 'Bohnen' },
    nutrients: ['protein', 'iron', 'folate', 'fiber', 'magnesium'],
  },
  lentils: {
    key: 'lentils',
    icon: '🫘',
    label: { ar: 'عدس', de: 'Linsen' },
    nutrients: ['protein', 'iron', 'folate', 'fiber'],
  },
  dates: {
    key: 'dates',
    icon: '🌴',
    label: { ar: 'تمر', de: 'Datteln' },
    nutrients: ['fiber', 'magnesium', 'iron'],
  },
  honey: {
    key: 'honey',
    icon: '🍯',
    label: { ar: 'عسل', de: 'Honig' },
    nutrients: [],
  },
  coffee: {
    key: 'coffee',
    icon: '☕',
    label: { ar: 'قهوة', de: 'Kaffee' },
    nutrients: ['caffeine'],
    tags: ['caffeine'],
  },
  tea: {
    key: 'tea',
    icon: '🍵',
    label: { ar: 'شاي', de: 'Tee' },
    nutrients: ['caffeine'],
    tags: ['caffeine'],
  },
  water: {
    key: 'water',
    icon: '💧',
    label: { ar: 'ماء', de: 'Wasser' },
    nutrients: [],
  },
  olive_oil: {
    key: 'olive_oil',
    icon: '🫒',
    label: { ar: 'زيت زيتون', de: 'Olivenöl' },
    nutrients: ['vitaminE'],
    tags: ['fatty'],
  },
};

export const FOOD_LIST: FoodInfo[] = Object.values(FOODS);

/**
 * Known supplement / nutrient interactions.
 * These power the Insights tab and are intentionally conservative.
 */
export interface InteractionRule {
  id: string;
  /** pair of nutrient keys; order doesn't matter */
  pair: [string, string];
  severity: 'info' | 'warn';
  message: Record<Lang, string>;
}

export const INTERACTIONS: InteractionRule[] = [
  {
    id: 'calcium-iron',
    pair: ['calcium', 'iron'],
    severity: 'warn',
    message: {
      ar: 'الكالسيوم يقلل امتصاص الحديد — افصل بينهما بساعتين على الأقل.',
      de: 'Calcium hemmt die Eisenaufnahme — mind. 2 Stunden Abstand.',
    },
  },
  {
    id: 'zinc-copper',
    pair: ['zinc', 'copper'],
    severity: 'warn',
    message: {
      ar: 'جرعات الزنك العالية قد تستنزف النحاس على المدى الطويل.',
      de: 'Hohe Zink-Dosen können langfristig Kupfer verringern.',
    },
  },
  {
    id: 'zinc-iron',
    pair: ['zinc', 'iron'],
    severity: 'info',
    message: {
      ar: 'الزنك والحديد يتنافسان على الامتصاص — تناولهما في وقتين مختلفين.',
      de: 'Zink und Eisen konkurrieren bei der Aufnahme — zeitlich trennen.',
    },
  },
  {
    id: 'calcium-magnesium',
    pair: ['calcium', 'magnesium'],
    severity: 'info',
    message: {
      ar: 'جرعات عالية متزامنة من الكالسيوم والمغنيسيوم قد تقلل امتصاص كل منهما.',
      de: 'Hohe Dosen Calcium und Magnesium gleichzeitig können sich gegenseitig hemmen.',
    },
  },
  {
    id: 'vitaminC-iron',
    pair: ['vitaminC', 'iron'],
    severity: 'info',
    message: {
      ar: 'فيتامين سي يعزز امتصاص الحديد النباتي — تناولهما معاً مفيد.',
      de: 'Vitamin C verbessert die pflanzliche Eisenaufnahme — gute Kombination.',
    },
  },
  {
    id: 'vitaminD-calcium',
    pair: ['vitaminD', 'calcium'],
    severity: 'info',
    message: {
      ar: 'فيتامين د يساعد في امتصاص الكالسيوم — تركيبة متكاملة.',
      de: 'Vitamin D unterstützt die Calcium-Aufnahme — sinnvolle Kombination.',
    },
  },
  {
    id: 'caffeine-iron',
    pair: ['caffeine', 'iron'],
    severity: 'warn',
    message: {
      ar: 'القهوة والشاي يقللان امتصاص الحديد إذا شربا معه.',
      de: 'Kaffee und Tee hemmen die Eisenaufnahme bei gleichzeitiger Einnahme.',
    },
  },
  {
    id: 'caffeine-calcium',
    pair: ['caffeine', 'calcium'],
    severity: 'info',
    message: {
      ar: 'الإفراط في الكافيين قد يقلل امتصاص الكالسيوم.',
      de: 'Zu viel Koffein kann die Calcium-Aufnahme leicht reduzieren.',
    },
  },
];

export const DISCLAIMER: Record<Lang, string> = {
  ar: 'هذه المعلومات عامة لأغراض تثقيفية فقط وليست استشارة طبية. راجع طبيبك قبل تعديل المكملات.',
  de: 'Diese Infos sind allgemein und bildend — keine medizinische Beratung. Vor Änderungen an Nahrungsergänzungsmitteln bitte Arzt fragen.',
};
