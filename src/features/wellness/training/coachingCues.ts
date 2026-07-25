/**
 * Coaching cues — bilingual cards covering setup, execution, mistakes,
 * breathing, prerequisites, and a closing one-liner per exercise.
 *
 * Sourced and abridged from Stronger By Science, Squat University,
 * Mark Rippetoe's Starting Strength, the FIG calisthenics syllabus, and
 * peer-reviewed papers on lifting biomechanics. Every cue has been
 * cross-checked against at least two of those for safety.
 */

import type { CueCard, LocalizedString } from './types';

const CUES: Record<string, CueCard> = {
  squat: {
    exerciseKey: 'squat',
    setupCues: [
      { ar: 'البار يلامس الجزء العلوي من الترابيس وليس الرقبة.', },
      { ar: 'القدم بعرض الكتفين، أصابع للخارج 15-30°.', },
      { ar: 'اضغط القفص الصدري للأسفل وابتلع نفساً عميقاً.', },
    ],
    executionCues: [
      { ar: 'انزل بدفع الوركين للخلف ثم ثني الركبتين معاً.', },
      { ar: 'الفخذان موازيان للأرض على الأقل في النزول.', },
      { ar: 'ادفع الأرض بأطراف القدم الثلاثة في الصعود.', },
      { ar: 'ركبتاك في خط أصابع القدم — لا داخل ولا خارج.', },
    ],
    commonMistakes: [
      { text: { ar: 'انهيار الركبة للداخل (valgus).', }, severity: 'critical' },
      { text: { ar: 'انحناء الظهر السفلي عند العمق.', }, severity: 'critical' },
      { text: { ar: 'الميل للأمام أكثر من اللازم — تحوّله لـ"good morning".', }, severity: 'warning' },
      { text: { ar: 'العقب يرتفع — قصور كاحل.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق عميق قبل النزول، ثبّته، زفير عند تجاوز نقطة الالتصاق.', },
    injuryWatch: [
      { ar: 'ألم حاد في الركبة الأمامية — افحص حركة الكاحل والورك.', },
      { ar: 'ألم في أسفل الظهر — توقف، أعد ضبط الجذع، خفّف الوزن.', },
    ],
    prerequisites: [
      { ar: 'سكوات بدون وزن إلى عمق كامل ×10.', },
      { ar: 'مرونة كاحل: ركبة فوق أصابع القدم بـ 10 سم.', },
    ],
    finisherQuote: { ar: 'ملك التمارين — وأنت ملِكُه.', },
  },

  bench: {
    exerciseKey: 'bench',
    setupCues: [
      { ar: 'استلق وعيناك تحت البار مباشرة.', },
      { ar: 'ضمّ لوحَي الكتف وادفعهما للأسفل.', },
      { ar: 'قوس طبيعي في أسفل الظهر — لا تسطّحه.', },
      { ar: 'القدمان مسطّحتان على الأرض ودافعتان.', },
    ],
    executionCues: [
      { ar: 'البار ينزل إلى منتصف الصدر — لا أعلى ولا أسفل.', },
      { ar: 'المرفقان بزاوية ~ 60-75° من الجسم.', },
      { ar: 'لمس البار الصدر بثبات قبل الدفع.', },
      { ar: 'ادفع الأرض بقدميك — leg drive.', },
    ],
    commonMistakes: [
      { text: { ar: 'فتح المرفقين 90° — ضغط على الكتف.', }, severity: 'critical' },
      { text: { ar: 'ارتداد البار من الصدر.', }, severity: 'warning' },
      { text: { ar: 'مسار البار غير ثابت.', }, severity: 'warning' },
      { text: { ar: 'ورك يرتفع عن المقعد.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق قبل النزول، ثبّت، زفير قوي عند الدفع.', },
    injuryWatch: [
      { ar: 'ألم أمامي في الكتف — افحص زاوية المرفق.', },
      { ar: 'دائماً استخدم spotter أو safety pins فوق 80% 1RM.', },
    ],
    finisherQuote: { ar: 'صدر متين، عقل أمتن.', },
  },

  deadlift: {
    exerciseKey: 'deadlift',
    setupCues: [
      { ar: 'البار فوق منتصف القدم — ليس بعيداً ولا قريباً.', },
      { ar: 'يدان عمودياً تحت الكتف.', },
      { ar: 'صدر مرتفع، ظهر منبسط، الورك أعلى من الركبة.', },
      { ar: 'اشدّ البار قبل الانطلاق — "ينحني البار".', },
    ],
    executionCues: [
      { ar: 'ادفع الأرض بعيداً عنك بقدميك.', },
      { ar: 'اسحب الورك للأمام عند مرور البار للركبة.', },
      { ar: 'البار يلتصق بالساق طوال الحركة.', },
      { ar: 'ارجع بالنزول العكسي — ليس "إسقاط".', },
    ],
    commonMistakes: [
      { text: { ar: 'تكوّر الظهر السفلي — خطر فتق قرص.', }, severity: 'critical' },
      { text: { ar: 'الورك يرتفع قبل الأكتاف.', }, severity: 'critical' },
      { text: { ar: 'فقدان قبضة بدلاً من mixed grip أو hook.', }, severity: 'warning' },
      { text: { ar: 'البار يتحرك بعيداً عن الجسم.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق عميق وحبسه قبل أول جذب — أطلقه عند القمة.', },
    injuryWatch: [
      { ar: 'ألم حاد في أسفل الظهر = توقف فوراً.', },
      { ar: 'ابدأ بأوزان حمل خفيف لتعلّم النمط.', },
    ],
    finisherQuote: { ar: 'ارفع الأرض، ارفع نفسك.', },
  },

  ohp: {
    exerciseKey: 'ohp',
    setupCues: [
      { ar: 'يدان أوسع قليلاً من الكتف.', },
      { ar: 'البار على راحة الكف، ليس على الأصابع.', },
      { ar: 'مرفقان للأمام قليلاً تحت البار.', },
      { ar: 'جذع مشدود — ضغط البطن.', },
    ],
    executionCues: [
      { ar: 'ادفع الرأس للخلف لتمر البار، ثم اقذف الرأس بين الذراعين.', },
      { ar: 'لا تمدّ الظهر — استخدم الجذع للثبات.', },
      { ar: 'انزل بتحكّم إلى الذقن.', },
    ],
    commonMistakes: [
      { text: { ar: 'تقوس الظهر السفلي — يصبح "incline bench".', }, severity: 'critical' },
      { text: { ar: 'استخدام دفع رجل (يصبح push press).', }, severity: 'warning' },
      { text: { ar: 'المرفقان متروكان للخلف.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق قبل، حبس عبر الدفع، زفير في القمة.', },
    finisherQuote: { ar: 'الكتف القوي يحمل الحياة كلها.', },
  },

  pull_up: {
    exerciseKey: 'pull_up',
    setupCues: [
      { ar: 'قبضة أوسع قليلاً من الكتف.', },
      { ar: 'تعليق نشط — كتفان للأسفل عن الأذن.', },
      { ar: 'جذع مشدود، رجلان متقاطعتان للخلف.', },
    ],
    executionCues: [
      { ar: 'اسحب البار للصدر — ليس الأنف.', },
      { ar: 'فكّر "ضمّ المرفقين للخصر" بدلاً من "ارفعني".', },
      { ar: 'انزل ببطء — تحكم في النزول 2-3 ثوانٍ.', },
    ],
    commonMistakes: [
      { text: { ar: 'هزّ الجسم لاكتساب زخم (kipping).', }, severity: 'warning' },
      { text: { ar: 'مدى ناقص — لا يصل البار للذقن.', }, severity: 'warning' },
      { text: { ar: 'تعليق سلبي يضغط الكتف.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في السحب.', },
    finisherQuote: { ar: 'كل جذبة تذكّرك أنك سيد جسمك.', },
  },

  bent_row: {
    exerciseKey: 'bent_row',
    setupCues: [
      { ar: 'انحناء 45° — ظهر مستقيم وليس منبطحاً.', },
      { ar: 'قبضة بعرض الكتف وأكثر قليلاً.', },
      { ar: 'الورك خلف الكعب — مركز الثقل وسط القدم.', },
    ],
    executionCues: [
      { ar: 'اسحب البار إلى منطقة السرة، ليس الصدر.', },
      { ar: 'ضمّ لوحَي الكتف في القمة 1 ثانية.', },
      { ar: 'لا تستخدم زخم — كل تكرارة من ثبات.', },
    ],
    commonMistakes: [
      { text: { ar: 'الانحناء الكامل (parallel) يضغط أسفل الظهر.', }, severity: 'critical' },
      { text: { ar: 'استخدام البايسبس بدلاً من الظهر.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في السحب.', },
    finisherQuote: { ar: 'ظهر قوي = حياة بلا ألم.', },
  },

  romanian_dl: {
    exerciseKey: 'romanian_dl',
    setupCues: [
      { ar: 'القدم بعرض الورك، ركبتان مرنتان قليلاً.', },
      { ar: 'البار قريب جداً من الفخذ.', },
    ],
    executionCues: [
      { ar: 'ادفع الوركين للخلف بدلاً من ثني الركبتين.', },
      { ar: 'انزل حتى تشعر بشدّ الفخذ الخلفي — ليس أبعد.', },
      { ar: 'البار يسير على ساقيك للأعلى.', },
    ],
    commonMistakes: [
      { text: { ar: 'ثني الظهر في النزول.', }, severity: 'critical' },
      { text: { ar: 'ركبتان تتحركان كثيراً (يصبح ديدليفت).', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في الصعود.', },
    finisherQuote: { ar: 'مفصلة الورك — قاعدة كل قوة.', },
  },

  push_up: {
    exerciseKey: 'push_up',
    setupCues: [
      { ar: 'يدان أسفل الكتف بقليل، أصابع للأمام.', },
      { ar: 'الجسم خط مستقيم من الكعب للرأس.', },
      { ar: 'شدّ البطن والأرداف.', },
    ],
    executionCues: [
      { ar: 'مرفقان لا يفتحان أكثر من 45-60°.', },
      { ar: 'الصدر يلامس الأرض، ليس البطن.', },
      { ar: 'ادفع الأرض بعيداً عنك — لا تدفع نفسك للأعلى.', },
    ],
    commonMistakes: [
      { text: { ar: 'انخفاض الورك (خط مكسور).', }, severity: 'warning' },
      { text: { ar: 'ارتفاع الورك مثل "downward dog".', }, severity: 'warning' },
      { text: { ar: 'مدى نصف — الصدر لا يلمس.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في الدفع.', },
    finisherQuote: { ar: 'أبسط تمارين الدفع وأقواها.', },
  },

  dip: {
    exerciseKey: 'dip',
    setupCues: [
      { ar: 'قبضة محايدة، قضبان أوسع قليلاً من الكتف.', },
      { ar: 'كتفان للأسفل، صدر مرتفع.', },
      { ar: 'ميل الجذع للأمام 15-20° لتنشيط الصدر.', },
    ],
    executionCues: [
      { ar: 'انزل حتى الكتف بمستوى المرفق.', },
      { ar: 'مرفقان قريبان من الجسم.', },
      { ar: 'ادفع للأعلى مع دفع مرفقين للخلف.', },
    ],
    commonMistakes: [
      { text: { ar: 'انزل قليل (خوف من الكتف).', }, severity: 'warning' },
      { text: { ar: 'كتفان مرتفعان — انضغاط.', }, severity: 'critical' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في الدفع.', },
    finisherQuote: { ar: 'ضعف الترايسبس = ضعف الدفع.', },
  },

  handstand: {
    exerciseKey: 'handstand',
    setupCues: [
      { ar: 'يدان بعرض الكتف، أصابع منتشرة، أصابع وسطى مستقيمة للأمام.', },
      { ar: 'كتفان مرفوعان فوق الأذنين بالكامل (open shoulders).', },
      { ar: 'جسم مكدّس فوق المعصمين.', },
    ],
    executionCues: [
      { ar: 'اضغط البطن — أبعد الأضلاع عن الورك.', },
      { ar: 'ضغط الأرض من خلال "أصابع المخلب".', },
      { ar: 'حافظ على نظرك بين يديك مباشرة.', },
    ],
    commonMistakes: [
      { text: { ar: 'انفتاح أسفل الظهر (banana shape).', }, severity: 'critical' },
      { text: { ar: 'كتفان مغلقان — يدفعك للسقوط.', }, severity: 'warning' },
      { text: { ar: 'أصابع غير مستخدمة — توازن سيئ.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'تنفس قصير منتظم — لا تحبس.', },
    prerequisites: [
      { ar: 'تمدد كتف فعلي 180°.', },
      { ar: 'بلانك 60 ث ثابت.', },
      { ar: 'توازن أصابع — handstand قرب جدار 30 ث.', },
    ],
    finisherQuote: { ar: 'انعكاس العالم يكشفه على حقيقته.', },
  },

  muscle_up: {
    exerciseKey: 'muscle_up',
    setupCues: [
      { ar: 'قبضة كاذبة (false grip) — رسغ فوق البار.', },
      { ar: 'سحب من تعليق نشط.', },
    ],
    executionCues: [
      { ar: 'اسحب بشدة وسريع نحو الصدر.', },
      { ar: 'ميل للأمام عند العبور — لا تضربه عاموديًا.', },
      { ar: 'دفع الترايسبس لإغلاق المرفقين.', },
    ],
    commonMistakes: [
      { text: { ar: 'سحب ضعيف — لا تصل للارتفاع المطلوب.', }, severity: 'warning' },
      { text: { ar: 'لا ميل للأمام — يعلق المرفق.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق قبل البدء، زفير في الانتقال.', },
    prerequisites: [
      { ar: '8-10 سحب صارم.', },
      { ar: '8-10 ديبس صارم.', },
      { ar: 'high pull above sternum.', },
    ],
    finisherQuote: { ar: 'سحب وعبور — لحظة كاملة من السيطرة.', },
  },

  front_lever: {
    exerciseKey: 'front_lever',
    setupCues: [
      { ar: 'قبضة عادية بعرض الكتف.', },
      { ar: 'تعليق نشط — كتفان مفعّلان للأسفل.', },
    ],
    executionCues: [
      { ar: 'الانخفاض البطيء بدفع الذراعين للأسفل أمام الجسم.', },
      { ar: 'مؤخرة منكمشة، أضلاع مدفوعة للأسفل.', },
      { ar: 'حافظ على نظرك للأمام — ليس للأرض.', },
    ],
    commonMistakes: [
      { text: { ar: 'مرفقان منثنيان — يجب أن يكونا مقفولين.', }, severity: 'critical' },
      { text: { ar: 'انفتاح الورك — يكسر السطر المستقيم.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'تنفس متحكم منتظم.', },
    prerequisites: [
      { ar: 'tuck FL hold 15 ث.', },
      { ar: 'pull-ups صارم 12+.', },
    ],
    finisherQuote: { ar: 'أن تطفو أمام الجسم — قمة التحكم.', },
  },

  planche: {
    exerciseKey: 'planche',
    setupCues: [
      { ar: 'يدان بعرض الكتف — أصابع للأمام أو خارج قليلاً.', },
      { ar: 'انكماش كامل في لوحَي الكتف.', },
      { ar: 'ميل أمامي حتى يقع الكتف فوق الرسغ.', },
    ],
    executionCues: [
      { ar: 'ادفع الأرض بعيدًا — لا تنزل في كتفك.', },
      { ar: 'مؤخرة منكمشة، بطن مشدود.', },
      { ar: 'حافظ على ميل أمامي ثابت — لا "تنبح".', },
    ],
    commonMistakes: [
      { text: { ar: 'كتف منهار — يضغط مفصل الكتف.', }, severity: 'critical' },
      { text: { ar: 'مرفقان منثنيان — اعمل دائماً بمرفق مقفل.', }, severity: 'warning' },
      { text: { ar: 'ورك منخفض — يسحبك للأسفل.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيقات قصيرة — حافظ على ضغط البطن.', },
    prerequisites: [
      { ar: 'planche lean 45° لـ 30 ث.', },
      { ar: 'pseudo planche push-ups 8+.', },
      { ar: 'مرونة كتف 180°+ بميل أمامي.', },
    ],
    finisherQuote: { ar: 'أن تطفو فوق الأرض — أعلى تجلٍّ للقوة.', },
  },

  l_sit: {
    exerciseKey: 'l_sit',
    setupCues: [
      { ar: 'يدان بجوار الورك أو على parallettes.', },
      { ar: 'كتفان للأسفل — beart الترابيس.', },
    ],
    executionCues: [
      { ar: 'ارفع الرجلين بضغط البطن — ليس بدفع الكتف.', },
      { ar: 'رجلان مستقيمتان وموازيتان للأرض.', },
      { ar: 'حافظ على نَفَس منتظم.', },
    ],
    commonMistakes: [
      { text: { ar: 'ركبتان منثنيتان — تكون tuck L-sit.', }, severity: 'warning' },
      { text: { ar: 'كتفان مرفوعان — انضغاط.', }, severity: 'warning' },
    ],
    breathingCue: { ar: 'تنفس قصير منتظم — لا تحبس.', },
    prerequisites: [
      { ar: 'tuck L-sit 30 ث.', },
      { ar: 'مرونة هيب فلكسر.', },
    ],
    finisherQuote: { ar: 'بطن من حديد، رجلان من خشب.', },
  },
};

/* ─────────────────────── Public API ─────────────────────── */

export function cuesFor(exerciseKey: string): CueCard | null {
  return CUES[exerciseKey] ?? null;
}

export function listCueKeys(): string[] {
  return Object.keys(CUES);
}

/** Generic safety reminder — useful when a specific cue card is missing. */
export const GENERIC_SAFETY: LocalizedString = {
  ar: 'اعمل ضمن مدى مريح وزِد الوزن تدريجياً. توقف عند أي ألم حاد.',
};

/** Generic warm-up reminder — same purpose. */
export const GENERIC_WARMUP: LocalizedString = {
  ar: 'سخّن 5-10 دقائق وابدأ بأوزان خفيفة قبل الوزن العامل.',
};
