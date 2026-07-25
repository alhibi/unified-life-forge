/**
 * Static knowledge base for the wellness feature.
 *
 * IMPORTANT: This is general educational information only.
 * It is NOT medical advice. The UI must display a disclaimer.
 *
 * Everything here is data, pure and offline — no network fetches.
 */

export type Lang = 'ar';

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
    label: { ar: 'فيتامين أ', },
    note: {
      ar: 'فيتامين دهني — يمتص أفضل مع وجبة تحتوي دهون.',
    },
  },
  vitaminC: {
    key: 'vitaminC',
    group: 'vitamin',
    label: { ar: 'فيتامين سي', },
    note: {
      ar: 'يزيد امتصاص الحديد النباتي — جيد مع الوجبات.',
    },
  },
  vitaminD: {
    key: 'vitaminD',
    group: 'vitamin',
    label: { ar: 'فيتامين د', },
    note: {
      ar: 'دهني — يؤخذ مع وجبة بها دهون لامتصاص أفضل.',
    },
  },
  vitaminE: {
    key: 'vitaminE',
    group: 'vitamin',
    label: { ar: 'فيتامين هـ', },
    note: {
      ar: 'دهني — مع وجبة تحتوي دهون.',
    },
  },
  vitaminK: {
    key: 'vitaminK',
    group: 'vitamin',
    label: { ar: 'فيتامين ك', },
  },
  vitaminB6: {
    key: 'vitaminB6',
    group: 'vitamin',
    label: { ar: 'فيتامين ب6', },
  },
  vitaminB12: {
    key: 'vitaminB12',
    group: 'vitamin',
    label: { ar: 'فيتامين ب12', },
  },
  folate: {
    key: 'folate',
    group: 'vitamin',
    label: { ar: 'حمض الفوليك', },
  },
  biotin: {
    key: 'biotin',
    group: 'vitamin',
    label: { ar: 'البيوتين (ب7)', },
  },
  iron: {
    key: 'iron',
    group: 'mineral',
    label: { ar: 'الحديد', },
    note: {
      ar: 'يمتص أفضل على معدة فارغة ومع فيتامين سي.',
    },
  },
  calcium: {
    key: 'calcium',
    group: 'mineral',
    label: { ar: 'الكالسيوم', },
  },
  magnesium: {
    key: 'magnesium',
    group: 'mineral',
    label: { ar: 'المغنيسيوم', },
    note: {
      ar: 'كثير من الناس يفضل أخذه مساء لدعم النوم.',
    },
  },
  zinc: {
    key: 'zinc',
    group: 'mineral',
    label: { ar: 'الزنك', },
    note: {
      ar: 'قد يسبب غثياناً على معدة فارغة.',
    },
  },
  copper: {
    key: 'copper',
    group: 'mineral',
    label: { ar: 'النحاس', },
  },
  selenium: {
    key: 'selenium',
    group: 'mineral',
    label: { ar: 'السيلينيوم', },
  },
  iodine: {
    key: 'iodine',
    group: 'mineral',
    label: { ar: 'اليود', },
  },
  omega3: {
    key: 'omega3',
    group: 'omega',
    label: { ar: 'أوميغا-3', },
    note: {
      ar: 'يمتص أفضل مع وجبة دسمة.',
    },
  },
  collagen: {
    key: 'collagen',
    group: 'amino',
    label: { ar: 'الكولاجين', },
  },
  protein: {
    key: 'protein',
    group: 'amino',
    label: { ar: 'البروتين', },
  },
  fiber: {
    key: 'fiber',
    group: 'other',
    label: { ar: 'الألياف', },
  },
  probiotics: {
    key: 'probiotics',
    group: 'other',
    label: { ar: 'بروبيوتيك', },
  },
  caffeine: {
    key: 'caffeine',
    group: 'other',
    label: { ar: 'كافيين', },
  },
  potassium: {
    key: 'potassium',
    group: 'mineral',
    label: { ar: 'البوتاسيوم', },
  },
  phosphorus: {
    key: 'phosphorus',
    group: 'mineral',
    label: { ar: 'الفوسفور', },
  },
  manganese: {
    key: 'manganese',
    group: 'mineral',
    label: { ar: 'المنغنيز', },
  },
  chromium: {
    key: 'chromium',
    group: 'mineral',
    label: { ar: 'الكروم', },
  },
  vitaminB1: {
    key: 'vitaminB1',
    group: 'vitamin',
    label: { ar: 'فيتامين ب1 (ثيامين)', },
  },
  vitaminB2: {
    key: 'vitaminB2',
    group: 'vitamin',
    label: { ar: 'فيتامين ب2 (ريبوفلافين)', },
  },
  vitaminB3: {
    key: 'vitaminB3',
    group: 'vitamin',
    label: { ar: 'فيتامين ب3 (نياسين)', },
  },
  vitaminB5: {
    key: 'vitaminB5',
    group: 'vitamin',
    label: { ar: 'فيتامين ب5 (بانتوثينيك)', },
  },
  choline: {
    key: 'choline',
    group: 'other',
    label: { ar: 'الكولين', },
  },
  lycopene: {
    key: 'lycopene',
    group: 'other',
    label: { ar: 'الليكوبين', },
  },
  lutein: {
    key: 'lutein',
    group: 'other',
    label: { ar: 'اللوتين', },
  },
  antioxidants: {
    key: 'antioxidants',
    group: 'other',
    label: { ar: 'مضادات أكسدة', },
  },
  polyphenols: {
    key: 'polyphenols',
    group: 'other',
    label: { ar: 'بوليفينولات', },
  },
  carbs: {
    key: 'carbs',
    group: 'other',
    label: { ar: 'كربوهيدرات', },
  },

  // ============================================================
  // === Atlas-derived advanced compounds (deep biochemistry) ===
  // ============================================================

  // — Active methylation cofactors —
  methylfolate: {
    key: 'methylfolate',
    group: 'vitamin',
    label: { ar: 'ميثيل فولات (B9 نشط)', },
    note: {
      ar: 'الصيغة النشطة الجاهزة لدورة الميثيلة دون الحاجة لإنزيم MTHFR.',
    },
  },
  methylB12: {
    key: 'methylB12',
    group: 'vitamin',
    label: { ar: 'ميثيل كوبالامين (B12 نشط)', },
  },
  p5p: {
    key: 'p5p',
    group: 'vitamin',
    label: { ar: 'P-5-P (B6 نشط)', },
  },
  tmg: {
    key: 'tmg',
    group: 'other',
    label: { ar: 'بيتائين (TMG)', },
    note: {
      ar: 'مانح ميثيل قوي يدعم تحويل الهوموسيستين عبر مسار بديل.',
    },
  },

  // — Mitochondrial axis —
  coq10: {
    key: 'coq10',
    group: 'other',
    label: { ar: 'يوبيكوينول (CoQ10)', },
    note: {
      ar: 'دهني — مع وجبة فيها زيت زيتون أو أوميغا-3 لامتصاص أعلى.',
    },
  },
  pqq: {
    key: 'pqq',
    group: 'other',
    label: { ar: 'PQQ (محفّز ميتوكوندريا)', },
  },
  nmn: {
    key: 'nmn',
    group: 'other',
    label: { ar: 'NMN (سلف NAD+)', },
  },
  ala: {
    key: 'ala',
    group: 'other',
    label: { ar: 'حمض ألفا-ليبويك (R-ALA)', },
  },
  lcarnitine: {
    key: 'lcarnitine',
    group: 'amino',
    label: { ar: 'L-كارنيتين', },
  },
  creatine: {
    key: 'creatine',
    group: 'amino',
    label: { ar: 'الكرياتين', },
  },

  // — Antioxidant / detox —
  nac: {
    key: 'nac',
    group: 'amino',
    label: { ar: 'N-أسيتيل سيستين (NAC)', },
  },
  glutathione: {
    key: 'glutathione',
    group: 'amino',
    label: { ar: 'الجلوتاثيون', },
  },
  milkthistle: {
    key: 'milkthistle',
    group: 'other',
    label: { ar: 'حليب الشوك (سيليمارين)', },
  },

  // — Cognition / nervous system —
  phosphatidylserine: {
    key: 'phosphatidylserine',
    group: 'other',
    label: { ar: 'فوسفاتيديل سيرين (PS)', },
  },
  lionsmane: {
    key: 'lionsmane',
    group: 'other',
    label: { ar: 'عرف الأسد', },
  },
  ltheanine: {
    key: 'ltheanine',
    group: 'amino',
    label: { ar: 'L-ثيانين', },
  },
  glycine: {
    key: 'glycine',
    group: 'amino',
    label: { ar: 'جلايسين', },
  },
  taurine: {
    key: 'taurine',
    group: 'amino',
    label: { ar: 'التورين', },
  },

  // — HPA / adaptogens —
  ashwagandha: {
    key: 'ashwagandha',
    group: 'other',
    label: { ar: 'أشواغاندا', },
  },
  rhodiola: {
    key: 'rhodiola',
    group: 'other',
    label: { ar: 'روديولا', },
  },

  // — Anti-inflammation / senolytic —
  curcumin: {
    key: 'curcumin',
    group: 'other',
    label: { ar: 'الكركومين', },
    note: {
      ar: 'يمتص أفضل مع البايبرين والدهون الصحية.',
    },
  },
  resveratrol: {
    key: 'resveratrol',
    group: 'other',
    label: { ar: 'ريسفيراترول', },
  },
  quercetin: {
    key: 'quercetin',
    group: 'other',
    label: { ar: 'كيرسيتين', },
  },
  fisetin: {
    key: 'fisetin',
    group: 'other',
    label: { ar: 'فايسيتين', },
  },
  spermidine: {
    key: 'spermidine',
    group: 'other',
    label: { ar: 'سبيرميدين', },
  },

  // — Anti-glycation —
  carnosine: {
    key: 'carnosine',
    group: 'amino',
    label: { ar: 'الكارنوزين', },
  },
  benfotiamine: {
    key: 'benfotiamine',
    group: 'vitamin',
    label: { ar: 'بنفوتيامين (B1 دهني)', },
  },

  // — Skin matrix —
  hyaluronic: {
    key: 'hyaluronic',
    group: 'other',
    label: { ar: 'حمض الهيالورونيك', },
  },
  silica: {
    key: 'silica',
    group: 'mineral',
    label: { ar: 'السيليكا', },
  },
  msm: {
    key: 'msm',
    group: 'other',
    label: { ar: 'MSM (كبريت عضوي)', },
  },

  // — Microbiome precision —
  hmo: {
    key: 'hmo',
    group: 'other',
    label: { ar: 'سكريات حليب الأم (HMO)', },
  },
  akkermansia: {
    key: 'akkermansia',
    group: 'other',
    label: { ar: 'أكرمانسيا مسينيفيلا', },
  },
  butyrate: {
    key: 'butyrate',
    group: 'other',
    label: { ar: 'البوتيرات (SCFA)', },
  },
  glutamine: {
    key: 'glutamine',
    group: 'amino',
    label: { ar: 'L-جلوتامين', },
  },

  // — Hormonal / metabolic —
  inositol: {
    key: 'inositol',
    group: 'other',
    label: { ar: 'إينوزيتول (Myo + DCI)', },
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
    label: { ar: 'بيض', },
    nutrients: ['protein', 'vitaminD', 'vitaminB12', 'biotin', 'iron'],
  },
  chicken: {
    key: 'chicken',
    icon: '🍗',
    label: { ar: 'دجاج', },
    nutrients: ['protein', 'vitaminB6', 'zinc'],
  },
  fish: {
    key: 'fish',
    icon: '🐟',
    label: { ar: 'سمك', },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'iodine'],
    tags: ['fatty'],
  },
  salmon: {
    key: 'salmon',
    icon: '🐠',
    label: { ar: 'سلمون', },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'selenium'],
    tags: ['fatty'],
  },
  beef: {
    key: 'beef',
    icon: '🥩',
    label: { ar: 'لحم بقر', },
    nutrients: ['protein', 'iron', 'zinc', 'vitaminB12'],
  },
  liver: {
    key: 'liver',
    icon: '🫘',
    label: { ar: 'كبدة', },
    nutrients: ['iron', 'vitaminA', 'vitaminB12', 'folate', 'copper'],
  },
  spinach: {
    key: 'spinach',
    icon: '🥬',
    label: { ar: 'سبانخ', },
    nutrients: ['iron', 'folate', 'vitaminK', 'magnesium', 'vitaminA'],
    tags: ['leafy'],
  },
  kale: {
    key: 'kale',
    icon: '🥬',
    label: { ar: 'كرنب أجعد', },
    nutrients: ['vitaminK', 'vitaminC', 'vitaminA', 'calcium'],
    tags: ['leafy'],
  },
  broccoli: {
    key: 'broccoli',
    icon: '🥦',
    label: { ar: 'بروكلي', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  carrot: {
    key: 'carrot',
    icon: '🥕',
    label: { ar: 'جزر', },
    nutrients: ['vitaminA', 'fiber'],
  },
  orange: {
    key: 'orange',
    icon: '🍊',
    label: { ar: 'برتقال', },
    nutrients: ['vitaminC', 'folate', 'fiber'],
    tags: ['citrus'],
  },
  lemon: {
    key: 'lemon',
    icon: '🍋',
    label: { ar: 'ليمون', },
    nutrients: ['vitaminC'],
    tags: ['citrus'],
  },
  strawberry: {
    key: 'strawberry',
    icon: '🍓',
    label: { ar: 'فراولة', },
    nutrients: ['vitaminC', 'fiber'],
  },
  banana: {
    key: 'banana',
    icon: '🍌',
    label: { ar: 'موز', },
    nutrients: ['vitaminB6', 'magnesium', 'fiber'],
  },
  avocado: {
    key: 'avocado',
    icon: '🥑',
    label: { ar: 'أفوكادو', },
    nutrients: ['vitaminE', 'vitaminK', 'folate', 'fiber'],
    tags: ['fatty'],
  },
  almonds: {
    key: 'almonds',
    icon: '🌰',
    label: { ar: 'لوز', },
    nutrients: ['vitaminE', 'magnesium', 'protein', 'fiber'],
    tags: ['fatty'],
  },
  walnuts: {
    key: 'walnuts',
    icon: '🌰',
    label: { ar: 'جوز', },
    nutrients: ['omega3', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  yogurt: {
    key: 'yogurt',
    icon: '🥣',
    label: { ar: 'زبادي', },
    nutrients: ['calcium', 'protein', 'probiotics', 'vitaminB12'],
    tags: ['dairy'],
  },
  milk: {
    key: 'milk',
    icon: '🥛',
    label: { ar: 'حليب', },
    nutrients: ['calcium', 'protein', 'vitaminD', 'vitaminB12'],
    tags: ['dairy'],
  },
  cheese: {
    key: 'cheese',
    icon: '🧀',
    label: { ar: 'جبن', },
    nutrients: ['calcium', 'protein', 'vitaminB12'],
    tags: ['dairy'],
  },
  oats: {
    key: 'oats',
    icon: '🥣',
    label: { ar: 'شوفان', },
    nutrients: ['fiber', 'magnesium', 'iron', 'protein'],
  },
  rice: {
    key: 'rice',
    icon: '🍚',
    label: { ar: 'أرز', },
    nutrients: ['magnesium'],
  },
  beans: {
    key: 'beans',
    icon: '🫘',
    label: { ar: 'فاصولياء', },
    nutrients: ['protein', 'iron', 'folate', 'fiber', 'magnesium'],
  },
  lentils: {
    key: 'lentils',
    icon: '🫘',
    label: { ar: 'عدس', },
    nutrients: ['protein', 'iron', 'folate', 'fiber'],
  },
  dates: {
    key: 'dates',
    icon: '🌴',
    label: { ar: 'تمر', },
    nutrients: ['fiber', 'magnesium', 'iron'],
  },
  honey: {
    key: 'honey',
    icon: '🍯',
    label: { ar: 'عسل', },
    nutrients: [],
  },
  coffee: {
    key: 'coffee',
    icon: '☕',
    label: { ar: 'قهوة', },
    nutrients: ['caffeine'],
    tags: ['caffeine'],
  },
  tea: {
    key: 'tea',
    icon: '🍵',
    label: { ar: 'شاي', },
    nutrients: ['caffeine'],
    tags: ['caffeine'],
  },
  water: {
    key: 'water',
    icon: '💧',
    label: { ar: 'ماء', },
    nutrients: [],
  },
  olive_oil: {
    key: 'olive_oil',
    icon: '🫒',
    label: { ar: 'زيت زيتون', },
    nutrients: ['vitaminE'],
    tags: ['fatty'],
  },

  // ===== Fruits =====
  apple: {
    key: 'apple', icon: '🍎',
    label: { ar: 'تفاح', },
    nutrients: ['fiber', 'vitaminC', 'antioxidants', 'polyphenols'],
  },
  pear: {
    key: 'pear', icon: '🍐',
    label: { ar: 'كمثرى', },
    nutrients: ['fiber', 'vitaminC', 'potassium'],
  },
  grape: {
    key: 'grape', icon: '🍇',
    label: { ar: 'عنب', },
    nutrients: ['vitaminK', 'antioxidants', 'polyphenols'],
  },
  watermelon: {
    key: 'watermelon', icon: '🍉',
    label: { ar: 'بطيخ', },
    nutrients: ['vitaminC', 'vitaminA', 'lycopene', 'potassium'],
  },
  melon: {
    key: 'melon', icon: '🍈',
    label: { ar: 'شمام', },
    nutrients: ['vitaminC', 'vitaminA', 'potassium'],
  },
  pineapple: {
    key: 'pineapple', icon: '🍍',
    label: { ar: 'أناناس', },
    nutrients: ['vitaminC', 'manganese', 'fiber'],
  },
  mango: {
    key: 'mango', icon: '🥭',
    label: { ar: 'مانجو', },
    nutrients: ['vitaminC', 'vitaminA', 'folate', 'antioxidants'],
  },
  peach: {
    key: 'peach', icon: '🍑',
    label: { ar: 'خوخ', },
    nutrients: ['vitaminC', 'vitaminA', 'potassium', 'fiber'],
  },
  cherry: {
    key: 'cherry', icon: '🍒',
    label: { ar: 'كرز', },
    nutrients: ['vitaminC', 'antioxidants', 'polyphenols', 'potassium'],
  },
  blueberry: {
    key: 'blueberry', icon: '🫐',
    label: { ar: 'توت أزرق', },
    nutrients: ['vitaminC', 'vitaminK', 'antioxidants', 'polyphenols', 'fiber'],
  },
  raspberry: {
    key: 'raspberry', icon: '🍇',
    label: { ar: 'توت أحمر', },
    nutrients: ['vitaminC', 'fiber', 'antioxidants', 'manganese'],
  },
  pomegranate: {
    key: 'pomegranate', icon: '🥭',
    label: { ar: 'رمان', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'antioxidants', 'polyphenols'],
  },
  fig: {
    key: 'fig', icon: '🌰',
    label: { ar: 'تين', },
    nutrients: ['fiber', 'calcium', 'potassium', 'magnesium'],
  },
  apricot: {
    key: 'apricot', icon: '🍑',
    label: { ar: 'مشمش', },
    nutrients: ['vitaminA', 'vitaminC', 'potassium', 'fiber'],
  },
  kiwi: {
    key: 'kiwi', icon: '🥝',
    label: { ar: 'كيوي', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  papaya: {
    key: 'papaya', icon: '🥭',
    label: { ar: 'بابايا', },
    nutrients: ['vitaminC', 'vitaminA', 'folate', 'fiber'],
  },
  guava: {
    key: 'guava', icon: '🍈',
    label: { ar: 'جوافة', },
    nutrients: ['vitaminC', 'fiber', 'potassium', 'folate'],
  },
  grapefruit: {
    key: 'grapefruit', icon: '🍊',
    label: { ar: 'جريب فروت', },
    nutrients: ['vitaminC', 'vitaminA', 'fiber', 'lycopene'],
    tags: ['citrus'],
  },
  raisins: {
    key: 'raisins', icon: '🍇',
    label: { ar: 'زبيب', },
    nutrients: ['iron', 'potassium', 'fiber', 'antioxidants'],
  },
  prunes: {
    key: 'prunes', icon: '🍑',
    label: { ar: 'خوخ مجفف', },
    nutrients: ['fiber', 'vitaminK', 'potassium', 'iron'],
  },

  // ===== Vegetables =====
  tomato: {
    key: 'tomato', icon: '🍅',
    label: { ar: 'طماطم', },
    nutrients: ['vitaminC', 'vitaminK', 'lycopene', 'potassium', 'folate'],
  },
  cucumber: {
    key: 'cucumber', icon: '🥒',
    label: { ar: 'خيار', },
    nutrients: ['vitaminK', 'potassium'],
  },
  bell_pepper: {
    key: 'bell_pepper', icon: '🫑',
    label: { ar: 'فلفل ملون', },
    nutrients: ['vitaminC', 'vitaminA', 'vitaminB6', 'folate', 'antioxidants'],
  },
  onion: {
    key: 'onion', icon: '🧅',
    label: { ar: 'بصل', },
    nutrients: ['vitaminC', 'folate', 'fiber', 'polyphenols'],
  },
  garlic: {
    key: 'garlic', icon: '🧄',
    label: { ar: 'ثوم', },
    nutrients: ['vitaminC', 'vitaminB6', 'manganese', 'antioxidants'],
  },
  potato: {
    key: 'potato', icon: '🥔',
    label: { ar: 'بطاطس', },
    nutrients: ['vitaminC', 'vitaminB6', 'potassium', 'carbs', 'fiber'],
  },
  sweet_potato: {
    key: 'sweet_potato', icon: '🍠',
    label: { ar: 'بطاطا حلوة', },
    nutrients: ['vitaminA', 'vitaminC', 'potassium', 'fiber', 'manganese'],
  },
  pumpkin: {
    key: 'pumpkin', icon: '🎃',
    label: { ar: 'قرع', },
    nutrients: ['vitaminA', 'vitaminC', 'potassium', 'fiber'],
  },
  zucchini: {
    key: 'zucchini', icon: '🥒',
    label: { ar: 'كوسا', },
    nutrients: ['vitaminC', 'vitaminA', 'potassium', 'manganese'],
  },
  eggplant: {
    key: 'eggplant', icon: '🍆',
    label: { ar: 'باذنجان', },
    nutrients: ['fiber', 'manganese', 'antioxidants', 'polyphenols'],
  },
  cauliflower: {
    key: 'cauliflower', icon: '🥦',
    label: { ar: 'قرنبيط', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber', 'choline'],
  },
  cabbage: {
    key: 'cabbage', icon: '🥬',
    label: { ar: 'ملفوف', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
    tags: ['leafy'],
  },
  brussels_sprouts: {
    key: 'brussels_sprouts', icon: '🥬',
    label: { ar: 'كرنب بروكسل', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  asparagus: {
    key: 'asparagus', icon: '🌿',
    label: { ar: 'هليون', },
    nutrients: ['folate', 'vitaminK', 'vitaminC', 'fiber'],
  },
  green_beans: {
    key: 'green_beans', icon: '🫛',
    label: { ar: 'فاصولياء خضراء', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  peas: {
    key: 'peas', icon: '🫛',
    label: { ar: 'بازلاء', },
    nutrients: ['protein', 'vitaminK', 'vitaminC', 'folate', 'fiber', 'iron'],
  },
  celery: {
    key: 'celery', icon: '🥬',
    label: { ar: 'كرفس', },
    nutrients: ['vitaminK', 'potassium', 'fiber'],
    tags: ['leafy'],
  },
  arugula: {
    key: 'arugula', icon: '🥬',
    label: { ar: 'جرجير', },
    nutrients: ['vitaminK', 'vitaminA', 'folate', 'calcium'],
    tags: ['leafy'],
  },
  lettuce: {
    key: 'lettuce', icon: '🥬',
    label: { ar: 'خس', },
    nutrients: ['vitaminK', 'vitaminA', 'folate'],
    tags: ['leafy'],
  },
  parsley: {
    key: 'parsley', icon: '🌿',
    label: { ar: 'بقدونس', },
    nutrients: ['vitaminK', 'vitaminC', 'vitaminA', 'iron'],
    tags: ['leafy'],
  },
  cilantro: {
    key: 'cilantro', icon: '🌿',
    label: { ar: 'كزبرة', },
    nutrients: ['vitaminK', 'vitaminA', 'vitaminC', 'antioxidants'],
    tags: ['leafy'],
  },
  mint: {
    key: 'mint', icon: '🌿',
    label: { ar: 'نعناع', },
    nutrients: ['vitaminA', 'iron', 'manganese', 'antioxidants'],
    tags: ['leafy'],
  },
  beet: {
    key: 'beet', icon: '🫜',
    label: { ar: 'شمندر', },
    nutrients: ['folate', 'manganese', 'potassium', 'iron', 'fiber'],
  },
  radish: {
    key: 'radish', icon: '🌶️',
    label: { ar: 'فجل', },
    nutrients: ['vitaminC', 'folate', 'potassium'],
  },
  okra: {
    key: 'okra', icon: '🌿',
    label: { ar: 'بامية', },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'magnesium', 'fiber'],
  },
  artichoke: {
    key: 'artichoke', icon: '🌿',
    label: { ar: 'خرشوف', },
    nutrients: ['folate', 'vitaminK', 'vitaminC', 'fiber', 'magnesium'],
  },
  corn: {
    key: 'corn', icon: '🌽',
    label: { ar: 'ذرة', },
    nutrients: ['fiber', 'vitaminB1', 'folate', 'lutein', 'carbs'],
  },
  mushroom: {
    key: 'mushroom', icon: '🍄',
    label: { ar: 'فطر', },
    nutrients: ['vitaminD', 'vitaminB2', 'vitaminB3', 'selenium', 'copper'],
  },

  // ===== Proteins (meat & poultry) =====
  turkey: {
    key: 'turkey', icon: '🦃',
    label: { ar: 'ديك رومي', },
    nutrients: ['protein', 'vitaminB3', 'vitaminB6', 'selenium', 'zinc'],
  },
  lamb: {
    key: 'lamb', icon: '🐑',
    label: { ar: 'لحم ضأن', },
    nutrients: ['protein', 'iron', 'zinc', 'vitaminB12', 'vitaminB3'],
  },
  duck: {
    key: 'duck', icon: '🦆',
    label: { ar: 'بط', },
    nutrients: ['protein', 'iron', 'vitaminB12', 'selenium'],
    tags: ['fatty'],
  },

  // ===== Seafood =====
  tuna: {
    key: 'tuna', icon: '🐟',
    label: { ar: 'تونة', },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'selenium'],
  },
  sardines: {
    key: 'sardines', icon: '🐟',
    label: { ar: 'سردين', },
    nutrients: ['protein', 'omega3', 'vitaminD', 'calcium', 'vitaminB12'],
    tags: ['fatty'],
  },
  mackerel: {
    key: 'mackerel', icon: '🐟',
    label: { ar: 'ماكريل', },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'selenium'],
    tags: ['fatty'],
  },
  shrimp: {
    key: 'shrimp', icon: '🦐',
    label: { ar: 'جمبري', },
    nutrients: ['protein', 'iodine', 'selenium', 'vitaminB12', 'zinc'],
  },
  oyster: {
    key: 'oyster', icon: '🦪',
    label: { ar: 'محار', },
    nutrients: ['zinc', 'iron', 'vitaminB12', 'copper', 'selenium', 'protein'],
  },

  // ===== Eggs / Dairy =====
  egg_yolk: {
    key: 'egg_yolk', icon: '🍳',
    label: { ar: 'صفار البيض', },
    nutrients: ['vitaminD', 'vitaminA', 'choline', 'biotin', 'lutein'],
    tags: ['fatty'],
  },
  cottage_cheese: {
    key: 'cottage_cheese', icon: '🧀',
    label: { ar: 'جبنة قريش', },
    nutrients: ['protein', 'calcium', 'vitaminB12', 'phosphorus'],
    tags: ['dairy'],
  },
  feta: {
    key: 'feta', icon: '🧀',
    label: { ar: 'فيتا', },
    nutrients: ['calcium', 'protein', 'vitaminB12', 'phosphorus'],
    tags: ['dairy'],
  },
  kefir: {
    key: 'kefir', icon: '🥛',
    label: { ar: 'كفير', },
    nutrients: ['probiotics', 'calcium', 'protein', 'vitaminB12'],
    tags: ['dairy'],
  },
  butter: {
    key: 'butter', icon: '🧈',
    label: { ar: 'زبدة', },
    nutrients: ['vitaminA', 'vitaminD', 'vitaminK'],
    tags: ['fatty', 'dairy'],
  },
  ghee: {
    key: 'ghee', icon: '🧈',
    label: { ar: 'سمن', },
    nutrients: ['vitaminA', 'vitaminE', 'vitaminK'],
    tags: ['fatty', 'dairy'],
  },

  // ===== Plant proteins / Legumes =====
  chickpeas: {
    key: 'chickpeas', icon: '🫘',
    label: { ar: 'حمص', },
    nutrients: ['protein', 'iron', 'folate', 'fiber', 'magnesium', 'manganese'],
  },
  black_beans: {
    key: 'black_beans', icon: '🫘',
    label: { ar: 'فاصولياء سوداء', },
    nutrients: ['protein', 'iron', 'folate', 'fiber', 'magnesium'],
  },
  edamame: {
    key: 'edamame', icon: '🫛',
    label: { ar: 'إدامامي', },
    nutrients: ['protein', 'folate', 'vitaminK', 'iron', 'fiber'],
  },
  tofu: {
    key: 'tofu', icon: '🍱',
    label: { ar: 'توفو', },
    nutrients: ['protein', 'calcium', 'iron', 'magnesium'],
  },
  tempeh: {
    key: 'tempeh', icon: '🍱',
    label: { ar: 'تيمبيه', },
    nutrients: ['protein', 'iron', 'calcium', 'probiotics', 'magnesium'],
  },
  hummus: {
    key: 'hummus', icon: '🥣',
    label: { ar: 'حمص بطحينة', },
    nutrients: ['protein', 'fiber', 'iron', 'folate', 'magnesium'],
  },
  falafel: {
    key: 'falafel', icon: '🧆',
    label: { ar: 'فلافل', },
    nutrients: ['protein', 'fiber', 'iron', 'folate'],
  },

  // ===== Nuts & Seeds =====
  pistachios: {
    key: 'pistachios', icon: '🌰',
    label: { ar: 'فستق', },
    nutrients: ['protein', 'vitaminB6', 'fiber', 'potassium', 'antioxidants'],
    tags: ['fatty'],
  },
  cashews: {
    key: 'cashews', icon: '🌰',
    label: { ar: 'كاجو', },
    nutrients: ['protein', 'magnesium', 'copper', 'iron', 'zinc'],
    tags: ['fatty'],
  },
  hazelnuts: {
    key: 'hazelnuts', icon: '🌰',
    label: { ar: 'بندق', },
    nutrients: ['vitaminE', 'manganese', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  brazil_nuts: {
    key: 'brazil_nuts', icon: '🌰',
    label: { ar: 'جوز برازيلي', },
    nutrients: ['selenium', 'vitaminE', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  peanuts: {
    key: 'peanuts', icon: '🥜',
    label: { ar: 'فول سوداني', },
    nutrients: ['protein', 'vitaminB3', 'folate', 'magnesium', 'vitaminE'],
    tags: ['fatty'],
  },
  pecans: {
    key: 'pecans', icon: '🌰',
    label: { ar: 'بقان', },
    nutrients: ['manganese', 'zinc', 'fiber', 'antioxidants'],
    tags: ['fatty'],
  },
  chia_seeds: {
    key: 'chia_seeds', icon: '🌱',
    label: { ar: 'بذور الشيا', },
    nutrients: ['omega3', 'fiber', 'calcium', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  flax_seeds: {
    key: 'flax_seeds', icon: '🌱',
    label: { ar: 'بذور الكتان', },
    nutrients: ['omega3', 'fiber', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  pumpkin_seeds: {
    key: 'pumpkin_seeds', icon: '🌱',
    label: { ar: 'بذور اليقطين', },
    nutrients: ['zinc', 'magnesium', 'iron', 'protein', 'manganese'],
    tags: ['fatty'],
  },
  sunflower_seeds: {
    key: 'sunflower_seeds', icon: '🌻',
    label: { ar: 'بذور دوار الشمس', },
    nutrients: ['vitaminE', 'magnesium', 'selenium', 'protein'],
    tags: ['fatty'],
  },
  sesame: {
    key: 'sesame', icon: '🌱',
    label: { ar: 'سمسم', },
    nutrients: ['calcium', 'iron', 'magnesium', 'zinc', 'copper'],
    tags: ['fatty'],
  },
  tahini: {
    key: 'tahini', icon: '🥣',
    label: { ar: 'طحينة', },
    nutrients: ['calcium', 'iron', 'magnesium', 'protein', 'vitaminB1'],
    tags: ['fatty'],
  },

  // ===== Grains & Starches =====
  brown_rice: {
    key: 'brown_rice', icon: '🍚',
    label: { ar: 'أرز بني', },
    nutrients: ['carbs', 'fiber', 'magnesium', 'manganese', 'vitaminB3'],
  },
  quinoa: {
    key: 'quinoa', icon: '🌾',
    label: { ar: 'كينوا', },
    nutrients: ['protein', 'fiber', 'magnesium', 'iron', 'folate', 'manganese'],
  },
  bulgur: {
    key: 'bulgur', icon: '🌾',
    label: { ar: 'برغل', },
    nutrients: ['fiber', 'protein', 'magnesium', 'iron', 'carbs'],
  },
  couscous: {
    key: 'couscous', icon: '🌾',
    label: { ar: 'كسكسي', },
    nutrients: ['protein', 'selenium', 'carbs'],
  },
  barley: {
    key: 'barley', icon: '🌾',
    label: { ar: 'شعير', },
    nutrients: ['fiber', 'magnesium', 'manganese', 'selenium', 'carbs'],
  },
  whole_bread: {
    key: 'whole_bread', icon: '🍞',
    label: { ar: 'خبز كامل الحبة', },
    nutrients: ['fiber', 'iron', 'magnesium', 'vitaminB1', 'carbs'],
  },
  pita: {
    key: 'pita', icon: '🫓',
    label: { ar: 'خبز عربي', },
    nutrients: ['carbs', 'iron', 'folate'],
  },
  pasta: {
    key: 'pasta', icon: '🍝',
    label: { ar: 'مكرونة', },
    nutrients: ['carbs', 'protein', 'vitaminB1', 'folate'],
  },

  // ===== Beverages =====
  green_tea: {
    key: 'green_tea', icon: '🍵',
    label: { ar: 'شاي أخضر', },
    nutrients: ['caffeine', 'antioxidants', 'polyphenols'],
    tags: ['caffeine'],
  },
  black_tea: {
    key: 'black_tea', icon: '🍵',
    label: { ar: 'شاي أسود', },
    nutrients: ['caffeine', 'antioxidants', 'polyphenols'],
    tags: ['caffeine'],
  },
  herbal_tea: {
    key: 'herbal_tea', icon: '🍵',
    label: { ar: 'شاي أعشاب', },
    nutrients: ['antioxidants'],
  },
  matcha: {
    key: 'matcha', icon: '🍵',
    label: { ar: 'ماتشا', },
    nutrients: ['caffeine', 'antioxidants', 'polyphenols', 'vitaminC'],
    tags: ['caffeine'],
  },
  orange_juice: {
    key: 'orange_juice', icon: '🧃',
    label: { ar: 'عصير برتقال', },
    nutrients: ['vitaminC', 'folate', 'potassium'],
    tags: ['citrus'],
  },
  pomegranate_juice: {
    key: 'pomegranate_juice', icon: '🧃',
    label: { ar: 'عصير رمان', },
    nutrients: ['antioxidants', 'polyphenols', 'vitaminC', 'potassium'],
  },
  coconut_water: {
    key: 'coconut_water', icon: '🥥',
    label: { ar: 'ماء جوز الهند', },
    nutrients: ['potassium', 'magnesium'],
  },

  // ===== Fats & Oils =====
  coconut_oil: {
    key: 'coconut_oil', icon: '🥥',
    label: { ar: 'زيت جوز الهند', },
    nutrients: [],
    tags: ['fatty'],
  },
  fish_oil: {
    key: 'fish_oil', icon: '🐟',
    label: { ar: 'زيت السمك', },
    nutrients: ['omega3', 'vitaminD', 'vitaminA'],
    tags: ['fatty'],
  },
  dark_chocolate: {
    key: 'dark_chocolate', icon: '🍫',
    label: { ar: 'شوكولاتة داكنة', },
    nutrients: ['iron', 'magnesium', 'copper', 'antioxidants', 'polyphenols', 'caffeine'],
    tags: ['fatty'],
  },

  // ===== Spices / Herbs =====
  turmeric: {
    key: 'turmeric', icon: '🌿',
    label: { ar: 'كركم', },
    nutrients: ['antioxidants', 'manganese', 'iron'],
  },
  ginger: {
    key: 'ginger', icon: '🌿',
    label: { ar: 'زنجبيل', },
    nutrients: ['antioxidants', 'manganese'],
  },
  cinnamon: {
    key: 'cinnamon', icon: '🌿',
    label: { ar: 'قرفة', },
    nutrients: ['antioxidants', 'manganese', 'chromium'],
  },
  black_seed: {
    key: 'black_seed', icon: '🌱',
    label: { ar: 'حبة البركة', },
    nutrients: ['antioxidants', 'iron', 'calcium'],
  },
  saffron: {
    key: 'saffron', icon: '🌸',
    label: { ar: 'زعفران', },
    nutrients: ['antioxidants', 'manganese'],
  },

  // ===== Middle-Eastern staples =====
  labneh: {
    key: 'labneh', icon: '🥣',
    label: { ar: 'لبنة', },
    nutrients: ['protein', 'calcium', 'probiotics', 'vitaminB12'],
    tags: ['dairy'],
  },
  zaatar: {
    key: 'zaatar', icon: '🌿',
    label: { ar: 'زعتر', },
    nutrients: ['iron', 'calcium', 'antioxidants', 'vitaminK'],
  },
  freekeh: {
    key: 'freekeh', icon: '🌾',
    label: { ar: 'فريكة', },
    nutrients: ['protein', 'fiber', 'iron', 'magnesium'],
  },
  molokhia: {
    key: 'molokhia', icon: '🥬',
    label: { ar: 'ملوخية', },
    nutrients: ['vitaminA', 'vitaminC', 'calcium', 'iron', 'folate'],
    tags: ['leafy'],
  },
  fava_beans: {
    key: 'fava_beans', icon: '🫘',
    label: { ar: 'فول', },
    nutrients: ['protein', 'folate', 'iron', 'manganese', 'fiber'],
  },
  kishk: {
    key: 'kishk', icon: '🥣',
    label: { ar: 'كشك', },
    nutrients: ['protein', 'probiotics', 'calcium', 'vitaminB12'],
    tags: ['dairy'],
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
    },
  },
  {
    id: 'zinc-copper',
    pair: ['zinc', 'copper'],
    severity: 'warn',
    message: {
      ar: 'جرعات الزنك العالية قد تستنزف النحاس على المدى الطويل.',
    },
  },
  {
    id: 'zinc-iron',
    pair: ['zinc', 'iron'],
    severity: 'info',
    message: {
      ar: 'الزنك والحديد يتنافسان على الامتصاص — تناولهما في وقتين مختلفين.',
    },
  },
  {
    id: 'calcium-magnesium',
    pair: ['calcium', 'magnesium'],
    severity: 'info',
    message: {
      ar: 'جرعات عالية متزامنة من الكالسيوم والمغنيسيوم قد تقلل امتصاص كل منهما.',
    },
  },
  {
    id: 'vitaminC-iron',
    pair: ['vitaminC', 'iron'],
    severity: 'info',
    message: {
      ar: 'فيتامين سي يعزز امتصاص الحديد النباتي — تناولهما معاً مفيد.',
    },
  },
  {
    id: 'vitaminD-calcium',
    pair: ['vitaminD', 'calcium'],
    severity: 'info',
    message: {
      ar: 'فيتامين د يساعد في امتصاص الكالسيوم — تركيبة متكاملة.',
    },
  },
  {
    id: 'caffeine-iron',
    pair: ['caffeine', 'iron'],
    severity: 'warn',
    message: {
      ar: 'القهوة والشاي يقللان امتصاص الحديد إذا شربا معه.',
    },
  },
  {
    id: 'caffeine-calcium',
    pair: ['caffeine', 'calcium'],
    severity: 'info',
    message: {
      ar: 'الإفراط في الكافيين قد يقلل امتصاص الكالسيوم.',
    },
  },
];

export const DISCLAIMER: Record<Lang, string> = {
  ar: 'هذه المعلومات عامة لأغراض تثقيفية فقط وليست استشارة طبية. راجع طبيبك قبل تعديل المكملات.',
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
  domain:
    | 'bone' | 'skin' | 'hair' | 'energy' | 'immunity' | 'sleep'
    | 'heart' | 'gut' | 'mood' | 'blood'
    | 'methylation' | 'mitochondria' | 'cognition'
    | 'longevity' | 'detox' | 'hormones';
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
    title: { ar: 'مثلث العظام: د + ك + كالسيوم', },
    benefits: {
      ar: [
        'فيتامين د يفتح امتصاص الكالسيوم في الأمعاء',
        'فيتامين ك2 يوجّه الكالسيوم إلى العظام لا الشرايين',
        'دعم كثافة العظام وصحة الأسنان على المدى الطويل',
      ],
    },
    howTo: {
      ar: 'تناولهم معاً مع وجبة فيها دهون (بيض، أفوكادو، زيت زيتون).',
    },
    foodBoosters: ['eggs', 'salmon', 'avocado', 'olive_oil', 'cheese'],
  },
  {
    id: 'c-iron',
    nutrients: ['vitaminC', 'iron'],
    evidence: 'strong',
    domain: 'blood',
    title: { ar: 'سي + حديد: امتصاص أعلى', },
    benefits: {
      ar: [
        'فيتامين سي يضاعف امتصاص الحديد النباتي حتى 3 مرات',
        'دعم تكوين خلايا الدم الحمراء وتقليل الإرهاق',
        'تحسن مستوى الطاقة خلال أسابيع لمن يعاني نقص الحديد',
      ],
    },
    howTo: {
      ar: 'تناول الحديد على معدة فارغة مع كوب عصير برتقال أو ليمون.',
    },
    foodBoosters: ['orange', 'lemon', 'strawberry', 'spinach', 'lentils'],
  },
  {
    id: 'mg-b6',
    nutrients: ['magnesium', 'vitaminB6'],
    evidence: 'strong',
    domain: 'mood',
    title: { ar: 'مغنيسيوم + ب6: هدوء وتركيز', },
    benefits: {
      ar: [
        'ب6 يزيد دخول المغنيسيوم إلى الخلية',
        'تخفيف القلق والتوتر بشكل ملموس',
        'تحسن جودة النوم العميق',
      ],
    },
    howTo: {
      ar: 'الجرعة المسائية قبل النوم بساعة، مع كوب ماء.',
    },
    foodBoosters: ['banana', 'almonds', 'spinach', 'oats'],
  },
  {
    id: 'zn-vita-skin',
    nutrients: ['zinc', 'vitaminA'],
    evidence: 'moderate',
    domain: 'skin',
    title: { ar: 'زنك + فيتامين أ: بشرة هادئة', },
    benefits: {
      ar: [
        'تنظيم إفراز الدهون وتقليل الحبوب',
        'تسريع التئام الجلد والندبات الخفيفة',
        'دعم حاجز البشرة ومقاومة الالتهاب',
      ],
    },
    howTo: {
      ar: 'الزنك مع وجبة لتفادي الغثيان، فيتامين أ مع دهون.',
    },
    foodBoosters: ['liver', 'carrot', 'eggs', 'salmon'],
  },
  {
    id: 'biotin-zn-collagen',
    nutrients: ['biotin', 'zinc', 'collagen'],
    evidence: 'moderate',
    domain: 'hair',
    title: { ar: 'حزمة الشعر: بيوتين + زنك + كولاجين', },
    benefits: {
      ar: [
        'تقوية بصيلات الشعر وتقليل التساقط الموسمي',
        'دعم بنية الكيراتين وزيادة لمعان الشعر',
        'تحسن في الأظافر والبشرة كأثر جانبي',
      ],
    },
    howTo: {
      ar: 'الكولاجين صباحاً مع فيتامين سي، الزنك مساءً مع وجبة.',
    },
    foodBoosters: ['eggs', 'salmon', 'walnuts', 'beans'],
  },
  {
    id: 'omega3-vite',
    nutrients: ['omega3', 'vitaminE'],
    evidence: 'strong',
    domain: 'heart',
    title: { ar: 'أوميغا-3 + فيتامين هـ', },
    benefits: {
      ar: [
        'فيتامين هـ يحمي أوميغا-3 من الأكسدة في الجسم',
        'دعم صحة القلب والأوعية الدموية',
        'تقليل الالتهاب المزمن في المفاصل والبشرة',
      ],
    },
    howTo: {
      ar: 'كلاهما مع وجبة دسمة في نفس الوقت.',
    },
    foodBoosters: ['salmon', 'walnuts', 'almonds', 'olive_oil', 'avocado'],
  },
  {
    id: 'iron-folate-b12',
    nutrients: ['iron', 'folate', 'vitaminB12'],
    evidence: 'strong',
    domain: 'blood',
    title: { ar: 'ثلاثي تكوين الدم', },
    benefits: {
      ar: [
        'تكوين خلايا دم حمراء صحية وكاملة الوظيفة',
        'علاج فعّال لفقر الدم الغذائي',
        'تحسن في التركيز والطاقة الذهنية',
      ],
    },
    howTo: {
      ar: 'الحديد على الريق، ب12 والفوليك أي وقت — أضف فيتامين سي معهم.',
    },
    foodBoosters: ['liver', 'spinach', 'beans', 'lentils', 'beef'],
  },
  {
    id: 'mg-zn-sleep',
    nutrients: ['magnesium', 'zinc'],
    evidence: 'moderate',
    domain: 'sleep',
    title: { ar: 'مغنيسيوم + زنك: نوم أعمق', },
    benefits: {
      ar: [
        'تنظيم هرمون الميلاتونين الطبيعي',
        'تقليل الاستيقاظ الليلي',
        'استرخاء عضلي وتعافٍ أفضل بعد المجهود',
      ],
    },
    howTo: {
      ar: 'كلاهما مع وجبة العشاء، قبل النوم بساعة على الأقل.',
    },
    foodBoosters: ['almonds', 'oats', 'beef', 'beans'],
  },
  {
    id: 'collagen-c',
    nutrients: ['collagen', 'vitaminC'],
    evidence: 'strong',
    domain: 'skin',
    title: { ar: 'كولاجين + فيتامين سي', },
    benefits: {
      ar: [
        'فيتامين سي شرط أساسي لتكوين الكولاجين الجديد',
        'تحسن مرونة البشرة خلال 8-12 أسبوع',
        'دعم المفاصل والأوتار',
      ],
    },
    howTo: {
      ar: 'الكولاجين صباحاً مع كوب عصير حمضيات أو حبة برتقال.',
    },
    foodBoosters: ['orange', 'strawberry', 'lemon', 'broccoli'],
  },
  {
    id: 'probiotics-fiber',
    nutrients: ['probiotics', 'fiber'],
    evidence: 'strong',
    domain: 'gut',
    title: { ar: 'بروبيوتيك + ألياف', },
    benefits: {
      ar: [
        'الألياف غذاء البكتيريا النافعة (بريبيوتيك)',
        'تحسن الهضم وانتظام الأمعاء',
        'دعم المناعة وتقليل الانتفاخ',
      ],
    },
    howTo: {
      ar: 'البروبيوتيك صباحاً قبل الفطور، مع وجبات غنية بالألياف يومياً.',
    },
    foodBoosters: ['oats', 'beans', 'lentils', 'broccoli', 'avocado'],
  },
  {
    id: 'd-immune',
    nutrients: ['vitaminD', 'vitaminC', 'zinc'],
    evidence: 'moderate',
    domain: 'immunity',
    title: { ar: 'حزمة المناعة', },
    benefits: {
      ar: [
        'تقليل مدة وحدة نزلات البرد',
        'دعم خلايا المناعة المختلفة في وقت واحد',
        'يفيد بشكل خاص في الشتاء وقلة الشمس',
      ],
    },
    howTo: {
      ar: 'فيتامين د مع وجبة دسمة، سي والزنك موزعين على اليوم.',
    },
    foodBoosters: ['orange', 'salmon', 'eggs', 'kale'],
  },

  // =====================================================================
  // === Atlas-derived deep biochemical axes (advanced clinical stacks) ==
  // =====================================================================

  // --- Methylation axis ---
  {
    id: 'methylation-core',
    nutrients: ['methylfolate', 'methylB12', 'p5p'],
    evidence: 'strong',
    domain: 'methylation',
    title: { ar: 'محور الميثيلة النشط', },
    benefits: {
      ar: [
        'الصيغ النشطة تعبر مباشرة دون الحاجة لإنزيم MTHFR',
        'خفض الهوموسيستين وحماية بطانة الشرايين والأعصاب',
        'دعم تصنيع SAMe — مانح الميثيل العالمي للجسم',
      ],
    },
    howTo: {
      ar: 'صباحاً مع وجبة خفيفة. ابدأ بجرعة منخفضة لتجنب التحفيز المفرط.',
    },
    foodBoosters: ['spinach', 'eggs', 'liver', 'beans'],
  },
  {
    id: 'methylation-bypass',
    nutrients: ['tmg', 'methylfolate', 'methylB12'],
    evidence: 'moderate',
    domain: 'methylation',
    title: { ar: 'مسار TMG البديل للهوموسيستين', },
    benefits: {
      ar: [
        'TMG يفعّل إنزيم BHMT لتحويل الهوموسيستين بمسار ثانٍ',
        'حماية مضاعفة من تكلس الشرايين والإجهاد الميثيلي',
        'دعم وظائف الكبد ومضادات الأكسدة الذاتية',
      ],
    },
    howTo: {
      ar: 'TMG مع الإفطار (500-1000مغ)، الفيتامينات النشطة معه.',
    },
    foodBoosters: ['beetroot', 'spinach', 'eggs'],
  },

  // --- Mitochondrial axis ---
  {
    id: 'mito-trio',
    nutrients: ['coq10', 'pqq', 'magnesium'],
    evidence: 'strong',
    domain: 'mitochondria',
    title: { ar: 'ثلاثي الميتوكوندريا الذهبي', },
    benefits: {
      ar: [
        'CoQ10 يحمل الإلكترونات في سلسلة التنفس الخلوي',
        'PQQ يحفز نمو ميتوكوندريا جديدة (Biogenesis)',
        'المغنيسيوم وقود ATP الفعّال — يضاعف إنتاج الطاقة',
      ],
    },
    howTo: {
      ar: 'CoQ10 و PQQ صباحاً مع دهون. المغنيسيوم مساءً.',
    },
    foodBoosters: ['salmon', 'avocado', 'spinach', 'almonds'],
  },
  {
    id: 'mito-fuel',
    nutrients: ['lcarnitine', 'coq10', 'ala'],
    evidence: 'strong',
    domain: 'energy',
    title: { ar: 'وقود الميتوكوندريا للدهون', },
    benefits: {
      ar: [
        'L-كارنيتين ينقل الأحماض الدهنية إلى داخل الميتوكوندريا',
        'CoQ10 يحرقها بكفاءة كاملة لإنتاج ATP',
        'ALA يعيد تدوير المضادات المؤكسدة داخل الخلية',
      ],
    },
    howTo: {
      ar: 'قبل التمرين بـ 30 دقيقة على معدة شبه فارغة.',
    },
    foodBoosters: ['beef', 'salmon', 'avocado'],
  },

  // --- NAD+ / Longevity ---
  {
    id: 'nad-sirtuin',
    nutrients: ['nmn', 'resveratrol', 'tmg'],
    evidence: 'emerging',
    domain: 'longevity',
    title: { ar: 'محور NAD⁺ والسيرتوينات', },
    benefits: {
      ar: [
        'NMN يرفع مستويات NAD⁺ الخلوية بصورة مباشرة',
        'الريسفيراترول يفعّل إنزيمات السيرتوين SIRT1/3 طول العمر',
        'TMG يعوّض مجموعات الميثيل المستهلكة في الاستقلاب',
      ],
    },
    howTo: {
      ar: 'صباحاً على معدة فارغة قبل الإفطار بـ 20 دقيقة.',
    },
    foodBoosters: ['avocado', 'broccoli', 'salmon'],
  },
  {
    id: 'senolytic-flush',
    nutrients: ['fisetin', 'quercetin', 'spermidine'],
    evidence: 'emerging',
    domain: 'longevity',
    title: { ar: 'سينوليتك: تنظيف الخلايا الهرمة', },
    benefits: {
      ar: [
        'فايسيتين وكيرسيتين يحفّزان موت الخلايا الزومبية المتراكمة',
        'سبيرميدين يفعّل الالتهام الذاتي (Autophagy) لتجديد الخلايا',
        'تحسّن مرونة الأنسجة وانخفاض الالتهاب المزمن',
      ],
    },
    howTo: {
      ar: 'بروتوكول نبضي: 2 يوم أسبوعياً بجرعة عالية مع وجبة دسمة.',
    },
    foodBoosters: ['strawberry', 'apple', 'olive_oil'],
  },

  // --- Anti-glycation ---
  {
    id: 'anti-glycation',
    nutrients: ['carnosine', 'benfotiamine', 'ala'],
    evidence: 'moderate',
    domain: 'longevity',
    title: { ar: 'درع مضاد الجلكزة (AGEs)', },
    benefits: {
      ar: [
        'الكارنوزين يكسر روابط البروتين-سكر قبل تكوينها',
        'البنفوتيامين يحوّل سلائف AGEs بعيداً عن الأنسجة',
        'ALA يحمي الأعصاب الطرفية من تلف السكر العالي',
      ],
    },
    howTo: {
      ar: 'مع الوجبات الغنية بالكربوهيدرات لتقليل الذروة السكرية.',
    },
    foodBoosters: ['broccoli', 'spinach', 'beef'],
  },

  // --- Detox / Glutathione cycle ---
  {
    id: 'gsh-cycle',
    nutrients: ['nac', 'glutathione', 'selenium'],
    evidence: 'strong',
    domain: 'detox',
    title: { ar: 'دورة الجلوتاثيون الكاملة', },
    benefits: {
      ar: [
        'NAC يوفّر السيستين — اللبنة المحدِّدة لتصنيع الجلوتاثيون',
        'السيلينيوم ينشّط إنزيم GPx لإعادة شحن GSH المستهلك',
        'تنظيف الكبد، المعادن الثقيلة، وحماية الميتوكوندريا',
      ],
    },
    howTo: {
      ar: 'NAC على معدة فارغة، الجلوتاثيون تحت اللسان لامتصاص أفضل.',
    },
    foodBoosters: ['broccoli', 'eggs', 'salmon', 'kale'],
  },
  {
    id: 'liver-renewal',
    nutrients: ['milkthistle', 'nac', 'tmg'],
    evidence: 'moderate',
    domain: 'detox',
    title: { ar: 'تجديد الكبد العميق', },
    benefits: {
      ar: [
        'سيليمارين يثبّت أغشية خلايا الكبد ويسرّع تجديدها',
        'NAC يدعم تفكيك السموم في المرحلتين I و II',
        'TMG يقلل تراكم الدهون الكبدية ويحسّن إنزيمات ALT/AST',
      ],
    },
    howTo: {
      ar: 'موزعة على اليوم، أكبر جرعة قبل النوم لعمل الكبد الليلي.',
    },
    foodBoosters: ['beetroot', 'broccoli', 'lemon'],
  },

  // --- HPA / Stress ---
  {
    id: 'hpa-calm',
    nutrients: ['ashwagandha', 'magnesium', 'ltheanine'],
    evidence: 'strong',
    domain: 'mood',
    title: { ar: 'تهدئة محور HPA', },
    benefits: {
      ar: [
        'الأشواغاندا تخفض الكورتيزول المساء حتى 28%',
        'L-ثيانين يرفع موجات ألفا الدماغية — هدوء حاضر',
        'المغنيسيوم يعيد توازن GABA ويهدّئ الجهاز العصبي',
      ],
    },
    howTo: {
      ar: 'الأشواغاندا مساءً، L-ثيانين عند التوتر، المغنيسيوم قبل النوم.',
    },
    foodBoosters: ['oats', 'almonds', 'banana'],
  },
  {
    id: 'adaptogen-drive',
    nutrients: ['rhodiola', 'p5p', 'vitaminB12'],
    evidence: 'moderate',
    domain: 'energy',
    title: { ar: 'دفع التكيف الصباحي', },
    benefits: {
      ar: [
        'روديولا ترفع الأداء العقلي تحت الضغط دون كافيين',
        'P5P يسرّع تصنيع الدوبامين والنورأدرينالين',
        'B12 يضمن توصيل الإشارات العصبية بكفاءة عالية',
      ],
    },
    howTo: {
      ar: 'صباحاً قبل بدء العمل، تجنّب بعد الظهر.',
    },
    foodBoosters: ['eggs', 'salmon', 'spinach'],
  },

  // --- Sleep deep architecture ---
  {
    id: 'sleep-architecture',
    nutrients: ['magnesium', 'glycine', 'ltheanine'],
    evidence: 'strong',
    domain: 'sleep',
    title: { ar: 'هندسة النوم العميق', },
    benefits: {
      ar: [
        'الجلايسين يخفض درجة حرارة الجسم المركزية للدخول السريع للنوم',
        'L-ثيانين يطيل مرحلة النوم العميق وحركة العين السريعة (REM)',
        'المغنيسيوم يهدّئ مستقبلات NMDA المثيرة',
      ],
    },
    howTo: {
      ar: '30-60 دقيقة قبل النوم، بعيداً عن الكافيين والشاشات.',
    },
    foodBoosters: ['oats', 'almonds', 'cherry'],
  },

  // --- Cognition deep ---
  {
    id: 'cog-membrane',
    nutrients: ['omega3', 'phosphatidylserine', 'methylB12'],
    evidence: 'strong',
    domain: 'cognition',
    title: { ar: 'بناء أغشية الدماغ', },
    benefits: {
      ar: [
        'DHA يشكّل 30% من فوسفوليبيدات الدماغ — مرونة المشابك',
        'PS يخفض الكورتيزول ويقوّي الذاكرة العاملة',
        'الميثيل B12 يحمي غمد المايلين من التآكل',
      ],
    },
    howTo: {
      ar: 'مع وجبة الغداء الدسمة لامتصاص مثالي للدهنيات.',
    },
    foodBoosters: ['salmon', 'walnuts', 'eggs', 'avocado'],
  },
  {
    id: 'nerve-growth',
    nutrients: ['lionsmane', 'omega3', 'choline'],
    evidence: 'emerging',
    domain: 'cognition',
    title: { ar: 'نمو الأعصاب (NGF)', },
    benefits: {
      ar: [
        'عرف الأسد يحفّز إفراز عامل نمو الأعصاب NGF و BDNF',
        'DHA يدعم تكوين النواقل العصبية في المشابك',
        'الكولين سلف الأستيل كولين — وقود الذاكرة',
      ],
    },
    howTo: {
      ar: 'صباحاً ومنتصف اليوم، استمرارية 8 أسابيع لأثر ملموس.',
    },
    foodBoosters: ['eggs', 'salmon', 'walnuts'],
  },
  {
    id: 'focus-now',
    nutrients: ['ltheanine', 'caffeine'],
    evidence: 'strong',
    domain: 'cognition',
    title: { ar: 'تركيز فوري بلا توتر', },
    benefits: {
      ar: [
        'الكافيين يرفع اليقظة، L-ثيانين يلغي العصبية',
        'تركيز حاد ومستقر لـ 3-4 ساعات',
        'بدون ارتداد طاقة سلبي',
      ],
    },
    howTo: {
      ar: 'نسبة 2:1 (مثلاً 200مغ ثيانين مع 100مغ كافيين) قبل عمل عميق.',
    },
    foodBoosters: [],
  },

  // --- Microbiome precision ---
  {
    id: 'microbiome-rebuild',
    nutrients: ['hmo', 'akkermansia', 'butyrate', 'fiber'],
    evidence: 'emerging',
    domain: 'gut',
    title: { ar: 'إعادة بناء الميكروبيوم', },
    benefits: {
      ar: [
        'HMOs تغذّي حصرياً سلالات B. infantis الملكية',
        'أكرمانسيا تسمّك طبقة الميوكين الواقية لجدار المعى',
        'البوتيرات يغذّي خلايا القولون مباشرة — وقود مفضّل',
      ],
    },
    howTo: {
      ar: 'بروتوكول 12 أسبوع: HMO يومياً، أكرمانسيا مساءً، ألياف متنوعة.',
    },
    foodBoosters: ['oats', 'beans', 'broccoli', 'avocado'],
  },
  {
    id: 'gut-barrier',
    nutrients: ['glutamine', 'zinc', 'akkermansia'],
    evidence: 'moderate',
    domain: 'gut',
    title: { ar: 'ترميم جدار الأمعاء المتسرّب', },
    benefits: {
      ar: [
        'L-جلوتامين الوقود الأول لخلايا الأمعاء — يرمم الروابط الضيقة',
        'الزنك يقفل النفاذية المعوية ويستعيد البطانة',
        'أكرمانسيا تعيد بناء طبقة المخاط الواقية',
      ],
    },
    howTo: {
      ar: 'الجلوتامين على معدة فارغة (5مغ مرتين)، الزنك مع العشاء.',
    },
    foodBoosters: ['beef', 'eggs', 'oats'],
  },

  // --- Skin matrix deep ---
  {
    id: 'skin-matrix',
    nutrients: ['collagen', 'hyaluronic', 'silica', 'vitaminC'],
    evidence: 'strong',
    domain: 'skin',
    title: { ar: 'مصفوفة البشرة المتكاملة', },
    benefits: {
      ar: [
        'الكولاجين يبني البنية التحتية للأدمة',
        'حمض الهيالورونيك يحبس 1000 ضعف وزنه ماءً في الأنسجة',
        'السيليكا تربط ألياف الكولاجين والإيلاستين بقوة',
        'فيتامين سي شرط إلزامي لتشابك الكولاجين',
      ],
    },
    howTo: {
      ar: 'صباحاً معاً مع عصير حمضيات. 12 أسبوع لنتيجة بصرية.',
    },
    foodBoosters: ['orange', 'strawberry', 'broccoli', 'kiwi'],
  },

  // --- Joint matrix ---
  {
    id: 'joint-shield',
    nutrients: ['collagen', 'msm', 'omega3', 'vitaminC'],
    evidence: 'moderate',
    domain: 'bone',
    title: { ar: 'درع المفاصل والأوتار', },
    benefits: {
      ar: [
        'كولاجين النوع II يبني الغضاريف ويعيد ترطيبها',
        'MSM يوفر الكبريت لجسور ثنائي السلفايد بين البروتينات',
        'أوميغا-3 يخفض الالتهاب المفصلي المزمن',
      ],
    },
    howTo: {
      ar: 'صباحاً معاً، استمرار 8-12 أسبوع لتحسن مرونة المفاصل.',
    },
    foodBoosters: ['salmon', 'broccoli', 'eggs'],
  },

  // --- Cardio shield deep ---
  {
    id: 'cardio-shield',
    nutrients: ['omega3', 'coq10', 'vitaminK', 'magnesium'],
    evidence: 'strong',
    domain: 'heart',
    title: { ar: 'درع القلب الرباعي', },
    benefits: {
      ar: [
        'CoQ10 يدعم عضلة القلب الأعلى استهلاكاً للطاقة في الجسم',
        'فيتامين K2 يمنع تكلس الشرايين ويوجّه الكالسيوم للعظام',
        'أوميغا-3 يخفض الترايغليسريد ويعدّل ضغط الدم',
        'المغنيسيوم ينظّم إيقاع القلب الكهربائي',
      ],
    },
    howTo: {
      ar: 'الجميع مع وجبة دسمة. المغنيسيوم مساءً بعيداً عن CoQ10.',
    },
    foodBoosters: ['salmon', 'avocado', 'olive_oil', 'spinach'],
  },

  // --- Anti-inflammation ---
  {
    id: 'inflam-quench',
    nutrients: ['curcumin', 'omega3', 'quercetin'],
    evidence: 'strong',
    domain: 'immunity',
    title: { ar: 'إطفاء الالتهاب المزمن', },
    benefits: {
      ar: [
        'الكركومين يكبح مسار NF-κB الالتهابي على المستوى الجيني',
        'EPA من أوميغا-3 يصنع رسائل مُحلّلة للالتهاب (Resolvins)',
        'كيرسيتين يثبّت الخلايا الصارية ويمنع إفراز الهيستامين',
      ],
    },
    howTo: {
      ar: 'مع وجبة دسمة وفلفل أسود لرفع امتصاص الكركومين 20 ضعفاً.',
    },
    foodBoosters: ['salmon', 'olive_oil', 'broccoli', 'apple'],
  },

  // --- Hormonal / metabolic ---
  {
    id: 'insulin-sense',
    nutrients: ['chromium', 'magnesium', 'ala', 'inositol'],
    evidence: 'moderate',
    domain: 'hormones',
    title: { ar: 'حساسية الإنسولين العميقة', },
    benefits: {
      ar: [
        'الكروم يقوّي عمل مستقبلات الإنسولين على الخلايا',
        'ALA يحسّن نقل الجلوكوز إلى داخل الخلية بكفاءة',
        'الإينوزيتول يعيد إشارة الإنسولين خاصة لدى متلازمة المبيض المتعدد',
      ],
    },
    howTo: {
      ar: 'مع الوجبات الكربوهيدراتية، الإينوزيتول صباحاً ومساءً.',
    },
    foodBoosters: ['broccoli', 'beans', 'oats'],
  },
  {
    id: 'thyroid-axis',
    nutrients: ['iodine', 'selenium', 'zinc'],
    evidence: 'moderate',
    domain: 'hormones',
    title: { ar: 'محور الغدة الدرقية', },
    benefits: {
      ar: [
        'اليود يبني هرمونات T4 و T3 مباشرة',
        'السيلينيوم ينشّط إنزيم Deiodinase لتحويل T4 الخامل إلى T3 النشط',
        'الزنك ضروري لارتباط T3 بمستقبلاتها النووية',
      ],
    },
    howTo: {
      ar: 'صباحاً مع الإفطار، بعيداً عن مكملات الحديد والكالسيوم بـ 4 ساعات.',
    },
    foodBoosters: ['salmon', 'eggs', 'beef'],
  },

  // --- Female hormonal ---
  {
    id: 'female-balance',
    nutrients: ['inositol', 'vitaminD', 'magnesium', 'p5p'],
    evidence: 'moderate',
    domain: 'hormones',
    title: { ar: 'توازن الهرمونات الأنثوية', },
    benefits: {
      ar: [
        'الإينوزيتول (Myo+DCI بنسبة 40:1) يعيد انتظام التبويض',
        'فيتامين د هرمون-ستيرويدي ينظّم استقبال الإستروجين',
        'P5P يخفّض البرولاكتين وأعراض ما قبل الحيض',
      ],
    },
    howTo: {
      ar: 'الإينوزيتول صباحاً ومساءً، فيتامين د مع وجبة دسمة.',
    },
    foodBoosters: ['salmon', 'eggs', 'avocado', 'spinach'],
  },

  // --- Performance ---
  {
    id: 'muscle-power',
    nutrients: ['creatine', 'protein', 'magnesium'],
    evidence: 'strong',
    domain: 'energy',
    title: { ar: 'قوة العضلات والاستشفاء', },
    benefits: {
      ar: [
        'الكرياتين يضاعف مخزون ATP الفوري في العضلات',
        'البروتين يوفر الأحماض الأمينية لبناء النسيج العضلي',
        'المغنيسيوم يمنع تشنجات العضلات بعد التمرين',
      ],
    },
    howTo: {
      ar: 'الكرياتين 5مغ يومياً (وقت ثابت)، البروتين بعد التمرين.',
    },
    foodBoosters: ['beef', 'eggs', 'salmon', 'beans'],
  },
];

/** Domain → emoji + color hint for the UI. */
export const DOMAIN_META: Record<
  SynergyRule['domain'],
  { icon: string; label: Record<Lang, string> }
> = {
  bone:     { icon: '🦴', label: { ar: 'العظام',   } },
  skin:     { icon: '✨', label: { ar: 'البشرة',      } },
  hair:     { icon: '💇', label: { ar: 'الشعر',      } },
  energy:   { icon: '⚡', label: { ar: 'الطاقة',   } },
  immunity: { icon: '🛡️', label: { ar: 'المناعة', } },
  sleep:    { icon: '🌙', label: { ar: 'النوم',    } },
  heart:    { icon: '❤️', label: { ar: 'القلب',      } },
  gut:      { icon: '🌱', label: { ar: 'الأمعاء',      } },
  mood:     { icon: '🧘', label: { ar: 'المزاج',  } },
  blood:    { icon: '🩸', label: { ar: 'الدم',      } },
  methylation:  { icon: '🧬', label: { ar: 'الميثيلة', } },
  mitochondria: { icon: '🔋', label: { ar: 'الميتوكوندريا', } },
  cognition:    { icon: '🧠', label: { ar: 'الإدراك',    } },
  longevity:    { icon: '♾️', label: { ar: 'طول العمر',    } },
  detox:        { icon: '💧', label: { ar: 'إزالة السموم',   } },
  hormones:     { icon: '⚖️', label: { ar: 'الهرمونات',      } },
};

export const EVIDENCE_LABEL: Record<SynergyRule['evidence'], Record<Lang, string>> = {
  strong:   { ar: 'دليل قوي',   },
  moderate: { ar: 'دليل متوسط', },
  emerging: { ar: 'دليل أولي',        },
};
