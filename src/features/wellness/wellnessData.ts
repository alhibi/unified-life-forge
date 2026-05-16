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
  potassium: {
    key: 'potassium',
    group: 'mineral',
    label: { ar: 'البوتاسيوم', de: 'Kalium' },
  },
  phosphorus: {
    key: 'phosphorus',
    group: 'mineral',
    label: { ar: 'الفوسفور', de: 'Phosphor' },
  },
  manganese: {
    key: 'manganese',
    group: 'mineral',
    label: { ar: 'المنغنيز', de: 'Mangan' },
  },
  chromium: {
    key: 'chromium',
    group: 'mineral',
    label: { ar: 'الكروم', de: 'Chrom' },
  },
  vitaminB1: {
    key: 'vitaminB1',
    group: 'vitamin',
    label: { ar: 'فيتامين ب1 (ثيامين)', de: 'Vitamin B1 (Thiamin)' },
  },
  vitaminB2: {
    key: 'vitaminB2',
    group: 'vitamin',
    label: { ar: 'فيتامين ب2 (ريبوفلافين)', de: 'Vitamin B2 (Riboflavin)' },
  },
  vitaminB3: {
    key: 'vitaminB3',
    group: 'vitamin',
    label: { ar: 'فيتامين ب3 (نياسين)', de: 'Vitamin B3 (Niacin)' },
  },
  vitaminB5: {
    key: 'vitaminB5',
    group: 'vitamin',
    label: { ar: 'فيتامين ب5 (بانتوثينيك)', de: 'Vitamin B5 (Pantothensäure)' },
  },
  choline: {
    key: 'choline',
    group: 'other',
    label: { ar: 'الكولين', de: 'Cholin' },
  },
  lycopene: {
    key: 'lycopene',
    group: 'other',
    label: { ar: 'الليكوبين', de: 'Lycopin' },
  },
  lutein: {
    key: 'lutein',
    group: 'other',
    label: { ar: 'اللوتين', de: 'Lutein' },
  },
  antioxidants: {
    key: 'antioxidants',
    group: 'other',
    label: { ar: 'مضادات أكسدة', de: 'Antioxidantien' },
  },
  polyphenols: {
    key: 'polyphenols',
    group: 'other',
    label: { ar: 'بوليفينولات', de: 'Polyphenole' },
  },
  carbs: {
    key: 'carbs',
    group: 'other',
    label: { ar: 'كربوهيدرات', de: 'Kohlenhydrate' },
  },

  // ============================================================
  // === Atlas-derived advanced compounds (deep biochemistry) ===
  // ============================================================

  // — Active methylation cofactors —
  methylfolate: {
    key: 'methylfolate',
    group: 'vitamin',
    label: { ar: 'ميثيل فولات (B9 نشط)', de: 'Methylfolat (aktives B9)' },
    note: {
      ar: 'الصيغة النشطة الجاهزة لدورة الميثيلة دون الحاجة لإنزيم MTHFR.',
      de: 'Bioaktive Form — umgeht den MTHFR-Engpass.',
    },
  },
  methylB12: {
    key: 'methylB12',
    group: 'vitamin',
    label: { ar: 'ميثيل كوبالامين (B12 نشط)', de: 'Methylcobalamin (aktives B12)' },
  },
  p5p: {
    key: 'p5p',
    group: 'vitamin',
    label: { ar: 'P-5-P (B6 نشط)', de: 'P-5-P (aktives B6)' },
  },
  tmg: {
    key: 'tmg',
    group: 'other',
    label: { ar: 'بيتائين (TMG)', de: 'Betain (TMG)' },
    note: {
      ar: 'مانح ميثيل قوي يدعم تحويل الهوموسيستين عبر مسار بديل.',
      de: 'Methyldonor — alternativer Homocystein-Abbauweg.',
    },
  },

  // — Mitochondrial axis —
  coq10: {
    key: 'coq10',
    group: 'other',
    label: { ar: 'يوبيكوينول (CoQ10)', de: 'Ubiquinol (CoQ10)' },
    note: {
      ar: 'دهني — مع وجبة فيها زيت زيتون أو أوميغا-3 لامتصاص أعلى.',
      de: 'Fettlöslich — mit Olivenöl/Omega-3 für bessere Aufnahme.',
    },
  },
  pqq: {
    key: 'pqq',
    group: 'other',
    label: { ar: 'PQQ (محفّز ميتوكوندريا)', de: 'PQQ (Mitochondrien-Trigger)' },
  },
  nmn: {
    key: 'nmn',
    group: 'other',
    label: { ar: 'NMN (سلف NAD+)', de: 'NMN (NAD+-Vorstufe)' },
  },
  ala: {
    key: 'ala',
    group: 'other',
    label: { ar: 'حمض ألفا-ليبويك (R-ALA)', de: 'Alpha-Liponsäure (R-ALA)' },
  },
  lcarnitine: {
    key: 'lcarnitine',
    group: 'amino',
    label: { ar: 'L-كارنيتين', de: 'L-Carnitin' },
  },
  creatine: {
    key: 'creatine',
    group: 'amino',
    label: { ar: 'الكرياتين', de: 'Kreatin' },
  },

  // — Antioxidant / detox —
  nac: {
    key: 'nac',
    group: 'amino',
    label: { ar: 'N-أسيتيل سيستين (NAC)', de: 'N-Acetylcystein (NAC)' },
  },
  glutathione: {
    key: 'glutathione',
    group: 'amino',
    label: { ar: 'الجلوتاثيون', de: 'Glutathion' },
  },
  milkthistle: {
    key: 'milkthistle',
    group: 'other',
    label: { ar: 'حليب الشوك (سيليمارين)', de: 'Mariendistel (Silymarin)' },
  },

  // — Cognition / nervous system —
  phosphatidylserine: {
    key: 'phosphatidylserine',
    group: 'other',
    label: { ar: 'فوسفاتيديل سيرين (PS)', de: 'Phosphatidylserin (PS)' },
  },
  lionsmane: {
    key: 'lionsmane',
    group: 'other',
    label: { ar: 'عرف الأسد', de: 'Lion\'s Mane' },
  },
  ltheanine: {
    key: 'ltheanine',
    group: 'amino',
    label: { ar: 'L-ثيانين', de: 'L-Theanin' },
  },
  glycine: {
    key: 'glycine',
    group: 'amino',
    label: { ar: 'جلايسين', de: 'Glycin' },
  },
  taurine: {
    key: 'taurine',
    group: 'amino',
    label: { ar: 'التورين', de: 'Taurin' },
  },

  // — HPA / adaptogens —
  ashwagandha: {
    key: 'ashwagandha',
    group: 'other',
    label: { ar: 'أشواغاندا', de: 'Ashwagandha' },
  },
  rhodiola: {
    key: 'rhodiola',
    group: 'other',
    label: { ar: 'روديولا', de: 'Rhodiola' },
  },

  // — Anti-inflammation / senolytic —
  curcumin: {
    key: 'curcumin',
    group: 'other',
    label: { ar: 'الكركومين', de: 'Curcumin' },
    note: {
      ar: 'يمتص أفضل مع البايبرين والدهون الصحية.',
      de: 'Bessere Aufnahme mit Piperin und gesunden Fetten.',
    },
  },
  resveratrol: {
    key: 'resveratrol',
    group: 'other',
    label: { ar: 'ريسفيراترول', de: 'Resveratrol' },
  },
  quercetin: {
    key: 'quercetin',
    group: 'other',
    label: { ar: 'كيرسيتين', de: 'Quercetin' },
  },
  fisetin: {
    key: 'fisetin',
    group: 'other',
    label: { ar: 'فايسيتين', de: 'Fisetin' },
  },
  spermidine: {
    key: 'spermidine',
    group: 'other',
    label: { ar: 'سبيرميدين', de: 'Spermidin' },
  },

  // — Anti-glycation —
  carnosine: {
    key: 'carnosine',
    group: 'amino',
    label: { ar: 'الكارنوزين', de: 'Carnosin' },
  },
  benfotiamine: {
    key: 'benfotiamine',
    group: 'vitamin',
    label: { ar: 'بنفوتيامين (B1 دهني)', de: 'Benfotiamin (fettlösliches B1)' },
  },

  // — Skin matrix —
  hyaluronic: {
    key: 'hyaluronic',
    group: 'other',
    label: { ar: 'حمض الهيالورونيك', de: 'Hyaluronsäure' },
  },
  silica: {
    key: 'silica',
    group: 'mineral',
    label: { ar: 'السيليكا', de: 'Silizium' },
  },
  msm: {
    key: 'msm',
    group: 'other',
    label: { ar: 'MSM (كبريت عضوي)', de: 'MSM (organischer Schwefel)' },
  },

  // — Microbiome precision —
  hmo: {
    key: 'hmo',
    group: 'other',
    label: { ar: 'سكريات حليب الأم (HMO)', de: 'HMOs (Muttermilch-Oligos)' },
  },
  akkermansia: {
    key: 'akkermansia',
    group: 'other',
    label: { ar: 'أكرمانسيا مسينيفيلا', de: 'Akkermansia muciniphila' },
  },
  butyrate: {
    key: 'butyrate',
    group: 'other',
    label: { ar: 'البوتيرات (SCFA)', de: 'Butyrat (SCFA)' },
  },
  glutamine: {
    key: 'glutamine',
    group: 'amino',
    label: { ar: 'L-جلوتامين', de: 'L-Glutamin' },
  },

  // — Hormonal / metabolic —
  inositol: {
    key: 'inositol',
    group: 'other',
    label: { ar: 'إينوزيتول (Myo + DCI)', de: 'Inositol (Myo + DCI)' },
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

  // ===== Fruits =====
  apple: {
    key: 'apple', icon: '🍎',
    label: { ar: 'تفاح', de: 'Apfel' },
    nutrients: ['fiber', 'vitaminC', 'antioxidants', 'polyphenols'],
  },
  pear: {
    key: 'pear', icon: '🍐',
    label: { ar: 'كمثرى', de: 'Birne' },
    nutrients: ['fiber', 'vitaminC', 'potassium'],
  },
  grape: {
    key: 'grape', icon: '🍇',
    label: { ar: 'عنب', de: 'Trauben' },
    nutrients: ['vitaminK', 'antioxidants', 'polyphenols'],
  },
  watermelon: {
    key: 'watermelon', icon: '🍉',
    label: { ar: 'بطيخ', de: 'Wassermelone' },
    nutrients: ['vitaminC', 'vitaminA', 'lycopene', 'potassium'],
  },
  melon: {
    key: 'melon', icon: '🍈',
    label: { ar: 'شمام', de: 'Honigmelone' },
    nutrients: ['vitaminC', 'vitaminA', 'potassium'],
  },
  pineapple: {
    key: 'pineapple', icon: '🍍',
    label: { ar: 'أناناس', de: 'Ananas' },
    nutrients: ['vitaminC', 'manganese', 'fiber'],
  },
  mango: {
    key: 'mango', icon: '🥭',
    label: { ar: 'مانجو', de: 'Mango' },
    nutrients: ['vitaminC', 'vitaminA', 'folate', 'antioxidants'],
  },
  peach: {
    key: 'peach', icon: '🍑',
    label: { ar: 'خوخ', de: 'Pfirsich' },
    nutrients: ['vitaminC', 'vitaminA', 'potassium', 'fiber'],
  },
  cherry: {
    key: 'cherry', icon: '🍒',
    label: { ar: 'كرز', de: 'Kirschen' },
    nutrients: ['vitaminC', 'antioxidants', 'polyphenols', 'potassium'],
  },
  blueberry: {
    key: 'blueberry', icon: '🫐',
    label: { ar: 'توت أزرق', de: 'Blaubeeren' },
    nutrients: ['vitaminC', 'vitaminK', 'antioxidants', 'polyphenols', 'fiber'],
  },
  raspberry: {
    key: 'raspberry', icon: '🍇',
    label: { ar: 'توت أحمر', de: 'Himbeeren' },
    nutrients: ['vitaminC', 'fiber', 'antioxidants', 'manganese'],
  },
  pomegranate: {
    key: 'pomegranate', icon: '🥭',
    label: { ar: 'رمان', de: 'Granatapfel' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'antioxidants', 'polyphenols'],
  },
  fig: {
    key: 'fig', icon: '🌰',
    label: { ar: 'تين', de: 'Feige' },
    nutrients: ['fiber', 'calcium', 'potassium', 'magnesium'],
  },
  apricot: {
    key: 'apricot', icon: '🍑',
    label: { ar: 'مشمش', de: 'Aprikose' },
    nutrients: ['vitaminA', 'vitaminC', 'potassium', 'fiber'],
  },
  kiwi: {
    key: 'kiwi', icon: '🥝',
    label: { ar: 'كيوي', de: 'Kiwi' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  papaya: {
    key: 'papaya', icon: '🥭',
    label: { ar: 'بابايا', de: 'Papaya' },
    nutrients: ['vitaminC', 'vitaminA', 'folate', 'fiber'],
  },
  guava: {
    key: 'guava', icon: '🍈',
    label: { ar: 'جوافة', de: 'Guave' },
    nutrients: ['vitaminC', 'fiber', 'potassium', 'folate'],
  },
  grapefruit: {
    key: 'grapefruit', icon: '🍊',
    label: { ar: 'جريب فروت', de: 'Grapefruit' },
    nutrients: ['vitaminC', 'vitaminA', 'fiber', 'lycopene'],
    tags: ['citrus'],
  },
  raisins: {
    key: 'raisins', icon: '🍇',
    label: { ar: 'زبيب', de: 'Rosinen' },
    nutrients: ['iron', 'potassium', 'fiber', 'antioxidants'],
  },
  prunes: {
    key: 'prunes', icon: '🍑',
    label: { ar: 'خوخ مجفف', de: 'Trockenpflaumen' },
    nutrients: ['fiber', 'vitaminK', 'potassium', 'iron'],
  },

  // ===== Vegetables =====
  tomato: {
    key: 'tomato', icon: '🍅',
    label: { ar: 'طماطم', de: 'Tomate' },
    nutrients: ['vitaminC', 'vitaminK', 'lycopene', 'potassium', 'folate'],
  },
  cucumber: {
    key: 'cucumber', icon: '🥒',
    label: { ar: 'خيار', de: 'Gurke' },
    nutrients: ['vitaminK', 'potassium'],
  },
  bell_pepper: {
    key: 'bell_pepper', icon: '🫑',
    label: { ar: 'فلفل ملون', de: 'Paprika' },
    nutrients: ['vitaminC', 'vitaminA', 'vitaminB6', 'folate', 'antioxidants'],
  },
  onion: {
    key: 'onion', icon: '🧅',
    label: { ar: 'بصل', de: 'Zwiebel' },
    nutrients: ['vitaminC', 'folate', 'fiber', 'polyphenols'],
  },
  garlic: {
    key: 'garlic', icon: '🧄',
    label: { ar: 'ثوم', de: 'Knoblauch' },
    nutrients: ['vitaminC', 'vitaminB6', 'manganese', 'antioxidants'],
  },
  potato: {
    key: 'potato', icon: '🥔',
    label: { ar: 'بطاطس', de: 'Kartoffel' },
    nutrients: ['vitaminC', 'vitaminB6', 'potassium', 'carbs', 'fiber'],
  },
  sweet_potato: {
    key: 'sweet_potato', icon: '🍠',
    label: { ar: 'بطاطا حلوة', de: 'Süßkartoffel' },
    nutrients: ['vitaminA', 'vitaminC', 'potassium', 'fiber', 'manganese'],
  },
  pumpkin: {
    key: 'pumpkin', icon: '🎃',
    label: { ar: 'قرع', de: 'Kürbis' },
    nutrients: ['vitaminA', 'vitaminC', 'potassium', 'fiber'],
  },
  zucchini: {
    key: 'zucchini', icon: '🥒',
    label: { ar: 'كوسا', de: 'Zucchini' },
    nutrients: ['vitaminC', 'vitaminA', 'potassium', 'manganese'],
  },
  eggplant: {
    key: 'eggplant', icon: '🍆',
    label: { ar: 'باذنجان', de: 'Aubergine' },
    nutrients: ['fiber', 'manganese', 'antioxidants', 'polyphenols'],
  },
  cauliflower: {
    key: 'cauliflower', icon: '🥦',
    label: { ar: 'قرنبيط', de: 'Blumenkohl' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber', 'choline'],
  },
  cabbage: {
    key: 'cabbage', icon: '🥬',
    label: { ar: 'ملفوف', de: 'Kohl' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
    tags: ['leafy'],
  },
  brussels_sprouts: {
    key: 'brussels_sprouts', icon: '🥬',
    label: { ar: 'كرنب بروكسل', de: 'Rosenkohl' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  asparagus: {
    key: 'asparagus', icon: '🌿',
    label: { ar: 'هليون', de: 'Spargel' },
    nutrients: ['folate', 'vitaminK', 'vitaminC', 'fiber'],
  },
  green_beans: {
    key: 'green_beans', icon: '🫛',
    label: { ar: 'فاصولياء خضراء', de: 'Grüne Bohnen' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'fiber'],
  },
  peas: {
    key: 'peas', icon: '🫛',
    label: { ar: 'بازلاء', de: 'Erbsen' },
    nutrients: ['protein', 'vitaminK', 'vitaminC', 'folate', 'fiber', 'iron'],
  },
  celery: {
    key: 'celery', icon: '🥬',
    label: { ar: 'كرفس', de: 'Sellerie' },
    nutrients: ['vitaminK', 'potassium', 'fiber'],
    tags: ['leafy'],
  },
  arugula: {
    key: 'arugula', icon: '🥬',
    label: { ar: 'جرجير', de: 'Rucola' },
    nutrients: ['vitaminK', 'vitaminA', 'folate', 'calcium'],
    tags: ['leafy'],
  },
  lettuce: {
    key: 'lettuce', icon: '🥬',
    label: { ar: 'خس', de: 'Salat' },
    nutrients: ['vitaminK', 'vitaminA', 'folate'],
    tags: ['leafy'],
  },
  parsley: {
    key: 'parsley', icon: '🌿',
    label: { ar: 'بقدونس', de: 'Petersilie' },
    nutrients: ['vitaminK', 'vitaminC', 'vitaminA', 'iron'],
    tags: ['leafy'],
  },
  cilantro: {
    key: 'cilantro', icon: '🌿',
    label: { ar: 'كزبرة', de: 'Koriander' },
    nutrients: ['vitaminK', 'vitaminA', 'vitaminC', 'antioxidants'],
    tags: ['leafy'],
  },
  mint: {
    key: 'mint', icon: '🌿',
    label: { ar: 'نعناع', de: 'Minze' },
    nutrients: ['vitaminA', 'iron', 'manganese', 'antioxidants'],
    tags: ['leafy'],
  },
  beet: {
    key: 'beet', icon: '🫜',
    label: { ar: 'شمندر', de: 'Rote Bete' },
    nutrients: ['folate', 'manganese', 'potassium', 'iron', 'fiber'],
  },
  radish: {
    key: 'radish', icon: '🌶️',
    label: { ar: 'فجل', de: 'Rettich' },
    nutrients: ['vitaminC', 'folate', 'potassium'],
  },
  okra: {
    key: 'okra', icon: '🌿',
    label: { ar: 'بامية', de: 'Okra' },
    nutrients: ['vitaminC', 'vitaminK', 'folate', 'magnesium', 'fiber'],
  },
  artichoke: {
    key: 'artichoke', icon: '🌿',
    label: { ar: 'خرشوف', de: 'Artischocke' },
    nutrients: ['folate', 'vitaminK', 'vitaminC', 'fiber', 'magnesium'],
  },
  corn: {
    key: 'corn', icon: '🌽',
    label: { ar: 'ذرة', de: 'Mais' },
    nutrients: ['fiber', 'vitaminB1', 'folate', 'lutein', 'carbs'],
  },
  mushroom: {
    key: 'mushroom', icon: '🍄',
    label: { ar: 'فطر', de: 'Pilze' },
    nutrients: ['vitaminD', 'vitaminB2', 'vitaminB3', 'selenium', 'copper'],
  },

  // ===== Proteins (meat & poultry) =====
  turkey: {
    key: 'turkey', icon: '🦃',
    label: { ar: 'ديك رومي', de: 'Pute' },
    nutrients: ['protein', 'vitaminB3', 'vitaminB6', 'selenium', 'zinc'],
  },
  lamb: {
    key: 'lamb', icon: '🐑',
    label: { ar: 'لحم ضأن', de: 'Lammfleisch' },
    nutrients: ['protein', 'iron', 'zinc', 'vitaminB12', 'vitaminB3'],
  },
  duck: {
    key: 'duck', icon: '🦆',
    label: { ar: 'بط', de: 'Ente' },
    nutrients: ['protein', 'iron', 'vitaminB12', 'selenium'],
    tags: ['fatty'],
  },

  // ===== Seafood =====
  tuna: {
    key: 'tuna', icon: '🐟',
    label: { ar: 'تونة', de: 'Thunfisch' },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'selenium'],
  },
  sardines: {
    key: 'sardines', icon: '🐟',
    label: { ar: 'سردين', de: 'Sardinen' },
    nutrients: ['protein', 'omega3', 'vitaminD', 'calcium', 'vitaminB12'],
    tags: ['fatty'],
  },
  mackerel: {
    key: 'mackerel', icon: '🐟',
    label: { ar: 'ماكريل', de: 'Makrele' },
    nutrients: ['protein', 'omega3', 'vitaminD', 'vitaminB12', 'selenium'],
    tags: ['fatty'],
  },
  shrimp: {
    key: 'shrimp', icon: '🦐',
    label: { ar: 'جمبري', de: 'Garnelen' },
    nutrients: ['protein', 'iodine', 'selenium', 'vitaminB12', 'zinc'],
  },
  oyster: {
    key: 'oyster', icon: '🦪',
    label: { ar: 'محار', de: 'Austern' },
    nutrients: ['zinc', 'iron', 'vitaminB12', 'copper', 'selenium', 'protein'],
  },

  // ===== Eggs / Dairy =====
  egg_yolk: {
    key: 'egg_yolk', icon: '🍳',
    label: { ar: 'صفار البيض', de: 'Eigelb' },
    nutrients: ['vitaminD', 'vitaminA', 'choline', 'biotin', 'lutein'],
    tags: ['fatty'],
  },
  cottage_cheese: {
    key: 'cottage_cheese', icon: '🧀',
    label: { ar: 'جبنة قريش', de: 'Hüttenkäse' },
    nutrients: ['protein', 'calcium', 'vitaminB12', 'phosphorus'],
    tags: ['dairy'],
  },
  feta: {
    key: 'feta', icon: '🧀',
    label: { ar: 'فيتا', de: 'Feta' },
    nutrients: ['calcium', 'protein', 'vitaminB12', 'phosphorus'],
    tags: ['dairy'],
  },
  kefir: {
    key: 'kefir', icon: '🥛',
    label: { ar: 'كفير', de: 'Kefir' },
    nutrients: ['probiotics', 'calcium', 'protein', 'vitaminB12'],
    tags: ['dairy'],
  },
  butter: {
    key: 'butter', icon: '🧈',
    label: { ar: 'زبدة', de: 'Butter' },
    nutrients: ['vitaminA', 'vitaminD', 'vitaminK'],
    tags: ['fatty', 'dairy'],
  },
  ghee: {
    key: 'ghee', icon: '🧈',
    label: { ar: 'سمن', de: 'Ghee' },
    nutrients: ['vitaminA', 'vitaminE', 'vitaminK'],
    tags: ['fatty', 'dairy'],
  },

  // ===== Plant proteins / Legumes =====
  chickpeas: {
    key: 'chickpeas', icon: '🫘',
    label: { ar: 'حمص', de: 'Kichererbsen' },
    nutrients: ['protein', 'iron', 'folate', 'fiber', 'magnesium', 'manganese'],
  },
  black_beans: {
    key: 'black_beans', icon: '🫘',
    label: { ar: 'فاصولياء سوداء', de: 'Schwarze Bohnen' },
    nutrients: ['protein', 'iron', 'folate', 'fiber', 'magnesium'],
  },
  edamame: {
    key: 'edamame', icon: '🫛',
    label: { ar: 'إدامامي', de: 'Edamame' },
    nutrients: ['protein', 'folate', 'vitaminK', 'iron', 'fiber'],
  },
  tofu: {
    key: 'tofu', icon: '🍱',
    label: { ar: 'توفو', de: 'Tofu' },
    nutrients: ['protein', 'calcium', 'iron', 'magnesium'],
  },
  tempeh: {
    key: 'tempeh', icon: '🍱',
    label: { ar: 'تيمبيه', de: 'Tempeh' },
    nutrients: ['protein', 'iron', 'calcium', 'probiotics', 'magnesium'],
  },
  hummus: {
    key: 'hummus', icon: '🥣',
    label: { ar: 'حمص بطحينة', de: 'Hummus' },
    nutrients: ['protein', 'fiber', 'iron', 'folate', 'magnesium'],
  },
  falafel: {
    key: 'falafel', icon: '🧆',
    label: { ar: 'فلافل', de: 'Falafel' },
    nutrients: ['protein', 'fiber', 'iron', 'folate'],
  },

  // ===== Nuts & Seeds =====
  pistachios: {
    key: 'pistachios', icon: '🌰',
    label: { ar: 'فستق', de: 'Pistazien' },
    nutrients: ['protein', 'vitaminB6', 'fiber', 'potassium', 'antioxidants'],
    tags: ['fatty'],
  },
  cashews: {
    key: 'cashews', icon: '🌰',
    label: { ar: 'كاجو', de: 'Cashews' },
    nutrients: ['protein', 'magnesium', 'copper', 'iron', 'zinc'],
    tags: ['fatty'],
  },
  hazelnuts: {
    key: 'hazelnuts', icon: '🌰',
    label: { ar: 'بندق', de: 'Haselnüsse' },
    nutrients: ['vitaminE', 'manganese', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  brazil_nuts: {
    key: 'brazil_nuts', icon: '🌰',
    label: { ar: 'جوز برازيلي', de: 'Paranüsse' },
    nutrients: ['selenium', 'vitaminE', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  peanuts: {
    key: 'peanuts', icon: '🥜',
    label: { ar: 'فول سوداني', de: 'Erdnüsse' },
    nutrients: ['protein', 'vitaminB3', 'folate', 'magnesium', 'vitaminE'],
    tags: ['fatty'],
  },
  pecans: {
    key: 'pecans', icon: '🌰',
    label: { ar: 'بقان', de: 'Pekannüsse' },
    nutrients: ['manganese', 'zinc', 'fiber', 'antioxidants'],
    tags: ['fatty'],
  },
  chia_seeds: {
    key: 'chia_seeds', icon: '🌱',
    label: { ar: 'بذور الشيا', de: 'Chiasamen' },
    nutrients: ['omega3', 'fiber', 'calcium', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  flax_seeds: {
    key: 'flax_seeds', icon: '🌱',
    label: { ar: 'بذور الكتان', de: 'Leinsamen' },
    nutrients: ['omega3', 'fiber', 'magnesium', 'protein'],
    tags: ['fatty'],
  },
  pumpkin_seeds: {
    key: 'pumpkin_seeds', icon: '🌱',
    label: { ar: 'بذور اليقطين', de: 'Kürbiskerne' },
    nutrients: ['zinc', 'magnesium', 'iron', 'protein', 'manganese'],
    tags: ['fatty'],
  },
  sunflower_seeds: {
    key: 'sunflower_seeds', icon: '🌻',
    label: { ar: 'بذور دوار الشمس', de: 'Sonnenblumenkerne' },
    nutrients: ['vitaminE', 'magnesium', 'selenium', 'protein'],
    tags: ['fatty'],
  },
  sesame: {
    key: 'sesame', icon: '🌱',
    label: { ar: 'سمسم', de: 'Sesam' },
    nutrients: ['calcium', 'iron', 'magnesium', 'zinc', 'copper'],
    tags: ['fatty'],
  },
  tahini: {
    key: 'tahini', icon: '🥣',
    label: { ar: 'طحينة', de: 'Tahin' },
    nutrients: ['calcium', 'iron', 'magnesium', 'protein', 'vitaminB1'],
    tags: ['fatty'],
  },

  // ===== Grains & Starches =====
  brown_rice: {
    key: 'brown_rice', icon: '🍚',
    label: { ar: 'أرز بني', de: 'Vollkornreis' },
    nutrients: ['carbs', 'fiber', 'magnesium', 'manganese', 'vitaminB3'],
  },
  quinoa: {
    key: 'quinoa', icon: '🌾',
    label: { ar: 'كينوا', de: 'Quinoa' },
    nutrients: ['protein', 'fiber', 'magnesium', 'iron', 'folate', 'manganese'],
  },
  bulgur: {
    key: 'bulgur', icon: '🌾',
    label: { ar: 'برغل', de: 'Bulgur' },
    nutrients: ['fiber', 'protein', 'magnesium', 'iron', 'carbs'],
  },
  couscous: {
    key: 'couscous', icon: '🌾',
    label: { ar: 'كسكسي', de: 'Couscous' },
    nutrients: ['protein', 'selenium', 'carbs'],
  },
  barley: {
    key: 'barley', icon: '🌾',
    label: { ar: 'شعير', de: 'Gerste' },
    nutrients: ['fiber', 'magnesium', 'manganese', 'selenium', 'carbs'],
  },
  whole_bread: {
    key: 'whole_bread', icon: '🍞',
    label: { ar: 'خبز كامل الحبة', de: 'Vollkornbrot' },
    nutrients: ['fiber', 'iron', 'magnesium', 'vitaminB1', 'carbs'],
  },
  pita: {
    key: 'pita', icon: '🫓',
    label: { ar: 'خبز عربي', de: 'Pita-Brot' },
    nutrients: ['carbs', 'iron', 'folate'],
  },
  pasta: {
    key: 'pasta', icon: '🍝',
    label: { ar: 'مكرونة', de: 'Pasta' },
    nutrients: ['carbs', 'protein', 'vitaminB1', 'folate'],
  },

  // ===== Beverages =====
  green_tea: {
    key: 'green_tea', icon: '🍵',
    label: { ar: 'شاي أخضر', de: 'Grüner Tee' },
    nutrients: ['caffeine', 'antioxidants', 'polyphenols'],
    tags: ['caffeine'],
  },
  black_tea: {
    key: 'black_tea', icon: '🍵',
    label: { ar: 'شاي أسود', de: 'Schwarzer Tee' },
    nutrients: ['caffeine', 'antioxidants', 'polyphenols'],
    tags: ['caffeine'],
  },
  herbal_tea: {
    key: 'herbal_tea', icon: '🍵',
    label: { ar: 'شاي أعشاب', de: 'Kräutertee' },
    nutrients: ['antioxidants'],
  },
  matcha: {
    key: 'matcha', icon: '🍵',
    label: { ar: 'ماتشا', de: 'Matcha' },
    nutrients: ['caffeine', 'antioxidants', 'polyphenols', 'vitaminC'],
    tags: ['caffeine'],
  },
  orange_juice: {
    key: 'orange_juice', icon: '🧃',
    label: { ar: 'عصير برتقال', de: 'Orangensaft' },
    nutrients: ['vitaminC', 'folate', 'potassium'],
    tags: ['citrus'],
  },
  pomegranate_juice: {
    key: 'pomegranate_juice', icon: '🧃',
    label: { ar: 'عصير رمان', de: 'Granatapfelsaft' },
    nutrients: ['antioxidants', 'polyphenols', 'vitaminC', 'potassium'],
  },
  coconut_water: {
    key: 'coconut_water', icon: '🥥',
    label: { ar: 'ماء جوز الهند', de: 'Kokoswasser' },
    nutrients: ['potassium', 'magnesium'],
  },

  // ===== Fats & Oils =====
  coconut_oil: {
    key: 'coconut_oil', icon: '🥥',
    label: { ar: 'زيت جوز الهند', de: 'Kokosöl' },
    nutrients: [],
    tags: ['fatty'],
  },
  fish_oil: {
    key: 'fish_oil', icon: '🐟',
    label: { ar: 'زيت السمك', de: 'Fischöl' },
    nutrients: ['omega3', 'vitaminD', 'vitaminA'],
    tags: ['fatty'],
  },
  dark_chocolate: {
    key: 'dark_chocolate', icon: '🍫',
    label: { ar: 'شوكولاتة داكنة', de: 'Dunkle Schokolade' },
    nutrients: ['iron', 'magnesium', 'copper', 'antioxidants', 'polyphenols', 'caffeine'],
    tags: ['fatty'],
  },

  // ===== Spices / Herbs =====
  turmeric: {
    key: 'turmeric', icon: '🌿',
    label: { ar: 'كركم', de: 'Kurkuma' },
    nutrients: ['antioxidants', 'manganese', 'iron'],
  },
  ginger: {
    key: 'ginger', icon: '🌿',
    label: { ar: 'زنجبيل', de: 'Ingwer' },
    nutrients: ['antioxidants', 'manganese'],
  },
  cinnamon: {
    key: 'cinnamon', icon: '🌿',
    label: { ar: 'قرفة', de: 'Zimt' },
    nutrients: ['antioxidants', 'manganese', 'chromium'],
  },
  black_seed: {
    key: 'black_seed', icon: '🌱',
    label: { ar: 'حبة البركة', de: 'Schwarzkümmel' },
    nutrients: ['antioxidants', 'iron', 'calcium'],
  },
  saffron: {
    key: 'saffron', icon: '🌸',
    label: { ar: 'زعفران', de: 'Safran' },
    nutrients: ['antioxidants', 'manganese'],
  },

  // ===== Middle-Eastern staples =====
  labneh: {
    key: 'labneh', icon: '🥣',
    label: { ar: 'لبنة', de: 'Labneh' },
    nutrients: ['protein', 'calcium', 'probiotics', 'vitaminB12'],
    tags: ['dairy'],
  },
  zaatar: {
    key: 'zaatar', icon: '🌿',
    label: { ar: 'زعتر', de: 'Zatar' },
    nutrients: ['iron', 'calcium', 'antioxidants', 'vitaminK'],
  },
  freekeh: {
    key: 'freekeh', icon: '🌾',
    label: { ar: 'فريكة', de: 'Freekeh' },
    nutrients: ['protein', 'fiber', 'iron', 'magnesium'],
  },
  molokhia: {
    key: 'molokhia', icon: '🥬',
    label: { ar: 'ملوخية', de: 'Molokhia' },
    nutrients: ['vitaminA', 'vitaminC', 'calcium', 'iron', 'folate'],
    tags: ['leafy'],
  },
  fava_beans: {
    key: 'fava_beans', icon: '🫘',
    label: { ar: 'فول', de: 'Saubohnen' },
    nutrients: ['protein', 'folate', 'iron', 'manganese', 'fiber'],
  },
  kishk: {
    key: 'kishk', icon: '🥣',
    label: { ar: 'كشك', de: 'Kishk' },
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

  // =====================================================================
  // === Atlas-derived deep biochemical axes (advanced clinical stacks) ==
  // =====================================================================

  // --- Methylation axis ---
  {
    id: 'methylation-core',
    nutrients: ['methylfolate', 'methylB12', 'p5p'],
    evidence: 'strong',
    domain: 'methylation',
    title: { ar: 'محور الميثيلة النشط', de: 'Aktive Methylierungs-Achse' },
    benefits: {
      ar: [
        'الصيغ النشطة تعبر مباشرة دون الحاجة لإنزيم MTHFR',
        'خفض الهوموسيستين وحماية بطانة الشرايين والأعصاب',
        'دعم تصنيع SAMe — مانح الميثيل العالمي للجسم',
      ],
      de: [
        'Aktive Formen umgehen den MTHFR-Engpass direkt',
        'Senkt Homocystein — schützt Gefäße und Nervensystem',
        'Fördert SAMe-Synthese — der universelle Methyldonor',
      ],
    },
    howTo: {
      ar: 'صباحاً مع وجبة خفيفة. ابدأ بجرعة منخفضة لتجنب التحفيز المفرط.',
      de: 'Morgens zu leichter Mahlzeit. Niedrig starten gegen Überstimulation.',
    },
    foodBoosters: ['spinach', 'eggs', 'liver', 'beans'],
  },
  {
    id: 'methylation-bypass',
    nutrients: ['tmg', 'methylfolate', 'methylB12'],
    evidence: 'moderate',
    domain: 'methylation',
    title: { ar: 'مسار TMG البديل للهوموسيستين', de: 'TMG-Alternativweg' },
    benefits: {
      ar: [
        'TMG يفعّل إنزيم BHMT لتحويل الهوموسيستين بمسار ثانٍ',
        'حماية مضاعفة من تكلس الشرايين والإجهاد الميثيلي',
        'دعم وظائف الكبد ومضادات الأكسدة الذاتية',
      ],
      de: [
        'TMG aktiviert BHMT — zweiter Homocystein-Abbauweg',
        'Doppelter Schutz vor Gefäßverkalkung und Methylstress',
        'Unterstützt Leber und körpereigene Antioxidantien',
      ],
    },
    howTo: {
      ar: 'TMG مع الإفطار (500-1000مغ)، الفيتامينات النشطة معه.',
      de: 'TMG zum Frühstück (500-1000mg), aktive Vitamine dazu.',
    },
    foodBoosters: ['beetroot', 'spinach', 'eggs'],
  },

  // --- Mitochondrial axis ---
  {
    id: 'mito-trio',
    nutrients: ['coq10', 'pqq', 'magnesium'],
    evidence: 'strong',
    domain: 'mitochondria',
    title: { ar: 'ثلاثي الميتوكوندريا الذهبي', de: 'Mitochondrien-Trio' },
    benefits: {
      ar: [
        'CoQ10 يحمل الإلكترونات في سلسلة التنفس الخلوي',
        'PQQ يحفز نمو ميتوكوندريا جديدة (Biogenesis)',
        'المغنيسيوم وقود ATP الفعّال — يضاعف إنتاج الطاقة',
      ],
      de: [
        'CoQ10 transportiert Elektronen in der Atmungskette',
        'PQQ stimuliert Neubildung neuer Mitochondrien',
        'Magnesium aktiviert ATP — verdoppelt Energieausbeute',
      ],
    },
    howTo: {
      ar: 'CoQ10 و PQQ صباحاً مع دهون. المغنيسيوم مساءً.',
      de: 'CoQ10 + PQQ morgens mit Fett. Magnesium abends.',
    },
    foodBoosters: ['salmon', 'avocado', 'spinach', 'almonds'],
  },
  {
    id: 'mito-fuel',
    nutrients: ['lcarnitine', 'coq10', 'ala'],
    evidence: 'strong',
    domain: 'energy',
    title: { ar: 'وقود الميتوكوندريا للدهون', de: 'Fett-zu-Energie-Stack' },
    benefits: {
      ar: [
        'L-كارنيتين ينقل الأحماض الدهنية إلى داخل الميتوكوندريا',
        'CoQ10 يحرقها بكفاءة كاملة لإنتاج ATP',
        'ALA يعيد تدوير المضادات المؤكسدة داخل الخلية',
      ],
      de: [
        'L-Carnitin schleust Fettsäuren in Mitochondrien',
        'CoQ10 verbrennt sie effizient zu ATP',
        'ALA recycelt Antioxidantien intrazellulär',
      ],
    },
    howTo: {
      ar: 'قبل التمرين بـ 30 دقيقة على معدة شبه فارغة.',
      de: '30 Min. vor dem Training, fast nüchtern.',
    },
    foodBoosters: ['beef', 'salmon', 'avocado'],
  },

  // --- NAD+ / Longevity ---
  {
    id: 'nad-sirtuin',
    nutrients: ['nmn', 'resveratrol', 'tmg'],
    evidence: 'emerging',
    domain: 'longevity',
    title: { ar: 'محور NAD⁺ والسيرتوينات', de: 'NAD⁺ & Sirtuin-Achse' },
    benefits: {
      ar: [
        'NMN يرفع مستويات NAD⁺ الخلوية بصورة مباشرة',
        'الريسفيراترول يفعّل إنزيمات السيرتوين SIRT1/3 طول العمر',
        'TMG يعوّض مجموعات الميثيل المستهلكة في الاستقلاب',
      ],
      de: [
        'NMN hebt direkt zelluläres NAD⁺',
        'Resveratrol aktiviert SIRT1/3 — Langlebigkeits-Enzyme',
        'TMG ersetzt verbrauchte Methylgruppen',
      ],
    },
    howTo: {
      ar: 'صباحاً على معدة فارغة قبل الإفطار بـ 20 دقيقة.',
      de: 'Morgens nüchtern, 20 Min. vor dem Frühstück.',
    },
    foodBoosters: ['avocado', 'broccoli', 'salmon'],
  },
  {
    id: 'senolytic-flush',
    nutrients: ['fisetin', 'quercetin', 'spermidine'],
    evidence: 'emerging',
    domain: 'longevity',
    title: { ar: 'سينوليتك: تنظيف الخلايا الهرمة', de: 'Senolytische Reinigung' },
    benefits: {
      ar: [
        'فايسيتين وكيرسيتين يحفّزان موت الخلايا الزومبية المتراكمة',
        'سبيرميدين يفعّل الالتهام الذاتي (Autophagy) لتجديد الخلايا',
        'تحسّن مرونة الأنسجة وانخفاض الالتهاب المزمن',
      ],
      de: [
        'Fisetin + Quercetin entfernen seneszente Zombie-Zellen',
        'Spermidin aktiviert Autophagie — Zellrecycling',
        'Bessere Gewebeelastizität, weniger chronische Entzündung',
      ],
    },
    howTo: {
      ar: 'بروتوكول نبضي: 2 يوم أسبوعياً بجرعة عالية مع وجبة دسمة.',
      de: 'Puls-Protokoll: 2 Tage/Woche hochdosiert zu Fett-Mahlzeit.',
    },
    foodBoosters: ['strawberry', 'apple', 'olive_oil'],
  },

  // --- Anti-glycation ---
  {
    id: 'anti-glycation',
    nutrients: ['carnosine', 'benfotiamine', 'ala'],
    evidence: 'moderate',
    domain: 'longevity',
    title: { ar: 'درع مضاد الجلكزة (AGEs)', de: 'Anti-Glykations-Schild' },
    benefits: {
      ar: [
        'الكارنوزين يكسر روابط البروتين-سكر قبل تكوينها',
        'البنفوتيامين يحوّل سلائف AGEs بعيداً عن الأنسجة',
        'ALA يحمي الأعصاب الطرفية من تلف السكر العالي',
      ],
      de: [
        'Carnosin blockiert Protein-Zucker-Vernetzung',
        'Benfotiamin lenkt AGE-Vorstufen aus dem Gewebe',
        'ALA schützt periphere Nerven vor Zuckerschäden',
      ],
    },
    howTo: {
      ar: 'مع الوجبات الغنية بالكربوهيدرات لتقليل الذروة السكرية.',
      de: 'Zu kohlenhydratreichen Mahlzeiten — dämpft Zuckerspitzen.',
    },
    foodBoosters: ['broccoli', 'spinach', 'beef'],
  },

  // --- Detox / Glutathione cycle ---
  {
    id: 'gsh-cycle',
    nutrients: ['nac', 'glutathione', 'selenium'],
    evidence: 'strong',
    domain: 'detox',
    title: { ar: 'دورة الجلوتاثيون الكاملة', de: 'Glutathion-Zyklus' },
    benefits: {
      ar: [
        'NAC يوفّر السيستين — اللبنة المحدِّدة لتصنيع الجلوتاثيون',
        'السيلينيوم ينشّط إنزيم GPx لإعادة شحن GSH المستهلك',
        'تنظيف الكبد، المعادن الثقيلة، وحماية الميتوكوندريا',
      ],
      de: [
        'NAC liefert Cystein — Schlüsselbaustein für Glutathion',
        'Selen aktiviert GPx — regeneriert verbrauchtes GSH',
        'Leber-Detox, Schwermetalle, Schutz der Mitochondrien',
      ],
    },
    howTo: {
      ar: 'NAC على معدة فارغة، الجلوتاثيون تحت اللسان لامتصاص أفضل.',
      de: 'NAC nüchtern, Glutathion sublingual für bessere Aufnahme.',
    },
    foodBoosters: ['broccoli', 'eggs', 'salmon', 'kale'],
  },
  {
    id: 'liver-renewal',
    nutrients: ['milkthistle', 'nac', 'tmg'],
    evidence: 'moderate',
    domain: 'detox',
    title: { ar: 'تجديد الكبد العميق', de: 'Tiefe Leber-Regeneration' },
    benefits: {
      ar: [
        'سيليمارين يثبّت أغشية خلايا الكبد ويسرّع تجديدها',
        'NAC يدعم تفكيك السموم في المرحلتين I و II',
        'TMG يقلل تراكم الدهون الكبدية ويحسّن إنزيمات ALT/AST',
      ],
      de: [
        'Silymarin stabilisiert Leberzellmembranen, fördert Regeneration',
        'NAC unterstützt Phase-I- und Phase-II-Entgiftung',
        'TMG reduziert Leberverfettung — bessere ALT/AST-Werte',
      ],
    },
    howTo: {
      ar: 'موزعة على اليوم، أكبر جرعة قبل النوم لعمل الكبد الليلي.',
      de: 'Über den Tag verteilt, Hauptdosis abends für Leber-Nachtarbeit.',
    },
    foodBoosters: ['beetroot', 'broccoli', 'lemon'],
  },

  // --- HPA / Stress ---
  {
    id: 'hpa-calm',
    nutrients: ['ashwagandha', 'magnesium', 'ltheanine'],
    evidence: 'strong',
    domain: 'mood',
    title: { ar: 'تهدئة محور HPA', de: 'HPA-Achse beruhigen' },
    benefits: {
      ar: [
        'الأشواغاندا تخفض الكورتيزول المساء حتى 28%',
        'L-ثيانين يرفع موجات ألفا الدماغية — هدوء حاضر',
        'المغنيسيوم يعيد توازن GABA ويهدّئ الجهاز العصبي',
      ],
      de: [
        'Ashwagandha senkt Abend-Cortisol bis 28%',
        'L-Theanin steigert Alpha-Wellen — wache Ruhe',
        'Magnesium balanciert GABA — Nervensystem-Reset',
      ],
    },
    howTo: {
      ar: 'الأشواغاندا مساءً، L-ثيانين عند التوتر، المغنيسيوم قبل النوم.',
      de: 'Ashwagandha abends, L-Theanin bei Stress, Magnesium vor Schlaf.',
    },
    foodBoosters: ['oats', 'almonds', 'banana'],
  },
  {
    id: 'adaptogen-drive',
    nutrients: ['rhodiola', 'p5p', 'vitaminB12'],
    evidence: 'moderate',
    domain: 'energy',
    title: { ar: 'دفع التكيف الصباحي', de: 'Adaptogener Morgen-Drive' },
    benefits: {
      ar: [
        'روديولا ترفع الأداء العقلي تحت الضغط دون كافيين',
        'P5P يسرّع تصنيع الدوبامين والنورأدرينالين',
        'B12 يضمن توصيل الإشارات العصبية بكفاءة عالية',
      ],
      de: [
        'Rhodiola steigert mentale Leistung unter Stress (ohne Koffein)',
        'P5P beschleunigt Dopamin- und Noradrenalin-Synthese',
        'B12 sichert effiziente Nervenleitung',
      ],
    },
    howTo: {
      ar: 'صباحاً قبل بدء العمل، تجنّب بعد الظهر.',
      de: 'Morgens vor Arbeitsbeginn, nicht nach Mittag.',
    },
    foodBoosters: ['eggs', 'salmon', 'spinach'],
  },

  // --- Sleep deep architecture ---
  {
    id: 'sleep-architecture',
    nutrients: ['magnesium', 'glycine', 'ltheanine'],
    evidence: 'strong',
    domain: 'sleep',
    title: { ar: 'هندسة النوم العميق', de: 'Tiefschlaf-Architektur' },
    benefits: {
      ar: [
        'الجلايسين يخفض درجة حرارة الجسم المركزية للدخول السريع للنوم',
        'L-ثيانين يطيل مرحلة النوم العميق وحركة العين السريعة (REM)',
        'المغنيسيوم يهدّئ مستقبلات NMDA المثيرة',
      ],
      de: [
        'Glycin senkt Kerntemperatur — schnelleres Einschlafen',
        'L-Theanin verlängert Tief- und REM-Schlafphasen',
        'Magnesium dämpft erregende NMDA-Rezeptoren',
      ],
    },
    howTo: {
      ar: '30-60 دقيقة قبل النوم، بعيداً عن الكافيين والشاشات.',
      de: '30-60 Min. vor dem Schlafen, fern von Koffein und Bildschirmen.',
    },
    foodBoosters: ['oats', 'almonds', 'cherry'],
  },

  // --- Cognition deep ---
  {
    id: 'cog-membrane',
    nutrients: ['omega3', 'phosphatidylserine', 'methylB12'],
    evidence: 'strong',
    domain: 'cognition',
    title: { ar: 'بناء أغشية الدماغ', de: 'Hirnmembran-Aufbau' },
    benefits: {
      ar: [
        'DHA يشكّل 30% من فوسفوليبيدات الدماغ — مرونة المشابك',
        'PS يخفض الكورتيزول ويقوّي الذاكرة العاملة',
        'الميثيل B12 يحمي غمد المايلين من التآكل',
      ],
      de: [
        'DHA bildet 30% der Hirn-Phospholipide — Synapsen-Flexibilität',
        'PS senkt Cortisol, stärkt Arbeitsgedächtnis',
        'Methyl-B12 schützt Myelinscheide vor Abbau',
      ],
    },
    howTo: {
      ar: 'مع وجبة الغداء الدسمة لامتصاص مثالي للدهنيات.',
      de: 'Zur fetthaltigen Mittagsmahlzeit für optimale Aufnahme.',
    },
    foodBoosters: ['salmon', 'walnuts', 'eggs', 'avocado'],
  },
  {
    id: 'nerve-growth',
    nutrients: ['lionsmane', 'omega3', 'choline'],
    evidence: 'emerging',
    domain: 'cognition',
    title: { ar: 'نمو الأعصاب (NGF)', de: 'Nervenwachstum (NGF)' },
    benefits: {
      ar: [
        'عرف الأسد يحفّز إفراز عامل نمو الأعصاب NGF و BDNF',
        'DHA يدعم تكوين النواقل العصبية في المشابك',
        'الكولين سلف الأستيل كولين — وقود الذاكرة',
      ],
      de: [
        'Lion\'s Mane stimuliert NGF- und BDNF-Ausschüttung',
        'DHA fördert Neurotransmitter-Bildung an Synapsen',
        'Cholin: Acetylcholin-Vorstufe — Gedächtnis-Treibstoff',
      ],
    },
    howTo: {
      ar: 'صباحاً ومنتصف اليوم، استمرارية 8 أسابيع لأثر ملموس.',
      de: 'Morgens und mittags, 8 Wochen Konsistenz für Wirkung.',
    },
    foodBoosters: ['eggs', 'salmon', 'walnuts'],
  },
  {
    id: 'focus-now',
    nutrients: ['ltheanine', 'caffeine'],
    evidence: 'strong',
    domain: 'cognition',
    title: { ar: 'تركيز فوري بلا توتر', de: 'Fokus ohne Nervosität' },
    benefits: {
      ar: [
        'الكافيين يرفع اليقظة، L-ثيانين يلغي العصبية',
        'تركيز حاد ومستقر لـ 3-4 ساعات',
        'بدون ارتداد طاقة سلبي',
      ],
      de: [
        'Koffein erhöht Wachheit, L-Theanin neutralisiert Nervosität',
        'Klarer, stabiler Fokus für 3-4 Stunden',
        'Ohne Energie-Crash danach',
      ],
    },
    howTo: {
      ar: 'نسبة 2:1 (مثلاً 200مغ ثيانين مع 100مغ كافيين) قبل عمل عميق.',
      de: 'Verhältnis 2:1 (z.B. 200mg Theanin + 100mg Koffein) vor Deep Work.',
    },
    foodBoosters: [],
  },

  // --- Microbiome precision ---
  {
    id: 'microbiome-rebuild',
    nutrients: ['hmo', 'akkermansia', 'butyrate', 'fiber'],
    evidence: 'emerging',
    domain: 'gut',
    title: { ar: 'إعادة بناء الميكروبيوم', de: 'Mikrobiom-Wiederaufbau' },
    benefits: {
      ar: [
        'HMOs تغذّي حصرياً سلالات B. infantis الملكية',
        'أكرمانسيا تسمّك طبقة الميوكين الواقية لجدار المعى',
        'البوتيرات يغذّي خلايا القولون مباشرة — وقود مفضّل',
      ],
      de: [
        'HMOs nähren exklusiv B. infantis-Stämme',
        'Akkermansia verdickt Mukus-Schutzschicht',
        'Butyrat nährt Kolonozyten direkt — bevorzugter Treibstoff',
      ],
    },
    howTo: {
      ar: 'بروتوكول 12 أسبوع: HMO يومياً، أكرمانسيا مساءً، ألياف متنوعة.',
      de: '12-Wochen-Protokoll: HMO täglich, Akkermansia abends, vielfältige Ballaststoffe.',
    },
    foodBoosters: ['oats', 'beans', 'broccoli', 'avocado'],
  },
  {
    id: 'gut-barrier',
    nutrients: ['glutamine', 'zinc', 'akkermansia'],
    evidence: 'moderate',
    domain: 'gut',
    title: { ar: 'ترميم جدار الأمعاء المتسرّب', de: 'Leaky-Gut-Reparatur' },
    benefits: {
      ar: [
        'L-جلوتامين الوقود الأول لخلايا الأمعاء — يرمم الروابط الضيقة',
        'الزنك يقفل النفاذية المعوية ويستعيد البطانة',
        'أكرمانسيا تعيد بناء طبقة المخاط الواقية',
      ],
      de: [
        'L-Glutamin: Hauptbrennstoff der Darmzellen, repariert Tight Junctions',
        'Zink schließt Darmpermeabilität — Epithel-Reset',
        'Akkermansia regeneriert schützende Mukus-Schicht',
      ],
    },
    howTo: {
      ar: 'الجلوتامين على معدة فارغة (5مغ مرتين)، الزنك مع العشاء.',
      de: 'Glutamin nüchtern (5g 2x), Zink zum Abendessen.',
    },
    foodBoosters: ['beef', 'eggs', 'oats'],
  },

  // --- Skin matrix deep ---
  {
    id: 'skin-matrix',
    nutrients: ['collagen', 'hyaluronic', 'silica', 'vitaminC'],
    evidence: 'strong',
    domain: 'skin',
    title: { ar: 'مصفوفة البشرة المتكاملة', de: 'Vollständige Hautmatrix' },
    benefits: {
      ar: [
        'الكولاجين يبني البنية التحتية للأدمة',
        'حمض الهيالورونيك يحبس 1000 ضعف وزنه ماءً في الأنسجة',
        'السيليكا تربط ألياف الكولاجين والإيلاستين بقوة',
        'فيتامين سي شرط إلزامي لتشابك الكولاجين',
      ],
      de: [
        'Kollagen baut Dermis-Grundstruktur',
        'Hyaluronsäure bindet 1000-faches Eigengewicht an Wasser',
        'Silizium vernetzt Kollagen- und Elastinfasern',
        'Vitamin C ist Voraussetzung für Kollagen-Crosslinking',
      ],
    },
    howTo: {
      ar: 'صباحاً معاً مع عصير حمضيات. 12 أسبوع لنتيجة بصرية.',
      de: 'Morgens zusammen mit Zitrussaft. 12 Wochen für sichtbares Ergebnis.',
    },
    foodBoosters: ['orange', 'strawberry', 'broccoli', 'kiwi'],
  },

  // --- Joint matrix ---
  {
    id: 'joint-shield',
    nutrients: ['collagen', 'msm', 'omega3', 'vitaminC'],
    evidence: 'moderate',
    domain: 'bone',
    title: { ar: 'درع المفاصل والأوتار', de: 'Gelenk- & Sehnen-Schild' },
    benefits: {
      ar: [
        'كولاجين النوع II يبني الغضاريف ويعيد ترطيبها',
        'MSM يوفر الكبريت لجسور ثنائي السلفايد بين البروتينات',
        'أوميغا-3 يخفض الالتهاب المفصلي المزمن',
      ],
      de: [
        'Kollagen Typ II baut Knorpel auf, rehydriert ihn',
        'MSM liefert Schwefel für Disulfid-Brücken',
        'Omega-3 reduziert chronische Gelenkentzündung',
      ],
    },
    howTo: {
      ar: 'صباحاً معاً، استمرار 8-12 أسبوع لتحسن مرونة المفاصل.',
      de: 'Morgens gemeinsam, 8-12 Wochen für bessere Beweglichkeit.',
    },
    foodBoosters: ['salmon', 'broccoli', 'eggs'],
  },

  // --- Cardio shield deep ---
  {
    id: 'cardio-shield',
    nutrients: ['omega3', 'coq10', 'vitaminK', 'magnesium'],
    evidence: 'strong',
    domain: 'heart',
    title: { ar: 'درع القلب الرباعي', de: 'Vierfach-Herzschild' },
    benefits: {
      ar: [
        'CoQ10 يدعم عضلة القلب الأعلى استهلاكاً للطاقة في الجسم',
        'فيتامين K2 يمنع تكلس الشرايين ويوجّه الكالسيوم للعظام',
        'أوميغا-3 يخفض الترايغليسريد ويعدّل ضغط الدم',
        'المغنيسيوم ينظّم إيقاع القلب الكهربائي',
      ],
      de: [
        'CoQ10 versorgt den Herzmuskel (höchster Energieverbrauch)',
        'Vitamin K2 verhindert Arterienverkalkung',
        'Omega-3 senkt Triglyceride, reguliert Blutdruck',
        'Magnesium stabilisiert Herzrhythmus elektrisch',
      ],
    },
    howTo: {
      ar: 'الجميع مع وجبة دسمة. المغنيسيوم مساءً بعيداً عن CoQ10.',
      de: 'Alle zu fetthaltiger Mahlzeit. Magnesium abends getrennt.',
    },
    foodBoosters: ['salmon', 'avocado', 'olive_oil', 'spinach'],
  },

  // --- Anti-inflammation ---
  {
    id: 'inflam-quench',
    nutrients: ['curcumin', 'omega3', 'quercetin'],
    evidence: 'strong',
    domain: 'immunity',
    title: { ar: 'إطفاء الالتهاب المزمن', de: 'Chronische Entzündung löschen' },
    benefits: {
      ar: [
        'الكركومين يكبح مسار NF-κB الالتهابي على المستوى الجيني',
        'EPA من أوميغا-3 يصنع رسائل مُحلّلة للالتهاب (Resolvins)',
        'كيرسيتين يثبّت الخلايا الصارية ويمنع إفراز الهيستامين',
      ],
      de: [
        'Curcumin hemmt NF-κB-Entzündungspfad auf Gen-Ebene',
        'EPA bildet entzündungsauflösende Resolvine',
        'Quercetin stabilisiert Mastzellen — weniger Histamin',
      ],
    },
    howTo: {
      ar: 'مع وجبة دسمة وفلفل أسود لرفع امتصاص الكركومين 20 ضعفاً.',
      de: 'Zu fetthaltiger Mahlzeit + schwarzer Pfeffer (20x Curcumin-Aufnahme).',
    },
    foodBoosters: ['salmon', 'olive_oil', 'broccoli', 'apple'],
  },

  // --- Hormonal / metabolic ---
  {
    id: 'insulin-sense',
    nutrients: ['chromium', 'magnesium', 'ala', 'inositol'],
    evidence: 'moderate',
    domain: 'hormones',
    title: { ar: 'حساسية الإنسولين العميقة', de: 'Tiefe Insulinsensitivität' },
    benefits: {
      ar: [
        'الكروم يقوّي عمل مستقبلات الإنسولين على الخلايا',
        'ALA يحسّن نقل الجلوكوز إلى داخل الخلية بكفاءة',
        'الإينوزيتول يعيد إشارة الإنسولين خاصة لدى متلازمة المبيض المتعدد',
      ],
      de: [
        'Chrom stärkt Insulinrezeptor-Signal',
        'ALA verbessert Glukose-Aufnahme in die Zelle',
        'Inositol stellt Insulinsignal wieder her (v.a. PCOS)',
      ],
    },
    howTo: {
      ar: 'مع الوجبات الكربوهيدراتية، الإينوزيتول صباحاً ومساءً.',
      de: 'Zu kohlenhydratreichen Mahlzeiten; Inositol morgens + abends.',
    },
    foodBoosters: ['broccoli', 'beans', 'oats'],
  },
  {
    id: 'thyroid-axis',
    nutrients: ['iodine', 'selenium', 'zinc', 'tyrosine' as never].filter(Boolean) as string[],
    // Note: tyrosine intentionally optional; only iodine/selenium/zinc tracked.
    evidence: 'moderate',
    domain: 'hormones',
    title: { ar: 'محور الغدة الدرقية', de: 'Schilddrüsen-Achse' },
    benefits: {
      ar: [
        'اليود يبني هرمونات T4 و T3 مباشرة',
        'السيلينيوم ينشّط إنزيم Deiodinase لتحويل T4 الخامل إلى T3 النشط',
        'الزنك ضروري لارتباط T3 بمستقبلاتها النووية',
      ],
      de: [
        'Jod baut T4 und T3 direkt auf',
        'Selen aktiviert Deiodinase: T4 → aktives T3',
        'Zink essenziell für T3-Rezeptor-Bindung',
      ],
    },
    howTo: {
      ar: 'صباحاً مع الإفطار، بعيداً عن مكملات الحديد والكالسيوم بـ 4 ساعات.',
      de: 'Morgens zum Frühstück, 4 Std. Abstand zu Eisen/Calcium.',
    },
    foodBoosters: ['salmon', 'eggs', 'beef'],
  },

  // --- Female hormonal ---
  {
    id: 'female-balance',
    nutrients: ['inositol', 'vitaminD', 'magnesium', 'p5p'],
    evidence: 'moderate',
    domain: 'hormones',
    title: { ar: 'توازن الهرمونات الأنثوية', de: 'Weibliches Hormongleichgewicht' },
    benefits: {
      ar: [
        'الإينوزيتول (Myo+DCI بنسبة 40:1) يعيد انتظام التبويض',
        'فيتامين د هرمون-ستيرويدي ينظّم استقبال الإستروجين',
        'P5P يخفّض البرولاكتين وأعراض ما قبل الحيض',
      ],
      de: [
        'Inositol (Myo+DCI 40:1) reguliert Eisprung',
        'Vitamin D als Steroidhormon — Östrogen-Rezeptoren',
        'P5P senkt Prolaktin und PMS-Symptome',
      ],
    },
    howTo: {
      ar: 'الإينوزيتول صباحاً ومساءً، فيتامين د مع وجبة دسمة.',
      de: 'Inositol morgens + abends, Vitamin D zu Fett-Mahlzeit.',
    },
    foodBoosters: ['salmon', 'eggs', 'avocado', 'spinach'],
  },

  // --- Performance ---
  {
    id: 'muscle-power',
    nutrients: ['creatine', 'protein', 'magnesium'],
    evidence: 'strong',
    domain: 'energy',
    title: { ar: 'قوة العضلات والاستشفاء', de: 'Muskelkraft & Regeneration' },
    benefits: {
      ar: [
        'الكرياتين يضاعف مخزون ATP الفوري في العضلات',
        'البروتين يوفر الأحماض الأمينية لبناء النسيج العضلي',
        'المغنيسيوم يمنع تشنجات العضلات بعد التمرين',
      ],
      de: [
        'Kreatin verdoppelt ATP-Speicher in Muskelzellen',
        'Protein liefert Aminosäuren für Muskelaufbau',
        'Magnesium verhindert Muskelkrämpfe nach dem Training',
      ],
    },
    howTo: {
      ar: 'الكرياتين 5مغ يومياً (وقت ثابت)، البروتين بعد التمرين.',
      de: 'Kreatin 5g täglich (fester Zeitpunkt), Protein nach Training.',
    },
    foodBoosters: ['beef', 'eggs', 'salmon', 'beans'],
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
  methylation:  { icon: '🧬', label: { ar: 'الميثيلة',     de: 'Methylierung' } },
  mitochondria: { icon: '🔋', label: { ar: 'الميتوكوندريا', de: 'Mitochondrien' } },
  cognition:    { icon: '🧠', label: { ar: 'الإدراك',       de: 'Kognition'    } },
  longevity:    { icon: '♾️', label: { ar: 'طول العمر',     de: 'Longevity'    } },
  detox:        { icon: '💧', label: { ar: 'إزالة السموم',  de: 'Entgiftung'   } },
  hormones:     { icon: '⚖️', label: { ar: 'الهرمونات',     de: 'Hormone'      } },
};

export const EVIDENCE_LABEL: Record<SynergyRule['evidence'], Record<Lang, string>> = {
  strong:   { ar: 'دليل قوي',     de: 'Starke Evidenz'   },
  moderate: { ar: 'دليل متوسط',   de: 'Mittlere Evidenz' },
  emerging: { ar: 'دليل أولي',     de: 'Vorläufig'        },
};
