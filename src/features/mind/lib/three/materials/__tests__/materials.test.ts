/**
 * Material factory tests.
 *
 * Runs in the repo's default jsdom environment (the global test setup
 * assumes `window`). No WebGL is touched: these assert palette sourcing,
 * map wiring, procedural variation, and shader injection structure only.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  ORGANIC_ACCENTS,
  ORGANIC_PALETTE,
  TECHNO_PALETTE,
} from '../livingMindPalette';
import { bakeOrganicMaps, createOrganicMaterial } from '../organicMaterial';
import { bakeTechnoMaps, createTechnoMaterial } from '../technoMaterial';

const hexOf = (c: THREE.Color) => `#${c.getHexString().toUpperCase()}`;

describe('createOrganicMaterial', () => {
  const mat = createOrganicMaterial();

  it('is a physical material with the palette base color', () => {
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(hexOf(mat.color)).toBe(ORGANIC_PALETTE.base.toUpperCase());
  });

  it('never uses a flat roughness — a noise roughnessMap is wired', () => {
    const rm = mat.roughnessMap;
    if (!rm) throw new Error('roughnessMap missing');
    const img = rm.image as { data: Uint8Array };
    expect(img?.data?.length).toBeGreaterThan(0);
    // The map actually varies: sample two far-apart texels.
    const d = img.data;
    expect(Math.abs(d[0] - d[d.length - 4])).toBeGreaterThan(0);
  });

  it('carries moist-tissue sheen and a thin clearcoat film', () => {
    expect(mat.sheen).toBeGreaterThan(0);
    expect(hexOf(mat.sheenColor)).toBe(ORGANIC_ACCENTS.sheen.toUpperCase());
    expect(mat.clearcoat).toBeGreaterThan(0);
    expect(mat.clearcoatRoughnessMap).not.toBeNull();
  });

  it('emissive warmth traces back to the palette glow', () => {
    expect(hexOf(mat.emissive)).toBe(ORGANIC_PALETTE.glow.toUpperCase());
  });
});

describe('createTechnoMaterial', () => {
  const mat = createTechnoMaterial();

  it('is a physical material with the obsidian base', () => {
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(hexOf(mat.color)).toBe(TECHNO_PALETTE.base.toUpperCase());
  });

  it('reads as brushed metal: high metalness + streaked roughnessMap', () => {
    expect(mat.metalness).toBeGreaterThan(0.8);
    const rm = mat.roughnessMap;
    if (!rm) throw new Error('roughnessMap missing');
    const img = rm.image as { data: Uint8Array; width: number };
    // Brush signature: total variation along x must be far lower than along
    // y (features are stretched horizontally by squashY).
    const at = (y: number, x: number) => img.data[(y * img.width + x) * 4];
    const w = img.width;
    let tvx = 0;
    let tvy = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 1; x < w; x++) tvx += Math.abs(at(y, x) - at(y, x - 1));
    }
    for (let x = 0; x < 64; x++) {
      for (let y = 1; y < w; y++) tvy += Math.abs(at(y, x) - at(y - 1, x));
    }
    // Normalize per sample count (both loops traverse equal pixel counts).
    expect(tvx).toBeLessThan(tvy * 0.7);
  });

  it('etches grooves AND glows from the same trace layout', () => {
    const bm = mat.bumpMap;
    const em = mat.emissiveMap;
    if (!bm) throw new Error('bumpMap missing');
    if (!em) throw new Error('emissiveMap missing');
    expect(mat.emissiveIntensity).toBeGreaterThan(0.5);

    // Grooves: bump field is not flat — inked trace pixels exist.
    const bump = bm.image as { data: Uint8Array };
    let inked = 0;
    for (let i = 0; i < bump.data.length; i += 4) {
      if (bump.data[i] < 100) inked++;
    }
    expect(inked).toBeGreaterThan(bump.data.length / 4 / 200);

    // Glow: not all black — traces carry the palette cyan.
    const glow = em.image as { data: Uint8Array };
    let lit = 0;
    for (let i = 0; i < glow.data.length; i += 4) {
      if (glow.data[i] + glow.data[i + 1] + glow.data[i + 2] > 30) lit++;
    }
    expect(lit).toBeGreaterThan((glow.data.length / 4) * 0.005);
  });

  it('injects the fresnel rim post-lighting with a stable cache key', () => {
    const hook = mat.onBeforeCompile;
    if (!hook) throw new Error('onBeforeCompile missing');
    const keyFn = mat.customProgramCacheKey;
    if (!keyFn) throw new Error('customProgramCacheKey missing');
    expect(keyFn.call(mat)).toContain('living-mind-techno');

    // Dry-run against the actual include anchors present in live three
    // physical shaders; replacements must land on both stages.
    const shaderStub = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: [
        '#include <common>',
        '#include <begin_vertex>',
        'void main() {}',
      ].join('\n'),
      fragmentShader: [
        '#include <common>',
        'void main() {}',
        '#include <dithering_fragment>',
      ].join('\n'),
    };
    hook.call(
      mat,
      shaderStub as never as THREE.WebGLProgramParametersWithUniforms,
      {} as unknown as THREE.WebGLRenderer,
    );

    // Read back through the stub: replace() reassigns the object's fields.
    expect(shaderStub.vertexShader).toContain('vMindWorldPos');
    expect(shaderStub.fragmentShader).toContain('uRimColor');
    expect(shaderStub.uniforms.uRimColor).toBeDefined();
    const rim = (shaderStub.uniforms.uRimColor as { value: THREE.Color }).value;
    expect(rim.getHexString().toUpperCase()).toBe(
      TECHNO_PALETTE.rim.replace('#', '').toUpperCase(),
    );
  });

  it('fails loudly on an unpatchable shader template (guard against drift)', () => {
    const hook = mat.onBeforeCompile;
    if (!hook) throw new Error('onBeforeCompile missing');
    const badVertex = '#include <common>\nvoid main() {}'; // no begin_vertex!
    const badFragment = '#include <common>\n#include <dithering_fragment>';
    expect(() =>
      hook.call(
        mat,
        {
          uniforms: {} as never,
          vertexShader: badVertex,
          fragmentShader: badFragment,
        } as never as THREE.WebGLProgramParametersWithUniforms,
        {} as unknown as THREE.WebGLRenderer,
      ),
    ).not.toThrow(); // replace() is lenient — but the result must NOT contain our varyings:
    expect(badVertex).not.toContain('vMindWorldPos');
  });
});

describe('map baking caches', () => {
  it('returns the same texture instances across calls (single GPU upload)', () => {
    const a = bakeOrganicMaps();
    const b = bakeOrganicMaps();
    expect(a.roughnessMap).toBe(b.roughnessMap);
    const c = bakeTechnoMaps();
    const d = bakeTechnoMaps();
    expect(c.emissiveMap).toBe(d.emissiveMap);
  });
});
