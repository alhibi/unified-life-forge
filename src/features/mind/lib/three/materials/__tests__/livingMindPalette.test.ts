import { describe, expect, it } from 'vitest';

import {
  assertPaletteIntegrity,
  isHexColor,
  ORGANIC_ACCENTS,
  ORGANIC_PALETTE,
  PREVIEW_STAGE,
  STUDIO_RIG,
  TECHNO_ACCENTS,
  TECHNO_PALETTE,
} from '../livingMindPalette';

describe('livingMindPalette integrity', () => {
  it('passes the built-in integrity guard (well-formed, no duplicates)', () => {
    expect(() => assertPaletteIntegrity()).not.toThrow();
  });

  it('every exported color is a #RRGGBB literal', () => {
    const groups = [
      Object.values(ORGANIC_PALETTE),
      Object.values(TECHNO_PALETTE),
      Object.values(ORGANIC_ACCENTS),
      Object.values(TECHNO_ACCENTS),
      Object.values(STUDIO_RIG),
      Object.values(PREVIEW_STAGE),
    ];
    for (const group of groups) {
      for (const value of group) {
        expect(isHexColor(value)).toBe(true);
      }
    }
  });
});

describe('palette design language', () => {
  it('organic base is warm (red channel dominates blue)', () => {
    const c = ORGANIC_PALETTE.base;
    const r = parseInt(c.slice(1, 3), 16);
    const b = parseInt(c.slice(5, 7), 16);
    expect(r).toBeGreaterThan(b + 40);
  });

  it('techno base is cold/neutral and dark', () => {
    const c = TECHNO_PALETTE.base;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const lum = (r * 299 + g * 587) / 2550;
    expect(lum).toBeLessThan(35);
  });

  it('techno glow is high-lightness cyan-white (anti-neon guard)', () => {
    const c = TECHNO_PALETTE.glow;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    // Cyan family…
    expect(b).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(r);
    // …but washed toward white so it never reads as arcade neon.
    expect(Math.min(r, g, b) / Math.max(r, g, b)).toBeGreaterThan(0.55);
  });

  it('shadow tones are darker than bases on both sides', () => {
    const lum = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 2550;
    };
    expect(lum(ORGANIC_PALETTE.shadowTone)).toBeLessThan(lum(ORGANIC_PALETTE.base));
    expect(lum(TECHNO_PALETTE.shadowTone)).toBeLessThan(lum(TECHNO_PALETTE.base));
  });

  it('no placeholder colors anywhere in the palette', () => {
    const forbidden = new Set(['#ff00ff', '#00ff00', '#0000ff', '#ff0000']);
    const all = [
      ...Object.values(ORGANIC_PALETTE),
      ...Object.values(TECHNO_PALETTE),
      ...Object.values(ORGANIC_ACCENTS),
      ...Object.values(TECHNO_ACCENTS),
      ...Object.values(STUDIO_RIG),
      ...Object.values(PREVIEW_STAGE),
    ].map((c) => c.toLowerCase());
    for (const c of all) expect(forbidden.has(c)).toBe(false);
  });
});
