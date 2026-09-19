/**
 * gameIdentity — the single source of each game's visual identity on the hub.
 *
 * The hub used to render all three games identically: same grey icon plate,
 * same primary-colored buttons, nothing distinguishing sudoku from chess at a
 * glance. Meanwhile every game PAGE already had its own strong accent (the
 * GameShell `accentColor`). This module brings the hub in line: each game gets
 * one accent, derived tints, and a signature motif, reused everywhere the game
 * appears so the association sticks.
 */

import type { GameId } from '../progression/types';

export interface GameIdentity {
  /** Solid accent, `hsl(H S% L%)`. Used for CTAs and strokes. */
  accent: string;
  /** Same hue pre-baked as a translucent wash for plates and glows. */
  tint: string;
  /** Same hue pre-baked as a hairline border tone. */
  line: string;
}

export const GAME_IDENTITY: Record<GameId, GameIdentity> = {
  // Each game borrows one hue from the shared data palette, so the hub reads
  // as one system and both themes stay in step.
  sudoku: {
    accent: 'hsl(var(--data-4))',
    tint: 'hsl(var(--data-4) / 0.12)',
    line: 'hsl(var(--data-4) / 0.30)',
  },
  chess: {
    accent: 'hsl(var(--data-6))',
    tint: 'hsl(var(--data-6) / 0.12)',
    line: 'hsl(var(--data-6) / 0.30)',
  },
  memory: {
    accent: 'hsl(var(--data-5))',
    tint: 'hsl(var(--data-5) / 0.12)',
    line: 'hsl(var(--data-5) / 0.30)',
  },
};

/** Brighten/darken helper for the rare second tone a motif needs. */
export function identityShift(identity: GameIdentity, lDelta: number): string {
  const match = /hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)/.exec(identity.accent);
  if (!match) return identity.accent;
  const [, h, s, l] = match;
  return `hsl(${h} ${s}% ${Math.max(0, Math.min(100, Number(l) + lDelta))}%)`;
}
