import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guard against the most dangerous silent failure in a Tailwind codebase:
 * a component using a token class that the config never defines.
 *
 * Tailwind does not warn about `z-overlay` when `zIndex.overlay` is missing —
 * it simply emits nothing, the element gets no z-index, and a modal quietly
 * renders behind the page. That is exactly what happened to the z-index ladder
 * partway through this refactor.
 *
 * Every custom scale added under `theme.extend` gets checked: if `src/` uses
 * `<prefix>-<name>` then `<name>` must exist in the config.
 */

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CONFIG = fs.readFileSync(path.join(ROOT, 'tailwind.config.ts'), 'utf8');
const SRC = path.join(ROOT, 'src');

/** Extract the keys of a `theme.extend.<scale>` object literal. */
function scaleKeys(scale: string): string[] {
  const start = CONFIG.indexOf(`${scale}: {`);
  if (start === -1) return [];
  let depth = 0;
  let end = start;
  for (let i = CONFIG.indexOf('{', start); i < CONFIG.length; i += 1) {
    if (CONFIG[i] === '{') depth += 1;
    else if (CONFIG[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = CONFIG.slice(start, end);
  return [...body.matchAll(/^\s{6,}"?([a-z0-9-]+)"?\s*:/gm)].map((m) => m[1]);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

const SOURCES = walk(SRC).map((f) => ({
  file: path.relative(SRC, f),
  text: fs.readFileSync(f, 'utf8'),
}));

/** Tailwind names that exist by default and need no config entry. */
const BUILTIN: Record<string, string[]> = {
  zIndex: ['0', '10', '20', '30', '40', '50', 'auto'],
  fontSize: [
    'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
  ],
};

describe.each([
  { scale: 'zIndex', prefix: 'z' },
  { scale: 'fontSize', prefix: 'text' },
])('$prefix-* classes resolve', ({ scale, prefix }) => {
  it('every used token exists in tailwind.config.ts', () => {
    const defined = new Set([...scaleKeys(scale), ...(BUILTIN[scale] ?? [])]);
    expect(defined.size).toBeGreaterThan(0);

    // Only flag purely alphabetic token names. Numeric and bracket values
    // (`text-[11px]`, `z-10`) are covered by the design-system budgets.
    const pattern = new RegExp(`\\b${prefix}-([a-z][a-z-]{2,})\\b`, 'g');
    const missing = new Map<string, string[]>();

    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(pattern)) {
        const name = match[1];
        if (defined.has(name)) continue;
        // Skip words that merely start with the prefix, e.g. `text-foreground`
        // (a colour) or `z-index`. Colours live on a different scale, and this
        // test only owns the two scales above.
        if (scale === 'fontSize' && !/^(micro|mini|meta|body|lead|title|display)$/.test(name)) {
          continue;
        }
        if (scale === 'zIndex' && !/^(base|scrim|raised|sticky|header|float|drawer|sheet|picker|nested|deep|fullscreen|player|queue|overlay|lightbox|toast)(-above)?$/.test(name)) {
          continue;
        }
        if (!missing.has(name)) missing.set(name, []);
        missing.get(name)!.push(file);
      }
    }

    expect(Object.fromEntries(missing)).toEqual({});
  });
});

describe('generated CSS', () => {
  const cssDir = path.join(ROOT, 'dist', 'assets');
  const css = fs.existsSync(cssDir)
    ? fs
        .readdirSync(cssDir)
        .filter((f) => f.startsWith('index-') && f.endsWith('.css'))
        .map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8'))
        .join('\n')
    : null;

  it.runIf(css)('emits a rule for every z-index token the app uses', () => {
    const used = new Set<string>();
    for (const { text } of SOURCES) {
      for (const match of text.matchAll(/\bz-([a-z][a-z-]{2,})\b/g)) {
        if (/^(base|scrim|raised|sticky|header|float|drawer|sheet|picker|nested|deep|fullscreen|player|queue|overlay|lightbox|toast)(-above)?$/.test(match[1])) {
          used.add(match[1]);
        }
      }
    }
    expect(used.size).toBeGreaterThan(5);

    const notEmitted = [...used].filter((name) => !css!.includes(`.z-${name}{`));
    expect(notEmitted).toEqual([]);
  });
});
