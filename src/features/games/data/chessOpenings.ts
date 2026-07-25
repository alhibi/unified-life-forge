// =============================================================================
// Chess Opening Book — real named openings with ECO codes.
// Each line is a sequence of UCI half-moves (e2e4, etc.).
// The book is consulted while we are still inside its tree: we look up the
// current move sequence and pick a continuation. If the position drifts off
// the book we fall back to search-based AI.
//
// All openings are well-known main lines. We include both colors' replies so
// the AI can play either side authentically.
// =============================================================================

export interface OpeningEntry {
  eco: string;
  ar: string;
  // The move sequence in UCI notation. The first element is the very first
  // half-move (e.g. "e2e4"). All preceding moves must match for the book to
  // continue this line.
  moves: string[];
}

export const OPENINGS: OpeningEntry[] = [
  // -------- Open games (1.e4 e5) --------
  { eco: 'C50', ar: 'الإيطالية',
    moves: ['e2e4','e7e5','g1f3','b8c6','f1c4','f8c5','c2c3','g8f6','d2d3','d7d6'] },
  { eco: 'C65', ar: 'الإسبانية (روي لوبيز)',
    moves: ['e2e4','e7e5','g1f3','b8c6','f1b5','a7a6','b5a4','g8f6','e1g1','f8e7'] },
  { eco: 'C42', ar: 'دفاع البتروف',
    moves: ['e2e4','e7e5','g1f3','g8f6','f3e5','d7d6','e5f3','f6e4','d2d4','d6d5'] },
  { eco: 'C44', ar: 'الإسكتلندية',
    moves: ['e2e4','e7e5','g1f3','b8c6','d2d4','e5d4','f3d4','g8f6','b1c3','f8b4'] },
  { eco: 'C30', ar: 'مقامرة الملك',
    moves: ['e2e4','e7e5','f2f4','e5f4','g1f3','g7g5','h2h4','g5g4','f3e5','g8f6'] },

  // -------- Sicilian (1.e4 c5) --------
  { eco: 'B23', ar: 'الصقلية المفتوحة',
    moves: ['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3','a7a6'] },
  { eco: 'B27', ar: 'الصقلية - دراغون',
    moves: ['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3','g7g6'] },

  // -------- French / Caro-Kann (1.e4 e6 / 1.e4 c6) --------
  { eco: 'C00', ar: 'الفرنسية',
    moves: ['e2e4','e7e6','d2d4','d7d5','b1c3','g8f6','c1g5','f8e7','e4e5','f6d7'] },
  { eco: 'B10', ar: 'كارو-كان',
    moves: ['e2e4','c7c6','d2d4','d7d5','b1c3','d5e4','c3e4','c8f5','e4g3','f5g6'] },

  // -------- Closed games (1.d4) --------
  { eco: 'D02', ar: 'لندن',
    moves: ['d2d4','d7d5','g1f3','g8f6','c1f4','e7e6','e2e3','f8d6','f4g3','b8d7'] },
  { eco: 'D37', ar: 'مقامرة الوزير المرفوضة',
    moves: ['d2d4','d7d5','c2c4','e7e6','b1c3','g8f6','c1g5','f8e7','e2e3','e8g8'] },
  { eco: 'D85', ar: 'دفاع غرونفلد',
    moves: ['d2d4','g8f6','c2c4','g7g6','b1c3','d7d5','c4d5','f6d5','e2e4','d5c3'] },
  { eco: 'E60', ar: 'الهندية الملكية',
    moves: ['d2d4','g8f6','c2c4','g7g6','b1c3','f8g7','e2e4','d7d6','g1f3','e8g8'] },
  { eco: 'A45', ar: 'الهندية الجديدة',
    moves: ['d2d4','g8f6','c2c4','e7e6','g1f3','b7b6','g2g3','c8b7','f1g2','f8e7'] },

  // -------- Flank --------
  { eco: 'A04', ar: 'افتتاح ريتي',
    moves: ['g1f3','d7d5','c2c4','e7e6','g2g3','g8f6','f1g2','f8e7','e1g1','e8g8'] },
  { eco: 'A20', ar: 'افتتاح الإنجليزية',
    moves: ['c2c4','e7e5','b1c3','g8f6','g1f3','b8c6','g2g3','f8b4','f1g2','e8g8'] },

  // -------- Tricky lines worth knowing --------
  { eco: 'A40', ar: 'دفاع البولندي',
    moves: ['d2d4','b7b5','e2e4','c8b7','f1d3','e7e6','g1f3','g8f6','e1g1','f8e7'] },
];

// -------------------------------------------------------------------
// Lookup: given the UCI sequence played so far, return all continuations
// the book offers (next half-move). Each option carries the ECO code and
// localized name so callers can announce "Now in: Spanish".
// -------------------------------------------------------------------
export interface BookContinuation {
  uci: string;
  eco: string;
  ar: string;
  /** how many further moves remain in this line after we play this one */
  remaining: number;
}

export function bookContinuations(played: string[]): BookContinuation[] {
  const out: BookContinuation[] = [];
  for (const op of OPENINGS) {
    if (played.length >= op.moves.length) continue;
    let match = true;
    for (let i = 0; i < played.length; i++) {
      if (op.moves[i] !== played[i]) { match = false; break; }
    }
    if (!match) continue;
    out.push({
      uci: op.moves[played.length],
      eco: op.eco,
      ar: op.ar,
      remaining: op.moves.length - played.length - 1,
    });
  }
  return out;
}

// Returns the most-named opening currently matching the sequence.
// Used to display "Currently playing: Italian" while the AI is still in book.
export function recognizeOpening(played: string[]): { eco: string; ar: string; } | null {
  let best: OpeningEntry | null = null;
  for (const op of OPENINGS) {
    let match = true;
    const limit = Math.min(played.length, op.moves.length);
    for (let i = 0; i < limit; i++) if (op.moves[i] !== played[i]) { match = false; break; }
    if (!match) continue;
    if (!best || limit > Math.min(played.length, best.moves.length)) best = op;
  }
  if (!best) return null;
  return { eco: best.eco, ar: best.ar, };
}
