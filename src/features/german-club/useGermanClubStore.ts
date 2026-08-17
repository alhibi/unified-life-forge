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

// Static fallback seed data to ensure offline/instant availability
const LOCAL_SHELVES_FALLBACK: GermanShelf[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    slug: 'cafe-and-bakery',
    title_ar: 'في المقهى والمخبز',
    title_de: 'Im Café & in der Bäckerei',
    description_ar: 'طلب القهوة، السؤال عن الفاتورة، والمفردات اليومية في المقاهي الألمانية',
    situation_tags: ['coffee', 'bakery', 'ordering'],
    icon: 'Coffee',
    sort_order: 1,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    slug: 'trains-and-transport',
    title_ar: 'القطارات والمواصلات',
    title_de: 'Zug & Nahverkehr',
    description_ar: 'التعامل مع تأخير القطارات (Deutsche Bahn) والتنقّل اليومي',
    situation_tags: ['train', 'db', 'transport'],
    icon: 'Train',
    sort_order: 2,
    is_premium: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    slug: 'roommates-and-housing',
    title_ar: 'السكن والزملاء (WG)',
    title_de: 'Wohnung & WG-Leben',
    description_ar: 'المحادثات والنقاشات اليومية مع الشركاء في السكن',
    situation_tags: ['housing', 'wg', 'roommate'],
    icon: 'Home',
    sort_order: 3,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    slug: 'flirting-and-dating',
    title_ar: 'التودد والتعارف',
    title_de: 'Flirten & Smalltalk',
    description_ar: 'عبارات التعارف والحديث العفوي الأنيق',
    situation_tags: ['social', 'chat', 'dating'],
    icon: 'Heart',
    sort_order: 4,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c5555555-5555-5555-5555-555555555555',
    slug: 'bureaucracy-and-office',
    title_ar: 'الدوائر الرسمية والأوراق',
    title_de: 'Amt & Bürokratie',
    description_ar: 'عبارات المعاملات الرسمية والمواعيد الألمانية',
    situation_tags: ['office', 'forms', 'official'],
    icon: 'FileText',
    sort_order: 5,
    is_premium: true,
    created_at: new Date().toISOString(),
  },
];

const LOCAL_ENTRIES_FALLBACK: Record<string, GermanEntry[]> = {
  'cafe-and-bakery': [
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
  'trains-and-transport': [
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

تذكر دائماً أن تحفظ الاسم مع أداته ولونه المخصص!`,
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
