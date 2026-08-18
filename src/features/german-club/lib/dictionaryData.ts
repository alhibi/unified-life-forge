import { DictionaryEntry } from '../types';
import { DICTIONARY_PART_1 } from './dataset/dictPart1';
import { DICTIONARY_PART_2 } from './dataset/dictPart2';
import { DICTIONARY_PART_3 } from './dataset/dictPart3';
import { DICTIONARY_PART_4 } from './dataset/dictPart4';
import { DICTIONARY_PART_5 } from './dataset/dictPart5';

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
  { id: 'education', label_ar: 'التعليم والجامعة (Bildung & Wissenschaft)', icon: 'GraduationCap' },
  { id: 'travel', label_ar: 'السفر والمواصلات (Reise & Verkehr)', icon: 'Compass' },
  { id: 'food', label_ar: 'الطعام والمأكولات (Essen & Gastronomie)', icon: 'Utensils' },
  { id: 'sports', label_ar: 'الرياضة والأنشطة (Sport & Freizeit)', icon: 'Trophy' },
  { id: 'politics', label_ar: 'السياسة والدولة (Politik & Staat)', icon: 'Building' },
  { id: 'finance', label_ar: 'المال والمالية (Finanzen & Bank)', icon: 'Coins' },
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
