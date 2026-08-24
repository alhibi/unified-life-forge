import { CEFRLevel, DictionaryEntry, DictionarySortOption, GrammaticalCase } from '../types';
import { DICTIONARY_PART_1 } from './dataset/dictPart1';
import { DICTIONARY_PART_2 } from './dataset/dictPart2';
import { DICTIONARY_PART_3 } from './dataset/dictPart3';
import { DICTIONARY_PART_4 } from './dataset/dictPart4';
import { DICTIONARY_PART_5 } from './dataset/dictPart5';

export const DICTIONARY_CATEGORIES = [
  { id: 'all', label_ar: 'الكل (Alle)', icon: 'Sparkles', description_ar: 'المعجم الأكاديمي الشامل' },
  { id: 'basics', label_ar: 'الأساسيات اللغوية (Grundwortschatz)', icon: 'BookOpen', description_ar: 'مفردات البنية التحتية للغة' },
  { id: 'education', label_ar: 'الأكاديميا والعلوم (Wissenschaft & Bildung)', icon: 'GraduationCap', description_ar: 'مصطلحات التعليم العالي والأبحاث' },
  { id: 'law', label_ar: 'المعجم القانوني والإداري (Recht & Verwaltung)', icon: 'Scale', description_ar: 'المصطلحات الرسمية والدستورية' },
  { id: 'work', label_ar: 'المهني والاقتصادي (Wirtschaft & Beruf)', icon: 'Briefcase', description_ar: 'مصطلحات سوق العمل وإدارة الأعمال' },
  { id: 'tech', label_ar: 'التقنية والعلوم الدقيقة (Technik & IT)', icon: 'Cpu', description_ar: 'مصطلحات الهندسة والرقمنة' },
  { id: 'health', label_ar: 'المعجم الطبي والحيوي (Medizin & Gesundheit)', icon: 'Activity', description_ar: 'مصطلحات العلوم الطبية والصيدلانية' },
  { id: 'finance', label_ar: 'المالية والمصرفية (Finanzen & Bankwesen)', icon: 'Coins', description_ar: 'مصطلحات البنوك والضرائب والأسواق' },
  { id: 'culture', label_ar: 'الإنسانيات والاجتماع (Humanwissenschaften)', icon: 'Landmark', description_ar: 'الفلسفة، الفن والمجتمع' },
  { id: 'nature', label_ar: 'البيئة والعلوم الطبيعية (Umwelt & Naturwissenschaft)', icon: 'Globe', description_ar: 'الكيمياء، الأحياء، والبيئة' },
  { id: 'emotions', label_ar: 'علم النفس والمشاعر (Psychologie & Emotionen)', icon: 'Heart', description_ar: 'تراكيب التعبير عن الذات والسلوك' },
  { id: 'housing', label_ar: 'العمران والهندسة المدنية (Architektur & Wohnen)', icon: 'Home', description_ar: 'مصطلحات العقار، التخطيط السكني' },
  { id: 'travel', label_ar: 'الجغرافيا والمواصلات (Geographie & Logistik)', icon: 'Compass', description_ar: 'مصطلحات الملاحة واللوجستيات' },
  { id: 'food', label_ar: 'علوم الأغذية والصناعات (Gastronomie & Lebensmittel)', icon: 'Utensils', description_ar: 'المفردات التخصصية للتغذية' },
  { id: 'sports', label_ar: 'العلوم الرياضية والصحة البدنية (Sportwissenschaft)', icon: 'Trophy', description_ar: 'مصطلحات اللياقة والأداء البدني' },
  { id: 'politics', label_ar: 'العلوم السياسية والدولية (Politikwissenschaft)', icon: 'Building', description_ar: 'العلاقات الدولية والنظم السياسية' },
] as const;

/**
 * Aggregated Master Dictionary Data containing over 5,000 unique German-Arabic dictionary entries.
 */
export const GERMAN_DICTIONARY_DATA: DictionaryEntry[] = [
  ...DICTIONARY_PART_1,
  ...DICTIONARY_PART_2,
  ...DICTIONARY_PART_3,
  ...DICTIONARY_PART_4,
  ...DICTIONARY_PART_5,
];

const CEFR_RANK: Record<CEFRLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

const WORD_TYPE_ORDER: Record<string, number> = {
  noun: 1,
  verb: 2,
  adjective: 3,
  adverb: 4,
  preposition: 5,
  conjunction: 6,
  pronoun: 7,
  expression: 8,
  idiom: 9,
};

/**
 * Perform intelligent, multi-criterion search and sorting over the dictionary dataset
 */
export function searchDictionary(
  query: string,
  options?: {
    category?: string;
    cefr?: string;
    wordType?: string;
    gender?: string;
    selectedLetter?: string;
    selectedSort?: DictionarySortOption;
    selectedCase?: GrammaticalCase | 'all';
    onlySeparableVerbs?: boolean;
  }
): DictionaryEntry[] {
  const normalizedQuery = query.trim().toLowerCase();

  const results = GERMAN_DICTIONARY_DATA.filter((entry) => {
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

    // 5. Filter by First Letter (A-Z)
    if (options?.selectedLetter && options.selectedLetter !== 'all') {
      if (!entry.german.toLowerCase().startsWith(options.selectedLetter.toLowerCase())) {
        return false;
      }
    }

    // 6. Filter by Grammatical Case (for prepositions)
    if (options?.selectedCase && options.selectedCase !== 'all') {
      if (entry.preposition_case !== options.selectedCase) {
        return false;
      }
    }

    // 7. Filter by Separable Verbs
    if (options?.onlySeparableVerbs) {
      if (!entry.is_separable) {
        return false;
      }
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

  // Apply Sorting
  const sortMode = options?.selectedSort || 'alphabetical_asc';

  results.sort((a, b) => {
    switch (sortMode) {
      case 'alphabetical_asc':
        return a.german.localeCompare(b.german, 'de', { sensitivity: 'base' });
      case 'alphabetical_desc':
        return b.german.localeCompare(a.german, 'de', { sensitivity: 'base' });
      case 'cefr_asc': {
        const diff = (CEFR_RANK[a.cefr] || 0) - (CEFR_RANK[b.cefr] || 0);
        return diff !== 0 ? diff : a.german.localeCompare(b.german, 'de');
      }
      case 'cefr_desc': {
        const diff = (CEFR_RANK[b.cefr] || 0) - (CEFR_RANK[a.cefr] || 0);
        return diff !== 0 ? diff : a.german.localeCompare(b.german, 'de');
      }
      case 'word_length': {
        const diff = b.german.length - a.german.length;
        return diff !== 0 ? diff : a.german.localeCompare(b.german, 'de');
      }
      case 'type_grouped': {
        const orderA = WORD_TYPE_ORDER[a.word_type] || 99;
        const orderB = WORD_TYPE_ORDER[b.word_type] || 99;
        const diff = orderA - orderB;
        return diff !== 0 ? diff : a.german.localeCompare(b.german, 'de');
      }
      default:
        return a.german.localeCompare(b.german, 'de');
    }
  });

  return results;
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
