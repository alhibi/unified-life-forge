import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guard against the most dangerous silent failure in a Tailwind codebase:
 * a component using a token class that the config never defines.
 *
 * In Tailwind CSS v4, custom theme parameters are defined under `@theme` or `@utility`
 * inside `src/index.css`. This test parses the stylesheet to make sure all used
 * tokens are registered.
 */

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const INDEX_CSS = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8');
const SRC = path.join(ROOT, 'src');

/** Extract the keys of a `@theme` or `@utility` scale. */
function scaleKeys(scale: string): string[] {
  if (scale === 'zIndex') {
    // In index.css: --z-index-<name>: <value>;
    const matches = INDEX_CSS.matchAll(/^\s*--z-index-([a-z0-9-]+)\s*:/gm);
    return [...matches].map((m) => m[1]);
  }
  if (scale === 'fontSize') {
    // In index.css: @utility text-<name> {
    const matches = INDEX_CSS.matchAll(/^\s*@utility text-([a-z0-9-]+)\s*\{/gm);
    return [...matches].map((m) => m[1]);
  }
  return [];
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
    'xs',
    'sm',
    'base',
    'lg',
    'xl',
    '2xl',
    '3xl',
    '4xl',
    '5xl',
    '6xl',
    '7xl',
    '8xl',
    '9xl',
  ],
};

describe.each([
  { scale: 'zIndex', prefix: 'z' },
  { scale: 'fontSize', prefix: 'text' },
])('$prefix-* classes resolve', ({ scale, prefix }) => {
  it('every used token exists in src/index.css', () => {
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
        if (
          scale === 'zIndex' &&
          !/^(base|scrim|raised|sticky|header|float|drawer|sheet|picker|nested|deep|fullscreen|player|queue|overlay|lightbox|toast)(-above)?$/.test(
            name,
          )
        ) {
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
        if (
          /^(base|scrim|raised|sticky|header|float|drawer|sheet|picker|nested|deep|fullscreen|player|queue|overlay|lightbox|toast)(-above)?$/.test(
            match[1],
          )
        ) {
          used.add(match[1]);
        }
      }
    }
    expect(used.size).toBeGreaterThan(5);

    // In Tailwind CSS v4, we can look for .z-<name> or similar rule in index-*.css
    const notEmitted = [...used].filter((name) => !css!.includes(`.z-${name}`) && !css!.includes(`--z-index-${name}`));
    expect(notEmitted).toEqual([]);
  });
});
