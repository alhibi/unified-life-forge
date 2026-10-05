#!/usr/bin/env node
/**
 * Bundle budget gate.
 *
 * `renovate.json` has required the status check "Enforce bundle budget" since
 * it was written, but no such check — and no such script — existed. This is
 * that script.
 *
 * It measures the BROTLI-compressed size of every emitted JS asset, because
 * that is what the user actually downloads. Raw byte counts make the entry
 * chunk look catastrophic and the icon chunks look fine, when compression
 * reverses that ordering.
 *
 * Budgets are frozen at the sizes measured on 2026-10-05 and may only go
 * DOWN. The gate's job is to stop silent growth, not to pass judgement on the
 * current numbers — several of which are bad and have open remediation items.
 *
 *   node scripts/bundle-budget.mjs           verify
 *   node scripts/bundle-budget.mjs --write   re-baseline
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import process from 'node:process';

const DIST = 'dist/assets';
const BUDGET_FILE = path.resolve(import.meta.dirname, '../bundle-budget.json');
const write = process.argv.includes('--write');

if (!fs.existsSync(DIST)) {
  console.error(`No ${DIST}. Run the build first.`);
  process.exit(1);
}

/**
 * Vite appends a content hash to every filename. Comparing hashed names across
 * builds would make every budget entry miss on the first content change, so we
 * strip the hash and key on the stable chunk name.
 */
const stableName = (file) => file.replace(/-[A-Za-z0-9_-]{8,}\.js$/, '.js');

const brotli = (buf) =>
  zlib.brotliCompressSync(buf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

const measured = {};
let total = 0;

for (const file of fs.readdirSync(DIST).filter((f) => f.endsWith('.js'))) {
  const size = brotli(fs.readFileSync(path.join(DIST, file)));
  const key = stableName(file);
  // Vite can emit several chunks that reduce to the same stable name; sum them
  // rather than letting the last one silently win.
  measured[key] = (measured[key] ?? 0) + size;
  total += size;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

if (write) {
  const out = { totalBrotli: total, chunks: measured };
  fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`bundle-budget.json written — total ${kb(total)} across ${Object.keys(measured).length} chunks`);
  for (const [name, size] of Object.entries(measured).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${kb(size).padStart(10)}  ${name}`);
  }
  process.exit(0);
}

if (!fs.existsSync(BUDGET_FILE)) {
  console.error(`Missing ${BUDGET_FILE}. Run: node scripts/bundle-budget.mjs --write`);
  process.exit(1);
}

const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));

// A few KB of churn is normal when a dependency patch lands; a budget that
// trips on noise gets raised reflexively and stops meaning anything.
const TOLERANCE = 1.02;

let failed = false;

if (total > budget.totalBrotli * TOLERANCE) {
  failed = true;
  console.error(
    `✗ total: ${kb(total)} exceeds budget ${kb(budget.totalBrotli)} (+${kb(total - budget.totalBrotli)})`,
  );
}

for (const [name, size] of Object.entries(measured)) {
  const allowed = budget.chunks[name];
  if (allowed === undefined) {
    // A brand-new chunk is a code-splitting change. That is usually deliberate
    // and usually good, so warn rather than fail — the total still gates it.
    console.warn(`! new chunk ${name} at ${kb(size)} (not in budget)`);
    continue;
  }
  if (size > allowed * TOLERANCE) {
    failed = true;
    console.error(`✗ ${name}: ${kb(size)} exceeds budget ${kb(allowed)} (+${kb(size - allowed)})`);
  }
}

if (failed) {
  console.error(
    '\nBundle budget exceeded.\n' +
      'Before raising a number, check whether the import can be lazied or the\n' +
      'dependency dropped. Re-baseline with --write only when the growth is\n' +
      'understood and intended.',
  );
  process.exit(1);
}

console.log(`✓ bundle budget: ${kb(total)} total, ${Object.keys(measured).length} chunks within budget`);
