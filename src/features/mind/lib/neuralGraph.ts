/**
 * Living Mind v2 — neural graph layout.
 *
 * Turns real PKM data (notes + wiki-link edges) into a 3D constellation laid
 * over the two hemispheres. Pure math: no React, no WebGL, fully
 * deterministic given the same input (hash-seeded PRNG, no Math.random).
 *
 * Layout contract:
 *  - Organic notes live strictly on +X, mechanical strictly on −X.
 *  - Linked notes are pulled toward each other on the sphere (one gentle
 *    relaxation pass) so related thoughts cluster like they do in memory.
 *  - Arcs rise above the surface proportionally to their endpooints'
 *    angular distance, so long associations fly higher.
 */

import { Vector3 } from 'three';

import { makeRng } from './brainGeometry';

export type HemisphereSide = 'organic' | 'mechanical';

export interface GraphInputNote {
  id: string;
  hemisphere: HemisphereSide;
  /** Relative importance 0..1 (mass/backlinks) — drives size and lift. */
  weight: number;
}

export interface GraphNode {
  id: string;
  hemisphere: HemisphereSide;
  weight: number;
  /** Unit direction on the sphere. */
  dir: [number, number, number];
  /** Final world-space position (already lifted off the surface). */
  position: [number, number, number];
  /** Render radius for the node marker. */
  size: number;
}

export interface GraphArc {
  sourceId: string;
  targetId: string;
  crossHemisphere: boolean;
}

export interface NeuralGraph {
  nodes: GraphNode[];
  nodeById: Map<string, GraphNode>;
  arcs: GraphArc[];
}

const MIN_SEPARATION = 0.16; // radians ≈ 9° between sibling nodes

/**
 * Build the constellation. `links` holds [sourceId, targetId] pairs where
 * both ids must exist in `notes`; dangling links are ignored.
 */
export function buildNeuralGraph(
  notes: GraphInputNote[],
  links: Array<[string, string]>,
  surfaceRadius: number,
): NeuralGraph {
  const validIds = new Set(notes.map((n) => n.id));
  const arcs: GraphArc[] = [];
  const seen = new Set<string>();
  for (const [a, b] of links) {
    if (!validIds.has(a) || !validIds.has(b) || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const na = notes.find((n) => n.id === a)!;
    const nb = notes.find((n) => n.id === b)!;
    arcs.push({ sourceId: a, targetId: b, crossHemisphere: na.hemisphere !== nb.hemisphere });
  }

  // --- initial deterministic placement -----------------------------------
  const organic = notes.filter((n) => n.hemisphere === 'organic');
  const mechanical = notes.filter((n) => n.hemisphere === 'mechanical');
  const dirs = new Map<string, Vector3>();

  const seedRing = (list: GraphInputNote[], side: 1 | -1) => {
    // Fibonacci-spiral cap centered on ±X — even, organic spacing.
    const golden = Math.PI * (3 - Math.sqrt(5));
    const rng = makeRng(0x1ce7ecafe ^ (side > 0 ? 0x0f11 : 0x0f77));
    list.forEach((n, i) => {
      // Cap polar angle measured from ±X axis. Staying under π/2 keeps every
      // node strictly on its own side of the seam plane.
      const t = (i + 0.5) / Math.max(4, list.length);
      const polar = 0.14 + t * 1.28;
      const azim = i * golden + rng() * 0.35;
      // Direction with x dominant toward its side.
      const d = new Vector3(
        side * Math.cos(polar),
        Math.sin(polar) * Math.cos(azim),
        Math.sin(polar) * Math.sin(azim),
      ).normalize();
      dirs.set(n.id, d);
    });
  };
  seedRing(organic, 1);
  seedRing(mechanical, -1);

  // --- one relaxation pass: pull linked notes together --------------------
  const neighbors = new Map<string, string[]>();
  for (const arc of arcs) {
    (neighbors.get(arc.sourceId) ?? neighbors.set(arc.sourceId, []).get(arc.sourceId)!).push(arc.targetId);
    (neighbors.get(arc.targetId) ?? neighbors.set(arc.targetId, []).get(arc.targetId)!).push(arc.sourceId);
  }
  const PULL = 0.22;
  for (const [id, nbrs] of neighbors) {
    if (!nbrs.length) continue;
    const self = dirs.get(id);
    if (!self) continue;
    const acc = new Vector3();
    let wsum = 0;
    for (const nb of nbrs) {
      const other = dirs.get(nb);
      if (!other) continue;
      // Only pull within the same hemisphere — cross-hemisphere links stay
      // long and dramatic instead of dragging notes across the seam.
      const sameSide = Math.sign(self.x) === Math.sign(other.x);
      if (!sameSide) continue;
      const w = 1 / (1 + self.angleTo(other));
      acc.add(other.clone().multiplyScalar(w));
      wsum += w;
    }
    if (wsum === 0) continue;
    acc.divideScalar(wsum);
    const moved = self.clone().lerp(acc, PULL);
    // Enforce hemisphere side after the pull.
    moved.x = Math.max(0.08, moved.x) * Math.sign(self.x || 1);
    dirs.set(id, moved.normalize());
  }

  // --- enforce minimum separation per hemisphere (greedy relaxation) ------
  const relaxSide = (side: 1 | -1) => {
    const list = [...dirs.entries()].filter(([, d]) => Math.sign(d.x) === side);
    for (let iter = 0; iter < 24; iter++) {
      let anyClose = false;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [, di] = list[i];
          const [, dj] = list[j];
          const ang = di.angleTo(dj);
          if (ang >= MIN_SEPARATION) continue;
          anyClose = true;
          const push = (MIN_SEPARATION - ang) / 2;
          const axis = new Vector3().crossVectors(di, dj);
          if (axis.lengthSq() < 1e-8) {
            // Coincident — nudge j arbitrarily but deterministically.
            dj.applyAxisAngle(new Vector3(0, 1, 0), MIN_SEPARATION);
          } else {
            dj.applyAxisAngle(axis.clone().normalize(), push);
            di.applyAxisAngle(axis.clone().normalize(), -push);
          }
          // Keep them on their side of the seam.
          di.x = Math.max(0.08, di.x) * side;
          dj.x = Math.max(0.08, dj.x) * side;
          di.normalize();
          dj.normalize();
        }
      }
      if (!anyClose) break;
    }
  };
  relaxSide(1);
  relaxSide(-1);

  // --- finalize nodes ------------------------------------------------------
  const nodes: GraphNode[] = notes.map((n) => {
    const dir = dirs.get(n.id) ?? new Vector3(1, 0, 0);
    const lift = 0.02 + 0.07 * Math.min(1, Math.max(0, n.weight));
    const r = surfaceRadius * (1 + lift);
    return {
      id: n.id,
      hemisphere: n.hemisphere,
      weight: n.weight,
      dir: [dir.x, dir.y, dir.z],
      position: [dir.x * r, dir.y * r, dir.z * r],
      size: 0.008 + 0.028 * Math.min(1, Math.max(0, n.weight)),
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  return { nodes, nodeById, arcs };
}

// ---------------------------------------------------------------------------
// Arc sampling
// ---------------------------------------------------------------------------

/**
 * Sample an arc between two surface points using spherical interpolation
 * (slerp) plus a radial bulge peaking midway. Guarantees every sample stays
 * at or above the surface radius: short hops hug the shell while
 * inter-hemisphere leaps balloon high into space.
 */
export function sampleArc(
  a: [number, number, number],
  b: [number, number, number],
  surfaceRadius: number,
  segments = 40,
): Float32Array {
  const va = new Vector3(...a).normalize();
  const vb = new Vector3(...b).normalize();
  let angle = va.angleTo(vb);

  // Antipodal (or near-) pairs get a deterministic perpendicular mid-axis.
  let axis = new Vector3().crossVectors(va, vb);
  if (axis.lengthSq() < 1e-8 || Math.abs(Math.PI - angle) < 1e-6) {
    axis = new Vector3(0, 1, 0);
    if (Math.abs(va.y) > 0.9) axis.set(1, 0, 0);
    angle = Math.PI;
  }

  // Bulge height grows with angular distance.
  const H = surfaceRadius * (0.1 + 0.6 * Math.min(1, angle / Math.PI));
  const sinOmega = Math.sin(angle);

  const out = new Float32Array((segments + 1) * 3);
  const p = new Vector3();
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    // Slerp between the two unit directions.
    const w1 = Math.sin((1 - t) * angle) / sinOmega;
    const w2 = Math.sin(t * angle) / sinOmega;
    p.copy(va).multiplyScalar(w1).addScaledVector(vb, w2);
    if (p.lengthSq() < 1e-9) {
      p.copy(axis); // numerically degenerate midpoint
    } else {
      p.normalize();
    }
    // Radial bulge: zero at both ends, peaking mid-arc.
    const bulge = H * Math.pow(Math.sin(Math.PI * t), 1.2);
    p.multiplyScalar(surfaceRadius + bulge);
    out[s * 3] = p.x;
    out[s * 3 + 1] = p.y;
    out[s * 3 + 2] = p.z;
  }
  return out;
}
