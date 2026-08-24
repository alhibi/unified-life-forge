/**
 * Technological hemisphere material — Stage 1 material study.
 *
 * Reads as a precision instrument chassis, not an arcade cabinet:
 *  - Base: obsidian/graphite MeshPhysicalMaterial, high metalness, brushed
 *    roughness (horizontally stretched fBm → anisotropic-looking streaks).
 *  - Etched circuitry: ONE procedural trace layout drives BOTH a bump map
 *    (grooves physically catch light) and an emissive map (pale ice-cyan
 *    glow riding exactly inside the grooves). The layout is rasterized
 *    analytically (distance-to-segment) into raw byte buffers → DataTexture,
 *    so it tiles seamlessly and is testable without any DOM.
 *  - Energized edge: fresnel rim injected post-lighting via onBeforeCompile.
 *
 * No external image assets; no canvas dependency.
 */

import * as THREE from 'three';

import { makeRng } from '@/features/mind/lib/brainGeometry';

import {
  TECHNO_ACCENTS,
  TECHNO_PALETTE,
} from './livingMindPalette';
import { bakeFbmTexture } from './procedural';

export interface TechnoMaterialMaps {
  /** Brushed-metal roughness streaks. */
  roughnessMap: THREE.Texture;
  /** Etched grooves (traces recessed below the panel surface). */
  bumpMap: THREE.Texture;
  /** Glowing trace layer — palette-colored on true black. */
  emissiveMap: THREE.Texture;
}

// ---------------------------------------------------------------------------
// Circuit layout — pure geometry, rasterized later
// ---------------------------------------------------------------------------

interface TraceSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Half-width in texels. */
  radius: number;
  /** Via marker (drawn as a solder-flare dot in the glow layer). */
  via: boolean;
}

/**
 * Manhattan circuit lanes running left→right with random vertical jogs.
 * Every lane starts before x=0 and exits past x=size at its final height,
 * so the pattern wraps seamlessly when tiled horizontally.
 */
export function buildTraceSegments(size: number, seed: number): TraceSegment[] {
  const rng = makeRng(seed);
  const segments: TraceSegment[] = [];
  const margin = size * 0.06;
  const lanes = 8;

  for (let lane = 0; lane < lanes; lane++) {
    let y = margin + ((lane + rng() * 0.6) / lanes) * (size - 2 * margin);
    let x = -size * 0.02;
    const w = Math.max(1.4, size * 0.006);

    const jogs = 2 + Math.floor(rng() * 3);
    for (let j = 0; j <= jogs; j++) {
      const nextX = x + (size / (jogs + 1)) * (0.7 + rng() * 0.5);
      segments.push({ x0: x, y0: y, x1: nextX, y1: y, radius: w, via: false });
      x = nextX;
      if (x >= size) break;

      const nextY = Math.min(
        size - margin,
        Math.max(margin, y + (rng() - 0.5) * size * 0.24),
      );
      if (Math.abs(nextY - y) > 4) {
        // Vertical run with solder vias at both corners.
        segments.push({ x0: x, y0: y, x1: x, y1: nextY, radius: w, via: false });
        segments.push({ x0: x, y0: y, x1: x, y1: y, radius: w * 1.15, via: true });
        segments.push({ x0: x, y0: nextY, x1: x, y1: nextY, radius: w * 1.15, via: true });
        y = nextY;
      }
    }
    // Exit run past the right border at the final height (wrap continuity).
    segments.push({ x0: x, y0: y, x1: size * 1.02, y1: y, radius: w, via: false });
  }
  return segments;
}

/** Squared distance from point to segment. */
function distSq(px: number, py: number, s: TraceSegment): number {
  const dx = s.x1 - s.x0;
  const dy = s.y1 - s.y0;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - s.x0) * dx + (py - s.y0) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = s.x0 + t * dx;
  const cy = s.y0 + t * dy;
  return (px - cx) ** 2 + (py - cy) ** 2;
}

/** Nearest coverage [0,1] and whether the nearest feature is a via dot. */
function sampleCoverage(
  px: number,
  py: number,
  segments: TraceSegment[],
): { coverage: number; via: boolean } {
  let best = Infinity;
  let via = false;
  for (const s of segments) {
    const d2 = distSq(px, py, s);
    if (d2 < best) {
      best = d2;
      via = s.via;
    }
  }
  const d = Math.sqrt(best);
  const coverage = Math.max(0, Math.min(1, 1 - d / (segments[0].radius * 1.05)));
  return { coverage, via };
}

// ---------------------------------------------------------------------------
// Texture baking
// ---------------------------------------------------------------------------

let cachedMaps: TechnoMaterialMaps | null = null;

export function bakeTechnoMaps(size = 512): TechnoMaterialMaps {
  if (cachedMaps) return cachedMaps;

  // Brushed streaks: y runs through the noise 4× faster → horizontal stroke.
  const roughnessMap = bakeFbmTexture(size, 0x67a7e, {
    octaves: 3,
    stretchX: 4,
    remap: (v) => 0.26 + v * 0.3,
  });

  const segments = buildTraceSegments(size, 0xc17c71);
  const grooveBg = 142; // mid-gray field
  const grooveInk = 40; // recessed trace floor

  const bumpData = new Uint8Array(size * size * 4);
  const glowData = new Uint8Array(size * size * 4);
  const glowColor = new THREE.Color(TECHNO_PALETTE.glow);
  const viaColor = new THREE.Color(TECHNO_ACCENTS.solderFlare);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const { coverage, via } = sampleCoverage(px + 0.5, py + 0.5, segments);
      const i = (py * size + px) * 4;

      // Grooves: ink where traces cover the field.
      const g = Math.round(grooveBg + (grooveInk - grooveBg) * coverage);
      bumpData[i] = bumpData[i + 1] = bumpData[i + 2] = g;
      bumpData[i + 3] = 255;

      // Glow: palette cyan inside traces, white-hot flare inside vias.
      const c = via ? viaColor : glowColor;
      glowData[i] = Math.round(255 * c.r * coverage);
      glowData[i + 1] = Math.round(255 * c.g * coverage);
      glowData[i + 2] = Math.round(255 * c.b * coverage);
      glowData[i + 3] = 255;
    }
  }

  const mk = (data: Uint8Array) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  };

  cachedMaps = {
    roughnessMap,
    bumpMap: mk(bumpData),
    emissiveMap: mk(glowData),
  };
  return cachedMaps;
}

/**
 * Build the graphite instrument material. All colors come exclusively from
 * livingMindPalette.ts; the fresnel rim is injected post-lighting.
 */
export function createTechnoMaterial(): THREE.MeshPhysicalMaterial {
  const maps = bakeTechnoMaps();
  const P = TECHNO_PALETTE;

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(P.base),
    metalness: 0.93,
    roughness: 1.0, // actual value = roughness × roughnessMap (brushed streaks)

    // Protective lacquer over graphite — crisp, but not glass.
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,

    // Trace glow rides exactly inside the etched grooves.
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.05,
    emissiveMap: maps.emissiveMap,

    bumpMap: maps.bumpMap,
    bumpScale: 0.35,

    envMapIntensity: 1.25,
  });

  mat.roughnessMap = maps.roughnessMap;

  // --- energized-edge fresnel (injected after lighting) --------------------
  const rimColor = new THREE.Color(P.rim);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimPower = { value: 3.4 };
    shader.uniforms.uRimStrength = { value: 0.55 };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        ['#include <common>', 'varying vec3 vMindNormalW;', 'varying vec3 vMindWorldPos;'].join('\n'),
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'vMindNormalW = normalize(mat3(modelMatrix) * objectNormal);',
          'vMindWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        ].join('\n'),
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'varying vec3 vMindNormalW;',
          'varying vec3 vMindWorldPos;',
          'uniform vec3 uRimColor;',
          'uniform float uRimPower;',
          'uniform float uRimStrength;',
        ].join('\n'),
      )
      .replace(
        '#include <dithering_fragment>',
        [
          '#include <dithering_fragment>',
          'vec3 mindV = normalize(cameraPosition - vMindWorldPos);',
          'float mindFres = pow(1.0 - clamp(dot(normalize(vMindNormalW), mindV), 0.0, 1.0), uRimPower);',
          'gl_FragColor.rgb += uRimColor * mindFres * uRimStrength;',
        ].join('\n'),
      );
  };
  mat.customProgramCacheKey = () => 'living-mind-techno-v1';

  return mat;
}
