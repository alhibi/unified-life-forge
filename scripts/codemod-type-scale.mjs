#!/usr/bin/env node
/**
 * codemod-type-scale — folds every ad-hoc font size in the app onto the
 * modular type ladder owned by src/lib/fonts.ts.
 *
 *     size(n) = base × ratio ^ n      (base 16px, ratio 1.125)
 *
 * Any `text-[Xrem]`, `text-[Ypx]` or Tailwind default step (`text-xs` …
 * `text-5xl`) is rewritten to the NEAREST rung utility, so the app can no
 * longer contain a size that is "almost" another size. Variant prefixes
 * (`md:`, `group-hover:` …) are preserved.
 *
 * Usage: node scripts/codemod-type-scale.mjs [--dry]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = 'src';
const EXT = /\.(tsx|ts|jsx|js)$/;

/** The ladder, in px, at the default base/ratio. */
const RUNGS = [
  ['micro', 11.24],
  ['mini', 12.64],
  ['meta', 14.22],
  ['body', 16],
  ['lead', 18],
  ['title', 20.25],
  ['display', 22.78],
  ['hero', 25.63],
];

/** Tailwind default steps, in px. */
const DEFAULTS = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48,
};

const nearest = (px) =>
  RUNGS.reduce((best, r) => (Math.abs(r[1] - px) < Math.abs(best[1] - px) ? r : best))[0];

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(p)) files.push(p);
  }
})(ROOT);

let changedFiles = 0;
let changedTokens = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let after = before;

  // text-[0.8125rem] · text-[13px] · text-[13.5px]
  after = after.replace(
    /(^|[\s"'`])((?:[a-zA-Z0-9_-]+:)*)text-\[(\d*\.?\d+)(rem|px|em)\]/g,
    (m, lead, variants, num, unit) => {
      const px = unit === 'px' ? Number(num) : Number(num) * 16;
      if (!Number.isFinite(px) || px <= 0) return m;
      changedTokens += 1;
      return `${lead}${variants}text-${nearest(px)}`;
    },
  );

  // text-xs · md:text-2xl …
  after = after.replace(
    /(^|[\s"'`])((?:[a-zA-Z0-9_-]+:)*)text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g,
    (m, lead, variants, step) => {
      changedTokens += 1;
      return `${lead}${variants}text-${nearest(DEFAULTS[step])}`;
    },
  );

  if (after !== before) {
    changedFiles += 1;
    if (!DRY) writeFileSync(file, after);
  }
}

console.log(
  `${DRY ? '[dry] ' : ''}type-scale codemod: ${changedTokens} classes in ${changedFiles} files`,
);
