// Deep biographical timelines and historical context for poets
// Used by the TimelineView and PoemContext components

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  type: 'birth' | 'milestone' | 'poem' | 'political' | 'death' | 'travel';
}

export interface PoemContext {
  poemTitle: string;
  poetId: string;
  event: string;
  context: string;
  year?: string;
}

export const poetTimelines: Record<string, TimelineEvent[]> = {
  'imru-alqays': [
    { year: '500م', title: 'الميلاد', description: 'وُلد في نجد من أسرة ملوك كِندة، أبوه حجر بن الحارث ملك بني أسد', type: 'birth' },
    { year: '520م', title: 'الشباب والترحال', description: 'طرده أبوه بسبب تشرّده وقول الشعر، فعاش متنقلاً بين القبائل', type: 'milestone' },
    { year: '528م', title: 'مقتل أبيه', description: 'قُتل أبوه على يد بني أسد فأقسم على الثأر — "اليوم خمر وغداً أمر"', type: 'political' },
    { year: '530م', title: 'المعلّقة', description: 'نظم معلقته الشهيرة "قفا نبكِ" التي تعدّ أشهر قصيدة عربية', type: 'poem' },
    { year: '535م', title: 'الرحلة إلى قيصر', description: 'سافر إلى القسطنطينية طالباً العون من الإمبراطور يوستنيانوس', type: 'travel' },
    { year: '540م', title: 'الوفاة', description: 'توفي في أنقرة بتركيا، وقيل أصيب بقروح سامّة، فلُقّب "ذو القروح"', type: 'death' },
  ],
  'antara': [
    { year: '525م', title: 'الميلاد', description: 'وُلد عبداً من أمّ حبشية اسمها زبيبة، في قبيلة عبس', type: 'birth' },
    { year: '545م', title: 'اعتراف أبيه', description: 'أُسر أبوه فقاتل عنترة ببسالة حتى قال له شدّاد: "كُرّ يا عنترة!" فاعترف بنسبه', type: 'milestone' },
    { year: '550م', title: 'حبّ عبلة', description: 'أحبّ ابنة عمّه عبلة وحُرم منها بسبب لونه ونسبه من أمّه', type: 'milestone' },
    { year: '560م', title: 'المعلّقة', description: 'نظم معلقته "هل غادر الشعراء" ممزوجة بالفخر والغزل العفيف', type: 'poem' },
    { year: '570م', title: 'حرب داحس والغبراء', description: 'شارك في أشهر حروب العرب بين عبس وذبيان وأبلى بلاءً حسناً', type: 'political' },
    { year: '608م', title: 'الوفاة', description: 'قُتل في معركة وهو شيخ كبير، وقيل عاش قرابة 80 عاماً', type: 'death' },
  ],
  'mutanabbi': [
    { year: '915م', title: 'الميلاد في الكوفة', description: 'وُلد أحمد بن الحسين في الكوفة من أسرة متواضعة', type: 'birth' },
    { year: '924م', title: 'التعلّم المبكر', description: 'درس في كتاتيب الكوفة ثم انتقل لبادية السماوة ليتقن العربية', type: 'milestone' },
    { year: '933م', title: 'ادّعاء النبوّة', description: 'ثار في بادية السماوة مدّعياً النبوّة فلُقّب "المتنبي" وسُجن سنتين', type: 'political' },
    { year: '948م', title: 'بلاط سيف الدولة', description: 'التحق ببلاط سيف الدولة الحمداني في حلب — أخصب فتراته الشعرية', type: 'milestone' },
    { year: '954م', title: 'قصائد سيف الدولة', description: 'أنشد أعظم مدائحه: "على قدر أهل العزم" بعد فتح الحدث', type: 'poem' },
    { year: '957م', title: 'الخلاف والرحيل', description: 'تدهورت علاقته بسيف الدولة بسبب حسّاده، فرحل إلى مصر', type: 'political' },
    { year: '960م', title: 'كافور الإخشيدي', description: 'مدح كافور طمعاً في ولاية ثم هجاه أقذع هجاء وفرّ ليلاً', type: 'milestone' },
    { year: '965م', title: 'المقتل', description: 'قُتل قرب واسط على يد فاتك الأسدي، ولمّا همّ بالفرار قيل له: "أنت القائل: الخيل والليل..!" فعاد فقُتل', type: 'death' },
  ],
  'abu-tammam': [
    { year: '796م', title: 'الميلاد', description: 'وُلد حبيب بن أوس الطائي في جاسم بحوران (سوريا)', type: 'birth' },
    { year: '815م', title: 'رحلة مصر', description: 'انتقل إلى مصر وعمل سقّاءً في المسجد ثم اتصل بالأدباء', type: 'travel' },
    { year: '833م', title: 'فتح عمّورية', description: 'نظم قصيدته الخالدة "السيف أصدق أنباءً من الكتب" في فتح المعتصم لعمّورية', type: 'poem' },
    { year: '835م', title: 'جمع الحماسة', description: 'جمع "ديوان الحماسة" أثناء إقامته عند أبي الوفاء في همذان', type: 'milestone' },
    { year: '845م', title: 'الوفاة', description: 'توفي في الموصل ودُفن فيها، بعد حياة حافلة بالتجديد', type: 'death' },
  ],
  'jarir': [
    { year: '650م', title: 'الميلاد', description: 'وُلد في اليمامة من قبيلة كُليب (تميم)', type: 'birth' },
    { year: '680م', title: 'بداية النقائض', description: 'بدأ مساجلاته مع الفرزدق التي استمرت أربعين سنة', type: 'milestone' },
    { year: '690م', title: 'هجاء الراعي النميري', description: 'هجا الراعي النميري بقصيدته الشهيرة وانتصر عليه', type: 'poem' },
    { year: '710م', title: 'رثاء زوجته', description: 'رثى زوجته أم حزرة بأرقّ المراثي "لولا الحياء لهاجني استعبار"', type: 'poem' },
    { year: '728م', title: 'الوفاة', description: 'توفي بعد الفرزدق بأشهر، وقد بكاه ورثاه رغم عداوتهما', type: 'death' },
  ],
  'ibn-zaydun': [
    { year: '1003م', title: 'الميلاد', description: 'وُلد في قرطبة من أسرة عريقة من بني مخزوم', type: 'birth' },
    { year: '1024م', title: 'لقاء ولّادة', description: 'أحبّ الأميرة ولّادة بنت المستكفي في مجالسها الأدبية', type: 'milestone' },
    { year: '1030م', title: 'النونيّة', description: 'نظم نونيّته "أضحى التنائي بديلاً من تدانينا" من سجنه شوقاً لولّادة', type: 'poem' },
    { year: '1035م', title: 'السجن والنفي', description: 'سُجن بتهمة سياسية ثم نُفي من قرطبة', type: 'political' },
    { year: '1050م', title: 'بلاط بني عبّاد', description: 'التحق ببلاط المعتضد بن عبّاد في إشبيلية ونال مكانة رفيعة', type: 'travel' },
    { year: '1071م', title: 'الوفاة', description: 'توفي في إشبيلية بعيداً عن قرطبة التي أحبّها', type: 'death' },
  ],
  'abu-nawas': [
    { year: '756م', title: 'الميلاد', description: 'وُلد الحسن بن هانئ في الأهواز من أب عربي وأم فارسية', type: 'birth' },
    { year: '770م', title: 'البادية والتعلّم', description: 'أقام في البادية سنة كاملة لإتقان العربية ثم تتلمذ على خلف الأحمر', type: 'milestone' },
    { year: '775م', title: 'تلمذة بشار', description: 'صحب بشار بن برد وأخذ عنه الجرأة في التجديد الشعري', type: 'milestone' },
    { year: '786م', title: 'بلاط الرشيد', description: 'نال حظوة عند هارون الرشيد ثم ابنه الأمين في بغداد', type: 'political' },
    { year: '800م', title: 'الخمريّات', description: 'أبدع أشهر خمرياته "دع عنك لومي فإن اللوم إغراء"', type: 'poem' },
    { year: '814م', title: 'الوفاة', description: 'توفي في بغداد، وقيل إنه تاب في آخر حياته', type: 'death' },
  ],
  'hassan': [
    { year: '563م', title: 'الميلاد', description: 'وُلد في يثرب (المدينة) من قبيلة الخزرج', type: 'birth' },
    { year: '600م', title: 'الشعر الجاهلي', description: 'برع في المدح والفخر قبل الإسلام وتردّد على بلاط الغساسنة', type: 'milestone' },
    { year: '622م', title: 'إسلامه', description: 'أسلم مع الأنصار وأصبح شاعر الرسول ﷺ يدافع عن الإسلام بشعره', type: 'milestone' },
    { year: '624م', title: 'شعر الدفاع', description: 'نظم قصائد ردّ فيها على شعراء قريش وهجاهم بأنسابهم', type: 'poem' },
    { year: '630م', title: 'فتح مكة', description: 'أنشد في فتح مكة ومدح النبي ﷺ بأعظم مدائحه', type: 'poem' },
    { year: '674م', title: 'الوفاة', description: 'توفي في المدينة عن عمر يناهز 110 سنوات', type: 'death' },
  ],
  'khansa': [
    { year: '575م', title: 'الميلاد', description: 'وُلدت تماضر بنت عمرو بن الشريد في قبيلة سُلَيم', type: 'birth' },
    { year: '612م', title: 'مقتل معاوية', description: 'قُتل أخوها معاوية فرثته بقصائد مؤثرة', type: 'political' },
    { year: '615م', title: 'مقتل صخر', description: 'قُتل أخوها صخر — أحبّ الناس إليها — فأبدعت أعظم مراثيها', type: 'political' },
    { year: '620م', title: 'مراثي صخر', description: 'نظمت "أعيني جودا ولا تجمدا" و"قذى بعينك أم بالعين عوّار"', type: 'poem' },
    { year: '629م', title: 'إسلامها', description: 'وفدت على النبي ﷺ فأسلمت وكان يستنشدها ويقول "هيه يا خناس"', type: 'milestone' },
    { year: '636م', title: 'القادسية', description: 'حثّت أبناءها الأربعة على الجهاد في القادسية فاستشهدوا جميعاً', type: 'political' },
    { year: '664م', title: 'الوفاة', description: 'توفيت في البادية بعد حياة حافلة بالشعر والصبر', type: 'death' },
  ],
};



// Historical context linking poems to events
export const poemContexts: PoemContext[] = [
  // امرؤ القيس
  {
    poemTitle: 'معلقة امرئ القيس',
    poetId: 'imru-alqays',
    event: 'بعد مقتل أبيه والتشرّد',
    context: 'نظمها بعد فقدان ملكه وتشرّده بين القبائل، فجمعت بين ذكرى الحبيبة والأطلال والفخر بالماضي. تعدّ أول معلّقة في تاريخ الشعر العربي وأكملها بناءً.',
    year: '530م',
  },
  // عنترة
  {
    poemTitle: 'معلقة عنترة',
    poetId: 'antara',
    event: 'إثبات الذات ونيل الحرية',
    context: 'نظمها بعد اعتراف أبيه بنسبه، فمزج فيها الفخر بالشجاعة مع الغزل العفيف بعبلة. كانت صرخة تحرّر من قيود العبودية واللون.',
    year: '560م',
  },
  // المتنبي
  {
    poemTitle: 'على قدر أهل العزم',
    poetId: 'mutanabbi',
    event: 'فتح قلعة الحدث',
    context: 'نظمها بعد انتصار سيف الدولة على الروم واستعادة قلعة الحدث الحمراء. تعدّ من أعظم قصائد الحماسة والمدح في الشعر العربي كله.',
    year: '954م',
  },
  {
    poemTitle: 'واحرّ قلباه',
    poetId: 'mutanabbi',
    event: 'العتاب الأخير لسيف الدولة',
    context: 'آخر ما أنشده في مجلس سيف الدولة قبل رحيله عنه. عاتبه على تقريب الحسّاد وإبعاده، في قصيدة جمعت بين الفخر والحزن.',
    year: '957م',
  },
  // أبو تمام
  {
    poemTitle: 'فتح عمورية',
    poetId: 'abu-tammam',
    event: 'فتح المعتصم لعمّورية',
    context: 'بعد أن فتح المعتصم مدينة عمّورية الرومية انتقاماً لنداء المرأة المسلمة "وامعتصماه". بدأها بتحدّي المنجّمين الذين نهوه عن الحرب.',
    year: '833م',
  },
  // جرير
  {
    poemTitle: 'لولا الحياء',
    poetId: 'jarir',
    event: 'وفاة زوجته أم حزرة',
    context: 'رثى زوجته بأرقّ ما نظم، وكشف عن جانب إنساني رقيق خلف شاعر الهجاء القاسي.',
    year: '710م',
  },
  // ابن زيدون
  {
    poemTitle: 'نونية ابن زيدون',
    poetId: 'ibn-zaydun',
    event: 'السجن والفراق عن ولّادة',
    context: 'نظمها من سجنه في قرطبة بعد أن وشى به ابن عبدوس لدى الوزير ابن جهور. عبّر فيها عن شوقه لولّادة واستعاد ذكريات لقائهما في الزهراء.',
    year: '1030م',
  },
  // حسان بن ثابت
  {
    poemTitle: 'بانت سعاد',
    poetId: 'hassan',
    event: 'الدفاع عن الإسلام',
    context: 'كان حسان لسان الدعوة الإسلامية، يردّ على شعراء المشركين ويدافع عن النبي ﷺ بقوة البيان.',
    year: '624م',
  },
  // الخنساء
  {
    poemTitle: 'رثاء صخر',
    poetId: 'khansa',
    event: 'مقتل أخيها صخر بن عمرو',
    context: 'قُتل صخر بعد طعنة غادرة أثخنته حتى مات بعد عام. ظلّت الخنساء تبكيه عشرين سنة، وقالت فيه أعذب المراثي العربية.',
    year: '615م',
  },
  // أبو نواس
  {
    poemTitle: 'دع عنك لومي',
    poetId: 'abu-nawas',
    event: 'مجالس بغداد العباسية',
    context: 'قالها في أجواء بغداد المترفة زمن هارون الرشيد، حيث ثار على تقاليد المقدمة الطللية وأعلن انتماءه للحياة الحضرية الجديدة.',
    year: '800م',
  },
];

// Event type icons and colors
export const eventTypeConfig: Record<TimelineEvent['type'], { color: string; icon: string }> = {
  birth: { color: '#10b981', icon: '🌟' },
  milestone: { color: '#6366f1', icon: '📌' },
  poem: { color: '#f59e0b', icon: '📜' },
  political: { color: '#ef4444', icon: '⚔️' },
  death: { color: '#6b7280', icon: '🕊️' },
  travel: { color: '#0891b2', icon: '🧭' },
};
