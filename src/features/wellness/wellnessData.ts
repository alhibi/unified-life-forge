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
