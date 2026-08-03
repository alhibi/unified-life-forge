import {
  CefrLevel,
  Exercise,
  GrammarPoint,
  Lesson,
  Unit,
  VocabularyItem,
} from '../types';

export const STARTER_LEVELS: CefrLevel[] = [
  {
    "id": "lvl-a0",
    "code": "A0",
    "name_ar": "التمهيدي",
    "sort_order": 1
  },
  {
    "id": "lvl-a1",
    "code": "A1",
    "name_ar": "المبتدئ",
    "sort_order": 2
  },
  {
    "id": "lvl-a2",
    "code": "A2",
    "name_ar": "الأساسي",
    "sort_order": 3
  },
  {
    "id": "lvl-b1",
    "code": "B1",
    "name_ar": "المتوسط",
    "sort_order": 4
  },
  {
    "id": "lvl-b2",
    "code": "B2",
    "name_ar": "المتقدم المتمكن",
    "sort_order": 5
  }
];

export const STARTER_UNITS: Unit[] = [
  {
    "id": "unit-a0-1",
    "level_id": "lvl-a0",
    "title_ar": "أساسيات التواصل",
    "title_de": "Grundlagen der Kommunikation",
    "theme": "greetings",
    "icon": "Hand",
    "sort_order": 1
  },
  {
    "id": "unit-a0-2",
    "level_id": "lvl-a0",
    "title_ar": "الأرقام والأيام",
    "title_de": "Zahlen und Tage",
    "theme": "numbers",
    "icon": "Calendar",
    "sort_order": 2
  },
  {
    "id": "unit-a1-1",
    "level_id": "lvl-a1",
    "title_ar": "التعريف بالنفس",
    "title_de": "Sich vorstellen",
    "theme": "introduction",
    "icon": "User",
    "sort_order": 1
  },
  {
    "id": "unit-a1-2",
    "level_id": "lvl-a1",
    "title_ar": "العائلة والأصدقاء",
    "title_de": "Familie und Freunde",
    "theme": "family",
    "icon": "Users",
    "sort_order": 2
  },
  {
    "id": "unit-a2-1",
    "level_id": "lvl-a2",
    "title_ar": "الحياة اليومية",
    "title_de": "Alltagsleben",
    "theme": "daily",
    "icon": "Clock",
    "sort_order": 1
  },
  {
    "id": "unit-a2-2",
    "level_id": "lvl-a2",
    "title_ar": "السفر والمواصلات",
    "title_de": "Reisen und Verkehr",
    "theme": "travel",
    "icon": "Map",
    "sort_order": 2
  },
  {
    "id": "unit-b1-1",
    "level_id": "lvl-b1",
    "title_ar": "العمل والمهن",
    "title_de": "Arbeit und Berufe",
    "theme": "work",
    "icon": "Briefcase",
    "sort_order": 1
  },
  {
    "id": "unit-b1-2",
    "level_id": "lvl-b1",
    "title_ar": "الصحة والطب",
    "title_de": "Gesundheit und Medizin",
    "theme": "health",
    "icon": "Heart",
    "sort_order": 2
  },
  {
    "id": "unit-b2-1",
    "level_id": "lvl-b2",
    "title_ar": "السياسة والمجتمع",
    "title_de": "Politik und Gesellschaft",
    "theme": "society",
    "icon": "Globe",
    "sort_order": 1
  },
  {
    "id": "unit-b2-2",
    "level_id": "lvl-b2",
    "title_ar": "البيئة والتكنولوجيا",
    "title_de": "Umwelt und Technologie",
    "theme": "environment",
    "icon": "Leaf",
    "sort_order": 2
  }
];

export const STARTER_LESSONS: Lesson[] = [
  {
    "id": "les-a0-1",
    "unit_id": "unit-a0-1",
    "type": "vocab",
    "title_ar": "التحيات اليومية",
    "title_de": "Tägliche Grüße",
    "estimated_minutes": 5,
    "sort_order": 1
  },
  {
    "id": "les-a0-2",
    "unit_id": "unit-a0-1",
    "type": "grammar",
    "title_ar": "قواعد السؤال عن الحال",
    "title_de": "Wie geht es dir?",
    "estimated_minutes": 6,
    "sort_order": 2
  },
  {
    "id": "les-a0-3",
    "unit_id": "unit-a0-2",
    "type": "vocab",
    "title_ar": "الأرقام من 0 إلى 10",
    "title_de": "Zahlen von 0 bis 10",
    "estimated_minutes": 4,
    "sort_order": 1
  },
  {
    "id": "les-a1-1",
    "unit_id": "unit-a1-1",
    "type": "vocab",
    "title_ar": "الاسم والجنسية واللغة",
    "title_de": "Name, Land und Sprache",
    "estimated_minutes": 7,
    "sort_order": 1
  },
  {
    "id": "les-a1-2",
    "unit_id": "unit-a1-1",
    "type": "grammar",
    "title_ar": "ضمائر الفاعل وتصريف الفعل sein",
    "title_de": "Personalpronomen und Verb sein",
    "estimated_minutes": 8,
    "sort_order": 2
  },
  {
    "id": "les-a1-3",
    "unit_id": "unit-a1-2",
    "type": "vocab",
    "title_ar": "أفراد العائلة",
    "title_de": "Familienmitglieder",
    "estimated_minutes": 6,
    "sort_order": 1
  },
  {
    "id": "les-a1-4",
    "unit_id": "unit-a1-2",
    "type": "grammar",
    "title_ar": "أدوات الملكية (mein/dein)",
    "title_de": "Possessivartikel",
    "estimated_minutes": 7,
    "sort_order": 2
  },
  {
    "id": "les-a2-1",
    "unit_id": "unit-a2-1",
    "type": "vocab",
    "title_ar": "الروتين اليومي",
    "title_de": "Tagesablauf",
    "estimated_minutes": 8,
    "sort_order": 1
  },
  {
    "id": "les-a2-2",
    "unit_id": "unit-a2-1",
    "type": "grammar",
    "title_ar": "الأفعال المنفصلة",
    "title_de": "Trennbare Verben",
    "estimated_minutes": 10,
    "sort_order": 2
  },
  {
    "id": "les-a2-3",
    "unit_id": "unit-a2-2",
    "type": "vocab",
    "title_ar": "في محطة القطار",
    "title_de": "Am Bahnhof",
    "estimated_minutes": 7,
    "sort_order": 1
  },
  {
    "id": "les-a2-4",
    "unit_id": "unit-a2-2",
    "type": "grammar",
    "title_ar": "حروف الجر المكانية",
    "title_de": "Lokale Präpositionen",
    "estimated_minutes": 10,
    "sort_order": 2
  },
  {
    "id": "les-b1-1",
    "unit_id": "unit-b1-1",
    "type": "vocab",
    "title_ar": "المكتب والمهام",
    "title_de": "Büro und Aufgaben",
    "estimated_minutes": 10,
    "sort_order": 1
  },
  {
    "id": "les-b1-2",
    "unit_id": "unit-b1-1",
    "type": "grammar",
    "title_ar": "الماضي التام (Perfekt)",
    "title_de": "Das Perfekt",
    "estimated_minutes": 15,
    "sort_order": 2
  },
  {
    "id": "les-b1-3",
    "unit_id": "unit-b1-2",
    "type": "vocab",
    "title_ar": "عند الطبيب",
    "title_de": "Beim Arzt",
    "estimated_minutes": 12,
    "sort_order": 1
  },
  {
    "id": "les-b1-4",
    "unit_id": "unit-b1-2",
    "type": "grammar",
    "title_ar": "الجمل الجانبية (dass, weil)",
    "title_de": "Nebensätze",
    "estimated_minutes": 12,
    "sort_order": 2
  },
  {
    "id": "les-b2-1",
    "unit_id": "unit-b2-1",
    "type": "vocab",
    "title_ar": "الانتخابات والديمقراطية",
    "title_de": "Wahlen und Demokratie",
    "estimated_minutes": 15,
    "sort_order": 1
  },
  {
    "id": "les-b2-2",
    "unit_id": "unit-b2-1",
    "type": "grammar",
    "title_ar": "المبني للمجهول (Passiv)",
    "title_de": "Das Passiv",
    "estimated_minutes": 20,
    "sort_order": 2
  },
  {
    "id": "les-b2-3",
    "unit_id": "unit-b2-2",
    "type": "vocab",
    "title_ar": "الطاقة المتجددة",
    "title_de": "Erneuerbare Energien",
    "estimated_minutes": 15,
    "sort_order": 1
  },
  {
    "id": "les-b2-4",
    "unit_id": "unit-b2-2",
    "type": "grammar",
    "title_ar": "الروابط المزدوجة (entweder...oder)",
    "title_de": "Doppelkonjunktionen",
    "estimated_minutes": 15,
    "sort_order": 2
  }
];

export const STARTER_GRAMMAR_POINTS: GrammarPoint[] = [
  {
    "id": "gp-a0-1",
    "lesson_id": "les-a0-2",
    "name": "السؤال عن الحال وصيغة الاحترام",
    "explanation_ar": "في الألمانية نسأل عن الحال بـ 'Wie geht es dir?' للأصدقاء، أو بـ 'Wie geht es Ihnen?' للاحترام والأسلوب الرسمي.",
    "contrastive_note_ar": "المقارنة مع العربية: في العربية نقوم بزيادة ضمير المخاطب للاحترام كقولنا 'كيف حال حضرتكم؟'. نفس المبدأ تماماً في الألمانية حيث يتم تحويل الضمير dir (لك) إلى الضمير المجرور Ihnen (لحضرتكم) مع كتابته بحرف كبير دائماً للإشارة للاحترام الرسمي."
  },
  {
    "id": "gp-a1-1",
    "lesson_id": "les-a1-2",
    "name": "تصريف الفعل المساعد (sein - يكون)",
    "explanation_ar": "الفعل sein هو الفعل الأهم في الألمانية (يقابل am/is/are في الإنجليزية). تصريفه شاذ: Ich bin (أنا أكون), Du bist (أنت تكون), Er/Sie/Es ist (هو/هي يكون).",
    "contrastive_note_ar": "المقارنة مع العربية: الجملة الاسمية في العربية لا تحتاج فعلاً مساعداً في الزمن المضارع (مثلاً: 'أنا أحمد')، لكن في الألمانية لا توجد جملة بدون فعل، لذا نستخدم فعل 'يكون' المساعد وجوباً."
  },
  {
    "id": "gp-a1-2",
    "lesson_id": "les-a1-4",
    "name": "أدوات الملكية (Mein / Dein)",
    "explanation_ar": "نستخدم mein (للمتكلم) و dein (للمخاطب) للدلالة على الملكية. وتتغير نهاية الأداة بحسب جنس الكلمة التي تليها (مثلاً: mein Vater, meine Mutter).",
    "contrastive_note_ar": "المقارنة مع العربية: في العربية نستخدم الضمائر المتصلة (كتابي، كتابك). في الألمانية، نستخدم كلمات منفصلة تسبق الاسم، وتتأثر كلياً بجنس الاسم المملوك (مذكر، مؤنث، محايد)."
  },
  {
    "id": "gp-a2-1",
    "lesson_id": "les-a2-2",
    "name": "الأفعال المنفصلة (Trennbare Verben)",
    "explanation_ar": "بعض الأفعال في الألمانية تتكون من مقطعين (مثل aufstehen = يستيقظ). عند التصريف، ينفصل المقطع الأول ويذهب إلى آخر الجملة.",
    "contrastive_note_ar": "هذا المفهوم غير موجود في العربية نهائياً. الأقرب له في العربية هي الأفعال المتعدية بحرف جر (قام بـ)، لكن في الألمانية الحرف ينفصل ويقف وحيداً في آخر الجملة (Ich stehe um 7 Uhr auf)."
  },
  {
    "id": "gp-a2-2",
    "lesson_id": "les-a2-4",
    "name": "حروف الجر المكانية",
    "explanation_ar": "حروف الجر المكانية تتطلب حالة الجر (Dativ) إذا كانت تدل على الثبات، وحالة النصب (Akkusativ) إذا كانت تدل على الحركة.",
    "contrastive_note_ar": "في العربية، حروف الجر (في، على، إلى) تجر الاسم دائماً. أما الألمانية فهي دقيقة جداً: إذا قلت (أنا في المدرسة - ثبات) تستخدم Dativ، وإذا قلت (أنا أذهب إلى المدرسة - حركة) تستخدم Akkusativ."
  },
  {
    "id": "gp-b1-1",
    "lesson_id": "les-b1-2",
    "name": "الماضي التام (Das Perfekt)",
    "explanation_ar": "يُستخدم بكثرة في المحادثة اليومية للتعبير عن الماضي. يتكون من فعل مساعد (haben أو sein) + التصريف الثالث للفعل (Partizip II).",
    "contrastive_note_ar": "في العربية يوجد فعل ماضٍ بسيط (أكلتُ). في الألمانية الحديثة يفضلون استخدام المركب (لقد قمتُ بالأكل) كصيغة أساسية للماضي في الكلام الشفهي."
  },
  {
    "id": "gp-b1-2",
    "lesson_id": "les-b1-4",
    "name": "الجمل الجانبية (Nebensätze)",
    "explanation_ar": "الجملة الجانبية تبدأ برابط (مثل weil = لأن، dass = أن) وتتميز بأن الفعل المصرف يذهب إلى نهاية الجملة تماماً.",
    "contrastive_note_ar": "في العربية الفعل يأتي في البداية غالباً (لأنني ذهبتُ إلى السوق). في الألمانية الترتيب ينعكس: (لأنني إلى السوق ذهبتُ)."
  },
  {
    "id": "gp-b2-1",
    "lesson_id": "les-b2-2",
    "name": "المبني للمجهول (Passiv)",
    "explanation_ar": "يتكون من الفعل المساعد werden والتصريف الثالث للفعل. يركز على الفعل نفسه وليس الفاعل.",
    "contrastive_note_ar": "العربية تستخدم تغييراً في التشكيل (كُتِبَ الدرس). الألمانية تستخدم تركيبة فعلية معقدة (الدرس أصبح مكتوباً)."
  }
];

export const STARTER_VOCABULARY: VocabularyItem[] = [
  {
    id: 'v-hallo',
    lemma_de: 'Hallo',
    gender: null,
    plural_form: null,
    ipa: 'ˈhaloː',
    audio_url: null,
    image_url: null,
    translation_ar: 'مرحباً',
    example_sentence_de: 'Hallo! Wie geht es dir?',
    example_sentence_ar: 'مرحباً! كيف حالك؟',
    frequency_rank: 1,
    level_id: 'lvl-a0',
    status: 'published',
  },
  {
    id: 'v-danke',
    lemma_de: 'Danke',
    gender: null,
    plural_form: null,
    ipa: 'ˈdaŋkə',
    audio_url: null,
    image_url: null,
    translation_ar: 'شكراً',
    example_sentence_de: 'Danke für deine Hilfe.',
    example_sentence_ar: 'شكراً لك على مساعدتك.',
    frequency_rank: 1,
    level_id: 'lvl-a0',
    status: 'published',
  },
  {
    id: 'v-bitte',
    lemma_de: 'Bitte',
    gender: null,
    plural_form: null,
    ipa: 'ˈbɪtə',
    audio_url: null,
    image_url: null,
    translation_ar: 'من فضلك / العفو',
    example_sentence_de: 'Ein Wasser, bitte.',
    example_sentence_ar: 'كوب ماء، من فضلك.',
    frequency_rank: 1,
    level_id: 'lvl-a0',
    status: 'published',
  },
  {
    id: 'v-eins',
    lemma_de: 'eins',
    gender: null,
    plural_form: null,
    ipa: 'aɪ̯ns',
    audio_url: null,
    image_url: null,
    translation_ar: 'واحد (1)',
    example_sentence_de: 'Nummer eins.',
    example_sentence_ar: 'رقم واحد.',
    frequency_rank: 1,
    level_id: 'lvl-a0',
    status: 'published',
  },
  {
    id: 'v-zwei',
    lemma_de: 'zwei',
    gender: null,
    plural_form: null,
    ipa: 't͡svaɪ̯',
    audio_url: null,
    image_url: null,
    translation_ar: 'اثنان (2)',
    example_sentence_de: 'Ich habe zwei Katzen.',
    example_sentence_ar: 'لدي قطتان.',
    frequency_rank: 1,
    level_id: 'lvl-a0',
    status: 'published',
  },
  {
    id: 'v-ich',
    lemma_de: 'ich',
    gender: null,
    plural_form: null,
    ipa: 'ɪç',
    audio_url: null,
    image_url: null,
    translation_ar: 'أنا',
    example_sentence_de: 'Ich lerne Deutsch.',
    example_sentence_ar: 'أنا أتعلم الألمانية.',
    frequency_rank: 1,
    level_id: 'lvl-a1',
    status: 'published',
  },
  {
    id: 'v-name',
    lemma_de: 'Name',
    gender: "der",
    plural_form: "Namen",
    ipa: 'ˈnaːmə',
    audio_url: null,
    image_url: null,
    translation_ar: 'اسم',
    example_sentence_de: 'Mein Name ist Ahmad.',
    example_sentence_ar: 'اسمي أحمد.',
    frequency_rank: 1,
    level_id: 'lvl-a1',
    status: 'published',
  },
  {
    id: 'v-vater',
    lemma_de: 'Vater',
    gender: "der",
    plural_form: "Väter",
    ipa: 'ˈfaːtɐ',
    audio_url: null,
    image_url: null,
    translation_ar: 'أب',
    example_sentence_de: 'Mein Vater ist Lehrer.',
    example_sentence_ar: 'أبي معلم.',
    frequency_rank: 1,
    level_id: 'lvl-a1',
    status: 'published',
  },
  {
    id: 'v-mutter',
    lemma_de: 'Mutter',
    gender: "die",
    plural_form: "Mütter",
    ipa: 'ˈmʊtɐ',
    audio_url: null,
    image_url: null,
    translation_ar: 'أم',
    example_sentence_de: 'Meine Mutter kocht gut.',
    example_sentence_ar: 'أمي تطبخ جيداً.',
    frequency_rank: 1,
    level_id: 'lvl-a1',
    status: 'published',
  },
  {
    id: 'v-kind',
    lemma_de: 'Kind',
    gender: "das",
    plural_form: "Kinder",
    ipa: 'kɪnt',
    audio_url: null,
    image_url: null,
    translation_ar: 'طفل',
    example_sentence_de: 'Das Kind spielt.',
    example_sentence_ar: 'الطفل يلعب.',
    frequency_rank: 1,
    level_id: 'lvl-a1',
    status: 'published',
  },
  {
    id: 'v-aufstehen',
    lemma_de: 'aufstehen',
    gender: null,
    plural_form: null,
    ipa: 'ˈaʊ̯fˌʃteːən',
    audio_url: null,
    image_url: null,
    translation_ar: 'يستيقظ',
    example_sentence_de: 'Ich stehe um 7 Uhr auf.',
    example_sentence_ar: 'أنا أستيقظ في السابعة.',
    frequency_rank: 1,
    level_id: 'lvl-a2',
    status: 'published',
  },
  {
    id: 'v-bahnhof',
    lemma_de: 'Bahnhof',
    gender: "der",
    plural_form: "Bahnhöfe",
    ipa: 'ˈbaːnˌhoːf',
    audio_url: null,
    image_url: null,
    translation_ar: 'محطة قطار',
    example_sentence_de: 'Der Zug fährt vom Bahnhof ab.',
    example_sentence_ar: 'القطار يغادر من المحطة.',
    frequency_rank: 1,
    level_id: 'lvl-a2',
    status: 'published',
  },
  {
    id: 'v-reise',
    lemma_de: 'Reise',
    gender: "die",
    plural_form: "Reisen",
    ipa: 'ˈʁaɪ̯zə',
    audio_url: null,
    image_url: null,
    translation_ar: 'رحلة',
    example_sentence_de: 'Gute Reise!',
    example_sentence_ar: 'رحلة سعيدة!',
    frequency_rank: 1,
    level_id: 'lvl-a2',
    status: 'published',
  },
  {
    id: 'v-auto',
    lemma_de: 'Auto',
    gender: "das",
    plural_form: "Autos",
    ipa: 'ˈaʊ̯to',
    audio_url: null,
    image_url: null,
    translation_ar: 'سيارة',
    example_sentence_de: 'Das Auto ist schnell.',
    example_sentence_ar: 'السيارة سريعة.',
    frequency_rank: 1,
    level_id: 'lvl-a2',
    status: 'published',
  },
  {
    id: 'v-arbeiten',
    lemma_de: 'arbeiten',
    gender: null,
    plural_form: null,
    ipa: 'ˈaʁbaɪ̯tn̩',
    audio_url: null,
    image_url: null,
    translation_ar: 'يعمل',
    example_sentence_de: 'Er arbeitet im Büro.',
    example_sentence_ar: 'هو يعمل في المكتب.',
    frequency_rank: 1,
    level_id: 'lvl-a2',
    status: 'published',
  },
  {
    id: 'v-erfolg',
    lemma_de: 'Erfolg',
    gender: "der",
    plural_form: "Erfolge",
    ipa: 'ɛɐ̯ˈfɔlk',
    audio_url: null,
    image_url: null,
    translation_ar: 'نجاح',
    example_sentence_de: 'Er hat viel Erfolg im Beruf.',
    example_sentence_ar: 'لديه الكثير من النجاح في المهنة.',
    frequency_rank: 1,
    level_id: 'lvl-b1',
    status: 'published',
  },
  {
    id: 'v-krankheit',
    lemma_de: 'Krankheit',
    gender: "die",
    plural_form: "Krankheiten",
    ipa: 'ˈkʁaŋkhaɪ̯t',
    audio_url: null,
    image_url: null,
    translation_ar: 'مرض',
    example_sentence_de: 'Die Krankheit ist heilbar.',
    example_sentence_ar: 'المرض قابل للشفاء.',
    frequency_rank: 1,
    level_id: 'lvl-b1',
    status: 'published',
  },
  {
    id: 'v-medikament',
    lemma_de: 'Medikament',
    gender: "das",
    plural_form: "Medikamente",
    ipa: 'medikaˈmɛnt',
    audio_url: null,
    image_url: null,
    translation_ar: 'دواء',
    example_sentence_de: 'Der Arzt verschreibt ein Medikament.',
    example_sentence_ar: 'الطبيب يصف دواءً.',
    frequency_rank: 1,
    level_id: 'lvl-b1',
    status: 'published',
  },
  {
    id: 'v-verstehen',
    lemma_de: 'verstehen',
    gender: null,
    plural_form: null,
    ipa: 'fɛɐ̯ˈʃteːən',
    audio_url: null,
    image_url: null,
    translation_ar: 'يفهم',
    example_sentence_de: 'Ich verstehe das Problem nicht.',
    example_sentence_ar: 'أنا لا أفهم المشكلة.',
    frequency_rank: 1,
    level_id: 'lvl-b1',
    status: 'published',
  },
  {
    id: 'v-entscheidung',
    lemma_de: 'Entscheidung',
    gender: "die",
    plural_form: "Entscheidungen",
    ipa: 'ɛntˈʃaɪ̯dʊŋ',
    audio_url: null,
    image_url: null,
    translation_ar: 'قرار',
    example_sentence_de: 'Das war eine gute Entscheidung.',
    example_sentence_ar: 'كان ذلك قراراً جيداً.',
    frequency_rank: 1,
    level_id: 'lvl-b1',
    status: 'published',
  },
  {
    id: 'v-gesellschaft',
    lemma_de: 'Gesellschaft',
    gender: "die",
    plural_form: "Gesellschaften",
    ipa: 'ɡəˈzɛlʃaft',
    audio_url: null,
    image_url: null,
    translation_ar: 'مجتمع',
    example_sentence_de: 'Die Gesellschaft wandelt sich.',
    example_sentence_ar: 'المجتمع يتغير.',
    frequency_rank: 1,
    level_id: 'lvl-b2',
    status: 'published',
  },
  {
    id: 'v-umwelt',
    lemma_de: 'Umwelt',
    gender: "die",
    plural_form: null,
    ipa: 'ˈʊmvɛlt',
    audio_url: null,
    image_url: null,
    translation_ar: 'البيئة',
    example_sentence_de: 'Wir müssen die Umwelt schützen.',
    example_sentence_ar: 'يجب علينا حماية البيئة.',
    frequency_rank: 1,
    level_id: 'lvl-b2',
    status: 'published',
  },
  {
    id: 'v-forschung',
    lemma_de: 'Forschung',
    gender: "die",
    plural_form: "Forschungen",
    ipa: 'ˈfɔʁʃʊŋ',
    audio_url: null,
    image_url: null,
    translation_ar: 'بحث علمي',
    example_sentence_de: 'Die Forschung macht Fortschritte.',
    example_sentence_ar: 'البحث العلمي يحرز تقدماً.',
    frequency_rank: 1,
    level_id: 'lvl-b2',
    status: 'published',
  },
  {
    id: 'v-entwickeln',
    lemma_de: 'entwickeln',
    gender: null,
    plural_form: null,
    ipa: 'ɛntˈvɪkəln',
    audio_url: null,
    image_url: null,
    translation_ar: 'يطور',
    example_sentence_de: 'Die Firma entwickelt neue Technologien.',
    example_sentence_ar: 'الشركة تطور تكنولوجيات جديدة.',
    frequency_rank: 1,
    level_id: 'lvl-b2',
    status: 'published',
  },
  {
    id: 'v-verantwortung',
    lemma_de: 'Verantwortung',
    gender: "die",
    plural_form: "Verantwortungen",
    ipa: 'fɛɐ̯ˈʔantvɔʁtʊŋ',
    audio_url: null,
    image_url: null,
    translation_ar: 'مسؤولية',
    example_sentence_de: 'Jeder trägt Verantwortung für die Zukunft.',
    example_sentence_ar: 'الجميع يتحملون المسؤولية عن المستقبل.',
    frequency_rank: 1,
    level_id: 'lvl-b2',
    status: 'published',
  },
];

const RAW_STARTER_EXERCISES: Omit<Exercise, 'status'>[] = [
  {
    "id": "ex-a0-1",
    "lesson_id": "les-a0-1",
    "type": "mcq" as any,
    "difficulty": 1,
    "payload": {
      "prompt_de": "Wie sagt man 'مرحباً' auf Deutsch?",
      "options": [
        {
          "id": "a",
          "text": "Hallo",
          "is_correct": true
        },
        {
          "id": "b",
          "text": "Danke",
          "is_correct": false
        },
        {
          "id": "c",
          "text": "Tschüss",
          "is_correct": false
        },
        {
          "id": "d",
          "text": "Bitte",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-a0-2",
    "lesson_id": "les-a0-1",
    "type": "type_answer" as any,
    "difficulty": 1,
    "payload": {
      "direction": "ar_to_de",
      "prompt": "اكتب الكلمة الألمانية التي تعني: شكراً",
      "accepted_answers": [
        "danke",
        "Danke"
      ],
      "hint": "تبدأ بحرف D"
    }
  },
  {
    "id": "ex-a0-3",
    "lesson_id": "les-a0-2",
    "type": "mcq" as any,
    "difficulty": 2,
    "payload": {
      "prompt_de": "Wie fragt man höflich (formal): 'كيف حال حضرتك؟'?",
      "options": [
        {
          "id": "a",
          "text": "Wie geht es dir?",
          "is_correct": false
        },
        {
          "id": "b",
          "text": "Wie geht es Ihnen?",
          "is_correct": true
        },
        {
          "id": "c",
          "text": "Wer bist du?",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-a0-4",
    "lesson_id": "les-a0-1",
    "type": "matching_pairs" as any,
    "difficulty": 1,
    "payload": {
      "pairs": [
        {
          "left": "Hallo",
          "right": "مرحباً"
        },
        {
          "left": "Danke",
          "right": "شكراً"
        },
        {
          "left": "Bitte",
          "right": "من فضلك"
        }
      ]
    }
  },
  {
    "id": "ex-a1-1",
    "lesson_id": "les-a1-1",
    "type": "mcq" as any,
    "difficulty": 1,
    "payload": {
      "prompt_de": "Was bedeutet 'ich' auf Arabisch?",
      "options": [
        {
          "id": "a",
          "text": "أنا",
          "is_correct": true
        },
        {
          "id": "b",
          "text": "هو",
          "is_correct": false
        },
        {
          "id": "c",
          "text": "نحن",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-a1-2",
    "lesson_id": "les-a1-2",
    "type": "fill_blank_grammar" as any,
    "difficulty": 2,
    "payload": {
      "sentence_template": "Ich ___ aus Syrien.",
      "correct_answer": "komme",
      "options": [
        "komme",
        "kommst",
        "kommt"
      ]
    }
  },
  {
    "id": "ex-a1-3",
    "lesson_id": "les-a1-2",
    "type": "mcq" as any,
    "difficulty": 2,
    "payload": {
      "prompt_de": "Wähle das richtige Verb: 'Ich ___ Ahmad.'",
      "options": [
        {
          "id": "a",
          "text": "bin",
          "is_correct": true
        },
        {
          "id": "b",
          "text": "bist",
          "is_correct": false
        },
        {
          "id": "c",
          "text": "ist",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-a1-4",
    "lesson_id": "les-a1-3",
    "type": "matching_pairs" as any,
    "difficulty": 1,
    "payload": {
      "pairs": [
        {
          "left": "der Vater",
          "right": "الأب"
        },
        {
          "left": "die Mutter",
          "right": "الأم"
        },
        {
          "left": "das Kind",
          "right": "الطفل"
        }
      ]
    }
  },
  {
    "id": "ex-a1-5",
    "lesson_id": "les-a1-4",
    "type": "mcq" as any,
    "difficulty": 2,
    "payload": {
      "prompt_de": "Das ist ___ Vater. (أبي)",
      "options": [
        {
          "id": "a",
          "text": "mein",
          "is_correct": true
        },
        {
          "id": "b",
          "text": "meine",
          "is_correct": false
        },
        {
          "id": "c",
          "text": "dein",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-a2-1",
    "lesson_id": "les-a2-1",
    "type": "matching_pairs" as any,
    "difficulty": 2,
    "payload": {
      "pairs": [
        {
          "left": "aufstehen",
          "right": "يستيقظ"
        },
        {
          "left": "arbeiten",
          "right": "يعمل"
        },
        {
          "left": "Bahnhof",
          "right": "محطة قطار"
        }
      ]
    }
  },
  {
    "id": "ex-a2-2",
    "lesson_id": "les-a2-2",
    "type": "sentence_build" as any,
    "difficulty": 3,
    "payload": {
      "correct_sentence": "Ich stehe um 7 Uhr auf",
      "shuffled_tokens": [
        "auf",
        "7 Uhr",
        "stehe",
        "um",
        "Ich"
      ]
    }
  },
  {
    "id": "ex-a2-3",
    "lesson_id": "les-a2-4",
    "type": "mcq" as any,
    "difficulty": 2,
    "payload": {
      "prompt_de": "Ich gehe ___ die Schule. (Akkusativ - حركة)",
      "options": [
        {
          "id": "a",
          "text": "in",
          "is_correct": true
        },
        {
          "id": "b",
          "text": "auf",
          "is_correct": false
        },
        {
          "id": "c",
          "text": "an",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-b1-1",
    "lesson_id": "les-b1-1",
    "type": "matching_pairs" as any,
    "difficulty": 3,
    "payload": {
      "pairs": [
        {
          "left": "Erfolg",
          "right": "نجاح"
        },
        {
          "left": "Entscheidung",
          "right": "قرار"
        },
        {
          "left": "Krankheit",
          "right": "مرض"
        }
      ]
    }
  },
  {
    "id": "ex-b1-2",
    "lesson_id": "les-b1-2",
    "type": "sentence_build" as any,
    "difficulty": 3,
    "payload": {
      "correct_sentence": "Ich habe einen Apfel gegessen",
      "shuffled_tokens": [
        "Apfel",
        "habe",
        "gegessen",
        "Ich",
        "einen"
      ]
    }
  },
  {
    "id": "ex-b1-3",
    "lesson_id": "les-b1-4",
    "type": "sentence_build" as any,
    "difficulty": 4,
    "payload": {
      "correct_sentence": "Ich lerne Deutsch, weil ich in Deutschland lebe",
      "shuffled_tokens": [
        "weil",
        "lebe",
        "ich",
        "in Deutschland",
        "Ich lerne Deutsch,"
      ]
    }
  },
  {
    "id": "ex-b2-1",
    "lesson_id": "les-b2-1",
    "type": "matching_pairs" as any,
    "difficulty": 4,
    "payload": {
      "pairs": [
        {
          "left": "Gesellschaft",
          "right": "مجتمع"
        },
        {
          "left": "Umwelt",
          "right": "البيئة"
        },
        {
          "left": "Verantwortung",
          "right": "مسؤولية"
        },
        {
          "left": "Forschung",
          "right": "بحث علمي"
        }
      ]
    }
  },
  {
    "id": "ex-b2-2",
    "lesson_id": "les-b2-2",
    "type": "mcq" as any,
    "difficulty": 4,
    "payload": {
      "prompt_de": "Wähle das richtige Passiv: Das Auto ___ repariert.",
      "options": [
        {
          "id": "a",
          "text": "wird",
          "is_correct": true
        },
        {
          "id": "b",
          "text": "werden",
          "is_correct": false
        },
        {
          "id": "c",
          "text": "ist",
          "is_correct": false
        }
      ]
    }
  },
  {
    "id": "ex-b2-3",
    "lesson_id": "les-b2-4",
    "type": "type_answer" as any,
    "difficulty": 4,
    "payload": {
      "direction": "de_to_ar",
      "prompt": "Entweder gehst du, oder ich gehe.",
      "accepted_answers": [
        "إما أن تذهب أنت، أو أذهب أنا.",
        "إما أن تذهب، أو أذهب أنا."
      ],
      "hint": "Entweder...oder يعني إما...أو"
    }
  }
];

export const STARTER_EXERCISES: Exercise[] = RAW_STARTER_EXERCISES.map((exercise) => ({
  ...exercise,
  status: 'published',
}));
