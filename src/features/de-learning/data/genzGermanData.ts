// Fresh Gen Z German Learning Dataset for amv.life
// Ultra-rich, authentic, non-traditional German learning content designed specifically for Gen Z and young adults.
// Every German element is rendered in bold, paired with concise, small, elegant Arabic translations and cultural context.

export interface GenZShelfItem {
  id: string;
  german_text: string;
  arabic_translation: string;
  phonetic_ipa?: string;
  literal_meaning_ar?: string;
  cultural_note_ar: string;
  context_tag_ar: string;
  badge_label: string;
  vibe_tag: 'street' | 'genz' | 'cafe' | 'tech' | 'nightlife' | 'survival';
  audio_id: string;
}

export interface GenZShelf {
  id: string;
  title_ar: string;
  title_de: string;
  subtitle_ar: string;
  icon_emoji: string;
  theme_gradient: string;
  items: GenZShelfItem[];
}

export interface GrammarSpot {
  id: string;
  title_ar: string;
  title_de: string;
  summary_ar: string;
  contrastive_arabic_bridge: string;
  german_formula_de: string;
  examples: {
    german_de: string;
    arabic_ar: string;
    breakdown_ar: string;
  }[];
}

export interface PhoneticSpot {
  id: string;
  sound_de: string;
  ipa: string;
  arabic_equivalent_ar: string;
  guide_ar: string;
  example_de: string;
  example_ar: string;
}

export const GERMAN_GENZ_SHELVES: GenZShelf[] = [
  {
    id: 'street-slang',
    title_ar: 'رف شوارع برلين والشباب',
    title_de: 'Berliner Straßen- & Gen-Z-Slang',
    subtitle_ar: 'لغة الشارع الحقيقية والمصطلحات الأكثر تداولاً بين جيل الشباب في ألمانيا',
    icon_emoji: '🔥',
    theme_gradient: 'from-amber-500/20 via-orange-500/10 to-amber-950/20 border-amber-500/30 text-amber-400',
    items: [
      {
        id: 'gz-01',
        german_text: 'Digga, was geht ab?',
        arabic_translation: 'يا صاحبي، شو الأخبار؟',
        phonetic_ipa: '[ˈdɪɡa, vas ɡeːt ap]',
        literal_meaning_ar: 'يا سمين/صديقي المقرب، ما الذي يحدث؟',
        cultural_note_ar: 'الكلمة الأكثر انتشاراً بين شباب ألمانيا (تستخدم مثل bro أو صاحبي).',
        context_tag_ar: 'تحية الشباب في الشارع',
        badge_label: 'سلاينج برلين',
        vibe_tag: 'street',
        audio_id: 'snd-digga-was-geht',
      },
      {
        id: 'gz-02',
        german_text: 'Voll cringe, ehrlich gesagt!',
        arabic_translation: 'مُحرج ومبهرج جداً، صراحةً!',
        phonetic_ipa: '[fɔl krɪndʃ, ˈeːɐ̯lɪç ɡəˈzaːkt]',
        cultural_note_ar: 'دمج كلمة Cringe الإنجليزية في القالب الألماني اليومي للتعبير عن الاحراج.',
        context_tag_ar: 'التعليق على موقف محرج',
        badge_label: 'مصطلح جيل زد',
        vibe_tag: 'genz',
        audio_id: 'snd-voll-cringe',
      },
      {
        id: 'gz-03',
        german_text: 'Ich hab gar keinen Bock darauf!',
        arabic_translation: 'ما إلي خلق أبداً لهذا الشيء!',
        phonetic_ipa: '[ɪç hap ɡaːɐ̯ ˈkaɪ̯nən bɔk daˈʁaʊ̯f]',
        literal_meaning_ar: 'ليس لدي رغبة في ذلك.',
        cultural_note_ar: 'تعبير ألماني أصيل ومعاصر للتعبير عن انعدام الشغف أو المزاج لفعل شيء.',
        context_tag_ar: 'التذمر اللطيف بين الأصدقاء',
        badge_label: 'تعبير يومي',
        vibe_tag: 'genz',
        audio_id: 'snd-keinen-bock',
      },
      {
        id: 'gz-04',
        german_text: 'Safe, machen wir so!',
        arabic_translation: 'أكيد مليون بالمئة، نعمل كذا!',
        phonetic_ipa: '[seːf, ˈmaxn̩ viːɐ̯ zoː]',
        cultural_note_ar: 'تأكيد جازم ومحبب بين الشباب للموافقة الفورية.',
        context_tag_ar: 'الاتفاق والسخط الفوري',
        badge_label: 'اتفاق فوري',
        vibe_tag: 'genz',
        audio_id: 'snd-safe-machen-wir',
      },
      {
        id: 'gz-05',
        german_text: 'Läuft bei dir!',
        arabic_translation: 'أمورك بالسليم! / ماشية معك تمام!',
        phonetic_ipa: '[lɔɪ̯ft baɪ̯ diːɐ̯]',
        cultural_note_ar: 'تقال للثناء على شخص ينجح أو تبتسم له الظروف بسهولة.',
        context_tag_ar: 'المباركة والمدح الشبابي',
        badge_label: 'إشادة وتحفيز',
        vibe_tag: 'street',
        audio_id: 'snd-laeuft-bei-dir',
      },
      {
        id: 'gz-06',
        german_text: 'Ehrenmann / Ehrenfrau!',
        arabic_translation: 'رجل شهم / امرأة كفو!',
        phonetic_ipa: '[ˈeːʁənˌman / ˈeːʁənˌfʁaʊ̯]',
        cultural_note_ar: 'فازت بلقب كلمة العام للشباب في ألمانيا، وتطلق على من يقدم خدمة جدعة.',
        context_tag_ar: 'شكر وتقدير عالي',
        badge_label: 'كلمة العام',
        vibe_tag: 'street',
        audio_id: 'snd-ehrenmann',
      },
      {
        id: 'gz-07',
        german_text: 'Kein Stress, alles gut!',
        arabic_translation: 'ولا يهمك، كل شيء تمام!',
        phonetic_ipa: '[kaɪ̯n ʃtʁɛs, ˈaləs ɡuːt]',
        cultural_note_ar: 'العبارة الأنسب لتهدئة المواقف البسيطة وتجاوز الأخطاء غير المقصودة.',
        context_tag_ar: 'التهدئة واللطف',
        badge_label: 'تهدئة وتجاوز',
        vibe_tag: 'street',
        audio_id: 'snd-kein-stress',
      },
      {
        id: 'gz-08',
        german_text: 'Na, alles klar bei dir?',
        arabic_translation: 'هلا! كيف أمورك؟',
        phonetic_ipa: '[naː, ˈaləs klaːɐ̯ baɪ̯ diːɐ̯]',
        cultural_note_ar: 'كلمة Na هي أقصر تحية ألمانية سحرية تجمع بين "كيف حالك" و "مرحباً".',
        context_tag_ar: 'الافتتاحية العفوية',
        badge_label: 'تحية سحرية',
        vibe_tag: 'street',
        audio_id: 'snd-na-alles-klar',
      },
    ],
  },

  {
    id: 'cafe-dating',
    title_ar: 'رف المقاهي والمواعدة واللقاءات',
    title_de: 'Café-Kultur & Dating',
    subtitle_ar: 'عبارات طلب القهوة، كسر الجليد، ودعوات اللقاء الاجتماعية الممتعة',
    icon_emoji: '☕',
    theme_gradient: 'from-amber-700/20 via-yellow-600/10 to-amber-950/20 border-amber-600/30 text-amber-300',
    items: [
      {
        id: 'cd-01',
        german_text: 'Einen Hafer-Cappuccino zum Mitnehmen, bitte!',
        arabic_translation: 'كابتشينو بحليب الشوفان للأخذ سفري، لو سمحت!',
        phonetic_ipa: '[ˈhaːfɐ kapʊˈtʃiːno tsoːm ˈmɪtneːmən]',
        cultural_note_ar: 'حليب الشوفان (Hafermilch) هو الخيار الأكثر شعبية في مقاهي ألمانيا الحديثة.',
        context_tag_ar: 'طلب القهوة العصرية',
        badge_label: 'مقهى برلين',
        vibe_tag: 'cafe',
        audio_id: 'snd-hafer-cappuccino',
      },
      {
        id: 'cd-02',
        german_text: 'Geht das auf mich oder getrennt?',
        arabic_translation: 'هل الحساب عليّ أم كل شخص لوحده؟',
        phonetic_ipa: '[ɡeːt das aʊ̯f mɪç oːdɐ ɡəˈtʁɛnt]',
        cultural_note_ar: 'في ألمانيا، الشائع جداً هو الحساب المنفصل (Getrennt) حتى بين الأصدقاء.',
        context_tag_ar: 'دفع الفاتورة بالمقهى',
        badge_label: 'ثقافة الفاتورة',
        vibe_tag: 'cafe',
        audio_id: 'snd-geht-auf-mich',
      },
      {
        id: 'cd-03',
        german_text: 'Hast du Lust, spazierenzugehen?',
        arabic_translation: 'هل لديك رغبة بنزهة مشي خفيفة؟',
        phonetic_ipa: '[hast duː lʊst, ʃpaˈtsiːʁəntsuːˌɡeːən]',
        cultural_note_ar: 'المشي (Spaziergang) هو الموعد الأول المفضل للكثير من الشباب في ألمانيا.',
        context_tag_ar: 'الدعوة للموعد الأول',
        badge_label: 'لقاء أول',
        vibe_tag: 'cafe',
        audio_id: 'snd-spazieren-gehen',
      },
      {
        id: 'cd-04',
        german_text: 'Wir haben einen super Vibe zusammen!',
        arabic_translation: 'انسجامنا وطاقتنا معاً رائعة جداً!',
        phonetic_ipa: '[viːɐ̯ ˈhaːbn̩ ˈaɪ̯nən ˈzuːpɐ vaɪ̯b]',
        cultural_note_ar: 'تعبير شبابي للتعبير عن التوافق الروحي والفكري الفوري بين شخصين.',
        context_tag_ar: 'التعبير عن الإعجاب',
        badge_label: 'انسجام أرواح',
        vibe_tag: 'cafe',
        audio_id: 'snd-super-vibe',
      },
      {
        id: 'cd-05',
        german_text: 'Ich lade dich heute ein!',
        arabic_translation: 'أنا أعزمك اليوم عليّ!',
        phonetic_ipa: '[ɪç ˈlaːdə dɪç ˈhɔɪ̯tə aɪ̯n]',
        cultural_note_ar: 'عندما تقول Einladen فأنت تتكفل بالفاتورة بالكامل بكرم محبب.',
        context_tag_ar: 'العزيمة والكرم',
        badge_label: 'عزيمة وكرم',
        vibe_tag: 'cafe',
        audio_id: 'snd-ich-lade-dich-ein',
      },
    ],
  },

  {
    id: 'travel-survival',
    title_ar: 'رف المطار والتنقل والنجاة',
    title_de: 'Flughafen, Öffis & Transit',
    subtitle_ar: 'عبارات المحطات، رحلات الطيران، المواصلات العامة وإدارة المفاجآت',
    icon_emoji: '✈️',
    theme_gradient: 'from-cyan-500/20 via-blue-600/10 to-slate-950/20 border-cyan-500/30 text-cyan-400',
    items: [
      {
        id: 'ts-01',
        german_text: 'Von welchem Gleis fährt die S-Bahn ab?',
        arabic_translation: 'من أي رصيف تغادر قطارات الأنابيـب؟',
        phonetic_ipa: '[fɔn ˈvɛlçəm ɡlaɪ̯s fɛːɐ̯t diː ˈɛsˌbaːn ap]',
        cultural_note_ar: 'كلمة Gleis تعني رصيف القطار، و S-Bahn هي قطارات المدينة السريعة.',
        context_tag_ar: 'السؤال بمحطة القطار',
        badge_label: 'مواصلات عامة',
        vibe_tag: 'survival',
        audio_id: 'snd-welchem-gleis',
      },
      {
        id: 'ts-02',
        german_text: 'Ich habe meinen Anschlussflug verpasst!',
        arabic_translation: 'لقد فاتتني رحلة الترانزيت المكملة!',
        phonetic_ipa: '[ɪç ˈhaːbə ˈmaɪ̯nən ˈanʃlʊsˌfluːk fɛɐ̯ˈpast]',
        cultural_note_ar: 'جملة إنقاذ فورية بمكتب الخطوط الجوية بالمطار لطلب تعديل الحجز.',
        context_tag_ar: 'طوارئ المطار والرحلات',
        badge_label: 'طوارئ المطار',
        vibe_tag: 'survival',
        audio_id: 'snd-anschlussflug-verpasst',
      },
      {
        id: 'ts-03',
        german_text: 'Entschuldigung, hat der Zug Verspätung?',
        arabic_translation: 'معذرةً، هل القطار متأخر عن موعده؟',
        phonetic_ipa: '[ɛntˈʃʊldɪɡʊŋ, hat deːɐ̯ tsuːk fɛɐ̯ˈʃpɛːtʊŋ]',
        cultural_note_ar: 'موضوع تأخر القطارات (Verspätung) هو الفكاهة اليومية الوطنية في ألمانيا!',
        context_tag_ar: 'متابعة مواعيد القطار',
        badge_label: 'تأخير قطارات',
        vibe_tag: 'survival',
        audio_id: 'snd-zug-verspaetung',
      },
      {
        id: 'ts-04',
        german_text: 'Ein Tagesticket für die Zone A und B, bitte!',
        arabic_translation: 'تذكرة يومية كاملة للمنطقة A و B، لو سمحت!',
        phonetic_ipa: '[aɪ̯n ˈtaːɡəsˌtɪkət fyːɐ̯ diː ˈtsoːnə aː ʊnt beː]',
        cultural_note_ar: 'أغلب المدن مثل برلين وميونخ تقسم شبكتها لمناطق A و B و C.',
        context_tag_ar: 'شراء تذاكر المواصلات',
        badge_label: 'تذاكر يومية',
        vibe_tag: 'survival',
        audio_id: 'snd-tagesticket-zone',
      },
    ],
  },

  {
    id: 'tech-startups',
    title_ar: 'رف الشركات الناشئة والعمل الذكي',
    title_de: 'Startups, Tech & Arbeitswelt',
    subtitle_ar: 'لغة المكاتب الحديثة، الاجتماعات، الاتصالات والمصطلحات الاحترافية',
    icon_emoji: '💼',
    theme_gradient: 'from-emerald-500/20 via-teal-600/10 to-slate-950/20 border-emerald-500/30 text-emerald-400',
    items: [
      {
        id: 'tk-01',
        german_text: 'Lass uns das kurz doppelt checken!',
        arabic_translation: 'خلينـا نراجع هذا الموضوع سريعاً للتأكد!',
        phonetic_ipa: '[las ʊns das kʊʁts ˈdɔpəlt ˈtʃɛkən]',
        cultural_note_ar: 'المرونة الدقيقة في بيئة العمل الألمانية تعتمد على التحقق المزدوج.',
        context_tag_ar: 'مراجعة المهام المكتبيـة',
        badge_label: 'عمل احترافي',
        vibe_tag: 'tech',
        audio_id: 'snd-doppelt-checken',
      },
      {
        id: 'tk-02',
        german_text: 'Ich bin heute im Homeoffice erreichbar.',
        arabic_translation: 'أنا متاح اليوم عبر العمل من المنزل.',
        phonetic_ipa: '[ɪç bɪn ˈhɔɪ̯tə ɪm ˈhoːmˌʔɔfɪs ɛɐ̯ˈʁaɪ̯çbaːɐ̯]',
        cultural_note_ar: 'كلمة Homeoffice مُعتمدة رسمياً في قانون العمل الألماني لمنظومة التباعد.',
        context_tag_ar: 'إبلاغ الفريق بوضع العمل',
        badge_label: 'عمل عن بعد',
        vibe_tag: 'tech',
        audio_id: 'snd-im-homeoffice',
      },
      {
        id: 'tk-03',
        german_text: 'Schick mir dazu bitte eine Slack-Nachricht!',
        arabic_translation: 'أرسل لي رسالة على سلاك بخصوص هذا، لو سمحت!',
        phonetic_ipa: '[ʃɪk miːɐ̯ daˈtsuː ˈbɪtə ˈaɪ̯nə slɛk ˈnaːxˌʁɪçt]',
        cultural_note_ar: 'التواصل الكتابي الرسمي والموثق مفضل في شركات التكنولوجيا الألمانية.',
        context_tag_ar: 'توجيه المراسلات التجارية',
        badge_label: 'تواصل المكاتب',
        vibe_tag: 'tech',
        audio_id: 'snd-slack-nachricht',
      },
      {
        id: 'tk-04',
        german_text: 'Die Deadline steht fest, wir müssen liefern.',
        arabic_translation: 'الموعد النهائي محدد وثابت، يجب أن ننجز.',
        phonetic_ipa: '[diː ˈdɛdlaɪ̯n ʃteːt fɛst, viːɐ̯ ˈmʏsn̩ ˈliːfɐn]',
        cultural_note_ar: 'الالتزام بـ Pünktlichkeit (الانضباط بالوقت) مقدس في ثقافة الشركات.',
        context_tag_ar: 'التأكيد على تسليم المشروع',
        badge_label: 'انضباط الوقت',
        vibe_tag: 'tech',
        audio_id: 'snd-deadline-steht-fest',
      },
    ],
  },

  {
    id: 'food-nightlife',
    title_ar: 'رف المطاعم والأكلات والحياة الليلية',
    title_de: 'Döner, Kulinarik & Nightlife',
    subtitle_ar: 'طلب الشاورما الألمانية الشهيرة، إكرامية المطاعم وأجواء السهرات',
    icon_emoji: '🥙',
    theme_gradient: 'from-rose-500/20 via-red-600/10 to-slate-950/20 border-rose-500/30 text-rose-400',
    items: [
      {
        id: 'fn-01',
        german_text: 'Einen Döner mit allem, bitte! Scharf und Knoblauch.',
        arabic_translation: 'واحد دونر (دونار) مع كل شيء، حار وصوص ثوم، لو سمحت!',
        phonetic_ipa: '[ˈaɪ̯nən ˈdøːnɐ mɪt ˈaləm, ˈbɪtə! ʃaʁf ʊnt ˈknoːblaʊ̯x]',
        cultural_note_ar: 'الدونر الألماني اختُرِع في برلين وهو الوجبة الشعبية الأولى بلا منازع!',
        context_tag_ar: 'طلب الوجبات السريعة',
        badge_label: 'دونر برلين',
        vibe_tag: 'nightlife',
        audio_id: 'snd-doener-mit-allem',
      },
      {
        id: 'fn-02',
        german_text: 'Stimmt so! Behalten Sie den Rest.',
        arabic_translation: 'خلي الباقي معك! (الباقي إكرامية لك)',
        phonetic_ipa: '[ʃtɪmt zoː! bəˈhaltn̩ ziː deːn ʁɛst]',
        cultural_note_ar: 'الطريقة الألمانية الأرقى لإعطاء البقشيش (Trinkgeld) للنادل.',
        context_tag_ar: 'ترك البقشيش في المطعم',
        badge_label: 'بقشيش المطعم',
        vibe_tag: 'nightlife',
        audio_id: 'snd-stimmt-so',
      },
      {
        id: 'fn-03',
        german_text: 'Guten Appetit! / Mahlzeit!',
        arabic_translation: 'بالهناء والشفاء! / صحة وعافية!',
        phonetic_ipa: '[ˈɡuːtn̩ apəˈtiːt / ˈmaːlˌtsaɪ̯t]',
        cultural_note_ar: 'كلمة Mahlzeit هي تحية فترة الظهيرة وتُقال بين الزملاء عند تناول الغداء.',
        context_tag_ar: 'التحية عند تناول الطعام',
        badge_label: 'تحية الطعام',
        vibe_tag: 'nightlife',
        audio_id: 'snd-guten-appetit',
      },
      {
        id: 'fn-04',
        german_text: 'Prost! Auf uns und die Zukunft!',
        arabic_translation: 'في صحتنا وللمستقبل!',
        phonetic_ipa: '[pʁoːst! aʊ̯f ʊns ʊnt diː ˈtsuːkʊnft]',
        cultural_note_ar: 'عند قول Prost في ألمانيا يجب النظر في عين الشخص الآخر مباشرة احتراماً.',
        context_tag_ar: 'الاحتفال والمناسبات',
        badge_label: 'احتفال وسهرة',
        vibe_tag: 'nightlife',
        audio_id: 'snd-prost-auf-uns',
      },
    ],
  },

  {
    id: 'amt-emergency',
    title_ar: 'رف المعاملات الرسمية والطوارئ',
    title_de: 'Amt-Deutsch & Notfälle',
    subtitle_ar: 'عبارات الدوائر الرسمية، أوراق الإقامة، المستشفيات والشرطة',
    icon_emoji: '🚨',
    theme_gradient: 'from-purple-500/20 via-violet-600/10 to-slate-950/20 border-purple-500/30 text-purple-400',
    items: [
      {
        id: 'ae-01',
        german_text: 'Ich benötige eine Bestätigung der Anmeldung.',
        arabic_translation: 'أحتاج إلى وثيقة تأكيد تسجيل السكن (الأنميلدونغ).',
        phonetic_ipa: '[ɪç bəˈnøːtɪɡə ˈaɪ̯nə bəˈʃtɛːtɪɡʊŋ deːɐ̯ ˈanˌmɛldʊŋ]',
        cultural_note_ar: 'Anmeldung هي الخطوة الرسمية الأولى لكل مقيم جديد في ألمانيا.',
        context_tag_ar: 'معاملات بلدية المدينة',
        badge_label: 'أنميلدونغ رسمي',
        vibe_tag: 'survival',
        audio_id: 'snd-anmeldung-bestaetigung',
      },
      {
        id: 'ae-02',
        german_text: 'Rufen Sie bitte sofort einen Krankenwagen!',
        arabic_translation: 'اتصلوا بسيارة إسعاف فوراً، لو سمحتم!',
        phonetic_ipa: '[ˈʁuːfn̩ ziː ˈbɪtə zoˈfɔʁt ˈaɪ̯nən ˈkʁaŋkn̩ˌvaːɡn̩]',
        cultural_note_ar: 'رقم الطوارئ الطبي في ألمانيا والاتحاد الأوروبي هو 112.',
        context_tag_ar: 'طوارئ طبيـة عاجلة',
        badge_label: 'طوارئ 112',
        vibe_tag: 'survival',
        audio_id: 'snd-krankenwagen-rufen',
      },
      {
        id: 'ae-03',
        german_text: 'Gibt es hier einen freien Terminslot?',
        arabic_translation: 'هل يوجد هنا أي موعد شاغر متوفر؟',
        phonetic_ipa: '[ɡiːpt ɛs hiːɐ̯ ˈaɪ̯nən ˈfʁaɪ̯ən tɛʁˈmiːnˌslɔt]',
        cultural_note_ar: 'نظام المواعيد (Termin) هو العصب الأساسي لكافة المعاملات في ألمانيا.',
        context_tag_ar: 'حجز المواعيد الرسمية',
        badge_label: 'نظام المواعيد',
        vibe_tag: 'survival',
        audio_id: 'snd-freien-termin',
      },
    ],
  },
];

export const GERMAN_GRAMMAR_SPOTS: GrammarSpot[] = [
  {
    id: 'gm-cases',
    title_ar: 'الحالات الإعرابية الأربعة في الألمانية',
    title_de: 'Die vier Kasus im Deutschen',
    summary_ar: 'تتغير أدوات التعريف والتنكير في الألمانية بناءً على موقع الاسم من الإعراب (فاعل، مفعول به، مجرور، أو مضاف إليه).',
    contrastive_arabic_bridge: 'يقابل حالة Nominativ الرفع (الفاعل)، ويقابل Akkusativ النصب (المفعول به المباشر)، ويقابل Dativ الجر (المفعول غير المباشر بأسماء الجر)، ويقابل Genitiv الإضافة.',
    german_formula_de: 'Nominativ (der/die/das) ➔ Akkusativ (den/die/das) ➔ Dativ (dem/der/dem)',
    examples: [
      {
        german_de: 'Der Mann liest ein Buch.',
        arabic_ar: 'الرجلُ يقرأ كتاباً.',
        breakdown_ar: 'Der Mann في حالة الرفع (Nominativ) لأنه فاعل مرفوع.',
      },
      {
        german_de: 'Ich sehe den Mann im Park.',
        arabic_ar: 'أنا أرى الرجلَ في الحديقة.',
        breakdown_ar: 'تحولت der إلى den لأن الرجل مفعول به منصوب (Akkusativ).',
      },
      {
        german_de: 'Ich helfe dem Mann gerne.',
        arabic_ar: 'أنا أساعد الرجلَ بكل سرور.',
        breakdown_ar: 'الفعل helfen يأخذ مفعولاً مجروراً دائماً (Dativ) فتصبح dem Mann.',
      },
    ],
  },

  {
    id: 'gm-plurals',
    title_ar: 'جمع التكسير والسماع في الألمانية',
    title_de: 'Pluralbildung wie جمع التكسير',
    summary_ar: 'لا توجد قاعدة واحدة جازمة لجمع الأسماء بالألمانية، بل تُحفظ صيغة الجمع لكل مفردة كما نحفظ جمع التكسير في العربية.',
    contrastive_arabic_bridge: 'مثلما تجمع كلمة "كتاب" على "كتب" و"رجل" على "رجال"، فإن الكلمة الألمانية قد تجمع بـ -e أو -er أو -en أو إضافة Umlaut.',
    german_formula_de: 'Singular (das Buch) ➔ Plural (die Bücher)',
    examples: [
      {
        german_de: 'das Buch ➔ die Bücher',
        arabic_ar: 'الكتاب ➔ الكتب',
        breakdown_ar: 'إضافة إمالة (Umlaut) مع لاحقة -er.',
      },
      {
        german_de: 'die Frau ➔ die Frauen',
        arabic_ar: 'الامرأة ➔ النساء / السيدات',
        breakdown_ar: 'إضافة لاحقة -en للجمع المؤنث.',
      },
    ],
  },

  {
    id: 'gm-v2-rule',
    title_ar: 'قاعدة الفعل في الموقع الثاني (V2 Position)',
    title_de: 'Verb an zweiter Stelle',
    summary_ar: 'في الجملة الألمانية الرئيسية المباشرة، يجب دائماً أن يوضع الفعل المصرف في الموقع النحوي الثاني بصرامة متناهية.',
    contrastive_arabic_bridge: 'مهما بدأنا الجملة بظرف زمان أو مكان، يظل الفعل في المركز الثاني، ويتقدم الفاعل بعده تلقائياً.',
    german_formula_de: '[Element 1] + [VERB] + [Subject] + [Rest]',
    examples: [
      {
        german_de: 'Heute lerne ich Deutsch.',
        arabic_ar: 'اليومَ أتعلمُ أنا الألمانية.',
        breakdown_ar: 'بدأنا بالظرف Heute وجاء الفعل lerne ثانياً، ثم الفاعل ich ثالثاً.',
      },
    ],
  },
];

export const GERMAN_PHONETIC_SPOTS: PhoneticSpot[] = [
  {
    id: 'ph-oe',
    sound_de: 'ö / Ö',
    ipa: 'øː',
    arabic_equivalent_ar: 'صوت متوسط بين الضمة والكسرة مع استدارة الشفاه',
    guide_ar: 'اضبط شفتيك كما تخرج حرف الواو، وانطق حرف الإي (E) بدون تحريك الشفتين.',
    example_de: 'schön',
    example_ar: 'جميل / رائع',
  },
  {
    id: 'ph-ue',
    sound_de: 'ü / Ü',
    ipa: 'yː',
    arabic_equivalent_ar: 'صوت قريب للكسرة المضمومة جداً',
    guide_ar: 'اضبط شفتيك كصوت الضمة المضمومة، ثم انطق حرف الياء الممدودة.',
    example_de: 'über',
    example_ar: 'فوق / عن',
  },
  {
    id: 'ph-ich-laut',
    sound_de: 'ch (ich-Laut)',
    ipa: 'ç',
    arabic_equivalent_ar: 'حرف قريب للشين المرققة الصافية',
    guide_ar: 'انطق صوت الشين الخفيفة المعذبة بالهواء بين اللسان والحنك الأعلى.',
    example_de: 'ich',
    example_ar: 'أنا',
  },
];
