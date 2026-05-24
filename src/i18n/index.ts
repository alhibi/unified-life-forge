// i18n entry point.
//
// Translation tables are stored as flat key→string JSON in this folder
// (`ar.json`, `de.json`, …) so they round-trip cleanly through tooling
// (translation memory, `git diff`, AI translation passes) without TS
// quirks like trailing-comma noise or quote escapes.
//
// To add a new language:
//   1. Drop `<lang>.json` next to the others. Use the same set of keys
//      as `ar.json` — missing keys just fall back to the literal key.
//   2. Add the code to the `Language` union below.
//   3. Add an entry to `i18nByLanguage`.
//   4. Surface it in the language picker (Settings page).

import ar from './ar.json';
import de from './de.json';

export type Language = 'ar' | 'de';

export type TranslationDictionary = Readonly<Record<string, string>>;

export const i18nByLanguage: Readonly<Record<Language, TranslationDictionary>> = {
  ar,
  de,
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
