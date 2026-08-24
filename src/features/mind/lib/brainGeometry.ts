/**
 * Living Mind v2 — procedural brain geometry.
 *
 * Pure, DOM-free math so it is unit-testable. Scene components consume these
 * builders; nothing here touches React or WebGL.
 *
 * Design language: the organic hemisphere folds like real cortex (deep
 * longitudinal fissure along the seam, lateral sulcus, gyral ridges driven by
 * 3D value noise), the mechanical one is a faceted dome under floating armor
 * plates laid out in latitude rings.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) + 3D value noise
// ---------------------------------------------------------------------------

/** mulberry32 — tiny deterministic PRNG. Same seed ⇒ same universe. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth 3D value noise on an integer lattice, deterministic per seed. */
export function makeNoise3(seed: number): (x: number, y: number, z: number) => number {
  const perm = new Uint8Array(512);
  const rng = makeRng(seed);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  function latticeHash(ix: number, iy: number, iz: number): number {
    // perm table triple lookup → [0,1)
    return perm[(perm[(perm[ix & 255] + iy) & 255] + iz) & 255] / 255;
  }

  return (x: number, y: number, z: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    const fz = smooth(z - iz);

    const c000 = latticeHash(ix, iy, iz);
    const c100 = latticeHash(ix + 1, iy, iz);
    const c010 = latticeHash(ix, iy + 1, iz);
    const c110 = latticeHash(ix + 1, iy + 1, iz);
    const c001 = latticeHash(ix, iy, iz + 1);
    const c101 = latticeHash(ix + 1, iy, iz + 1);
    const c011 = latticeHash(ix, iy + 1, iz + 1);
    const c111 = latticeHash(ix + 1, iy + 1, iz + 1);

    const x00 = c000 + (c100 - c000) * fx;
    const x10 = c010 + (c110 - c010) * fx;
    const x01 = c001 + (c101 - c001) * fx;
    const x11 = c011 + (c111 - c011) * fx;
    const y0 = x00 + (x10 - x00) * fy;
    const y1 = x01 + (x11 - x01) * fy;
    return y0 + (y1 - y0) * fz; // [0,1]
  };
}

/** Fractal Brownian motion over a noise field. */
export function fbm(
  noise: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2.05,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm; // [0,1]
}

// ---------------------------------------------------------------------------
// Cortex shell
// ---------------------------------------------------------------------------

export interface FoldOptions {
  /** Overall fold strength (radial units at radius 1). */
  amplitude?: number;
  /** Gyral ridge frequency. Higher ⇒ more, thinner folds. */
  frequency?: number;
  seed?: number;
  /** Depth of the central sulcus that runs along the flat seam face. */
  fissureDepth?: number;
  /** Depth of the lateral sulcus (between "temporal" and rest of cortex). */
  lateralDepth?: number;
}

/**
 * Radial displacement for a cortical point. `dir` must be normalized and lie
 * on the +X hemisphere (x ≥ 0); mirror for the other side if ever needed.
 */
export function foldDisplacement(dir: THREE.Vector3, opts: Required<FoldOptions>): number {
  const { amplitude, frequency, seed, fissureDepth, lateralDepth } = opts;

  // Base fBm in the unit cube around the point — stable in world space.
  const n = fbm(makeNoise3Cached(seed), dir.x * frequency + 9.2, dir.y * frequency + 3.7, dir.z * frequency + 5.1, 4);
  // Ridged variant sharpens valleys into sulci-like creases.
  const ridge = 1 - Math.abs(n * 2 - 1); // 1 at ridge center

  let d = amplitude * 0.55 * (n - 0.5) * 2 + amplitude * 0.45 * (ridge - 0.65);

  // Longitudinal fissure: deep groove where |z| → 0 (the flat seam plane).
  const fissure = Math.exp(-(dir.z * dir.z) / (2 * 0.028));
  d -= fissureDepth * fissure;

  // Lateral sulcus: a groove arcing along low-y latitudes toward the seam.
  const latBand = Math.exp(-Math.pow((dir.y + 0.18) / 0.16, 2));
  const lateralMask = Math.exp(-Math.pow((Math.abs(dir.z) - 0.25) / 0.45, 2));
  d -= lateralDepth * latBand * lateralMask;

  // Flatten the pole that faces the camera-forward slightly — cerebrum hint.
  d *= 1 - 0.25 * Math.max(0, dir.x) ** 3;

  return d;
}

// Cache noise fields per seed so repeated calls (thousands of vertices) do not
// rebuild permutation tables.
const noiseCache = new Map<number, (x: number, y: number, z: number) => number>();
function makeNoise3Cached(seed: number): (x: number, y: number, z: number) => number {
  let n = noiseCache.get(seed);
  if (!n) {
    n = makeNoise3(seed);
    noiseCache.set(seed, n);
  }
  return n;
}

export interface HemisphereBuild {
  geometry: THREE.BufferGeometry;
  vertexCount: number;
  /** Per-vertex RGB shading (sulci darkened, gyri lighter). */
  colors?: Float32Array;
}

/**
 * Build a folded half-sphere (organic cortex). Flat open edge sits on the
 * x=0 plane facing −X, dome pointing +X. UVs preserved from SphereGeometry.
 */
export function buildCortexHemisphere(radius: number, opts: FoldOptions = {}): HemisphereBuild {
  const o: Required<FoldOptions> = {
    amplitude: 0.085,
    frequency: 4.6,
    seed: opts.seed ?? hashStringToSeed('living-mind'),
    fissureDepth: 0.075,
    lateralDepth: 0.05,
    ...opts,
  };

  const g = new THREE.SphereGeometry(radius, 128, 96, 0, Math.PI, 0, Math.PI);
  // SphereGeometry(phiStart=0, phiLength=π) spans azimuth 0..π (z ≥ 0 in
  // three's convention). Rotate so the dome points +X and the flat disc
  // faces −X.
  g.rotateY(Math.PI / 2);

  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length();
    if (r < 1e-6) continue;
    const dir = v.clone().divideScalar(r);
    const disp = foldDisplacement(dir, o);
    const scale = (r + disp) / r;
    pos.setXYZ(i, v.x * scale, v.y * scale, v.z * scale);
    // Vertex color: sulci (deep displacement) darken toward plum; ridges stay warm.
    const depth01 = Math.min(1, Math.max(0, -disp / (o.amplitude * 1.6 + o.fissureDepth)));
    colors[i * 3] = 1 - depth01 * 0.55;
    colors[i * 3 + 1] = 1 - depth01 * 0.62;
    colors[i * 3 + 2] = 1 - depth01 * 0.3;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return { geometry: g, vertexCount: pos.count, colors };
}

/**
 * Inner glowing core mesh — a slightly smaller smooth hemisphere used behind
 * an emissive membrane so the folds read as backlit.
 */
export function buildInnerCore(radius: number): HemisphereBuild {
  const g = new THREE.SphereGeometry(radius * 0.985, 64, 48, 0, Math.PI);
  g.rotateY(Math.PI / 2);
  return { geometry: g, vertexCount: g.attributes.position.count };
}

/**
 * Faceted inner dome for the mechanical side: low-segment sphere so
 * flatShading gives crisp facets under the floating armor plates.
 */
export function buildMechDome(radius: number): HemisphereBuild {
  const g = new THREE.SphereGeometry(radius, 24, 18, 0, Math.PI);
  g.rotateY(-Math.PI / 2); // dome points −X, disc faces +X (the seam)
  return { geometry: g, vertexCount: g.attributes.position.count };
}

// ---------------------------------------------------------------------------
// Vasculature — branching vessel tree over the cortical surface
// ---------------------------------------------------------------------------

export interface VesselTree {
  /** Segment endpoints, flattened [x,y,z,x,y,z,…]. */
  positions: Float32Array;
  /** Per-vertex radial thickness (for LineMaterial-style width or shader). */
  radii: Float32Array;
  /** Per-vertex progress along its own branch (0..1) — drives pulse waves. */
  tAlong: Float32Array;
  /** Per-vertex branch index — lets the shader stagger pulses per branch. */
  branchOf: Float32Array;
  /** Branch tip points (synapse terminals), flattened. */
  tipPositions: Float32Array;
  segmentCount: number;
}

/**
 * Grow a branching tree constrained to a folded surface. Starts near the
 * "stem" region (low, near the seam), walks outward with random bifurcation.
 */
export function buildVesselTree(
  radius: number,
  fold: Required<FoldOptions>,
  opts: { branchCount?: number; seed?: number } = {},
): VesselTree {
  const branchCount = Math.min(48, Math.max(8, opts.branchCount ?? 26));
  const rng = makeRng(opts.seed ?? fold.seed ^ 0xa53a9d);
  const noise = makeNoise3Cached(fold.seed);

  const pts: number[] = [];
  const radii: number[] = [];
  const tAlong: number[] = [];
  const branchOf: number[] = [];
  const tips: number[] = [];

  /** Surface point for spherical direction, folds applied. */
  const surf = (dir: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 => {
    const disp = foldDisplacement(dir, fold);
    const r = radius * (1 + disp / radius);
    return out.copy(dir).multiplyScalar(r * 1.012); // hover just above skin
  };

  for (let b = 0; b < branchCount; b++) {
    // Trunk origin: lower area near the stem (y ≈ −0.55…−0.85), near seam.
    const theta = Math.PI * (0.62 + rng() * 0.24); // polar from +Y
    const phiBase = rng() * (Math.PI / 2);
    const phi = phiBase * 0.35; // hug the seam side
    const dir0 = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi),
    ).normalize();

    const dir = dir0.clone();
    const p = new THREE.Vector3();
    surf(dir, p);
    const depth = 3 + Math.floor(rng() * 3); // segments before termination
    let thickness = 0.008 + rng() * 0.006;

    let prev = p.clone();
    for (let s = 0; s < depth; s++) {
      // Random walk biased outward and upward along the dome.
      dir.x += (rng() - 0.42) * 0.55;
      dir.y += (rng() - 0.3) * 0.4;
      dir.z += (rng() - 0.5) * 0.75;
      // Keep on +X hemisphere: push away from the seam slightly.
      dir.x = Math.max(0.12, dir.x);
      dir.normalize();

      const nextP = new THREE.Vector3();
      surf(dir, nextP);

      const t0 = s / depth;
      const t1 = (s + 1) / depth;
      pts.push(prev.x, prev.y, prev.z, nextP.x, nextP.y, nextP.z);
      radii.push(thickness, thickness * (0.82 + rng() * 0.1));
      tAlong.push(t0, t1);
      branchOf.push(b, b);

      // Curl the walk along the local noise field so vessels follow gyri.
      const curl = noise(nextP.x * 3 + 11, nextP.y * 3, nextP.z * 3) - 0.5;
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), curl * 0.6);

      prev = nextP.clone();
      thickness *= 0.86;
    }
    tips.push(prev.x, prev.y, prev.z);
  }

  return {
    positions: new Float32Array(pts),
    radii: new Float32Array(radii),
    tAlong: new Float32Array(tAlong),
    branchOf: new Float32Array(branchOf),
    tipPositions: new Float32Array(tips),
    segmentCount: pts.length / 6,
  };
}

// ---------------------------------------------------------------------------
// Mechanical hemisphere — armor plate layout + circuit traces
// ---------------------------------------------------------------------------

export interface PlateLayout {
  /** Center direction (unit) of each plate. */
  centers: THREE.Vector3[];
  /** Plate corner directions (unit), CCW as seen from outside. */
  corners: THREE.Vector3[][];
}

/**
 * Lay hexagonal armor plates in latitude rings over the mechanical (−X)
 * hemisphere. Ring counts are deterministic from the seed. A band near the
 * seam plane (|x| small) stays open for the docking strip.
 */
export function buildPlateLayout(rings: number, seed: number): PlateLayout {
  const rng = makeRng(seed);
  const centers: THREE.Vector3[] = [];
  const corners: THREE.Vector3[][] = [];

  for (let ri = 0; ri < rings; ri++) {
    // Polar angle from the −X pole: distribute rings across the dome.
    const theta = (Math.PI / 2) * ((ri + 0.6) / rings);
    const circumference = Math.sin(theta);
    const count = Math.max(3, Math.round(9 * circumference));
    const phase = rng() * Math.PI * 2;
    for (let ci = 0; ci < count; ci++) {
      const phi = phase + (ci / count) * Math.PI * 2;
      const dir = new THREE.Vector3(
        -Math.cos(theta),
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      );
      // Keep clearly on the mechanical side of the seam.
      if (dir.x > -0.18) continue;

      const size = 0.34 + rng() * 0.1;
      const verts: THREE.Vector3[] = [];
      const sides = 6;
      const twist = (rng() - 0.5) * 0.5;
      const tangent = new THREE.Vector3(0, 1, 0).cross(dir);
      if (tangent.lengthSq() < 1e-5) tangent.set(1, 0, 0);
      tangent.normalize();
      const bitangent = dir.clone().cross(tangent).normalize();
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2 + twist;
        const off = tangent
          .clone()
          .multiplyScalar(Math.cos(a) * size)
          .add(bitangent.clone().multiplyScalar(Math.sin(a) * size));
        verts.push(dir.clone().add(off.multiplyScalar(0.55)).normalize());
      }
      centers.push(dir.clone());
      corners.push(verts);
    }
  }
  return { centers, corners };
}

export interface PlatesBuild {
  geometry: THREE.BufferGeometry;
  plateCount: number;
}

/**
 * Extrude each plate into a shallow hexagonal prism hovering just above the
 * dome: bright top face, darker skirt, occasional brass-tinted unit.
 */
export function buildPlatesGeometry(
  layout: PlateLayout,
  radius: number,
  seed = hashStringToSeed('mind-plates'),
): PlatesBuild {
  const rng = makeRng(seed ^ (layout.centers.length * 2654435761));
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  layout.corners.forEach((cornerDirs, pi) => {
    const lift = radius * (1.055 + rng() * 0.02);
    const innerR = radius * 1.012;
    const brass = rng() > 0.82;
    const cr = brass ? 0.72 : 0.3 + rng() * 0.06;
    const cg = brass ? 0.58 : 0.31 + rng() * 0.05;
    const cb = brass ? 0.26 : 0.34 + rng() * 0.05;

    const outer = cornerDirs.map((d) => d.clone().multiplyScalar(lift));
    const inner = cornerDirs.map((d) => d.clone().multiplyScalar(innerR));
    const centerDir = layout.centers[pi];
    const centerOuter = centerDir.clone().multiplyScalar(lift + 0.004);
    const centerInner = centerDir.clone().multiplyScalar(innerR - 0.002);

    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, shade: number) => {
      const n = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
        .normalize();
      for (const p of [a, b, c]) {
        positions.push(p.x, p.y, p.z);
        normals.push(n.x, n.y, n.z);
        colors.push(cr * shade, cg * shade, cb * shade);
      }
    };
    const m = outer.length;
    for (let k = 0; k < m; k++) tri(centerOuter, outer[k], outer[(k + 1) % m], 1);
    for (let k = 0; k < m; k++) tri(centerInner, inner[(k + 1) % m], inner[k], 0.55);
    for (let k = 0; k < m; k++) {
      const o1 = outer[k];
      const o2 = outer[(k + 1) % m];
      const i1 = inner[k];
      const i2 = inner[(k + 1) % m];
      tri(o1, i1, i2, 0.8);
      tri(o1, i2, o2, 0.8);
    }
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return { geometry: g, plateCount: layout.centers.length };
}

/**
 * Circuit trace polylines etched on the mechanical dome: start near the pole,
 * run meridian-ish arcs toward the seam, ending at via points. Each polyline
 * is a flat [x,y,z,…] array of unit-sphere directions.
 */
export function buildCircuitTraces(count: number, seed: number): number[][] {
  const rng = makeRng(seed ^ 0x77aa31);
  const lines: number[][] = [];
  for (let i = 0; i < count; i++) {
    const pts: number[] = [];
    const theta0 = 0.25 + rng() * 1.15; // from near-pole downward
    const phi = rng() * Math.PI * 2;
    const steps = 5 + Math.floor(rng() * 5);
    let t = theta0;
    let p = phi;
    for (let s = 0; s < steps; s++) {
      const dir = new THREE.Vector3(
        -Math.cos(t),
        Math.sin(t) * Math.cos(p),
        Math.sin(t) * Math.sin(p),
      );
      // Traces must never cross the seam: clamp the walk to the −X side.
      if (dir.x >= -0.02) break;
      pts.push(dir.x, dir.y, dir.z);
      // Traces must never cross the seam: clamp the meridian walk before
      // the dome edge (t ≤ 1.5 rad keeps −cos(t) safely negative).
      t = Math.min(1.5, t + 0.1 + rng() * 0.09);
      p += (rng() - 0.5) * 0.22;
    }
    lines.push(pts);
  }
  return lines;
}
