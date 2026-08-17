import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { GermanEntry, GermanGrammarNote, GermanShelf } from './types';

interface GermanClubState {
  shelves: GermanShelf[];
  currentShelf: GermanShelf | null;
  entries: GermanEntry[];
  grammarNotes: GermanGrammarNote[];
  unreviewedEntries: GermanEntry[];
  isEntitled: boolean;
  isLoadingShelves: boolean;
  isLoadingEntries: boolean;
  isLoadingGrammar: boolean;
  isLoadingUnreviewed: boolean;
  error: string | null;

  fetchShelves: () => Promise<void>;
  fetchShelfEntries: (shelfSlug: string) => Promise<void>;
  fetchGrammarNotes: () => Promise<void>;
  fetchUnreviewedEntries: () => Promise<void>;
  checkEntitlement: () => Promise<boolean>;
  promoteEntryStatus: (entryId: string, newStatus: 'reviewed' | 'verified') => Promise<boolean>;
  toggleEntryMastered: (entryId: string, mastered: boolean) => Promise<void>;
}

// Static fallback seed data to ensure offline/instant availability for all 38+ shelves
const LOCAL_SHELVES_FALLBACK: GermanShelf[] = [
  // أ. الأساسيات اليومية (Daily-Life Basics)
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    slug: 'coffee-bakery',
    title_ar: 'في المقهى والمخبز',
    title_de: 'Bäckerei & Café',
    description_ar: 'طلب القهوة والخبز الصباحي والحديث مع العامل',
    situation_tags: ['coffee', 'bakery', 'cafe', 'breakfast'],
    icon: 'Coffee',
    sort_order: 1,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-1111-1111-1111-111111111112',
    slug: 'weather-smalltalk',
    title_ar: 'حديث الطقس الدائم',
    title_de: 'Wetter & Smalltalk',
    description_ar: 'الطقس كموضوع حديث افتتاحي لا غنى عنه مع الألمان',
    situation_tags: ['weather', 'smalltalk', 'daily'],
    icon: 'Sun',
    sort_order: 2,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-1111-1111-1111-111111111113',
    slug: 'numbers-time',
    title_ar: 'الأرقام والوقت والمواعيد',
    title_de: 'Zahlen & Uhrzeit',
    description_ar: 'التعبير عن الوقت والتأريخ وتحديد المواعيد',
    situation_tags: ['time', 'numbers', 'appointments'],
    icon: 'Clock',
    sort_order: 3,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    slug: 'public-transport',
    title_ar: 'المواصلات والقطارات',
    title_de: 'ÖPNV & Deutsche Bahn',
    description_ar: 'التنقل اليومي وطرفات تأخير قطارات DB القومية',
    situation_tags: ['train', 'bus', 'transit', 'db'],
    icon: 'Train',
    sort_order: 4,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-1111-1111-1111-111111111115',
    slug: 'groceries-supermarket',
    title_ar: 'التسوق ونظام الـ Pfand',
    title_de: 'Supermarkt & Pfand System',
    description_ar: 'شراء المواد الغذائية، تدوير القوارير، وثقافة السوبرماركت',
    situation_tags: ['groceries', 'recycling', 'pfand', 'shopping'],
    icon: 'ShoppingBag',
    sort_order: 5,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-1111-1111-1111-111111111116',
    slug: 'texting-abbreviations',
    title_ar: 'اختصارات الرسائل والدردشة',
    title_de: 'SMS-Kürzel & Texting',
    description_ar: 'اختصارات الكتابة السريعة مثل LG, VG, WG, mfg',
    situation_tags: ['chat', 'slang', 'texting'],
    icon: 'MessageSquare',
    sort_order: 6,
    is_premium: false,
    created_at: new Date().toISOString(),
  },

  // ب. البيروقراطية (German Bureaucracy)
  {
    id: 'c2222222-2222-2222-2222-222222222221',
    slug: 'burgeramt-anmeldung',
    title_ar: 'تسجيل العنوان (Anmeldung)',
    title_de: 'Bürgeramt & Anmeldung',
    description_ar: 'كابوس حجز الموعد وتأكيد العنوان في الدائرة الحكومية',
    situation_tags: ['anmeldung', 'bureaucracy', 'cityhall'],
    icon: 'FileCheck',
    sort_order: 7,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c2222222-2222-2222-2222-222222222223',
    slug: 'bank-insurance',
    title_ar: 'البنك والتأمين الصحي',
    title_de: 'Bank & Krankenkasse',
    description_ar: 'فتح حساب بنكي واختيار التأمين الصحي المناسب',
    situation_tags: ['bank', 'insurance', 'finance'],
    icon: 'CreditCard',
    sort_order: 8,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c2222222-2222-2222-2222-222222222224',
    slug: 'post-parcels',
    title_ar: 'البريد والطرود',
    title_de: 'Post & Pakete',
    description_ar: 'استلام الطرود والتعامل مع مكتب البريد DHL',
    situation_tags: ['post', 'packages', 'dhl'],
    icon: 'Package',
    sort_order: 9,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c2222222-2222-2222-2222-222222222225',
    slug: 'taxes-basics',
    title_ar: 'أساسيات الضرائب',
    title_de: 'Steuererklärung Basics',
    description_ar: 'مصطلحات إقرار الضريبة والإعفاءات المالية',
    situation_tags: ['taxes', 'finance', 'official'],
    icon: 'Receipt',
    sort_order: 10,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // ج. السكن ورفقاء السكن (Housing & WG Life)
  {
    id: 'c3333333-3333-3333-3333-333333333331',
    slug: 'apartment-hunting',
    title_ar: 'البحث عن سكن',
    title_de: 'Wohnungssuche',
    description_ar: 'قراءة الإعلانات ومراسلة أصحاب العقارات',
    situation_tags: ['housing', 'rent', 'flat'],
    icon: 'Home',
    sort_order: 11,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c3333333-3333-3333-3333-333333333332',
    slug: 'wg-casting',
    title_ar: 'مقابلة السكن المشترك (WG-Casting)',
    title_de: 'WG-Casting & Interview',
    description_ar: 'التألق في مقابلة الانضمام لشقة مشتركة للشباب',
    situation_tags: ['wg', 'flatshare', 'social'],
    icon: 'Users',
    sort_order: 12,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    slug: 'roommates-and-housing',
    title_ar: 'خلافات السكن والمهام',
    title_de: 'Putzplan & WG-Miteinander',
    description_ar: 'تقسيم التنظيف والتعامل الودي مع خلافات الرفقاء',
    situation_tags: ['roommates', 'cleaning', 'conflict'],
    icon: 'ShieldAlert',
    sort_order: 13,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c3333333-3333-3333-3333-333333333334',
    slug: 'landlord-rent',
    title_ar: 'صاحب البيت والـ Nebenkosten',
    title_de: 'Vermieter & Nebenkosten',
    description_ar: 'فهم تكاليف التدفئة والخدمات والتواصل مع المؤجر',
    situation_tags: ['landlord', 'rent', 'utilities'],
    icon: 'Key',
    sort_order: 14,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // د. الجامعة والشغل (University & Work)
  {
    id: 'c4444444-4444-4444-4444-444444444441',
    slug: 'job-application',
    title_ar: 'التقديم على وظيفة',
    title_de: 'Bewerbung & Vorstellungsgespräch',
    description_ar: 'صياغة عبارات السيرة الذاتية والمقابلة',
    situation_tags: ['job', 'career', 'interview'],
    icon: 'Briefcase',
    sort_order: 15,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c4444444-4444-4444-4444-444444444442',
    slug: 'office-email-etiquette',
    title_ar: 'إتيكيت الإيميل الرسمي',
    title_de: 'E-Mail Knigge & Sie/Du',
    description_ar: 'الاحترافية في الرسائل والتحول بين Sie و Du',
    situation_tags: ['email', 'office', 'formal'],
    icon: 'Mail',
    sort_order: 16,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c4444444-4444-4444-4444-444444444443',
    slug: 'university-exams',
    title_ar: 'الجامعة والامتحانات',
    title_de: 'Uni, Studium & Ausbildung',
    description_ar: 'مصطلحات المحاضرات والمقاعد الدراسية والتدريب',
    situation_tags: ['university', 'study', 'exams'],
    icon: 'GraduationCap',
    sort_order: 17,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    slug: 'sick-leave',
    title_ar: 'الإجازة المرضية (Krankschreibung)',
    title_de: 'Krankmeldung & Attest',
    description_ar: 'الإبلاغ عن المرض عند رب العمل والحصول على التقرير',
    situation_tags: ['sickleave', 'doctor', 'work'],
    icon: 'Stethoscope',
    sort_order: 18,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // هـ. الطعام والمطاعم (Food Beyond Basics)
  {
    id: 'c5555555-5555-5555-5555-555555555551',
    slug: 'restaurant-etiquette',
    title_ar: 'إتيكيت المطاعم والبقشيش',
    title_de: 'Restaurant & Trinkgeld',
    description_ar: 'طلب الوجبات وثقافة البقشيش (Trinkgeld) الألمانية',
    situation_tags: ['food', 'restaurant', 'tipping'],
    icon: 'Utensils',
    sort_order: 19,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c5555555-5555-5555-5555-555555555552',
    slug: 'food-delivery-apps',
    title_ar: 'تطبيقات توصيل الطعام',
    title_de: 'Lieferdienste & Apps',
    description_ar: 'الطلب عبر التطبيقات والملاحظات للسائق',
    situation_tags: ['delivery', 'takeaway', 'apps'],
    icon: 'Truck',
    sort_order: 20,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c5555555-5555-5555-5555-555555555553',
    slug: 'dietary-needs',
    title_ar: 'القيود الغذائية (حلال والنباتي)',
    title_de: 'Halal, Vegan & Allergien',
    description_ar: 'التعبير بدقة عن الطعام الحلال، الحساسية، والحمية',
    situation_tags: ['halal', 'vegan', 'allergies'],
    icon: 'Leaf',
    sort_order: 21,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // و. الخروج والحياة الليلية (Going Out)
  {
    id: 'c6666666-6666-6666-6666-666666666661',
    slug: 'bar-club-phrases',
    title_ar: 'عبارات الخروج والمقاهي',
    title_de: 'Bar & Ausgehen',
    description_ar: 'طلب المشروبات والتحدث في الأماكن الاجتماعية',
    situation_tags: ['bar', 'nightlife', 'social'],
    icon: 'GlassWater',
    sort_order: 22,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c6666666-6666-6666-6666-666666666662',
    slug: 'spati-latenight',
    title_ar: 'ثقافة الـ Späti السريعة',
    title_de: 'Späti-Kultur',
    description_ar: 'الشراء السريع ليلاً من دكان المتجر المحلي',
    situation_tags: ['spati', 'latenight', 'berlin'],
    icon: 'Store',
    sort_order: 23,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c6666666-6666-6666-6666-666666666663',
    slug: 'catching-last-train',
    title_ar: 'اللحاق بآخر قطار (Nachtbus)',
    title_de: 'Nachtbus & Letzte Bahn',
    description_ar: 'العبارات الطارئة عند فوات القطار الأخير',
    situation_tags: ['nightbus', 'transport', 'late'],
    icon: 'Moon',
    sort_order: 24,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // ز. العلاقات (Relationships)
  {
    id: 'c7777777-7777-7777-7777-777777777771',
    slug: 'flirting-and-dating',
    title_ar: 'التودد والتعارف العفوي',
    title_de: 'Flirten & Charmante Worte',
    description_ar: 'عبارات التعارف الأنيقة بأسلوب محترم وعصري',
    situation_tags: ['flirting', 'dating', 'social'],
    icon: 'Heart',
    sort_order: 25,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c7777777-7777-7777-7777-777777777772',
    slug: 'dating-apps',
    title_ar: 'مصطلحات تطبيقات التعارف',
    title_de: 'Dating-Apps & Chat',
    description_ar: 'مفردات المحادثات الرقمية الحديثة',
    situation_tags: ['dating', 'chat', 'modern'],
    icon: 'Smartphone',
    sort_order: 26,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // ح. الصحة والطوارئ (Health & Emergencies)
  {
    id: 'c8888888-8888-8888-8888-888888888881',
    slug: 'doctor-visit',
    title_ar: 'زيارة الطبيب ووصف الأعراض',
    title_de: 'Arztbesuch & Symptome',
    description_ar: 'شرح الآلام والأعراض بوضوح للدكتور',
    situation_tags: ['doctor', 'health', 'symptoms'],
    icon: 'Activity',
    sort_order: 29,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c8888888-8888-8888-8888-888888888882',
    slug: 'pharmacy',
    title_ar: 'في الصيدلية',
    title_de: 'Apotheke & Medikamente',
    description_ar: 'طلب الأدوية بدون وصفة وشرح التعليمات',
    situation_tags: ['pharmacy', 'medicine', 'health'],
    icon: 'Pill',
    sort_order: 30,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c8888888-8888-8888-8888-888888888883',
    slug: 'emergency-calls',
    title_ar: 'طوارئ 112 والإسعاف',
    title_de: 'Notruf 112 & Erste Hilfe',
    description_ar: 'ماذا تقول بالضبط للأسعاف والإطفاء في الطوارئ',
    situation_tags: ['emergency', '112', 'firstaid'],
    icon: 'AlertTriangle',
    sort_order: 31,
    is_premium: true,
    created_at: new Date().toISOString(),
  },

  // ط. مزاج جيل زد (Gen-Z Mood & Internet Culture)
  {
    id: 'c9999999-9999-9999-9999-999999999991',
    slug: 'denglisch-loanwords',
    title_ar: 'الإنجليزية المدمجة (Denglisch)',
    title_de: 'Denglisch & Modewörter',
    description_ar: 'كلمات مثل chillen, Date, cringe, Location',
    situation_tags: ['denglisch', 'genz', 'slang'],
    icon: 'Sparkles',
    sort_order: 32,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c9999999-9999-9999-9999-999999999992',
    slug: 'sarcasm-dry-humor',
    title_ar: 'السخرية والفكاهة الجافة',
    title_de: 'Sarkasmus & Trockener Humor',
    description_ar: 'فهم الفكاهة الألمانية الجافة الذكية',
    situation_tags: ['humor', 'sarcasm', 'culture'],
    icon: 'Laugh',
    sort_order: 35,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
];

const LOCAL_ENTRIES_FALLBACK: Record<string, GermanEntry[]> = {
  'coffee-bakery': [
    {
      id: 'e101',
      shelf_id: 'c1111111-1111-1111-1111-111111111111',
      entry_type: 'word',
      german_text: 'Kaffee',
      gender: 'der',
      ipa: '/ˈkafe/',
      arabic_translation: 'القهوة',
      register: 'neutral',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Ich trinke morgens gerne einen heißen Kaffee.',
      example_sentence_ar: 'أحب شرب قهوة ساخنة في الصباح.',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 1,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e102',
      shelf_id: 'c1111111-1111-1111-1111-111111111111',
      entry_type: 'phrase',
      german_text: 'Rechnung, bitte',
      gender: 'die',
      ipa: null,
      arabic_translation: 'الفاتورة، من فضلك',
      register: 'neutral',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Wir möchten gerne bezahlen. Die Rechnung, bitte!',
      example_sentence_ar: 'نريد الدفع من فضلك. الفاتورة لو سمحت!',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 2,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e103',
      shelf_id: 'c1111111-1111-1111-1111-111111111111',
      entry_type: 'word',
      german_text: 'Wasser',
      gender: 'das',
      ipa: '/ˈvasɐ/',
      arabic_translation: 'الماء',
      register: 'neutral',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Ein stilles Wasser, bitte.',
      example_sentence_ar: 'ماء عادي (بدون غاز)، من فضلك.',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 3,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e104',
      shelf_id: 'c1111111-1111-1111-1111-111111111111',
      entry_type: 'phrase',
      german_text: 'ist mir egal',
      gender: 'n_a',
      ipa: null,
      arabic_translation: 'هذا الأمر لا يهمّني / عادي عندي',
      register: 'informal',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Was möchtest du trinken? – Das ist mir egal.',
      example_sentence_ar: 'ماذا تحب أن تشرب؟ – عادي، لا يهم أي شيء.',
      audio_url: null,
      difficulty_level: 'A2',
      review_status: 'verified',
      sort_order: 4,
      created_at: new Date().toISOString(),
      locked: false,
    },
  ],
  'public-transport': [
    {
      id: 'e201',
      shelf_id: 'c2222222-2222-2222-2222-222222222222',
      entry_type: 'word',
      german_text: 'Zug',
      gender: 'der',
      ipa: '/tsuːk/',
      arabic_translation: 'القطار',
      register: 'neutral',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Der Zug nach Berlin hat heute zehn Minuten Verspätung.',
      example_sentence_ar: 'قطار برلين متأخر اليوم عشر دقائق.',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 1,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e202',
      shelf_id: 'c2222222-2222-2222-2222-222222222222',
      entry_type: 'word',
      german_text: 'Fahrkarte',
      gender: 'die',
      ipa: '/ˈfaːɐ̯kaʁtə/',
      arabic_translation: 'تذكرة السفر',
      register: 'formal',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Haben Sie Ihre Fahrkarte dabei?',
      example_sentence_ar: 'هل معك تذكرة السفر؟',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 2,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e203',
      shelf_id: 'c2222222-2222-2222-2222-222222222222',
      entry_type: 'phrase',
      german_text: 'Alter, im Ernst?',
      gender: 'n_a',
      ipa: null,
      arabic_translation: 'يا زلمة، جدّي؟ / أحقاً هذا؟',
      register: 'slang',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Der Zug ist schon wieder ausgefallen. – Alter, im Ernst?',
      example_sentence_ar: 'تم إلغاء القطار مجدداً. – يا رجل، أجدّك تتكلم؟',
      audio_url: null,
      difficulty_level: 'B1',
      review_status: 'verified',
      sort_order: 3,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e204',
      shelf_id: 'c2222222-2222-2222-2222-222222222222',
      entry_type: 'word',
      german_text: 'einsteigen',
      gender: 'n_a',
      ipa: '/ˈaɪ̯nˌʃtaɪ̯ɡn̩/',
      arabic_translation: 'يركب (القطار/الحافلة)',
      register: 'neutral',
      is_separable_verb: true,
      separable_prefix: 'ein',
      example_sentence_de: 'Bitte alle Fahrgäste jetzt einsteigen!',
      example_sentence_ar: 'يرجى من جميع الركاب الركوب الآن!',
      audio_url: null,
      difficulty_level: 'A2',
      review_status: 'verified',
      sort_order: 4,
      created_at: new Date().toISOString(),
      locked: false,
    },
  ],
  'roommates-and-housing': [
    {
      id: 'e301',
      shelf_id: 'c3333333-3333-3333-3333-333333333333',
      entry_type: 'word',
      german_text: 'aufstehen',
      gender: 'n_a',
      ipa: '/ˈaʊ̯fˌʃteːən/',
      arabic_translation: 'يستيقظ / ينهض',
      register: 'neutral',
      is_separable_verb: true,
      separable_prefix: 'auf',
      example_sentence_de: 'Ich stehe um sieben Uhr auf.',
      example_sentence_ar: 'أنا أستيقظ في الساعة السابعة.',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 1,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e302',
      shelf_id: 'c3333333-3333-3333-3333-333333333333',
      entry_type: 'word',
      german_text: 'anrufen',
      gender: 'n_a',
      ipa: '/ˈanˌʁuːfn̩/',
      arabic_translation: 'يتصل هاتفياً',
      register: 'neutral',
      is_separable_verb: true,
      separable_prefix: 'an',
      example_sentence_de: 'Ich rufe dich morgen an.',
      example_sentence_ar: 'سأتصل بك غداً.',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 2,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e303',
      shelf_id: 'c3333333-3333-3333-3333-333333333333',
      entry_type: 'word',
      german_text: 'Schlüssel',
      gender: 'der',
      ipa: '/ˈʃlʏsl̩/',
      arabic_translation: 'المفتاح',
      register: 'neutral',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Wo ist mein Schlüssel?',
      example_sentence_ar: 'أين مفتاحي؟',
      audio_url: null,
      difficulty_level: 'A1',
      review_status: 'verified',
      sort_order: 3,
      created_at: new Date().toISOString(),
      locked: false,
    },
  ],
  'flirting-and-dating': [
    {
      id: 'e401',
      shelf_id: 'c4444444-4444-4444-4444-444444444444',
      entry_type: 'phrase',
      german_text: 'mitkommen',
      gender: 'n_a',
      ipa: '/ˈmɪtˌkɔmən/',
      arabic_translation: 'يأتي مع / يرافق',
      register: 'informal',
      is_separable_verb: true,
      separable_prefix: 'mit',
      example_sentence_de: 'Kommst du heute Abend mit?',
      example_sentence_ar: 'هل تأتي معنا هذا المساء؟',
      audio_url: null,
      difficulty_level: 'A2',
      review_status: 'verified',
      sort_order: 1,
      created_at: new Date().toISOString(),
      locked: false,
    },
    {
      id: 'e402',
      shelf_id: 'c4444444-4444-4444-4444-444444444444',
      entry_type: 'idiom',
      german_text: 'Schmetterlinge im Bauch',
      gender: 'plural',
      ipa: null,
      arabic_translation: 'فراشات في المعدة (شعور الإعجاب والافتتان)',
      register: 'informal',
      is_separable_verb: false,
      separable_prefix: null,
      example_sentence_de: 'Wenn ich dich sehe, habe ich Schmetterlinge im Bauch.',
      example_sentence_ar: 'عندما أراك، أشعر بفراشات في قلبي.',
      audio_url: null,
      difficulty_level: 'B1',
      review_status: 'verified',
      sort_order: 2,
      created_at: new Date().toISOString(),
      locked: false,
    },
  ],
};

const LOCAL_GRAMMAR_FALLBACK: GermanGrammarNote[] = [
  {
    id: 'g1',
    title_ar: 'أدوات التعريف الثلاث (Der, Die, Das)',
    title_de: 'Die bestimmten Artikel',
    body_md: `في اللغة الألمانية توجد ثلاثة أجناس للأسماء عكس العربية التي فيها جنسين فقط:

1. **Der** (المذكر - الأزرق العميق): مثل *der Kaffee* (القهوة)، *der Zug* (القطار).
2. **Die** (المؤنث - الوردي الناعم): مثل *die Rechnung* (الفاتورة)، *die Fahrkarte* (التذكرة).
3. **Das** (المحايد - الرمادي الدافيء): مثل *das Wasser* (الماء).

تذكر دائماً أن تحفظ الاسم مع أداته ولونه المخصص في النادي!`,
    related_shelf_ids: [],
    difficulty_level: 'A1',
    review_status: 'verified',
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g2',
    title_ar: 'الأفعال المنفصلة (Trennbare Verben)',
    title_de: 'Trennbare Verben im Satz',
    body_md: `تتميز العديد من الأفعال الألمانية بوجود بادئة (Prefix) تنفصل عن الفعل الرئيسي في الجملة البسيطة وتذهب إلى نهاية الجملة تماماً!

مثال مع الفعل **aufstehen** (يستيقظ - البادئة \`auf\`):
- *Ich **stehe** um sieben Uhr **auf**.* (أنا أستيقظ الساعة السابعة).

لاحظ كيف يحل الجزء الأساسي (*stehe*) في الموقع الثاني للجملة، بينما تقفز البادئة (*auf*) إلى نهاية الجملة.`,
    related_shelf_ids: [],
    difficulty_level: 'A1',
    review_status: 'verified',
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g3',
    title_ar: 'أدوات التلطيف السحرية (Modalpartikeln)',
    title_de: 'Abtönungspartikeln (doch, mal, halt, eben, ja, denn)',
    body_md: `كلمات التلطيف والنبرة السحرية التي تجعلك تبدو كمتحدث أصلي:
- **doch**: للتأكيد أو التلطيف (*Komm doch rein!* — تفضل بالدخول!).
- **mal**: للطف والأمر الخفيف (*Guck mal!* — انظر لحظة!).
- **halt / eben**: للتعبير عن أمر واقع لا مفر منه (*Es ist halt so.* — الواقع هكذا!).
- **ja**: للتعجب أو حقيقة معروفة للجميع (*Das ist ja super!*).
- **denn**: في الأسئلة لإظهار الاهتمام (*Was machst du denn?*).`,
    related_shelf_ids: [],
    difficulty_level: 'B1',
    review_status: 'verified',
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g4',
    title_ar: 'قواعد Sie و Du والإتيكيت الاجتماعي',
    title_de: 'Sie vs. Du & Das Du anbieten',
    body_md: `الفرق الاجتماعي الدقيق بين الرسمية والودية:
- **Sie**: تستخدم مع الغرباء، كبار السن، والمسؤولين في الدوائر والعمل.
- **Du**: تستخدم مع الأصدقاء، زملاء الدراسة، والأطفال.
- **الانتقال (Das Du anbieten)**: يحدث عادة عندما يعرض الشخص الأكبر سنًا أو الأقدم مقامًا في العمل استخدام "Du" عبر عبارة: *Wir können uns gerne duzen.*`,
    related_shelf_ids: [],
    difficulty_level: 'A2',
    review_status: 'verified',
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g5',
    title_ar: 'الأصدقاء المزيفون بين الألمانية والإنجليزية',
    title_de: 'Falsche Freunde (English & German)',
    body_md: `كلمات تتشابه نطقاً مع الإنجليزية لكن معناها مختلف تماماً:
- **Gift**: تعني **سُم** في الألمانية وليس هدية!
- **Rat**: تعني **نصيحة** وليس جرذاً!
- **Chef**: تعني **مدير العمل** وليس طباخاً!
- **bekommen**: تعني **يحصل على** وليس يصبح (*become*)!`,
    related_shelf_ids: [],
    difficulty_level: 'A2',
    review_status: 'verified',
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g6',
    title_ar: 'الحالات الإعرابية الأربع (Cases Quick-Reference)',
    title_de: 'Kasus: Nominativ, Akkusativ, Dativ, Genitiv',
    body_md: `ملخص الحالات الإعرابية البسيط:
1. **Nominativ (الرفع)**: الفاعل الأصلي (*Der Hund bellt*).
2. **Akkusativ (النصب)**: المفعول به المباشر (*Ich sehe den Hund*).
3. **Dativ (الجر)**: المفعول به غير المباشر أو بعد حروف جر معينة (*Ich gebe dem Hund das Essen*).
4. **Genitiv (الإضافة)**: الملكية والإضافة (*Das Halsband des Hundes*).`,
    related_shelf_ids: [],
    difficulty_level: 'B1',
    review_status: 'verified',
    sort_order: 6,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g7',
    title_ar: 'مصايد النطق والأصوات الخاصة',
    title_de: 'Aussprache & Vokale (ü, ö, ä, ch, ß)',
    body_md: `مفاتيح النطق الألماني الصحيح:
- **ü / ö / ä**: حروف الإمالة الصوتية (Umlaut).
- **ch**: ينطق كالشين الخفيفة بعد e/i (*ich*) وكالخاء بعد a/o/u (*auch*).
- **ß**: ينطق كسين مشددة صريحة (ss).
- **تسكين أواخر الحروف**: الحرف b في نهاية الكلمة ينطق كـ p القريبة (*ab* -> *ap*).`,
    related_shelf_ids: [],
    difficulty_level: 'A1',
    review_status: 'verified',
    sort_order: 7,
    created_at: new Date().toISOString(),
  },
];

export const useGermanClubStore = create<GermanClubState>((set, get) => ({
  shelves: LOCAL_SHELVES_FALLBACK,
  currentShelf: null,
  entries: [],
  grammarNotes: LOCAL_GRAMMAR_FALLBACK,
  unreviewedEntries: [],
  isEntitled: false,
  isLoadingShelves: false,
  isLoadingEntries: false,
  isLoadingGrammar: false,
  isLoadingUnreviewed: false,
  error: null,

  fetchShelves: async () => {
    set({ isLoadingShelves: true, error: null });
    try {
      const { data, error } = await supabase
        .from('german_club_shelves')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        set({ shelves: LOCAL_SHELVES_FALLBACK, isLoadingShelves: false });
        return;
      }

      set({ shelves: data as GermanShelf[], isLoadingShelves: false });
    } catch {
      set({ shelves: LOCAL_SHELVES_FALLBACK, isLoadingShelves: false });
    }
  },

  fetchShelfEntries: async (shelfSlug: string) => {
    set({ isLoadingEntries: true, error: null });
    const { shelves } = get();
    const activeShelf = shelves.find((s) => s.slug === shelfSlug) || null;

    try {
      const isEntitled = await get().checkEntitlement();
      const { data, error } = await supabase
        .from('german_club_entries')
        .select('*')
        .eq('shelf_id', activeShelf?.id || '')
        .in('review_status', ['reviewed', 'verified'])
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        const local = LOCAL_ENTRIES_FALLBACK[shelfSlug] || [];
        // Apply paywall lock preview logic for non-members on premium shelves
        const processed = local.map((e, idx) => ({
          ...e,
          locked: activeShelf?.is_premium && !isEntitled && idx >= 2,
        }));
        set({
          currentShelf: activeShelf,
          entries: processed,
          isLoadingEntries: false,
        });
        return;
      }

      const processed = (data as GermanEntry[]).map((e, idx) => ({
        ...e,
        locked: activeShelf?.is_premium && !isEntitled && idx >= 2,
      }));

      set({
        currentShelf: activeShelf,
        entries: processed,
        isLoadingEntries: false,
      });
    } catch {
      const local = LOCAL_ENTRIES_FALLBACK[shelfSlug] || [];
      set({
        currentShelf: activeShelf,
        entries: local,
        isLoadingEntries: false,
      });
    }
  },

  fetchGrammarNotes: async () => {
    set({ isLoadingGrammar: true, error: null });
    try {
      const { data, error } = await supabase
        .from('german_club_grammar_notes')
        .select('*')
        .in('review_status', ['reviewed', 'verified'])
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        set({ grammarNotes: LOCAL_GRAMMAR_FALLBACK, isLoadingGrammar: false });
        return;
      }

      set({ grammarNotes: data as GermanGrammarNote[], isLoadingGrammar: false });
    } catch {
      set({ grammarNotes: LOCAL_GRAMMAR_FALLBACK, isLoadingGrammar: false });
    }
  },

  fetchUnreviewedEntries: async () => {
    set({ isLoadingUnreviewed: true, error: null });
    try {
      const { data, error } = await supabase
        .from('german_club_entries')
        .select('*')
        .eq('review_status', 'ai_generated')
        .order('created_at', { ascending: false });

      if (error || !data) {
        set({ unreviewedEntries: [], isLoadingUnreviewed: false });
        return;
      }

      set({ unreviewedEntries: data as GermanEntry[], isLoadingUnreviewed: false });
    } catch {
      set({ unreviewedEntries: [], isLoadingUnreviewed: false });
    }
  },

  checkEntitlement: async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        set({ isEntitled: false });
        return false;
      }

      const { data, error } = await supabase
        .from('premium_entitlements')
        .select('is_active, expires_at')
        .eq('user_id', userRes.user.id)
        .eq('product_slug', 'german_club_premium')
        .maybeSingle();

      if (error || !data) {
        set({ isEntitled: false });
        return false;
      }

      const active = Boolean(
        data.is_active && (!data.expires_at || new Date(data.expires_at) > new Date())
      );
      set({ isEntitled: active });
      return active;
    } catch {
      set({ isEntitled: false });
      return false;
    }
  },

  promoteEntryStatus: async (entryId: string, newStatus: 'reviewed' | 'verified') => {
    try {
      const { error } = await supabase
        .from('german_club_entries')
        .update({ review_status: newStatus })
        .eq('id', entryId);

      if (error) return false;

      set((state) => ({
        unreviewedEntries: state.unreviewedEntries.filter((e) => e.id !== entryId),
      }));
      return true;
    } catch {
      return false;
    }
  },

  toggleEntryMastered: async (entryId: string, mastered: boolean) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      await supabase.from('german_club_progress').upsert({
        user_id: userRes.user.id,
        entry_id: entryId,
        is_mastered: mastered,
        last_seen_at: new Date().toISOString(),
      });
    } catch {
      /* ignore offline progress errors */
    }
  },
}));
