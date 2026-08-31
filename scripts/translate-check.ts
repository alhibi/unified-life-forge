/**
 * Translation completeness check. Compares every locale against the English
 * baseline and prints per-key coverage. Use:
 *
 *   bun run scripts/translate-check.ts
 *
 * Exit code is 0 if every locale has at least 70% coverage, 1 otherwise.
 * Run in CI to gate PRs that would regress translation quality.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCALES_DIR = resolve(__dirname, '../src/infrastructure/i18n/locales');

const MIN_COVERAGE = 0.7;
const PLACEHOLDER_PREFIX = /^\[[a-z]{2}\]/;

const en = JSON.parse(readFileSync(resolve(LOCALES_DIR, 'en.json'), 'utf8')) as Record<string, string>;
const totalKeys = Object.keys(en).length;

let failed = false;

for (const file of readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const obj = JSON.parse(readFileSync(resolve(LOCALES_DIR, file), 'utf8')) as Record<string, string>;
  let translated = 0;
  const missing: string[] = [];
  const placeholders: string[] = [];
  for (const key of Object.keys(en)) {
    const value = obj[key];
    if (!value) {
      missing.push(key);
      continue;
    }
    if (PLACEHOLDER_PREFIX.test(value)) {
      placeholders.push(key);
      continue;
    }
    translated += 1;
  }
  const coverage = translated / totalKeys;
  const status = coverage >= MIN_COVERAGE ? '✓' : '✗';
  if (coverage < MIN_COVERAGE) failed = true;
  console.log(`${status} ${file.padEnd(8)} ${(coverage * 100).toFixed(1).padStart(5)}%  (${translated}/${totalKeys})  missing=${missing.length}  placeholders=${placeholders.length}`);
}

if (failed) {
  console.error(`\nFATAL: at least one locale is below the ${(MIN_COVERAGE * 100).toFixed(0)}% coverage threshold.`);
  process.exit(1);
}
console.log('\nAll locales pass the coverage gate.');
void existsSync;