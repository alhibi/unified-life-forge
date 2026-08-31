import type { DailyKulturperle } from './types';

/**
 * Hand-curated daily Kulturperlen — 30 tiny cultural facts.
 * Food, holidays, traditions, regional quirks, history-of-a-word.
 *
 * Each is 2-4 short Arabic sentences. The point is "I learned something
 * cool about Germany today" — not a Wikipedia article.
 */
export const DAILY_KULTURPERLEN: readonly DailyKulturperle[] = [
  { title_ar: 'ثلاث إيماءات ألمانية أساسية', title_de: 'Deutsche Gesten', body_ar: 'الإبهام لأعلى = جيد. تحريك السبابة يميناً ويساراً عند المعصم = جنون. ضم السبابة والوسطى في "V" مع الكف للداخل = "السلام" (لكن معناه دعاء).', shelf_slug: 'friends-real-vs-fake' },
  { title_ar: 'لماذا الألمان يمشون بأيديهم خلف الظهر؟', title_de: 'Hände auf dem Rücken', body_ar: 'هذه ليست قسوة، بل عادة تاريخية من الجيش البروسي. الرجل "الجاد" يمشي منتصباً، الأيدي خلف الظهر = "أنا أفكّر".', shelf_slug: 'weather-smalltalk' },
  { title_ar: 'Pfand: وديعة القناني', title_de: 'Pfand-System', body_ar: 'كل قنينة بلاستيك 25 سنت، زجاج 8 سنت. تُرجعها في السوبر ماركت → تسترد المال. نظام بيئي ضخم يمنع ملايين القناني من النفايات سنوياً.', shelf_slug: 'groceries-supermarket' },
  { title_ar: 'لماذا الـ ß موجود أصلاً؟', title_de: 'Geschichte des ß', body_ar: 'حرف الـ ß (Eszett) ظهر كاختصار لـ "sz" في الطباعة القديمة. دولياً يحل محلها "ss" (Schweiz، Straßen) لكن ألمانيا والنمسا تحافظان عليه.', shelf_slug: 'grammar-implied' },
  { title_ar: 'Späti: ثقافة الكالعة الزاوية', title_de: 'Spätkauf', body_ar: 'في برلين، كل زاوية لها Späti = بقالة تفتح حتى 11 مساءً. تشتري بيرة + ساندويتش + جرائد. لا مكان يجلس، لكن الكل يعرف صاحبها.', shelf_slug: 'spaeti-culture' },
  { title_ar: 'كلمة "Kindergarten" من أين؟', title_de: 'Herkunft: Kindergarten', body_ar: 'اخترعها Friedrich Fröbel عام 1840: "Kind" (طفل) + "Garten" (حديقة) — حديقة للأطفال حيث يلعبون بحرية. العالم كله اقتبس الكلمة لاحقاً.', shelf_slug: 'family-implied' },

  { title_ar: 'لغة الجسد في المحادثات', title_de: 'Körpersprache', body_ar: 'الألمان يحافظون على مسافة ذراع تقريباً في المحادثة. لا تلمس كتف أحد في العمل، ولا تقترب أكثر من اللازم. التقبيل فقط بين المعارف الجيدين.', shelf_slug: 'friends-real-vs-fake' },
  { title_ar: 'Brötchen بالأرقام', title_de: 'Brötchen-Kultur', body_ar: 'كل مخبز في ألمانيا يبيع أنواعاً من Brötchen (Semmel/Schrippe): Mohn (خشخاش)، Sesam (سمسم)، Kürbiskern (بذور يقطين). كل صباح 5 أنواع على الأقل.', shelf_slug: 'coffee-bakery' },
  { title_ar: 'لماذا Beerenauslese نبيذ فاخر؟', title_de: 'Beerenauslese', body_ar: 'تعبير ألماني: "اختيار التوت". عناقيد العنب تترك على الكرمة حتى تتجمد، تجمع يدوياً. النبيذ حلو جداً، يباع بالملليمتر — ثقافة Prädikatswein فريدة.', shelf_slug: 'going-out' },
  { title_ar: 'موسيقى في الـ S-Bahn', title_de: 'S-Bahn-Musiker', body_ar: 'في قطارات برلين وهامبورغ، فنانو شوارع محترفون يلعبون يومياً. بينهم عازفي بيانو محترفون، فرق جاز. ليست تطفّل، بل ثقافة محترمة.', shelf_slug: 'public-transport' },
  { title_ar: 'الـ "Filterkaffee" مقابل Espresso', title_de: 'Filterkaffee', body_ar: 'ألمانيا ليست إيطاليا. القهوة الفلتر الكلاسيكية هي المعيار، وليست الإسبريسو. "Café Crème" هو استثناء فرنسي الأصل.', shelf_slug: 'coffee-bakery' },
  { title_ar: 'لماذا أحذية الشاطئ مقسّمة؟', title_de: 'Strandschuhe', body_ar: 'في بحيرات ألمانيا (Bodensee، Ammersee)، الدخول للماء مقنّن: السباحة في منطقة، ركوب الزوارق في أخرى. الكل يعرف حدوده — النظام بحد ذاته.', shelf_slug: 'travel-etiquette' },

  { title_ar: 'Birkenstock: حذاء ألماني عالمي', title_de: 'Birkenstock', body_ar: 'بدأت ماركة Birkenstock عام 1774 كصانع أحذية طبيب. تصميم "footbed" مبني على قدم الإنسان. اليوم رمز عالمي للراحة.', shelf_slug: 'travel-etiquette' },
  { title_ar: 'الـ "Du" ثقافة', title_de: 'Duzen vs. Siezen', body_ar: 'في العمل، يُستخدم "Sie" (رسمي) للأسبوع الأول على الأقل. الانتقال لـ "Du" يحدث بعد دعوة شخصية. مع الأصدقاء والعائلة = "Du" دائماً.', shelf_slug: 'friends-real-vs-fake' },
  { title_ar: 'طقس الـ Tatort يوم الأحد', title_de: 'Tatort-Sonntag', body_ar: 'مسلسل الجريمة Tatort يُذاع كل أحد 8:15 مساءً. حوالي 12 مليون مشاهد — تقليد اجتماعي. بيوت بأكملها تتوقف للمشاهدة.', shelf_slug: 'weather-smalltalk' },
  { title_ar: 'كيف تستخدم بطاقة Bahn؟', title_de: 'Bahn-Karte', body_ar: 'في القطارات، لا أحد يتفقد تذكرتك. لكن عند الصعود، ابحث عن "Entwerter" (صندوق أحمر على الرصيف) — اختم تذكرتك وإلا غرامة 60€.', shelf_slug: 'public-transport' },
  { title_ar: 'Spiegel: مجلة لها تاريخ', title_de: 'Der Spiegel', body_ar: 'تأسست 1947 في هامبورغ، أصبحت أكبر مجلة إخبارية في أوروبا. شعارها: "Said eh klar" (يقال بلا مواربة).', shelf_slug: 'family-implied' },
  { title_ar: 'Grüner Veltliner: نبيذ نمساوي شهير', title_de: 'Grüner Veltliner', body_ar: 'صنف نبيذ أبيض نمساوي — يجفّف الجسم، نكهة فلفلية خفيفة. تجده في كل Weinwirtschaft في فيينا.', shelf_slug: 'going-out' },

  { title_ar: 'قواعد Brezel اليومية', title_de: 'Brezel-Tradition', body_ar: 'في البافاريا، Brezel مع Butter في الإفطار قاعدة. السعر: 50 سنت إلى 1€. تمييز الجودة: حجم الثقب وحجم الحبوب الملحية.', shelf_slug: 'coffee-bakery' },
  { title_ar: 'موعد Kaiserschnitt: لماذا؟', title_de: 'Kaiserschnitt', body_ar: 'كلمة "Kaiserschnitt" (قيصرية) تأتي من Caesar (قيصر). نظرية تقول Julius Caesar وُلد بهذه الطريقة. الأكيد: الكلمة ألمانية.', shelf_slug: 'doctor-visit' },
  { title_ar: 'سيارات: ركوب Autobahn بدون حدود سرعة', title_de: 'Autobahn', body_ar: 'حوالي 70% من Autobahn بدون حد سرعة. لكن النصيحة: 130 km/h هي السرعة الذكية — أكثر من 60% من السائقين يلتزمون بها.', shelf_slug: 'public-transport' },
  { title_ar: 'Word-of-the-Year: كلمة العام', title_de: 'Wort des Jahres', body_ar: 'منذ 1977، جمعية اللغة الألمانية تختار كلمة العام. 2023: "Krisenmodus" (وضع الأزمات). 2022: "Zeitenwende" (نقطة تحول تاريخية).', shelf_slug: 'family-implied' },
  { title_ar: 'Edelweiß: زهرة جبال الألب', title_de: 'Edelweiß', body_ar: 'زهرة بيضاء رمزية في النمسا وسويسرا. كانت رمزاً للشجاعة الجبلية — التقطها = "فعل رجل". محمية قانونياً اليوم.', shelf_slug: 'travel-etiquette' },
  { title_ar: 'Fahrrad: ثقافة الدراجة', title_de: 'Fahrrad-Kultur', body_ar: 'برلين Münster، كوبنهاغن، أمستردام، كلها مدن دراجات. Münster لا تستخدم إشارة مرور في وسطها — الدراجة لها الأولوية.', shelf_slug: 'cycling-culture' },

  { title_ar: 'وقت العشاء في ألمانيا', title_de: 'Abendessen', body_ar: 'بين 18:00 و 19:30. ليس 21:00 كما في إسبانيا. العائلة كلها معاً، TV مغلق، وأحياناً الشموع. طقس أسبوعي.', shelf_slug: 'family-implied' },
  { title_ar: 'الـ "Sonntagsruhe" السبت العظيم', title_de: 'Sonntagsruhe', body_ar: 'الأحد = يوم الراحة الرسمي. ممنوع جز العشب، الحفر في البناء، أو شفط المكنسة بصوت عالٍ. الجيران قد يستدعون الشرطة.', shelf_slug: 'ruhezeit-quiet-hours' },
  { title_ar: 'Stammtisch: طاولة الأصحاب', title_de: 'Stammtisch', body_ar: 'مجموعة أصدقاء تحجز طاولة ثابتة في حانة. كل أسبوع، نفس الوقت، نفس الطاولة. تقليد قوي في كل مدينة ألمانية.', shelf_slug: 'going-out' },
  { title_ar: 'Spaghetti-Eis: حلوى المانيا', title_de: 'Spaghetti-Eis', body_ar: 'آيس كريم على شكل سباغيتي! بوظة الفانيلا تُضغط من ماكينة خاصة، تُرشّ عليها فراولة + جوز هند = "سباغيتي". اخترعها Dario Fontanella 1969.', shelf_slug: 'restaurant-etiquette' },
  { title_ar: 'Büttenrede: خطاب الكرنفال', title_de: 'Büttenrede', body_ar: 'في كرنفال الراين، خطباء يرتدون قبعات يرددون شعراً ساخراً عن السياسيين. يُقرأ من برميل (Bütte). الكل يصفّق، حتى المستهدف.', shelf_slug: 'karneval-full' },
  { title_ar: 'Bratwurst: كل ولاية لها نقانقتها', title_de: 'Bratwurst-Vielfalt', body_ar: 'في ألمانيا 1500+ نوع Bratwurst! أشهرها: Thüringer (حار، رقيق)، Nürnberger (صغير، مدخن)، Currywurst (برلين — مع صلصة الكاري).', shelf_slug: 'restaurant-etiquette' },
];

export const DAILY_KULTURPERLEN_COUNT = DAILY_KULTURPERLEN.length;