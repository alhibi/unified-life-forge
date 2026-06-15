// ─────────────────────────────────────────────────────────────────────
// شرح مفردات صعبة في القصائد. مفتاح المعجم هو slug القصيدة كما
// يبنيه local-fallback:
//
//   slug = `${poet.id}-${normalize(title).replace(/\s+/g, '-')}`
//
// حيث normalize:
//   • يزيل التشكيل
//   • يُحوِّل الهمزات إلى ا، ى إلى ي، ة إلى ه
//   • toLowerCase().trim()
//
// لذلك لا تحتجْ إلى التشكيل في `word`؛ المطابقة تحدث على نسخة
// منَزَلَة. كل ما عليك هو استخدام صيغة الكلمة كما تظهر بالقصيدة
// تقريبياً.
//
// عند توفّر Supabase، تُجلب نفس البيانات من جدول `diwan_glossary`
// عبر RPC `diwan_poem_glossary` ويتم تجاوز هذا الملفّ تماماً.
// ─────────────────────────────────────────────────────────────────────

export interface LocalGlossaryEntry {
  word: string;            // الكلمة بصيغتها الأدبية
  meaning: string;         // الشرح
  verse_position?: number; // البيت الذي وردت فيه (اختياري)
}

export const diwanLocalGlossary: Record<string, LocalGlossaryEntry[]> = {
  // ═══ معلقة امرئ القيس ═══
  // slug = imru-alqays-معلقه-امرئ-القيس
  'imru-alqays-معلقه-امرئ-القيس': [
    { word: 'قفا', meaning: 'أمر للاثنين بالوقوف، يُخاطب صاحبَيْه طالباً منهما الوقوف معه عند الأطلال.', verse_position: 0 },
    { word: 'سقط اللوى', meaning: 'مكان يَنقطع فيه الرمل المتعرّج (اللوى)؛ موضع بين نجد والشام.', verse_position: 0 },
    { word: 'الدخول', meaning: 'موضع في بلاد بني أسد قرب حومل والمقراة، من ديار محبوبته.', verse_position: 0 },
    { word: 'حومل', meaning: 'موضع قرب الدخول.', verse_position: 0 },
    { word: 'توضح', meaning: 'موضع آخر بين الدخول وحومل.', verse_position: 1 },
    { word: 'المقراة', meaning: 'موضع تجتمع فيه مياه السيول.', verse_position: 1 },
    { word: 'يعف', meaning: 'يَطمِس ويُغطّي بالتراب والريح.', verse_position: 1 },
    { word: 'شمأل', meaning: 'الريح الشمالية.', verse_position: 1 },
    { word: 'الأرآم', meaning: 'جمع رِئم، وهو الظبي الأبيض الناصع.', verse_position: 2 },
    { word: 'عرصاتها', meaning: 'ساحاتها الواسعة الفسيحة.', verse_position: 2 },
    { word: 'قيعانها', meaning: 'جمع قاع: الأرض الواسعة المنخفضة.', verse_position: 2 },
    { word: 'حنظل', meaning: 'نبات صحراوي شديد المرارة، يُضرب بمرارته المثل.', verse_position: 3 },
    { word: 'سمرات', meaning: 'جمع سَمُرة: شجر الطَّلْح ذو الشوك.', verse_position: 3 },
    { word: 'ناقف', meaning: 'الذي يقشر الحنظل ويستخرج لُبَّه — كناية عن المرارة.', verse_position: 3 },
    { word: 'مهراقة', meaning: 'مَسكوبة منسكِبة (من أراق الدمع).', verse_position: 5 },
    { word: 'معول', meaning: 'مَفزَع يُلجأ إليه لكشف الهمّ، أو موضع البكاء.', verse_position: 5 },
    { word: 'كدأبك', meaning: 'كعادتك المُتكرِّرة.', verse_position: 6 },
    { word: 'تضوع', meaning: 'فاحت رائحته وانتشرت.', verse_position: 7 },
    { word: 'الخدر', meaning: 'الخِباء (الخيمة) المخصَّص للنساء.', verse_position: 12 },
    { word: 'الغبيط', meaning: 'مَركَب من مراكب النساء كالهودج.', verse_position: 13 },
  ],

  // ═══ معلقة طرفة بن العبد ═══
  // slug = tarafa-معلقه-طرفه-بن-العبد
  'tarafa-معلقه-طرفه-بن-العبد': [
    { word: 'برقة ثهمد', meaning: 'موضع كانت تنزله محبوبته خَوْلة.', verse_position: 0 },
    { word: 'حدوج', meaning: 'جمع حِدْج: مَركب من مراكب النساء كالهودج.', verse_position: 2 },
    { word: 'النواصف', meaning: 'الأماكن الواسعة في الوادي.', verse_position: 2 },
    { word: 'عدولية', meaning: 'سفن منسوبة إلى قرية عَدَوْلَى.', verse_position: 3 },
    { word: 'حيزومها', meaning: 'صدر السفينة الذي يشقّ به الماء.', verse_position: 4 },
    { word: 'المفايل', meaning: 'لاعب الفِيال (لعبة كانت تُلعب بالتراب).', verse_position: 4 },
    { word: 'أحوى', meaning: 'الظبي الذي تعلوه سُمرة لطيفة.', verse_position: 5 },
    { word: 'المرد', meaning: 'ثمر الأراك إذا نضج واسودّ.', verse_position: 5 },
    { word: 'شادن', meaning: 'الظبي الذي قَوي على الرعي مع أمه.', verse_position: 5 },
    { word: 'زبرجد', meaning: 'حجر كريم أخضر اللون.', verse_position: 5 },
    { word: 'ربرباً', meaning: 'قطيعاً من الظباء.', verse_position: 6 },
    { word: 'البرير', meaning: 'ثمر الأراك أيضاً، أو نبت ينبت في الرمل.', verse_position: 6 },
    { word: 'ألمى', meaning: 'الذي في شفته سواد لطيف يُحبّ.', verse_position: 7 },
    { word: 'إثمد', meaning: 'حجر يُكتحل به، شديد السواد.', verse_position: 8 },
  ],

  // ═══ معلقة زهير بن أبي سلمى ═══
  // slug = zuhayr-معلقه-زهير-بن-ابي-سلمي
  'zuhayr-معلقه-زهير-بن-ابي-سلمي': [],

  // ═══ المتنبي — على قدر أهل العزم ═══
  // slug = mutanabbi-علي-قدر-اهل-العزم
  'mutanabbi-علي-قدر-اهل-العزم': [
    { word: 'العزم', meaning: 'العزيمة الراسخة والإرادة القاطعة.', verse_position: 0 },
    { word: 'العزائم', meaning: 'جمع عزيمة، أي الإرادات الجازمة الكبرى.', verse_position: 0 },
    { word: 'الكرام', meaning: 'جمع كريم: أصحاب المروءة وعِظام النفوس.', verse_position: 0 },
    { word: 'المكارم', meaning: 'الأعمال الجليلة والصفات الفاضلة.', verse_position: 0 },
    { word: 'العظائم', meaning: 'جمع عظيمة: الأمور الجِسام والشدائد.', verse_position: 1 },
    { word: 'الخضارم', meaning: 'جمع خِضْرَم: الجيوش الكثيرة الواسعة.', verse_position: 2 },
    { word: 'الضراغم', meaning: 'جمع ضِرغام: الأسود الشجاعة (هنا الأبطال).', verse_position: 3 },
    { word: 'مخالب', meaning: 'جمع مِخْلَب: أظفار السباع.', verse_position: 5 },
    { word: 'الحدث الحمراء', meaning: 'قلعة حصينة في حدود الشام، اشتُهرت بمعركة سيف الدولة سنة 343هـ.', verse_position: 6 },
    { word: 'الغمائم', meaning: 'جمع غَمامة: السحب الماطرة.', verse_position: 6 },
    { word: 'الجماجم', meaning: 'جمع جُمجمة: الرؤوس — أي سَقَتْها دماء القتلى.', verse_position: 7 },
    { word: 'القنا', meaning: 'جمع قَناة: الرماح.', verse_position: 8 },
    { word: 'المنايا', meaning: 'جمع مَنية: الموت ومصارفه.', verse_position: 8 },
    { word: 'متلاطم', meaning: 'يضرب بعضه بعضاً (شُبِّه القتلُ بأمواج البحر).', verse_position: 8 },
    { word: 'تمائم', meaning: 'جمع تميمة: ما يُعلَّق على الأطفال للوقاية — هنا تَهَكُّم بأن الجثث صارت تمائم للقلعة.', verse_position: 9 },
    { word: 'الخطّي', meaning: 'الرمح المنسوب لمدينة الخَطّ بساحل البحرين، ضُرب المثل بصلابته.', verse_position: 10 },
    { word: 'غوارم', meaning: 'دافعات الغُرْم (التَّعْويض) — أي الليالي تردّ ما سَلَبَتْ.', verse_position: 11 },
    { word: 'الجوازم', meaning: 'في النحو: العوامل التي تجزم الفعل المضارع — استعارة بلاغية: قبل أن تستطيع جوازم الزمن وقفه.', verse_position: 12 },
  ],

  // ═══ المتنبي — الخيل والليل والبيداء تعرفني ═══
  // slug = mutanabbi-الخيل-والليل-والبيداء-تعرفني
  'mutanabbi-الخيل-والليل-والبيداء-تعرفني': [
    { word: 'شواردها', meaning: 'جمع شاردة: المعاني المُتفلِّتة من قلَّة من الشعراء.', verse_position: 1 },
    { word: 'ملء جفوني', meaning: 'كناية عن النوم الهانئ العميق رغم ما يَفُوت غيرَه.', verse_position: 1 },
    { word: 'جرَّاها', meaning: 'بسببها، من أجلها.', verse_position: 1 },
    { word: 'البيداء', meaning: 'الصحراء الواسعة المُهلكة.', verse_position: 2 },
    { word: 'القرطاس', meaning: 'الورق الذي يُكتب عليه.', verse_position: 2 },
    { word: 'الفلوات', meaning: 'جمع فلاة: الأرض القفر الواسعة.', verse_position: 3 },
    { word: 'القور', meaning: 'جمع قارة: الجبال الصغيرة المنفردة.', verse_position: 3 },
    { word: 'الأكم', meaning: 'جمع أَكَمة: التِّلال المرتفعة.', verse_position: 3 },
    { word: 'وجداننا', meaning: 'إيجادنا، أي ما وَجَدْنا.', verse_position: 4 },
    { word: 'أمم', meaning: 'قريب — والمعنى: لو كان أمركم قريباً من أمرنا.', verse_position: 5 },
    { word: 'النهى', meaning: 'العقول.', verse_position: 7 },
    { word: 'ذمم', meaning: 'عهود يجب الوفاء بها.', verse_position: 7 },
  ],

  // ═══ المتنبي — واحرّ قلباه ═══
  // slug = mutanabbi-واحر-قلباه
  'mutanabbi-واحر-قلباه': [
    { word: 'شبم', meaning: 'بارد جامد — كناية عن جفاء سيف الدولة.', verse_position: 0 },
    { word: 'سقم', meaning: 'مرض شديد.', verse_position: 0 },
    { word: 'برى', meaning: 'أنحَلَ وأنهَكَ الجسد.', verse_position: 1 },
    { word: 'غُرَّته', meaning: 'وجهه الأبيض الكريم — كناية عن المُحبَّب من الناس.', verse_position: 2 },
    { word: 'الهند', meaning: 'يقصد سيوف الهند المشهورة بحدّتها.', verse_position: 3 },
    { word: 'الشيم', meaning: 'جمع شِيمة: الأخلاق والطباع الكريمة.', verse_position: 4 },
    { word: 'يممته', meaning: 'قَصَدْته بالغزو.', verse_position: 5 },
    { word: 'البهم', meaning: 'جمع بُهْمة: الفارس الشجاع الذي لا يُدرى من أين يُؤتى.', verse_position: 6 },
  ],

  // ═══ كعب بن زهير — قصيدة البردة (بانت سعاد) ═══
  // ملاحظة: عنوان القصيدة في poetryData يحوي ' - ' فيُنتِج slug
  // فيه ثلاث شَرَط متوالية بسبب \s+ المُحيطة بالشَرَط نفسها.
  // slug = kaab-قصيده-البرده---بانت-سعاد
  'kaab-قصيده-البرده---بانت-سعاد': [],
};
