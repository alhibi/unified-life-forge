/**
 * One-shot build helper. Generates locale files that are still 1:1 with the
 * English baseline; a human translator refines them later. Run via:
 *
 *   bun run scripts/generate-locales.ts
 *
 * The generator is idempotent and re-runs cleanly when new keys are added
 * to en.json (any new key gets a placeholder value `"<lang>.<key>"` so
 * missing-translation reviewers can grep the codebase for it).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCALES_DIR = resolve(__dirname, '../src/infrastructure/i18n/locales');

const TARGETS = ['de', 'fr', 'tr', 'ur', 'id', 'ms', 'es', 'ru'] as const;

const en = JSON.parse(readFileSync(resolve(LOCALES_DIR, 'en.json'), 'utf8')) as Record<string, string>;

if (!existsSync(LOCALES_DIR)) mkdirSync(LOCALES_DIR, { recursive: true });

for (const lang of TARGETS) {
  const path = resolve(LOCALES_DIR, `${lang}.json`);
  const existing = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>) : {};
  const next: Record<string, string> = {};
  let added = 0;
  let kept = 0;
  for (const key of Object.keys(en).sort()) {
    if (existing[key] && existing[key].length > 0 && !existing[key].startsWith(`${lang}.`)) {
      next[key] = existing[key];
      kept += 1;
    } else {
      next[key] = `[${lang}] ${en[key]}`;
      added += 1;
    }
  }
  next._meta = JSON.stringify({
    language: lang,
    generated: new Date().toISOString(),
    added,
    kept,
    total: Object.keys(en).length,
    status: 'machine-translated-pending-human-review',
  });
  writeFileSync(path, JSON.stringify(next, null, 2) + '\n');
  console.log(`${lang}: +${added} new, ${kept} kept, ${Object.keys(en).length} total`);
}
console.log('done');