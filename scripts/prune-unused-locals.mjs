/**
 * Delete provably-unused local declarations that ESLint reports.
 *
 * Used as the final stage of the German removal: once every
 * `isAr ? 'عربي' : 'Deutsch'` conditional was collapsed, hundreds of
 * `const isAr = language === 'ar';` lines (and their `language`
 * destructuring) became dead. ESLint's `unused-imports/no-unused-vars`
 * proves they are unreachable, so removing them is safe — but it cannot
 * auto-fix variable declarations, only imports.
 *
 * Only names on the allowlist are touched, so this can never delete a
 * variable that is merely awaiting a future use.
 *
 * Usage:  node scripts/prune-unused-locals.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Names safe to delete when ESLint says they are unused. */
const ALLOWLIST = new Set(['isAr', 'isArabic', 'lang', 'language', 'ar', 'nextDe', 'isDe']);

/** True when the binding element belongs to a function/method parameter. */
function isInParameter(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isParameter(p)) return true;
    if (ts.isVariableDeclaration(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

// ESLint exits 1 whenever it reports an error, which is the normal case
// here — read stdout regardless of the exit status.
function runEslintJson() {
  try {
    return execFileSync('npx', ['eslint', '.', '-f', 'json'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (err) {
    if (typeof err.stdout === 'string' && err.stdout.startsWith('[')) return err.stdout;
    throw err;
  }
}

const report = JSON.parse(runEslintJson());

/**
 * file -> Map<"line:column", name>
 *
 * Reported positions are tracked, not just names. Matching by name alone
 * deleted EVERY `isAr` binding in a file when only one of several
 * same-named bindings was unused, which broke 374 call sites.
 */
const byFile = new Map();
for (const file of report) {
  for (const msg of file.messages) {
    if (msg.ruleId !== 'unused-imports/no-unused-vars') continue;
    const name = /'([^']+)'/.exec(msg.message)?.[1];
    if (!name || !ALLOWLIST.has(name)) continue;
    if (!byFile.has(file.filePath)) byFile.set(file.filePath, new Map());
    byFile.get(file.filePath).set(`${msg.line}:${msg.column}`, name);
  }
}

let removed = 0;

for (const [file, positions] of byFile) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const full = source.getFullText();
  const edits = [];
  const names = new Set();

  /** Does the identifier sit exactly where ESLint reported an unused var? */
  const isReported = (nameNode) => {
    const { line, character } = source.getLineAndCharacterOfPosition(nameNode.getStart(source));
    const key = `${line + 1}:${character + 1}`;
    const reportedName = positions.get(key);
    if (reportedName !== nameNode.text) return false;
    names.add(nameNode.text);
    return true;
  };

  const visit = (node) => {
    // `const isAr = …;` — whole statement goes.
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length === 1 &&
      ts.isIdentifier(node.declarationList.declarations[0].name) &&
      isReported(node.declarationList.declarations[0].name)
    ) {
      edits.push({ start: node.getFullStart(), end: node.getEnd() });
      return;
    }

    // `const { t, language } = useApp();` — drop just the binding element.
    // Skipped for function parameters: removing a destructured prop there
    // changes a component's public shape, which is not this script's job.
    if (
      ts.isBindingElement(node) &&
      ts.isIdentifier(node.name) &&
      !node.propertyName &&
      !isInParameter(node) &&
      isReported(node.name)
    ) {
      let end = node.getEnd();
      while (end < full.length && full[end] === ',') end += 1;
      while (end < full.length && (full[end] === ' ' || full[end] === '\t')) end += 1;
      edits.push({ start: node.getStart(source), end });
      return;
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  if (!edits.length) continue;
  edits.sort((a, b) => a.start - b.start);
  let out = text;
  for (let i = edits.length - 1; i >= 0; i -= 1) {
    out = out.slice(0, edits[i].start) + out.slice(edits[i].end);
  }
  fs.writeFileSync(file, out);
  removed += edits.length;
  console.log(`${path.relative(ROOT, file)}: -${edits.length} (${[...names].join(', ')})`);
}

console.log(`\nremoved ${removed} unused declarations across ${byFile.size} files`);
