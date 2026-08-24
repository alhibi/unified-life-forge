/**
 * Organic hemisphere material — Stage 1 material study.
 *
 * A `MeshPhysicalMaterial` tuned to read as moist anatomical wax:
 *  - roughnessMap: low-frequency fBm so specular response varies across the
 *    surface (no single roughness float anywhere).
 *  - sheen + sheenColor: dewy grazing highlight, the "recently alive" tell.
 *  - clearcoat 0.22 with a noisy clearcoatRoughnessMap: thin wet film over
 *    tissue, breaking up like real moisture does.
 *  - sheenColorMap doubles as a subtle blush mottle so even the sheen layer
 *    varies spatially.
 *
 * No external image assets — every map is baked from seeded noise.
 */

import * as THREE from 'three';

import {
  ORGANIC_ACCENTS,
  ORGANIC_PALETTE,
} from './livingMindPalette';
import { bakeFbmTexture } from './procedural';

export interface OrganicMaterialMaps {
  roughnessMap: THREE.Texture;
  sheenColorMap: THREE.Texture;
  clearcoatRoughnessMap: THREE.Texture;
}

/** Bake all organic maps once; reuse the instance across remounts. */
let cachedMaps: OrganicMaterialMaps | null = null;

export function bakeOrganicMaps(size = 512): OrganicMaterialMaps {
  if (cachedMaps) return cachedMaps;

  // Low-frequency mottle for roughness: broad soft patches, gentle contrast.
  const roughnessMap = bakeFbmTexture(size, 0x0a11ce, {
    octaves: 3,
    remap: (v) => {
      // Shape into a moist-tissue band: mostly 0.42–0.78 with slow drifts.
      const shaped = 0.42 + v * 0.36;
      return Math.min(1, Math.max(0, shaped));
    },
  });

  // Blush mottle carried by the sheen layer itself.
  const sheenColorMap = bakeFbmTexture(size, 0x61, {
    octaves: 4,
    remap: (v) => 0.55 + v * 0.45, // soft plateau so blush never dies fully
  });

  // The wet film thins and thickens independently of base roughness.
  const clearcoatRoughnessMap = bakeFbmTexture(size, 0x1a7e5, {
    octaves: 2,
    remap: (v) => 0.18 + v * 0.5,
  });

  cachedMaps = { roughnessMap, sheenColorMap, clearcoatRoughnessMap };
  return cachedMaps;
}

/**
 * Build the organic wax-tissue material. Colors come exclusively from
 * livingMindPalette.ts.
 */
export function createOrganicMaterial(): THREE.MeshPhysicalMaterial {
  const maps = bakeOrganicMaps();
  const P = ORGANIC_PALETTE;

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(P.base),
    roughness: 1.0, // actual value = roughness × roughnessMap
    metalness: 0.0,

    // Moist-film specular layer over the tissue.
    clearcoat: 0.22,
    clearcoatRoughness: 1.0, // modulated by clearcoatRoughnessMap
    clearcoatRoughnessMap: maps.clearcoatRoughnessMap,

    // Dewy grazing sheen — the waxy "just alive" signature.
    sheen: 0.85,
    sheenColor: new THREE.Color(ORGANIC_ACCENTS.sheen),
    sheenColorMap: maps.sheenColorMap,
    sheenRoughness: 0.62,

    // Faint golden translucency where light grazes thin folds.
    emissive: new THREE.Color(P.glow),
    emissiveIntensity: 0.06,

    envMapIntensity: 0.9,
  });

  mat.roughnessMap = maps.roughnessMap;
  return mat;
}
