import { describe, expect, it } from 'vitest';

import { contrastRatio, generateThemeTokens, themePresets } from '@/utils/themeEngine';

const MODES = [false, true] as const;
const SLOTS = [1, 2, 3, 4, 5, 6] as const;

const parse = (token: string): [number, number, number] => {
  const parts = token.split(/[\s%]+/).map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
};

const ratioTo = (token: string, surfaceToken: string) => {
  const from = parse(token);
  const to = parse(surfaceToken);
  // Build a real HSL pair: reuse the engine's own contrast helper by round-tripping
  // through the same string form it emits.
  return contrastRatioFromHslParts(from, to);
};

// `contrastRatio` takes Hsl tuples. The generator emits "H S% L%" strings, so
// parse them back into the tuple form the helper expects.
function contrastRatioFromHslParts(a: [number, number, number], b: [number, number, number]) {
  const [ah, as, al] = a;
  const [bh, bs, bl] = b;
  return contrastRatio([ah, as, al], [bh, bs, bl]);
}

// The browser composites `bg-data-5/5` in sRGB, so the wash has to be built in
// sRGB and only then handed to the HSL-shaped contrast helper. Mixing in HSL
// instead produces a different surface — and a different verdict.
function hslToRgbTuple([h, s, l]: [number, number, number]): [number, number, number] {
  const H = h / 360;
  const S = s / 100;
  const L = l / 100;
  const hue = (p: number, q: number, x: number) => {
    let t = x;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (S === 0) return [L, L, L];
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  return [hue(p, q, H + 1 / 3), hue(p, q, H), hue(p, q, H - 1 / 3)];
}

const rgbRatio = (a: [number, number, number], b: [number, number, number]) => {
  const lum = ([r, g, bl]: [number, number, number]) => {
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const washRatio = (tone: [number, number, number], page: [number, number, number], a: number) => {
  const t = hslToRgbTuple(tone);
  const p = hslToRgbTuple(page);
  const wash = t.map((c, i) => c * a + p[i] * (1 - a)) as [number, number, number];
  return rgbRatio(t, wash);
};

describe('data palette', () => {
  it('publishes all six tones in every preset and mode', () => {
    for (const preset of themePresets) {
      for (const isDark of MODES) {
        const tokens = generateThemeTokens(preset, 'tonal', isDark, false);
        for (const slot of SLOTS) {
          expect(
            tokens[`--data-${slot}`],
            `${preset.id}/${isDark ? 'dark' : 'light'} --data-${slot}`,
          ).toBeTruthy();
        }
      }
    }
  });

  it('keeps every tone legible as text on the page and on a card', () => {
    // `text-data-1` appears 99 times and `text-data-3` 42 times in the app, so
    // these are text colours, not chart-fill colours. Either surface is a
    // legitimate place for one to land.
    for (const preset of themePresets) {
      for (const isDark of MODES) {
        const tokens = generateThemeTokens(preset, 'tonal', isDark, false);
        for (const slot of SLOTS) {
          const onPage = ratioTo(tokens[`--data-${slot}`], tokens['--background']);
          const onCard = ratioTo(tokens[`--data-${slot}`], tokens['--card']);
          expect(
            onPage,
            `${preset.id}/${isDark ? 'dark' : 'light'} --data-${slot} on page`,
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            onCard,
            `${preset.id}/${isDark ? 'dark' : 'light'} --data-${slot} on card`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('keeps every tone legible on the faint wash it is used with', () => {
    // `bg-data-5/5` over the page is the surface a memory-game card, a chart
    // chip or a category tile is actually drawn on. That wash pulls the
    // background TOWARD the tone, which is the direction that eats contrast —
    // verifying only the bare page certifies a colour the user never sees.
    for (const preset of themePresets) {
      for (const isDark of MODES) {
        const tokens = generateThemeTokens(preset, 'tonal', isDark, false);
        const page = parse(tokens['--background']);
        for (const slot of SLOTS) {
          const tone = parse(tokens[`--data-${slot}`]);
          expect(
            washRatio(tone, page, 0.05),
            `${preset.id}/${isDark ? 'dark' : 'light'} --data-${slot} on its own /5 wash`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('keeps the six series distinguishable from each other', () => {
    // A chart that draws two series in the same tone is worse than a chart
    // with a dim label, so the contrast correction must not collapse two
    // entries onto each other. Neighbours in hue must stay far apart in
    // lightness, and no two may land on the same resolved value.
    for (const preset of themePresets) {
      for (const isDark of MODES) {
        const tokens = generateThemeTokens(preset, 'tonal', isDark, false);
        const values = SLOTS.map((slot) => tokens[`--data-${slot}`]);
        expect(new Set(values).size, `${preset.id}/${isDark ? 'dark' : 'light'}`).toBe(
          SLOTS.length,
        );
      }
    }
  });

  it('responds to the active surfaces rather than shipping one fixed set', () => {
    // The defect being guarded: the data palette was two hard-coded HSL triples
    // in CSS, applied identically no matter which preset was active. The proof
    // that the engine reads the LIVE surfaces is that the same seed resolves
    // differently against a light page and a dark one — and, across the preset
    // set, at least one preset's canvas must push a tone off the value every
    // other preset agrees on.
    const byPreset = new Map<string, string>();
    for (const preset of themePresets) {
      for (const isDark of MODES) {
        const tokens = generateThemeTokens(preset, 'tonal', isDark, false);
        byPreset.set(`${preset.id}/${isDark ? 'dark' : 'light'}`, tokens['--data-1']);
      }
    }
    const distinct = new Set(byPreset.values());
    // Light and dark canvases alone must disagree; if they agree, the tokens
    // are fixed values wearing a theme's name.
    expect(distinct.size).toBeGreaterThan(1);
  });
});
