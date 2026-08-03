// Dominant-color extractor for podcast cover art.
//
// Podium uses Material's `materialKolor` library to pick a *seed color*
// from the artwork and feed it into `DynamicMaterialExpressiveTheme`,
// which then derives a full M3 palette (primary/secondary/tertiary,
// containers, on-* foregrounds). We don't need M3 — the existing app
// already has an HSL-based theme engine — so we extract one HSL seed
// and let the consumer (`<DynamicPodcastTheme/>`) layer simpler tinted
// surfaces over the global theme.
//
// Algorithm:
//   1. Draw the image into an offscreen canvas, downsized to ≤64px on
//      its longest edge. That's enough to get a stable dominant color
//      and keeps the pixel loop under 4 KB iterations.
//   2. Bucket pixels into a 4096-bin RGB histogram (4 bits per
//      channel). Skip near-white, near-black, and very-low-saturation
//      pixels — those are usually background, not the brand color.
//   3. Pick the most frequent surviving bucket and convert to HSL.
//   4. Clamp the result to a usable range: saturation ≥ 35%, lightness
//      pinned around 45–60% so it works as a "primary" against both
//      light and dark surfaces.
//
// If the image can't be loaded (network error, CORS missing) we resolve
// `null` and the caller falls back to the global theme. iTunes artwork
// CDN does send `Access-Control-Allow-Origin: *`, so cross-origin
// canvas tainting isn't a problem in practice.

export interface SeedColor {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  l: number;
  /** Same color as `#rrggbb` for places that want a CSS literal. */
  hex: string;
}

const MAX_DIM = 64;
const BUCKETS_PER_CHANNEL = 16; // 4 bits → 4096 buckets total

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    case bn:
      h = (rn - gn) / d + 4;
      break;
  }
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100,
    ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r: number, g: number, b: number;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

export async function extractSeedColor(imageUrl: string): Promise<SeedColor | null> {
  if (!imageUrl) return null;
  try {
    const img = await loadImage(imageUrl);
    const ratio = MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    let pixels: Uint8ClampedArray;
    try {
      pixels = ctx.getImageData(0, 0, w, h).data;
    } catch {
      // Canvas was tainted — image origin didn't allow CORS reads.
      return null;
    }

    // Histogram. Each bucket stores (count, sumR, sumG, sumB) so we can
    // compute a more accurate centroid than the bucket's representative.
    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < pixels.length; i += 4) {
      const a = pixels[i + 3];
      if (a < 128) continue;
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];

      // Reject near-black and near-white before quantization. Those are
      // overwhelmingly the matte/border around real podcast art.
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 20 || min > 235) continue;
      // Reject very low saturation (gray-ish) pixels.
      if (max - min < 20) continue;

      const qr = Math.floor(r / (256 / BUCKETS_PER_CHANNEL));
      const qg = Math.floor(g / (256 / BUCKETS_PER_CHANNEL));
      const qb = Math.floor(b / (256 / BUCKETS_PER_CHANNEL));
      const key = (qr << 8) | (qg << 4) | qb;
      const entry = buckets.get(key);
      if (entry) {
        entry.count++;
        entry.r += r;
        entry.g += g;
        entry.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }

    if (buckets.size === 0) return null;

    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const e of buckets.values()) {
      if (!best || e.count > best.count) best = e;
    }
    if (!best) return null;

    const r = best.r / best.count;
    const g = best.g / best.count;
    const b = best.b / best.count;
    let [hue, sat, light] = rgbToHsl(r, g, b); // eslint-disable-line prefer-const

    // Make sure the seed plays well as a primary color: bump saturation
    // if it's too washed out, and pin lightness to the mid-range so it
    // looks the same intensity in light and dark themes.
    sat = Math.max(sat, 45);
    light = Math.min(Math.max(light, 42), 58);

    return {
      h: Math.round(hue),
      s: Math.round(sat),
      l: Math.round(light),
      hex: hslToHex(hue, sat, light),
    };
  } catch {
    return null;
  }
}
