// =============================================================================
// Memory Adventure — a 15-stage campaign that takes the player through
// progressively harder islands. Each stage has:
//
//  - a theme (icon set + visual mood)
//  - a unique twist rule that changes how the game plays
//  - a star rating (1-3) earned based on time and mistakes
//  - boss stages every 5 islands that combine multiple twists
//
// The campaign makes the Memory game feel like an actual *world* rather
// than a pile of puzzles. Each twist is tested; nothing is decorative.
// =============================================================================

export type Twist =
  | 'plain'              // no twist
  | 'shrinkingPeek'      // start with a 2s reveal, no peek power-up
  | 'shuffleEvery5'      // unmatched cards reshuffle every 5 moves
  | 'fogOfMemory'        // matched cards fade away after 3 seconds
  | 'doubleVision'       // two pairs of each icon (4 of a kind, match 2 at a time)
  | 'mirrorMatch'        // matched pair must be in adjacent squares
  | 'silentMode'         // no sound, no flip animation
  | 'chainBonus'         // chain >= 3 required for victory
  | 'darkness'           // whole board darkens; only flipped cards visible
  | 'speedrun';          // strict time limit, no second chances

export interface AdventureStage {
  id: number;
  ar: string;
  de: string;
  storyAr: string;
  storyDe: string;
  themeId: 'classic' | 'animals' | 'food' | 'space' | 'sport' | 'flags';
  pairs: number;
  cols: number;
  twist: Twist;
  /** time in seconds for 3-star rating */
  threeStarTime: number;
  /** maximum mistakes before losing 1 star */
  starMistakeBudget: number;
  /** marks every fifth stage as a boss */
  isBoss: boolean;
}

export const STAGES: AdventureStage[] = [
  // -------- Island 1: Garden of Beginnings --------
  {
    id: 1,
    ar: 'حديقة البدايات',
    de: 'Garten der Anfänge',
    storyAr: 'تبدأ رحلتك في حديقة هادئة. ستة أزواج فقط من الفواكه — مهمة سهلة.',
    storyDe: 'Deine Reise beginnt in einem ruhigen Garten. Nur sechs Paare Früchte.',
    themeId: 'classic', pairs: 6, cols: 3, twist: 'plain',
    threeStarTime: 25, starMistakeBudget: 2, isBoss: false,
  },
  {
    id: 2,
    ar: 'بستان الفاكهة',
    de: 'Obstplantage',
    storyAr: 'ثماني ثمرات هذه المرة. دقّق نظرك.',
    storyDe: 'Acht Früchte diesmal. Bleib aufmerksam.',
    themeId: 'classic', pairs: 8, cols: 4, twist: 'plain',
    threeStarTime: 35, starMistakeBudget: 3, isBoss: false,
  },
  {
    id: 3,
    ar: 'لمحة سريعة',
    de: 'Kurze Vorschau',
    storyAr: 'ستظهر البطاقات لثانيتين فقط في البداية. احفظها بسرعة!',
    storyDe: 'Karten werden 2 Sekunden gezeigt. Schnell merken!',
    themeId: 'classic', pairs: 8, cols: 4, twist: 'shrinkingPeek',
    threeStarTime: 35, starMistakeBudget: 2, isBoss: false,
  },
  {
    id: 4,
    ar: 'غابة الحيوانات',
    de: 'Tierwald',
    storyAr: 'حيوانات الغابة تختبئ. اعثر على أزواجها.',
    storyDe: 'Die Tiere des Waldes verstecken sich.',
    themeId: 'animals', pairs: 10, cols: 4, twist: 'plain',
    threeStarTime: 50, starMistakeBudget: 4, isBoss: false,
  },

  // -------- Island 2: Shifting Sands (boss #5) --------
  {
    id: 5,
    ar: '🏆 رمال متحركة',
    de: '🏆 Wandersand',
    storyAr: 'البوس الأول! البطاقات غير المتطابقة تختلط كل 5 حركات.',
    storyDe: 'Erster Boss! Unaufgedeckte Karten mischen sich alle 5 Züge.',
    themeId: 'animals', pairs: 10, cols: 4, twist: 'shuffleEvery5',
    threeStarTime: 60, starMistakeBudget: 4, isBoss: true,
  },

  // -------- Island 3: Kitchen Chaos --------
  {
    id: 6,
    ar: 'مطبخ الفوضى',
    de: 'Küchenchaos',
    storyAr: 'الأطعمة كثيرة. حافظ على هدوئك.',
    storyDe: 'Viele Gerichte. Bleib ruhig.',
    themeId: 'food', pairs: 12, cols: 4, twist: 'plain',
    threeStarTime: 70, starMistakeBudget: 5, isBoss: false,
  },
  {
    id: 7,
    ar: 'ضباب الذاكرة',
    de: 'Gedächtnisnebel',
    storyAr: 'البطاقات المطابقة تتلاشى بعد 3 ثوان. لا تنسَ مواقعها!',
    storyDe: 'Gefundene Paare verblassen nach 3s. Vergiss ihre Position nicht!',
    themeId: 'food', pairs: 10, cols: 4, twist: 'fogOfMemory',
    threeStarTime: 60, starMistakeBudget: 3, isBoss: false,
  },
  {
    id: 8,
    ar: 'رؤية مزدوجة',
    de: 'Doppelte Sicht',
    storyAr: 'كل أيقونة لها أربع نسخ. طابق اثنتين منهم.',
    storyDe: 'Jedes Icon viermal. Finde zwei davon.',
    themeId: 'food', pairs: 8, cols: 4, twist: 'doubleVision',
    threeStarTime: 80, starMistakeBudget: 6, isBoss: false,
  },
  {
    id: 9,
    ar: 'انعكاس المرآة',
    de: 'Spiegelbild',
    storyAr: 'الزوج يجب أن يكون في خليتين متجاورتين.',
    storyDe: 'Paar muss in benachbarten Feldern sein.',
    themeId: 'food', pairs: 8, cols: 4, twist: 'mirrorMatch',
    threeStarTime: 70, starMistakeBudget: 4, isBoss: false,
  },

  // -------- Island 4: Cosmos (boss #10) --------
  {
    id: 10,
    ar: '🏆 صمت الفضاء',
    de: '🏆 Stille im All',
    storyAr: 'البوس الثاني! لا صوت ولا حركة. الذاكرة فقط.',
    storyDe: 'Zweiter Boss! Keine Sounds, keine Animation. Nur Gedächtnis.',
    themeId: 'space', pairs: 12, cols: 4, twist: 'silentMode',
    threeStarTime: 75, starMistakeBudget: 4, isBoss: true,
  },

  // -------- Island 5: Athletes --------
  {
    id: 11,
    ar: 'ملعب الأبطال',
    de: 'Stadion der Helden',
    storyAr: 'الكومبو ضروري. اربط 3 أزواج متتالية لإنهاء المرحلة.',
    storyDe: 'Combo erforderlich. 3 Paare in Folge zum Abschluss.',
    themeId: 'sport', pairs: 12, cols: 4, twist: 'chainBonus',
    threeStarTime: 90, starMistakeBudget: 5, isBoss: false,
  },
  {
    id: 12,
    ar: 'ظلام الجبل',
    de: 'Dunkler Berg',
    storyAr: 'الظلام يخيّم. لا ترى إلا البطاقات المقلوبة.',
    storyDe: 'Dunkelheit. Du siehst nur aufgedeckte Karten.',
    themeId: 'space', pairs: 10, cols: 4, twist: 'darkness',
    threeStarTime: 75, starMistakeBudget: 4, isBoss: false,
  },

  // -------- Final stretch --------
  {
    id: 13,
    ar: 'سباق الزمن',
    de: 'Wettlauf',
    storyAr: 'وقت محدود! 60 ثانية فقط لإنهاء كل شيء.',
    storyDe: '60s, sonst Niederlage.',
    themeId: 'flags', pairs: 12, cols: 4, twist: 'speedrun',
    threeStarTime: 45, starMistakeBudget: 3, isBoss: false,
  },
  {
    id: 14,
    ar: 'أعلام العالم',
    de: 'Flaggen der Welt',
    storyAr: 'لا تخلط بين الأعلام المتشابهة!',
    storyDe: 'Verwechsle keine ähnlichen Flaggen!',
    themeId: 'flags', pairs: 14, cols: 4, twist: 'fogOfMemory',
    threeStarTime: 80, starMistakeBudget: 4, isBoss: false,
  },

  // -------- Final boss #15 --------
  {
    id: 15,
    ar: '👑 إمبراطور الذاكرة',
    de: '👑 Gedächtniskaiser',
    storyAr: 'البوس الأخير! 18 زوجاً، ضباب الذاكرة، وخلط كل 5 حركات. أثبت أنك سيد الذاكرة!',
    storyDe: 'Letzter Boss! 18 Paare, Nebel, Mischen alle 5 Züge. Beweise dich!',
    themeId: 'space', pairs: 18, cols: 6, twist: 'fogOfMemory',
    threeStarTime: 120, starMistakeBudget: 5, isBoss: true,
  },
];

// =============================================================================
// Persistent progress
// =============================================================================
export interface AdventureSave {
  /** highest stage cleared (0 = none cleared yet, only stage 1 unlocked) */
  highestCleared: number;
  /** stars earned per stage (0..3) */
  stars: Record<number, number>;
  /** best time per stage in seconds */
  bestTimes: Record<number, number>;
}
const KEY = 'memory-adventure';

export function loadAdventure(): AdventureSave {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      highestCleared: s.highestCleared ?? 0,
      stars: s.stars || {},
      bestTimes: s.bestTimes || {},
    };
  } catch {
    return { highestCleared: 0, stars: {}, bestTimes: {} };
  }
}

export function saveAdventure(s: AdventureSave) { localStorage.setItem(KEY, JSON.stringify(s)); }

/**
 * Compute star count for a finished stage. The grading rubric:
 *   - 3 stars: completed within threeStarTime AND mistakes ≤ starMistakeBudget
 *   - 2 stars: one of the above failed (or completed within 1.5x time)
 *   - 1 star : just finishing the stage
 */
export function gradeStage(stage: AdventureStage, time: number, mistakes: number): number {
  const onTime = time <= stage.threeStarTime;
  const cleanRun = mistakes <= stage.starMistakeBudget;
  if (onTime && cleanRun) return 3;
  if (onTime || cleanRun || time <= stage.threeStarTime * 1.5) return 2;
  return 1;
}

export function recordStageResult(stageId: number, stars: number, time: number) {
  const s = loadAdventure();
  s.stars[stageId] = Math.max(s.stars[stageId] || 0, stars);
  s.bestTimes[stageId] = s.bestTimes[stageId] ? Math.min(s.bestTimes[stageId], time) : time;
  if (stageId > s.highestCleared) s.highestCleared = stageId;
  saveAdventure(s);
}

export function isStageUnlocked(stageId: number, save: AdventureSave): boolean {
  if (stageId === 1) return true;
  return save.highestCleared >= stageId - 1;
}
