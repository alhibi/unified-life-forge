// i18n entry point.
//
// This project is Arabic-only. The German locale used to survive as the second
// half of every string in the app (`isAr ? 'عربي' : 'Deutsch'`) plus ~1,660
// `de:` / `*De:` data properties that could never render. All of it has been
// removed, and `Language` is now a single-member union so the compiler
// rejects any attempt to reintroduce a second locale by accident.
//
// Do NOT add new locales, `<lang>.json` files, or language pickers.

import ar from './ar.json';

export type Language = 'ar';

export type TranslationDictionary = Readonly<Record<string, string>>;

export const i18nByLanguage: Readonly<Record<Language, TranslationDictionary>> = {
  ar,
};

/**
 * Look up a translation key. Falls back to the key itself when the entry is
 * missing — surfacing the raw key in the UI is intentional because it makes a
 * missing translation obvious during development without crashing the page.
 */
export function translate(language: Language, key: string): string {
  return i18nByLanguage[language]?.[key] ?? key;
}
