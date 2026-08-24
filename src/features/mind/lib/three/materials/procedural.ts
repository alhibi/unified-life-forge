/**
 * Procedural field helpers for Living-Mind materials.
 *
 * Everything here is generated in code (value noise → DataTexture, or Canvas
 * 2D drawing → CanvasTexture). No external image assets anywhere.
 *
 * Tiling contract: the noise lattice wraps at PERIOD. A texture sampled over
 * u ∈ [0, STRETCH_X · PERIOD) tiles seamlessly as long as STRETCH_X is a
 * power of two (every fBm octave then completes whole periods per tile).
 */

import * as THREE from 'three';

import { makeRng } from '@/features/mind/lib/brainGeometry';

const PERIOD = 64;

/** Tileable 2D value noise on the PERIOD lattice. */
export function makeValueNoise2(seed: number) {
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

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Octaved value noise. Tileable when spanX is a power of two. */
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
 * Bake a tileable fBm field into an RGBA DataTexture.
 *
 * `stretchX` elongates features horizontally (brush-stroke look) by running
 * the y-axis through the noise `stretchX` times faster than x. Both axes
 * still traverse whole lattice periods per tile, so the texture remains
 * perfectly seamless. `remap` shapes the raw [0,1] value before storage.
 */
export function bakeFbmTexture(
  size: number,
  seed: number,
  opts: {
    octaves?: number;
    stretchX?: 1 | 2 | 4;
    remap?: (v: number) => number;
  } = {},
): THREE.DataTexture {
  const { octaves = 4, stretchX = 1, remap = (v) => v } = opts;
  const noise = makeValueNoise2(seed);
  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px / size) * PERIOD;
      const v = (py / size) * PERIOD;
      // Anisotropic octaved noise: y frequency runs stretchX times faster,
      // so iso-lines of the field become long horizontal strokes.
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
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** A tiny canvas factory for pattern textures drawn in 2D. */
export function makePatternCanvas(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for pattern baking');
  draw(ctx, size);
  return canvas;
}

export function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
