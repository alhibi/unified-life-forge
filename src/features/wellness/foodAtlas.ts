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

export type Lang = 'ar';

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
    name: { ar: 'البيض الكامل', },
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
    },
    keyNutrients: {
      ar: ['كولين', 'فيتامين B12', 'فيتامين D', 'سيلينيوم', 'ليوسين'],
    },
    pairing: {
      ar: 'مع الأفوكادو + توست حبوب كاملة = إفطار رياضي مثالي',
    },
    pitfall: {
      ar: 'تجنب الإفراط في القلي بزيوت متحولة — تفقد البيض فوائده',
    },
    athleteTip: {
      ar: '3 بيضات كاملة بعد التمرين: 21غ بروتين + 6غ ليوسين = أقوى محفّز mTOR',
    },
  },
  {
    key: 'salmon',
    emoji: '🐟',
    color: '#fb7185',
    group: 'protein_animal',
    name: { ar: 'سلمون', },
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
    },
    keyNutrients: {
      ar: ['EPA', 'DHA', 'فيتامين D', 'سيلينيوم', 'B12', 'بروتين'],
    },
    pairing: {
      ar: 'مع البطاطا الحلوة والبروكلي = وجبة استشفاء كاملة',
    },
    pitfall: {
      ar: 'السلمون المزرعي يحتوي أوميغا 6 أكثر — ابحث عن البري إن أمكن',
    },
    athleteTip: {
      ar: '2 حصة أسبوعياً تحمي مفاصلك من إجهاد التمارين الكثيفة',
    },
  },
  {
    key: 'chicken_breast',
    emoji: '🍗',
    color: '#f87171',
    group: 'protein_animal',
    name: { ar: 'صدر دجاج', },
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
    },
    keyNutrients: {
      ar: ['بروتين', 'B6', 'B12', 'نياسين', 'سيلينيوم', 'فوسفور'],
    },
    pairing: {
      ar: 'مع أرز بسمتي وخضار = وجبة مكتسب نظيف',
    },
    pitfall: {
      ar: 'الإفراط في الطهي يجففه — اطبخه على درجة منخفضة',
    },
    athleteTip: {
      ar: 'صدر دجاج + قطعة أناناس (إنزيم بروميلين) لهضم أسرع',
    },
  },
  {
    key: 'beef_lean',
    emoji: '🥩',
    color: '#dc2626',
    group: 'protein_animal',
    name: { ar: 'لحم بقر هزيل', },
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
    },
    keyNutrients: {
      ar: ['كرياتين', 'حديد', 'زنك', 'B12', 'كارنيتين', 'CLA'],
    },
    pairing: {
      ar: 'مع فلفل أحمر (فيتامين C) لمضاعفة امتصاص الحديد',
    },
    pitfall: {
      ar: 'لحم محمر بشدّة ينتج مركبات مسرطنة (HCAs/PAHs)',
    },
    athleteTip: {
      ar: 'مرّتين أسبوعياً يكفيك. أكثر من ذلك يضغط على الكلى مع كثرة البروتين',
    },
  },
  {
    key: 'greek_yogurt',
    emoji: '🥛',
    color: '#e0e7ff',
    group: 'protein_animal',
    name: { ar: 'زبادي يوناني', },
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
    },
    keyNutrients: {
      ar: ['بروتين كازين', 'بروبيوتيك', 'كالسيوم', 'B12', 'فوسفور'],
    },
    pairing: {
      ar: 'مع توت بري + لوز + عسل = فطور البطل',
    },
    pitfall: {
      ar: 'الزبادي بنكهة مضاف له 15-20غ سكر — اختر السادة',
    },
    athleteTip: {
      ar: '200غ قبل النوم = 20غ بروتين كازين يبني العضلات أثناء النوم',
    },
  },
  {
    key: 'tuna',
    emoji: '🐟',
    color: '#3b82f6',
    group: 'protein_animal',
    name: { ar: 'تونة', },
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
    },
    keyNutrients: {
      ar: ['بروتين', 'سيلينيوم', 'B12', 'B3', 'فوسفور'],
    },
    pairing: {
      ar: 'مع ليمون + طحينة على خبز كامل',
    },
    pitfall: {
      ar: 'لا تتجاوز 3 علب أسبوعياً — احتمال زئبق',
    },
    athleteTip: {
      ar: 'تونة + أرز + خس = 40غ بروتين بسعرات منخفضة',
    },
  },
  {
    key: 'cottage_cheese',
    emoji: '🥣',
    color: '#fef3c7',
    group: 'protein_animal',
    name: { ar: 'جبن قريش', },
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
    },
    keyNutrients: {
      ar: ['كازين', 'كالسيوم', 'B12', 'فوسفور', 'سيلينيوم'],
    },
    pairing: {
      ar: 'مع توت أزرق + جوز عين الجمل قبل النوم',
    },
    pitfall: {
      ar: 'محتوى الصوديوم مرتفع — اختر القليل الملح',
    },
    athleteTip: {
      ar: 'الوجبة الأخيرة قبل النوم — يبني العضلات بدلاً من الهدم',
    },
  },

  /* ────────── PROTEINS — PLANT ────────── */
  {
    key: 'lentils',
    emoji: '🫘',
    color: '#a78bfa',
    group: 'protein_plant',
    name: { ar: 'عدس', },
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
    },
    keyNutrients: {
      ar: ['بروتين', 'ألياف', 'حديد', 'فولات', 'مغنيسيوم'],
    },
    pairing: {
      ar: 'مع أرز = بروتين كامل (تحوي كل الأحماض الأمينية)',
    },
    pitfall: {
      ar: 'انفخها بالماء 8 ساعات لإزالة مضادات المغذيات',
    },
    athleteTip: {
      ar: 'كوب عدس + 30غ شوفان = 25غ بروتين بـ 350 سعرة فقط',
    },
  },
  {
    key: 'chickpeas',
    emoji: '🫛',
    color: '#fbbf24',
    group: 'protein_plant',
    name: { ar: 'حمص', },
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
    },
    keyNutrients: {
      ar: ['بروتين', 'ألياف', 'فولات', 'منغنيز', 'حديد'],
    },
    pairing: {
      ar: 'حمص محمص + زيت زيتون + ليمون = سناك مثالي',
    },
    pitfall: {
      ar: 'تناوله مع الماء بكميات كبيرة قد يسبّب انتفاخاً',
    },
    athleteTip: {
      ar: 'حمص + بطاطا حلوة قبل التمرين = طاقة 3 ساعات',
    },
  },
  {
    key: 'tofu',
    emoji: '🧈',
    color: '#fef3c7',
    group: 'protein_plant',
    name: { ar: 'توفو', },
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
    },
    keyNutrients: {
      ar: ['بروتين', 'كالسيوم', 'حديد', 'مغنيسيوم', 'سيلينيوم'],
    },
    pairing: {
      ar: 'توفو مقرمش + خضار آسيوية + أرز بني',
    },
    pitfall: {
      ar: 'توفو غير مخمّر يحتوي مضادات مغذيات — اختر التيمبه أحياناً',
    },
    athleteTip: {
      ar: 'تتبيلة 30 دقيقة تجعل التوفو لذيذاً وغنياً بالنكهة',
    },
  },
  {
    key: 'tempeh',
    emoji: '🥖',
    color: '#a16207',
    group: 'protein_plant',
    name: { ar: 'تيمبه', },
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
    },
    keyNutrients: {
      ar: ['بروتين', 'بروبيوتيك', 'B12', 'حديد', 'منغنيز'],
    },
    pairing: {
      ar: 'تيمبه مشوي + خضار + كينوا',
    },
    pitfall: {
      ar: 'سعراته أعلى من التوفو — اضبط الحصة',
    },
    athleteTip: {
      ar: 'بديل ممتاز للحوم الحمراء — أقل التهاب وأغنى ميكروبيومياً',
    },
  },

  /* ────────── COMPLEX CARBS ────────── */
  {
    key: 'oats',
    emoji: '🌾',
    color: '#f59e0b',
    group: 'carbs_complex',
    name: { ar: 'شوفان', },
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
    },
    keyNutrients: {
      ar: ['بيتا-جلوكان', 'منغنيز', 'فوسفور', 'مغنيسيوم', 'B1'],
    },
    pairing: {
      ar: '50غ شوفان + موزة + 20غ بروتين = إفطار رياضي مثالي',
    },
    pitfall: {
      ar: 'شوفان فوري يرفع السكر بسرعة — اختر القطع الكبير (Steel-Cut)',
    },
    athleteTip: {
      ar: 'انقع الشوفان طوال الليل — أسهل هضماً وأغنى مغذيات',
    },
  },
  {
    key: 'sweet_potato',
    emoji: '🍠',
    color: '#ea580c',
    group: 'carbs_complex',
    name: { ar: 'بطاطا حلوة', },
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
    },
    keyNutrients: {
      ar: ['بيتا-كاروتين', 'فيتامين C', 'B6', 'بوتاسيوم', 'منغنيز'],
    },
    pairing: {
      ar: 'بطاطا حلوة + سلمون = أعلى مكسب صحي',
    },
    pitfall: {
      ar: 'القلي يرفع السعرات 3× — اشويها أو ابخرها',
    },
    athleteTip: {
      ar: '200غ قبل التمرين بساعتين = طاقة مستقرة بدون قمم سكر',
    },
  },
  {
    key: 'quinoa',
    emoji: '🌾',
    color: '#facc15',
    group: 'carbs_complex',
    name: { ar: 'كينوا', },
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
    },
    keyNutrients: {
      ar: ['بروتين كامل', 'منغنيز', 'فوسفور', 'مغنيسيوم', 'فولات'],
    },
    pairing: {
      ar: 'كينوا + خضروات مشوية + جوز = وجبة قوس قزح',
    },
    pitfall: {
      ar: 'اشطفها جيداً — تحتوي السابونين المرّ',
    },
    athleteTip: {
      ar: 'كينوا بدلاً من الأرز الأبيض = ضعف البروتين والألياف',
    },
  },
  {
    key: 'brown_rice',
    emoji: '🍚',
    color: '#92400e',
    group: 'carbs_complex',
    name: { ar: 'أرز بني', },
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
    },
    keyNutrients: {
      ar: ['منغنيز', 'سيلينيوم', 'B1', 'مغنيسيوم', 'ألياف'],
    },
    pairing: {
      ar: 'أرز بني + دجاج + بروكلي = ثلاثية البطل',
    },
    pitfall: {
      ar: 'أرز أبيض أسرع امتصاصاً قبل التمرين بـ30 دقيقة',
    },
    athleteTip: {
      ar: 'كوب أرز بني (45غ كربوهيدرات) للأكلات الكبرى مع بروتين',
    },
  },

  /* ────────── HEALTHY FATS ────────── */
  {
    key: 'avocado',
    emoji: '🥑',
    color: '#65a30d',
    group: 'fats_healthy',
    name: { ar: 'أفوكادو', },
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
    },
    keyNutrients: {
      ar: ['أوميغا 9', 'بوتاسيوم', 'فولات', 'فيتامين E', 'فيتامين K'],
    },
    pairing: {
      ar: 'أفوكادو + بيض + خبز كامل = قوة الإفطار',
    },
    pitfall: {
      ar: 'كثيف السعرات — حصة واحدة (نصف ثمرة) = 160 سعرة',
    },
    athleteTip: {
      ar: 'مع البيض في الإفطار يضاعف امتصاص فيتامين D من الصفار',
    },
  },
  {
    key: 'olive_oil',
    emoji: '🫒',
    color: '#65a30d',
    group: 'fats_healthy',
    name: { ar: 'زيت زيتون بكر', },
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
    },
    keyNutrients: {
      ar: ['أوميغا 9', 'فيتامين E', 'بوليفينولات', 'سكوالين'],
    },
    pairing: {
      ar: 'فوق السلطة + الخضار = امتصاص فيتامينات أقوى',
    },
    pitfall: {
      ar: 'لا تطبخه على نار عالية جداً — يفقد البوليفينولات',
    },
    athleteTip: {
      ar: 'ملعقة كبيرة على الإفطار = حماية من التهاب التمارين',
    },
  },
  {
    key: 'almonds',
    emoji: '🌰',
    color: '#92400e',
    group: 'fats_healthy',
    name: { ar: 'لوز', },
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
    },
    keyNutrients: {
      ar: ['فيتامين E', 'مغنيسيوم', 'منغنيز', 'بروتين', 'ريبوفلافين'],
    },
    pairing: {
      ar: '20غ لوز + تفاحة = سناك صحي مثالي',
    },
    pitfall: {
      ar: 'سهل الإفراط — حفنة (28غ) = 165 سعرة',
    },
    athleteTip: {
      ar: 'انقعها 8 ساعات لإطلاق المعادن — أسهل هضماً',
    },
  },
  {
    key: 'walnuts',
    emoji: '🌰',
    color: '#78350f',
    group: 'fats_essential',
    name: { ar: 'جوز عين الجمل', },
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
    },
    keyNutrients: {
      ar: ['أوميغا 3 (ALA)', 'منغنيز', 'فولات', 'فيتامين E'],
    },
    pairing: {
      ar: 'جوز + توت + شوفان = إفطار الذكاء',
    },
    pitfall: {
      ar: 'يتأكسد بسرعة — احفظه في الثلاجة',
    },
    athleteTip: {
      ar: '5 حبات يومياً تكفي لتغطية أوميغا 3 النباتي',
    },
  },

  /* ────────── ANTIOXIDANTS / SUPERFOODS ────────── */
  {
    key: 'blueberries',
    emoji: '🫐',
    color: '#3730a3',
    group: 'antioxidant',
    name: { ar: 'توت أزرق', },
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
    },
    keyNutrients: {
      ar: ['أنثوسيانين', 'فيتامين C', 'فيتامين K', 'منغنيز'],
    },
    pairing: {
      ar: 'توت + زبادي + جوز = ثلاثية ضد الشيخوخة',
    },
    pitfall: {
      ar: 'المجمّد له نفس الفوائد — لا تدفع للطازج فقط',
    },
    athleteTip: {
      ar: 'كوب توت أزرق بعد التمرين يقلّل الألم العضلي 30%',
    },
  },
  {
    key: 'spinach',
    emoji: '🌿',
    color: '#15803d',
    group: 'micros_dense',
    name: { ar: 'سبانخ', },
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
    },
    keyNutrients: {
      ar: ['نترات', 'حديد', 'فولات', 'فيتامين K', 'مغنيسيوم'],
    },
    pairing: {
      ar: 'سبانخ + ليمون = ضعف امتصاص الحديد',
    },
    pitfall: {
      ar: 'حمض الأكساليك يقلل الكالسيوم — اطبخه أحياناً',
    },
    athleteTip: {
      ar: '200غ سبانخ قبل التمرين بساعتين = طاقة دموية أفضل',
    },
  },
  {
    key: 'broccoli',
    emoji: '🥦',
    color: '#16a34a',
    group: 'micros_dense',
    name: { ar: 'بروكلي', },
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
    },
    keyNutrients: {
      ar: ['سلفورافان', 'فيتامين C', 'فيتامين K', 'فولات', 'كروم'],
    },
    pairing: {
      ar: 'مع لحم بقر = ضعف امتصاص الحديد',
    },
    pitfall: {
      ar: 'الغلي يفقد 50% من السلفورافان — البخار أفضل',
    },
    athleteTip: {
      ar: '3-4 حصص أسبوعياً تنظّم هرمونات الذكور',
    },
  },
  {
    key: 'green_tea',
    emoji: '🍵',
    color: '#15803d',
    group: 'antioxidant',
    name: { ar: 'شاي أخضر', },
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
    },
    keyNutrients: {
      ar: ['EGCG', 'إل-ثيانين', 'كافيين معتدل', 'بوليفينولات'],
    },
    pairing: {
      ar: 'مع ليمون = ضعف امتصاص الكاتيكينات',
    },
    pitfall: {
      ar: 'لا تشربه مع الوجبات الغنية بالحديد — يقلّل امتصاصه',
    },
    athleteTip: {
      ar: '2-3 أكواب يومياً + كوب قبل التمرين بـ 30 دقيقة',
    },
  },
  {
    key: 'turmeric',
    emoji: '🟡',
    color: '#ca8a04',
    group: 'superfood',
    name: { ar: 'كركم', },
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
    },
    keyNutrients: {
      ar: ['كركومين', 'منغنيز', 'حديد', 'بوتاسيوم'],
    },
    pairing: {
      ar: 'مع فلفل أسود (بيبيرين) = 2000% امتصاص أعلى',
    },
    pitfall: {
      ar: 'بدون فلفل أسود = امتصاص ضعيف جداً',
    },
    athleteTip: {
      ar: 'ملعقة في الحليب الذهبي قبل النوم = نوم + تعافي أفضل',
    },
  },
  {
    key: 'dark_chocolate',
    emoji: '🍫',
    color: '#451a03',
    group: 'antioxidant',
    name: { ar: 'شوكولاتة داكنة 85%+', },
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
    },
    keyNutrients: {
      ar: ['فلافانول', 'مغنيسيوم', 'حديد', 'كافيين', 'ثيوبرومين'],
    },
    pairing: {
      ar: 'قطعتان + جوز = سناك ما قبل التمرين',
    },
    pitfall: {
      ar: 'تحت 70% كاكاو = حلوى لا فائدة',
    },
    athleteTip: {
      ar: '20غ قبل التمرين بـ 30 دقيقة = ضخ + تركيز',
    },
  },
  {
    key: 'beetroot',
    emoji: '🥬',
    color: '#9d174d',
    group: 'superfood',
    name: { ar: 'شمندر', },
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
    },
    keyNutrients: {
      ar: ['نترات', 'فولات', 'منغنيز', 'بوتاسيوم'],
    },
    pairing: {
      ar: 'عصير شمندر + تفاح + ليمون = pre-workout طبيعي',
    },
    pitfall: {
      ar: 'يصبغ البول أحمر — لا داعي للقلق',
    },
    athleteTip: {
      ar: 'كوب عصير قبل ساعتين من سباق/HIIT = أداء أفضل علمياً',
    },
  },
  {
    key: 'garlic',
    emoji: '🧄',
    color: '#fef9c3',
    group: 'superfood',
    name: { ar: 'ثوم', },
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
    },
    keyNutrients: {
      ar: ['أليسين', 'منغنيز', 'B6', 'فيتامين C', 'سيلينيوم'],
    },
    pairing: {
      ar: 'مهروس + زيت زيتون = ينشط الأليسين بأقصى صورة',
    },
    pitfall: {
      ar: 'تناوله نيئاً (بعد 10 دقائق من القطع) — الطبخ يدمّر الأليسين',
    },
    athleteTip: {
      ar: 'فص ثوم نيء يومياً يقلّل العدوى التنفسية 60% للرياضيين',
    },
  },
  {
    key: 'ginger',
    emoji: '🫚',
    color: '#fbbf24',
    group: 'superfood',
    name: { ar: 'زنجبيل', },
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
    },
    keyNutrients: {
      ar: ['جنجرول', 'منغنيز', 'مغنيسيوم', 'فيتامين C'],
    },
    pairing: {
      ar: 'شاي زنجبيل + ليمون + عسل = صباح المحارب',
    },
    pitfall: {
      ar: 'مع الأدوية المسيلة للدم = حذر طبي',
    },
    athleteTip: {
      ar: '2غ يومياً يقلّل الألم العضلي 25%',
    },
  },

  /* ────────── HYDRATION ────────── */
  {
    key: 'water',
    emoji: '💧',
    color: '#06b6d4',
    group: 'hydration',
    name: { ar: 'ماء', },
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
    },
    keyNutrients: {
      ar: ['H2O النقي', 'معادن (حسب المصدر)'],
    },
    pairing: {
      ar: 'مع رشة ملح هيمالايا + ليمون قبل التمرين = إلكتروليتات طبيعية',
    },
    pitfall: {
      ar: 'الإفراط (>5 لتر/ساعة) = نقص صوديوم',
    },
    athleteTip: {
      ar: '35مل/كجم وزن جسم/يوم + 500مل لكل ساعة تمرين',
    },
  },
  {
    key: 'coconut_water',
    emoji: '🥥',
    color: '#f4f4f5',
    group: 'hydration',
    name: { ar: 'ماء جوز الهند', },
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
    },
    keyNutrients: {
      ar: ['بوتاسيوم', 'مغنيسيوم', 'صوديوم', 'سكر طبيعي'],
    },
    pairing: {
      ar: 'بعد التمرين مع رشة ملح = مشروب رياضي طبيعي',
    },
    pitfall: {
      ar: 'لا يكفي للتمارين الطويلة (+90 دقيقة) — يفتقر للصوديوم',
    },
    athleteTip: {
      ar: 'كوب بعد جلسة 60 دقيقة يكفي لإعادة الترطيب',
    },
  },

  /* ────────── BERRIES & FRUITS ────────── */
  {
    key: 'banana',
    emoji: '🍌',
    color: '#fde047',
    group: 'carbs_simple',
    name: { ar: 'موز', },
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
    },
    keyNutrients: {
      ar: ['بوتاسيوم', 'B6', 'فيتامين C', 'ألياف', 'منغنيز'],
    },
    pairing: {
      ar: 'موز + زبدة فول سوداني قبل التمرين = طاقة + بروتين',
    },
    pitfall: {
      ar: 'الموز الأصفر الكامل GI أعلى من الأخضر قليلاً',
    },
    athleteTip: {
      ar: 'موز قبل التمرين بـ 30 دقيقة = سكر دم مستقر',
    },
  },
  {
    key: 'pomegranate',
    emoji: '🥭',
    color: '#9f1239',
    group: 'antioxidant',
    name: { ar: 'رمّان', },
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
    },
    keyNutrients: {
      ar: ['بونيكالاجين', 'فيتامين C', 'فيتامين K', 'بوتاسيوم'],
    },
    pairing: {
      ar: 'حبوب رمّان فوق السلطة أو الزبادي',
    },
    pitfall: {
      ar: 'العصير المعلّب فقد معظم البونيكالاجين',
    },
    athleteTip: {
      ar: '250مل عصير طازج 7 أيام قبل سباق = أداء أفضل',
    },
  },

  /* ────────── HONEY & SWEETENERS ────────── */
  {
    key: 'honey',
    emoji: '🍯',
    color: '#f59e0b',
    group: 'carbs_simple',
    name: { ar: 'عسل خام', },
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
    },
    keyNutrients: {
      ar: ['جلوكوز', 'فركتوز', 'إنزيمات', 'مضادات أكسدة'],
    },
    pairing: {
      ar: 'مع شاي زنجبيل + ليمون = درع مناعي صباحي',
    },
    pitfall: {
      ar: 'لا تسخّنه فوق 40°م — يدمّر الإنزيمات',
    },
    athleteTip: {
      ar: 'ملعقة قبل التمرين الصباحي بدون فطور = طاقة فورية',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
 *  GROUP METADATA
 * ═══════════════════════════════════════════════════════════════════ */

export const FOOD_GROUP_LABELS: Record<FoodGroup, Record<Lang, string>> = {
  protein_animal:  { ar: 'بروتينات حيوانية', },
  protein_plant:   { ar: 'بروتينات نباتية', },
  carbs_complex:   { ar: 'كربوهيدرات معقدة', },
  carbs_simple:    { ar: 'كربوهيدرات سريعة', },
  fats_healthy:    { ar: 'دهون صحية', },
  fats_essential:  { ar: 'دهون أساسية', },
  micros_dense:    { ar: 'كثيف بالمغذّيات', },
  hydration:       { ar: 'ترطيب', },
  superfood:       { ar: 'سوبرفود', },
  antioxidant:     { ar: 'مضاد أكسدة', },
};

export const MEAL_TIME_LABELS: Record<MealTime, Record<Lang, string>> = {
  morning:       { ar: 'الصباح', },
  pre_workout:   { ar: 'قبل التمرين', },
  post_workout:  { ar: 'بعد التمرين', },
  lunch:         { ar: 'الغداء', },
  dinner:        { ar: 'العشاء', },
  evening:       { ar: 'قبل النوم', },
  anytime:       { ar: 'أيّ وقت', },
};
