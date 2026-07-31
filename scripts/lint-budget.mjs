#!/usr/bin/env node
/**
 * Lint budget: a ratchet for the warnings we have not fixed yet.
 *
 * Several rules in eslint.config.js are deliberately demoted to "warn" because
 * the repo has a real backlog against them (see the comment block there). A
 * warning nobody counts is a warning that grows, so this script freezes the
 * current per-rule counts in lint-budget.json and fails when any of them goes
 * up. The debt can shrink freely; it cannot grow.
 *
 *   bun run lint:budget            check against the committed budget
 *   bun run lint:budget -- --write rewrite the budget from the current tree
 *
 * Use --write only to record a REDUCTION. If it lowers a number, commit it.
 * If it raises one, you are recording a regression — fix the finding instead.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const BUDGET_FILE = path.resolve(import.meta.dirname, '../lint-budget.json');
const write = process.argv.includes('--write');

function runEslint() {
  // The report is several megabytes. Capturing it through stdout made this
  // script depend on the runtime honouring `maxBuffer` — Bun's `node` shim does
  // not, so the JSON arrived truncated and the script died on
  // `SyntaxError: Unterminated string` instead of reporting the budget.
  // `--output-file` moves the payload out of the pipe entirely, which is
  // correct on every runtime rather than on the one we happened to test.
  const dir = mkdtempSync(path.join(tmpdir(), 'lint-budget-'));
  const reportFile = path.join(dir, 'eslint.json');
  try {
    // ESLint exits non-zero when it reports errors; the report is still written.
    try {
      execFileSync('bunx', ['eslint', '.', '-f', 'json', '--output-file', reportFile], {
        stdio: ['ignore', 'ignore', 'inherit'],
      });
    } catch (err) {
      // Only a missing report means the run itself failed.
      try {
        readFileSync(reportFile, 'utf8');
      } catch {
        throw err;
      }
    }
    return JSON.parse(readFileSync(reportFile, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const results = runEslint();

const warnings = {};
let errorCount = 0;
for (const file of results) {
  for (const m of file.messages) {
    if (m.severity === 2) {
      errorCount += 1;
      continue;
    }
    const rule = m.ruleId ?? '(unknown)';
    warnings[rule] = (warnings[rule] ?? 0) + 1;
  }
}

const total = Object.values(warnings).reduce((a, b) => a + b, 0);

if (write) {
  const sorted = Object.fromEntries(Object.entries(warnings).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BUDGET_FILE,
    `${JSON.stringify({ total, rules: sorted }, null, 2)}\n`,
    'utf8',
  );
  console.log(`lint-budget.json written: ${total} warnings across ${Object.keys(sorted).length} rules`);
  process.exit(0);
}

let budget;
try {
  budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
} catch {
  console.error(
    `Could not read ${path.relative(process.cwd(), BUDGET_FILE)}.\n` +
      'Create it with: bun run lint:budget -- --write',
  );
  process.exit(1);
}

const regressions = [];
const improvements = [];
const rules = new Set([...Object.keys(budget.rules ?? {}), ...Object.keys(warnings)]);

for (const rule of [...rules].sort()) {
  const allowed = budget.rules?.[rule] ?? 0;
  const actual = warnings[rule] ?? 0;
  if (actual > allowed) regressions.push({ rule, allowed, actual });
  else if (actual < allowed) improvements.push({ rule, allowed, actual });
}

if (errorCount > 0) {
  // `bun run lint` is the gate for errors; say so rather than double-failing
  // with a confusing message.
  console.error(`ESLint reported ${errorCount} error(s). Run: bun run lint`);
  process.exit(1);
}

if (improvements.length > 0) {
  console.log('Improved since the budget was recorded:');
  for (const { rule, allowed, actual } of improvements) {
    console.log(`  ${rule}: ${allowed} -> ${actual}  (-${allowed - actual})`);
  }
  console.log('Lock it in with: bun run lint:budget -- --write\n');
}

if (regressions.length > 0) {
  console.error('Lint budget exceeded. These rules regressed:\n');
  for (const { rule, allowed, actual } of regressions) {
    console.error(`  ${rule}: budget ${allowed}, found ${actual}  (+${actual - allowed})`);
  }
  console.error(
    '\nFix the new findings. Raising the budget hides them — that is what put ' +
      'this repo 635 errors deep in the first place.',
  );
  process.exit(1);
}

console.log(`Lint budget OK: ${total} warnings, none above budget (${budget.total} allowed).`);
