// =============================================================================
// Dice Tournament — a 4-player single-elimination Pig bracket.
//
// Pig was chosen because it's quick (~2 min/match) and has rich strategic
// space: each AI can have a genuinely different threshold-and-bluff policy.
// Yatzy is too long for a 3-round bracket on mobile.
//
// Bracket flow:
//
//   Semi-Final A:  You         vs  Hassan   ───┐
//                                              ├─►  Final
//   Semi-Final B:  Layla       vs  Karim    ───┘
//
// Loser of each semi is dropped. The two survivors meet in the final.
// We persist the tournament state across page reloads so the user can
// step away mid-bracket and resume. Wins are recorded into dice-stats so
// the bot ladder feeds the same XP system as other modes.
// =============================================================================

export interface DicePersonality {
  id: string;
  ar: string;
  emoji: string;
  /** Pig hold threshold: roll until round-points >= this then bank. */
  baseHold: number;
  /** Catch-up multiplier: how aggressively they push when behind by 20+. */
  catchUp: number;
  /** When ahead by 20+, this many points subtracted from baseHold (defensive). */
  defensiveBias: number;
  /** Probability of an extra "lucky" roll past their threshold (greed). */
  greedRate: number;
  /** Bilingual flavor for the bracket sheet. */
  taglineAr: string;
}

export const DICE_BOTS: DicePersonality[] = [
  {
    id: 'hassan',
    ar: 'حسن المتسرع',
    emoji: '🦊',
    baseHold: 14,
    catchUp: 1.6,
    defensiveBias: 0,
    greedRate: 0.35,
    taglineAr: 'يرمي ويرمي حتى يفقد كل شيء',
  },
  {
    id: 'layla',
    ar: 'ليلى الحذرة',
    emoji: '🦉',
    baseHold: 18,
    catchUp: 1.1,
    defensiveBias: 4,
    greedRate: 0.05,
    taglineAr: 'تحفظ النقاط فور وصولها',
  },
  {
    id: 'karim',
    ar: 'كريم الذكي',
    emoji: '🐺',
    baseHold: 22,
    catchUp: 1.3,
    defensiveBias: 2,
    greedRate: 0.10,
    taglineAr: 'يحسب الاحتمالات في رأسه',
  },
];

// Compute the actual hold threshold for an AI given match state.
export function effectiveThreshold(
  bot: DicePersonality,
  selfScore: number,
  oppScore: number,
  target: number,
): number {
  const need = target - selfScore;
  // If a single push would win, go for it directly.
  if (need <= bot.baseHold + 5) return Math.max(8, need);
  let threshold = bot.baseHold;
  if (oppScore - selfScore >= 20) threshold = Math.round(threshold * bot.catchUp);
  if (selfScore - oppScore >= 20) threshold = Math.max(8, threshold - bot.defensiveBias);
  return threshold;
}

import { isSupabaseConfigured } from '@/integrations/supabase/client';

import { saveGameProgress } from '../api';

// =============================================================================
// Tournament state machine — persisted to localStorage so refresh resumes.
// =============================================================================
export type MatchSlot = 'player' | string; // bot id

export interface TournamentMatch {
  /** "semi-A" | "semi-B" | "final" */
  id: 'semi-A' | 'semi-B' | 'final';
  left: MatchSlot;
  right: MatchSlot | null;
  /** winner id once played; null until played */
  winner: MatchSlot | null;
  /** final scores, populated when match ends */
  finalScore?: { left: number; right: number };
}

export interface TournamentState {
  /** Random seed for the bracket — keeps it reproducible across sessions */
  seed: number;
  matches: TournamentMatch[];
  /** id of the next match the player should play, or null if tournament over */
  nextPlayerMatch: 'semi-A' | 'final' | null;
  /** "in-progress" | "won" | "lost" — status from the player's POV */
  status: 'in-progress' | 'won' | 'lost';
}
const KEY = 'dice-tournament';

export function loadTournament(): TournamentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TournamentState;
  } catch { return null; }
}
export function saveTournament(state: TournamentState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  if (isSupabaseConfigured) {
    saveGameProgress(KEY, state).catch(console.error);
  }
}
export function clearTournament() {
  localStorage.removeItem(KEY);
  if (isSupabaseConfigured) {
    saveGameProgress(KEY, {}).catch(console.error);
  }
}

// Build a fresh bracket: player is always in semi-A. Other 3 bots are seeded
// randomly into semi-A.right, semi-B.left, semi-B.right.
export function buildTournament(): TournamentState {
  // Shuffle the bots so each tournament feels different but predictable
  // within a session (the seed is stored).
  const seed = Math.floor(Math.random() * 1e9);
  const order = [...DICE_BOTS].sort(() => Math.random() - 0.5);
  const [a, b, c] = order;
  return {
    seed,
    matches: [
      { id: 'semi-A', left: 'player', right: a.id, winner: null },
      { id: 'semi-B', left: b.id, right: c.id, winner: null },
      { id: 'final',  left: 'player', right: null, winner: null }, // right resolved later
    ],
    nextPlayerMatch: 'semi-A',
    status: 'in-progress',
  };
}

// Simulate a fully AI-vs-AI match (semi-B). Returns winner id and scores.
// Uses Pig logic with both bots' personalities.
export function simulateMatch(leftId: string, rightId: string, target = 100): { winner: string; left: number; right: number } {
  const left = DICE_BOTS.find(b => b.id === leftId)!;
  const right = DICE_BOTS.find(b => b.id === rightId)!;
  let lScore = 0, rScore = 0;
  let safety = 0;
  while (safety++ < 200) {
    // Left's turn
    let round = 0;
    while (true) {
      const t = effectiveThreshold(left, lScore, rScore, target);
      if (round >= t || (Math.random() < left.greedRate && round >= t - 4 && round < t + 6)) {
        lScore += round;
        if (lScore >= target) return { winner: leftId, left: lScore, right: rScore };
        break;
      }
      const die = 1 + Math.floor(Math.random() * 6);
      if (die === 1) { round = 0; break; } // bust
      round += die;
    }
    // Right's turn
    round = 0;
    while (true) {
      const t = effectiveThreshold(right, rScore, lScore, target);
      if (round >= t || (Math.random() < right.greedRate && round >= t - 4 && round < t + 6)) {
        rScore += round;
        if (rScore >= target) return { winner: rightId, left: lScore, right: rScore };
        break;
      }
      const die = 1 + Math.floor(Math.random() * 6);
      if (die === 1) { round = 0; break; }
      round += die;
    }
  }
  // Fallback (should never happen)
  return { winner: lScore > rScore ? leftId : rightId, left: lScore, right: rScore };
}

// Record a player-vs-bot match result and advance the bracket.
export function recordPlayerMatch(state: TournamentState, matchId: 'semi-A' | 'final', result: { playerScore: number; botScore: number }): TournamentState {
  const next = { ...state, matches: state.matches.map(m => ({ ...m })) };
  const match = next.matches.find(m => m.id === matchId)!;
  const playerWon = result.playerScore > result.botScore;
  match.winner = playerWon ? 'player' : (matchId === 'semi-A' ? match.right! : match.right!);
  match.finalScore = { left: result.playerScore, right: result.botScore };

  if (matchId === 'semi-A') {
    if (playerWon) {
      // Resolve semi-B by simulation (already known if previously simulated)
      const semiB = next.matches.find(m => m.id === 'semi-B')!;
      if (!semiB.winner) {
        const sim = simulateMatch(semiB.left as string, semiB.right as string);
        semiB.winner = sim.winner;
        semiB.finalScore = { left: sim.left, right: sim.right };
      }
      const finalMatch = next.matches.find(m => m.id === 'final')!;
      finalMatch.right = semiB.winner;
      next.nextPlayerMatch = 'final';
    } else {
      // Player eliminated. Simulate the rest for narrative purposes.
      const semiB = next.matches.find(m => m.id === 'semi-B')!;
      if (!semiB.winner) {
        const sim = simulateMatch(semiB.left as string, semiB.right as string);
        semiB.winner = sim.winner;
        semiB.finalScore = { left: sim.left, right: sim.right };
      }
      const finalMatch = next.matches.find(m => m.id === 'final')!;
      finalMatch.left = match.right!; // bot that beat player advances
      finalMatch.right = semiB.winner;
      const sim2 = simulateMatch(finalMatch.left as string, finalMatch.right as string);
      finalMatch.winner = sim2.winner;
      finalMatch.finalScore = { left: sim2.left, right: sim2.right };
      next.nextPlayerMatch = null;
      next.status = 'lost';
    }
  } else {
    // final match
    next.nextPlayerMatch = null;
    next.status = playerWon ? 'won' : 'lost';
  }
  return next;
}
