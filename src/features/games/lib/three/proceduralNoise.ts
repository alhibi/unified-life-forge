/**
 * proceduralNoise — حقول ضجيج إجرائية لمواد الشطرنج ثلاثية الأبعاد.
 *
 * كل شيء يُولَّد بالكود (value noise → DataTexture). بلا أصول صورية،
 * وبلا canvas 2D في هذا الملف حتى تبقى الاختبارات على jsdom نظيفة.
 * النمط نفسه المجرّب في ميزة العقل الحي: شبكة ضجيج تُلفّ عند PERIOD
 * فتكون الخامات قابلة للتبليط بسلاسة.
 */

import * as THREE from 'three';

/** RNG حتمي (mulberry32) — نفس البذرة يعطي نفس الحقل دائماً. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERIOD = 64;

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** ضجيج قيم ثنائي قابل للتبليط على شبكة PERIOD. */
export function makeValueNoise2(seed: number): (x: number, y: number) => number {
  const rng = makeRng(seed);
  const lattice = new Float32Array(PERIOD * PERIOD);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng();

  return (x: number, y: number): number => {
    const fx = ((x % PERIOD) + PERIOD) % PERIOD;
    const fy = ((y % PERIOD) + PERIOD) % PERIOD;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = (x0 + 1) % PERIOD;
    const y1 = (y0 + 1) % PERIOD;
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const v00 = lattice[y0 * PERIOD + x0];
    const v10 = lattice[y0 * PERIOD + x1];
    const v01 = lattice[y1 * PERIOD + x0];
    const v11 = lattice[y1 * PERIOD + x1];
    return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
  };
}

/** ضجيج متعدد الأوكتافات؛ قابل للتبليط حين يكون امتداد المحور قوة للاثنين. */
export function fbm2(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm; // [0,1]
}

/**
 * يخبز حقلاً fBm قابلاً للتبليط في DataTexture رمادية.
 * تُستخدم كخريطة خشونة أو خريطة نتوء للعاج والأوبسيديان والخشب.
 */
export function bakeFbmTexture(
  size: number,
  seed: number,
  opts: {
    octaves?: number;
    /** شدّ أفقي للميزات (عروق ممتدة). يجب أن يكون قوة للاثنين. */
    stretchX?: 1 | 2 | 4;
    remap?: (v: number) => number;
  } = {},
): { data: Uint8Array; size: number } {
  const { octaves = 4, stretchX = 1, remap = (v) => v } = opts;
  const noise = makeValueNoise2(seed);
  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px / size) * PERIOD;
      const v = (py / size) * PERIOD;
      let amp = 1;
      let freq = 1;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += amp * noise(u * freq, v * freq * stretchX);
        norm += amp;
        amp *= 0.5;
        freq *= 2;
      }
      const raw = sum / norm;
      const c = Math.max(0, Math.min(255, Math.round(remap(raw) * 255)));
      const i = (py * size + px) * 4;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  return { data, size };
}

/**
 * عروق خشبية: تمديد شديد على محور واحد مع تجعيد طفيف.
 * تعيد بايتات رمادية حيث القيمة العالية = عرق فاتح.
 */
export function bakeWoodGrain(
  size: number,
  seed: number,
  opts: { stretch?: 2 | 4 | 8; contrast?: number } = {},
): { data: Uint8Array; size: number } {
  const { stretch = 4, contrast = 1.6 } = opts;
  const noise = makeValueNoise2(seed);
  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px / size) * PERIOD;
      const v = (py / size) * PERIOD * stretch;
      // تجعيد: إزاحة العروق بدف ثانٍ يعطي تموّجاً عضوياً بدل خطوط مستقيمة.
      const wobble = fbm2(noise, u * 0.5, py / size * PERIOD, 3) * 6;
      const grain = fbm2(noise, u + wobble, v, 4);
      const shaped = Math.max(0, Math.min(1, (grain - 0.5) * contrast + 0.5));
      const c = Math.round(shaped * 255);
      const i = (py * size + px) * 4;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  return { data, size };
}

/**
 * تحويل بايتات خام إلى THREE.DataTexture مع تغليف تكراري.
 * منفصل عن الخَبز ليستطيع الاختبار فحص البايتات دون إنشاء خامات فعلية.
 */
export function bytesToTexture(data: Uint8Array, size: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
