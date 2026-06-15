// =============================================================================
// Chess Bot Personalities
//
// Each bot is a fully-formed character: a name, a story, an Elo target,
// a playing style, and — most importantly — a set of *evaluation weights*
// that the search uses to score positions. Two bots at the same Elo can
// play very different chess because their weights tilt them toward
// different ideas (attack the king, hoard pawns, refuse to trade, etc).
//
// The career mode marches the player up this ladder. Each opponent must
// be defeated to unlock the next.
// =============================================================================

export type BotStyle = 'aggressive' | 'positional' | 'defensive' | 'tactical' | 'endgame' | 'romantic';

export interface BotEvalWeights {
  /** multiplier on raw material balance (default 1.0) */
  material: number;
  /** multiplier on piece-square tables (default 1.0) */
  pst: number;
  /** bonus per legal move available (mobility, default 1.0) */
  mobility: number;
  /** bonus per attacker pointing at the enemy king's neighbourhood */
  kingAttack: number;
  /** bonus for advancing pawns (passed/connected pawns) */
  pawnPush: number;
  /** penalty for trading pieces when ahead (positive = avoids trades) */
  tradeAversion: number;
  /** chance of choosing a near-best random move (introduces human-like inaccuracy) */
  blunderRate: number;
  /** depth modifier added to base search depth */
  depthBonus: number;
}

export interface BotPersonality {
  id: string;
  ar: string;
  de: string;
  emoji: string;
  elo: number;
  style: BotStyle;
  /** short flavor text shown in the career picker */
  taglineAr: string;
  taglineDe: string;
  /** opening preferences — UCI move sequences this bot will choose first if available */
  preferredOpenings: string[];
  weights: BotEvalWeights;
}

export const BOTS: BotPersonality[] = [
  {
    id: 'sami',
    ar: 'سامي المبتدئ',
    de: 'Sami der Anfänger',
    emoji: '🐣',
    elo: 600,
    style: 'romantic',
    taglineAr: 'يحب أكل القطع، ينسى أن يحمي ملكه',
    taglineDe: 'Liebt es zu schlagen, vergisst seinen König',
    preferredOpenings: ['e2e4'],
    weights: {
      material: 1.1, pst: 0.4, mobility: 0.3, kingAttack: 0.2,
      pawnPush: 0.4, tradeAversion: 0.0, blunderRate: 0.35, depthBonus: -1,
    },
  },
  {
    id: 'lina',
    ar: 'لينا الحذرة',
    de: 'Lina die Vorsichtige',
    emoji: '🛡️',
    elo: 900,
    style: 'defensive',
    taglineAr: 'تكره المخاطرة، ترفض كل التضحيات',
    taglineDe: 'Hasst Risiko, lehnt jedes Opfer ab',
    preferredOpenings: ['d2d4', 'g1f3'],
    weights: {
      material: 1.3, pst: 0.7, mobility: 0.6, kingAttack: 0.3,
      pawnPush: 0.4, tradeAversion: 0.6, blunderRate: 0.15, depthBonus: 0,
    },
  },
  {
    id: 'rashid',
    ar: 'راشد المنطقي',
    de: 'Raschid der Logiker',
    emoji: '📐',
    elo: 1200,
    style: 'positional',
    taglineAr: 'يحب الهيكل النظيف، عدو البيادق المعزولة',
    taglineDe: 'Liebt klare Strukturen, hasst isolierte Bauern',
    preferredOpenings: ['d2d4', 'c2c4'],
    weights: {
      material: 1.0, pst: 1.3, mobility: 1.1, kingAttack: 0.5,
      pawnPush: 0.6, tradeAversion: 0.2, blunderRate: 0.08, depthBonus: 0,
    },
  },
  {
    id: 'fatima',
    ar: 'فاطمة الهجومية',
    de: 'Fatima die Stürmerin',
    emoji: '⚔️',
    elo: 1450,
    style: 'aggressive',
    taglineAr: 'تركض نحو ملكك في كل دور',
    taglineDe: 'Rennt jeden Zug auf deinen König zu',
    preferredOpenings: ['e2e4', 'f2f4'],
    weights: {
      material: 0.9, pst: 1.0, mobility: 1.0, kingAttack: 2.0,
      pawnPush: 1.2, tradeAversion: -0.2, blunderRate: 0.07, depthBonus: 0,
    },
  },
  {
    id: 'omar',
    ar: 'عمر التكتيكي',
    de: 'Omar der Taktiker',
    emoji: '🎯',
    elo: 1700,
    style: 'tactical',
    taglineAr: 'يرى الشوكات قبل أن تظهر',
    taglineDe: 'Sieht Gabeln vor dir',
    preferredOpenings: ['e2e4', 'g1f3'],
    weights: {
      material: 1.0, pst: 1.0, mobility: 1.4, kingAttack: 1.4,
      pawnPush: 0.5, tradeAversion: 0.0, blunderRate: 0.04, depthBonus: 1,
    },
  },
  {
    id: 'huda',
    ar: 'هدى النهايات',
    de: 'Huda Endspielmeisterin',
    emoji: '👑',
    elo: 1900,
    style: 'endgame',
    taglineAr: 'تبسط الموقف وتسحقك في النهاية',
    taglineDe: 'Vereinfacht und zermalmt im Endspiel',
    preferredOpenings: ['c2c4', 'g1f3'],
    weights: {
      material: 1.2, pst: 1.1, mobility: 1.0, kingAttack: 0.6,
      pawnPush: 1.5, tradeAversion: -0.3, blunderRate: 0.03, depthBonus: 1,
    },
  },
  {
    id: 'ziad',
    ar: 'زياد الرومانسي',
    de: 'Ziad der Romantiker',
    emoji: '🎭',
    elo: 2100,
    style: 'romantic',
    taglineAr: 'يضحي بالقلعة من أجل الجمال',
    taglineDe: 'Opfert den Turm für Schönheit',
    preferredOpenings: ['e2e4', 'f2f4'],
    weights: {
      material: 0.7, pst: 0.9, mobility: 1.2, kingAttack: 2.2,
      pawnPush: 1.0, tradeAversion: -0.5, blunderRate: 0.05, depthBonus: 1,
    },
  },
  {
    id: 'aisha',
    ar: 'عائشة البطلة',
    de: 'Aisha die Champion',
    emoji: '🏆',
    elo: 2400,
    style: 'positional',
    taglineAr: 'لا تخطئ. لا تضعف. لا ترحم.',
    taglineDe: 'Kein Fehler. Keine Schwäche. Kein Erbarmen.',
    preferredOpenings: ['d2d4', 'c2c4', 'g1f3', 'e2e4'],
    weights: {
      material: 1.05, pst: 1.3, mobility: 1.3, kingAttack: 1.2,
      pawnPush: 0.8, tradeAversion: 0.1, blunderRate: 0.01, depthBonus: 2,
    },
  },
];

export function botById(id: string): BotPersonality | null {
  return BOTS.find(b => b.id === id) ?? null;
}

// Map career index (0..7) → bot
export function botAtRank(rank: number): BotPersonality {
  return BOTS[Math.max(0, Math.min(BOTS.length - 1, rank))];
}
