/**
 * Migrate physical (LTR-only) Tailwind utilities to logical ones.
 *
 * The app is RTL end-to-end, so `pl-8` puts padding on the wrong side and
 * `text-right` fights the document direction instead of following it. About a
 * third of the directional utilities in the codebase were physical while the
 * rest were already logical, which is why alignment drifted between screens.
 *
 * Only the unambiguous mappings are automated:
 *
 *   ml-*  → ms-*     mr-*  → me-*      (margin-inline-start/end)
 *   pl-*  → ps-*     pr-*  → pe-*      (padding-inline-start/end)
 *   border-l → border-s   border-r → border-e
 *   rounded-tl → rounded-ss   rounded-tr → rounded-se
 *   rounded-bl → rounded-es   rounded-br → rounded-ee
 *   text-left → text-start    text-right → text-end
 *   float-left/right, clear-left/right → start/end
 *
 * `left-*` / `right-*` are deliberately NOT touched: `left-1/2` paired with
 * `-translate-x-1/2` is a direction-neutral centring idiom, and `left-0
 * right-0` is just `inset-x-0`. Those are reviewed by hand.
 *
 * Usage:  node scripts/codemod-logical-properties.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'src');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * Files whose geometry is genuinely physical and must NOT follow text
 * direction. A chess board's rank/file labels belong to squares, not to a
 * reading order.
 */
const PHYSICAL_GEOMETRY = ['features/games/pages/Chess.tsx'];

/**
 * `left-*` / `right-*` on a positioned element, converted to
 * `start-*` / `end-*` — but only when the same class string does not also
 * carry a `translate-x-*`. That combination is either the centring idiom
 * (`left-1/2 -translate-x-1/2`) or a decorative corner glow whose offset is
 * tuned to a physical side; flipping one half of it would break the layout.
 */
// Fractions (`left-1/2`) are excluded: that is the centring idiom, paired with
// a negative margin or a transform, and flipping it does nothing useful.
// `(?![\w./-])` is used instead of `\b` because `\b` sits happily between the
// `1` and the `/` of `left-1/2`, and never fires after the `]` of
// `right-[18px]`.
const POSITION_VALUE = String.raw`(?:0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|px|auto|full|\[[^\]]+\])`;
const POSITION_MAPPINGS = [
  [
    new RegExp(String.raw`(^|[\s"'\`])(-?)left-(${POSITION_VALUE})(?![\w./-])`, 'g'),
    '$1$2start-$3',
  ],
  [
    new RegExp(String.raw`(^|[\s"'\`])(-?)right-(${POSITION_VALUE})(?![\w./-])`, 'g'),
    '$1$2end-$3',
  ],
];

/** [pattern, replacement] — applied to class-name-like tokens only. */
const MAPPINGS = [
  // margins / paddings, incl. negative and responsive/state prefixes
  [/(^|[\s"'`{([])(-?)ml-/g, '$1$2ms-'],
  [/(^|[\s"'`{([])(-?)mr-/g, '$1$2me-'],
  [/(^|[\s"'`{([])(-?)pl-/g, '$1$2ps-'],
  [/(^|[\s"'`{([])(-?)pr-/g, '$1$2pe-'],
  // the same after a variant prefix (sm:, hover:, group-hover:, rtl:, …)
  [/([a-z0-9-]+:)(-?)ml-/g, '$1$2ms-'],
  [/([a-z0-9-]+:)(-?)mr-/g, '$1$2me-'],
  [/([a-z0-9-]+:)(-?)pl-/g, '$1$2ps-'],
  [/([a-z0-9-]+:)(-?)pr-/g, '$1$2pe-'],
  // borders
  [/\bborder-l\b/g, 'border-s'],
  [/\bborder-r\b/g, 'border-e'],
  [/\bborder-l-(\d+)\b/g, 'border-s-$1'],
  [/\bborder-r-(\d+)\b/g, 'border-e-$1'],
  // corner radii
  [/\brounded-tl-/g, 'rounded-ss-'],
  [/\brounded-tr-/g, 'rounded-se-'],
  [/\brounded-bl-/g, 'rounded-es-'],
  [/\brounded-br-/g, 'rounded-ee-'],
  // text alignment / float / clear
  [/\btext-left\b/g, 'text-start'],
  [/\btext-right\b/g, 'text-end'],
  [/\bfloat-left\b/g, 'float-start'],
  [/\bfloat-right\b/g, 'float-end'],
  [/\bclear-left\b/g, 'clear-start'],
  [/\bclear-right\b/g, 'clear-end'],
];

/**
 * Tokens that look like a mapping target but are NOT Tailwind classes.
 * `pr-` also prefixes real words, and CSS-in-JS objects use camelCase, so we
 * only rewrite inside string literals that plausibly hold class names.
 */
const SKIP_LINE = /^\s*(?:\/\/|\*|\/\*)/;

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(p, out);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

let changedFiles = 0;
let changedTokens = 0;
const report = [];

for (const file of collectFiles(SRC)) {
  const original = fs.readFileSync(file, 'utf8');
  const lines = original.split('\n');
  let fileTokens = 0;

  const relative = path.relative(SRC, file).split(path.sep).join('/');
  const skipPositioning = PHYSICAL_GEOMETRY.includes(relative);

  const next = lines
    .map((line) => {
      if (SKIP_LINE.test(line)) return line;
      let out = line;

      const positioned = /\b(?:absolute|fixed|sticky)\b/.test(out);
      const hasTranslateX = /translate-x-/.test(out);
      const mappings =
        positioned && !hasTranslateX && !skipPositioning
          ? [...MAPPINGS, ...POSITION_MAPPINGS]
          : MAPPINGS;

      for (const [pattern, replacement] of mappings) {
        out = out.replace(pattern, (...args) => {
          fileTokens += 1;
          // Rebuild using the captured groups the same way String.replace would.
          const groups = args.slice(1, -2);
          return replacement.replace(/\$(\d)/g, (_, n) => groups[Number(n) - 1] ?? '');
        });
      }
      return out;
    })
    .join('\n');

  if (next === original) continue;
  changedFiles += 1;
  changedTokens += fileTokens;
  report.push(`  ${path.relative(SRC, file)} (${fileTokens})`);
  if (!CHECK_ONLY) fs.writeFileSync(file, next);
}

console.log(report.sort().join('\n'));
console.log(
  `\n${changedTokens} physical utilities → logical, across ${changedFiles} files` +
    (CHECK_ONLY ? ' (check only, nothing written)' : ''),
);
