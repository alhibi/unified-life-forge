import { DictionaryEntry } from '../types';

export const DICTIONARY_CATEGORIES = [
  { id: 'all', label_ar: 'الكل (Alle)', icon: 'Sparkles' },
  { id: 'basics', label_ar: 'الأساسيات والمحادثة (Grundlagen)', icon: 'MessageCircle' },
  { id: 'work', label_ar: 'العمل والمكتب (Arbeit & Beruf)', icon: 'Briefcase' },
  { id: 'housing', label_ar: 'السكن والبلدية (Wohnen & Amt)', icon: 'Home' },
  { id: 'health', label_ar: 'الصحة والطب (Gesundheit & Medizin)', icon: 'Activity' },
  { id: 'tech', label_ar: 'التقنية والرقمنة (Technik & IT)', icon: 'Cpu' },
  { id: 'law', label_ar: 'القانون والمعاملات (Recht & Behörden)', icon: 'Scale' },
  { id: 'culture', label_ar: 'الثقافة والمجتمع (Kultur & Gesellschaft)', icon: 'Landmark' },
  { id: 'emotions', label_ar: 'المشاعر وعلم النفس (Gefühle & Psychologie)', icon: 'Heart' },
  { id: 'nature', label_ar: 'البيئة والعلوم (Umwelt & Wissenschaft)', icon: 'Globe' },
] as const;

export const GERMAN_DICTIONARY_DATA: DictionaryEntry[] = [
  // --- A1 LEVEL BASICS ---
  {
    id: 'dict-a1-001',
    german: 'Anmeldung',
    arabic: 'تسجيل السكن / التسجيل الرسمي لدى دائرة السكان',
    word_type: 'noun',
    cefr: 'A1',
    gender: 'die',
    ipa: '/ˈanmɛldʊŋ/',
    category: 'housing',
    noun_forms: {
      plural_form: 'die Anmeldungen',
      genitive_singular: 'der Anmeldung',
    },
    examples: [
      {
        de: 'Ich brauche eine Bestätigung für die Anmeldung beim Bürgeramt.',
        ar: 'أحتاج إلى تأكيد لتسجيل السكن لدى مكتب المواطنين.',
        context: 'الإجراءات الإدارية في ألمانيا',
      },
    ],
    cultural_note_ar: 'التسجيل (Anmeldung) هو الخطوة الإدارية الأولى والأساسية لكل من ينتقل للعيش في ألمانيا خلال 14 يوماً من الانتقال.',
    grammatical_note_ar: 'كل الأسماء المنتهية بـ -ung هي مؤنثة دائماً وتاخذ أداة التعريف die.',
    tags: ['bürgeramt', 'wohnung', 'bürokratie', 'a1'],
  },
  {
    id: 'dict-a1-002',
    german: 'ankommen',
    arabic: 'يصل / يحلّ بمكان',
    word_type: 'verb',
    cefr: 'A1',
    is_separable: true,
    separable_prefix: 'an',
    category: 'basics',
    verb_forms: {
      present_3sg: 'kommt an',
      past_simple: 'kam an',
      perfect: 'ist angekommen',
      auxiliary: 'sein',
    },
    preposition_case: 'dative',
    preposition_governed: 'an (+ Dat)',
    examples: [
      {
        de: 'Der Zug kommt pünktlich um 18 Uhr am Hauptbahnhof an.',
        ar: 'يصل القطار في الموعد المحدّد تمام السادسة مساءً في المحطة المركزية.',
      },
    ],
    synonyms: ['eintreffen', 'erreichen'],
    tags: ['zug', 'reise', 'verb'],
  },
  {
    id: 'dict-a1-003',
    german: 'Kaffee',
    arabic: 'قهوة',
    word_type: 'noun',
    cefr: 'A1',
    gender: 'der',
    ipa: '/ˈkafe/',
    category: 'basics',
    noun_forms: {
      plural_form: 'die Kaffees',
      genitive_singular: 'des Kaffees',
    },
    examples: [
      {
        de: 'Möchtest du einen Kaffee mit Milch und Zucker?',
        ar: 'هل ترغب في فنجان قهوة مع حليب وسكر؟',
      },
    ],
    tags: ['getränk', 'essen'],
  },
  {
    id: 'dict-a1-004',
    german: 'Bahnhof',
    arabic: 'محطة القطار',
    word_type: 'noun',
    cefr: 'A1',
    gender: 'der',
    ipa: '/ˈbaːnhoːf/',
    category: 'basics',
    noun_forms: {
      plural_form: 'die Bahnhöfe',
      genitive_singular: 'des Bahnhofs',
    },
    examples: [
      {
        de: 'Wo ist der nächste Bahnhof?',
        ar: 'أين تقع أقرب محطة قطار؟',
      },
    ],
    tags: ['verkehr', 'reise'],
  },
  {
    id: 'dict-a1-005',
    german: 'freundlich',
    arabic: 'ودود / لطيف والمعاملة حسنة',
    word_type: 'adjective',
    cefr: 'A1',
    ipa: '/ˈfʁɔɪ̯ntLɪç/',
    category: 'emotions',
    antonyms: ['unfreundlich', 'mürrisch'],
    synonyms: ['nett', 'liebenswürdig'],
    examples: [
      {
        de: 'Die Mitarbeiterin im Amt war sehr freundlich und hilfsbereit.',
        ar: 'كانت الموظفة في الدائرة ودودة جداً ومساعدة.',
      },
    ],
    tags: ['eigenschaft', 'person'],
  },
  {
    id: 'dict-a1-006',
    german: 'Arzt',
    arabic: 'طبيب / طبيب بشري',
    word_type: 'noun',
    cefr: 'A1',
    gender: 'der',
    ipa: '/aːʁtsft/',
    category: 'health',
    noun_forms: {
      plural_form: 'die Ärzte',
      genitive_singular: 'des Arztes',
    },
    examples: [
      {
        de: 'Ich habe morgen einen Termin beim Arzt.',
        ar: 'لدي موعد لدى الطبيب غداً.',
      },
    ],
    cultural_note_ar: 'في ألمانيا يجب الاتصال وحجز موعد (Termin) مسبقاً قبل الذهاب إلى العيادة إلا في الحالات الإسعافية الطارئة.',
    tags: ['gesundheit', 'medizin'],
  },

  // --- A2 LEVEL ---
  {
    id: 'dict-a2-001',
    german: 'Krankenversicherung',
    arabic: 'التأمين الصحي / منظومة الضمان الصحي المباشر',
    word_type: 'noun',
    cefr: 'A2',
    gender: 'die',
    ipa: '/ˈkʁaŋkənfɛʁˌzɪçəʁʊŋ/',
    category: 'health',
    noun_forms: {
      plural_form: 'die Krankenversicherungen',
      genitive_singular: 'der Krankenversicherung',
    },
    examples: [
      {
        de: 'In Deutschland ist eine Krankenversicherung für alle Einwohner gesetzlich vorgeschrieben.',
        ar: 'في ألمانيا يُعد التأمين الصحي إجبارياً بموجب القانون لجميع المقيمين.',
      },
    ],
    cultural_note_ar: 'تنقسم التأمينات الصحية في ألمانيا إلى عامة (Gesetzlich) وخاصة (Privat)، وتُغطي تكاليف العلاج والأدوية.',
    tags: ['gesetz', 'gesundheit', 'versicherung'],
  },
  {
    id: 'dict-a2-002',
    german: 'bewerben',
    arabic: 'يتقدّم بطلب (لوظيفة أو مقعد دراسي)',
    word_type: 'verb',
    cefr: 'A2',
    category: 'work',
    verb_forms: {
      present_3sg: 'bewirbt sich',
      past_simple: 'bewarb sich',
      perfect: 'hat sich beworben',
      auxiliary: 'haben',
      is_reflexive: true,
    },
    preposition_case: 'accusative',
    preposition_governed: 'sich bewerben um (+ Akk) / bei (+ Dat)',
    examples: [
      {
        de: 'Er bewirbt sich um eine Stelle als Softwareentwickler bei einer Berliner Firma.',
        ar: 'هو يتقدم بطلب للحصول على وظيفة كمطور برمجيات لدى شركة في برلين.',
      },
    ],
    tags: ['arbeit', 'karriere', 'reflexiv'],
  },
  {
    id: 'dict-a2-003',
    german: 'Mietvertrag',
    arabic: 'عقد الإيجار',
    word_type: 'noun',
    cefr: 'A2',
    gender: 'der',
    ipa: '/ˈmiːtfɛʁˌtʁaːk/',
    category: 'housing',
    noun_forms: {
      plural_form: 'die Mietverträge',
      genitive_singular: 'des Mietvertrages',
    },
    examples: [
      {
        de: 'Vor dem Einzug müssen Sie den Mietvertrag unterschreiben.',
        ar: 'قبل الانتقال يجب عليك توقيع عقد الإيجار.',
      },
    ],
    tags: ['wohnung', 'vertrag'],
  },
  {
    id: 'dict-a2-004',
    german: 'Kündigung',
    arabic: 'إنهاء العقد / الإقالة أو الاستقالة الرسميّة',
    word_type: 'noun',
    cefr: 'A2',
    gender: 'die',
    category: 'work',
    noun_forms: {
      plural_form: 'die Kündigungen',
      genitive_singular: 'der Kündigung',
    },
    examples: [
      {
        de: 'Die Kündigung muss schriftlich eingereicht werden.',
        ar: 'يجب تقديم إنهاء العقد أو الاستقالة كتابياً.',
      },
    ],
    tags: ['arbeit', 'recht'],
  },

  // --- B1 LEVEL ---
  {
    id: 'dict-b1-001',
    german: 'Auseinandersetzung',
    arabic: 'نقاش حاد / مواجهة فكرية أو نقاش تحليلي عميق',
    word_type: 'noun',
    cefr: 'B1',
    gender: 'die',
    ipa: '/aʊ̯sʔaɪ̯ˈnandɐˌzɛtsʊŋ/',
    category: 'culture',
    noun_forms: {
      plural_form: 'die Auseinandersetzungen',
      genitive_singular: 'der Auseinandersetzung',
    },
    examples: [
      {
        de: 'Eine sachliche Auseinandersetzung mit dem Thema führt meist zu besseren Lösungen.',
        ar: 'إن النقاش الموضوعي والتحليلي حول الموضوع يؤدي عادة إلى حلول أفضل.',
      },
    ],
    synonyms: ['Debatte', 'Diskussion', 'Konflikt'],
    tags: ['kultur', 'gesellschaft', 'politik'],
  },
  {
    id: 'dict-b1-002',
    german: 'voraussetzen',
    arabic: 'يفترض مسبقاً / يتطلب وجود كشرط أساسي',
    word_type: 'verb',
    cefr: 'B1',
    is_separable: true,
    separable_prefix: 'voraus',
    category: 'work',
    verb_forms: {
      present_3sg: 'setzt voraus',
      past_simple: 'setzte voraus',
      perfect: 'hat vorausgesetzt',
      auxiliary: 'haben',
    },
    examples: [
      {
        de: 'Gute Deutschkenntnisse werden für diese Stelle vorausgesetzt.',
        ar: 'يُفترض وجود معرفة جيدة باللغة الألمانية كشرط أساسي لهذه الوظيفة.',
      },
    ],
    synonyms: ['fordern', 'erfordern', 'bedingen'],
    tags: ['anforderung', 'arbeit'],
  },
  {
    id: 'dict-b1-003',
    german: 'Nachhaltigkeit',
    arabic: 'الاستدامة والحفاظ على الموارد الحيوية والبيئية',
    word_type: 'noun',
    cefr: 'B1',
    gender: 'die',
    category: 'nature',
    noun_forms: {
      plural_form: 'die Nachhaltigkeiten',
      genitive_singular: 'der Nachhaltigkeit',
    },
    examples: [
      {
        de: 'Nachhaltigkeit spielt in der modernen deutschen Wirtschaft eine zentrale Rolle.',
        ar: 'تلعب الاستدامة دوراً محورية في الاقتصاد الألماني الحديث.',
      },
    ],
    cultural_note_ar: 'الاستدامة مفهوم جوهري في الثقافة والمؤسسات الألمانية يتعلق بفصل النفايات والطاقة المتجددة والحفاظ على الطبيعة.',
    tags: ['umwelt', 'zukunft'],
  },
  {
    id: 'dict-b1-004',
    german: 'Verantwortung',
    arabic: 'مسؤولية / تحمّل التبعات والواجبات',
    word_type: 'noun',
    cefr: 'B1',
    gender: 'die',
    category: 'culture',
    noun_forms: {
      plural_form: 'die Verantwortungen',
      genitive_singular: 'der Verantwortung',
    },
    examples: [
      {
        de: 'Jeder Bürger trägt Verantwortung für das Wohl der Gesellschaft.',
        ar: 'كل مواطن يتحمل المسؤولية عن رفاهية المجتمع.',
      },
    ],
    tags: ['gesellschaft', 'ethik'],
  },

  // --- B2 LEVEL ---
  {
    id: 'dict-b2-001',
    german: 'Bürokratie',
    arabic: 'البيروقراطية / المعاملات والأوراق الإدارية الرسمية',
    word_type: 'noun',
    cefr: 'B2',
    gender: 'die',
    ipa: '/byʁokʁaˈtiː/',
    category: 'law',
    noun_forms: {
      plural_form: 'die Bürokratien',
      genitive_singular: 'der Bürokratie',
    },
    examples: [
      {
        de: 'Viele ausländische Fachkräfte empfinden die deutsche Bürokratie als große Hürde.',
        ar: 'يشعر العديد من الكفاءات الأجنبية بأن البيروقراطية الألمانية تشكل عقبة كبيرة.',
      },
    ],
    cultural_note_ar: 'المصطلح يتضمن غالباً دلالة على الإجراءات الورقية المفرطة والاشتراطات الدقيقة بالدوائر الحكومية.',
    tags: ['amt', 'staat', 'ordnung'],
  },
  {
    id: 'dict-b2-002',
    german: 'beeinträchtigen',
    arabic: ' يؤثر سلباً على / يضر بـ / يعيق',
    word_type: 'verb',
    cefr: 'B2',
    category: 'health',
    verb_forms: {
      present_3sg: 'beeinträchtigt',
      past_simple: 'beeinträchtigte',
      perfect: 'hat beeinträchtigt',
      auxiliary: 'haben',
    },
    examples: [
      {
        de: 'Lärm kann die Konzentrationsfähigkeit im Büro erheblich beeinträchtigen.',
        ar: 'يمكن للضوضاء أن تؤثر سلباً بشكل ملحوظ على القدرة على التركيز في المكتب.',
      },
    ],
    synonyms: ['schmälern', 'verschlechtern', 'hemmen'],
    antonyms: ['fördern', 'verbessern'],
    tags: ['einfluss', 'gesundheit'],
  },
  {
    id: 'dict-b2-003',
    german: 'Datenschutz',
    arabic: 'حماية البيانات والخصوصية الرقمية',
    word_type: 'noun',
    cefr: 'B2',
    gender: 'der',
    category: 'tech',
    noun_forms: {
      plural_form: 'die Datenschutze',
      genitive_singular: 'des Datenschutzes',
    },
    examples: [
      {
        de: 'Der Datenschutz hat in Deutschland Verfassungsrang und wird streng kontrolliert.',
        ar: 'تحظى حماية البيانات في ألمانيا بمرتبة دستورية ويتم مراقبتها بصرامة.',
      },
    ],
    cultural_note_ar: 'قوانين DSGVO الألمانية والأوروبية تعتبر من الأشد عالمياً لحماية البيانات الشخصية للمواطنين.',
    tags: ['it', 'recht', 'privacy'],
  },
  {
    id: 'dict-b2-004',
    german: 'Zuverlässigkeit',
    arabic: 'الموثوقية والالتزام بالمواعيد والوعود',
    word_type: 'noun',
    cefr: 'B2',
    gender: 'die',
    category: 'work',
    noun_forms: {
      plural_form: 'die Zuverlässigkeiten',
      genitive_singular: 'der Zuverlässigkeit',
    },
    examples: [
      {
        de: 'Zuverlässigkeit gehört zu den geschätzten Tugenden im Arbeitsleben.',
        ar: 'تُعد الموثوقية والدقة من الفضائل المحمودة جداً في الحياة العملية.',
      },
    ],
    tags: ['kultur', 'arbeit'],
  },

  // --- C1 LEVEL ---
  {
    id: 'dict-c1-001',
    german: 'Verfassungsgericht',
    arabic: 'المحكمة الدستورية العليا',
    word_type: 'noun',
    cefr: 'C1',
    gender: 'das',
    ipa: '/fɛʁˈfasʊŋsɡəˌʁɪçt/',
    category: 'law',
    noun_forms: {
      plural_form: 'die Verfassungsgerichte',
      genitive_singular: 'des Verfassungsgerichts',
    },
    examples: [
      {
        de: 'Das Bundesverfassungsgericht in Karlsruhe wacht über die Einhaltung des Grundgesetzes.',
        ar: 'تسهر المحكمة الدستورية الاتحادية في كارلسروه على تطبيق الدستور الألماني.',
      },
    ],
    tags: ['gesetz', 'staat', 'karlsruhe'],
  },
  {
    id: 'dict-c1-002',
    german: 'gewährleisten',
    arabic: 'يكفل / يضمن تحقق أمر بشكل مؤكد ورسمي',
    word_type: 'verb',
    cefr: 'C1',
    category: 'law',
    verb_forms: {
      present_3sg: 'gewährleistet',
      past_simple: 'gewährleistete',
      perfect: 'hat gewährleistet',
      auxiliary: 'haben',
    },
    examples: [
      {
        de: 'Der Staat muss die Sicherheit aller Bürgerinnen und Bürger gewährleisten.',
        ar: 'يجب على الدولة أن تكفل وتضمن أمن جميع المواطنين والمواطنات.',
      },
    ],
    synonyms: ['garantieren', 'sicherstellen'],
    tags: ['recht', 'pflicht'],
  },
  {
    id: 'dict-c1-003',
    german: 'Wortschatz',
    arabic: 'الحصيلة اللغوية / المفردات والقاموس الفكري للفرّد',
    word_type: 'noun',
    cefr: 'C1',
    gender: 'der',
    category: 'culture',
    noun_forms: {
      plural_form: 'die Wortschätze',
      genitive_singular: 'des Wortschatzes',
    },
    examples: [
      {
        de: 'Ein reichhaltiger Wortschatz ermöglicht eine präzise und nuancierte Ausdrucksweise.',
        ar: 'تتيح الحصيلة اللغوية الغنية التعبير بدقة ودقة متناهية بالظلال المعنوية.',
      },
    ],
    tags: ['sprache', 'linguistik'],
  },
  {
    id: 'dict-c1-004',
    german: 'Selbstbestimmung',
    arabic: 'تقرير المصير والحرية الإرادية الذاتية',
    word_type: 'noun',
    cefr: 'C1',
    gender: 'die',
    category: 'emotions',
    noun_forms: {
      plural_form: 'die Selbstbestimmungen',
      genitive_singular: 'der Selbstbestimmung',
    },
    examples: [
      {
        de: 'Das Recht auf funktionale Selbstbestimmung ist im Grundgesetz verankert.',
        ar: 'حق تقرير المصير الفردي راسخ ومحمي في القانون الأساسي (الدستور).',
      },
    ],
    tags: ['philosophie', 'recht'],
  },

  // --- C2 LEVEL ---
  {
    id: 'dict-c2-001',
    german: 'Unvoreingenommenheit',
    arabic: 'التجرد من الأحكام المسبقة / الموضوعية المطلقة والحياد التام',
    word_type: 'noun',
    cefr: 'C2',
    gender: 'die',
    category: 'emotions',
    noun_forms: {
      plural_form: 'die Unvoreingenommenheiten',
      genitive_singular: 'der Unvoreingenommenheit',
    },
    examples: [
      {
        de: 'Richter müssen ihre Entscheidungen mit absoluter Unvoreingenommenheit fällen.',
        ar: 'يتوجب على القضاة إصدار أحكامهم بتجرد مطلق من أي أحكام مسبقة أو تحيز.',
      },
    ],
    synonyms: ['Objektivität', 'Neutralität', 'Unparteilichkeit'],
    antonyms: ['Voreingenommenheit', 'Befangenheit'],
    tags: ['philosophie', 'recht', 'geist'],
  },
  {
    id: 'dict-c2-002',
    german: 'Schadenfreude',
    arabic: 'الشماتة (الشعور بالارتياح أو السرور عند رؤية سوء حظ الآخرين)',
    word_type: 'noun',
    cefr: 'C2',
    gender: 'die',
    ipa: '/ˈʃaːdn̩ˌfʁɔɪ̯də/',
    category: 'emotions',
    noun_forms: {
      plural_form: 'die Schadenfreuden',
      genitive_singular: 'der Schadenfreude',
    },
    examples: [
      {
        de: 'Schadenfreude gilt zwar als unfeine Empfindung, ist aber ein bekanntes menschliches Phänomen.',
        ar: 'تُعتبر الشماتة شعوراً غير نبيلاً، لكنها ظاهرة إنسانية شائعة ومعروفة.',
      },
    ],
    cultural_note_ar: 'كلمة Schadenfreude استُعيرت كما هي بدون ترجمة في لغات عالمية عديدة مثل الإنجليزية لعدم وجود مرادف مباشر دقيق لها.',
    tags: ['psychologie', 'kultur', 'idiom'],
  },
  {
    id: 'dict-c2-003',
    german: 'Feingefühl',
    arabic: 'الحس الرقيق واللباقة البالغة في التعامل والحدس الاجتماعي',
    word_type: 'noun',
    cefr: 'C2',
    gender: 'das',
    category: 'emotions',
    noun_forms: {
      plural_form: 'die Feingefühle',
      genitive_singular: 'des Feingefühls',
    },
    examples: [
      {
        de: 'In schwierigen Verhandlungen bewies der Diplomat diplomatisches Feingefühl.',
        ar: 'أظهر الدبلوماسي حسّاً ولباقة بالغة في المفاوضات المعقدة.',
      },
    ],
    synonyms: ['Taktgefühl', 'Empathie', 'Sensibilität'],
    tags: ['charakter', 'psychologie'],
  },
  {
    id: 'dict-c2-004',
    german: 'Verschlimmbessern',
    arabic: 'محاولة إصلاح الشيء فيزيد سوءاً وتردياً',
    word_type: 'verb',
    cefr: 'C2',
    category: 'culture',
    verb_forms: {
      present_3sg: 'verschlimmbessert',
      past_simple: 'verschlimmbesserte',
      perfect: 'hat verschlimmbessert',
      auxiliary: 'haben',
    },
    examples: [
      {
        de: 'Durch das ständige Ändern des Codes hat der Entwickler das Programm nur verschlimmbessert.',
        ar: 'بسبب التعديل المستمر للكود، لم يزد المطور البرنامج إلا سوءاً أثناء محاولة إصلاحه.',
      },
    ],
    cultural_note_ar: 'مصطلح نحته الفيلسوف الألماني لشتنبرغ يصف المفارقة الساخرة عند إفساد الأمر بدافع تحسينه.',
    tags: ['humor', 'sprache'],
  },
];

/**
 * Perform intelligent, fuzzy-capable multi-field search over the dictionary dataset
 */
export function searchDictionary(
  query: string,
  options?: {
    category?: string;
    cefr?: string;
    wordType?: string;
    gender?: string;
  }
): DictionaryEntry[] {
  const normalizedQuery = query.trim().toLowerCase();

  return GERMAN_DICTIONARY_DATA.filter((entry) => {
    // 1. Filter by category
    if (options?.category && options.category !== 'all' && entry.category !== options.category) {
      return false;
    }

    // 2. Filter by CEFR Level
    if (options?.cefr && options.cefr !== 'all' && entry.cefr !== options.cefr) {
      return false;
    }

    // 3. Filter by Word Type
    if (options?.wordType && options.wordType !== 'all' && entry.word_type !== options.wordType) {
      return false;
    }

    // 4. Filter by Gender
    if (options?.gender && options.gender !== 'all' && entry.gender !== options.gender) {
      return false;
    }

    // If query is empty, match all remaining
    if (!normalizedQuery) {
      return true;
    }

    // Match across multiple fields
    const matchGerman = entry.german.toLowerCase().includes(normalizedQuery);
    const matchArabic = entry.arabic.toLowerCase().includes(normalizedQuery);
    const matchIPA = entry.ipa?.toLowerCase().includes(normalizedQuery);
    const matchPlural = entry.noun_forms?.plural_form?.toLowerCase().includes(normalizedQuery);
    const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(normalizedQuery));
    const matchSynonyms = entry.synonyms?.some((s) => s.toLowerCase().includes(normalizedQuery));
    const matchExamples = entry.examples.some(
      (ex) =>
        ex.de.toLowerCase().includes(normalizedQuery) ||
        ex.ar.toLowerCase().includes(normalizedQuery)
    );

    return (
      matchGerman ||
      matchArabic ||
      Boolean(matchIPA) ||
      Boolean(matchPlural) ||
      Boolean(matchTags) ||
      Boolean(matchSynonyms) ||
      matchExamples
    );
  });
}

/**
 * Get Wort des Tages (Word of the Day) deterministically based on day of year
 */
export function getWortDesTages(): DictionaryEntry {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const index = dayOfYear % GERMAN_DICTIONARY_DATA.length;
  return GERMAN_DICTIONARY_DATA[index] || GERMAN_DICTIONARY_DATA[0];
}
