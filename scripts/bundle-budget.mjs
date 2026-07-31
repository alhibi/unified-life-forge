#!/usr/bin/env node
/**
 * Bundle-size budget for the first paint.
 *
 * CI already printed the largest chunks after every build, but printing is not
 * gating: the entry chunk reached **11 MB raw / 1.97 MB gzipped** behind a blocking
 * `<script>`, and the number was in the log on every single run. 7,990 KB of it was
 * icon data from four libraries that nothing could see into. A report nobody has to
 * act on is how that happens.
 *
 * What this measures is deliberately not "total dist size". It is the bytes a
 * first-time visitor must download before the app can render: the entry script, the
 * stylesheet, and every `modulepreload` in index.html. Lazy route chunks are
 * excluded because they are the thing code-splitting is for.
 *
 *   bun run bundle:budget            check dist/ against bundle-budget.json
 *   bun run bundle:budget -- --write rewrite the budget from the current dist/
 *
 * Use --write to record a REDUCTION. Raising it is a decision, not a formality.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX_HTML = path.join(DIST, 'index.html');
const BUDGET_FILE = path.join(ROOT, 'bundle-budget.json');
const write = process.argv.includes('--write');

/**
 * The assets index.html pulls in before first render.
 *
 * `<script src>` is the entry, `<link rel=modulepreload>` are the chunks the browser
 * is told to fetch immediately, and `<link rel=stylesheet>` blocks paint. Anything
 * else in dist/ is fetched later or not at all.
 */
function firstPaintAssets() {
  let html;
  try {
    html = readFileSync(INDEX_HTML, 'utf8');
  } catch {
    console.error(
      `No dist/index.html. Run \`bun run build\` before \`bun run bundle:budget\`.`,
    );
    process.exit(1);
  }

  const refs = new Set();
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(
    /<link[^>]+rel="(?:modulepreload|stylesheet)"[^>]+href="([^"]+)"/g,
  )) {
    refs.add(m[1]);
  }
  // Attribute order is not guaranteed, so also match href-before-rel.
  for (const m of html.matchAll(
    /<link[^>]+href="([^"]+)"[^>]+rel="(?:modulepreload|stylesheet)"/g,
  )) {
    refs.add(m[1]);
  }

  return [...refs]
    .filter((href) => href.startsWith('/assets/'))
    .map((href) => ({ href, file: path.join(DIST, href) }));
}

function measure() {
  const assets = firstPaintAssets();
  if (assets.length === 0) {
    console.error('index.html referenced no /assets/ files — is this a real build?');
    process.exit(1);
  }

  let raw = 0;
  let gzip = 0;
  const detail = [];

  for (const { href, file } of assets) {
    let bytes;
    try {
      bytes = readFileSync(file);
    } catch {
      console.error(`index.html references ${href} but dist has no such file.`);
      process.exit(1);
    }
    const g = gzipSync(bytes, { level: 9 }).length;
    raw += bytes.length;
    gzip += g;
    detail.push({ href, raw: bytes.length, gzip: g });
  }

  detail.sort((a, b) => b.gzip - a.gzip);
  return { raw, gzip, count: assets.length, detail };
}

const kb = (n) => Math.round(n / 1024);

const actual = measure();

if (write) {
  writeFileSync(
    BUDGET_FILE,
    `${JSON.stringify(
      {
        // Rounded up to the next 5 KB so an unrelated one-line change does not fail
        // the build, while a real regression still does.
        firstPaintGzipKB: Math.ceil(actual.gzip / 1024 / 5) * 5,
        firstPaintRawKB: Math.ceil(actual.raw / 1024 / 50) * 50,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(
    `bundle-budget.json written: ${kb(actual.gzip)} KB gzip / ${kb(actual.raw)} KB raw ` +
      `across ${actual.count} first-paint assets`,
  );
  process.exit(0);
}

let budget;
try {
  budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
} catch {
  console.error(
    `Could not read ${path.relative(ROOT, BUDGET_FILE)}.\n` +
      'Create it with: bun run bundle:budget -- --write',
  );
  process.exit(1);
}

console.log(`First-paint payload (${actual.count} assets):\n`);
for (const d of actual.detail) {
  console.log(`  ${String(kb(d.gzip)).padStart(5)} KB gz  ${String(kb(d.raw)).padStart(6)} KB raw  ${path.basename(d.href)}`);
}
console.log(
  `\n  ${String(kb(actual.gzip)).padStart(5)} KB gz  ${String(kb(actual.raw)).padStart(6)} KB raw  TOTAL` +
    `   (budget ${budget.firstPaintGzipKB} KB gz / ${budget.firstPaintRawKB} KB raw)\n`,
);

const failures = [];
if (kb(actual.gzip) > budget.firstPaintGzipKB) {
  failures.push(
    `gzip: ${kb(actual.gzip)} KB exceeds ${budget.firstPaintGzipKB} KB ` +
      `(+${kb(actual.gzip) - budget.firstPaintGzipKB} KB)`,
  );
}
if (kb(actual.raw) > budget.firstPaintRawKB) {
  failures.push(
    `raw: ${kb(actual.raw)} KB exceeds ${budget.firstPaintRawKB} KB ` +
      `(+${kb(actual.raw) - budget.firstPaintRawKB} KB)`,
  );
}

if (failures.length > 0) {
  console.error('Bundle budget exceeded:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    '\nFind out what grew with: ANALYZE=1 bun run build  (writes dist/stats.html)\n' +
      'A new dependency imported at module scope from a shell component is the usual\n' +
      'cause; a dynamic import() in the route that needs it is the usual fix.',
  );
  process.exit(1);
}

const headroomGzip = budget.firstPaintGzipKB - kb(actual.gzip);
if (headroomGzip >= 5) {
  console.log(
    `Under budget by ${headroomGzip} KB gzip. Lock it in with: ` +
      'bun run bundle:budget -- --write',
  );
} else {
  console.log('Bundle budget OK.');
}
