import type { DailyWort } from './types';

/**
 * Hand-curated daily Wörter — 90 entries, one per day for a 3-month cycle.
 * Selection is deterministic by date so the same day always shows the same Wort.
 *
 * Each word was chosen for one of:
 *  - surprising etymology
 *  - beautiful sound
 *  - genuinely useful in everyday life
 *  - captures a feeling Germans have a special word for
 */
export const DAILY_WORTER: readonly DailyWort[] = [
  // Week 1 — everyday magic
  { wort: 'Fernweh', arabic: 'حنين للمسافة', hint_ar: 'ذلك الشعور الذي يجعلك تريد السفر بعيداً دون سبب محدد', gender: 'das', register: 'neutral', shelf_slug: 'flirting-deep' },
  { wort: 'Kopfkino', arabic: 'سينما في الرأس', hint_ar: 'عندما تتخيل موقفاً كاملاً في ذهنك (محادثة، مشهد، إلخ)', gender: 'das', register: 'informal', shelf_slug: 'denglisch-loanwords' },
  { wort: 'Treppenwitz', arabic: 'ردّ الذكي بعد فوات الأوان', hint_ar: 'الرد الذكي الذي يأتيك بعد خمس دقائق من انتهاء المحادثة', gender: 'der', register: 'neutral' },
  { wort: 'verschlimmbessern', arabic: 'يُصلح فيزيد الطين بلة', hint_ar: 'تحاول إصلاح شيء فتحوّله إلى الأسوأ — فعل مركّب ألماني فريد', register: 'informal' },
  { wort: 'Sehnsucht', arabic: 'شوق عميق', hint_ar: 'حنين عميق لشيء بعيد — الكلمة الأشهر في الأدب الألماني', gender: 'die', register: 'neutral' },
  { wort: 'Zusammenhalt', arabic: 'تماسك جماعي', hint_ar: 'روح الجماعة حين يقف الكل معاً — صفة أخلاقية عالية في ألمانيا', gender: 'der', register: 'neutral' },
  { wort: 'Kummerspeck', arabic: 'لحم الهمّ', hint_ar: 'الكيلوغرامات التي تتراكم من الأكل العاطفي — كلمة موجودة فعلاً', gender: 'der', register: 'informal' },

  // Week 2 — sounds beautiful
  { wort: 'Glühweinlaune', arabic: 'مزاج النبيذ المتوهّج', hint_ar: 'ذلك المزاج الدافئ في سوق الكريسماس وأنت تشرب Glühwein', gender: 'die', register: 'neutral', shelf_slug: 'christmas-markets' },
  { wort: 'Schlüsselblume', arabic: 'زهرة المفتاح', hint_ar: 'زهرة برية صفراء، اسمها وحده يستحق الحفظ', gender: 'die', register: 'formal' },
  { wort: 'Sternschnuppe', arabic: 'شهاب', hint_ar: 'النجمة المتساقطة — الكلمة تبدو مثل ما تصفه', gender: 'die', register: 'formal' },
  { wort: 'Wanderlust', arabic: 'شغف الترحال', hint_ar: 'كلمة ألمانية دخلت كل لغات العالم — الحنين للمشي بعيداً', gender: 'die', register: 'neutral' },
  { wort: 'Glitzerschnee', arabic: 'ثلج لامع', hint_ar: 'الثلج الذي يلمع تحت ضوء الشارع', gender: 'der', register: 'neutral' },
  { wort: 'Zwischenmenschlich', arabic: 'بين-إنساني', hint_ar: 'كل ما يحدث بين شخصين — لا يوجد في العربية مكافئ مفرد', register: 'formal' },
  { wort: 'Morgengrauen', arabic: 'الفجر الأول', hint_ar: 'لحظة ما قبل الشروق حين يتحول السواد إلى رمادي', gender: 'das', register: 'formal' },

  // Week 3 — coffee + café culture
  { wort: 'Sonntagskaffee', arabic: 'قهوة الأحد', hint_ar: 'طقس ألماني: قهوة، كعكة، جريدة صباح الأحد', gender: 'der', register: 'neutral', shelf_slug: 'coffee-bakery' },
  { wort: 'Kaffeesatz', arabic: 'تفل القهوة', hint_ar: 'البقايا في قاع الكوب — الألمان يقرأون فيه "التارو" قديماً', gender: 'der', register: 'neutral', shelf_slug: 'coffee-bakery' },
  { wort: 'Brezel', arabic: 'بريتزل (كعكة ملحية)', hint_ar: 'الكعكة الألمانية الرمز — في كل محطة قطار، في كل صباح', gender: 'die', register: 'neutral', shelf_slug: 'coffee-bakery' },
  { wort: 'Stammtisch', arabic: 'طاولة الأصحاب الدائمون', hint_ar: 'الطاولة المحجوزة لمجموعة أصدقاء في الحانة — عادة ألمانية قديمة', gender: 'der', register: 'neutral', shelf_slug: 'coffee-bakery' },
  { wort: 'Feierabend', arabic: 'انتهاء العمل', hint_ar: 'لحظة "انتهى يومي" — يُحتفى بها بتدبيرة بيرة. الكلمة ثقافية أكثر منها وقتية', gender: 'der', register: 'neutral' },
  { wort: 'Schlummertrunk', arabic: 'شراب ما قبل النوم', hint_ar: 'كأس صغيرة قبل النوم — عادة ألمانية مسائية', gender: 'der', register: 'formal' },
  { wort: 'Katerfrühstück', arabic: 'إفطار ما بعد الثمالة', hint_ar: 'الإفطار الذي تشتهيه بعد ليلة صعبة — Rollmops + Cola', gender: 'das', register: 'informal' },

  // Week 4 — feelings Germans have words for
  { wort: 'Zufriedenheit', arabic: 'القنوع', hint_ar: 'الرضا العميق الهادئ — ليست سعيدة، أرفع', gender: 'die', register: 'formal' },
  { wort: 'Schadenfreude', arabic: 'فرح ببلاء الآخرين', hint_ar: 'كلمة معترفة رسمياً في القاموس — بلا حكم أخلاقي', gender: 'die', register: 'neutral' },
  { wort: 'Fremdschämen', arabic: 'خجل بالنيابة', hint_ar: 'أن تخجل من تصرفات شخص آخر أمامك — ألماني جداً', gender: 'das', register: 'informal' },
  { wort: 'Torschlusspanik', arabic: 'ذعر إغلاق البوابة', hint_ar: 'الخوف من فوات الوقت — الاسم من قلاع العصور الوسطى التي تغلق أبوابها', gender: 'die', register: 'neutral' },
  { wort: 'Weltschmerz', arabic: 'ألم العالم', hint_ar: 'حزن عميق على حالة العالم — مصطلح أدبي رومانسي', gender: 'der', register: 'formal' },
  { wort: 'Lebensmüd', arabic: 'متعَب من الحياة', hint_ar: 'ليست اكتئاباً، بل ذلك التعب الفلسفي الذي يمرّ به المرء أحياناً', register: 'formal' },
  { wort: 'Ohrwurm', arabic: 'دودة الأذن', hint_ar: 'أغنية علقت في رأسك ولا تخرج — حرفياً "دودة في الأذن"', gender: 'der', register: 'informal' },

  // Week 5 — practical modern life
  { wort: 'Datenschutz', arabic: 'حماية البيانات', hint_ar: 'مبدأ ألماني: خصوصيتك مقدسة — كلمة من القانون الأوروبي', gender: 'der', register: 'formal', shelf_slug: 'privacy-datenschutz' },
  { wort: 'Mülltrennung', arabic: 'فرز النفايات', hint_ar: 'فنّ ألماني صارم: زجاج أخضر / أبيض / بني — كل واحد في حاويته', gender: 'die', register: 'neutral', shelf_slug: 'mulltrennung-full-system' },
  { wort: 'Krankschreibung', arabic: 'عذر طبي', hint_ar: 'ورقة الإجازة المرضية من الطبيب — حقّ عملي لا جدال فيه', gender: 'die', register: 'formal', shelf_slug: 'doctor-visit' },
  { wort: 'Termin', arabic: 'موعد', hint_ar: 'كل شيء في ألمانيا بموعد — الطبيب، الصالون، حتى البلدية', gender: 'der', register: 'formal' },
  { wort: 'Anmeldung', arabic: 'تسجيل العنوان', hint_ar: 'طقس العبور لكل وافد: تسجيلك في Bürgeramt — كلمة بلا مكافئ عربي', gender: 'die', register: 'formal', shelf_slug: 'burgeramt-anmeldung' },
  { wort: 'Kündigungsfrist', arabic: 'مدة الإشعار بالاستقالة', hint_ar: 'لا استقالة فورية — شهر إشعار (عادةً). ثقافة تعاقدية صارمة', gender: 'die', register: 'formal', shelf_slug: 'job-application' },
  { wort: 'Brückentag', arabic: 'يوم الجسر', hint_ar: 'يوم إجازة ذكي بين العطلة وعطلة نهاية الأسبوع — عادة ثقافية', gender: 'der', register: 'neutral' },

  // Week 6 — relationships & friendship
  { wort: 'Freundschaft', arabic: 'صداقة', hint_ar: 'الألمان يميّزون بدقة: Freund (صديق) ≠ Bekannter (معارف)', gender: 'die', register: 'neutral', shelf_slug: 'friends-real-vs-fake' },
  { wort: 'Seelenverwandtschaft', arabic: 'قرب الروح', hint_ar: 'توافق عميق بين شخصين — أكثر من صداقة، أقل من حبّ', gender: 'die', register: 'formal' },
  { wort: 'Schatz', arabic: 'كنزي (لقب حبيبي)', hint_ar: 'اللقب الأكثر شيوعاً للحبيب/الحبيبة — بسيط ودافئ', gender: 'der', register: 'informal', shelf_slug: 'pet-names-name' },
  { wort: 'Liebeskummer', arabic: 'همّ الحبّ', hint_ar: 'الحزن العميق الذي يتبع علاقة منتهية — لا يستخف به أحد هنا', gender: 'der', register: 'neutral', shelf_slug: 'breakup-language' },
  { wort: 'Kompromiss', arabic: 'حلّ وسط', hint_ar: 'ثقافة ألمانية عميقة: الاتفاق أهم من الانتصار', gender: 'der', register: 'formal' },
  { wort: 'Zusammensein', arabic: 'كوننا معاً', hint_ar: 'حالة أن تكون مع شخص دون فعل شيء محدد — مجرد وجود', gender: 'das', register: 'neutral' },
  { wort: 'Herzschmerz', arabic: 'ألم القلب', hint_ar: 'حرفياً "ألم في القلب" — يستخدم بصراحة في المحادثات اليومية', gender: 'der', register: 'informal', shelf_slug: 'breakup-language' },

  // Week 7 — humor & sarcasm
  { wort: 'Schmunzelecke', arabic: 'زاوية الابتسامة', hint_ar: 'حين تكون في مزاج لا تبتسم فيه بوضوح، لكن عينك تبتسم', gender: 'die', register: 'informal', shelf_slug: 'humor-dry' },
  { wort: 'Augenrollen', arabic: 'تدوير العينين', hint_ar: 'ردّ فعل ألماني بامتياز حين تسمع شيئاً غير معقول', gender: 'das', register: 'informal', shelf_slug: 'humor-dry' },
  { wort: 'Bahnhof', arabic: 'محطة قطار', hint_ar: '"Ich verstehe nur Bahnhof" = "أفهم لا شيء" — تعبير مجازي معروف', gender: 'der', register: 'informal', shelf_slug: 'public-transport' },
  { wort: 'Schnupfen', arabic: 'زكام', hint_ar: 'كلمة تبدو لطيفة، تعني فقط "زكام" — لا تخف منها', gender: 'der', register: 'neutral' },
  { wort: 'Bratkartoffel', arabic: 'بطاطا مقلية (بأسلوب ألماني)', hint_ar: 'طبق ألماني بيتي بسيط ولذيذ جداً', gender: 'die', register: 'neutral', shelf_slug: 'restaurant-etiquette' },
  { wort: 'Erklärungsnot', arabic: 'عوز التبرير', hint_ar: 'أنت في موقف محرج وتحتاج تبريراً عاجلاً — ألمانية جداً', gender: 'die', register: 'informal' },
  { wort: 'Schlüsselerlebnis', arabic: 'تجربة مفتاحية', hint_ar: 'تجربة تقلب طريقة تفكيرك فجأة', gender: 'das', register: 'formal' },

  // Week 8 — winter & cozy
  { wort: 'Gemütlichkeit', arabic: 'دفء لا يُترجم', hint_ar: 'كلمة "غير قابلة للترجمة" الأشهر في ألمانيا — حال من الدفء والأمان', gender: 'die', register: 'neutral' },
  { wort: 'Kuscheldecke', arabic: 'بطانية احتضان', hint_ar: 'البطانية الناعمة التي تستقبل بها أريكة المساء', gender: 'die', register: 'informal' },
  { wort: 'Kaminabend', arabic: 'مساء الموقد', hint_ar: 'ليلة شتاء بجوار المدفأة مع كتاب — فعل ماضي جماعي ألماني', gender: 'der', register: 'neutral' },
  { wort: 'Glühweinduft', arabic: 'عطر النبيذ المتوهّج', hint_ar: 'رائحة الخريف المتأخر في شوارع برلين', gender: 'der', register: 'neutral', shelf_slug: 'christmas-markets' },
  { wort: 'Wintermantel', arabic: 'معطف شتوي', hint_ar: 'قطعة لا غنى عنها في الحياة الألمانية — ثقيلة، دافئة، موثوقة', gender: 'der', register: 'neutral' },
  { wort: 'Heizung', arabic: 'تدفئة', hint_ar: 'حتى الصيف، المباني الألمانية فيها تدفئة تعمل — ثمانية أشهر في السنة', gender: 'die', register: 'neutral' },
  { wort: 'Schneegestöber', arabic: 'عاصفة ثلجية خفيفة', hint_ar: 'حين يتساقط الثلج بكثافة ولكن بهدوء — مشهد ألماني شتوي', gender: 'das', register: 'formal' },

  // Week 9 — work & profession
  { wort: 'Feierabend', arabic: 'انتهاء العمل (مرة أخرى)', hint_ar: 'الكلمة ثقافية: لا تعمل بعد الساعة 5 مساءً — الحياة خارج العمل مقدسة', gender: 'der', register: 'neutral' },
  { wort: 'Krankenschein', arabic: 'ورقة مرضية', hint_ar: 'وثيقة طبية للإجازة المرضية — تطلبها من الطبيب في اليوم الأول', gender: 'der', register: 'formal', shelf_slug: 'doctor-visit' },
  { wort: 'Bewerbungsschreiben', arabic: 'رسالة تقديم لوظيفة', hint_ar: 'وثيقة رسمية صارمة في ألمانيا — ترفق معها صورة وشهادات', gender: 'das', register: 'formal', shelf_slug: 'job-application' },
  { wort: 'Gehaltsverhandlung', arabic: 'مفاوضة الراتب', hint_ar: 'موعد مهم جداً — الألمان يعدّون الراتب جزءاً من الاحترام', gender: 'die', register: 'formal', shelf_slug: 'job-application' },
  { wort: 'Überstunden', arabic: 'ساعات عمل إضافية', hint_ar: 'لا يستحبّها ثقافياً — يجب أن تعوّض أو تُدفع', gender: 'die', register: 'formal' },
  { wort: 'Azubi', arabic: 'متدرب مهني', hint_ar: 'Auszubildender — نظام ألماني فريد: تدريب مهني مدفوع', gender: 'der', register: 'neutral', shelf_slug: 'job-application' },
  { wort: 'Mittagspause', arabic: 'استراحة الغداء', hint_ar: '30 دقيقة للأكل — ليست للتجوال. محترمة جداً', gender: 'die', register: 'neutral' },

  // Week 10 — sounds & texture
  { wort: 'Klangteppich', arabic: 'سجادة صوتية', hint_ar: 'طبقة صوتية متجانسة تسمعها في الخلفية — مفهوم صوتي', gender: 'der', register: 'formal' },
  { wort: 'Zischlaut', arabic: 'صوت صفيري', hint_ar: 'صوت حرف "ز" أو "ش" — مفيد حين تتعلم صوتية الألمانية', gender: 'der', register: 'formal' },
  { wort: 'Rhabarber', arabic: 'راوند (نبات)', hint_ar: 'حرف الـR هنا يُلفظ بشكل خشن مميز — جرّبه!', gender: 'der', register: 'neutral' },
  { wort: 'Schmetterling', arabic: 'فراشة', hint_ar: 'كلمة تبدو صعبة، نطقها بعد التدريب: "شمترلينغ"', gender: 'der', register: 'formal' },
  { wort: 'Streichholzschächtelchen', arabic: 'علبة كبريت صغيرة', hint_ar: 'أطول كلمة شائعة في الحياة اليومية — جرّب نطقها ببطء', gender: 'das', register: 'neutral' },
  { wort: 'Kofferwort', arabic: 'كلمة حقيبة', hint_ar: 'كلمات مركّبة من كلمتين: Fernsehen = Fern + Sehen (تلفزيون)', gender: 'das', register: 'formal' },
  { wort: 'Zungenbrecher', arabic: 'لُغز اللسان', hint_ar: 'جمل صعبة النطق مثل "Fischers Fritze fischt frische Fische"', gender: 'der', register: 'neutral' },

  // Week 11 — culture-specific
  { wort: 'Vereinsleben', arabic: 'حياة النوادي', hint_ar: 'ثقافة ألمانية: 90% من الألمان أعضاء في نادٍ واحد على الأقل', gender: 'das', register: 'neutral' },
  { wort: 'Schützenfest', arabic: 'مهرجان الرماة', hint_ar: 'مهرجان ريفي تقليدي، أقوى في جنوب ألمانيا — تاريخياً عسكري', gender: 'das', register: 'formal' },
  { wort: 'Erntedankfest', arabic: 'عيد شكر الحصاد', hint_ar: 'عيد الأحد الأول من أكتوبر — قرى بأكملها تزيّن', gender: 'das', register: 'formal' },
  { wort: 'Karneval', arabic: 'الكرنفال', hint_ar: 'احتفال ضخم في كولونيا ودوسلدورف — أزياء، رقص، ولا ضوابط', gender: 'der', register: 'neutral', shelf_slug: 'karneval-full' },
  { wort: 'Oktoberfest', arabic: 'أوكتوبرفست', hint_ar: 'لا يحتاج تعريفاً — لكن الكلمة: دير في ميونيخ', gender: 'das', register: 'neutral', shelf_slug: 'oktoberfest-full' },
  { wort: 'Pfingsten', arabic: 'عيد العنصرة', hint_ar: 'عطلة رسمية — أعياد مسيحية قديمة، تُحتفل بها علنياً', gender: 'die', register: 'formal' },
  { wort: 'Tannenbaum', arabic: 'شجرة التنوب', hint_ar: 'شجرة عيد الميلاد — عادة ألمانية نشرتها العالم كله', gender: 'der', register: 'neutral', shelf_slug: 'christmas-markets' },

  // Week 12 — modern youth
  { wort: 'Yolo', arabic: 'أنت تعيش مرة واحدة', hint_ar: 'كلمة إنجليزية الأصل دخلت الألمانية بحماس', gender: 'das', register: 'slang', shelf_slug: 'denglisch-loanwords' },
  { wort: 'chillen', arabic: 'يسترخي', hint_ar: 'فعل إنجليزي الأصل: "Ich chill heute Abend" = "سأستريح الليلة"', register: 'slang', shelf_slug: 'denglisch-loanwords' },
  { wort: 'Digga', arabic: 'يا صاحبي', hint_ar: 'تحية شبابية شمال ألمانيا — هامبورغ أساساً', gender: 'die', register: 'slang', shelf_slug: 'gaming-culture' },
  { wort: 'Moin', arabic: 'مرحباً (شمالي)', hint_ar: 'تحية شمال ألمانيا — طوال اليوم، لا فقط صباحاً', register: 'informal' },
  { wort: 'Servus', arabic: 'مرحباً / مع السلامة', hint_ar: 'تحية بافاريا والنمسا — نفس الكلمة للقادمين والمغادرين', register: 'informal', shelf_slug: 'bavarian-signature' },
  { wort: 'Grüß Gott', arabic: 'تحية الله (بافارية)', hint_ar: 'تحية جنوبية مهذبة — "الله يحييك"', register: 'formal', shelf_slug: 'bavarian-signature' },
  { wort: 'Tschüss', arabic: 'مع السلامة (عامية)', hint_ar: 'وداع عامي يومي — من كلمة فرنسية قديمة عبر الهولندية', register: 'informal' },

  // Week 13 — final touch
  { wort: 'Lieblingsplatz', arabic: 'المكان المفضّل', hint_ar: 'كل شخص في ألمانيا مكانه المفضّل — مقعد في الحانة أو زاوية في الحديقة', gender: 'der', register: 'neutral' },
  { wort: 'Augenblick', arabic: 'لحظة', hint_ar: 'حرفياً "نظرة عين" — كل ما يحدث في ومضة', gender: 'der', register: 'formal' },
  { wort: 'Wundertüte', arabic: 'كيس المفاجآت', hint_ar: 'كيس حلوى تغلق عينك ثم تختار — للأطفال والكبار', gender: 'die', register: 'neutral' },
  { wort: 'Zeitgeist', arabic: 'روح العصر', hint_ar: 'كلمة إنجليزية الأصل دخلت كل لغات العالم — من ألمانيا', gender: 'der', register: 'formal' },
  { wort: 'Kindergarten', arabic: 'روضة الأطفال', hint_ar: 'كلمة ألمانية بدأت كمفهوم — Friedrich Fröbel، 1840', gender: 'der', register: 'neutral' },
  { wort: 'Fernweh', arabic: 'حنين للمسافة (ثانية)', hint_ar: 'الإعادة المتعمّدة — كلمات تستحق أن تتذكرها', gender: 'das', register: 'neutral' },
  { wort: 'Zuhause', arabic: 'بيت (المنزل الذي تنتمي إليه)', hint_ar: 'ليس مجرد Haus (بيت مادي)، بل Heimat (انتماء)', gender: 'das', register: 'neutral' },
];

export const DAILY_WORTER_COUNT = DAILY_WORTER.length;