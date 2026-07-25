/**
 * Mode registry — the catalogue of how each of the three games can be played.
 *
 * Previously the hub hardcoded mode names as bare strings inside its card data
 * (`modes: ['كلاسيكي', 'بلا نهاية', 'سباق وقت', …]`) with no link to anything
 * real: the strings were decorative, some of them did not correspond to a mode
 * the game actually had, and none of them was addressable. Here every mode has
 * an id that matches the progression system's `GameMode`, a route that opens it,
 * and a one-line description of its ruleset.
 */
import type { GameId, GameMode } from '../progression/types';

export interface ModeDef {
  id: GameMode;
  label: string;
  /** What makes this mode different, in one line. */
  detail: string;
  /** Route that opens the game already in this mode. */
  path: string;
  /** Whether the mode's per-mode record is better when lower (e.g. seconds). */
  recordLowerIsBetter?: boolean;
  /** Label for the mode's record, when it keeps one. */
  recordLabel?: string;
  /** Marks the flagship "campaign"-style modes so the UI can weight them. */
  flagship?: boolean;
}

export interface GameDef {
  id: GameId;
  label: string;
  /** One-line pitch. */
  tagline: string;
  path: string;
  modes: readonly ModeDef[];
}

export const GAMES: readonly GameDef[] = [
  {
    id: 'sudoku',
    label: 'سودوكو',
    tagline: 'منطق الشبكة، بخمسة أنماط ومستويات صعوبة متدرجة.',
    path: '/games/sudoku',
    modes: [
      {
        id: 'sudoku-classic',
        label: 'كلاسيكي',
        detail: 'الشبكة المعتادة ٩×٩ بقواعدها الأصلية.',
        path: '/games/sudoku?mode=classic',
        recordLabel: 'أسرع إنجاز',
        recordLowerIsBetter: true,
      },
      {
        id: 'sudoku-x',
        label: 'إكس',
        detail: 'قيد إضافي: القُطران يجب أن يحتويا ١–٩ دون تكرار.',
        path: '/games/sudoku?mode=x',
      },
      {
        id: 'sudoku-time-attack',
        label: 'سباق الوقت',
        detail: 'مؤقّت تنازلي؛ الحلّ قبل انتهاء الوقت أو تخسر.',
        path: '/games/sudoku?mode=time-attack',
        recordLabel: 'أسرع إنجاز',
        recordLowerIsBetter: true,
      },
      {
        id: 'sudoku-flawless',
        label: 'بلا أخطاء',
        detail: 'خطأ واحد يُنهي الجولة. لا تلميحات.',
        path: '/games/sudoku?mode=flawless',
        recordLabel: 'جولات ناجحة',
      },
      {
        id: 'sudoku-daily',
        label: 'شبكة اليوم',
        detail: 'شبكة واحدة لكل يوم، نفسها لكل اللاعبين.',
        path: '/games/sudoku?mode=daily',
      },
    ],
  },
  {
    id: 'chess',
    label: 'الشطرنج',
    tagline: 'محرّك بعمق تفكير متدرّج، ألغاز تكتيكية، ومسيرة أبطال.',
    path: '/games/chess',
    modes: [
      {
        id: 'chess-versus-ai',
        label: 'ضد المحرّك',
        detail: 'ثمانية مستويات من عمق البحث والتقييم.',
        path: '/games/chess',
      },
      {
        id: 'chess-local',
        label: 'لاعبان',
        detail: 'على الجهاز نفسه، بلوحة تدور مع الدور.',
        path: '/games/chess?mode=local',
      },
      {
        id: 'chess-blitz',
        label: 'بليتز',
        detail: 'ساعة لكل لاعب؛ الوقت جزء من اللعبة.',
        path: '/games/chess?mode=blitz',
      },
      {
        id: 'chess-puzzles',
        label: 'ألغاز',
        detail: 'مات، شوكة، تثبيت، تضحية، وهجوم مكشوف.',
        path: '/games/chess/puzzles',
        recordLabel: 'ألغاز محلولة',
        flagship: true,
      },
      {
        id: 'chess-career',
        label: 'المسيرة',
        detail: 'ثمانية خصوم بأسلوب لعب مختلف وتقييم متصاعد.',
        path: '/games/chess/career',
        recordLabel: 'أعلى تقييم',
        flagship: true,
      },
    ],
  },
  {
    id: 'memory',
    label: 'أزواج الذاكرة',
    tagline: 'مطابقة بصرية بستة أنماط، من الهادئ إلى اللانهائي.',
    path: '/games/memory',
    modes: [
      {
        id: 'memory-classic',
        label: 'كلاسيكي',
        detail: 'لوحة ثابتة؛ طابِق كل الأزواج بأقل عدد محاولات.',
        path: '/games/memory',
        recordLabel: 'أقل محاولات',
        recordLowerIsBetter: true,
      },
      {
        id: 'memory-endless',
        label: 'بلا نهاية',
        detail: 'كل جولة تكبر اللوحة ويقصر الوقت.',
        path: '/games/memory?mode=endless',
        recordLabel: 'أعلى جولة',
        flagship: true,
      },
      {
        id: 'memory-time-attack',
        label: 'سباق الوقت',
        detail: 'أكبر عدد من الأزواج في وقت محدّد.',
        path: '/games/memory?mode=time',
        recordLabel: 'أعلى نتيجة',
      },
      {
        id: 'memory-versus',
        label: 'ضد الخصم',
        detail: 'تبادل الأدوار مع خصم يتذكّر ما كشفته.',
        path: '/games/memory?mode=versus',
      },
      {
        id: 'memory-daily',
        label: 'لوحة اليوم',
        detail: 'لوحة واحدة لكل يوم بترتيب ثابت.',
        path: '/games/memory?mode=daily',
      },
      {
        id: 'memory-adventure',
        label: 'المغامرة',
        detail: 'خمسة عشر محطة بأهداف نجوم متصاعدة.',
        path: '/games/memory/adventure',
        recordLabel: 'محطات مكتملة',
        flagship: true,
      },
    ],
  },
] as const;

export function findGame(id: GameId): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}

export function findMode(id: GameMode): ModeDef | undefined {
  for (const game of GAMES) {
    const mode = game.modes.find((m) => m.id === id);
    if (mode) return mode;
  }
  return undefined;
}

export const TOTAL_MODES = GAMES.reduce((acc, game) => acc + game.modes.length, 0);
