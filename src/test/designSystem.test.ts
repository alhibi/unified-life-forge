import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Design-system ratchet.
 *
 * The audit found five parallel card vocabularies, 25 arbitrary font sizes,
 * 20 magic z-index values and a third of all directional utilities written
 * physically in an RTL-only app. Those are being paid down screen by screen,
 * but the counts must never grow again — a review comment cannot enforce that,
 * a failing test can.
 *
 * When a number here goes DOWN, lower the budget in the same commit. If one
 * needs to go UP, that is a design-system decision, not a drive-by change.
 *
 * The rules in .kiro/steering/design-system.md explain each budget.
 */

const SRC = path.resolve(import.meta.dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

const FILES = walk(SRC);
const SOURCES = FILES.map((f) => ({
  file: path.relative(SRC, f),
  text: fs.readFileSync(f, 'utf8'),
}));

function countMatches(pattern: RegExp): { total: number; byFile: Record<string, number> } {
  const byFile: Record<string, number> = {};
  let total = 0;
  for (const { file, text } of SOURCES) {
    const n = (text.match(pattern) ?? []).length;
    if (n > 0) {
      byFile[file] = n;
      total += n;
    }
  }
  return { total, byFile };
}

describe('design-system budgets', () => {
  it('does not add new bespoke card surfaces', () => {
    // A hand-rolled `bg-card … rounded-* … border` trio is what <AppCard>
    // exists to replace. 298 of them survive from before the audit.
    const { total } = countMatches(/bg-card\b/g);
    expect(total).toBeLessThanOrEqual(298);
  });

  it('does not add new arbitrary font sizes', () => {
    // Arbitrary sizes are now authored in rem (see
    // scripts/codemod-type-rem.mjs) so the base-size preference can scale
    // them. The budget still ratchets: prefer the canonical scale.
    const { total } = countMatches(/text-\[\d+(?:\.\d+)?rem\]/g);
    expect(total).toBeLessThanOrEqual(1713);
  });

  it('never authors a type size in px', () => {
    // A pixel font size cannot follow `html { font-size }`, so it silently
    // opts out of the user's text-size preference — which is how the app
    // ended up half-scaling. rem or a canonical token, never px.
    const offenders: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(/\b(?:text|leading)-\[\d+(?:\.\d+)?px\]/g)) {
        offenders.push(`${file} → ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never sets a font size below the 10px floor', () => {
    // Arabic script needs MORE size than Latin, not less. Anything under 10px
    // was unreadable; 175 such declarations were raised during the audit.
    // 0.625rem is 10px at the default 16px base.
    const offenders: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(/text-\[(\d+(?:\.\d+)?)rem\]/g)) {
        if (Number(match[1]) < 0.625) offenders.push(`${file} → ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('uses the z-index ladder, never a raw value', () => {
    // The ladder lives in tailwind.config.ts. A raw value means two layers are
    // competing without a contract — and a value Tailwind does not define
    // (the app shipped a `z-35` and a `z-[9990]`) emits no rule at all, so the
    // element silently ends up with no stacking level.
    const offenders: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(/\bz-(?:\[\d+\]|\d+)\b/g)) {
        offenders.push(`${file} → ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not hand-roll sticky header chrome', () => {
    // `.app-sticky-header` / `-card` own the backdrop and the hairline. The 22
    // bespoke headers used five different alphas and two blur radii.
    const offenders: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const line of text.split('\n')) {
        if (!line.includes('sticky top-0')) continue;
        if (/backdrop-blur/.test(line)) offenders.push(`${file} → ${line.trim().slice(0, 90)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not reintroduce physical directional utilities', () => {
    // RTL app: use ms/me/ps/pe, start/end, text-start/text-end.
    const offenders: string[] = [];
    const pattern =
      /(?:^|[\s"'`])-?(?:ml|mr|pl|pr)-(?:\d|px|\[)|\btext-(?:left|right)\b|\bborder-[lr]\b|\brounded-(?:tl|tr|bl|br)-/g;
    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(pattern)) {
        offenders.push(`${file} → ${match[0].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the German locale out', () => {
    // `Language` is a single-member union, but data files can still smuggle a
    // second locale in as a `de:` / `*De:` property.
    const offenders: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(/^\s*(?:de|[a-z][A-Za-z]*De)\s*:/gm)) {
        offenders.push(`${file} → ${match[0].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not reserve space for the retired bottom navigation', () => {
    // There is no bottom nav. `.pb-page` is the one canonical page gutter.
    const { total, byFile } = countMatches(/\bpb-(?:24|28|32)\b/g);
    expect({ total, byFile }).toEqual({ total: 0, byFile: {} });
  });
});
