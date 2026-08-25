// Curated tactical chess puzzles. Each puzzle is described by:
// - fen: starting position (FEN)
// - solution: a sequence of moves in UCI notation, e.g. "e2e4" or "e7e8q"
// - rating: rough Elo difficulty (400-2000)
// - theme: one of the canonical tactical motifs
//
// PLAY CONVENTION (mirrored by ChessPuzzle.tsx):
//  - solution.length >= 2 → solution[0] is the OPPONENT's setup move and is
//    auto-played; the user then plays every subsequent move.
//  - solution.length === 1 → the user IS the side to move in the FEN and must
//    find that single blow themselves.
//
// Every entry is machine-verified by chessPuzzles.test.ts: the full solution
// must replay legally through the chessCore engine, mover colors must match
// the convention, and mate-themed puzzles must end in an actual checkmate.

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

export const PUZZLES: ChessPuzzle[] = [
  // ─────────── Mate in 1 ───────────
  {
    id: 'm1-rook-backrank',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    rating: 800,
    theme: 'mateIn1',
    ar: 'مات بالقلعة على الصف الثامن',
  },
  {
    id: 'm1-rook-corner',
    fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1',
    solution: ['a1a8'],
    rating: 700,
    theme: 'mateIn1',
    ar: 'مات بالقلعة عبر الصف الأخير',
  },
  {
    id: 'm1-fools-mate',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    solution: ['d8h4'],
    rating: 800,
    theme: 'mateIn1',
    ar: 'مات الغبيب: نقلة الوزير التي تُنهي كل شيء',
  },
  {
    id: 'm1-sealed-backrank',
    fen: '4k3/3ppp2/n7/8/8/8/1P4PP/R5K1 b - - 0 1',
    solution: ['a6b4', 'a1a8'],
    rating: 700,
    theme: 'mateIn1',
    ar: 'بيادقُه تحبس ملكَه — أدخل القلعة',
  },
  {
    id: 'm1-smothered',
    fen: '6rk/6pp/3N4/8/8/8/8/6K1 w - - 0 1',
    solution: ['d6f7'],
    rating: 1300,
    theme: 'mateIn1',
    ar: 'مات الخنق: قطعه هي سجنُه والحصان هو الحكم',
  },
  {
    id: 'm1-queen-corner',
    fen: 'k7/pp6/2Q5/8/8/8/6PP/6K1 w - - 0 1',
    solution: ['c6c8'],
    rating: 650,
    theme: 'mateIn1',
    ar: 'مات الزاوية بالوزير',
  },
  {
    id: 'm1-promotion-backrank',
    fen: '7k/5Ppp/8/8/8/8/1B6/6K1 w - - 0 1',
    solution: ['f7f8q'],
    rating: 1050,
    theme: 'mateIn1',
    ar: 'ترقية تُنهي المعركة فوراً',
  },
  {
    id: 'm1-supported-queen',
    fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
    solution: ['g1g7'],
    rating: 750,
    theme: 'mateIn1',
    ar: 'الوزير المدعوم من الملك يُسقط الملك',
  },
  {
    id: 'm1-capture-backrank',
    fen: 'r5k1/2p2ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'],
    rating: 800,
    theme: 'mateIn1',
    ar: 'خذ القلعة وانتهِ: مات الصف الأخير',
  },
  {
    id: 'm1-re8-classic',
    fen: '6k1/pp3ppp/8/8/8/8/PPP2PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    rating: 750,
    theme: 'mateIn1',
    ar: 'الصف الثامن مفتوح — استغلّه',
  },
  {
    id: 'm1-queen-takes-rook',
    fen: 'r5k1/5ppp/8/8/8/8/5PPP/Q5K1 w - - 0 1',
    solution: ['a1a8'],
    rating: 1000,
    theme: 'mateIn1',
    ar: 'الوزير يأخذ القلعة ويعطي مات الصف الأخير',
  },
  {
    id: 'm1-underpromotion-capture',
    fen: '6rk/p6P/8/8/8/1B6/8/6K1 b - - 0 1',
    solution: ['a7a6', 'h7g8q'],
    rating: 1200,
    theme: 'mateIn1',
    ar: 'أكل وترقية: البيدق يصبح وزيراً وماتاً',
  },

  // ─────────── Mate in 2 ───────────
  {
    id: 'm2-rook-ladder',
    fen: '3k4/8/8/8/8/8/1R6/R5K1 b - - 0 1',
    solution: ['d8e8', 'b2b7', 'e8d8', 'a1a8'],
    rating: 1150,
    theme: 'mateIn2',
    ar: 'سلّم القلاتين: صف يقطع الطريق وصف يُنهي',
  },

  // ─────────── Forks ───────────
  {
    id: 'fork-royal-kq',
    fen: '3qk3/pp3p1p/8/8/4N3/8/PPP2PPP/6K1 b - - 0 1',
    solution: ['h7h6', 'e4f6', 'e8f8', 'f6d7'],
    rating: 850,
    theme: 'fork',
    ar: 'شوكة ملكية: الحصان يكش ويأخذ الوزير',
  },
  {
    id: 'fork-nq-g7',
    fen: '2q3k1/7p/8/5N2/8/8/5PP1/6K1 b - - 0 1',
    solution: ['h7h6', 'f5e7'],
    rating: 1150,
    theme: 'fork',
    ar: 'شوكة تكسب الوزير: كشٌ بالحصان ثم الأسر',
  },
  {
    id: 'fork-pawn-central',
    fen: '4k3/pp3ppp/2n1r3/8/3P4/8/P4PPP/6K1 b - - 0 1',
    solution: ['h7h6', 'd4d5'],
    rating: 700,
    theme: 'fork',
    ar: 'شوكة البيادق: بيدق يهدّد فرساً وقلعة',
  },

  // ─────────── Pins ───────────
  {
    id: 'pin-bishop-knight',
    fen: '4k3/pp4pp/2n5/1B6/3P4/8/5PPP/6K1 b - - 0 1',
    solution: ['g7g6', 'd4d5'],
    rating: 750,
    theme: 'pin',
    ar: 'الفيل يثبّت الفرس — ادفع البيادق وخذه',
  },
  {
    id: 'pin-queen-knight',
    fen: '1k6/p1p5/1n6/8/P7/1Q6/5PPP/6K1 b - - 0 1',
    solution: ['c7c6', 'a4a5'],
    rating: 700,
    theme: 'pin',
    ar: 'تثبيت الوزير للفرس أمام الملك',
  },
  {
    id: 'pin-exploit-bxf6',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p1B1/4P3/3P1N2/PPP2PPP/RN1Q1RK1 b kq - 1 1',
    solution: ['h7h6', 'g5f6'],
    rating: 1000,
    theme: 'pin',
    ar: 'التثبيت جاهز — استثمره والتقط الفرس',
  },

  // ─────────── Skewers ───────────
  {
    id: 'skewer-king-front-queen',
    fen: '4q3/8/8/4k3/8/8/8/R5K1 b - - 0 1',
    solution: ['e8e7', 'a1e1', 'e5d6', 'e1e7'],
    rating: 900,
    theme: 'skewer',
    ar: 'الاختزال: الكش يُخرج الملك فيأتي الدور على الوزير',
  },

  // ─────────── Discovery ───────────
  {
    id: 'discovery-rook-raid',
    fen: 'r2k4/7p/8/3N4/8/8/8/3RK3 w - - 0 1',
    solution: ['d5b6'],
    rating: 950,
    theme: 'discovery',
    ar: 'كش مكشوف من القلعة وفرسٌ يسرق قلعةً أخرى',
  },

  // ─────────── Double attack ───────────
  {
    id: 'doubleattack-queen-cross',
    fen: '2r3k1/7p/8/8/3Q4/8/5PP1/6K1 b - - 0 1',
    solution: ['h7h6', 'd4g4', 'g8h8', 'g4c8'],
    rating: 800,
    theme: 'doubleAttack',
    ar: 'الوزير يكش ويهاجم القلعة في وقت واحد',
  },

  // ─────────── Supported queen delivery ───────────
  {
    id: 'm1-qxg8-supported',
    fen: 'r6k/4N1pp/4Q3/8/8/8/5PPP/6K1 b - - 0 1',
    solution: ['a8g8', 'e6g8'],
    rating: 1250,
    theme: 'mateIn1',
    ar: 'بعد دفاع الخصم: الوزير يهبط في الزاوية محميّاً بالفرس',
  },

  // ─────────── Traps / free material ───────────
  {
    id: 'trap-guarded-piece',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1',
    solution: ['c6d4', 'f3d4'],
    rating: 650,
    theme: 'trap',
    ar: 'لا تلمس القطعة المحمية — الاسترجاع فوري',
  },
  {
    id: 'trap-hanging-rook',
    fen: '6k1/3r1ppp/8/8/3R4/8/5PPP/6K1 w - - 0 1',
    solution: ['d4d7'],
    rating: 500,
    theme: 'trap',
    ar: 'القلعة المعلّقة: التقطها بلا مقابل',
  },
  {
    id: 'trap-free-bishop',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 1',
    solution: ['c5f2', 'e1f2'],
    rating: 600,
    theme: 'trap',
    ar: 'أكل يبدو مغرياً… لكن الملك يسترجعه',
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
