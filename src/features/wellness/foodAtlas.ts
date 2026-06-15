/**
 * Food Atlas — comprehensive bilingual nutritional reference,
 * curated for athletes & active people in their 20s.
 *
 * Each food entry includes:
 *  • Macro & micro highlights
 *  • Glycemic impact
 *  • Optimal timing (pre/post workout, morning, evening)
 *  • Specific benefits for the 20-something body
 *  • Common pitfalls
 *
 * Pure data — no React, no network.
 */

export type Lang = 'ar' | 'de';

export type FoodGroup =
  | 'protein_animal' | 'protein_plant'
  | 'carbs_complex' | 'carbs_simple'
  | 'fats_healthy' | 'fats_essential'
  | 'micros_dense' | 'hydration'
  | 'superfood' | 'antioxidant';

export type MealTime =
  | 'morning' | 'pre_workout' | 'post_workout' | 'lunch' | 'dinner' | 'evening' | 'anytime';

export interface FoodAtlasEntry {
  key: string;
  emoji: string;
  /** Display color */
  color: string;
  group: FoodGroup;
  name: Record<Lang, string>;
  /** Per 100g typical serving */
  per100g: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  /** Glycemic Index (0-100) — null = irrelevant */
  glycemicIndex: number | null;
  /** Best times to eat */
  optimalTimes: MealTime[];
  /** Why this food matters for 20-somethings */
  benefits: Record<Lang, string[]>;
  /** Notable nutrients */
  keyNutrients: Record<Lang, string[]>;
  /** Pairing tip */
  pairing: Record<Lang, string>;
  /** Common pitfall */
  pitfall: Record<Lang, string>;
  /** Pro tip for athletes */
  athleteTip: Record<Lang, string>;
}

/* ═══════════════════════════════════════════════════════════════════
 *  THE ATLAS — 60+ foods curated for 20-somethings
 * ═══════════════════════════════════════════════════════════════════ */

export const FOOD_ATLAS: FoodAtlasEntry[] = [
  /* ────────── PROTEINS — ANIMAL ────────── */
  {
    key: 'eggs',
    emoji: '🥚',
    color: '#fbbf24',
    group: 'protein_animal',
    name: { ar: 'البيض الكامل', de: 'Ganze Eier' },
    per100g: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 },
    glycemicIndex: null,
    optimalTimes: ['morning', 'post_workout'],
    benefits: {
      ar: [
        'بروتين كامل بأعلى قيمة بيولوجية (100)',
        'صفار البيض غني بالكولين لبناء الدماغ',
        'يحتوي لوتين وزياكسانثين لحماية العين',
        'يدعم إنتاج التستوستيرون عبر الكوليسترول الجيد',
      ],
      de: [
        'Vollwertiges Protein mit höchstem biologischem Wert (100)',
        'Eigelb reich an Cholin für Gehirn',
        'Lutein + Zeaxanthin schützen die Augen',
        'Unterstützt Testosteronproduktion über Cholesterin',
      ],
    },
    keyNutrients: {
      ar: ['كولين', 'فيتامين B12', 'فيتامين D', 'سيلينيوم', 'ليوسين'],
      de: ['Cholin', 'Vitamin B12', 'Vitamin D', 'Selen', 'Leucin'],
    },
    pairing: {
      ar: 'مع الأفوكادو + توست حبوب كاملة = إفطار رياضي مثالي',
      de: 'Mit Avocado + Vollkorntoast = perfektes Sport-Frühstück',
    },
    pitfall: {
      ar: 'تجنب الإفراط في القلي بزيوت متحولة — تفقد البيض فوائده',
      de: 'Nicht in transfettreichen Ölen braten — zerstört Vorteile',
    },
    athleteTip: {
      ar: '3 بيضات كاملة بعد التمرين: 21غ بروتين + 6غ ليوسين = أقوى محفّز mTOR',
      de: '3 ganze Eier nach Training: 21 g Protein + 6 g Leucin = stärkster mTOR-Trigger',
    },
  },
  {
    key: 'salmon',
    emoji: '🐟',
    color: '#fb7185',
    group: 'protein_animal',
    name: { ar: 'سلمون', de: 'Lachs' },
    per100g: { kcal: 208, protein: 20, carbs: 0, fat: 13 },
    glycemicIndex: null,
    optimalTimes: ['lunch', 'dinner', 'post_workout'],
    benefits: {
      ar: [
        'أوميغا 3 (EPA/DHA) لمكافحة الالتهاب وحماية القلب',
        'فيتامين D النادر في الأطعمة',
        'بروتين سهل الهضم يبني العضلات',
        'يدعم وظائف الدماغ والمزاج',
      ],
      de: [
        'Omega-3 (EPA/DHA) gegen Entzündungen + Herzschutz',
        'Vitamin D (selten in Lebensmitteln)',
        'Leicht verdauliches Muskelprotein',
        'Unterstützt Gehirn + Stimmung',
      ],
    },
    keyNutrients: {
      ar: ['EPA', 'DHA', 'فيتامين D', 'سيلينيوم', 'B12', 'بروتين'],
      de: ['EPA', 'DHA', 'Vitamin D', 'Selen', 'B12', 'Protein'],
    },
    pairing: {
      ar: 'مع البطاطا الحلوة والبروكلي = وجبة استشفاء كاملة',
      de: 'Mit Süßkartoffel + Brokkoli = vollständige Recovery-Mahlzeit',
    },
    pitfall: {
      ar: 'السلمون المزرعي يحتوي أوميغا 6 أكثر — ابحث عن البري إن أمكن',
      de: 'Zuchtlachs hat mehr Omega-6 — wenn möglich Wildlachs',
    },
    athleteTip: {
      ar: '2 حصة أسبوعياً تحمي مفاصلك من إجهاد التمارين الكثيفة',
      de: '2 Portionen/Woche schützen Gelenke vor Trainings-Stress',
    },
  },
  {
    key: 'chicken_breast',
    emoji: '🍗',
    color: '#f87171',
    group: 'protein_animal',
    name: { ar: 'صدر دجاج', de: 'Hähnchenbrust' },
    per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    glycemicIndex: null,
    optimalTimes: ['lunch', 'dinner', 'post_workout'],
    benefits: {
      ar: [
        '31غ بروتين/100غ — أعلى نسبة بروتين بسعرات قليلة',
        'سيلينيوم مضاد للأكسدة',
        'B6 لتنظيم الإنسولين',
        'الخيار الأكثر اقتصادية لبناء العضلات',
      ],
      de: [
        '31 g Protein/100 g — höchster Anteil bei wenig Kalorien',
        'Selen als Antioxidans',
        'B6 für Insulinregulation',
        'Beste Preis-Leistung für Muskelaufbau',
      ],
    },
    keyNutrients: {
      ar: ['بروتين', 'B6', 'B12', 'نياسين', 'سيلينيوم', 'فوسفور'],
      de: ['Protein', 'B6', 'B12', 'Niacin', 'Selen', 'Phosphor'],
    },
    pairing: {
      ar: 'مع أرز بسمتي وخضار = وجبة مكتسب نظيف',
      de: 'Mit Basmati-Reis + Gemüse = sauberer Bulking-Klassiker',
    },
    pitfall: {
      ar: 'الإفراط في الطهي يجففه — اطبخه على درجة منخفضة',
      de: 'Übergaren macht trocken — niedrige Temperatur',
    },
    athleteTip: {
      ar: 'صدر دجاج + قطعة أناناس (إنزيم بروميلين) لهضم أسرع',
      de: 'Hähnchen + Ananas (Bromelain) für schnellere Verdauung',
    },
  },
  {
    key: 'beef_lean',
    emoji: '🥩',
    color: '#dc2626',
    group: 'protein_animal',
    name: { ar: 'لحم بقر هزيل', de: 'Mageres Rind' },
    per100g: { kcal: 250, protein: 26, carbs: 0, fat: 17 },
    glycemicIndex: null,
    optimalTimes: ['lunch', 'dinner'],
    benefits: {
      ar: [
        'كرياتين طبيعي يدعم القوة الانفجارية',
        'حديد هيمي بأعلى امتصاص',
        'زنك للتستوستيرون',
        'B12 لتكوين خلايا الدم',
      ],
      de: [
        'Natürliches Kreatin für explosive Kraft',
        'Häm-Eisen mit höchster Aufnahme',
        'Zink für Testosteron',
        'B12 für Blutbildung',
      ],
    },
    keyNutrients: {
      ar: ['كرياتين', 'حديد', 'زنك', 'B12', 'كارنيتين', 'CLA'],
      de: ['Kreatin', 'Eisen', 'Zink', 'B12', 'Carnitin', 'CLA'],
    },
    pairing: {
      ar: 'مع فلفل أحمر (فيتامين C) لمضاعفة امتصاص الحديد',
      de: 'Mit Paprika (Vit. C) verdoppelt die Eisenaufnahme',
    },
    pitfall: {
      ar: 'لحم محمر بشدّة ينتج مركبات مسرطنة (HCAs/PAHs)',
      de: 'Stark angebratenes Fleisch erzeugt karzinogene HCAs/PAHs',
    },
    athleteTip: {
      ar: 'مرّتين أسبوعياً يكفيك. أكثر من ذلك يضغط على الكلى مع كثرة البروتين',
      de: '2×/Woche reichen. Mehr belastet Nieren bei hoher Proteinzufuhr',
    },
  },
  {
    key: 'greek_yogurt',
    emoji: '🥛',
    color: '#e0e7ff',
    group: 'protein_animal',
    name: { ar: 'زبادي يوناني', de: 'Griechischer Joghurt' },
    per100g: { kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 },
    glycemicIndex: 11,
    optimalTimes: ['morning', 'post_workout', 'evening'],
    benefits: {
      ar: [
        'بروتين كازين بطيء الإطلاق — مثالي قبل النوم',
        'بروبيوتيك يدعم ميكروبيوم الأمعاء',
        'كالسيوم للعظام',
        'تربتوفان يحسّن النوم',
      ],
      de: [
        'Casein-Protein langsam — perfekt vor dem Schlaf',
        'Probiotika für Darm',
        'Kalzium für Knochen',
        'Tryptophan für besseren Schlaf',
      ],
    },
    keyNutrients: {
      ar: ['بروتين كازين', 'بروبيوتيك', 'كالسيوم', 'B12', 'فوسفور'],
      de: ['Casein', 'Probiotika', 'Kalzium', 'B12', 'Phosphor'],
    },
    pairing: {
      ar: 'مع توت بري + لوز + عسل = فطور البطل',
      de: 'Mit Beeren + Mandeln + Honig = Champion-Frühstück',
    },
    pitfall: {
      ar: 'الزبادي بنكهة مضاف له 15-20غ سكر — اختر السادة',
      de: 'Aromatisierte Sorten haben 15-20 g Zucker — wähle Natur',
    },
    athleteTip: {
      ar: '200غ قبل النوم = 20غ بروتين كازين يبني العضلات أثناء النوم',
      de: '200 g vor dem Schlafen = 20 g Casein für nächtlichen Muskelaufbau',
    },
  },
  {
    key: 'tuna',
    emoji: '🐟',
    color: '#3b82f6',
    group: 'protein_animal',
    name: { ar: 'تونة', de: 'Thunfisch' },
    per100g: { kcal: 144, protein: 30, carbs: 0, fat: 1 },
    glycemicIndex: null,
    optimalTimes: ['lunch', 'post_workout'],
    benefits: {
      ar: [
        'أعلى محتوى بروتين/سعرة في المأكولات البحرية',
        'سيلينيوم وأوميغا 3',
        'B12 لطاقة الجهاز العصبي',
        'فوسفور للعظام',
      ],
      de: [
        'Höchster Protein/Kalorie-Anteil bei Meeresfrüchten',
        'Selen + Omega-3',
        'B12 für Nerven',
        'Phosphor für Knochen',
      ],
    },
    keyNutrients: {
      ar: ['بروتين', 'سيلينيوم', 'B12', 'B3', 'فوسفور'],
      de: ['Protein', 'Selen', 'B12', 'B3', 'Phosphor'],
    },
    pairing: {
      ar: 'مع ليمون + طحينة على خبز كامل',
      de: 'Mit Zitrone + Tahini auf Vollkornbrot',
    },
    pitfall: {
      ar: 'لا تتجاوز 3 علب أسبوعياً — احتمال زئبق',
      de: 'Max 3 Dosen/Woche — Quecksilbergehalt',
    },
    athleteTip: {
      ar: 'تونة + أرز + خس = 40غ بروتين بسعرات منخفضة',
      de: 'Thunfisch + Reis + Salat = 40 g Protein bei wenig Kalorien',
    },
  },
  {
    key: 'cottage_cheese',
    emoji: '🥣',
    color: '#fef3c7',
    group: 'protein_animal',
    name: { ar: 'جبن قريش', de: 'Hüttenkäse' },
    per100g: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 },
    glycemicIndex: 30,
    optimalTimes: ['evening', 'post_workout'],
    benefits: {
      ar: [
        '80% كازين — البروتين الأبطأ هضماً',
        'يبقي العضلات مغذّاة 6-8 ساعات',
        'كالسيوم وفيتامين B12',
        'منخفض السعرات للحفاظ على الوزن',
      ],
      de: [
        '80% Casein — langsamstes Protein',
        'Versorgt Muskeln 6-8 Stunden',
        'Kalzium + B12',
        'Niedrigkalorisch für Gewichtskontrolle',
      ],
    },
    keyNutrients: {
      ar: ['كازين', 'كالسيوم', 'B12', 'فوسفور', 'سيلينيوم'],
      de: ['Casein', 'Kalzium', 'B12', 'Phosphor', 'Selen'],
    },
    pairing: {
      ar: 'مع توت أزرق + جوز عين الجمل قبل النوم',
      de: 'Mit Heidelbeeren + Walnüssen vor dem Schlaf',
    },
    pitfall: {
      ar: 'محتوى الصوديوم مرتفع — اختر القليل الملح',
      de: 'Hoher Natriumgehalt — wähle salzarme Variante',
    },
    athleteTip: {
      ar: 'الوجبة الأخيرة قبل النوم — يبني العضلات بدلاً من الهدم',
      de: 'Letzte Mahlzeit vor dem Schlaf — anabol über Nacht',
    },
  },

  /* ────────── PROTEINS — PLANT ────────── */
  {
    key: 'lentils',
    emoji: '🫘',
    color: '#a78bfa',
    group: 'protein_plant',
    name: { ar: 'عدس', de: 'Linsen' },
    per100g: { kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8 },
    glycemicIndex: 32,
    optimalTimes: ['lunch', 'dinner'],
    benefits: {
      ar: [
        'بروتين نباتي ممتاز + ألياف غنية',
        'حديد نباتي للنساء الرياضيات',
        'فولات لبناء خلايا جديدة',
        'يثبّت سكر الدم لساعات',
      ],
      de: [
        'Pflanzliches Protein + Ballaststoffe',
        'Pflanzliches Eisen für Athletinnen',
        'Folat für Zellbildung',
        'Stabilisiert Blutzucker stundenlang',
      ],
    },
    keyNutrients: {
      ar: ['بروتين', 'ألياف', 'حديد', 'فولات', 'مغنيسيوم'],
      de: ['Protein', 'Ballaststoffe', 'Eisen', 'Folat', 'Magnesium'],
    },
    pairing: {
      ar: 'مع أرز = بروتين كامل (تحوي كل الأحماض الأمينية)',
      de: 'Mit Reis = vollständiges Protein',
    },
    pitfall: {
      ar: 'انفخها بالماء 8 ساعات لإزالة مضادات المغذيات',
      de: 'Vor Kochen 8 h einweichen — entfernt Anti-Nährstoffe',
    },
    athleteTip: {
      ar: 'كوب عدس + 30غ شوفان = 25غ بروتين بـ 350 سعرة فقط',
      de: 'Tasse Linsen + 30 g Hafer = 25 g Protein bei 350 kcal',
    },
  },
  {
    key: 'chickpeas',
    emoji: '🫛',
    color: '#fbbf24',
    group: 'protein_plant',
    name: { ar: 'حمص', de: 'Kichererbsen' },
    per100g: { kcal: 164, protein: 9, carbs: 27, fat: 2.6, fiber: 8 },
    glycemicIndex: 28,
    optimalTimes: ['lunch', 'dinner', 'pre_workout'],
    benefits: {
      ar: [
        'كربوهيدرات معقدة + بروتين',
        'ألياف تحسّن الميكروبيوم',
        'مغنيسيوم لتوازن العضلات',
        'يطيل الشبع',
      ],
      de: [
        'Komplexe Kohlenhydrate + Protein',
        'Ballaststoffe für Mikrobiom',
        'Magnesium für Muskelbalance',
        'Sättigt lange',
      ],
    },
    keyNutrients: {
      ar: ['بروتين', 'ألياف', 'فولات', 'منغنيز', 'حديد'],
      de: ['Protein', 'Ballaststoffe', 'Folat', 'Mangan', 'Eisen'],
    },
    pairing: {
      ar: 'حمص محمص + زيت زيتون + ليمون = سناك مثالي',
      de: 'Geröstet mit Olivenöl + Zitrone = perfekter Snack',
    },
    pitfall: {
      ar: 'تناوله مع الماء بكميات كبيرة قد يسبّب انتفاخاً',
      de: 'Mit viel Wasser kann blähen',
    },
    athleteTip: {
      ar: 'حمص + بطاطا حلوة قبل التمرين = طاقة 3 ساعات',
      de: 'Mit Süßkartoffel vorm Training = 3 h Energie',
    },
  },
  {
    key: 'tofu',
    emoji: '🧈',
    color: '#fef3c7',
    group: 'protein_plant',
    name: { ar: 'توفو', de: 'Tofu' },
    per100g: { kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
    glycemicIndex: 15,
    optimalTimes: ['lunch', 'dinner'],
    benefits: {
      ar: [
        'بروتين نباتي كامل',
        'إيزوفلافون يدعم صحة القلب',
        'كالسيوم نباتي',
        'منخفض السعرات بشكل ممتاز',
      ],
      de: [
        'Vollwertiges Pflanzenprotein',
        'Isoflavone für Herzgesundheit',
        'Pflanzliches Kalzium',
        'Sehr kalorienarm',
      ],
    },
    keyNutrients: {
      ar: ['بروتين', 'كالسيوم', 'حديد', 'مغنيسيوم', 'سيلينيوم'],
      de: ['Protein', 'Kalzium', 'Eisen', 'Magnesium', 'Selen'],
    },
    pairing: {
      ar: 'توفو مقرمش + خضار آسيوية + أرز بني',
      de: 'Knusprig + asiatisches Gemüse + Naturreis',
    },
    pitfall: {
      ar: 'توفو غير مخمّر يحتوي مضادات مغذيات — اختر التيمبه أحياناً',
      de: 'Unfermentierter Tofu hat Anti-Nährstoffe — abwechselnd Tempeh',
    },
    athleteTip: {
      ar: 'تتبيلة 30 دقيقة تجعل التوفو لذيذاً وغنياً بالنكهة',
      de: '30 min marinieren macht Tofu schmackhaft',
    },
  },
  {
    key: 'tempeh',
    emoji: '🥖',
    color: '#a16207',
    group: 'protein_plant',
    name: { ar: 'تيمبه', de: 'Tempeh' },
    per100g: { kcal: 192, protein: 19, carbs: 9, fat: 11, fiber: 9 },
    glycemicIndex: 15,
    optimalTimes: ['lunch', 'dinner'],
    benefits: {
      ar: [
        'فول صويا مخمّر — أعلى امتصاصاً من التوفو',
        'بروبيوتيك للأمعاء',
        '19غ بروتين/100غ',
        'B12 طبيعي (التخمر)',
      ],
      de: [
        'Fermentierte Sojabohnen — bessere Aufnahme als Tofu',
        'Probiotika für den Darm',
        '19 g Protein/100 g',
        'Natürliches B12 durch Fermentation',
      ],
    },
    keyNutrients: {
      ar: ['بروتين', 'بروبيوتيك', 'B12', 'حديد', 'منغنيز'],
      de: ['Protein', 'Probiotika', 'B12', 'Eisen', 'Mangan'],
    },
    pairing: {
      ar: 'تيمبه مشوي + خضار + كينوا',
      de: 'Gegrillt + Gemüse + Quinoa',
    },
    pitfall: {
      ar: 'سعراته أعلى من التوفو — اضبط الحصة',
      de: 'Höhere Kalorien als Tofu — Portion kontrollieren',
    },
    athleteTip: {
      ar: 'بديل ممتاز للحوم الحمراء — أقل التهاب وأغنى ميكروبيومياً',
      de: 'Top-Ersatz für rotes Fleisch — weniger entzündlich',
    },
  },

  /* ────────── COMPLEX CARBS ────────── */
  {
    key: 'oats',
    emoji: '🌾',
    color: '#f59e0b',
    group: 'carbs_complex',
    name: { ar: 'شوفان', de: 'Hafer' },
    per100g: { kcal: 389, protein: 17, carbs: 66, fat: 7, fiber: 11 },
    glycemicIndex: 55,
    optimalTimes: ['morning', 'pre_workout'],
    benefits: {
      ar: [
        'بيتا-جلوكان يخفض الكوليسترول',
        'كربوهيدرات بطيئة الإطلاق',
        'ألياف للشبع',
        'مغنيسيوم وزنك',
      ],
      de: [
        'Beta-Glucan senkt Cholesterin',
        'Langsam freisetzende Kohlenhydrate',
        'Ballaststoffe für Sättigung',
        'Magnesium + Zink',
      ],
    },
    keyNutrients: {
      ar: ['بيتا-جلوكان', 'منغنيز', 'فوسفور', 'مغنيسيوم', 'B1'],
      de: ['Beta-Glucan', 'Mangan', 'Phosphor', 'Magnesium', 'B1'],
    },
    pairing: {
      ar: '50غ شوفان + موزة + 20غ بروتين = إفطار رياضي مثالي',
      de: '50 g Hafer + Banane + 20 g Protein = perfekt',
    },
    pitfall: {
      ar: 'شوفان فوري يرفع السكر بسرعة — اختر القطع الكبير (Steel-Cut)',
      de: 'Instant erhöht Blutzucker schnell — Steel-Cut wählen',
    },
    athleteTip: {
      ar: 'انقع الشوفان طوال الليل — أسهل هضماً وأغنى مغذيات',
      de: 'Über Nacht einweichen — bessere Verdauung + Nährstoffe',
    },
  },
  {
    key: 'sweet_potato',
    emoji: '🍠',
    color: '#ea580c',
    group: 'carbs_complex',
    name: { ar: 'بطاطا حلوة', de: 'Süßkartoffel' },
    per100g: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
    glycemicIndex: 54,
    optimalTimes: ['lunch', 'pre_workout', 'post_workout'],
    benefits: {
      ar: [
        'بيتا-كاروتين بكميات هائلة (فيتامين A)',
        'كربوهيدرات منخفضة الـ GI',
        'بوتاسيوم لمنع التشنّجات',
        'مضادات أكسدة للجلد',
      ],
      de: [
        'Massive Beta-Carotin (Vitamin A)',
        'Niedriger GI',
        'Kalium gegen Krämpfe',
        'Antioxidantien für die Haut',
      ],
    },
    keyNutrients: {
      ar: ['بيتا-كاروتين', 'فيتامين C', 'B6', 'بوتاسيوم', 'منغنيز'],
      de: ['Beta-Carotin', 'Vitamin C', 'B6', 'Kalium', 'Mangan'],
    },
    pairing: {
      ar: 'بطاطا حلوة + سلمون = أعلى مكسب صحي',
      de: 'Mit Lachs = höchster Gesundheitsnutzen',
    },
    pitfall: {
      ar: 'القلي يرفع السعرات 3× — اشويها أو ابخرها',
      de: 'Frittiert verdreifacht die Kalorien — backen/dämpfen',
    },
    athleteTip: {
      ar: '200غ قبل التمرين بساعتين = طاقة مستقرة بدون قمم سكر',
      de: '200 g 2 h vor Training = stabile Energie',
    },
  },
  {
    key: 'quinoa',
    emoji: '🌾',
    color: '#facc15',
    group: 'carbs_complex',
    name: { ar: 'كينوا', de: 'Quinoa' },
    per100g: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
    glycemicIndex: 53,
    optimalTimes: ['lunch', 'dinner', 'post_workout'],
    benefits: {
      ar: [
        'بروتين نباتي كامل (كل 9 أحماض أساسية)',
        'خالية من الجلوتين',
        'حديد ومغنيسيوم',
        'مؤشر سكر منخفض',
      ],
      de: [
        'Vollwertiges Pflanzenprotein',
        'Glutenfrei',
        'Eisen + Magnesium',
        'Niedriger GI',
      ],
    },
    keyNutrients: {
      ar: ['بروتين كامل', 'منغنيز', 'فوسفور', 'مغنيسيوم', 'فولات'],
      de: ['Vollwertprotein', 'Mangan', 'Phosphor', 'Magnesium', 'Folat'],
    },
    pairing: {
      ar: 'كينوا + خضروات مشوية + جوز = وجبة قوس قزح',
      de: 'Mit gebratenem Gemüse + Nüssen = Regenbogen-Mahl',
    },
    pitfall: {
      ar: 'اشطفها جيداً — تحتوي السابونين المرّ',
      de: 'Gut waschen — enthält bitteres Saponin',
    },
    athleteTip: {
      ar: 'كينوا بدلاً من الأرز الأبيض = ضعف البروتين والألياف',
      de: 'Quinoa statt Reis = doppelt Protein + Ballaststoffe',
    },
  },
  {
    key: 'brown_rice',
    emoji: '🍚',
    color: '#92400e',
    group: 'carbs_complex',
    name: { ar: 'أرز بني', de: 'Naturreis' },
    per100g: { kcal: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
    glycemicIndex: 50,
    optimalTimes: ['lunch', 'dinner', 'pre_workout'],
    benefits: {
      ar: [
        'كربوهيدرات معقدة لطاقة مستدامة',
        'منغنيز للعظام',
        'B1 للأعصاب',
        'سيلينيوم لمضادات الأكسدة',
      ],
      de: [
        'Komplexe Carbs für nachhaltige Energie',
        'Mangan für Knochen',
        'B1 für Nerven',
        'Selen als Antioxidans',
      ],
    },
    keyNutrients: {
      ar: ['منغنيز', 'سيلينيوم', 'B1', 'مغنيسيوم', 'ألياف'],
      de: ['Mangan', 'Selen', 'B1', 'Magnesium', 'Ballaststoffe'],
    },
    pairing: {
      ar: 'أرز بني + دجاج + بروكلي = ثلاثية البطل',
      de: 'Naturreis + Hähnchen + Brokkoli = Klassiker',
    },
    pitfall: {
      ar: 'أرز أبيض أسرع امتصاصاً قبل التمرين بـ30 دقيقة',
      de: 'Weißer Reis ist 30 min vor Training besser',
    },
    athleteTip: {
      ar: 'كوب أرز بني (45غ كربوهيدرات) للأكلات الكبرى مع بروتين',
      de: 'Tasse Naturreis (45 g Carbs) zu Hauptmahlzeiten',
    },
  },

  /* ────────── HEALTHY FATS ────────── */
  {
    key: 'avocado',
    emoji: '🥑',
    color: '#65a30d',
    group: 'fats_healthy',
    name: { ar: 'أفوكادو', de: 'Avocado' },
    per100g: { kcal: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },
    glycemicIndex: 15,
    optimalTimes: ['morning', 'lunch', 'pre_workout'],
    benefits: {
      ar: [
        'دهون أحادية غير مشبعة (أوميغا 9)',
        'بوتاسيوم أكثر من الموز',
        'ألياف عالية',
        'يحسّن امتصاص الفيتامينات الذائبة في الدهون',
      ],
      de: [
        'Einfach ungesättigte Fette (Omega-9)',
        'Mehr Kalium als Banane',
        'Hohe Ballaststoffe',
        'Verbessert Aufnahme fettlöslicher Vitamine',
      ],
    },
    keyNutrients: {
      ar: ['أوميغا 9', 'بوتاسيوم', 'فولات', 'فيتامين E', 'فيتامين K'],
      de: ['Omega-9', 'Kalium', 'Folat', 'Vitamin E', 'Vitamin K'],
    },
    pairing: {
      ar: 'أفوكادو + بيض + خبز كامل = قوة الإفطار',
      de: 'Mit Eiern + Vollkornbrot = Frühstücksbombe',
    },
    pitfall: {
      ar: 'كثيف السعرات — حصة واحدة (نصف ثمرة) = 160 سعرة',
      de: 'Kalorienreich — halbe Frucht = 160 kcal',
    },
    athleteTip: {
      ar: 'مع البيض في الإفطار يضاعف امتصاص فيتامين D من الصفار',
      de: 'Mit Eiern verdoppelt Vitamin-D-Aufnahme',
    },
  },
  {
    key: 'olive_oil',
    emoji: '🫒',
    color: '#65a30d',
    group: 'fats_healthy',
    name: { ar: 'زيت زيتون بكر', de: 'Natives Olivenöl' },
    per100g: { kcal: 884, protein: 0, carbs: 0, fat: 100 },
    glycemicIndex: null,
    optimalTimes: ['anytime'],
    benefits: {
      ar: [
        'أوليوكانثال = إيبوبروفين طبيعي مضاد للالتهاب',
        'بوليفينولات للقلب',
        'يحسّن صحة بطانة الأوعية',
        'أساس النظام المتوسطي',
      ],
      de: [
        'Oleocanthal = natürliches Ibuprofen',
        'Polyphenole fürs Herz',
        'Verbessert Gefäßgesundheit',
        'Basis der Mittelmeerdiät',
      ],
    },
    keyNutrients: {
      ar: ['أوميغا 9', 'فيتامين E', 'بوليفينولات', 'سكوالين'],
      de: ['Omega-9', 'Vitamin E', 'Polyphenole', 'Squalen'],
    },
    pairing: {
      ar: 'فوق السلطة + الخضار = امتصاص فيتامينات أقوى',
      de: 'Über Salat + Gemüse = bessere Vitaminaufnahme',
    },
    pitfall: {
      ar: 'لا تطبخه على نار عالية جداً — يفقد البوليفينولات',
      de: 'Nicht zu heiß braten — Polyphenole zerfallen',
    },
    athleteTip: {
      ar: 'ملعقة كبيرة على الإفطار = حماية من التهاب التمارين',
      de: 'EL morgens schützt vor Trainings-Entzündungen',
    },
  },
  {
    key: 'almonds',
    emoji: '🌰',
    color: '#92400e',
    group: 'fats_healthy',
    name: { ar: 'لوز', de: 'Mandeln' },
    per100g: { kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12 },
    glycemicIndex: 0,
    optimalTimes: ['morning', 'pre_workout', 'evening'],
    benefits: {
      ar: [
        'فيتامين E مضاد أكسدة قوي',
        'مغنيسيوم لتقلصات العضلات',
        'يخفض LDL ويرفع HDL',
        'بروتين نباتي + دهون صحية',
      ],
      de: [
        'Vitamin E starkes Antioxidans',
        'Magnesium gegen Krämpfe',
        'Senkt LDL, erhöht HDL',
        'Pflanzliches Protein + gesunde Fette',
      ],
    },
    keyNutrients: {
      ar: ['فيتامين E', 'مغنيسيوم', 'منغنيز', 'بروتين', 'ريبوفلافين'],
      de: ['Vitamin E', 'Magnesium', 'Mangan', 'Protein', 'Riboflavin'],
    },
    pairing: {
      ar: '20غ لوز + تفاحة = سناك صحي مثالي',
      de: '20 g Mandeln + Apfel = perfekter Snack',
    },
    pitfall: {
      ar: 'سهل الإفراط — حفنة (28غ) = 165 سعرة',
      de: 'Leicht zu überdosieren — Handvoll (28 g) = 165 kcal',
    },
    athleteTip: {
      ar: 'انقعها 8 ساعات لإطلاق المعادن — أسهل هضماً',
      de: '8 h einweichen — bessere Mineralfreisetzung',
    },
  },
  {
    key: 'walnuts',
    emoji: '🌰',
    color: '#78350f',
    group: 'fats_essential',
    name: { ar: 'جوز عين الجمل', de: 'Walnüsse' },
    per100g: { kcal: 654, protein: 15, carbs: 14, fat: 65, fiber: 7 },
    glycemicIndex: 0,
    optimalTimes: ['morning', 'evening'],
    benefits: {
      ar: [
        'أعلى مصدر نباتي لأوميغا 3 (ALA)',
        'يدعم الدماغ (الشكل يشبه الدماغ ليس صدفة)',
        'يحسّن جودة الحيوانات المنوية للرجال',
        'يقلّل الالتهاب',
      ],
      de: [
        'Höchste pflanzliche Omega-3-Quelle',
        'Unterstützt Gehirn',
        'Verbessert Spermienqualität bei Männern',
        'Reduziert Entzündung',
      ],
    },
    keyNutrients: {
      ar: ['أوميغا 3 (ALA)', 'منغنيز', 'فولات', 'فيتامين E'],
      de: ['Omega-3 (ALA)', 'Mangan', 'Folat', 'Vitamin E'],
    },
    pairing: {
      ar: 'جوز + توت + شوفان = إفطار الذكاء',
      de: 'Walnüsse + Beeren + Hafer = Hirn-Frühstück',
    },
    pitfall: {
      ar: 'يتأكسد بسرعة — احفظه في الثلاجة',
      de: 'Oxidiert schnell — kühl lagern',
    },
    athleteTip: {
      ar: '5 حبات يومياً تكفي لتغطية أوميغا 3 النباتي',
      de: '5 Stück täglich decken pflanzliches Omega-3',
    },
  },

  /* ────────── ANTIOXIDANTS / SUPERFOODS ────────── */
  {
    key: 'blueberries',
    emoji: '🫐',
    color: '#3730a3',
    group: 'antioxidant',
    name: { ar: 'توت أزرق', de: 'Heidelbeeren' },
    per100g: { kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
    glycemicIndex: 53,
    optimalTimes: ['morning', 'post_workout', 'pre_workout'],
    benefits: {
      ar: [
        'أعلى ORAC (مضادات أكسدة) في الفواكه',
        'أنثوسيانينات تحمي الدماغ والذاكرة',
        'تسرّع تعافي العضلات بعد التمرين',
        'تحسّن جودة النوم',
      ],
      de: [
        'Höchster ORAC-Wert',
        'Anthocyane schützen Gehirn + Gedächtnis',
        'Beschleunigt Muskelregeneration',
        'Verbessert Schlafqualität',
      ],
    },
    keyNutrients: {
      ar: ['أنثوسيانين', 'فيتامين C', 'فيتامين K', 'منغنيز'],
      de: ['Anthocyane', 'Vitamin C', 'Vitamin K', 'Mangan'],
    },
    pairing: {
      ar: 'توت + زبادي + جوز = ثلاثية ضد الشيخوخة',
      de: 'Mit Joghurt + Walnüssen = Anti-Aging-Trio',
    },
    pitfall: {
      ar: 'المجمّد له نفس الفوائد — لا تدفع للطازج فقط',
      de: 'Gefroren genauso gut — kein Aufpreis nötig',
    },
    athleteTip: {
      ar: 'كوب توت أزرق بعد التمرين يقلّل الألم العضلي 30%',
      de: 'Tasse nach Training reduziert Muskelkater um 30%',
    },
  },
  {
    key: 'spinach',
    emoji: '🌿',
    color: '#15803d',
    group: 'micros_dense',
    name: { ar: 'سبانخ', de: 'Spinat' },
    per100g: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
    glycemicIndex: 15,
    optimalTimes: ['anytime'],
    benefits: {
      ar: [
        'نترات طبيعية تحسّن الأداء الرياضي',
        'حديد + كلوروفيل = طاقة',
        'فولات لخلايا جديدة',
        'لوتين للعين',
      ],
      de: [
        'Nitrate verbessern Leistung',
        'Eisen + Chlorophyll = Energie',
        'Folat für neue Zellen',
        'Lutein für Augen',
      ],
    },
    keyNutrients: {
      ar: ['نترات', 'حديد', 'فولات', 'فيتامين K', 'مغنيسيوم'],
      de: ['Nitrate', 'Eisen', 'Folat', 'Vitamin K', 'Magnesium'],
    },
    pairing: {
      ar: 'سبانخ + ليمون = ضعف امتصاص الحديد',
      de: 'Mit Zitrone = doppelte Eisenaufnahme',
    },
    pitfall: {
      ar: 'حمض الأكساليك يقلل الكالسيوم — اطبخه أحياناً',
      de: 'Oxalsäure bindet Kalzium — gelegentlich kochen',
    },
    athleteTip: {
      ar: '200غ سبانخ قبل التمرين بساعتين = طاقة دموية أفضل',
      de: '200 g 2 h vor Training = bessere Durchblutung',
    },
  },
  {
    key: 'broccoli',
    emoji: '🥦',
    color: '#16a34a',
    group: 'micros_dense',
    name: { ar: 'بروكلي', de: 'Brokkoli' },
    per100g: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
    glycemicIndex: 15,
    optimalTimes: ['lunch', 'dinner'],
    benefits: {
      ar: [
        'سلفورافان مضاد سرطاني قوي',
        'يخفّض هرمون الإستروجين الزائد',
        'فيتامين C + K',
        'كروم لحساسية الإنسولين',
      ],
      de: [
        'Sulforaphan stark antikanzerogen',
        'Senkt überschüssiges Östrogen',
        'Vitamin C + K',
        'Chrom für Insulinsensitivität',
      ],
    },
    keyNutrients: {
      ar: ['سلفورافان', 'فيتامين C', 'فيتامين K', 'فولات', 'كروم'],
      de: ['Sulforaphan', 'Vitamin C', 'Vitamin K', 'Folat', 'Chrom'],
    },
    pairing: {
      ar: 'مع لحم بقر = ضعف امتصاص الحديد',
      de: 'Mit Rind = doppelte Eisenaufnahme',
    },
    pitfall: {
      ar: 'الغلي يفقد 50% من السلفورافان — البخار أفضل',
      de: 'Kochen verliert 50% Sulforaphan — dämpfen',
    },
    athleteTip: {
      ar: '3-4 حصص أسبوعياً تنظّم هرمونات الذكور',
      de: '3-4 Portionen/Woche regulieren männliche Hormone',
    },
  },
  {
    key: 'green_tea',
    emoji: '🍵',
    color: '#15803d',
    group: 'antioxidant',
    name: { ar: 'شاي أخضر', de: 'Grüner Tee' },
    per100g: { kcal: 1, protein: 0.2, carbs: 0, fat: 0 },
    glycemicIndex: null,
    optimalTimes: ['morning', 'pre_workout'],
    benefits: {
      ar: [
        'EGCG يحرق الدهون',
        'إل-ثيانين للتركيز الهادئ',
        'ينشّط الأيض 4-5%',
        'يحمي الدماغ من الشيخوخة',
      ],
      de: [
        'EGCG verbrennt Fett',
        'L-Theanin für ruhigen Fokus',
        'Erhöht Stoffwechsel um 4-5%',
        'Schützt Gehirn vor Alterung',
      ],
    },
    keyNutrients: {
      ar: ['EGCG', 'إل-ثيانين', 'كافيين معتدل', 'بوليفينولات'],
      de: ['EGCG', 'L-Theanin', 'Mäßiges Koffein', 'Polyphenole'],
    },
    pairing: {
      ar: 'مع ليمون = ضعف امتصاص الكاتيكينات',
      de: 'Mit Zitrone = doppelte Catechin-Aufnahme',
    },
    pitfall: {
      ar: 'لا تشربه مع الوجبات الغنية بالحديد — يقلّل امتصاصه',
      de: 'Nicht zu eisenhaltigen Mahlzeiten — hemmt Aufnahme',
    },
    athleteTip: {
      ar: '2-3 أكواب يومياً + كوب قبل التمرين بـ 30 دقيقة',
      de: '2-3 Tassen täglich + 1 Tasse 30 min vor Training',
    },
  },
  {
    key: 'turmeric',
    emoji: '🟡',
    color: '#ca8a04',
    group: 'superfood',
    name: { ar: 'كركم', de: 'Kurkuma' },
    per100g: { kcal: 312, protein: 9.7, carbs: 67, fat: 3.2 },
    glycemicIndex: null,
    optimalTimes: ['morning', 'evening'],
    benefits: {
      ar: [
        'كركومين مضاد التهاب أقوى من بعض الأدوية',
        'يحسّن المزاج والدماغ',
        'يحمي الكبد',
        'يسرّع تعافي العضلات',
      ],
      de: [
        'Curcumin stärkster natürlicher Entzündungshemmer',
        'Verbessert Stimmung + Gehirn',
        'Schützt die Leber',
        'Beschleunigt Recovery',
      ],
    },
    keyNutrients: {
      ar: ['كركومين', 'منغنيز', 'حديد', 'بوتاسيوم'],
      de: ['Curcumin', 'Mangan', 'Eisen', 'Kalium'],
    },
    pairing: {
      ar: 'مع فلفل أسود (بيبيرين) = 2000% امتصاص أعلى',
      de: 'Mit schwarzem Pfeffer (Piperin) = 2000% mehr Aufnahme',
    },
    pitfall: {
      ar: 'بدون فلفل أسود = امتصاص ضعيف جداً',
      de: 'Ohne schwarzen Pfeffer kaum Wirkung',
    },
    athleteTip: {
      ar: 'ملعقة في الحليب الذهبي قبل النوم = نوم + تعافي أفضل',
      de: 'TL in goldener Milch vor Schlaf = bessere Recovery',
    },
  },
  {
    key: 'dark_chocolate',
    emoji: '🍫',
    color: '#451a03',
    group: 'antioxidant',
    name: { ar: 'شوكولاتة داكنة 85%+', de: 'Zartbitter 85%+' },
    per100g: { kcal: 600, protein: 8, carbs: 30, fat: 50, fiber: 11 },
    glycemicIndex: 23,
    optimalTimes: ['pre_workout', 'evening'],
    benefits: {
      ar: [
        'فلافانول يحسّن تدفق الدم 20%',
        'مغنيسيوم وحديد',
        'PEA يرفع المزاج',
        'ضخ عضلي أفضل قبل التمرين',
      ],
      de: [
        'Flavanole verbessern Blutfluss um 20%',
        'Magnesium + Eisen',
        'PEA hebt Stimmung',
        'Besserer Pump vorm Training',
      ],
    },
    keyNutrients: {
      ar: ['فلافانول', 'مغنيسيوم', 'حديد', 'كافيين', 'ثيوبرومين'],
      de: ['Flavanole', 'Magnesium', 'Eisen', 'Koffein', 'Theobromin'],
    },
    pairing: {
      ar: 'قطعتان + جوز = سناك ما قبل التمرين',
      de: '2 Stück + Walnüsse = Pre-Workout-Snack',
    },
    pitfall: {
      ar: 'تحت 70% كاكاو = حلوى لا فائدة',
      de: 'Unter 70% Kakao = Süßigkeit ohne Nutzen',
    },
    athleteTip: {
      ar: '20غ قبل التمرين بـ 30 دقيقة = ضخ + تركيز',
      de: '20 g 30 min vor Training = Pump + Fokus',
    },
  },
  {
    key: 'beetroot',
    emoji: '🥬',
    color: '#9d174d',
    group: 'superfood',
    name: { ar: 'شمندر', de: 'Rote Bete' },
    per100g: { kcal: 43, protein: 1.6, carbs: 10, fat: 0.2, fiber: 2.8 },
    glycemicIndex: 64,
    optimalTimes: ['pre_workout'],
    benefits: {
      ar: [
        'نترات تحسّن أداء التحمل 10-20%',
        'تخفض ضغط الدم',
        'تزيد قدرة العضلات',
        'فولات للقلب',
      ],
      de: [
        'Nitrate verbessern Ausdauer um 10-20%',
        'Senkt Blutdruck',
        'Erhöht Muskelkapazität',
        'Folat fürs Herz',
      ],
    },
    keyNutrients: {
      ar: ['نترات', 'فولات', 'منغنيز', 'بوتاسيوم'],
      de: ['Nitrate', 'Folat', 'Mangan', 'Kalium'],
    },
    pairing: {
      ar: 'عصير شمندر + تفاح + ليمون = pre-workout طبيعي',
      de: 'Saft + Apfel + Zitrone = natürliches Pre-Workout',
    },
    pitfall: {
      ar: 'يصبغ البول أحمر — لا داعي للقلق',
      de: 'Färbt Urin rot — harmlos',
    },
    athleteTip: {
      ar: 'كوب عصير قبل ساعتين من سباق/HIIT = أداء أفضل علمياً',
      de: 'Saft 2 h vor Wettkampf/HIIT = wissenschaftlich besser',
    },
  },
  {
    key: 'garlic',
    emoji: '🧄',
    color: '#fef9c3',
    group: 'superfood',
    name: { ar: 'ثوم', de: 'Knoblauch' },
    per100g: { kcal: 149, protein: 6.4, carbs: 33, fat: 0.5 },
    glycemicIndex: 30,
    optimalTimes: ['anytime'],
    benefits: {
      ar: [
        'أليسين مضاد بكتيري وفيروسي',
        'يخفض ضغط الدم والكوليسترول',
        'يدعم المناعة',
        'مضاد التهاب طبيعي',
      ],
      de: [
        'Allicin antibakteriell + antiviral',
        'Senkt Blutdruck + Cholesterin',
        'Stärkt Immunsystem',
        'Natürlicher Entzündungshemmer',
      ],
    },
    keyNutrients: {
      ar: ['أليسين', 'منغنيز', 'B6', 'فيتامين C', 'سيلينيوم'],
      de: ['Allicin', 'Mangan', 'B6', 'Vitamin C', 'Selen'],
    },
    pairing: {
      ar: 'مهروس + زيت زيتون = ينشط الأليسين بأقصى صورة',
      de: 'Zerdrückt + Olivenöl = aktiviert Allicin maximal',
    },
    pitfall: {
      ar: 'تناوله نيئاً (بعد 10 دقائق من القطع) — الطبخ يدمّر الأليسين',
      de: 'Roh essen (10 min nach Schneiden) — Hitze zerstört Allicin',
    },
    athleteTip: {
      ar: 'فص ثوم نيء يومياً يقلّل العدوى التنفسية 60% للرياضيين',
      de: 'Tägl. roh reduziert Atemwegsinfekte bei Athleten um 60%',
    },
  },
  {
    key: 'ginger',
    emoji: '🫚',
    color: '#fbbf24',
    group: 'superfood',
    name: { ar: 'زنجبيل', de: 'Ingwer' },
    per100g: { kcal: 80, protein: 1.8, carbs: 18, fat: 0.8 },
    glycemicIndex: 15,
    optimalTimes: ['morning', 'post_workout'],
    benefits: {
      ar: [
        'جنجرول مضاد التهاب وألم',
        'يحسّن الهضم وامتصاص المغذيات',
        'يقلل الألم العضلي بعد التمرين',
        'يدفئ الجسم',
      ],
      de: [
        'Gingerol entzündungshemmend',
        'Verbessert Verdauung',
        'Reduziert Muskelkater',
        'Wärmt den Körper',
      ],
    },
    keyNutrients: {
      ar: ['جنجرول', 'منغنيز', 'مغنيسيوم', 'فيتامين C'],
      de: ['Gingerol', 'Mangan', 'Magnesium', 'Vitamin C'],
    },
    pairing: {
      ar: 'شاي زنجبيل + ليمون + عسل = صباح المحارب',
      de: 'Tee + Zitrone + Honig = Krieger-Morgen',
    },
    pitfall: {
      ar: 'مع الأدوية المسيلة للدم = حذر طبي',
      de: 'Mit Blutverdünnern Vorsicht',
    },
    athleteTip: {
      ar: '2غ يومياً يقلّل الألم العضلي 25%',
      de: '2 g täglich reduzieren Muskelkater um 25%',
    },
  },

  /* ────────── HYDRATION ────────── */
  {
    key: 'water',
    emoji: '💧',
    color: '#06b6d4',
    group: 'hydration',
    name: { ar: 'ماء', de: 'Wasser' },
    per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    glycemicIndex: null,
    optimalTimes: ['anytime'],
    benefits: {
      ar: [
        'ينقل المغذيات للخلايا',
        'يطرد السموم',
        'ينظم درجة الحرارة',
        '2% جفاف يخفض الأداء 10-20%',
      ],
      de: [
        'Transportiert Nährstoffe',
        'Spült Toxine',
        'Regelt Temperatur',
        '2% Dehydration senkt Leistung um 10-20%',
      ],
    },
    keyNutrients: {
      ar: ['H2O النقي', 'معادن (حسب المصدر)'],
      de: ['Reines H2O', 'Mineralien (je nach Quelle)'],
    },
    pairing: {
      ar: 'مع رشة ملح هيمالايا + ليمون قبل التمرين = إلكتروليتات طبيعية',
      de: 'Mit Prise Salz + Zitrone = natürliche Elektrolyte',
    },
    pitfall: {
      ar: 'الإفراط (>5 لتر/ساعة) = نقص صوديوم',
      de: 'Übermaß (>5 L/h) = Hyponatriämie',
    },
    athleteTip: {
      ar: '35مل/كجم وزن جسم/يوم + 500مل لكل ساعة تمرين',
      de: '35 ml/kg KG/Tag + 500 ml pro Trainingsstunde',
    },
  },
  {
    key: 'coconut_water',
    emoji: '🥥',
    color: '#f4f4f5',
    group: 'hydration',
    name: { ar: 'ماء جوز الهند', de: 'Kokoswasser' },
    per100g: { kcal: 19, protein: 0.7, carbs: 3.7, fat: 0.2 },
    glycemicIndex: 54,
    optimalTimes: ['post_workout', 'pre_workout'],
    benefits: {
      ar: [
        'إلكتروليتات طبيعية',
        'بوتاسيوم أعلى من الموز',
        'سكر طبيعي خفيف لإعادة التزود',
        'منخفض السعرات',
      ],
      de: [
        'Natürliche Elektrolyte',
        'Mehr Kalium als Banane',
        'Leichter Zucker zum Auffüllen',
        'Niedrigkalorisch',
      ],
    },
    keyNutrients: {
      ar: ['بوتاسيوم', 'مغنيسيوم', 'صوديوم', 'سكر طبيعي'],
      de: ['Kalium', 'Magnesium', 'Natrium', 'Natürlicher Zucker'],
    },
    pairing: {
      ar: 'بعد التمرين مع رشة ملح = مشروب رياضي طبيعي',
      de: 'Nach Training mit Prise Salz = natürliches Sportgetränk',
    },
    pitfall: {
      ar: 'لا يكفي للتمارين الطويلة (+90 دقيقة) — يفتقر للصوديوم',
      de: 'Reicht nicht für lange Trainings — wenig Natrium',
    },
    athleteTip: {
      ar: 'كوب بعد جلسة 60 دقيقة يكفي لإعادة الترطيب',
      de: 'Glas nach 60-min-Session reicht zur Rehydration',
    },
  },

  /* ────────── BERRIES & FRUITS ────────── */
  {
    key: 'banana',
    emoji: '🍌',
    color: '#fde047',
    group: 'carbs_simple',
    name: { ar: 'موز', de: 'Banane' },
    per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
    glycemicIndex: 51,
    optimalTimes: ['pre_workout', 'post_workout'],
    benefits: {
      ar: [
        'بوتاسيوم لمنع التشنجات',
        'سكر طبيعي + ألياف لطاقة فورية ومستدامة',
        'B6 لإنتاج الناقلات العصبية',
        'سهل الهضم',
      ],
      de: [
        'Kalium gegen Krämpfe',
        'Natürlicher Zucker + Ballaststoffe',
        'B6 für Neurotransmitter',
        'Leicht verdaulich',
      ],
    },
    keyNutrients: {
      ar: ['بوتاسيوم', 'B6', 'فيتامين C', 'ألياف', 'منغنيز'],
      de: ['Kalium', 'B6', 'Vitamin C', 'Ballaststoffe', 'Mangan'],
    },
    pairing: {
      ar: 'موز + زبدة فول سوداني قبل التمرين = طاقة + بروتين',
      de: 'Banane + Erdnussbutter vor Training = Energie + Protein',
    },
    pitfall: {
      ar: 'الموز الأصفر الكامل GI أعلى من الأخضر قليلاً',
      de: 'Reife Banane hat etwas höheren GI als grüne',
    },
    athleteTip: {
      ar: 'موز قبل التمرين بـ 30 دقيقة = سكر دم مستقر',
      de: 'Banane 30 min vor Training = stabiler Blutzucker',
    },
  },
  {
    key: 'pomegranate',
    emoji: '🥭',
    color: '#9f1239',
    group: 'antioxidant',
    name: { ar: 'رمّان', de: 'Granatapfel' },
    per100g: { kcal: 83, protein: 1.7, carbs: 19, fat: 1.2, fiber: 4 },
    glycemicIndex: 53,
    optimalTimes: ['morning', 'post_workout'],
    benefits: {
      ar: [
        'بونيكالاجين أقوى من الشاي الأخضر بـ 3×',
        'يحسّن تدفق الدم',
        'يخفّض ضغط الدم',
        'يدعم صحة البروستاتا للرجال',
      ],
      de: [
        'Punicalagin 3× stärker als grüner Tee',
        'Verbessert Blutfluss',
        'Senkt Blutdruck',
        'Unterstützt Prostata bei Männern',
      ],
    },
    keyNutrients: {
      ar: ['بونيكالاجين', 'فيتامين C', 'فيتامين K', 'بوتاسيوم'],
      de: ['Punicalagin', 'Vitamin C', 'Vitamin K', 'Kalium'],
    },
    pairing: {
      ar: 'حبوب رمّان فوق السلطة أو الزبادي',
      de: 'Kerne über Salat oder Joghurt',
    },
    pitfall: {
      ar: 'العصير المعلّب فقد معظم البونيكالاجين',
      de: 'Saft im Karton hat kaum Punicalagin',
    },
    athleteTip: {
      ar: '250مل عصير طازج 7 أيام قبل سباق = أداء أفضل',
      de: '250 ml frisch 7 Tage vor Wettkampf = bessere Leistung',
    },
  },

  /* ────────── HONEY & SWEETENERS ────────── */
  {
    key: 'honey',
    emoji: '🍯',
    color: '#f59e0b',
    group: 'carbs_simple',
    name: { ar: 'عسل خام', de: 'Roher Honig' },
    per100g: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 },
    glycemicIndex: 58,
    optimalTimes: ['morning', 'pre_workout'],
    benefits: {
      ar: [
        'سكر طبيعي + إنزيمات + مضادات أكسدة',
        'مضاد بكتيري طبيعي',
        'يهدّئ السعال أفضل من الأدوية',
        'مصدر طاقة سريع',
      ],
      de: [
        'Natürlicher Zucker + Enzyme + Antioxidantien',
        'Antibakteriell',
        'Hilft bei Husten besser als Medikamente',
        'Schnelle Energiequelle',
      ],
    },
    keyNutrients: {
      ar: ['جلوكوز', 'فركتوز', 'إنزيمات', 'مضادات أكسدة'],
      de: ['Glukose', 'Fruktose', 'Enzyme', 'Antioxidantien'],
    },
    pairing: {
      ar: 'مع شاي زنجبيل + ليمون = درع مناعي صباحي',
      de: 'Mit Ingwertee + Zitrone = Immun-Schild',
    },
    pitfall: {
      ar: 'لا تسخّنه فوق 40°م — يدمّر الإنزيمات',
      de: 'Nicht über 40°C — zerstört Enzyme',
    },
    athleteTip: {
      ar: 'ملعقة قبل التمرين الصباحي بدون فطور = طاقة فورية',
      de: 'TL vor Morgentraining ohne Frühstück = Sofortenergie',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
 *  GROUP METADATA
 * ═══════════════════════════════════════════════════════════════════ */

export const FOOD_GROUP_LABELS: Record<FoodGroup, Record<Lang, string>> = {
  protein_animal:  { ar: 'بروتينات حيوانية', de: 'Tierisches Protein' },
  protein_plant:   { ar: 'بروتينات نباتية',   de: 'Pflanzliches Protein' },
  carbs_complex:   { ar: 'كربوهيدرات معقدة',  de: 'Komplexe Carbs' },
  carbs_simple:    { ar: 'كربوهيدرات سريعة',  de: 'Einfache Carbs' },
  fats_healthy:    { ar: 'دهون صحية',         de: 'Gesunde Fette' },
  fats_essential:  { ar: 'دهون أساسية',       de: 'Essentielle Fette' },
  micros_dense:    { ar: 'كثيف بالمغذّيات',   de: 'Mikro-Bombe' },
  hydration:       { ar: 'ترطيب',             de: 'Hydration' },
  superfood:       { ar: 'سوبرفود',           de: 'Superfood' },
  antioxidant:     { ar: 'مضاد أكسدة',        de: 'Antioxidans' },
};

export const MEAL_TIME_LABELS: Record<MealTime, Record<Lang, string>> = {
  morning:       { ar: 'الصباح',            de: 'Morgens' },
  pre_workout:   { ar: 'قبل التمرين',       de: 'Vor Training' },
  post_workout:  { ar: 'بعد التمرين',       de: 'Nach Training' },
  lunch:         { ar: 'الغداء',            de: 'Mittag' },
  dinner:        { ar: 'العشاء',            de: 'Abend' },
  evening:       { ar: 'قبل النوم',         de: 'Vor Schlaf' },
  anytime:       { ar: 'أيّ وقت',           de: 'Jederzeit' },
};
