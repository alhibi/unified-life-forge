import type { DailySatz } from './types';

/**
 * Hand-curated daily Sätze — 30 entries for one month cycle.
 * Each sentence is something a real German would actually say in context.
 */
export const DAILY_SAETZE: readonly DailySatz[] = [
  { satz: 'Kannst du mir kurz helfen?', arabic: 'تقدر تساعدني بسرعة؟', context_ar: 'في العمل، حين تحتاج مساعدة بسيطة من زميل', register: 'neutral', shelf_slug: 'job-application' },
  { satz: 'Das macht nichts.', arabic: 'لا يهم (لا بأس)', context_ar: 'ردّ لطيف حين يعتذر شخص عن شيء تافه', register: 'neutral' },
  { satz: 'Ich bin gleich da.', arabic: 'أنا هناك حالاً', context_ar: 'حين تكون في الطريق لمقابلة صديق', register: 'informal' },
  { satz: 'Kein Problem.', arabic: 'لا مشكلة', context_ar: 'الجواب الأكثر شيوعاً — اعتيادي لكن مهذب', register: 'informal' },
  { satz: 'Bis später!', arabic: 'أراك لاحقاً!', context_ar: 'وداع سريع في العمل أو الجامعة', register: 'informal' },
  { satz: 'Schönen Feierabend!', arabic: 'مساء جميل بعد العمل!', context_ar: 'التحية المسائية في ألمانيا — ثقافية', register: 'neutral' },
  { satz: 'Lass uns mal los.', arabic: 'هيّا نخرج', context_ar: 'دعوة عفوية للأصدقاء — مساء جمعة مثلاً', register: 'informal', shelf_slug: 'going-out' },

  { satz: 'Ich hätte gerne einen Kaffee.', arabic: 'أريد قهوة من فضلك', context_ar: 'في الكافيه — الجملة الأساسية', register: 'formal', shelf_slug: 'coffee-bakery' },
  { satz: 'Zum Mitnehmen, bitte.', arabic: 'للأخذ معك، من فضلك', context_ar: 'حين تطلب القهوة take-away', register: 'neutral', shelf_slug: 'coffee-bakery' },
  { satz: 'Der Zug hat Verspätung.', arabic: 'القطار متأخر', context_ar: 'العبارة التي ستسمعها دائماً في محطات ألمانيا', register: 'neutral', shelf_slug: 'public-transport' },
  { satz: 'Ich stehe im Stau.', arabic: 'أنا عالق في زحمة', context_ar: 'اتصال هاتفي — "متأخر بسبب الزحمة"', register: 'informal', shelf_slug: 'public-transport' },
  { satz: 'Wo ist die nächste Apotheke?', arabic: 'أين أقرب صيدلية؟', context_ar: 'سؤال في الشارع — صيغة مهذبة', register: 'formal', shelf_slug: 'pharmacy' },
  { satz: 'Ich hätte gerne einen Termin.', arabic: 'أريد موعداً من فضلك', context_ar: 'عند الاتصال بطبيب أو صالون', register: 'formal', shelf_slug: 'doctor-visit' },
  { satz: 'Entschuldigung, ich habe Sie nicht verstanden.', arabic: 'آسف، لم أفهمك', context_ar: 'حين لا تسمع شخصاً في الشارع', register: 'formal' },

  { satz: 'Alles Gute zum Geburtstag!', arabic: 'كل عام وأنت بخير!', context_ar: 'تهنئة عيد ميلاد بسيطة — تُقال كثيراً', register: 'neutral' },
  { satz: 'Frohe Weihnachten!', arabic: 'عيد ميلاد سعيد! (كريسمس)', context_ar: 'تهنئة موسم الكريسماس — من أواخر نوفمبر', register: 'neutral', shelf_slug: 'christmas-markets' },
  { satz: 'Guten Rutsch!', arabic: 'انطلاقة جيدة للسنة الجديدة!', context_ar: 'حرفياً "انزلاق جيد"، تُقال ليلة رأس السنة', register: 'informal' },
  { satz: 'Ich vermisse dich.', arabic: 'أشتاق إليك', context_ar: 'رسالة لشخص بعيد — صادق ومؤثر', register: 'informal', shelf_slug: 'breakup-language' },
  { satz: 'Es tut mir leid.', arabic: 'أنا آسف', context_ar: 'اعتذار صادق — في كل المواقف', register: 'neutral' },
  { satz: 'Ich liebe dich.', arabic: 'أحبّك', context_ar: 'لا تُقال بسهولة في ألمانيا — حين تُقال، تكون جادة', register: 'neutral', shelf_slug: 'flirting-deep' },
  { satz: 'Was machst du gerade?', arabic: 'ماذا تفعل الآن؟', context_ar: 'سؤال عفوي — بداية محادثة ودية', register: 'informal' },

  { satz: 'Lass uns das ein andermal machen.', arabic: 'خلنا نعمل هذا مرة ثانية', context_ar: 'طريقة مهذبة لرفض دعوة دون جرح', register: 'neutral' },
  { satz: 'Ich habe keine Ahnung.', arabic: 'لا فكرة عندي', context_ar: 'اعتراف بالجهل — مقبول تماماً', register: 'informal' },
  { satz: 'Das ist mir egal.', arabic: 'لا يهمّني', context_ar: 'مباشر جداً — تجنبها في المواقف الرسمية', register: 'informal', shelf_slug: 'swearing-insults' },
  { satz: 'Können Sie das wiederholen?', arabic: 'هل يمكنك الإعادة؟', context_ar: 'حين لا تسمع — صيغة مهذبة', register: 'formal' },
  { satz: 'Wie bitte?', arabic: 'عفواً؟', context_ar: 'طلب إعادة الكلام بأدب', register: 'formal' },
  { satz: 'Mir ist kalt.', arabic: 'أنا بردان', context_ar: 'في الشتاء، تعبير شائع جداً', register: 'informal' },
  { satz: 'Ich habe Hunger.', arabic: 'أنا جوعان', context_ar: 'حين يحين وقت الطعام — طبيعي', register: 'informal' },

  { satz: 'Auf dein Wohl!', arabic: 'في صحتك!', context_ar: 'تحية شرب في الحانة — نخب قصير', register: 'neutral', shelf_slug: 'going-out' },
  { satz: 'Prost!', arabic: 'في صحتك! (في البيرة)', context_ar: 'تحية شرب البيرة تحديداً — الأكثر شيوعاً', register: 'informal' },
  { satz: 'Mach\'s gut!', arabic: 'اعتنِ بنفسك!', context_ar: 'وداع دافئ بين الأصدقاء', register: 'informal' },
];

export const DAILY_SAETZE_COUNT = DAILY_SAETZE.length;