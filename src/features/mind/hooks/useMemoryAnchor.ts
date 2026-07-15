import { useMemo } from 'react';

/** Fast deterministic hash → [0, 1). */
function hashToUnit(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export type Hemisphere = 'organic' | 'mechanical';

/**
 * Deterministic surface point for a note on the mind. Stable across
 * renders and sessions, no DB column required.
 *
 * Organic = +x side; Mechanical = -x side. The seam sits at x = 0.
 */
export function useMemoryAnchor(noteId: string, hemisphere: Hemisphere, radius: number): readonly [number, number, number] {
  return useMemo(() => anchorFor(noteId, hemisphere, radius), [noteId, hemisphere, radius]);
}

export function anchorFor(noteId: string, hemisphere: Hemisphere, radius: number): readonly [number, number, number] {
  const u = hashToUnit(noteId);
  const v = hashToUnit(noteId + ':v');
  const theta = u * Math.PI;                        // polar 0..π
  // Confine longitude to one hemisphere: organic 0..π/2, mechanical π..3π/2.
  const phiBase = v * Math.PI * 0.9 - Math.PI * 0.45;
  const phi = hemisphere === 'organic' ? phiBase : Math.PI + phiBase;
  return [
    radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.sin(phi),
  ] as const;
}