/**
 * Guards the promise the Appearance screen makes: each of the three icon
 * libraries must render EVERY app glyph itself, so switching sets changes the
 * whole product's personality instead of producing a mix of two families.
 */
import fs from 'node:fs';
import path from 'node:path';

import * as Lucide from 'lucide-react';
import * as Phosphor from '@phosphor-icons/react';
import * as Tabler from '@tabler/icons-react';
import { describe, expect, it } from 'vitest';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../icons.tsx'), 'utf8');
const ENTRY = /names=\{\{ p: '([^']+)', l: '([^']+)', t: '([^']+)' \}\}/g;

type Entry = { p: string; l: string; t: string };
const entries: Entry[] = [...SOURCE.matchAll(ENTRY)].map((m) => ({
  p: m[1],
  l: m[2],
  t: m[3],
}));

/** Brand marks that stroke libraries genuinely do not ship. */
const BRAND_EXEMPT = new Set(['GithubLogo']);

const has = (lib: object, name: string) => name in lib;

describe('icon libraries', () => {
  it('declares a meaningful number of aliases', () => {
    expect(entries.length).toBeGreaterThan(200);
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
});
