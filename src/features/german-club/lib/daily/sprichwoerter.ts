import type { DailySprichwort } from './types';

/**
 * Hand-curated daily Sprichwörter — German proverbs and sayings.
 * 90 entries for a 3-month cycle.
 *
 * Each entry has a literal Arabic translation (the fun surprise) and a real
 * meaning. We use these to show that the German language has a deep treasury
 * of folk wisdom that often translates beautifully — or hilariously — into
 * Arabic.
 */
export const DAILY_SPRICHWOERTER: readonly DailySprichwort[] = [
  { sprichwort: 'Aller Anfang ist schwer.', literal_ar: 'كل بداية صعبة', meaning_ar: 'بدايات أي شيء صعبة دائماً — لا تيأس في أول أسبوع', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Übung macht den Meister.', literal_ar: 'التمرين يصنع المعلّم', meaning_ar: 'بالتكرار والاحتراف — لا توجد موهبة بدون عمل', shelf_slug: 'gym-culture' },
  { sprichwort: 'Morgenstund hat Gold im Mund.', literal_ar: 'ساعة الصباح لها ذهب في فمها', meaning_ar: 'من يستيقظ باكراً يجد فرصاً — عادة ثقافية قوية', shelf_slug: 'numbers-time' },
  { sprichwort: 'Wer anderen eine Grube gräbt, fällt selbst hinein.', literal_ar: 'من يحفر حفرة لغيره، يسقط فيها بنفسه', meaning_ar: 'كل من يخطط لضرر غيره، يضرّ نفسه — مثل عربي تماماً', shelf_slug: 'swearing-insults' },
  { sprichwort: 'Apum hat keine Flügel.', literal_ar: 'النملة ليس لها أجنحة', meaning_ar: 'النملة المجتهدة لا تطير — تبقى على الأرض وتعمل (الألمان لا يعرفون النملة الطائرة)', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Eine Hand wäscht die andere.', literal_ar: 'يد تغسل اليد الأخرى', meaning_ar: 'العمل الجماعي والتعاون المتبادل — قاعدة علاقات قوية', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Man soll den Tag nicht vor dem Abend loben.', literal_ar: 'لا تمدح النهار قبل المساء', meaning_ar: 'لا تحتفل قبل أن ينتهي اليوم — مثل "لا تقل فاكهة قبل أوانها"', shelf_slug: 'weather-idioms' },

  { sprichwort: 'Wo ein Wille ist, ist auch ein Weg.', literal_ar: 'حيث توجد إرادة، يوجد طريق', meaning_ar: 'الإرادة هي المفتاح — مقولة مشهورة جداً', shelf_slug: 'flirting-deep' },
  { sprichwort: 'Zwei Köpfe wissen mehr als einer.', literal_ar: 'رأسان يعرفان أكثر من واحد', meaning_ar: 'العمل الجماعي أفضل من الفردي — حتى لو كان رأسك ذكياً', shelf_slug: 'job-application' },
  { sprichwort: 'Liebe geht durch den Magen.', literal_ar: 'الحب يمر عبر المعدة', meaning_ar: 'طريق القلب يمر بالمعدة — طبخ ممتاز = علاقة ناجحة', shelf_slug: 'restaurant-etiquette' },
  { sprichwort: 'Der Apfel fällt nicht weit vom Stamm.', literal_ar: 'التفاح لا يسقط بعيداً عن الشجرة', meaning_ar: 'الابن يشبه أباه بالطبع — المعنى ذاته في كل اللغات', shelf_slug: 'family-implied' },
  { sprichwort: 'Besser spät als nie.', literal_ar: 'أفضل متأخراً من أبداً', meaning_ar: 'إذا تأخرت، لا تتوقف — ابدأ الآن', shelf_slug: 'train-running-late' },
  { sprichwort: 'Ende gut, alles gut.', literal_ar: 'النهاية طيبة، كل شيء طيب', meaning_ar: 'ما يهم هو كيف ينتهي الأمر — سواء بدأت بشكل سيئ', shelf_slug: 'breakup-language' },
  { sprichwort: 'Eile mit Weile.', literal_ar: 'عَجَل بهدوء', meaning_ar: 'السرعة مع التأمل — شعار ألماني عظيم', shelf_slug: 'rhythm-pacing' },

  { sprichwort: 'Probieren geht über Studieren.', literal_ar: 'التجربة تتفوق على الدراسة', meaning_ar: 'جرّب بدلاً من أن تدرس نظرياً فقط — موقف ألماني عملي', shelf_slug: 'gym-culture' },
  { sprichwort: 'Ohne Fleiß kein Preis.', literal_ar: 'بلا اجتهاد لا جائزة', meaning_ar: 'الجهد هو ما يصنع الفرق — قاسٍ لكن حقيقي', shelf_slug: 'gym-culture' },
  { sprichwort: 'Der Mensch ist, was er isst.', literal_ar: 'الإنسان هو ما يأكل', meaning_ar: 'طعامك يصنع شخصيتك — فلسفة Feuerbach', shelf_slug: 'restaurant-etiquette' },
  { sprichwort: 'In der Ruhe liegt die Kraft.', literal_ar: 'في الهدوء تكمن القوة', meaning_ar: 'الهدوء العميق أقوى من الصخب — ثقافة ألمانية محورية', shelf_slug: 'weather-smalltalk' },
  { sprichwort: 'Zeit ist Geld.', literal_ar: 'الوقت مال', meaning_ar: 'لا تضيّع وقتك ولا وقت غيرك — قاعدة ثقافية', shelf_slug: 'job-application' },
  { sprichwort: 'Wer wagt, gewinnt.', literal_ar: 'من يجرأ، يفوز', meaning_ar: 'الشجاعة تُكافأ — مقولة تجارية معروفة', shelf_slug: 'gaming-culture' },
  { sprichwort: 'Andere Länder, andere Sitten.', literal_ar: 'بلدان أخرى، عادات أخرى', meaning_ar: 'احترم اختلاف الثقافات — تذكير دائم عند زيارة بلد', shelf_slug: 'travel-etiquette' },

  { sprichwort: 'Brot und Spiele.', literal_ar: 'خبز وألعاب', meaning_ar: 'السياسة القديمة: إذا ملأت بطون الناس ومتعتهم، تحكم طويلاً', shelf_slug: 'politics-implied' },
  { sprichwort: 'Der dümmste Bauer hat die dicksten Kartoffeln.', literal_ar: 'أغبى الفلاحين لديه أكبر بطاطس', meaning_ar: 'الحظ أحياناً أهم من الذكاء — اعترف بذلك بابتسامة', shelf_slug: 'humor-dry' },
  { sprichwort: 'Wie man in den Wald hineinruft, so schallt es heraus.', literal_ar: 'كما تصيح في الغابة، كذلك يرتدّ الصدى', meaning_ar: 'ما تبذله من لطف تحصل عليه — قانون المعاملة بالمثل', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Nur die Harten kommen in den Garten.', literal_ar: 'فقط الأقوياء يدخلون الحديقة', meaning_ar: 'فقط من يصمد ينال الجنة — مقولة شائعة جداً', shelf_slug: 'gym-culture' },
  { sprichwort: 'Auf dem Holzweg sein.', literal_ar: 'أنت على طريق خشبي', meaning_ar: 'أنت في الاتجاه الخاطئ — أو على طريق مسدود', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Da steppt der Bär.', literal_ar: 'هناك يرقص الدبّ', meaning_ar: 'هذا هو المكان الذي يحدث فيه كل شيء — تعبير مثير', shelf_slug: 'festival-culture' },
  { sprichwort: 'Tomaten auf den Augen haben.', literal_ar: 'لديك طماطم على عينيك', meaning_ar: 'أنت لا ترى ما هو واضح أمامك', shelf_slug: 'food-idioms' },

  { sprichwort: 'Die Daumen drücken.', literal_ar: 'اضغط الإبهام', meaning_ar: 'يعني "أتمنى لك الحظ" — حرفياً "اضغط الإبهام" لا أكثر', shelf_slug: 'weather-idioms' },
  { sprichwort: 'Schlafende Hunde soll man nicht wecken.', literal_ar: 'لا توقظ الكلاب النائمة', meaning_ar: 'لا تفتح مواضيع قديمة — دعها', shelf_slug: 'weather-idioms' },
  { sprichwort: 'Den inneren Schweinehund überwinden.', literal_ar: 'تغلّب على كلبك الداخلي', meaning_ar: 'تغلّب على كسلك الداخلي — "الكلب" هنا هو الكسل نفسه', shelf_slug: 'gym-culture' },
  { sprichwort: 'Das ist nicht mein Bier.', literal_ar: 'هذه ليست بيرتي', meaning_ar: 'هذا ليس شغلي — حرفياً "بيرتي"، بمعنى مسؤوليتي', shelf_slug: 'swearing-insults' },
  { sprichwort: 'Da liegt der Hund begraben.', literal_ar: 'هناك مدفون الكلب', meaning_ar: 'هذا هو لبّ المشكلة — أو السر الذي لا يُقال', shelf_slug: 'swearing-insults' },
  { sprichwort: 'Ich verstehe nur Bahnhof.', literal_ar: 'أنا أفهم فقط محطة القطار', meaning_ar: 'لا أفهم شيئاً — تعبير من الحرب العالمية الثانية', shelf_slug: 'public-transport' },
  { sprichwort: 'Jetzt mal Butter bei die Fische.', literal_ar: 'الآن ضع زبدة على السمك', meaning_ar: 'هيا إلى النقطة الجوهرية — توقف عن المراوغة', shelf_slug: 'food-idioms' },

  { sprichwort: 'Klein, aber fein.', literal_ar: 'صغير، لكن رائع', meaning_ar: 'ما هو صغير قد يكون قيّماً جداً — شعار بودن البحر', shelf_slug: 'weather-smalltalk' },
  { sprichwort: 'Lügen haben kurze Beine.', literal_ar: 'الأكاذيب أرجل قصيرة', meaning_ar: 'الكذب يُكشف بسرعة — حرفياً "لا تستطيع الجري بعيداً"', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Schön wie die Sünde.', literal_ar: 'جميلة كالخطيئة', meaning_ar: 'جميلة بشكل يثير الإغراء — مجاملة مبالغ فيها', shelf_slug: 'flirting-deep' },
  { sprichwort: 'Es ist nicht alles Gold, was glänzt.', literal_ar: 'ليس كل ما يلمع ذهباً', meaning_ar: 'المظهر يخبّئ أحياناً — انظر خلف البريق', shelf_slug: 'weather-idioms' },
  { sprichwort: 'Wie Hund und Katze.', literal_ar: 'مثل الكلب والقطّة', meaning_ar: 'عدوانيان لا يتفقان — مثل عربي تماماً', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Viele Köche verderben den Brei.', literal_ar: 'كثير من الطبّاخين يفسدون العصيدة', meaning_ar: 'كثير من الآراء يفسد القرار — حرفياً', shelf_slug: 'food-idioms' },
  { sprichwort: 'Du hast Hummeln im Hintern.', literal_ar: 'لديك نحل في مؤخرتك', meaning_ar: 'أنت لا تستطيع الجلوس ساكناً — تعبير صريح عن الطاقة', shelf_slug: 'animal-idioms' },

  { sprichwort: 'Einem geschenkten Gaul schaut man nicht ins Maul.', literal_ar: 'لا تنظر في فم حصان مُهدى', meaning_ar: 'لا تنتقد ما أعطاك إياه أحد — الهدية هدية', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Warten ist die Hölle.', literal_ar: 'الانتظار جحيم', meaning_ar: 'في ثقافة المواعيد الألمانية، الانتظار عذاب حقيقي', shelf_slug: 'train-running-late' },
  { sprichwort: 'Das geht mir auf den Keks.', literal_ar: 'هذا يذهب إلى البسكويت عندي', meaning_ar: 'هذا يُزعجني — حرفياً البسكويت = "الصبر"', shelf_slug: 'swearing-insults' },
  { sprichwort: 'Hals- und Beinbruch.', literal_ar: 'كسر العنق والساق', meaning_ar: 'بالتوفيق! — مثل "كسر رجلك" بالعكس تماماً', shelf_slug: 'flirting-deep' },
  { sprichwort: 'Da wird der Hund in der Pfanne verrückt.', literal_ar: 'الكلب يجنّ في المقلاة', meaning_ar: 'الفوضى الشاملة، الكل يفقد عقله', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Unter vier Augen.', literal_ar: 'تحت أربع عيون', meaning_ar: 'بيننا نحن الاثنين فقط — محادثة خاصة', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Eine Extrawurst verlangen.', literal_ar: 'تطلب نقانق إضافية', meaning_ar: 'تطلب معاملة خاصة لأنك مختلف — ثقافياً', shelf_slug: 'food-idioms' },

  { sprichwort: 'Jemandem die Daumen drücken.', literal_ar: 'اضغط إبهامك لأحد', meaning_ar: 'يتمنّى الخير لشخص — على طريقة قديمة', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Auch ein blindes Huhn findet mal ein Korn.', literal_ar: 'حتى الدجاجة العمياء تجد حبّة', meaning_ar: 'حتى الحظ السيء يجد يومه — اعترف بذلك', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Da sein für jemanden.', literal_ar: 'أن تكون موجوداً لأحد', meaning_ar: 'أعظم ما يمكن أن تفعله — التواجد وقت الحاجة', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Kein Mensch ist eine Insel.', literal_ar: 'لا أحد جزيرة', meaning_ar: 'لا أحد يعيش بمفرده — تذكير بالعلاقات', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Man muss die Feste feiern, wie sie fallen.', literal_ar: 'احتفل بالأعياد حين تسقط', meaning_ar: 'استمتع باللحظة كما هي — دون انتظار المناسبة المثالية', shelf_slug: 'festival-culture' },
  { sprichwort: 'Eine Reise von tausend Meilen beginnt mit einem einzigen Schritt.', literal_ar: 'رحلة الألف ميل تبدأ بخطوة واحدة', meaning_ar: 'كل عظيم بدأ صغيراً — لا تنتظر الكمال لتبدأ', shelf_slug: 'travel-etiquette' },
  { sprichwort: 'Wer nicht wagt, der nicht gewinnt.', literal_ar: 'من لا يجرأ، لا يفوز', meaning_ar: 'المخاطرة جزء من الإنجاز — لا تنتظر اليقين', shelf_slug: 'gaming-culture' },

  { sprichwort: 'Das ist ein Katzensprung.', literal_ar: 'هذه قفزة قطّة', meaning_ar: 'المسافة قصيرة جداً — حرفياً "قفزة قطّة واحدة"', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Da steppt der Bär.', literal_ar: 'هناك يرقص الدبّ', meaning_ar: 'هذا هو المكان الذي يحدث فيه كل شيء — تعبير مثير', shelf_slug: 'festival-culture' },
  { sprichwort: 'Eine Schwalbe macht noch keinen Sommer.', literal_ar: 'خطافة واحدة لا تصنع الصيف', meaning_ar: 'حادثة واحدة لا تكفي — انتظر', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Besser ein Ende mit Schrecken als Schrecken ohne Ende.', literal_ar: 'أفضل نهاية مرعبة من رعب بلا نهاية', meaning_ar: 'في الحرب: نهاية سريعة أفضل من ألم طويل', shelf_slug: 'breakup-language' },
  { sprichwort: 'Nicht alles, was glänzt, ist Gold.', literal_ar: 'ليس كل ما يلمع ذهباً', meaning_ar: 'انظر خلف البريق — تذكير دائم', shelf_slug: 'weather-idioms' },
  { sprichwort: 'Ich stehe im Regen.', literal_ar: 'أنا واقف في المطر', meaning_ar: 'أنا مهمّش، لا أحد يهتم بي — تعبير شعبي', shelf_slug: 'weather-idioms' },
  { sprichwort: 'Wissen ist Macht.', literal_ar: 'المعرفة قوة', meaning_ar: 'صراحة Francis Bacon — مقولة في كل ثقافة', shelf_slug: 'university-exams' },

  { sprichwort: 'Übung macht den Meister.', literal_ar: 'التمرين يصنع المعلّم', meaning_ar: 'بالتكرار والاحتراف — لا توجد موهبة بدون عمل', shelf_slug: 'gym-culture' },
  { sprichwort: 'Man lernt nie aus.', literal_ar: 'لا ينتهي تعلّم الإنسان', meaning_ar: 'مهما عمّرت، ما زلت تتعلم — تذكير بالفضول', shelf_slug: 'university-exams' },
  { sprichwort: 'Lieber den Spatz in der Hand als die Taube auf dem Dach.', literal_ar: 'عصفور في اليد خير من حمامة على السطح', meaning_ar: 'خذ ما هو آمن، لا تنتظر الوعد الأكبر', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Aus Schaden wird man klug.', literal_ar: 'من الضرر يصير المرء حكيماً', meaning_ar: 'التجربة السيئة علّمتنا أكثر من النصيحة الجيدة', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Treue zahlt sich aus.', literal_ar: 'الوفاء يُؤتي ثماره', meaning_ar: 'الولاء يثمر على المدى الطويل — ثقافة ألمانية', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Glück im Spiel, Pech in der Liebe.', literal_ar: 'حظ في اللعب، سوء حظ في الحبّ', meaning_ar: 'حين تفوز في البوكر وتفشل في المواعدة — تذكير مرح', shelf_slug: 'flirting-deep' },
  { sprichwort: 'Ich bin dann mal weg.', literal_ar: 'أنا ذاهب الآن', meaning_ar: 'العنوان الأشهر في كتاب Hape Kerkeling — دعوة للسفر', shelf_slug: 'travel-etiquette' },

  { sprichwort: 'Auch alte Hunde kann man neue Tricks beibringen.', literal_ar: 'حتى الكلاب القديمة يمكن تعليمها tricks جديدة', meaning_ar: 'لا يوجد عمر للتعلم — العكس تماماً', shelf_slug: 'animal-idioms' },
  { sprichwort: 'Geteiltes Leid ist halbes Leid.', literal_ar: 'الهمّ المشترك همّ نصف', meaning_ar: 'حين تشارك ألمك مع أحد، ينقسم', shelf_slug: 'breakup-language' },
  { sprichwort: 'Geteilte Freude ist doppelte Freude.', literal_ar: 'الفرح المشترك فرح مضاعف', meaning_ar: 'ومشاركته مع أحد تضاعفه', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Wer A sagt, muss auch B sagen.', literal_ar: 'من قال ألف، عليه أن يقول باء', meaning_ar: 'إذا بدأت، أكمل — مقولة في الالتزام', shelf_slug: 'breakup-language' },
  { sprichwort: 'Im Auge des Betrachters.', literal_ar: 'في عين الناظر', meaning_ar: 'الجمال نسبي — حسب من ينظر', shelf_slug: 'flirting-deep' },
  { sprichwort: 'Es gibt nichts Gutes, außer man tut es.', literal_ar: 'لا يوجد شيء جيد، ما لم تفعله', meaning_ar: 'الأخلاق فعل، لا كلام — شعار', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Mitleid bekommt man geschenkt, Neid muss man sich verdienen.', literal_ar: 'الشفقة تُهدى، الحسد يجب أن تكسبه', meaning_ar: 'دعابة فلسفية ثقيلة — لا تأخذها بجدية', shelf_slug: 'humor-dry' },

  { sprichwort: 'Lieber reich und gesund als arm und krank.', literal_ar: 'أفضل غني ومعافى من فقير ومريض', meaning_ar: 'دعابة ألمانية: المال والصحة أفضل من الفقر والمرض', shelf_slug: 'humor-dry' },
  { sprichwort: 'Verzeihen ist schwer, vergessen noch schwerer.', literal_ar: 'المغفرة صعبة، النسيان أصعب', meaning_ar: 'حكمة في العلاقات — والنسيان أصعب', shelf_slug: 'breakup-language' },
  { sprichwort: 'Das Herz auf dem rechten Fleck haben.', literal_ar: 'القلب في المكان الصحيح', meaning_ar: 'شخص طيب وقلبه نقي — صفة مدح', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Sein Herz ausschütten.', literal_ar: 'سكب قلبه', meaning_ar: 'أن تبوح بكل ما في صدرك — تعبير عاطفي صادق', shelf_slug: 'breakup-language' },
  { sprichwort: 'Es ist nie zu spät.', literal_ar: 'لا يوجد أبداً متأخر', meaning_ar: 'تذكير دائم — لا تتوقف', shelf_slug: 'gym-culture' },
  { sprichwort: 'Man kann die Zeit nicht zurückdrehen.', literal_ar: 'لا يمكن إرجاع عقارب الساعة', meaning_ar: 'ما فات مات — فكّر بالمستقبل', shelf_slug: 'breakup-language' },
  { sprichwort: 'Es gibt kein schlechtes Wetter, nur schlechte Kleidung.', literal_ar: 'لا يوجد طقس سيء، فقط ملابس سيئة', meaning_ar: 'الشعار السياحي الأشهر في ألمانيا — لا عذر للطقس', shelf_slug: 'weather-smalltalk' },

  { sprichwort: 'Alle Menschen sind gleich.', literal_ar: 'كل الناس سواسية', meaning_ar: 'مبدأ دستوري ألماني — Grundgesetz المادة 1', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Treue siegt.', literal_ar: 'الوفاء ينتصر', meaning_ar: 'شعار الحركة الطلابية — ثم تبنته الشركات', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Was du nicht willst, das man dir tu, das füg auch keinem andern zu.', literal_ar: 'ما لا تريده لنفسك، لا تفعله لغيرك', meaning_ar: 'القاعدة الذهبية بألمانية 1850 — قبل Kant نفسه', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'In der Kürze liegt die Würze.', literal_ar: 'في الإيجاز تكمن البهارات', meaning_ar: 'الأقصر ألذ — نصيحة للكتابة', shelf_slug: 'humor-dry' },
  { sprichwort: 'Alles hat ein Ende, nur die Wurst hat zwei.', literal_ar: 'كل شيء له نهاية، النقانق لها اثنتان', meaning_ar: 'دعابة عبقرية — نهايات ونقانق', shelf_slug: 'humor-dry' },
  { sprichwort: 'Morgen, Morgen, nur nicht heute, sagen alle faulen Leute.', literal_ar: 'غداً، غداً، ليس اليوم، يقول كل الكسالى', meaning_ar: 'لا تسوّف — المقولة المعادية للتسويف', shelf_slug: 'gym-culture' },
  { sprichwort: 'Wer den Schaden hat, braucht für den Spott nicht zu sorgen.', literal_ar: 'من أصابه الضرر، لا يحتاج بحثاً عن سخرية', meaning_ar: 'إذا كنت في موقف سيئ، ستأتي السخرية', shelf_slug: 'humor-dry' },

  { sprichwort: 'Besser allein als in schlechter Gesellschaft.', literal_ar: 'أفضل وحيداً من رفقة سيئة', meaning_ar: 'الوحدة خيار أفضل من الرفقة السامة', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Es ist noch kein Meister vom Himmel gefallen.', literal_ar: 'لم يسقط معلّم من السماء بعد', meaning_ar: 'كل خبير تدرّب سنيناً — لا مواهب فورية', shelf_slug: 'gym-culture' },
  { sprichwort: 'Nichts wird so heiß gegessen, wie es gekocht wird.', literal_ar: 'لا شيء يُؤكل ساخناً كما يُطبخ', meaning_ar: 'الكوارث المتوقعة نادراً ما تحدث — تهدئة', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Auch der längste Weg beginnt mit einem Schritt.', literal_ar: 'حتى أطول طريق يبدأ بخطوة', meaning_ar: 'لا تحجم عن البداية مهما بدا الطريق طويلاً', shelf_slug: 'travel-etiquette' },
  { sprichwort: 'Hochmut kommt vor dem Knall.', literal_ar: 'الكبرياء قبل الانفجار', meaning_ar: 'متكبّر اليوم، يسقط غداً — تحذير', shelf_slug: 'humor-dry' },
  { sprichwort: 'Sag mir, mit wem du gehst, und ich sag dir, wer du bist.', literal_ar: 'قل لي مع من تمشي، أقول لك من أنت', meaning_ar: 'الأصدقاء يصنعونك — انتبه لرفقتك', shelf_slug: 'friends-real-vs-fake' },
  { sprichwort: 'Der Ton macht die Musik.', literal_ar: 'اللحن يصنع الموسيقى', meaning_ar: 'الطريقة أهم من المحتوى — تعبير عن الدبلوماسية', shelf_slug: 'job-application' },

  { sprichwort: 'Wo Rauch ist, ist auch Feuer.', literal_ar: 'حيث يوجد دخان، يوجد نار', meaning_ar: 'إذا سمعنا إشاعة قوية، غالباً فيها حقيقة', shelf_slug: 'venting-expressions' },
  { sprichwort: 'Selbst ist der Mann.', literal_ar: 'الرجل يعتمد على نفسه', meaning_ar: 'افعلها بنفسك — شعار DIY', shelf_slug: 'gym-culture' },
  { sprichwort: 'Männer und Frauen passen zusammen wie Deckel auf Topf.', literal_ar: 'رجال ونساء يتناسبون مثل غطاء وقدر', meaning_ar: 'فكاهة العلاقة الزوجية — مطبخية', shelf_slug: 'relationship-milestones' },
  { sprichwort: 'Liebe macht blind.', literal_ar: 'الحب يُعمّي', meaning_ar: 'الوقوع في الحب يفقدك الموضوعية — تعبير قديم', shelf_slug: 'flirting-deep' },
  { sprichwort: 'Man muss die Kirche im Dorf lassen.', literal_ar: 'اترك الكنيسة في القرية', meaning_ar: 'لا تبالغ، ابقَ عقلانياً — شعار ألماني', shelf_slug: 'weather-idioms' },
  { sprichwort: 'Einen alten Baum verpflanzt man nicht.', literal_ar: 'لا تُنقِل شجرة عجوز', meaning_ar: 'لا تطلب من شخص كبير تغيير عاداته', shelf_slug: 'family-implied' },
];

export const DAILY_SPRICHWOERTER_COUNT = DAILY_SPRICHWOERTER.length;