/**
 * Guards the promise the Appearance screen makes: each of the three icon
 * libraries must render EVERY app glyph itself, so switching sets changes the
 * whole product's personality instead of producing a mix of two families.
 */
import fs from 'node:fs';
import path from 'node:path';

import * as Phosphor from '@phosphor-icons/react';
import * as Tabler from '@tabler/icons-react';
import * as Lucide from 'lucide-react';
import { describe, expect, it } from 'vitest';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../icons.tsx'), 'utf8');
const ENTRY =
  /function (\w+)\(props, ref\) \{\s*return\s+<?IconSlot ref=\{ref\} names=\{\{ p: '([^']+)', l: '([^']+)', t: '([^']+)' \}\}/g;

type Entry = { export: string; p: string; l: string; t: string };
const entries: Entry[] = [...SOURCE.matchAll(ENTRY)].map((m) => ({
  export: m[1],
  p: m[2],
  l: m[3],
  t: m[4],
}));

/**
 * Exported names that are deliberately two spellings of ONE concept (legacy
 * lucide aliases kept for call-site compatibility). Everything outside these
 * groups must own a unique glyph in every library — no two different UI
 * concepts may look identical.
 */
const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ['Calendar', 'CalendarIcon'],
  ['CheckCircle', 'CheckCircle2', 'CircleCheck'],
  ['Cloud', 'Cloudy'],
  ['Home', 'House'],
  ['Image', 'ImageIcon'],
  ['User', 'User2'],
];

/** Alias group index, or the export name itself when it stands alone. */
const conceptOf = (name: string): string => {
  const idx = ALIAS_GROUPS.findIndex((g) => g.includes(name));
  return idx === -1 ? name : `group:${String(idx)}`;
};

function duplicateGlyphs(pick: (e: Entry) => string): string[] {
  const byGlyph = new Map<string, Set<string>>();
  for (const e of entries) {
    const set = byGlyph.get(pick(e)) ?? new Set<string>();
    set.add(conceptOf(e.export));
    byGlyph.set(pick(e), set);
  }
  return [...byGlyph.entries()]
    .filter(([, concepts]) => concepts.size > 1)
    .map(([glyph, concepts]) => `${glyph}: ${[...concepts].join(', ')}`);
}

/** Brand marks that stroke libraries genuinely do not ship. */
const BRAND_EXEMPT = new Set(['GithubLogo', 'TwitterLogo', 'LinkedinLogo', 'InstagramLogo']);

const has = (lib: object, name: string) => name in lib;

describe('icon libraries', () => {
  it('declares a meaningful number of aliases', () => {
    expect(entries.length).toBeGreaterThan(80);
  });

  it('resolves every glyph in phosphor', () => {
    const missing = entries.filter((e) => !has(Phosphor, e.p)).map((e) => e.p);
    expect(missing).toEqual([]);
  });

  it('resolves every glyph in lucide', () => {
    const missing = entries
      .filter((e) => !BRAND_EXEMPT.has(e.p) && !has(Lucide, e.l))
      .map((e) => e.l);
    expect(missing).toEqual([]);
  });

  it('resolves every glyph in tabler', () => {
    const missing = entries
      .filter((e) => !BRAND_EXEMPT.has(e.p) && !has(Tabler, e.t))
      .map((e) => `${e.p} -> ${e.t}`);
    expect(missing).toEqual([]);
  });

  it('gives every distinct concept its own glyph in phosphor', () => {
    expect(duplicateGlyphs((e) => e.p)).toEqual([]);
  });

  it('gives every distinct concept its own glyph in lucide', () => {
    expect(duplicateGlyphs((e) => e.l)).toEqual([]);
  });

  it('gives every distinct concept its own glyph in tabler', () => {
    expect(duplicateGlyphs((e) => e.t)).toEqual([]);
  });
});
