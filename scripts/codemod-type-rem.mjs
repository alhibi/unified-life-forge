#!/usr/bin/env node
/**
 * Convert arbitrary pixel font sizes and line heights to rem.
 *
 * WHY
 * The app shipped ~1,900 arbitrary type sizes (`text-[13px]`, `leading-[20px]`)
 * alongside the seven canonical tokens. Because those are literal pixels, the
 * font-size preference — which works by setting `html { font-size }` — could
 * not touch them. A user who asked for larger text got larger *canonical* text
 * and identical everything-else: a broken, half-scaled interface.
 *
 * WHAT
 * `text-[13px]` → `text-[0.8125rem]` (13 ÷ 16). The default base size is 16px,
 * so every rendered size is byte-identical before and after this codemod — it
 * only changes what the value is *relative to*. Now one preference scales all
 * of it, canonical and arbitrary alike.
 *
 * This is a one-shot migration kept in the repo as the record of how those
 * values were derived. New code should use the canonical scale
 * (`text-body`, `text-title`, …) instead of arbitrary sizes.
 *
 * Usage:  node scripts/codemod-type-rem.mjs [--dry]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');
/** The base the existing pixel values were authored against. */
const BASE = 16;

/** `text-[13px]`, `leading-[20px]`, including variants like `sm:text-[13px]`. */
const PATTERN = /\b(text|leading)-\[(\d+(?:\.\d+)?)px\]/g;

function toRem(px) {
  const rem = Number(px) / BASE;
  // N/16 is exact in decimal for every integer N, so no precision is lost.
  return `${Number(rem.toFixed(5))}rem`;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

let files = 0;
let replacements = 0;

for (const file of walk(join(ROOT, 'src'))) {
  const before = readFileSync(file, 'utf8');
  let count = 0;
  const after = before.replace(PATTERN, (_match, utility, px) => {
    count += 1;
    return `${utility}-[${toRem(px)}]`;
  });
  if (!count) continue;
  files += 1;
  replacements += count;
  if (!DRY) writeFileSync(file, after);
}

console.log(
  `${DRY ? '[dry run] ' : ''}${replacements} arbitrary type sizes in ${files} files → rem`,
);
