/**
 * chessMaterials — خامات PBR إجرائية لمشهد الشطرنج.
 *
 * هوية «أوبسيديان وعاج ونحاس»: كل الألوان من chessPalette حصراً،
 * وكل خرائط الخشونة/النتوء مخبوزة من proceduralNoise (بلا صور خارجية).
 * المواد تُبنى مرة واحدة وتُشارك بين كل القطع (موفّرة للذاكرة والشيدرات).
 */

import * as THREE from 'three';

import {
  CHESS_PALETTE,
  type ChessPaletteKey,
} from './chessPalette';
import { bakeFbmTexture, bakeWoodGrain, bytesToTexture } from './proceduralNoise';

const c = (key: ChessPaletteKey) => new THREE.Color(`#${CHESS_PALETTE[key]}`);

export interface ChessMaterials {
  ivory: THREE.MeshPhysicalMaterial;
  obsidian: THREE.MeshPhysicalMaterial;
  bronze: THREE.MeshStandardMaterial;
  squareLight: THREE.MeshStandardMaterial;
  squareDark: THREE.MeshStandardMaterial;
  boardBody: THREE.MeshStandardMaterial;
  frameBronze: THREE.MeshStandardMaterial;
  /** لتنظيف الذاكرة عند فك تركيب المشهد. */
  dispose(): void;
}

/** يضيف خريطة خشونة fBm ناعمة — لا سطح مسطح تماماً في المشهد. */
function applyNoiseRoughness(
  mat: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
  seed: number,
  opts: {
    size?: number;
    octaves?: number;
    remap?: (v: number) => number;
    repeat?: number;
    stretchX?: 1 | 2 | 4;
  } = {},
): void {
  const { size = 128, octaves = 3, remap, repeat = 1, stretchX = 1 } = opts;
  const baked = bakeFbmTexture(size, seed, { octaves, stretchX, remap });
  const tex = bytesToTexture(baked.data, baked.size);
  tex.repeat.set(repeat, repeat);
  mat.roughnessMap = tex;
}

/** بناء الحزمة الكاملة. يُستدعى داخل useMemo واحد على مستوى المشهد. */
export function buildChessMaterials(): ChessMaterials {
  // ── العاج: شمعي دافئ، sheen حريري، لمعة clearcoat رقيقة ──
  const ivory = new THREE.MeshPhysicalMaterial({
    color: c('ivory'),
    roughness: 0.34,
    metalness: 0.02,
    sheen: 0.5,
    sheenColor: c('ivorySheen'),
    clearcoat: 0.35,
    clearcoatRoughness: 0.5,
    envMapIntensity: 1.1,
  });
  applyNoiseRoughness(ivory, 101, {
    remap: (v) => 0.22 + v * 0.3,
    repeat: 1,
  });

  // ── الأوبسيديان: زجاج بركاني داكن، انعكاسات حادة على خشونة متفاوتة ──
  const obsidian = new THREE.MeshPhysicalMaterial({
    color: c('obsidian'),
    roughness: 0.16,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.35,
    // لمعان داخلي خافت يُبقي التفاصيل مقروءة في الظلال
    emissive: new THREE.Color('#2A2E3C'),
    emissiveIntensity: 0.22,
  });
  applyNoiseRoughness(obsidian, 202, {
    remap: (v) => 0.06 + v * 0.22,
    repeat: 1,
  });

  // ── النحاس: معدني مموّه بخدوش دقيقة ──
  const bronze = new THREE.MeshStandardMaterial({
    color: c('bronze'),
    roughness: 0.28,
    metalness: 0.95,
    envMapIntensity: 1.25,
  });
  applyNoiseRoughness(bronze, 303, {
    stretchX: 4,
    remap: (v) => 0.15 + v * 0.35,
    repeat: 1,
  });

  // ── مربعات الرقعة ──
  const squareLight = new THREE.MeshStandardMaterial({
    color: c('squareLight'),
    roughness: 0.42,
    metalness: 0.04,
  });
  // عاج المربعات: عروق رخامية أطول
  applyNoiseRoughness(squareLight, 404, {
    stretchX: 2,
    remap: (v) => 0.3 + v * 0.34,
    repeat: 1,
  });

  const squareDark = new THREE.MeshStandardMaterial({
    color: c('squareDark'),
    roughness: 0.24,
    metalness: 0.12,
  });
  applyNoiseRoughness(squareDark, 505, {
    remap: (v) => 0.12 + v * 0.24,
    repeat: 1,
  });

  // ── جسم الرقعة الخشبي ──
  const woodTex = (() => {
    const baked = bakeWoodGrain(128, 606, { stretch: 8, contrast: 1.9 });
    return bytesToTexture(baked.data, baked.size);
  })();
  const boardBody = new THREE.MeshStandardMaterial({
    color: c('boardBody'),
    roughness: 0.5,
    metalness: 0.05,
    roughnessMap: woodTex,
  });

  const frameBronze = new THREE.MeshStandardMaterial({
    color: c('frameBronze'),
    roughness: 0.32,
    metalness: 0.9,
    envMapIntensity: 1.15,
  });
  applyNoiseRoughness(frameBronze, 707, {
    remap: (v) => 0.18 + v * 0.3,
    repeat: 1,
  });

  return {
    ivory,
    obsidian,
    bronze,
    squareLight,
    squareDark,
    boardBody,
    frameBronze,
    dispose() {
      [ivory, obsidian, bronze, squareLight, squareDark, boardBody, frameBronze].forEach((m) => {
        m.roughnessMap?.dispose();
        m.dispose();
      });
    },
  };
}
