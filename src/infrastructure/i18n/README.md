# i18n Locale Coverage

Each locale was generated from the canonical English baseline. The values
are intentionally machine-translated placeholders (prefixed with the
language code) so a human translator can grep for them and replace them in
a single pass.

| Locale | Status | Native name | Direction | Keys translated |
|---|---|---|---|---|
| `ar` | canonical (project default) | العربية | RTL | 319/319 |
| `en` | canonical (fallback) | English | LTR | 319/319 |
| `de` | partial | Deutsch | LTR | 44/319 |
| `fr` | partial | Français | LTR | 44/319 |
| `es` | partial | Español | LTR | 46/319 |
| `tr` | partial | Türkçe | LTR | 44/319 |
| `ur` | partial | اردو | RTL | 44/319 |
| `id` | partial | Bahasa Indonesia | LTR | 44/319 |
| `ms` | partial | Bahasa Melayu | LTR | 44/319 |
| `ru` | partial | Русский | LTR | 44/319 |

## How to translate a key

1. Open the locale file (e.g. `src/infrastructure/i18n/locales/de.json`).
2. Find any value that begins with `[de]`.
3. Replace the value with the real translation.
4. Re-run `bun run scripts/translate-check.ts` to confirm coverage is rising.

The i18n engine will fall back to English for any untranslated key, so
shipping a partial translation is always safe.

## Adding a new locale

1. Add the language code to `SUPPORTED_LANGUAGES` in
   `src/infrastructure/i18n/index.ts`.
2. Add a `LanguageMeta` entry with direction, label, numberFormat and
   dateFormat (always test the format string in the iOS and Android ICU
   implementations — they reject unsupported calendars).
3. Import the JSON in `index.ts` and add it to the `resources` map.
4. Run `bun run scripts/translate-check.ts` to confirm parity with `en`.