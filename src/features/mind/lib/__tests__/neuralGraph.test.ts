import { describe, expect, it } from 'vitest';

import {
  buildNeuralGraph,
  type GraphInputNote,
  sampleArc,
} from '../neuralGraph';

function note(id: string, hemisphere: 'organic' | 'mechanical', weight = 0.5): GraphInputNote {
  return { id, hemisphere, weight };
}

describe('buildNeuralGraph', () => {
  it('ignores dangling links and self-links, dedupes undirected pairs', () => {
    const notes = [note('a', 'organic'), note('b', 'mechanical'), note('c', 'organic')];
    const links: Array<[string, string]> = [
      ['a', 'b'],
      ['b', 'a'], // duplicate of the above, reversed
      ['a', 'ghost'], // dangling
      ['c', 'c'], // self link
    ];
    const g = buildNeuralGraph(notes, links, 1);
    expect(g.arcs).toHaveLength(1);
    expect(g.nodes).toHaveLength(3);
    expect(g.nodeById.get('a')).toBeDefined();
  });

  it('keeps organic nodes strictly +X and mechanical strictly −X', () => {
    const notes: GraphInputNote[] = [];
    for (let i = 0; i < 40; i++) notes.push(note(`org-${i}`, 'organic', i / 40));
    for (let i = 0; i < 40; i++) notes.push(note(`mec-${i}`, 'mechanical', i / 40));
    const g = buildNeuralGraph(notes, [], 1);
    for (const n of g.nodes) {
      if (n.hemisphere === 'organic') expect(n.dir[0]).toBeGreaterThan(0);
      else expect(n.dir[0]).toBeLessThan(0);
      // Unit direction.
      const len = Math.hypot(...n.dir);
      expect(len).toBeCloseTo(1, 5);
    }
  });

  it('pulls linked same-hemisphere notes closer than unlinked pairs on average', () => {
    // Two clusters of three organic notes each; only cluster A is interlinked.
    const ids = ['a1', 'a2', 'a3', 'z1', 'z2', 'z3'];
    const notes = ids.map((id) => note(id, 'organic'));
    const links: Array<[string, string]> = [
      ['a1', 'a2'],
      ['a2', 'a3'],
      ['a1', 'a3'],
    ];
    const g = buildNeuralGraph(notes, links, 1);
    const ang = (p: string, q: string) => {
      const P = g.nodeById.get(p)!.dir;
      const Q = g.nodeById.get(q)!.dir;
      return Math.acos(Math.max(-1, Math.min(1, P[0] * Q[0] + P[1] * Q[1] + P[2] * Q[2])));
    };
    const linkedMean =
      (ang('a1', 'a2') + ang('a2', 'a3') + ang('a1', 'a3')) / 3;
    const looseMean = (ang('z1', 'z2') + ang('z2', 'z3')) / 2;
    expect(linkedMean).toBeLessThan(looseMean);
  });

  it('enforces minimum separation between sibling nodes', () => {
    const MIN = 0.16;
    const notes = Array.from({ length: 30 }, (_, i) => note(`n${i}`, 'organic', 0.5));
    const g = buildNeuralGraph(notes, [], 1);
    for (let i = 0; i < g.nodes.length; i++) {
      for (let j = i + 1; j < g.nodes.length; j++) {
        const A = g.nodes[i].dir;
        const B = g.nodes[j].dir;
        const dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
        expect(Math.acos(dot)).toBeGreaterThanOrEqual(MIN - 1e-4);
      }
    }
  });

  it('is deterministic across calls with identical input', () => {
    const mk = () => {
      const notes = [
        note('x', 'organic', 0.7),
        note('y', 'organic', 0.2),
        note('w', 'mechanical', 0.9),
      ];
      const g1 = buildNeuralGraph(notes, [['x', 'y']], 1);
      // rebuild fresh inputs to avoid shared mutation concerns
      const notes2 = [
        note('x', 'organic', 0.7),
        note('y', 'organic', 0.2),
        note('w', 'mechanical', 0.9),
      ];
      const g2 = buildNeuralGraph(notes2, [['x', 'y']], 1);
      return [g1, g2] as const;
    };
    const [g1, g2] = mk();
    expect(g1.nodes.map((n) => n.position)).toEqual(g2.nodes.map((n) => n.position));
  });

  it('sizes and lifts nodes by weight', () => {
    const g = buildNeuralGraph([note('big', 'organic', 1), note('small', 'organic', 0)], [], 1);
    const big = g.nodeById.get('big')!;
    const small = g.nodeById.get('small')!;
    expect(big.size).toBeGreaterThan(small.size);
    const bigR = Math.hypot(...big.position);
    const smallR = Math.hypot(...small.position);
    expect(bigR).toBeGreaterThan(smallR);
  });
});

describe('sampleArc', () => {
  it('returns segments+1 points in world space', () => {
    const pts = sampleArc([1, 0, 0], [0, 1, 0], 1, 20);
    expect(pts.length).toBe(21 * 3);
    expect(pts[0]).toBeCloseTo(1, 5);
    expect(pts[1]).toBeCloseTo(0, 5);
  });

  it('arcs higher for wide angles than short hops', () => {
    const shortHop = sampleArc(
      [Math.cos(0.2), Math.sin(0.2), 0],
      [1, 0, 0],
      1,
      10,
    );
    const wide = sampleArc([-1, 0, 0], [1, 0, 0], 1, 10);
    const peak = (pts: Float32Array) => {
      let m = -Infinity;
      for (let i = 0; i < pts.length; i += 3) {
        m = Math.max(m, Math.hypot(pts[i], pts[i + 1], pts[i + 2]));
      }
      return m;
    };
    // Both arcs stay above the surface at their peak…
    expect(peak(shortHop)).toBeGreaterThan(1.02);
    // …and the wide one flies distinctly higher.
    expect(peak(wide)).toBeGreaterThan(peak(shortHop));
  });
});
