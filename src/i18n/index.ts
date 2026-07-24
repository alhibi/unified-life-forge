// i18n entry point.
//
// This project is Arabic-only. German (and any other language) has been
// intentionally removed and must NOT be reintroduced by any agent or
// contributor. The `Language` union is kept as `'ar' | 'de'` purely as a
// structural type so legacy `language === 'de'` branches still compile —
// at runtime `language` is always `'ar'`, so those branches are dead code.
//
// Do NOT add new locales, `<lang>.json` files, or language pickers.

import ar from './ar.json';

export type Language = 'ar' | 'de';

export type TranslationDictionary = Readonly<Record<string, string>>;

export const i18nByLanguage: Readonly<Record<Language, TranslationDictionary>> = {
  ar,
  de: ar,
};

/**
 * Look up a translation key for the given language. Falls back to the key
 * itself when the entry is missing — that surface in the UI is intentional
 * because it makes missing translations obvious during development without
 * crashing the page.
 */
export function translate(language: Language, key: string): string {
  return i18nByLanguage[language]?.[key] ?? key;
}
