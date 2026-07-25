import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { KEPT_WEIGHTS, phosphorPruneWeights } from '../phosphorPruneWeights';

const ALL_WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const;
const PRUNED = ALL_WEIGHTS.filter((w) => !(KEPT_WEIGHTS as readonly string[]).includes(w));

const DEF_ID = '/x/node_modules/@phosphor-icons/react/dist/defs/Gear.es.js';

/** A stand-in for a real Phosphor def module, same shape, tiny payloads. */
function makeDef(weights: readonly string[]): string {
  const entries = weights
    .map(
      (w) =>
        `  [\n    "${w}",\n    /* @__PURE__ */ a.createElement(a.Fragment, null, ` +
        `/* @__PURE__ */ a.createElement("path", { d: "M0,0 [${w}] L1,1" }))\n  ]`,
    )
    .join(',\n');
  return `import * as a from "react";\nconst l = /* @__PURE__ */ new Map([\n${entries}\n]);\nexport {\n  l as default\n};\n`;
}

// `transform` is declared as an object hook on the plugin.
function runTransform(code: string, id: string) {
  const plugin = phosphorPruneWeights();
  const transform = plugin.transform as unknown as (
    this: unknown,
    code: string,
    id: string,
  ) => { code: string } | null;
  return transform.call({ info: () => {}, warn: () => {} }, code, id);
}

describe('phosphorPruneWeights', () => {
  it('keeps exactly the weights the app can render', () => {
    const result = runTransform(makeDef(ALL_WEIGHTS), DEF_ID);
    expect(result).not.toBeNull();

    for (const weight of KEPT_WEIGHTS) {
      expect(result!.code).toContain(`"${weight}"`);
      expect(result!.code).toContain(`[${weight}]`);
    }
    for (const weight of PRUNED) {
      expect(result!.code).not.toContain(`"${weight}"`);
      expect(result!.code).not.toContain(`[${weight}]`);
    }
  });

  it('produces a syntactically valid Map initialiser', () => {
    const code = runTransform(makeDef(ALL_WEIGHTS), DEF_ID)!.code;
    const body = code.slice(code.indexOf('new Map(['), code.lastIndexOf(']);') + 3);
    // Balanced brackets and one comma between each surviving entry.
    const open = (body.match(/\[/g) ?? []).length;
    const close = (body.match(/\]/g) ?? []).length;
    expect(open).toBe(close);
    expect(code).toMatch(/\]\n\]\);/);
    expect(code).not.toMatch(/,\s*\]\);/); // no dangling comma before the close
  });

  it('leaves non-Phosphor modules untouched', () => {
    expect(runTransform(makeDef(ALL_WEIGHTS), '/x/src/lib/icons.tsx')).toBeNull();
  });

  it('is a no-op when nothing would be removed', () => {
    expect(runTransform(makeDef(KEPT_WEIGHTS), DEF_ID)).toBeNull();
  });

  it('refuses to touch a module whose shape it does not recognise', () => {
    // No `regular` entry → the def format changed; bail out rather than risk
    // emitting a glyph the app cannot render.
    expect(runTransform(makeDef(['thin', 'light']), DEF_ID)).toBeNull();
    expect(runTransform('export default "not a map";', DEF_ID)).toBeNull();
  });

  it('does not corrupt path data containing brackets or quotes', () => {
    const tricky =
      'import * as a from "react";\nconst l = /* @__PURE__ */ new Map([\n' +
      '  ["regular", a.createElement("path", { d: "M0,0 [z] \\"q\\" (1)" })],\n' +
      '  ["duotone", a.createElement("path", { d: "M9,9 [drop]" })]\n]);\n' +
      'export { l as default };\n';
    const out = runTransform(tricky, DEF_ID)!.code;
    expect(out).toContain('M0,0 [z] \\"q\\" (1)');
    expect(out).not.toContain('[drop]');
  });
});

describe('icon weight usage in src/', () => {
  const SRC = path.resolve(import.meta.dirname, '..', '..', 'src');

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (/\.tsx?$/.test(entry.name)) out.push(p);
    }
    return out;
  }

  it('never requests a weight that the build prunes away', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const weight of PRUNED) {
        if (new RegExp(`weight\\s*[=:]\\s*['"\`]${weight}['"\`]`).test(text)) {
          offenders.push(`${path.relative(SRC, file)} → "${weight}"`);
        }
      }
    }
    // A pruned weight would render as an empty <svg>. If you need one of
    // these, add it to KEPT_WEIGHTS in build/phosphorPruneWeights.ts.
    expect(offenders).toEqual([]);
  });
});
