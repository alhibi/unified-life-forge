import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Design-system ratchet.
 *
 * Every number below was measured from the tree at the moment it was written,
 * not guessed. A budget may only go DOWN; raising one is a design-system
 * decision that needs the justification written next to it and a matching
 * entry in docs/design-system/migration-plan.md.
 *
 * The rules themselves are in .kiro/steering/design-system.md (derived from
 * DESIGN.md). This file is the machine that keeps them true.
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

function offenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const { file, text } of SOURCES) {
    for (const match of text.matchAll(pattern)) found.push(file + ' -> ' + match[0].trim());
  }
  return found;
}

describe('design-system budgets', () => {
  it('does not add new bespoke card surfaces', () => {
    // <AppCard> is the card. A hand-rolled bg-card + rounded-* + border trio
    // is what it exists to replace. 79 legacy surfaces remain across 445
    // files; the budget is the measured count, not a comfortable ceiling.
    expect(countMatches(/bg-card\b/g).total).toBeLessThanOrEqual(79);
  });

  it('does not add new arbitrary font sizes', () => {
    // 11 legacy rem sizes remain. The ladder is the five text-* steps plus the
    // type-* roles; anything else needs a reason.
    expect(countMatches(/text-\[\d+(?:\.\d+)?rem\]/g).total).toBeLessThanOrEqual(11);
  });

  it('never authors a type size in px', () => {
    // A pixel size cannot follow the user's text-size preference.
    expect(offenders(/\b(?:text|leading)-\[\d+(?:\.\d+)?px\]/g)).toEqual([]);
  });

  it('never sets a font size below the 12px legibility floor', () => {
    // Arabic needs more size than Latin, not less. The published smallest step
    // is text-micro (~12.6px at the default ratio); 0.75rem is the floor.
    const tooSmall: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const match of text.matchAll(/text-\[(\d+(?:\.\d+)?)rem\]/g)) {
        if (Number(match[1]) < 0.75) tooSmall.push(file + ' -> ' + match[0]);
      }
    }
    expect(tooSmall).toEqual([]);
  });

  it('uses the z-index ladder, never a raw value', () => {
    // Numeric levels have no meaning to the next reader, and a value the theme
    // does not define emits no rule at all (the app shipped z-35 and z-[9990]).
    expect(offenders(/\bz-(?:\[\d+\]|\d+)\b/g)).toEqual([]);
  });

  it('does not hand-roll sticky header chrome', () => {
    // .app-sticky-header owns the surface, the hairline and the blur.
    const bad: string[] = [];
    for (const { file, text } of SOURCES) {
      for (const line of text.split('\n')) {
        if (!line.includes('sticky top-0')) continue;
        if (/backdrop-blur/.test(line)) bad.push(file + ' -> ' + line.trim().slice(0, 90));
      }
    }
    expect(bad).toEqual([]);
  });

  it('does not reintroduce physical directional utilities', () => {
    // RTL app: ms/me/ps/pe, start/end, text-start/text-end.
    const pattern =
      /(?:^|[\s"'\x60])-?(?:ml|mr|pl|pr)-(?:\d|px|\[)|\btext-(?:left|right)\b|\bborder-[lr]\b|\brounded-(?:tl|tr|bl|br)-/g;
    expect(offenders(pattern)).toEqual([]);
  });

  it('does not smuggle a second UI locale into data', () => {
    // Arabic is the only UI locale (Language is a single-member union). This
    // is NOT a ban on German content: German Club models real content in typed
    // fields (german / arabic_translation) and renders it LTR in place.
    // What it forbids is a parallel translation property that the UI switches
    // on, which is how 6,077 dead strings accumulated before.
    expect(offenders(/^\s*(?:de|[a-z][A-Za-z]*De)\s*:/gm)).toEqual([]);
  });

  it('keeps typography inside the loaded 400-700 weight ladder', () => {
    // 800/900 are not loaded for the Arabic face, so they rendered synthetic.
    expect(countMatches(/\bfont-(?:black|extrabold)\b/g)).toEqual({ total: 0, byFile: {} });
  });

  it('never applies negative tracking to Arabic text', () => {
    // Connected Arabic must not be tracked; display roles set letter-spacing 0.
    expect(countMatches(/\btracking-tight(?:er)?\b/g)).toEqual({ total: 0, byFile: {} });
  });

  it('uses dvh, not vh, for full-height roots', () => {
    expect(countMatches(/\bmin-h-screen\b/g)).toEqual({ total: 0, byFile: {} });
  });

  it('never overrides the one press feedback', () => {
    // The global press rule owns the transform, so a per-screen scale replaces
    // the user's interaction preference with a hardcoded number.
    expect(countMatches(/\bactive:scale-(?:\[|\d)/g)).toEqual({ total: 0, byFile: {} });
  });

  it('never replaces the shared press with whileTap', () => {
    expect(countMatches(/\bwhileTap\b/g)).toEqual({ total: 0, byFile: {} });
  });

  it('uses the content-width token instead of max-w-lg', () => {
    expect(countMatches(/\bmax-w-lg\b/g)).toEqual({ total: 0, byFile: {} });
  });

  it('does not reserve space for the retired bottom navigation', () => {
    // There is no bottom nav. .pb-page is the one canonical page gutter.
    expect(countMatches(/\bpb-(?:24|28|32)\b/g)).toEqual({ total: 0, byFile: {} });
  });

  it('keeps arbitrary radii on the measured exceptions only', () => {
    // The ladder is 8/12/16/24/32. Nine legacy arbitrary radii remain; each is
    // a candidate for the ladder, none may be added.
    expect(countMatches(/rounded-\[/g).total).toBeLessThanOrEqual(9);
  });

  it('keeps decorative gradients on the registered exceptions only', () => {
    // Gradients are allowed for data/map encoding (X7) and artwork (X8). This
    // ratchet freezes the current count so chrome cannot quietly acquire one.
    expect(countMatches(/bg-gradient|linear-gradient|radial-gradient/g).total).toBeLessThanOrEqual(10);
  });

  it('keeps decorative blur on the registered exceptions only', () => {
    // Only the IME keyboard (X5) and the app overlay surface may blur.
    expect(countMatches(/backdrop-blur/g).total).toBeLessThanOrEqual(8);
  });
});
