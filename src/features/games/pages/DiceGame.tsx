import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, RotateCcw, Crown, Bot, User as UserIcon, PiggyBank, Swords, Trophy, Flame } from '@/lib/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { playSfx, vibrate } from '@/utils/gameFeedback';
import {
  DICE_BOTS, DicePersonality, effectiveThreshold,
  loadTournament, saveTournament, recordPlayerMatch, TournamentState,
} from '@/data/diceTournament';

// =============================================================================
// Dice rendering
// =============================================================================
const DICE_DOTS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DiceFace({ value, held, rolling, onClick, color, size = 'md' }: {
  value: number; held: boolean; rolling: boolean; onClick?: () => void;
  color: 'gold' | 'silver'; size?: 'sm' | 'md' | 'lg';
}) {
  const dots = DICE_DOTS[value] || [];
  const isGold = color === 'gold';
  const dim = size === 'lg' ? 'w-20 h-20' : size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
  const dotDim = size === 'lg' ? 'w-3 h-3' : size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <motion.button
      onClick={onClick}
      animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 0.95, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.45, ease: 'easeInOut' } : { type: 'spring', stiffness: 400, damping: 26 }}
      className={`relative ${dim} rounded-2xl border-2 grid grid-rows-3 grid-cols-3 p-2 transition-colors ${
        isGold
          ? held
            ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/30 bg-gradient-to-br from-amber-100 to-yellow-200'
            : 'border-amber-300/70 bg-gradient-to-br from-amber-50/90 to-yellow-100/90'
          : held
            ? 'border-rose-400 ring-2 ring-rose-400/30 shadow-lg shadow-rose-500/30 bg-gradient-to-br from-rose-900 to-red-950'
            : 'border-rose-700/70 bg-gradient-to-br from-rose-900/95 to-red-950/95'
      }`}
    >
      {[0, 1, 2].map(r =>
        [0, 1, 2].map(c => (
          <div key={`${r}-${c}`} className="flex items-center justify-center">
            {dots.some(([dr, dc]) => dr === r && dc === c) && (
              <div className={`${dotDim} rounded-full ${isGold ? 'bg-amber-900' : 'bg-rose-100'}`} />
            )}
          </div>
        ))
      )}
      {held && size !== 'lg' && (
        <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-full ${
          isGold ? 'bg-amber-500 text-amber-50' : 'bg-rose-500 text-white'
        }`}>
          HOLD
        </span>
      )}
    </motion.button>
  );
}

// =============================================================================
// Yatzy scoring
// =============================================================================
type CategoryId =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'three' | 'four' | 'full' | 'small' | 'large' | 'yatzy' | 'chance';

const UPPER: CategoryId[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
const LOWER: CategoryId[] = ['three', 'four', 'full', 'small', 'large', 'yatzy', 'chance'];
const ALL_CATEGORIES: CategoryId[] = [...UPPER, ...LOWER];

function counts(dice: number[]): Record<number, number> {
  const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) c[d]++;
  return c;
}

function hasStraight(dice: number[], len: number): boolean {
  const set = new Set(dice);
  let run = 0;
  for (let i = 1; i <= 6; i++) {
    if (set.has(i)) { run++; if (run >= len) return true; } else run = 0;
  }
  return false;
}

function scoreCategory(cat: CategoryId, dice: number[]): number {
  if (dice.length < 5) return 0;
  const c = counts(dice);
  const sum = dice.reduce((a, b) => a + b, 0);
  switch (cat) {
    case 'ones':   return c[1] * 1;
    case 'twos':   return c[2] * 2;
    case 'threes': return c[3] * 3;
    case 'fours':  return c[4] * 4;
    case 'fives':  return c[5] * 5;
    case 'sixes':  return c[6] * 6;
    case 'three':  return Object.values(c).some(v => v >= 3) ? sum : 0;
    case 'four':   return Object.values(c).some(v => v >= 4) ? sum : 0;
    case 'full': {
      const vals = Object.values(c);
      return vals.includes(3) && vals.includes(2) ? 25 : 0;
    }
    case 'small':  return hasStraight(dice, 4) ? 30 : 0;
    case 'large':  return hasStraight(dice, 5) ? 40 : 0;
    case 'yatzy':  return Object.values(c).some(v => v === 5) ? 50 : 0;
    case 'chance': return sum;
  }
}

interface Scorecard { scores: Partial<Record<CategoryId, number>> }

function upperSum(card: Scorecard): number {
  return UPPER.reduce((s, k) => s + (card.scores[k] ?? 0), 0);
}
function upperBonus(card: Scorecard): number { return upperSum(card) >= 63 ? 35 : 0; }
function totalScore(card: Scorecard): number {
  return ALL_CATEGORIES.reduce((s, k) => s + (card.scores[k] ?? 0), 0) + upperBonus(card);
}

function rollDie() { return 1 + Math.floor(Math.random() * 6); }

// =============================================================================
// Smart Yatzy AI: Monte Carlo expected value of hold patterns
// =============================================================================
// Evaluate current dice for the BEST attainable category given remaining cats,
// considering also future Upper-bonus benefit.
function valueOfFinalDice(dice: number[], card: Scorecard): { cat: CategoryId; score: number; effective: number } {
  let best: { cat: CategoryId; score: number; effective: number } = { cat: 'chance', score: 0, effective: -1 };
  for (const cat of ALL_CATEGORIES) {
    if (card.scores[cat] !== undefined) continue;
    const sc = scoreCategory(cat, dice);
    let effective = sc;
    // Encourage filling Yatzy with 50, Large 40, Full 25 only when scoring positively
    if (sc === 0) {
      // Slight preference to "burn" upper categories with low remaining value first
      effective = -50 + (UPPER.includes(cat) ? -20 : 0);
    }
    // Upper bonus heuristic: each upper-pip is worth ~35/63 ≈ 0.55 cps
    if (UPPER.includes(cat) && sc > 0) {
      const currentUpper = upperSum(card);
      if (currentUpper < 63) effective += sc * 0.5;
    }
    if (effective > best.effective) best = { cat, score: sc, effective };
  }
  return best;
}

// Returns array of { holdMask: bool[], EV: number } and picks the best mask.
// Uses small Monte Carlo (60 samples) per mask.
function bestHoldMask(dice: number[], card: Scorecard, rerollsLeft: number, samples = 60): boolean[] {
  if (rerollsLeft === 0) return dice.map(() => true);
  let bestMask = dice.map(() => true);
  let bestEv = valueOfFinalDice(dice, card).effective;
  // Try all 32 hold masks
  for (let mask = 0; mask < 32; mask++) {
    const hold: boolean[] = dice.map((_, i) => Boolean((mask >> i) & 1));
    let ev = 0;
    for (let s = 0; s < samples; s++) {
      const next = dice.map((d, i) => hold[i] ? d : rollDie());
      // After this reroll, simulate one more reroll greedily (for rerollsLeft >= 2)
      if (rerollsLeft >= 2) {
        const next2Hold = bestHoldMaskShallow(next, card);
        const final = next.map((d, i) => next2Hold[i] ? d : rollDie());
        ev += valueOfFinalDice(final, card).effective;
      } else {
        ev += valueOfFinalDice(next, card).effective;
      }
    }
    ev /= samples;
    if (ev > bestEv) { bestEv = ev; bestMask = hold; }
  }
  return bestMask;
}

// Greedy single-step: pick mask that maximizes immediate value-of-final-dice
function bestHoldMaskShallow(dice: number[], card: Scorecard): boolean[] {
  let bestMask = dice.map(() => true);
  let bestVal = valueOfFinalDice(dice, card).effective;
  for (let mask = 0; mask < 32; mask++) {
    const hold: boolean[] = dice.map((_, i) => Boolean((mask >> i) & 1));
    // Quick estimate: EV of one reroll of unheld dice
    let ev = 0;
    const samples = 30;
    for (let s = 0; s < samples; s++) {
      const next = dice.map((d, i) => hold[i] ? d : rollDie());
      ev += valueOfFinalDice(next, card).effective;
    }
    ev /= samples;
    if (ev > bestVal) { bestVal = ev; bestMask = hold; }
  }
  return bestMask;
}

function aiPlayTurn(card: Scorecard, level: 'easy' | 'hard'): { dice: number[]; pickCategory: CategoryId; pickScore: number } {
  let dice = Array.from({ length: 5 }, rollDie);
  if (level === 'easy') {
    for (let r = 0; r < 2; r++) {
      const c = counts(dice);
      const repeats = new Set<number>();
      for (let v = 1; v <= 6; v++) if (c[v] >= 2) repeats.add(v);
      if (Math.random() < 0.7) dice = dice.map(d => (repeats.has(d) ? d : rollDie()));
    }
  } else {
    // Hard: 2 rerolls with proper EV-based hold selection
    for (let r = 0; r < 2; r++) {
      const rerollsLeft = 2 - r;
      const hold = bestHoldMask(dice, card, rerollsLeft, 50);
      const allHold = hold.every(Boolean);
      if (allHold) break;
      dice = dice.map((d, i) => hold[i] ? d : rollDie());
    }
  }
  // Pick best category for final dice
  const { cat, score } = valueOfFinalDice(dice, card);
  return { dice, pickCategory: cat, pickScore: score };
}

// =============================================================================
// Stats
// =============================================================================
interface DiceStats {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  totalScore: number;
  yatzeesRolled: number;
  pigGamesPlayed: number;
  pigGamesWon: number;
  pigBestRound: number;
  hrStreak: number;
  hrBestStreak: number;
}
const DEFAULT_DICE_STATS: DiceStats = {
  gamesPlayed: 0, gamesWon: 0, bestScore: 0, totalScore: 0,
  yatzeesRolled: 0, pigGamesPlayed: 0, pigGamesWon: 0, pigBestRound: 0,
  hrStreak: 0, hrBestStreak: 0,
};
function loadStats(): DiceStats {
  try { return { ...DEFAULT_DICE_STATS, ...JSON.parse(localStorage.getItem('dice-stats') || '{}') }; } catch { return { ...DEFAULT_DICE_STATS }; }
}
function saveStatsFn(s: DiceStats) { localStorage.setItem('dice-stats', JSON.stringify(s)); }

// =============================================================================
// Component
// =============================================================================
type Mode = 'yatzy' | 'highroll' | 'pig';
type Turn = 'player' | 'ai';

export default function DiceGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('dice-mode') as Mode) || 'yatzy');
  const [aiLevel, setAiLevel] = useState<'easy' | 'hard'>(() => (localStorage.getItem('dice-ai') as 'easy' | 'hard') || 'hard');

  useEffect(() => { localStorage.setItem('dice-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('dice-ai', aiLevel); }, [aiLevel]);

  // -------- Tournament wiring --------
  // When ?tournament=semi-A&bot=hassan is in the URL we force Pig mode
  // and pass the tournament personality to PigView so it uses the bot's
  // bespoke push-your-luck strategy. On match end, PigView calls back
  // here so we can update the bracket and route to the tournament hub.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tournamentMatchId = searchParams.get('tournament') as 'semi-A' | 'final' | null;
  const tournamentBotId = searchParams.get('bot');
  const tournamentBot: DicePersonality | null = useMemo(() =>
    tournamentBotId ? (DICE_BOTS.find(b => b.id === tournamentBotId) ?? null) : null,
  [tournamentBotId]);

  useEffect(() => {
    if (tournamentMatchId && tournamentBot) setMode('pig');
  }, [tournamentMatchId, tournamentBot]);

  const handleTournamentResult = (playerScore: number, botScore: number) => {
    if (!tournamentMatchId) return;
    const state = loadTournament();
    if (!state) return;
    const next = recordPlayerMatch(state, tournamentMatchId, { playerScore, botScore });
    saveTournament(next);
    // Brief delay so the player sees the win animation before navigating away
    setTimeout(() => navigate('/games/dice/tournament'), 1800);
  };

  const stats = useMemo(loadStats, [mode]);

  const rules = useMemo(() => {
    if (mode === 'yatzy') {
      return isAr ? [
        'ارمِ 5 نرود حتى 3 مرات؛ اضغط على نرد لتثبيته',
        'بعد آخر رمية اختر خانة لتسجيل النتيجة',
        'القسم العلوي (1-6): 63+ ⇒ مكافأة 35',
        'فول هاوس 25 · سلسلة 30/40 · يَتزي 50',
        '13 جولة لكل لاعب. الأعلى يفوز!',
      ] : [
        '5 Würfel, bis zu 3 Würfe; tippen zum Halten',
        'Nach letztem Wurf: Kategorie wählen',
        'Oberer Bereich (1-6): 63+ ⇒ Bonus 35',
        'Full House 25 · Straße 30/40 · Kniffel 50',
        '13 Runden pro Spieler. Höchste Summe gewinnt!',
      ];
    }
    if (mode === 'pig') {
      return isAr ? [
        'ارمِ النرد لجمع نقاط الجولة',
        '"احتفظ" يضيف نقاط الجولة لرصيدك',
        'إذا رميت 1 ⇒ تخسر نقاط هذه الجولة',
        'إذا رميت زوجين 1+1 ⇒ تخسر كل رصيدك!',
        'أول من يصل إلى 100 نقطة يفوز',
      ] : [
        'Würfle, um Rundenpunkte zu sammeln',
        '"Halten" überträgt Rundenpunkte aufs Konto',
        'Eine 1 ⇒ Rundenpunkte futsch',
        'Doppel-1 ⇒ kompletter Score weg!',
        'Wer zuerst 100 erreicht, gewinnt',
      ];
    }
    return isAr ? [
      'كل جولة يرمي اللاعب والخصم نرداً واحداً',
      'صاحب الرقم الأعلى يفوز بالجولة',
      'من يجمع جولات أكثر يفوز باللعبة',
      'السلسلة تتراكم مع كل فوز',
    ] : [
      'Jede Runde würfeln Spieler und Gegner',
      'Höhere Zahl gewinnt die Runde',
      'Mehr Rundensiege ⇒ Spielsieg',
      'Siegesserie zählt mit',
    ];
  }, [mode, isAr]);

  const statsArr = [
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed },
    { label: isAr ? 'انتصارات' : 'Siege', value: stats.gamesWon },
    { label: isAr ? 'أفضل نتيجة (Yatzy)' : 'Top (Kniffel)', value: stats.bestScore },
    { label: isAr ? 'يَتزي مرمي' : 'Kniffel ges.', value: stats.yatzeesRolled },
    { label: isAr ? 'فوز Pig' : 'Pig Siege', value: stats.pigGamesWon },
    { label: isAr ? 'أعلى جولة Pig' : 'Pig Best Runde', value: stats.pigBestRound },
    { label: isAr ? 'سلسلة Highroll' : 'HR Serie', value: stats.hrBestStreak },
    { label: isAr ? 'نسبة الفوز' : 'Siegquote', value: stats.gamesPlayed ? `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%` : '-' },
  ];

  const options = [
    {
      key: 'mode', label: isAr ? 'نمط اللعب' : 'Spielmodus',
      choices: [
        { value: 'yatzy', label: isAr ? 'يَتزي' : 'Kniffel' },
        { value: 'pig', label: isAr ? 'الخنزير' : 'Pig' },
        { value: 'highroll', label: isAr ? 'رمية كبرى' : 'Highroll' },
      ],
      current: mode, onChange: (v: string) => setMode(v as Mode),
    },
    ...(mode === 'yatzy' || mode === 'pig' ? [{
      key: 'ai', label: isAr ? 'مستوى الخصم' : 'KI-Stärke',
      choices: [
        { value: 'easy', label: isAr ? 'سهل' : 'Leicht' },
        { value: 'hard', label: isAr ? 'محترف' : 'Profi' },
      ],
      current: aiLevel, onChange: (v: string) => setAiLevel(v as 'easy' | 'hard'),
    }] : []),
  ];

  return (
    <GameShell title={isAr ? 'النرد' : 'Würfel'} icon={Dices} accentColor="#f59e0b" rules={rules} stats={statsArr} options={options}>
      {mode === 'yatzy' && <YatzyView key="yatzy" isAr={isAr} aiLevel={aiLevel} />}
      {mode === 'pig' && (
        <PigView
          key={tournamentBot ? `pig-tournament-${tournamentBot.id}-${tournamentMatchId}` : 'pig'}
          isAr={isAr}
          aiLevel={aiLevel}
          tournamentBot={tournamentBot}
          onTournamentResult={tournamentBot ? handleTournamentResult : undefined}
        />
      )}
      {mode === 'highroll' && <HighRollView key="hr" isAr={isAr} />}
    </GameShell>
  );
}

// =============================================================================
// Yatzy View
// =============================================================================
function YatzyView({ isAr, aiLevel }: { isAr: boolean; aiLevel: 'easy' | 'hard' }) {
  const [playerCard, setPlayerCard] = useState<Scorecard>({ scores: {} });
  const [aiCard, setAiCard] = useState<Scorecard>({ scores: {} });
  const [dice, setDice] = useState<number[]>([1, 1, 1, 1, 1]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolling, setRolling] = useState(false);
  const [turn, setTurn] = useState<Turn>('player');
  const [gameOver, setGameOver] = useState(false);
  const [yatzeeFlash, setYatzeeFlash] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // End-of-game detection
  useEffect(() => {
    if (gameOver) return;
    const pCount = Object.keys(playerCard.scores).length;
    const aCount = Object.keys(aiCard.scores).length;
    if (pCount >= ALL_CATEGORIES.length && aCount >= ALL_CATEGORIES.length) {
      setGameOver(true);
      const finalP = totalScore(playerCard);
      const finalA = totalScore(aiCard);
      const s = loadStats();
      s.gamesPlayed += 1;
      s.totalScore += finalP;
      if (finalP > finalA) s.gamesWon += 1;
      if (finalP > s.bestScore) s.bestScore = finalP;
      saveStatsFn(s);
      if (finalP > finalA) playSfx('win'); else playSfx('lose');
      vibrate([60, 60, 200]);
    }
  }, [playerCard, aiCard, gameOver]);

  // Hint generation when player has rolled
  useEffect(() => {
    if (turn !== 'player' || rollsLeft === 3 || gameOver) { setHint(null); return; }
    const { cat, score } = valueOfFinalDice(dice, playerCard);
    if (score > 0) {
      const lbl = catLabels[cat];
      setHint(`${isAr ? 'مقترح' : 'Tipp'}: ${isAr ? lbl.ar : lbl.de} (+${score})`);
    } else {
      setHint(null);
    }
  }, [dice, rollsLeft, turn, playerCard, gameOver, isAr]);

  const rollDice = useCallback(() => {
    if (rolling || rollsLeft <= 0 || turn !== 'player' || gameOver) return;
    setRolling(true);
    playSfx('rotate');
    vibrate(30);
    let n = 0;
    const interval = setInterval(() => {
      setDice(prev => prev.map((d, i) => (held[i] ? d : rollDie())));
      n++;
      if (n >= 8) {
        clearInterval(interval);
        const finalDice = dice.map((d, i) => (held[i] ? d : rollDie()));
        setDice(finalDice);
        setRolling(false);
        setRollsLeft(r => r - 1);
        playSfx('place');
        if (scoreCategory('yatzy', finalDice) > 0 && playerCard.scores.yatzy === undefined) {
          setYatzeeFlash(true);
          playSfx('streak');
          setTimeout(() => setYatzeeFlash(false), 1600);
        }
      }
    }, 55);
  }, [rolling, rollsLeft, turn, gameOver, held, dice, playerCard.scores.yatzy]);

  const toggleHold = useCallback((i: number) => {
    if (rolling || rollsLeft === 3 || turn !== 'player') return;
    setHeld(h => h.map((v, idx) => (idx === i ? !v : v)));
    playSfx('tap'); vibrate(10);
  }, [rolling, rollsLeft, turn]);

  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAiTurn = useCallback(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(() => {
      const result = aiPlayTurn(aiCard, aiLevel);
      setDice(result.dice);
      setHeld([true, true, true, true, true]);
      setAiCard(prev => ({ scores: { ...prev.scores, [result.pickCategory]: result.pickScore } }));
      playSfx('place');
      aiTimer.current = setTimeout(() => {
        setTurn('player');
        setDice([1, 1, 1, 1, 1]);
        setHeld([false, false, false, false, false]);
        setRollsLeft(3);
      }, 800);
    }, 650);
  }, [aiCard, aiLevel]);

  const pickCategory = useCallback((cat: CategoryId) => {
    if (turn !== 'player' || gameOver || rollsLeft === 3) return;
    if (playerCard.scores[cat] !== undefined) return;
    const value = scoreCategory(cat, dice);
    setPlayerCard(prev => ({ scores: { ...prev.scores, [cat]: value } }));
    playSfx('match'); vibrate(20);
    if (cat === 'yatzy' && value > 0) {
      const s = loadStats(); s.yatzeesRolled += 1; saveStatsFn(s);
    }
    setTurn('ai'); playAiTurn();
  }, [turn, gameOver, rollsLeft, dice, playerCard, playAiTurn]);

  const reset = useCallback(() => {
    setPlayerCard({ scores: {} }); setAiCard({ scores: {} });
    setDice([1, 1, 1, 1, 1]); setHeld([false, false, false, false, false]);
    setRollsLeft(3); setTurn('player'); setGameOver(false); setYatzeeFlash(false);
  }, []);

  useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

  const previewScores = useMemo(() => {
    const map: Partial<Record<CategoryId, number>> = {};
    if (rollsLeft === 3) return map;
    for (const cat of ALL_CATEGORIES) {
      if (playerCard.scores[cat] !== undefined) continue;
      map[cat] = scoreCategory(cat, dice);
    }
    return map;
  }, [dice, playerCard, rollsLeft]);

  const finalTotal = totalScore(playerCard);
  const aiTotal = totalScore(aiCard);

  const lbl = (c: CategoryId) => (isAr ? catLabels[c].ar : catLabels[c].de);

  return (
    <div className="relative">
      <AnimatePresence>
        {yatzeeFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.4 }}
            transition={{ type: 'spring', stiffness: 250, damping: 18 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="px-8 py-4 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-amber-950 font-black text-3xl shadow-2xl shadow-amber-500/40 tracking-wider">
              ★ YATZY ★
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${turn === 'player' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/4 text-zinc-500'}`}>
            <UserIcon className="w-3 h-3" /> {finalTotal}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${turn === 'ai' ? 'bg-rose-500/15 text-rose-300' : 'bg-white/4 text-zinc-500'}`}>
            <Bot className="w-3 h-3" /> {aiTotal}
          </div>
        </div>
        <div className="text-[10px] text-zinc-500">
          {isAr ? 'الرميات المتبقية' : 'Würfe übrig'}: <span className="text-amber-400 font-bold">{rollsLeft}</span>
        </div>
      </div>

      {/* Dice tray */}
      <div className="rounded-3xl p-4 mb-3 border border-amber-500/15"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0.4) 70%)' }}>
        <div className="flex justify-center gap-2 mb-3">
          {dice.map((v, i) => (
            <DiceFace key={i} value={v} held={held[i]} rolling={rolling && !held[i]} onClick={() => toggleHold(i)} color="gold" />
          ))}
        </div>
        <div className="flex justify-center items-center gap-3">
          <motion.button
            disabled={rolling || rollsLeft <= 0 || turn !== 'player' || gameOver}
            onClick={rollDice}
            className="px-6 py-2 rounded-2xl font-black text-amber-950 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            <Dices className="w-4 h-4 inline mr-1.5" />
            {isAr ? 'رمية' : 'Wurf'} {3 - rollsLeft + 1}/3
          </motion.button>
        </div>
        {hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-2 text-[10px] text-amber-300/80 font-semibold">
            💡 {hint}
          </motion.div>
        )}
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-2 gap-3">
        <ScorecardSection title={isAr ? 'القسم العلوي' : 'Oberer Bereich'} cats={UPPER}
          playerCard={playerCard} aiCard={aiCard} previewScores={previewScores}
          canPick={turn === 'player' && rollsLeft < 3 && !gameOver}
          onPick={pickCategory} lbl={lbl} bonus={upperBonus(playerCard)} bonusLabel={isAr ? 'مكافأة' : 'Bonus'}
          accent="amber" />
        <ScorecardSection title={isAr ? 'القسم السفلي' : 'Unterer Bereich'} cats={LOWER}
          playerCard={playerCard} aiCard={aiCard} previewScores={previewScores}
          canPick={turn === 'player' && rollsLeft < 3 && !gameOver}
          onPick={pickCategory} lbl={lbl} accent="rose" />
      </div>

      <AnimatePresence>
        {gameOver && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl p-5 border border-amber-500/25 text-center"
            style={{ background: finalTotal > aiTotal ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.1)' }}>
            <Crown className={`w-9 h-9 mx-auto mb-1.5 ${finalTotal > aiTotal ? 'text-amber-400' : 'text-rose-400'}`} />
            <p className="text-2xl font-black text-white mb-0.5">
              {finalTotal > aiTotal ? (isAr ? '👑 بطل!' : '👑 Champion!') : finalTotal < aiTotal ? (isAr ? 'حظاً أوفر' : 'Nächstes Mal!') : (isAr ? 'تعادل!' : 'Unentschieden!')}
            </p>
            <p className="text-amber-400 text-sm font-mono">{finalTotal} : {aiTotal}</p>
            <motion.button onClick={reset}
              className="mt-3 px-6 py-2 rounded-xl font-bold text-amber-950"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" /> {isAr ? 'مباراة جديدة' : 'Neue Partie'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Pig (push-your-luck) View
// =============================================================================
function PigView({ isAr, aiLevel, tournamentBot, onTournamentResult }: {
  isAr: boolean;
  aiLevel: 'easy' | 'hard';
  tournamentBot?: DicePersonality | null;
  onTournamentResult?: (playerScore: number, botScore: number) => void;
}) {
  const TARGET = 100;
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [turn, setTurn] = useState<Turn>('player');
  const [roundPoints, setRoundPoints] = useState(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState<{ p: number; a: number }[]>([]);
  const [bestRoundThisGame, setBestRoundThisGame] = useState(0);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI strategy: tournament personality (if any), else fall back to the
  // generic Neller-ish heuristic. Tournament bots have richer behavior:
  // distinct hold thresholds, defensive bias when ahead, catch-up when
  // behind, and a small greedRate that can push them past their threshold.
  const aiThreshold = useCallback(() => {
    if (tournamentBot) return effectiveThreshold(tournamentBot, aiScore, playerScore, TARGET);
    if (aiLevel === 'easy') return 18;
    // Hard: use Neller's optimal-ish: if winning needs only X points, push for it.
    const need = TARGET - aiScore;
    if (need <= 25) return Math.max(8, need);
    if (aiScore < playerScore - 15) return 30; // catch up
    return 22;
  }, [aiLevel, aiScore, playerScore, tournamentBot]);

  const reset = () => {
    setPlayerScore(0); setAiScore(0); setRoundPoints(0); setTurn('player');
    setDice(1); setRolling(false); setMessage(''); setGameOver(false);
    setHistory([]); setBestRoundThisGame(0);
  };

  const recordWin = (winner: 'player' | 'ai', finalPlayer: number, finalAi: number) => {
    const s = loadStats();
    s.pigGamesPlayed += 1;
    if (winner === 'player') s.pigGamesWon += 1;
    if (bestRoundThisGame > s.pigBestRound) s.pigBestRound = bestRoundThisGame;
    saveStatsFn(s);
    // Tournament hook: pipe explicit final scores back to the bracket
    // controller (closure values would be stale — React state updates
    // from setPlayerScore/setAiScore haven't flushed yet at this point).
    if (onTournamentResult) onTournamentResult(finalPlayer, finalAi);
  };

  const playerRoll = useCallback(() => {
    if (rolling || gameOver || turn !== 'player') return;
    setRolling(true); playSfx('rotate'); vibrate(30);
    let n = 0;
    const iv = setInterval(() => {
      setDice(rollDie()); n++;
      if (n >= 10) {
        clearInterval(iv);
        const final = rollDie();
        setDice(final); setRolling(false);
        if (final === 1) {
          setMessage(isAr ? '💀 رميت 1! خسرت نقاط الجولة' : '💀 Eine 1! Rundenpunkte weg');
          setRoundPoints(0);
          playSfx('lose'); vibrate([80, 60, 80]);
          // Bust = end of turn
          setTurn('ai');
        } else {
          const newRound = roundPoints + final;
          setRoundPoints(newRound);
          if (newRound > bestRoundThisGame) setBestRoundThisGame(newRound);
          setMessage(isAr ? `+${final}` : `+${final}`);
          playSfx('place'); vibrate(15);
        }
      }
    }, 55);
  }, [rolling, gameOver, turn, roundPoints, isAr, bestRoundThisGame]);

  const playerHold = () => {
    if (rolling || gameOver || turn !== 'player' || roundPoints === 0) return;
    const newScore = playerScore + roundPoints;
    setPlayerScore(newScore);
    setHistory(h => [...h, { p: newScore, a: aiScore }]);
    setMessage(isAr ? `أضفت ${roundPoints}!` : `+${roundPoints}!`);
    playSfx('match'); vibrate(20);
    if (newScore >= TARGET) {
      setGameOver(true); recordWin('player', newScore, aiScore); playSfx('win');
      setMessage(isAr ? '👑 فزت!' : '👑 Gewonnen!');
      return;
    }
    setRoundPoints(0);
    setTurn('ai');
  };

  // AI plays
  useEffect(() => {
    if (turn !== 'ai' || gameOver) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    const playOnce = (currentRound: number) => {
      const threshold = aiThreshold();
      const need = TARGET - aiScore;
      // If winning is achievable, AI keeps pushing
      if (currentRound >= Math.min(threshold, need)) {
        // Hold
        const final = aiScore + currentRound;
        setAiScore(final);
        setMessage(isAr ? `الذكاء حصل ${currentRound}` : `KI: +${currentRound}`);
        playSfx('place'); vibrate(15);
        if (final >= TARGET) {
          setGameOver(true); recordWin('ai', playerScore, final); playSfx('lose');
          setMessage(isAr ? '😞 الذكاء فاز' : '😞 KI gewinnt');
          return;
        }
        setRoundPoints(0);
        setTurn('player');
        return;
      }
      // Roll
      setRolling(true); playSfx('rotate');
      let n = 0;
      const iv = setInterval(() => {
        setDice(rollDie()); n++;
        if (n >= 8) {
          clearInterval(iv);
          const final = rollDie(); setDice(final); setRolling(false);
          if (final === 1) {
            setMessage(isAr ? '💥 الذكاء رمى 1' : '💥 KI würfelt 1');
            playSfx('wrong'); vibrate(40);
            setRoundPoints(0);
            setTurn('player');
            return;
          }
          const newRound = currentRound + final;
          setRoundPoints(newRound);
          setMessage(isAr ? `الذكاء +${final}` : `KI +${final}`);
          aiTimerRef.current = setTimeout(() => playOnce(newRound), 700);
        }
      }, 50);
    };

    aiTimerRef.current = setTimeout(() => playOnce(0), 700);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameOver]);

  const playerProgress = (playerScore / TARGET) * 100;
  const aiProgress = (aiScore / TARGET) * 100;

  return (
    <div className="text-center pt-2 max-w-md mx-auto">
      {/* Tournament banner: shown only when Pig was launched from the bracket. */}
      {tournamentBot && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-3 mb-3 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-300 shrink-0" />
          <div className="text-left flex-1">
            <p className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold">
              {isAr ? 'مباراة بطولة' : 'Turnierspiel'}
            </p>
            <p className="text-sm font-black text-amber-200">
              {isAr ? 'ضد' : 'gegen'} {tournamentBot.emoji} {isAr ? tournamentBot.ar : tournamentBot.de}
            </p>
          </div>
        </div>
      )}

      {/* Score bars */}
      <div className="space-y-2 mb-4">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-0.5 px-1">
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 text-amber-400" />
              <span className="font-bold text-amber-300">{isAr ? 'أنت' : 'Du'}</span>
            </div>
            <span className="font-mono font-black text-amber-300">{playerScore} / {TARGET}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
              animate={{ width: `${playerProgress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] mb-0.5 px-1">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-rose-400" />
              <span className="font-bold text-rose-300">{isAr ? 'الذكاء' : 'KI'}</span>
            </div>
            <span className="font-mono font-black text-rose-300">{aiScore} / {TARGET}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-400"
              animate={{ width: `${aiProgress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </div>

      {/* Round points */}
      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 mb-4">
        <p className="text-[10px] text-amber-200/70 uppercase tracking-wider mb-1">
          {isAr ? 'نقاط الجولة' : 'Runden-Punkte'}
        </p>
        <motion.p key={roundPoints} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          className="text-4xl font-black text-amber-300 mb-2">{roundPoints}</motion.p>
        <div className="flex justify-center mb-3">
          <DiceFace value={dice} held={false} rolling={rolling} color={turn === 'player' ? 'gold' : 'silver'} size="lg" />
        </div>
        <div className="h-5 text-xs text-zinc-300 font-semibold">{message}</div>
      </div>

      {/* Action buttons */}
      {!gameOver && (
        <div className="flex justify-center gap-3">
          <motion.button onClick={playerRoll} disabled={turn !== 'player' || rolling}
            className="flex-1 max-w-[160px] py-3 rounded-2xl font-black text-amber-950 disabled:opacity-30 shadow-lg shadow-amber-500/30"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
            <Dices className="w-5 h-5 inline mr-1.5" />
            {isAr ? 'ارمِ' : 'Würfeln'}
          </motion.button>
          <motion.button onClick={playerHold} disabled={turn !== 'player' || rolling || roundPoints === 0}
            className="flex-1 max-w-[160px] py-3 rounded-2xl font-black text-emerald-950 disabled:opacity-30 shadow-lg shadow-emerald-500/30"
            style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
            <PiggyBank className="w-5 h-5 inline mr-1.5" />
            {isAr ? 'احتفظ' : 'Halten'}
          </motion.button>
        </div>
      )}

      {gameOver && (
        <button onClick={reset} className="px-6 py-3 rounded-2xl bg-amber-500 text-amber-950 font-black">
          <RotateCcw className="w-4 h-4 inline mr-1.5" />{isAr ? 'مباراة جديدة' : 'Neue Partie'}
        </button>
      )}

      {/* Strategy hint */}
      {turn === 'player' && !gameOver && roundPoints >= 15 && (
        <p className="text-[10px] text-zinc-500 mt-3">
          {isAr ? '💡 كل رمية فيها 1/6 احتمال خسارة كل ما جمعته' : '💡 Jeder Wurf: 1/6 Chance, alles zu verlieren'}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// HighRoll View
// =============================================================================
function HighRollView({ isAr }: { isAr: boolean }) {
  const [hrPlayer, setHrPlayer] = useState(1);
  const [hrAi, setHrAi] = useState(1);
  const [hrScore, setHrScore] = useState({ p: 0, a: 0 });
  const [hrRound, setHrRound] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState('');
  const [hrRounds, setHrRounds] = useState(() => parseInt(localStorage.getItem('dice-rounds') || '10'));
  const [streak, setStreak] = useState(0);

  useEffect(() => { localStorage.setItem('dice-rounds', String(hrRounds)); }, [hrRounds]);

  const reset = () => {
    setHrPlayer(1); setHrAi(1); setHrScore({ p: 0, a: 0 }); setHrRound(0);
    setMessage(''); setStreak(0);
  };

  const rollOne = useCallback(() => {
    if (rolling || hrRound >= hrRounds) return;
    setRolling(true); setMessage('');
    playSfx('rotate'); vibrate(40);
    let n = 0;
    const iv = setInterval(() => {
      setHrPlayer(rollDie()); setHrAi(rollDie()); n++;
      if (n >= 14) {
        clearInterval(iv);
        const p = rollDie(); const a = rollDie();
        setHrPlayer(p); setHrAi(a); setRolling(false);
        const newRound = hrRound + 1; setHrRound(newRound);
        const ns = { ...hrScore };
        let newStreak = streak;
        if (p > a) {
          ns.p++; newStreak = streak + 1;
          setMessage(isAr ? '🎉 فزت بالجولة!' : '🎉 Runde gewonnen!');
          playSfx('match');
        } else if (a > p) {
          ns.a++; newStreak = 0;
          setMessage(isAr ? '💀 الخصم فاز' : '💀 Gegner gewinnt');
          playSfx('wrong');
        } else {
          setMessage(isAr ? '🤝 تعادل' : '🤝 Unentschieden');
          playSfx('click');
        }
        setStreak(newStreak); setHrScore(ns);
        if (newRound >= hrRounds) {
          const s = loadStats();
          s.gamesPlayed += 1;
          if (ns.p > ns.a) {
            s.gamesWon += 1;
            setMessage(isAr ? '👑 أنت البطل!' : '👑 Champion!');
            playSfx('win');
          } else if (ns.a > ns.p) {
            setMessage(isAr ? '😞 حظاً أوفر' : '😞 Nächstes Mal');
            playSfx('lose');
          }
          if (newStreak > s.hrBestStreak) s.hrBestStreak = newStreak;
          saveStatsFn(s);
        }
      }
    }, 55);
  }, [rolling, hrRound, hrRounds, hrScore, isAr, streak]);

  const finished = hrRound >= hrRounds;

  return (
    <div className="text-center pt-2">
      {/* Rounds selector */}
      <div className="flex items-center justify-center gap-1.5 mb-3">
        {[5, 10, 15, 20].map(n => (
          <button key={n} onClick={() => { setHrRounds(n); reset(); }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${hrRounds === n ? 'bg-amber-500/20 text-amber-300' : 'bg-white/4 text-zinc-500'}`}>
            {n}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 px-3">
        <div className="text-left">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{isAr ? 'أنت' : 'Du'}</p>
          <p className="text-3xl font-black text-amber-400">{hrScore.p}</p>
        </div>
        <div className="text-[10px] text-zinc-500">{hrRound}/{hrRounds}</div>
        <div className="text-right">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{isAr ? 'الخصم' : 'KI'}</p>
          <p className="text-3xl font-black text-rose-400">{hrScore.a}</p>
        </div>
      </div>
      <div className="flex justify-center gap-8 my-6">
        <DiceFace value={hrPlayer} held={false} rolling={rolling} color="gold" size="lg" />
        <DiceFace value={hrAi} held={false} rolling={rolling} color="silver" size="lg" />
      </div>
      <div className="h-6 text-sm text-zinc-300 font-semibold mb-3">{message}</div>
      {streak >= 2 && !finished && (
        <p className="text-[11px] text-amber-400 font-bold mb-2 flex items-center justify-center gap-1">
          <Flame className="w-3 h-3" /> {streak} {isAr ? 'فوز متتالي' : 'in Folge'}
        </p>
      )}
      {!finished ? (
        <motion.button onClick={rollOne} disabled={rolling}
          className="px-9 py-3 rounded-2xl font-black text-amber-950 shadow-lg shadow-amber-500/30 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
          <Dices className="w-5 h-5 inline mr-1.5" />
          {isAr ? 'ارمِ النرد' : 'Würfeln'}
        </motion.button>
      ) : (
        <button onClick={reset} className="px-6 py-3 rounded-2xl bg-amber-500 text-amber-950 font-black">
          <RotateCcw className="w-4 h-4 inline mr-1.5" />{isAr ? 'مباراة جديدة' : 'Neue Partie'}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================
const catLabels: Record<CategoryId, { ar: string; de: string }> = {
  ones: { ar: 'الآحاد', de: 'Einer' },
  twos: { ar: 'الثنائيات', de: 'Zweier' },
  threes: { ar: 'الثلاثيات', de: 'Dreier' },
  fours: { ar: 'الرباعيات', de: 'Vierer' },
  fives: { ar: 'الخماسيات', de: 'Fünfer' },
  sixes: { ar: 'السداسيات', de: 'Sechser' },
  three: { ar: 'ثلاثة متشابهة', de: 'Dreierpasch' },
  four: { ar: 'أربعة متشابهة', de: 'Viererpasch' },
  full: { ar: 'فول هاوس', de: 'Full House' },
  small: { ar: 'سلسلة قصيرة', de: 'Kl. Straße' },
  large: { ar: 'سلسلة طويلة', de: 'Gr. Straße' },
  yatzy: { ar: 'يَتزي!', de: 'Kniffel!' },
  chance: { ar: 'فرصة', de: 'Chance' },
};

function ScorecardSection(props: {
  title: string;
  cats: CategoryId[];
  playerCard: Scorecard;
  aiCard: Scorecard;
  previewScores: Partial<Record<CategoryId, number>>;
  canPick: boolean;
  onPick: (c: CategoryId) => void;
  lbl: (c: CategoryId) => string;
  bonus?: number;
  bonusLabel?: string;
  accent: 'amber' | 'rose';
}) {
  const { title, cats, playerCard, aiCard, previewScores, canPick, onPick, lbl, bonus, bonusLabel, accent } = props;
  const accentColor = accent === 'amber' ? 'amber' : 'rose';
  return (
    <div className="rounded-2xl border p-2 space-y-1"
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <p className={`text-[10px] font-black tracking-wide text-${accentColor}-400/80 px-1 pb-1`}>{title}</p>
      {cats.map(cat => {
        const pVal = playerCard.scores[cat];
        const aVal = aiCard.scores[cat];
        const preview = previewScores[cat];
        const filled = pVal !== undefined;
        return (
          <button
            key={cat}
            disabled={!canPick || filled}
            onClick={() => onPick(cat)}
            className={`w-full text-left text-[11px] rounded-lg px-2 py-1.5 flex items-center justify-between transition-all ${
              filled
                ? 'bg-white/4 cursor-default'
                : canPick
                  ? `bg-${accentColor}-500/8 hover:bg-${accentColor}-500/15 active:scale-[0.98] cursor-pointer`
                  : 'bg-white/3 opacity-60'
            }`}
          >
            <span className={`font-semibold ${filled ? 'text-zinc-400' : `text-${accentColor}-200`}`}>{lbl(cat)}</span>
            <span className="flex items-center gap-1.5">
              {aVal !== undefined && (
                <span className="text-[9px] text-rose-400/70 font-mono">{aVal}</span>
              )}
              <span className={`font-mono font-bold ${filled ? 'text-white' : preview && preview > 0 ? `text-${accentColor}-300` : 'text-zinc-400'}`}>
                {filled ? pVal : preview !== undefined ? preview : '-'}
              </span>
            </span>
          </button>
        );
      })}
      {bonus !== undefined && (
        <div className="flex items-center justify-between text-[10px] px-2 pt-1">
          <span className={`text-${accentColor}-400/70`}>{bonusLabel} (63+)</span>
          <span className="font-mono font-bold text-amber-400">+{bonus}</span>
        </div>
      )}
    </div>
  );
}
