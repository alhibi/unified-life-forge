// Curated tactical chess puzzles. Each puzzle is described by:
// - fen: starting position (FEN)
// - solution: a sequence of moves in coordinate notation, e.g. "e2e4" or "e7e8q"
// - rating: rough Elo difficulty (0-3000)
// - theme: one of the canonical tactical motifs
// - sideToMove: 'w' | 'b' inferred from FEN
//
// The first move is the OPPONENT setup (pre-played) — the user plays from
// move index 1 onwards. solution[0] is auto-played by the engine.

export type PuzzleTheme =
  | 'mateIn1' | 'mateIn2' | 'fork' | 'pin' | 'skewer' | 'discovery' | 'doubleAttack' | 'sacrifice' | 'trap';

export interface ChessPuzzle {
  id: string;
  fen: string;
  solution: string[]; // UCI-style "e2e4"; promotion as "e7e8q"
  rating: number;
  theme: PuzzleTheme;
  ar: string;
}

// A small but solid hand-crafted puzzle bank covering classic motifs.
// Each "solution" starts with opponent's move (auto-played), then the user
// finds the tactical reply.
export const PUZZLES: ChessPuzzle[] = [
  // ------- Mate in 1 -------
  {
    id: 'p1',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    rating: 800,
    theme: 'mateIn1',
    ar: 'مات بالقلعة على الصف الثامن',
  },
  {
    id: 'p2',
    fen: '6k1/6pp/8/8/8/8/8/R6K w - - 0 1',
    solution: ['a1a8'],
    rating: 700,
    theme: 'mateIn1',
    ar: 'مات بالقلعة في الزاوية',
  },
  {
    id: 'p3',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1',
    solution: ['h4e1'],
    rating: 900,
    theme: 'mateIn1',
    ar: 'مات الراعي - الوزير الأسود يصل e1',
  },

  // ------- Forks -------
  {
    id: 'p4',
    // Knight fork: White knight on e5 forks king and queen.
    // Setup: black queen d7, king g7, knight on c5, white plays Nxd7 (no... fork via Ne6+).
    fen: '6k1/3q1pp1/8/2N5/8/8/5PPP/6K1 w - - 0 1',
    solution: ['c5e6'],
    rating: 1100,
    theme: 'fork',
    ar: 'الحصان يهجم على الملك والوزير معاً',
  },
  {
    id: 'p5',
    // Knight fork on f7+
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1',
    solution: ['c6d4', 'f3d4'],
    rating: 1000,
    theme: 'fork',
    ar: 'بعد Nxd4 يلاحظ الفرس البيض الفرصة',
  },
  {
    id: 'p6',
    // Royal fork by knight
    fen: '4k3/8/4q3/8/3N4/8/8/4K3 w - - 0 1',
    solution: ['d4f5'],
    rating: 900,
    theme: 'fork',
    ar: 'فرس يهجم على الملك والوزير',
  },

  // ------- Pin -------
  {
    id: 'p7',
    // Absolute pin then capture
    fen: 'r3k2r/ppp2ppp/2n2q2/3p4/3P4/2N2Q2/PPP2PPP/R3K2R w KQkq - 0 1',
    solution: ['c3d5', 'f6f3'],
    rating: 1200,
    theme: 'pin',
    ar: 'الوزير الأبيض يثبّت',
  },

  // ------- Skewer -------
  {
    id: 'p8',
    fen: '6k1/5ppp/8/3q4/8/8/3R4/6K1 w - - 0 1',
    solution: ['d2d5'],
    rating: 1000,
    theme: 'skewer',
    ar: 'القلعة تهدد الوزير ثم الملك',
  },

  // ------- Discovered attack -------
  {
    id: 'p9',
    // Discovered check + capture
    fen: '4k3/8/8/3N4/8/3R4/8/4K3 w - - 0 1',
    solution: ['d5e7'],
    rating: 1100,
    theme: 'discovery',
    ar: 'هجوم مكشوف من القلعة',
  },

  // ------- Mate in 2 -------
  {
    id: 'p10',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: ['d1d8', 'g8h7', 'd8h8'],
    rating: 1400,
    theme: 'mateIn2',
    ar: 'مات في نقلتين بالقلعة',
  },
  {
    id: 'p11',
    fen: 'r5k1/5ppp/8/8/8/8/5PPP/Q5K1 w - - 0 1',
    solution: ['a1a8', 'g8h7', 'a8h8'],
    rating: 1300,
    theme: 'mateIn2',
    ar: 'الوزير يخترق الصف الأخير',
  },

  // ------- Sacrifice -------
  {
    id: 'p12',
    // Queen sacrifice for back-rank mate
    fen: '6k1/5ppp/8/8/8/8/4Q1PP/4R1K1 w - - 0 1',
    solution: ['e2e8', 'g8e8', 'e1e8'],
    rating: 1500,
    theme: 'sacrifice',
    ar: 'تضحية بالوزير للوصول للمات على الصف الأخير',
  },
  {
    id: 'p13',
    // Smothered mate setup
    fen: '6rk/6pp/8/7N/8/8/8/3R3K w - - 0 1',
    solution: ['d1d8', 'g8d8', 'h5f6'],
    rating: 1700,
    theme: 'sacrifice',
    ar: 'مزيج: تضحية بالقلعة ثم مات الفرس',
  },

  // ------- Double attack -------
  {
    id: 'p14',
    // Queen forks two pieces
    fen: '4k3/8/4q3/8/4Q3/8/8/4K3 w - - 0 1',
    solution: ['e4h7'],
    rating: 1000,
    theme: 'doubleAttack',
    ar: 'الوزير يهاجم قطعتين معاً',
  },

  // ------- More variety -------
  {
    id: 'p15',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 1',
    solution: ['c5f2', 'e1f2'],
    rating: 900,
    theme: 'sacrifice',
    ar: 'تضحية صغيرة لاكتساب موقع',
  },
  {
    id: 'p16',
    fen: '6k1/pp3ppp/8/8/8/8/PPP2PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    rating: 800,
    theme: 'mateIn1',
    ar: 'مات بالقلعة في نهاية مفتوحة',
  },
  {
    id: 'p17',
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: ['d1d8'],
    rating: 1100,
    theme: 'pin',
    ar: 'تثبيت ثم تبادل',
  },
  {
    id: 'p18',
    fen: '6k1/3r1ppp/8/8/3R4/8/5PPP/6K1 w - - 0 1',
    solution: ['d4d7'],
    rating: 700,
    theme: 'fork',
    ar: 'القلعة تأكل القلعة!',
  },
  {
    id: 'p19',
    fen: 'r3k2r/8/8/8/8/8/8/3RKR2 w kq - 0 1',
    solution: ['d1d8'],
    rating: 800,
    theme: 'mateIn1',
    ar: 'تنفيذ مات الصف الخلفي',
  },
  {
    id: 'p20',
    // Bishop sacrifice on h7 (Greek gift)
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 1',
    solution: ['c1g5', 'h7h6', 'g5f6'],
    rating: 1300,
    theme: 'pin',
    ar: 'تثبيت الفرس بالحصان',
  },
];

// Helpers used by the puzzle UI
export function fenSideToMove(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return (parts[1] === 'b' ? 'b' : 'w');
}

export function moveFromUci(uci: string): { from: [number, number]; to: [number, number]; promotion?: string } {
  const file = (c: string) => 'abcdefgh'.indexOf(c);
  const rank = (c: string) => 8 - parseInt(c, 10); // FEN rank 1 = row 7
  const from: [number, number] = [rank(uci[1]), file(uci[0])];
  const to: [number, number] = [rank(uci[3]), file(uci[2])];
  return { from, to, promotion: uci[4] };
}

export function uciFromMove(from: [number, number], to: [number, number], promotion?: string): string {
  const fileC = (c: number) => 'abcdefgh'[c];
  const rankC = (r: number) => String(8 - r);
  return `${fileC(from[1])}${rankC(from[0])}${fileC(to[1])}${rankC(to[0])}${promotion ? promotion : ''}`;
}

// Parse FEN piece placement to a board (8x8). Returns array of arrays where
// each cell is { type, color } or null. Type uses uppercase letter; color is
// 'w' | 'b'.
export interface PuzzlePiece { type: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'; color: 'w' | 'b' }
export type PuzzleBoard = (PuzzlePiece | null)[][];

export function fenToBoard(fen: string): PuzzleBoard {
  const board: PuzzleBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  const placement = fen.split(' ')[0];
  const ranks = placement.split('/');
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of ranks[r]) {
      if (/\d/.test(ch)) { c += parseInt(ch, 10); continue; }
      const isWhite = ch === ch.toUpperCase();
      const t = ch.toUpperCase() as PuzzlePiece['type'];
      board[r][c] = { type: t, color: isWhite ? 'w' : 'b' };
      c++;
    }
  }
  return board;
}
