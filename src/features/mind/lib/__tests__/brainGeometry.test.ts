import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  buildCircuitTraces,
  buildCortexHemisphere,
  buildMechDome,
  buildPlateLayout,
  buildPlatesGeometry,
  buildVesselTree,
  fbm,
  foldDisplacement,
  hashStringToSeed,
  makeNoise3,
  makeRng,
} from '../brainGeometry';

function unitDir(x: number, y: number, z: number): Vector3 {
  const v = new Vector3(x, y, z);
  return v.normalize();
}

describe('makeRng / hashStringToSeed', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(1234);
    const b = makeRng(1234);
    for (let i = 0; i < 32; i++) expect(a()).toBe(b());
  });

  it('hashes strings deterministically and within uint32', () => {
    const s1 = hashStringToSeed('living-mind');
    const s2 = hashStringToSeed('living-mind');
    expect(s1).toBe(s2);
    expect(s1).toBeLessThanOrEqual(0xffffffff);
    expect(hashStringToSeed('other')).not.toBe(s1);
  });
});

describe('makeNoise3 / fbm', () => {
  it('returns values in [0,1] and is deterministic', () => {
    const n1 = makeNoise3(42);
    const n2 = makeNoise3(42);
    for (let i = 0; i < 200; i++) {
      const x = i * 0.137;
      const v = n1(x, x * 0.5, -x * 0.25);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBe(n2(x, x * 0.5, -x * 0.25));
    }
  });

  it('is continuous — nearby samples stay close (smooth interpolation)', () => {
    const n = makeNoise3(7);
    const base = n(10.5, 20.5, 30.5);
    const near = n(10.5001, 20.5, 30.5);
    expect(Math.abs(base - near)).toBeLessThan(0.01);
  });

  it('fbm stays in [0,1] across octaves', () => {
    const n = makeNoise3(9);
    for (let i = 0; i < 100; i++) {
      const v = fbm(n, i * 0.31, i * 0.17, -i * 0.11, 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

const FOLD = {
  amplitude: 0.085,
  frequency: 4.6,
  seed: 12345,
  fissureDepth: 0.075,
  lateralDepth: 0.05,
};

describe('foldDisplacement', () => {
  it('stays within a sane radial band around the base sphere', () => {
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * Math.PI * 2;
      const dir = unitDir(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi),
      );
      if (dir.x < 0) continue;
      const d = foldDisplacement(dir, FOLD);
      expect(d).toBeGreaterThan(-0.35);
      expect(d).toBeLessThan(0.35);
    }
  });

  it('digs a deep fissure at the seam plane (z → 0)', () => {
    const seam = foldDisplacement(unitDir(0.9, 0.1, 0.001), FOLD);
    const far = foldDisplacement(unitDir(0.9, 0.1, 0.9), FOLD);
    expect(seam).toBeLessThan(far - 0.03);
  });
});

describe('buildCortexHemisphere', () => {
  const { geometry, vertexCount, colors } = buildCortexHemisphere(1, { seed: 777 });

  it('builds a half-sphere with vertex colors', () => {
    expect(vertexCount).toBeGreaterThan(1000);
    expect(colors).toBeDefined();
    expect(geometry.getAttribute('color')).toBeDefined();
    expect(geometry.getAttribute('normal')).toBeDefined();
  });

  it('keeps every vertex on the +X side (x ≥ −ε)', () => {
    const pos = geometry.getAttribute('position');
    let minX = Infinity;
    for (let i = 0; i < pos.count; i++) minX = Math.min(minX, pos.getX(i));
    expect(minX).toBeGreaterThan(-1e-4);
  });

  it('displaces vertices off the perfect sphere but not wildly', () => {
    const pos = geometry.getAttribute('position');
    let minR = Infinity;
    let maxR = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }
    expect(maxR).toBeGreaterThan(minR); // folding actually happened
    expect(maxR).toBeLessThan(1.3);
    expect(minR).toBeGreaterThan(0.7);
  });
});

describe('buildVesselTree', () => {
  const tree = buildVesselTree(1, FOLD, { branchCount: 12, seed: 99 });

  it('produces interleaved segment data with matching per-vertex attributes', () => {
    expect(tree.segmentCount).toBeGreaterThan(12);
    expect(tree.positions.length).toBe(tree.segmentCount * 6);
    expect(tree.radii.length).toBe(tree.segmentCount * 2);
    expect(tree.tAlong.length).toBe(tree.segmentCount * 2);
    expect(tree.branchOf.length).toBe(tree.segmentCount * 2);
  });

  it('has one tip per branch, hovering just outside the folded surface', () => {
    expect(tree.tipPositions.length).toBe(12 * 3);
    for (let i = 0; i < tree.tipPositions.length; i += 3) {
      const r = Math.hypot(
        tree.tipPositions[i],
        tree.tipPositions[i + 1],
        tree.tipPositions[i + 2],
      );
      // Vessels hug the folded skin, so they dip into sulci/fissure grooves
      // (down to ~0.93 here). The contract is "near-surface shell": never
      // deep inside the sphere, never flying far off it.
      expect(r).toBeGreaterThan(0.9);
      expect(r).toBeLessThan(1.2);
    }
  });
});

describe('buildPlateLayout + buildPlatesGeometry', () => {
  const layout = buildPlateLayout(4, 4242);

  it('places plates strictly on the mechanical (−X) side', () => {
    expect(layout.centers.length).toBeGreaterThan(10);
    for (const c of layout.centers) expect(c.x).toBeLessThan(-0.18);
    expect(layout.corners.length).toBe(layout.centers.length);
  });

  const built = buildPlatesGeometry(layout, 1);

  it('extrudes prisms: top cap + bottom cap + skirt per plate', () => {
    const posCount = built.geometry.getAttribute('position').count;
    // Per plate: top m tris + bottom m tris + skirt 2m tris, each 3 verts.
    const expected = layout.corners.reduce((sum, c) => sum + c.length * 4 * 3, 0);
    expect(posCount).toBe(expected);
    expect(built.plateCount).toBe(layout.centers.length);
  });

  it('carries vertex colors on every vertex', () => {
    const colorsAttr = built.geometry.getAttribute('color');
    expect(colorsAttr.count).toBe(built.geometry.getAttribute('position').count);
  });
});

describe('buildCircuitTraces / buildMechDome', () => {
  it('emits count polylines on the mechanical side', () => {
    const lines = buildCircuitTraces(7, 31337);
    expect(lines).toHaveLength(7);
    for (const line of lines) {
      expect(line.length % 3).toBe(0);
      expect(line.length / 3).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < line.length; i += 3) expect(line[i]).toBeLessThan(0); // −X
    }
  });

  it('mech dome points −X', () => {
    const dome = buildMechDome(1);
    const pos = dome.geometry.getAttribute('position');
    let maxX = -Infinity;
    for (let i = 0; i < pos.count; i++) maxX = Math.max(maxX, pos.getX(i));
    expect(maxX).toBeLessThan(1e-4);
  });
});
