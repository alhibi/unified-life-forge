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

/**
 * Positive synergies — combinations whose joint effect is well-documented.
 * Used by the Stack Advisor to show concrete benefits when the user picks
 * (or already takes) two or more nutrients together.
 *
 * `evidence` levels:
 *   - 'strong'   : repeatedly demonstrated in clinical research
 *   - 'moderate' : consistent evidence, mechanism well understood
 *   - 'emerging' : promising, less conclusive
 */
export interface SynergyRule {
  id: string;
  /** 2-4 nutrient keys whose presence triggers this synergy */
  nutrients: string[];
  evidence: 'strong' | 'moderate' | 'emerging';
  /** primary domain this stack acts on */
  domain: 'bone' | 'skin' | 'hair' | 'energy' | 'immunity' | 'sleep' | 'heart' | 'gut' | 'mood' | 'blood';
  title: Record<Lang, string>;
  /** concrete benefits — short bullets the UI lists */
  benefits: Record<Lang, string[]>;
  /** how to take the stack for the synergy to actually happen */
  howTo: Record<Lang, string>;
  /** food keys that naturally amplify this stack */
  foodBoosters?: string[];
}

export const SYNERGIES: SynergyRule[] = [
  {
    id: 'd-k2-ca',
    nutrients: ['vitaminD', 'vitaminK', 'calcium'],
    evidence: 'strong',
    domain: 'bone',
    title: { ar: 'مثلث العظام: د + ك + كالسيوم', de: 'Knochen-Trio: D + K + Calcium' },
    benefits: {
      ar: [
        'فيتامين د يفتح امتصاص الكالسيوم في الأمعاء',
        'فيتامين ك2 يوجّه الكالسيوم إلى العظام لا الشرايين',
        'دعم كثافة العظام وصحة الأسنان على المدى الطويل',
      ],
      de: [
        'Vitamin D ermöglicht die Calcium-Aufnahme im Darm',
        'Vitamin K2 lenkt Calcium in die Knochen, nicht in die Arterien',
        'Langfristig bessere Knochendichte und Zahngesundheit',
      ],
    },
    howTo: {
      ar: 'تناولهم معاً مع وجبة فيها دهون (بيض، أفوكادو، زيت زيتون).',
      de: 'Zusammen zu einer fetthaltigen Mahlzeit (Eier, Avocado, Olivenöl).',
    },
    foodBoosters: ['eggs', 'salmon', 'avocado', 'olive_oil', 'cheese'],
  },
  {
    id: 'c-iron',
    nutrients: ['vitaminC', 'iron'],
    evidence: 'strong',
    domain: 'blood',
    title: { ar: 'سي + حديد: امتصاص أعلى', de: 'C + Eisen: bessere Aufnahme' },
    benefits: {
      ar: [
        'فيتامين سي يضاعف امتصاص الحديد النباتي حتى 3 مرات',
        'دعم تكوين خلايا الدم الحمراء وتقليل الإرهاق',
        'تحسن مستوى الطاقة خلال أسابيع لمن يعاني نقص الحديد',
      ],
      de: [
        'Vitamin C verdreifacht die pflanzliche Eisenaufnahme',
        'Unterstützt Blutbildung, reduziert Müdigkeit',
        'Energieniveau steigt innerhalb weniger Wochen bei Eisenmangel',
      ],
    },
    howTo: {
      ar: 'تناول الحديد على معدة فارغة مع كوب عصير برتقال أو ليمون.',
      de: 'Eisen nüchtern mit einem Glas Orangen- oder Zitronensaft.',
    },
    foodBoosters: ['orange', 'lemon', 'strawberry', 'spinach', 'lentils'],
  },
  {
    id: 'mg-b6',
    nutrients: ['magnesium', 'vitaminB6'],
    evidence: 'strong',
    domain: 'mood',
    title: { ar: 'مغنيسيوم + ب6: هدوء وتركيز', de: 'Magnesium + B6: Ruhe & Fokus' },
    benefits: {
      ar: [
        'ب6 يزيد دخول المغنيسيوم إلى الخلية',
        'تخفيف القلق والتوتر بشكل ملموس',
        'تحسن جودة النوم العميق',
      ],
      de: [
        'B6 erhöht den Magnesium-Eintritt in die Zelle',
        'Spürbare Reduktion von Anspannung und Stress',
        'Verbesserte Tiefschlafqualität',
      ],
    },
    howTo: {
      ar: 'الجرعة المسائية قبل النوم بساعة، مع كوب ماء.',
      de: 'Abenddosis ca. 1 Std. vor dem Schlafen, mit Wasser.',
    },
    foodBoosters: ['banana', 'almonds', 'spinach', 'oats'],
  },
  {
    id: 'zn-vita-skin',
    nutrients: ['zinc', 'vitaminA'],
    evidence: 'moderate',
    domain: 'skin',
    title: { ar: 'زنك + فيتامين أ: بشرة هادئة', de: 'Zink + Vitamin A: ruhige Haut' },
    benefits: {
      ar: [
        'تنظيم إفراز الدهون وتقليل الحبوب',
        'تسريع التئام الجلد والندبات الخفيفة',
        'دعم حاجز البشرة ومقاومة الالتهاب',
      ],
      de: [
        'Reguliert Talgproduktion, reduziert Unreinheiten',
        'Beschleunigt Heilung kleiner Hautläsionen',
        'Stärkt Hautbarriere gegen Entzündungen',
      ],
    },
    howTo: {
      ar: 'الزنك مع وجبة لتفادي الغثيان، فيتامين أ مع دهون.',
      de: 'Zink zu einer Mahlzeit, Vitamin A mit Fett.',
    },
    foodBoosters: ['liver', 'carrot', 'eggs', 'salmon'],
  },
  {
    id: 'biotin-zn-collagen',
    nutrients: ['biotin', 'zinc', 'collagen'],
    evidence: 'moderate',
    domain: 'hair',
    title: { ar: 'حزمة الشعر: بيوتين + زنك + كولاجين', de: 'Haar-Stack: Biotin + Zink + Kollagen' },
    benefits: {
      ar: [
        'تقوية بصيلات الشعر وتقليل التساقط الموسمي',
        'دعم بنية الكيراتين وزيادة لمعان الشعر',
        'تحسن في الأظافر والبشرة كأثر جانبي',
      ],
      de: [
        'Stärkere Haarfollikel, weniger saisonaler Ausfall',
        'Bessere Keratinstruktur, sichtbarer Glanz',
        'Nebeneffekt: festere Nägel, glattere Haut',
      ],
    },
    howTo: {
      ar: 'الكولاجين صباحاً مع فيتامين سي، الزنك مساءً مع وجبة.',
      de: 'Kollagen morgens mit Vitamin C, Zink abends zu einer Mahlzeit.',
    },
    foodBoosters: ['eggs', 'salmon', 'walnuts', 'beans'],
  },
  {
    id: 'omega3-vite',
    nutrients: ['omega3', 'vitaminE'],
    evidence: 'strong',
    domain: 'heart',
    title: { ar: 'أوميغا-3 + فيتامين هـ', de: 'Omega-3 + Vitamin E' },
    benefits: {
      ar: [
        'فيتامين هـ يحمي أوميغا-3 من الأكسدة في الجسم',
        'دعم صحة القلب والأوعية الدموية',
        'تقليل الالتهاب المزمن في المفاصل والبشرة',
      ],
      de: [
        'Vitamin E schützt Omega-3 vor Oxidation',
        'Unterstützt Herz und Gefäße',
        'Reduziert chronische Entzündung in Gelenken und Haut',
      ],
    },
    howTo: {
      ar: 'كلاهما مع وجبة دسمة في نفس الوقت.',
      de: 'Beide zusammen zu einer fettreichen Mahlzeit.',
    },
    foodBoosters: ['salmon', 'walnuts', 'almonds', 'olive_oil', 'avocado'],
  },
  {
    id: 'iron-folate-b12',
    nutrients: ['iron', 'folate', 'vitaminB12'],
    evidence: 'strong',
    domain: 'blood',
    title: { ar: 'ثلاثي تكوين الدم', de: 'Blutbildungs-Trio' },
    benefits: {
      ar: [
        'تكوين خلايا دم حمراء صحية وكاملة الوظيفة',
        'علاج فعّال لفقر الدم الغذائي',
        'تحسن في التركيز والطاقة الذهنية',
      ],
      de: [
        'Bildung gesunder, voll funktionsfähiger roter Blutzellen',
        'Wirksam bei ernährungsbedingter Anämie',
        'Mehr mentale Energie und Konzentration',
      ],
    },
    howTo: {
      ar: 'الحديد على الريق، ب12 والفوليك أي وقت — أضف فيتامين سي معهم.',
      de: 'Eisen nüchtern, B12 + Folsäure jederzeit — mit Vitamin C kombinieren.',
    },
    foodBoosters: ['liver', 'spinach', 'beans', 'lentils', 'beef'],
  },
  {
    id: 'mg-zn-sleep',
    nutrients: ['magnesium', 'zinc'],
    evidence: 'moderate',
    domain: 'sleep',
    title: { ar: 'مغنيسيوم + زنك: نوم أعمق', de: 'Magnesium + Zink: tieferer Schlaf' },
    benefits: {
      ar: [
        'تنظيم هرمون الميلاتونين الطبيعي',
        'تقليل الاستيقاظ الليلي',
        'استرخاء عضلي وتعافٍ أفضل بعد المجهود',
      ],
      de: [
        'Reguliert die natürliche Melatonin-Produktion',
        'Weniger nächtliches Aufwachen',
        'Muskelentspannung und bessere Erholung',
      ],
    },
    howTo: {
      ar: 'كلاهما مع وجبة العشاء، قبل النوم بساعة على الأقل.',
      de: 'Beide zum Abendessen, mind. 1 Std. vor dem Schlafen.',
    },
    foodBoosters: ['almonds', 'oats', 'beef', 'beans'],
  },
  {
    id: 'collagen-c',
    nutrients: ['collagen', 'vitaminC'],
    evidence: 'strong',
    domain: 'skin',
    title: { ar: 'كولاجين + فيتامين سي', de: 'Kollagen + Vitamin C' },
    benefits: {
      ar: [
        'فيتامين سي شرط أساسي لتكوين الكولاجين الجديد',
        'تحسن مرونة البشرة خلال 8-12 أسبوع',
        'دعم المفاصل والأوتار',
      ],
      de: [
        'Vitamin C ist Voraussetzung für die Kollagensynthese',
        'Bessere Hautelastizität in 8-12 Wochen',
        'Unterstützt Gelenke und Sehnen',
      ],
    },
    howTo: {
      ar: 'الكولاجين صباحاً مع كوب عصير حمضيات أو حبة برتقال.',
      de: 'Kollagen morgens mit Zitrussaft oder einer Orange.',
    },
    foodBoosters: ['orange', 'strawberry', 'lemon', 'broccoli'],
  },
  {
    id: 'probiotics-fiber',
    nutrients: ['probiotics', 'fiber'],
    evidence: 'strong',
    domain: 'gut',
    title: { ar: 'بروبيوتيك + ألياف', de: 'Probiotika + Ballaststoffe' },
    benefits: {
      ar: [
        'الألياف غذاء البكتيريا النافعة (بريبيوتيك)',
        'تحسن الهضم وانتظام الأمعاء',
        'دعم المناعة وتقليل الانتفاخ',
      ],
      de: [
        'Ballaststoffe nähren die guten Bakterien (Präbiotika)',
        'Bessere Verdauung und regelmäßiger Stuhlgang',
        'Stärkere Immunabwehr, weniger Blähungen',
      ],
    },
    howTo: {
      ar: 'البروبيوتيك صباحاً قبل الفطور، مع وجبات غنية بالألياف يومياً.',
      de: 'Probiotika morgens nüchtern, täglich ballaststoffreich essen.',
    },
    foodBoosters: ['oats', 'beans', 'lentils', 'broccoli', 'avocado'],
  },
  {
    id: 'd-immune',
    nutrients: ['vitaminD', 'vitaminC', 'zinc'],
    evidence: 'moderate',
    domain: 'immunity',
    title: { ar: 'حزمة المناعة', de: 'Immun-Stack' },
    benefits: {
      ar: [
        'تقليل مدة وحدة نزلات البرد',
        'دعم خلايا المناعة المختلفة في وقت واحد',
        'يفيد بشكل خاص في الشتاء وقلة الشمس',
      ],
      de: [
        'Verkürzt Dauer und Schwere von Erkältungen',
        'Unterstützt verschiedene Immunzellen gleichzeitig',
        'Besonders wertvoll im Winter bei wenig Sonne',
      ],
    },
    howTo: {
      ar: 'فيتامين د مع وجبة دسمة، سي والزنك موزعين على اليوم.',
      de: 'Vitamin D zu fetthaltiger Mahlzeit, C und Zink über den Tag verteilt.',
    },
    foodBoosters: ['orange', 'salmon', 'eggs', 'kale'],
  },
];

/** Domain → emoji + color hint for the UI. */
export const DOMAIN_META: Record<
  SynergyRule['domain'],
  { icon: string; label: Record<Lang, string> }
> = {
  bone:     { icon: '🦴', label: { ar: 'العظام',   de: 'Knochen'   } },
  skin:     { icon: '✨', label: { ar: 'البشرة',   de: 'Haut'      } },
  hair:     { icon: '💇', label: { ar: 'الشعر',    de: 'Haar'      } },
  energy:   { icon: '⚡', label: { ar: 'الطاقة',   de: 'Energie'   } },
  immunity: { icon: '🛡️', label: { ar: 'المناعة',  de: 'Immunität' } },
  sleep:    { icon: '🌙', label: { ar: 'النوم',    de: 'Schlaf'    } },
  heart:    { icon: '❤️', label: { ar: 'القلب',    de: 'Herz'      } },
  gut:      { icon: '🌱', label: { ar: 'الأمعاء',  de: 'Darm'      } },
  mood:     { icon: '🧘', label: { ar: 'المزاج',   de: 'Stimmung'  } },
  blood:    { icon: '🩸', label: { ar: 'الدم',     de: 'Blut'      } },
};

export const EVIDENCE_LABEL: Record<SynergyRule['evidence'], Record<Lang, string>> = {
  strong:   { ar: 'دليل قوي',     de: 'Starke Evidenz'   },
  moderate: { ar: 'دليل متوسط',   de: 'Mittlere Evidenz' },
  emerging: { ar: 'دليل أولي',     de: 'Vorläufig'        },
};
