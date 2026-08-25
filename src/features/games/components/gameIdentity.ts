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
  // Matches the in-page shells: Sudoku sky · Chess indigo · Memory pink.
  sudoku: {
    accent: 'hsl(199 89% 48%)',
    tint: 'hsl(199 89% 48% / 0.12)',
    line: 'hsl(199 89% 48% / 0.30)',
  },
  chess: {
    accent: 'hsl(221 83% 60%)',
    tint: 'hsl(221 83% 60% / 0.12)',
    line: 'hsl(221 83% 60% / 0.30)',
  },
  memory: {
    accent: 'hsl(328 80% 58%)',
    tint: 'hsl(328 80% 58% / 0.12)',
    line: 'hsl(328 80% 58% / 0.30)',
  },
};

/** Brighten/darken helper for the rare second tone a motif needs. */
export function identityShift(identity: GameIdentity, lDelta: number): string {
  const match = /hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)/.exec(identity.accent);
  if (!match) return identity.accent;
  const [, h, s, l] = match;
  return `hsl(${h} ${s}% ${Math.max(0, Math.min(100, Number(l) + lDelta))}%)`;
}
