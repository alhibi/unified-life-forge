/**
 * Guards the icon layer's three generated artefacts against drift.
 *
 * `src/lib/icons/names.ts` is the manifest. From it, `bun run icons:generate`
 * produces the four `registry.<set>.ts` files and the 242 `export const` lines at
 * the bottom of `icons.tsx`. Nothing at build time re-derives any of that, so if
 * the committed output stops matching the manifest the failure is silent: an icon
 * added to the manifest but missing from a registry renders the fallback set's
 * glyph, and an export whose name no longer exists in the manifest is a
 * type error only if someone happens to import it.
 *
 * These tests are the check. They read the files as text — no bundler, no
 * rendering — so they run in milliseconds and fail with a message that names the
 * command to run.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ICON_NAME_LIST, ICON_NAMES } from '../names';
import hugeicons from '../registry.hugeicons';
import lucide from '../registry.lucide';
import phosphor from '../registry.phosphor';
import tabler from '../registry.tabler';

const ICONS_TSX = path.resolve(import.meta.dirname, '../../icons.tsx');

/** The file as written. Used where the assertion is about exact source text. */
const iconsSrc = fs.readFileSync(ICONS_TSX, 'utf8');

/**
 * The same file with comments removed.
 *
 * The "no namespace import" and "no `export *`" bans are about code. icons.tsx
 * documents at length why those two patterns were removed and quotes both of
 * them, so matching the raw text made the header comment fail the test — writing
 * the lesson down looked identical to repeating the mistake.
 *
 * Only for the two ban assertions: stripping block comments also removes the
 * `#__PURE__` annotations, which the export-list assertions do need to see.
 */
const iconsCode = iconsSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const REGISTRIES = { phosphor, lucide, tabler, hugeicons } as const;
const REGEN = 'Run `bun run icons:generate`.';

describe('icon manifest', () => {
  it('is not empty', () => {
    expect(ICON_NAME_LIST.length).toBeGreaterThan(200);
  });

  it('names a glyph in all four libraries for every icon', () => {
    const gaps: string[] = [];
    for (const [canonical, names] of Object.entries(ICON_NAMES)) {
      for (const key of ['p', 'l', 't', 'h'] as const) {
        if (!names[key]) gaps.push(`${canonical}.${key}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('never uses a placeholder name for a whole family of icons', () => {
    // 51 hugeicons entries were all set to 'SearchIcon' — a name that does not
    // exist in the library, so all 51 silently fell through to lucide and the
    // default icon set was 21% the wrong family. A name repeated across many
    // unrelated icons is the signature of that mistake.
    for (const key of ['p', 'l', 't', 'h'] as const) {
      const counts = new Map<string, string[]>();
      for (const [canonical, names] of Object.entries(ICON_NAMES)) {
        const list = counts.get(names[key]) ?? [];
        list.push(canonical);
        counts.set(names[key], list);
      }
      const suspicious = [...counts.entries()]
        .filter(([, users]) => users.length > 4)
        .map(([name, users]) => `${key}:${name} used by ${users.length} icons`);
      expect(suspicious, `a shared name this widely reused is a placeholder`).toEqual([]);
    }
  });
});

describe('generated registries', () => {
  for (const [set, registry] of Object.entries(REGISTRIES)) {
    it(`${set} resolves every icon in the manifest`, () => {
      const missing = ICON_NAME_LIST.filter((name) => !registry[name]);
      expect(missing, `${set} is missing ${missing.length} icon(s). ${REGEN}`).toEqual([]);
    });

    it(`${set} exports no icon absent from the manifest`, () => {
      const known = new Set<string>(ICON_NAME_LIST);
      const extra = Object.keys(registry).filter((name) => !known.has(name));
      expect(extra, `${set} has stale entries. ${REGEN}`).toEqual([]);
    });

    it(`${set} maps every icon to an actual component`, () => {
      const bad = ICON_NAME_LIST.filter((name) => {
        const component = registry[name];
        return typeof component !== 'function' && typeof component !== 'object';
      });
      expect(bad).toEqual([]);
    });
  }

  it('uses static named imports, never a namespace import', () => {
    // This is the whole point. A namespace import is opaque to tree-shaking and
    // is what put 8 MB of icon data in the entry chunk; if one reappears here the
    // regression is invisible until someone measures the bundle again.
    for (const set of Object.keys(REGISTRIES)) {
      const file = path.resolve(import.meta.dirname, `../registry.${set}.ts`);
      const src = fs.readFileSync(file, 'utf8');
      expect(src, `registry.${set}.ts must not namespace-import`).not.toMatch(
        /import\s+\*\s+as/,
      );
      expect(src).toMatch(/^import \{$/m);
    }
  });
});

describe('icons.tsx public exports', () => {
  const exported = [
    ...iconsSrc.matchAll(/^export const ([A-Za-z0-9_]+) = \/\*#__PURE__\*\/ icon\('([A-Za-z0-9_]+)'\);$/gm),
  ];

  it('exports exactly the manifest, no more and no less', () => {
    const names = exported.map((m) => m[1]).sort();
    expect(names, REGEN).toEqual([...ICON_NAME_LIST].sort());
  });

  it('passes each export its own name', () => {
    const wrong = exported.filter((m) => m[1] !== m[2]).map((m) => `${m[1]} → icon('${m[2]}')`);
    expect(wrong, REGEN).toEqual([]);
  });

  it('does not re-export a whole icon library', () => {
    // `export * from 'lucide-react'` used to sit at the bottom as a catch-all.
    // Nothing in the app imported through it, it pulled the entire library into
    // the bundle, and any name it did serve would have ignored the user's
    // icon-set choice.
    expect(iconsCode).not.toMatch(/export \* from/);
  });

  it('does not namespace-import an icon library', () => {
    expect(iconsCode).not.toMatch(
      /import\s+\*\s+as\s+\w+\s+from\s+'(@phosphor-icons|lucide-react|@tabler|hugeicons)/,
    );
  });
});
