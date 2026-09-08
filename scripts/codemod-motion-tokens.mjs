#!/usr/bin/env node
/**
 * codemod-motion-tokens — folds every ad-hoc CSS transition in the app onto the
 * single motion system owned by src/lib/motion.ts + the tokens in index.css.
 *
 *   transition-all      → transition-motion   (no layout-triggering property)
 *   duration-75|100     → duration-instant
 *   duration-150|200    → duration-fast
 *   duration-300        → duration-normal
 *   duration-500|700|1000 (and duration-[Nms]) → duration-slow
 *   ease-out            → ease-enter
 *   ease-in             → ease-exit
 *   ease-linear         → ease-linear-app
 *
 * Variant prefixes (`md:`, `group-hover:`, `motion-safe:` …) are preserved.
 *
 * Usage: node scripts/codemod-motion-tokens.mjs [--dry]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const EXT = /\.(tsx|ts)$/;

const DURATION_TOKEN = (ms) =>
  ms <= 100 ? 'instant' : ms <= 200 ? 'fast' : ms <= 300 ? 'normal' : 'slow';

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(p)) files.push(p);
  }
})('src');

const V = '((?:[a-zA-Z0-9_-]+:)*)';
let changedFiles = 0;
let changedTokens = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  const bump = () => { changedTokens += 1; };

  after = after.replace(
    new RegExp(`(^|[\\s"'\`])${V}transition-all\\b`, 'g'),
    (_m, lead, variants) => { bump(); return `${lead}${variants}transition-motion`; },
  );

  after = after.replace(
    new RegExp(`(^|[\\s"'\`])${V}duration-\\[(\\d+)ms\\]`, 'g'),
    (_m, lead, variants, ms) => { bump(); return `${lead}${variants}duration-${DURATION_TOKEN(Number(ms))}`; },
  );

  after = after.replace(
    new RegExp(`(^|[\\s"'\`])${V}duration-(\\d+)\\b`, 'g'),
    (_m, lead, variants, ms) => { bump(); return `${lead}${variants}duration-${DURATION_TOKEN(Number(ms))}`; },
  );

  after = after.replace(
    new RegExp(`(^|[\\s"'\`])${V}ease-linear\\b(?!-)`, 'g'),
    (_m, lead, variants) => { bump(); return `${lead}${variants}ease-linear-app`; },
  );
  after = after.replace(
    new RegExp(`(^|[\\s"'\`])${V}ease-out\\b(?!-)`, 'g'),
    (_m, lead, variants) => { bump(); return `${lead}${variants}ease-enter`; },
  );
  after = after.replace(
    new RegExp(`(^|[\\s"'\`])${V}ease-in\\b(?!-)`, 'g'),
    (_m, lead, variants) => { bump(); return `${lead}${variants}ease-exit`; },
  );

  if (after !== before) {
    changedFiles += 1;
    if (!DRY) writeFileSync(file, after);
  }
}

console.log(
  `${DRY ? '[dry] ' : ''}motion-token codemod: ${changedTokens} classes in ${changedFiles} files`,
);
