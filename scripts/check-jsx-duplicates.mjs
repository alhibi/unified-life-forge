#!/usr/bin/env node
/**
 * JSX duplicate-attribute guard.
 *
 * A duplicated JSX attribute (e.g. two className= on one element) is accepted by
 * esbuild/SWC and silently keeps the LAST one. MihrabTabs shipped a second
 * className/style pair that nulled the panel's focus ring and its motion style
 * for an unknown number of revisions — this check makes that class of bug
 * impossible to reintroduce.
 *
 *   node scripts/check-jsx-duplicates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx$/.test(entry.name)) files.push(full);
  }
}
walk(SRC);

const problems = [];
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const seen = new Map();
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText(source);
        if (seen.has(name)) {
          const { line } = source.getLineAndCharacterOfPosition(attr.getStart(source));
          const first = seen.get(name);
          problems.push(path.relative(ROOT, file) + ':' + (line + 1) + ' duplicate attribute "' + name + '" (first at line ' + (first + 1) + ')');
        } else {
          const { line } = source.getLineAndCharacterOfPosition(attr.getStart(source));
          seen.set(name, line + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (problems.length) {
  console.error('Duplicate JSX attributes found (last one silently wins):');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('✓ no duplicate JSX attributes in ' + files.length + ' TSX files');
