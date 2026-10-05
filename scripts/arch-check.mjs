#!/usr/bin/env node
/**
 * Architecture gate.
 *
 * Builds the real import graph of `src/` (static imports, dynamic `import()`
 * and `require()`) and enforces the structural invariants that the 2026-10-05
 * audit found were documented but never checked.
 *
 * Each invariant has a budget in `arch-budget.json`, frozen at the value
 * measured when this gate was introduced. Budgets may only ever go DOWN.
 * Raising one is how `designSystem.test.ts` ended up with a `text-[Nrem]`
 * budget of 1800 against an actual count of 170 — a gate that cannot fail.
 *
 * Usage:
 *   node scripts/arch-check.mjs           verify against the budget
 *   node scripts/arch-check.mjs --write   re-baseline (must lower a number)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = 'src';
const BUDGET_FILE = path.resolve(import.meta.dirname, '../arch-budget.json');
const write = process.argv.includes('--write');

/* ── collect files ───────────────────────────────────────────────────────── */

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
  }
})(ROOT);

const isTest = (f) =>
  /\.(test|spec)\.tsx?$/.test(f) ||
  f.includes('__tests__') ||
  f.includes('__mocks__') ||
  f.startsWith(path.join('src', 'test'));

const prod = files.filter((f) => !isTest(f));
const known = new Set(files);

function resolveSpecifier(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join('src', spec.slice(2));
  else if (spec.startsWith('./') || spec.startsWith('../'))
    base = path.normalize(path.join(path.dirname(from), spec));
  else return null;

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

/** file -> Set<file> */
const edges = new Map();
for (const f of files) {
  const source = fs.readFileSync(f, 'utf8');
  const out = new Set();
  for (const m of source.matchAll(
    /(?:from\s*|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g,
  )) {
    const target = resolveSpecifier(f, m[1]);
    if (target && target !== f) out.add(target);
  }
  edges.set(f, out);
}

/* ── invariant 1: no import cycles (Tarjan) ──────────────────────────────── */

function findCycles() {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];

  function strongConnect(v) {
    idx.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of edges.get(v) ?? []) {
      if (!idx.has(w)) {
        strongConnect(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), idx.get(w)));
      }
    }

    if (low.get(v) === idx.get(v)) {
      const component = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      if (component.length > 1) cycles.push(component);
    }
  }

  for (const v of edges.keys()) if (!idx.has(v)) strongConnect(v);
  return cycles;
}

/* ── invariant 2: no orphan modules ──────────────────────────────────────── */

const ENTRY_POINTS = ['src/main.tsx', 'src/App.tsx', 'src/index.css'];

function findOrphans() {
  const referenced = new Set();
  for (const [, outs] of edges) for (const o of outs) referenced.add(o);
  return prod.filter(
    (f) =>
      !referenced.has(f) &&
      !ENTRY_POINTS.includes(f) &&
      !f.endsWith('.d.ts') &&
      // Vite resolves these by convention, not by import.
      !/src\/(vite-env|main)\./.test(f),
  );
}

/* ── invariant 3: feature isolation ──────────────────────────────────────── */

function featureOf(f) {
  const m = f.match(/^src\/features\/([^/]+)\//);
  return m ? m[1] : null;
}

function findCrossFeatureImports() {
  const violations = [];
  for (const [f, outs] of edges) {
    const from = featureOf(f);
    if (!from) continue;
    for (const o of outs) {
      const to = featureOf(o);
      if (!to || to === from) continue;
      // Importing a sibling feature through its public contract is legal.
      const isPublicContract =
        o === `src/features/${to}/index.ts` || o === `src/features/${to}/index.tsx`;
      if (!isPublicContract) violations.push(`${f} → ${o}`);
    }
  }
  return violations;
}

/* ── invariant 4: Supabase client confined to api.ts ─────────────────────── */

const CLIENT = 'src/integrations/supabase/client.ts';
const UNTYPED = 'src/integrations/supabase/untypedClient.ts';

function findRawSupabaseUsage() {
  const violations = [];
  for (const [f, outs] of edges) {
    if (f.startsWith('src/integrations/') || isTest(f)) continue;
    if (!outs.has(CLIENT) && !outs.has(UNTYPED)) continue;
    if (/(^|\/)api\.ts$/.test(f)) continue; // the sanctioned location
    violations.push(f);
  }
  return violations;
}

/* ── invariant 5: env access confined to the config module ───────────────── */

function findRawEnvUsage() {
  const violations = [];
  for (const f of files) {
    if (f === CLIENT || isTest(f)) continue;
    const source = fs.readFileSync(f, 'utf8');
    if (/import\.meta\.env\.VITE_SUPABASE_/.test(source)) violations.push(f);
  }
  return violations;
}

/* ── report ──────────────────────────────────────────────────────────────── */

const measured = {
  cycles: findCycles(),
  orphans: findOrphans(),
  crossFeatureImports: findCrossFeatureImports(),
  rawSupabaseUsage: findRawSupabaseUsage(),
  rawSupabaseEnvUsage: findRawEnvUsage(),
};

const counts = Object.fromEntries(
  Object.entries(measured).map(([k, v]) => [k, v.length]),
);

if (write) {
  fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(counts, null, 2)}\n`);
  console.log('arch-budget.json written:');
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

if (!fs.existsSync(BUDGET_FILE)) {
  console.error(`Missing ${BUDGET_FILE}. Run: node scripts/arch-check.mjs --write`);
  process.exit(1);
}

const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
let failed = false;

for (const [key, actual] of Object.entries(counts)) {
  const allowed = budget[key];
  if (allowed === undefined) {
    console.error(`✗ ${key}: no budget entry. Re-baseline with --write.`);
    failed = true;
    continue;
  }
  if (actual > allowed) {
    failed = true;
    console.error(`\n✗ ${key}: ${actual} (budget ${allowed}) — REGRESSION +${actual - allowed}`);
    for (const item of measured[key].slice(0, 10)) {
      console.error(`    ${Array.isArray(item) ? item.join(' ⇄ ') : item}`);
    }
    if (measured[key].length > 10) {
      console.error(`    … and ${measured[key].length - 10} more`);
    }
  } else if (actual < allowed) {
    console.log(`↓ ${key}: ${actual} (budget ${allowed}) — improved by ${allowed - actual}, lower the budget`);
  } else {
    console.log(`✓ ${key}: ${actual}`);
  }
}

if (failed) {
  console.error(
    '\nArchitecture budget exceeded.\n' +
      'These budgets exist to be lowered, never raised. If a number must go up,\n' +
      'that is an architecture decision and belongs in docs/adr/ — not a drive-by edit.',
  );
  process.exit(1);
}

console.log('\nArchitecture gate passed.');
