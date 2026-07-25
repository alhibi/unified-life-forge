/**
 * Sweep up the `true` literals left behind by the locale codemods.
 *
 * `codemod-drop-isar.mjs` substitutes `true` for the dead flag before it can
 * delete the declarations that produced it. That leaves three residues:
 *
 *   • `useEffect(fn, [true])`      — a constant dependency, i.e. run-once
 *   • `true ? a : b`               — always the first branch
 *   • `true && x` / `x && true`    — always `x`
 *
 * A literal in a dependency array is worse than noise: React compares it by
 * value, so the effect silently became run-once — which is what the original
 * `[isAr]` also did, but only by accident. Making it `[]` states the intent.
 *
 * Usage:  node scripts/codemod-collapse-true.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const SRC = path.resolve(import.meta.dirname, '..', 'src');

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => a.start - b.start || b.end - a.end);
  const accepted = [];
  let cursor = -1;
  for (const edit of sorted) {
    if (edit.start < cursor) continue;
    accepted.push(edit);
    cursor = edit.end;
  }
  let out = text;
  for (let i = accepted.length - 1; i >= 0; i -= 1) {
    out = out.slice(0, accepted[i].start) + accepted[i].text + out.slice(accepted[i].end);
  }
  return { out, count: accepted.length };
}

const HOOKS_WITH_DEPS = new Set([
  'useEffect',
  'useLayoutEffect',
  'useMemo',
  'useCallback',
  'useInsertionEffect',
]);

const isTrue = (node) => node.kind === ts.SyntaxKind.TrueKeyword;

const files = collectFiles(SRC);
let total = 0;

for (let pass = 1; pass <= 8; pass += 1) {
  let passEdits = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const edits = [];

    const visit = (node) => {
      // useEffect(fn, [true, …]) → drop the literal entries
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        HOOKS_WITH_DEPS.has(node.expression.text) &&
        node.arguments.length === 2 &&
        ts.isArrayLiteralExpression(node.arguments[1]) &&
        node.arguments[1].elements.some(isTrue)
      ) {
        const deps = node.arguments[1];
        const kept = deps.elements.filter((el) => !isTrue(el)).map((el) => el.getText(source));
        edits.push({
          start: deps.getStart(source),
          end: deps.getEnd(),
          text: `[${kept.join(', ')}]`,
        });
        return;
      }

      // true ? a : b → a
      if (ts.isConditionalExpression(node) && isTrue(node.condition)) {
        edits.push({
          start: node.getStart(source),
          end: node.getEnd(),
          text: node.whenTrue.getText(source),
        });
        return;
      }

      // true && x → x   /   x && true → x
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        if (isTrue(node.left)) {
          edits.push({
            start: node.getStart(source),
            end: node.getEnd(),
            text: node.right.getText(source),
          });
          return;
        }
        if (isTrue(node.right)) {
          edits.push({
            start: node.getStart(source),
            end: node.getEnd(),
            text: node.left.getText(source),
          });
          return;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
    if (!edits.length) continue;
    const { out, count } = applyEdits(text, edits);
    if (out === text) continue;
    fs.writeFileSync(file, out);
    passEdits += count;
  }

  total += passEdits;
  console.log(`pass ${pass}: ${passEdits} edits`);
  if (passEdits === 0) break;
}

console.log(`\n${total} residual \`true\` literals collapsed`);
