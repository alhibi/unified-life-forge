/**
 * Word Prediction, Auto-Suggestions & Dictionary Engine for Arabic & Bilingual Typing.
 * Includes a rich default Arabic dictionary, frequency weights, Islamic phrases, and dynamic user dictionary.
 */

const USER_DICT_STORAGE = 'smarthub:soft-keyboard-user-dict';

let memoryUserDict: string[] = [];

/** High-frequency Arabic vocabulary & common Islamic/formal phrases */
const COMMON_ARABIC_WORDS: Record<string, string[]> = {
  '': ['السلام', 'شكراً', 'إن شاء الله', 'الحمد لله', 'بسم الله', 'جزاك الله خيراً', 'مرحباً', 'صباح الخير', 'مساء الخير', 'كيف'],
  'الس': ['السلام عليكم ورحمة الله وبركاته', 'السلام', 'السلام عليكم', 'السيد', 'السعادة'],
  'شكر': ['شكراً', 'شكراً جزيلاً', 'شكر', 'شكري'],
  'ان': ['إن شاء الله', 'أن', 'إن', 'أنه', 'إنها'],
  'الح': ['الحمد لله', 'الحمد', 'الحسن', 'الحرية'],
  'بسم': ['بسم الله الرحمن الرحيم', 'بسم', 'بسمه'],
  'جزا': ['جزاك الله خيراً', 'جزاكم الله خيراً', 'جزاك'],
  'صب': ['صباح الخير', 'صباح النور', 'صباحكم'],
  'مس': ['مساء الخير', 'مساء النور', 'مساءكم'],
  'كيف': ['كيف حالك', 'كيف الحال', 'كيفك', 'كيفية'],
  'ير': ['يرحمكم الله', 'يرجى', 'يريد'],
  'بار': ['بارك الله فيك', 'بارك الله فيكم', 'بارك'],
  'است': ['أستغفر الله', 'استغفر الله العظيم', 'استجابة', 'استخدام'],
  'صل': ['صلى الله عليه وسلم', 'صلاة', 'صلى'],
  'رض': ['رضي الله عنه', 'رضي الله عنها', 'رضوان'],
};

/** Common Arabic root frequency dictionary for word completion */
const DICTIONARY_WORDS = [
  'السلام', 'عليكم', 'ورحمة', 'الله', 'وبركاته', 'شكراً', 'جزيلاً', 'مرحباً', 'كيف',
  'حالك', 'صباح', 'الخير', 'النور', 'مساء', 'الحمد', 'لله', 'استغفر', 'سبحان',
  'تبارك', 'تعالى', 'المجيد', 'الكريم', 'العظيم', 'جميل', 'رائع', 'ممتاز', 'بالتأكيد',
  'إن', 'شاء', 'جزاك', 'خيراً', 'بارك', 'فيك', 'مع', 'السلامة', 'أهلاً', 'وسهلاً',
  'تطبيق', 'لوحة', 'المفاتيح', 'العربية', 'التصميم', 'السرعة', 'الدقة', 'التشكيل',
  'الكتابة', 'المؤشر', 'النص', 'الرسالة', 'البحث', 'المفضلة', 'الحافظة', 'نسخ', 'لصق',
];

/** Fetch learned user words from local storage or memory fallback */
export function getLearnedWords(): string[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(USER_DICT_STORAGE);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return memoryUserDict;
}

/** Save a newly typed word to user dictionary */
export function learnWord(word: string): void {
  if (!word || word.length < 3) return;
  const cleanWord = word.trim().replace(/[^\u0600-\u06FFa-zA-Z]/g, '');
  if (!cleanWord) return;

  const list = getLearnedWords();
  if (!list.includes(cleanWord)) {
    const next = [cleanWord, ...list].slice(0, 200);
    memoryUserDict = next;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(USER_DICT_STORAGE, JSON.stringify(next));
      } catch {
        /* fallback */
      }
    }
  }
}

/** Get smart word completions based on current input buffer */
export function getWordSuggestions(input: string, limit = 5): string[] {
  if (!input || input.trim() === '') {
    return COMMON_ARABIC_WORDS[''].slice(0, limit);
  }

  const cleanInput = input.trim();
  const words = cleanInput.split(/\s+/);
  const currentToken = words[words.length - 1];

  if (!currentToken) {
    const prevWord = words[words.length - 2];
    if (prevWord) {
      if (prevWord.includes('السلام')) return ['عليكم', 'ورحمة', 'الله', 'وبركاته'];
      if (prevWord.includes('إن')) return ['شاء الله', 'شاء', 'شاءت'];
      if (prevWord.includes('جزاك')) return ['الله خيراً', 'الله', 'كل خير'];
      if (prevWord.includes('بارك')) return ['الله فيك', 'الله لكم', 'الله'];
      if (prevWord.includes('صباح')) return ['الخير', 'النور', 'الورد', 'الجمال'];
      if (prevWord.includes('مساء')) return ['الخير', 'النور', 'الورد', 'الجمال'];
      if (prevWord.includes('صلى')) return ['الله عليه وسلم', 'الله عليه'];
      if (prevWord.includes('الحمد')) return ['لله', 'لله حمداً كثيراً'];
    }
    return COMMON_ARABIC_WORDS[''].slice(0, limit);
  }

  const results: string[] = [];

  for (const key in COMMON_ARABIC_WORDS) {
    if (key && currentToken.startsWith(key)) {
      results.push(...COMMON_ARABIC_WORDS[key]);
    }
  }

  const userWords = getLearnedWords().filter((w) => w.startsWith(currentToken));
  results.push(...userWords);

  const dictMatches = DICTIONARY_WORDS.filter((w) => w.startsWith(currentToken));
  results.push(...dictMatches);

  const unique = Array.from(new Set(results)).filter((w) => w !== currentToken);
  return unique.slice(0, limit);
}
