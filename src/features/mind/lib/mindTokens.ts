/**
 * Shared Living-Mind design tokens and fold configuration.
 * Own file (not inside a component module) so components can import
 * constants without tripping fast-refresh constraints.
 */

import { type FoldOptions,hashStringToSeed } from './brainGeometry';

export const MIND_TOKENS = {
  void: '#0A0A0A',
  organicBase: '#B0674F',
  organicDeep: '#5E3226',
  organicGlow: '#FFC9A0',
  vessel: '#E86A4A',
  mechBase: '#23262D',
  mechEdge: '#3A4048',
  mechGlow: '#FFB84D',
  brass: '#B08D57',
  seam: '#F2E7C9',
  thread: '#C9A84C',
} as const;

/** Shared fold configuration — one brain, everywhere consistent. */
export const FOLD_OPTIONS: Required<FoldOptions> = {
  amplitude: 0.075,
  frequency: 4.2,
  seed: hashStringToSeed('living-mind-v2'),
  fissureDepth: 0.08,
  lateralDepth: 0.05,
};
