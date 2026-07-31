#!/usr/bin/env bun
/**
 * Generates the per-library icon registries that src/lib/icons.tsx renders from.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * The icon layer supports four switchable libraries. It used to do that by
 * namespace-importing all four and looking each glyph up by string at render
 * time:
 *
 *     import * as HugeMod from 'hugeicons-react';
 *     const HugeLib = HugeMod as Record<string, FC | undefined>;
 *     ...
 *     return HugeLib[names.h] ?? LucideLib[names.l] ?? PhosLib[names.p];
 *
 * A string index is opaque to a bundler. Rollup cannot prove which of the 4,654
 * hugeicons exports are reachable, so it keeps every one — and the same for the
 * other three. The measured result was an 11 MB entry chunk (1.97 MB gzipped,
 * loaded by a blocking `<script>`) of which 7,990 KB — 96% — was icon path data,
 * plus a further 2.5 MB of Phosphor in a preloaded chunk. The app renders 242
 * glyphs.
 *
 * All four packages are ESM with `sideEffects: false`, so *static* named imports
 * tree-shake perfectly. The only thing standing in the way was the dynamic
 * lookup. This script moves that lookup to build time: it resolves every glyph
 * against the libraries' real exports — applying exactly the fallback chain the
 * runtime used to apply — and emits plain static imports.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *     bun run icons:generate
 *
 * Re-run it after adding an icon to ICON_NAMES in src/lib/icons/names.ts. The
 * generated files are committed: the build must not depend on this script, and a
 * reviewer should see the import list change.
 *
 * `src/lib/icons/__tests__/registry.test.ts` fails if the committed output does
 * not match what this script would produce, so it cannot go stale unnoticed.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { ICON_NAMES, TABLER_NAME_FALLBACKS } from '../src/lib/icons/names.ts';

const OUT_DIR = path.resolve(import.meta.dirname, '../src/lib/icons');

/** The four libraries, in the order their registries are emitted. */
const LIBRARIES = [
  { set: 'phosphor', pkg: '@phosphor-icons/react' },
  { set: 'lucide', pkg: 'lucide-react' },
  { set: 'tabler', pkg: '@tabler/icons-react' },
  { set: 'hugeicons', pkg: 'hugeicons-react' },
];

/**
 * Resolves one canonical icon to a real export name in one library.
 *
 * This is a faithful port of the old `pickComponent`, with one deliberate
 * difference: the cross-library fallbacks are gone. Falling back from tabler to
 * lucide to phosphor is what made all four libraries reachable from every set,
 * and it also meant a user who picked "tabler" silently got lucide glyphs for the
 * awkward names. Each registry now resolves within its own library and reports
 * what it could not find, so the gaps are visible instead of papered over.
 */
function resolve(set, names, exportNames) {
  const has = (n) => (n && exportNames.has(n) ? n : undefined);

  if (set === 'phosphor') return has(names.p);
  if (set === 'lucide') return has(names.l) ?? has(names.p);
  if (set === 'hugeicons') return has(names.h);

  // Tabler renames aggressively (CheckCircle2 → IconCircleCheck). Try the
  // declared name, the curated alternates, the `Icon` + lucide-name form, then
  // the word-swap heuristic the runtime used.
  const swapped = names.l.replace(
    /^([A-Z][a-z0-9]+)([A-Z][a-zA-Z0-9]+)$/,
    (_m, a, b) => `Icon${b}${a}`,
  );
  return (
    has(names.t) ??
    (TABLER_NAME_FALLBACKS[names.l] ?? []).map(has).find(Boolean) ??
    has(`Icon${names.l}`) ??
    has(swapped) ??
    has(`Icon${names.p}`)
  );
}

function banner(set, pkg, resolved, missing) {
  return `/**
 * GENERATED FILE — do not edit.
 *
 * Produced by scripts/generate-icon-registry.mjs from ICON_NAMES in
 * src/lib/icons/names.ts. Run \`bun run icons:generate\` after changing that list.
 *
 * Static named imports from ${pkg}, so the bundler ships only the ${resolved}
 * glyphs this app renders instead of the whole library. The previous runtime
 * \`Lib[name]\` lookup was opaque to tree-shaking and cost 8 MB in the entry chunk.
 *${
   missing.length
     ? `
 * ${missing.length} canonical icon(s) have no counterpart in this library and are
 * absent from the map below; icons.tsx falls back to the default set for those:
 *   ${missing.join(', ')}
 *`
     : `
 * Every canonical icon resolved in this library.
 *`
 }/`;
}

let failed = false;
const summary = [];

for (const { set, pkg } of LIBRARIES) {
  const mod = await import(pkg);
  const exportNames = new Set(Object.keys(mod));

  /** canonical name → export name in this library */
  const pairs = [];
  const missing = [];

  for (const [canonical, names] of Object.entries(ICON_NAMES)) {
    const exportName = resolve(set, names, exportNames);
    if (exportName) pairs.push([canonical, exportName]);
    else missing.push(canonical);
  }

  // Two canonical icons can legitimately map to the same export (e.g. Utensils
  // and UtensilsCrossed both → IconToolsKitchen2), so imports are deduped and
  // aliased once.
  //
  // Sorted by export name, and the aliases numbered in that same order, so the
  // emitted file already satisfies `simple-import-sort` and the generator's output
  // needs no follow-up autofix to be lint-clean.
  // Collation must match eslint-plugin-simple-import-sort, or `bun run lint` asks
  // for an autofix on a freshly generated file and `bun run verify` cannot pass
  // straight after `icons:generate`. The plugin compares case-insensitively and
  // treats digit runs numerically, so `Activity` sorts before `ALargeSmall` and
  // `Archive2` before `Archive10` — neither of which a plain `.sort()` produces.
  const collator = new Intl.Collator('en', { numeric: true, caseFirst: 'false' });
  const sortedExports = [...new Set(pairs.map(([, exportName]) => exportName))].sort((a, b) =>
    collator.compare(a.toLowerCase(), b.toLowerCase()) || collator.compare(a, b),
  );
  const byExport = new Map(sortedExports.map((exportName, i) => [exportName, `I${i}`]));

  const imports = [...byExport]
    .map(([exportName, alias]) => `  ${exportName} as ${alias},`)
    .join('\n');

  const entries = pairs
    .map(([canonical, exportName]) => `  ${canonical}: ${byExport.get(exportName)},`)
    .join('\n');

  const body = `${banner(set, pkg, pairs.length, missing)}

import {
${imports}
} from '${pkg}';

import type { IconRegistry } from './registry-types';

// One assertion, at the one place four foreign prop types meet the app's single
// internal one. ${pkg} declares \`stroke\`/\`strokeWidth\` differently from the
// other three libraries, and because function parameters are contravariant a
// component accepting narrower props is not assignable to one accepting wider
// props — even though passing it fewer props is exactly what icons.tsx does.
//
// The alternative was widening IconRegistry to \`ComponentType<any>\`, which would
// erase the prop types for all four. Asserting here keeps them checked everywhere
// else, and registry.test.ts verifies at runtime what this cannot: that every
// manifest name maps to a real component.
export const registry = {
${entries}
} as unknown as IconRegistry;

export default registry;
`;

  const file = path.join(OUT_DIR, `registry.${set}.ts`);
  writeFileSync(file, body, 'utf8');

  summary.push({ set, resolved: pairs.length, missing: missing.length, imports: byExport.size });

  // Phosphor and lucide are the two the app is designed around; a gap there is a
  // real regression rather than a library that simply lacks the glyph.
  if ((set === 'phosphor' || set === 'lucide') && missing.length > 0) {
    console.error(`  ✗ ${set}: ${missing.length} unresolved — ${missing.join(', ')}`);
    failed = true;
  }
}

// ── The public export list in icons.tsx ─────────────────────────────────────
//
// Rewritten from the same manifest so the three artefacts — names.ts, the four
// registries, and the exports — cannot drift. Hand-maintaining 242 export lines
// is exactly the kind of list that silently grows a name no registry resolves.
{
  const iconsFile = path.resolve(import.meta.dirname, '../src/lib/icons.tsx');
  const src = readFileSync(iconsFile, 'utf8');
  const MARKER = '/*  Public icon exports                                                       */\n/* ------------------------------------------------------------------------- */\n';
  const cut = src.indexOf(MARKER);
  if (cut === -1) {
    console.error('Could not find the public-export marker in src/lib/icons.tsx.');
    process.exit(1);
  }
  const head = src.slice(0, cut + MARKER.length);
  const helper = readFileSync(
    path.resolve(import.meta.dirname, 'icon-export-helper.txt'),
    'utf8',
  );
  const exports = Object.keys(ICON_NAMES)
    .map((n) => `export const ${n} = /*#__PURE__*/ icon('${n}');`)
    .join('\n');
  writeFileSync(iconsFile, `${head}${helper}${exports}\n`, 'utf8');
}

const total = Object.keys(ICON_NAMES).length;
console.log(`Generated ${LIBRARIES.length} registries + ${total} exports in icons.tsx:\n`);
for (const s of summary) {
  console.log(
    `  ${s.set.padEnd(10)} ${String(s.resolved).padStart(3)}/${total} resolved` +
      ` (${s.imports} distinct imports)` +
      (s.missing ? `, ${s.missing} missing` : ''),
  );
}

if (failed) process.exit(1);
