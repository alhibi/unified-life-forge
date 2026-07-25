/**
 * Final stage of the German removal: delete the dead `isAr` boolean that was
 * threaded through the chat / wellness / games component trees.
 *
 * After scripts/codemod-drop-german.mjs collapsed every `isAr ? ar : de`
 * conditional, `isAr` became a value that is always `true` and is never read
 * for a decision — a prop, a function parameter and an argument that exist
 * only to be passed along.
 *
 * The pass runs in dependency order and repeats to a fixpoint:
 *
 *   1. `isAr && X`               → `X`
 *   2. `isAr` as a bare read     → `true`   (so nothing is left dangling)
 *   3. `<C isAr={…} />`          → `<C />`
 *   4. `isAr: boolean;`          → removed  (interfaces / type literals)
 *   5. `{ isAr, … }`             → removed  (destructuring + object literals)
 *   6. `function f(a, isAr)`     → removed, and every call site's matching
 *                                  argument removed with it
 *   7. `const isAr = …;`         → removed once unused
 *
 * Step 6 is what an earlier attempt got wrong: it renamed by identifier
 * instead of by position, which deleted same-named bindings that were still
 * live and produced 1,907 compile errors. Parameter removal is now driven by
 * the TypeScript *type checker*, so a call site is only rewritten when the
 * checker resolves it to the exact declaration being changed.
 *
 * Verify with `bun run typecheck && bun run test` after running.
 *
 * Usage:  node scripts/codemod-drop-isar.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

// The dead flag was spelled differently in different corners of the app, and
// in the weather module it is simply `ar`. `ar` is NOT safe to target
// repo-wide — `chatNotify.ts` uses `{ ar: '…' }` as a locale-keyed *string*
// dictionary — so the caller scopes it with `--dir`.
//
//   node scripts/codemod-drop-isar.mjs
//   node scripts/codemod-drop-isar.mjs --names=ar --dir=src/weather
const args = process.argv.slice(2);
const argValue = (flag) =>
  args.find((a) => a.startsWith(`--${flag}=`))?.slice(flag.length + 3) ?? null;

/** Identifiers that named the dead flag. */
const TARGET_NAMES = new Set((argValue('names') ?? 'isAr,isArabic').split(','));

/** Expressions that are always `true` now that the app is Arabic-only. */
const ALWAYS_TRUE = new Set([
  ...TARGET_NAMES,
  ...[...TARGET_NAMES].flatMap((n) => [`chat.${n}`, `props.${n}`]),
]);

/** Restrict the rewrite to a sub-tree (repeatable, comma separated). */
const SCOPES = (argValue('dir') ?? 'src')
  .split(',')
  .map((d) => path.resolve(ROOT, d.trim()));

const normalize = (t) => t.replace(/\s+/g, ' ').trim();

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function createProgram(programFiles) {
  const configPath = path.join(ROOT, 'tsconfig.app.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  return ts.createProgram(programFiles, { ...parsed.options, noEmit: true });
}

/** Apply non-overlapping edits from the end of the file backwards. */
function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => a.start - b.start || b.end - a.end);
  const accepted = [];
  let cursor = -1;
  for (const edit of sorted) {
    if (edit.start < cursor) continue; // nested inside an accepted edit
    accepted.push(edit);
    cursor = edit.end;
  }
  let out = text;
  for (let i = accepted.length - 1; i >= 0; i -= 1) {
    out = out.slice(0, accepted[i].start) + (accepted[i].text ?? '') + out.slice(accepted[i].end);
  }
  return { out, count: accepted.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase A — expressions, JSX attributes, type members, destructuring, locals
// ─────────────────────────────────────────────────────────────────────────────
function phaseA(files) {
  let total = 0;

  for (let pass = 1; pass <= 10; pass += 1) {
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
      const full = source.getFullText();
      const edits = [];

      const dropMember = (node) => {
        const start = node.getFullStart();
        let end = node.getEnd();
        while (end < full.length && (full[end] === ',' || full[end] === ';')) end += 1;
        edits.push({ start, end, text: '' });
      };

      const visit = (node) => {
        // 1. `isAr && X` → `X`   /   `X && isAr` → `X`
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        ) {
          if (ALWAYS_TRUE.has(normalize(node.left.getText(source)))) {
            edits.push({
              start: node.getStart(source),
              end: node.getEnd(),
              text: node.right.getText(source),
            });
            return;
          }
          if (ALWAYS_TRUE.has(normalize(node.right.getText(source)))) {
            edits.push({
              start: node.getStart(source),
              end: node.getEnd(),
              text: node.left.getText(source),
            });
            return;
          }
        }

        // 3. `<C isAr={…} />`
        if (
          ts.isJsxAttribute(node) &&
          ts.isIdentifier(node.name) &&
          TARGET_NAMES.has(node.name.text)
        ) {
          edits.push({ start: node.getFullStart(), end: node.getEnd(), text: '' });
          return;
        }

        // 4. `isAr: boolean;` in an interface / type literal
        if (
          ts.isPropertySignature(node) &&
          ts.isIdentifier(node.name) &&
          TARGET_NAMES.has(node.name.text)
        ) {
          dropMember(node);
          return;
        }

        // 5. `{ isAr }` / `{ isAr: value }` — object literals AND destructuring
        if (
          (ts.isPropertyAssignment(node) ||
            ts.isShorthandPropertyAssignment(node) ||
            ts.isBindingElement(node)) &&
          node.name &&
          ts.isIdentifier(node.name) &&
          TARGET_NAMES.has(node.name.text) &&
          !node.propertyName
        ) {
          dropMember(node);
          return;
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
    console.log(`  phase A pass ${pass}: ${passEdits} edits`);
    if (passEdits === 0) break;
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase B — replace any *remaining* bare read of the flag with `true`
//
// Anything still standing is a value position the earlier phases could not
// simplify (a function argument, a dependency array entry, a ternary condition
// inside a template literal, …). Substituting the literal keeps the file
// compiling; phase C then removes the parameters that receive it, and the
// simplification phases collapse `true &&`/`? :` on the next fixpoint pass.
// ─────────────────────────────────────────────────────────────────────────────
function phaseB(files) {
  let total = 0;

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
      // `chat.isAr`, `props.isAr` → true
      if (
        ts.isPropertyAccessExpression(node) &&
        TARGET_NAMES.has(node.name.text) &&
        ALWAYS_TRUE.has(normalize(node.getText(source)))
      ) {
        edits.push({ start: node.getStart(source), end: node.getEnd(), text: 'true' });
        return;
      }
      // bare `isAr` identifier in a value position
      if (
        ts.isIdentifier(node) &&
        TARGET_NAMES.has(node.text) &&
        !ts.isPropertyAccessExpression(node.parent) &&
        !ts.isPropertyAssignment(node.parent) &&
        !ts.isShorthandPropertyAssignment(node.parent) &&
        !ts.isBindingElement(node.parent) &&
        !ts.isParameter(node.parent) &&
        !ts.isVariableDeclaration(node.parent) &&
        !ts.isPropertySignature(node.parent) &&
        !ts.isJsxAttribute(node.parent)
      ) {
        edits.push({ start: node.getStart(source), end: node.getEnd(), text: 'true' });
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
    if (!edits.length) continue;
    const { out, count } = applyEdits(text, edits);
    if (out === text) continue;
    fs.writeFileSync(file, out);
    total += count;
  }

  console.log(`  phase B: ${total} bare reads replaced with \`true\``);
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase C — remove `isAr` function parameters and their arguments
//
// Uses the type checker so a call site is only rewritten when its resolved
// signature is the declaration we are editing.
// ─────────────────────────────────────────────────────────────────────────────
function phaseC(files) {
  const program = createProgram(allFiles);
  const checker = program.getTypeChecker();

  /** declaration node -> parameter index to delete */
  const targets = new Map();

  for (const file of files) {
    const source = program.getSourceFile(file);
    if (!source) continue;

    const visit = (node) => {
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node)) &&
        node.parameters.length > 0
      ) {
        const index = node.parameters.findIndex(
          (p) => ts.isIdentifier(p.name) && TARGET_NAMES.has(p.name.text),
        );
        // Only trailing parameters can be dropped without renumbering the rest
        // of a call's arguments.
        if (index !== -1 && index === node.parameters.length - 1) {
          targets.set(node, index);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  if (targets.size === 0) {
    console.log('  phase C: no parameters to remove');
    return 0;
  }

  /** file -> edits */
  const editsByFile = new Map();
  const pushEdit = (fileName, edit) => {
    if (!editsByFile.has(fileName)) editsByFile.set(fileName, []);
    editsByFile.get(fileName).push(edit);
  };

  // 1. Delete the parameter itself.
  for (const [decl, index] of targets) {
    const source = decl.getSourceFile();
    const param = decl.parameters[index];
    const full = source.getFullText();
    let start = param.getFullStart();
    // swallow the preceding comma
    let i = start - 1;
    while (i >= 0 && /\s/.test(full[i])) i -= 1;
    if (full[i] === ',') start = i;
    pushEdit(source.fileName, { start, end: param.getEnd(), text: '' });
  }

  // 2. Delete the matching argument at every call site the checker links to a
  //    declaration we are editing.
  let callsPatched = 0;
  for (const file of files) {
    const source = program.getSourceFile(file);
    if (!source) continue;
    const full = source.getFullText();

    const visit = (node) => {
      if (ts.isCallExpression(node) && node.arguments.length > 0) {
        const signature = checker.getResolvedSignature(node);
        const decl = signature?.declaration;
        if (decl && targets.has(decl)) {
          const index = targets.get(decl);
          const arg = node.arguments[index];
          if (arg) {
            let start = arg.getFullStart();
            let i = start - 1;
            while (i >= 0 && /\s/.test(full[i])) i -= 1;
            if (full[i] === ',') start = i;
            pushEdit(source.fileName, { start, end: arg.getEnd(), text: '' });
            callsPatched += 1;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  for (const [fileName, edits] of editsByFile) {
    const text = fs.readFileSync(fileName, 'utf8');
    const { out } = applyEdits(text, edits);
    if (out !== text) fs.writeFileSync(fileName, out);
  }

  console.log(`  phase C: ${targets.size} parameters removed, ${callsPatched} call sites updated`);
  return targets.size + callsPatched;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase D — drop `const isAr = …` declarations that nothing reads any more
// ─────────────────────────────────────────────────────────────────────────────
function phaseD(files) {
  const program = createProgram(allFiles);
  let total = 0;

  for (const file of files) {
    const source = program.getSourceFile(file);
    if (!source) continue;

    const text = source.getFullText();
    const edits = [];
    const declarations = [];

    const collect = (node) => {
      if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.length === 1 &&
        ts.isIdentifier(node.declarationList.declarations[0].name) &&
        TARGET_NAMES.has(node.declarationList.declarations[0].name.text)
      ) {
        declarations.push(node);
      }
      ts.forEachChild(node, collect);
    };
    collect(source);
    if (declarations.length === 0) continue;

    // Count reads of each declared name outside its own declaration.
    for (const statement of declarations) {
      const name = statement.declarationList.declarations[0].name.getText(source);
      let reads = 0;
      const countReads = (node) => {
        if (ts.isIdentifier(node) && node.text === name) {
          const inOwnDecl =
            node.getStart(source) >= statement.getStart(source) &&
            node.getEnd() <= statement.getEnd();
          if (!inOwnDecl) reads += 1;
        }
        ts.forEachChild(node, countReads);
      };
      countReads(source);
      if (reads === 0) {
        edits.push({ start: statement.getFullStart(), end: statement.getEnd(), text: '' });
      }
    }

    if (!edits.length) continue;
    const { out, count } = applyEdits(text, edits);
    if (out === text) continue;
    fs.writeFileSync(file, out);
    total += count;
  }

  console.log(`  phase D: ${total} unused declarations removed`);
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase E — collapse the `true` literals the earlier phases introduced
// ─────────────────────────────────────────────────────────────────────────────
function phaseE(files) {
  let total = 0;

  for (let pass = 1; pass <= 6; pass += 1) {
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
        // `true ? a : b` → a   /   `true && x` → x
        if (
          ts.isConditionalExpression(node) &&
          node.condition.kind === ts.SyntaxKind.TrueKeyword
        ) {
          edits.push({
            start: node.getStart(source),
            end: node.getEnd(),
            text: node.whenTrue.getText(source),
          });
          return;
        }
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
          node.left.kind === ts.SyntaxKind.TrueKeyword
        ) {
          edits.push({
            start: node.getStart(source),
            end: node.getEnd(),
            text: node.right.getText(source),
          });
          return;
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
    console.log(`  phase E pass ${pass}: ${passEdits} edits`);
    if (passEdits === 0) break;
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────

// The type checker still needs the whole program, but only files inside the
// requested scope are rewritten.
const allFiles = collectFiles(SRC);
const files = allFiles.filter((f) => SCOPES.some((dir) => f === dir || f.startsWith(dir + path.sep)));
console.log(`scanning ${files.length} of ${allFiles.length} files (scope: ${SCOPES.map((d) => path.relative(ROOT, d)).join(', ')})\n`);

let grand = 0;
grand += phaseA(files);
grand += phaseB(files);
grand += phaseC(files);
grand += phaseE(files);
grand += phaseA(files); // re-simplify after parameters disappeared
grand += phaseD(files);

console.log(`\n${grand} total edits — run \`bun run typecheck && bun run test\` now`);
