import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, RotateCcw, Crown, Bot, User as UserIcon } from 'lucide-react';
import { playSfx, vibrate } from '@/utils/gameFeedback';

// ---------- Dice rendering ----------
const DICE_DOTS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DiceFace({ value, held, rolling, onClick, color }: {
  value: number;
  held: boolean;
  rolling: boolean;
  onClick?: () => void;
  color: 'gold' | 'silver';
}) {
  const dots = DICE_DOTS[value] || [];
  const isGold = color === 'gold';
  return (
    <motion.button
      onClick={onClick}
      whileTap={onClick ? { scale: 0.88 } : {}}
      animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 0.95, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.45, ease: 'easeInOut' } : { type: 'spring', stiffness: 400, damping: 26 }}
      className={`relative w-14 h-14 rounded-2xl border-2 grid grid-rows-3 grid-cols-3 p-2 transition-colors ${
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
              <div className={`w-2 h-2 rounded-full ${isGold ? 'bg-amber-900' : 'bg-rose-100'}`} />
            )}
          </div>
        ))
      )}
      {held && (
        <span
          className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-full ${
            isGold ? 'bg-amber-500 text-amber-50' : 'bg-rose-500 text-white'
          }`}
        >
          HOLD
        </span>
      )}
    </motion.button>
  );
}

// ---------- Scoring ----------
type CategoryId =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'three' | 'four' | 'full' | 'small' | 'large' | 'yatzy' | 'chance';

const UPPER: CategoryId[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
const LOWER: CategoryId[] = ['three', 'four', 'full', 'small', 'large', 'yatzy', 'chance'];
const ALL_CATEGORIES: CategoryId[] = [...UPPER, ...LOWER];

function count(dice: number[]): Record<number, number> {
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
  const c = count(dice);
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
function isCardFull(card: Scorecard): boolean {
  return ALL_CATEGORIES.every(k => card.scores[k] !== undefined);
}

// ---------- AI ----------
// Greedy: of all remaining categories, look at each — for each, do a one-shot
// "best hold then reroll once" simulation and pick the category with highest EV.
function rollDie() { return 1 + Math.floor(Math.random() * 6); }

function aiPlayTurn(card: Scorecard, level: 'easy' | 'hard'): { dice: number[]; pickCategory: CategoryId; pickScore: number } {
  let dice = Array.from({ length: 5 }, rollDie);
  const rerolls = level === 'easy' ? 1 : 2;
  for (let roll = 0; roll < rerolls; roll++) {
    if (level === 'easy') {
      // Easy: only hold pairs+, no strategic awareness.
      const c = count(dice);
      const repeats = new Set<number>();
      for (let v = 1; v <= 6; v++) if (c[v] >= 2) repeats.add(v);
      dice = dice.map(d => (repeats.has(d) ? d : rollDie()));
    } else {
      const { hold } = aiPickHold(dice, card);
      dice = dice.map((d, i) => (hold[i] ? d : rollDie()));
    }
  }
  let best: { cat: CategoryId; score: number } | null = null;
  for (const cat of ALL_CATEGORIES) {
    if (card.scores[cat] !== undefined) continue;
    const sc = scoreCategory(cat, dice);
    if (!best || sc > best.score) best = { cat, score: sc };
  }
  if (!best) best = { cat: 'chance', score: dice.reduce((a, b) => a + b, 0) };
  return { dice, pickCategory: best.cat, pickScore: best.score };
}

function aiPickHold(dice: number[], card: Scorecard): { hold: boolean[] } {
  // Hold dice that contribute to a likely high score: chase highest-count die,
  // or save high values toward Sixes/Chance/Three-Four-of-a-kind.
  const c = count(dice);
  // Prefer keeping the most common face if appears ≥ 2.
  let bestFace = 0;
  let bestCount = 0;
  for (let v = 1; v <= 6; v++) {
    if (c[v] > bestCount) { bestCount = c[v]; bestFace = v; }
  }
  if (bestCount >= 2 && card.scores.yatzy === undefined) {
    return { hold: dice.map(d => d === bestFace) };
  }
  // If straight progress (4 unique values), keep them.
  const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
  if (unique.length >= 4 && card.scores.large === undefined) {
    return { hold: dice.map(d => unique.includes(d)) };
  }
  // Otherwise hold the highest values (≥4) to maximize chance.
  return { hold: dice.map(d => d >= 4) };
}

// ---------- Stats ----------
interface DiceStats {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  totalScore: number;
  yatzeesRolled: number;
}
function loadStats(): DiceStats {
  try { return JSON.parse(localStorage.getItem('dice-stats') || '{}'); } catch { return {} as DiceStats; }
}
function saveStatsFn(s: DiceStats) { localStorage.setItem('dice-stats', JSON.stringify(s)); }

// ---------- Component ----------
type Mode = 'yatzy' | 'highroll';
type Turn = 'player' | 'ai';

export default function DiceGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('dice-mode') as Mode) || 'yatzy');
  const [aiLevel, setAiLevel] = useState<'easy' | 'hard'>(() => (localStorage.getItem('dice-ai') as 'easy' | 'hard') || 'hard');

  useEffect(() => { localStorage.setItem('dice-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('dice-ai', aiLevel); }, [aiLevel]);

  // === Yatzy state ===
  const [playerCard, setPlayerCard] = useState<Scorecard>({ scores: {} });
  const [aiCard, setAiCard] = useState<Scorecard>({ scores: {} });
  const [dice, setDice] = useState<number[]>([1, 1, 1, 1, 1]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolling, setRolling] = useState(false);
  const [turn, setTurn] = useState<Turn>('player');
  const [gameOver, setGameOver] = useState(false);
  const [yatzeeFlash, setYatzeeFlash] = useState(false);

  // === High-roll state ===
  const [hrPlayer, setHrPlayer] = useState(1);
  const [hrAi, setHrAi] = useState(1);
  const [hrScore, setHrScore] = useState({ p: 0, a: 0 });
  const [hrRound, setHrRound] = useState(0);
  const [hrRolling, setHrRolling] = useState(false);
  const [hrMessage, setHrMessage] = useState('');
  const [hrRounds, setHrRounds] = useState(() => parseInt(localStorage.getItem('dice-rounds') || '10'));
  const [hrStreak, setHrStreak] = useState(0);

  useEffect(() => { localStorage.setItem('dice-rounds', String(hrRounds)); }, [hrRounds]);

  const stats = useMemo(loadStats, [gameOver, hrRound]);

  // === Yatzy actions ===
  const resetYatzy = useCallback(() => {
    setPlayerCard({ scores: {} }); setAiCard({ scores: {} });
    setDice([1, 1, 1, 1, 1]); setHeld([false, false, false, false, false]);
    setRollsLeft(3); setTurn('player'); setGameOver(false); setYatzeeFlash(false);
  }, []);

  const resetHighRoll = useCallback(() => {
    setHrPlayer(1); setHrAi(1); setHrScore({ p: 0, a: 0 }); setHrRound(0);
    setHrMessage(''); setHrStreak(0);
  }, []);

  useEffect(() => { resetYatzy(); resetHighRoll(); }, [mode, resetYatzy, resetHighRoll]);

  // Yatzy end-of-game detection: both cards full
  useEffect(() => {
    if (mode !== 'yatzy' || gameOver) return;
    const pCount = Object.keys(playerCard.scores).length;
    const aCount = Object.keys(aiCard.scores).length;
    if (pCount >= ALL_CATEGORIES.length && aCount >= ALL_CATEGORIES.length) {
      setGameOver(true);
      const finalP = totalScore(playerCard);
      const finalA = totalScore(aiCard);
      const s = loadStats();
      s.gamesPlayed = (s.gamesPlayed || 0) + 1;
      s.totalScore = (s.totalScore || 0) + finalP;
      if (finalP > finalA) s.gamesWon = (s.gamesWon || 0) + 1;
      if (finalP > (s.bestScore || 0)) s.bestScore = finalP;
      saveStatsFn(s);
      if (finalP > finalA) playSfx('win'); else playSfx('lose');
      vibrate([60, 60, 200]);
    }
  }, [playerCard, aiCard, mode, gameOver]);

  const rollDice = useCallback(() => {
    if (rolling || rollsLeft <= 0 || turn !== 'player' || gameOver) return;
    setRolling(true);
    playSfx('rotate');
    vibrate(30);
    let count = 0;
    const interval = setInterval(() => {
      setDice(prev => prev.map((d, i) => (held[i] ? d : rollDie())));
      count++;
      if (count >= 8) {
        clearInterval(interval);
        const finalDice = dice.map((d, i) => (held[i] ? d : rollDie()));
        setDice(finalDice);
        setRolling(false);
        setRollsLeft(r => r - 1);
        playSfx('place');
        // Yatzee surprise!
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
    playSfx('tap');
    vibrate(10);
  }, [rolling, rollsLeft, turn]);

  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAiTurn = useCallback(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(() => {
      const result = aiPlayTurn(aiCard, aiLevel);
      setDice(result.dice);
      setHeld([true, true, true, true, true]);
      setAiCard(prev => {
        const next = { scores: { ...prev.scores, [result.pickCategory]: result.pickScore } };
        return next;
      });
      playSfx('place');
      aiTimer.current = setTimeout(() => {
        const aiFilledCount = Object.keys(aiCard.scores).length + 1;
        const playerFilledCount = Object.keys(playerCard.scores).length;
        if (aiFilledCount >= ALL_CATEGORIES.length && playerFilledCount >= ALL_CATEGORIES.length) return;
        setTurn('player');
        setDice([1, 1, 1, 1, 1]);
        setHeld([false, false, false, false, false]);
        setRollsLeft(3);
      }, 800);
    }, 650);
  }, [aiCard, aiLevel, playerCard]);

  const pickCategory = useCallback((cat: CategoryId) => {
    if (turn !== 'player' || gameOver || rollsLeft === 3) return;
    if (playerCard.scores[cat] !== undefined) return;
    const value = scoreCategory(cat, dice);
    setPlayerCard(prev => ({ scores: { ...prev.scores, [cat]: value } }));
    playSfx('match');
    vibrate(20);
    // Save Yahtzee stat
    if (cat === 'yatzy' && value > 0) {
      const s = loadStats();
      s.yatzeesRolled = (s.yatzeesRolled || 0) + 1;
      saveStatsFn(s);
    }
    setTurn('ai');
    playAiTurn();
  }, [turn, gameOver, rollsLeft, dice, playerCard, aiCard, playAiTurn]);

  // High-roll roll
  const rollHighRoll = useCallback(() => {
    if (hrRolling || hrRound >= hrRounds) return;
    setHrRolling(true);
    setHrMessage('');
    playSfx('rotate');
    vibrate(40);
    let n = 0;
    const interval = setInterval(() => {
      setHrPlayer(rollDie());
      setHrAi(rollDie());
      n++;
      if (n >= 14) {
        clearInterval(interval);
        const p = rollDie();
        const a = rollDie();
        setHrPlayer(p); setHrAi(a); setHrRolling(false);
        const newRound = hrRound + 1; setHrRound(newRound);
        const ns = { ...hrScore };
        if (p > a) { ns.p++; setHrStreak(s => s + 1); setHrMessage(isAr ? '🎉 فزت بالجولة!' : '🎉 Runde gewonnen!'); playSfx('match'); }
        else if (a > p) { ns.a++; setHrStreak(0); setHrMessage(isAr ? '💀 الخصم فاز' : '💀 Gegner gewinnt'); playSfx('wrong'); }
        else { setHrMessage(isAr ? '🤝 تعادل' : '🤝 Unentschieden'); playSfx('click'); }
        setHrScore(ns);
        if (newRound >= hrRounds) {
          const s = loadStats();
          s.gamesPlayed = (s.gamesPlayed || 0) + 1;
          if (ns.p > ns.a) { s.gamesWon = (s.gamesWon || 0) + 1; setHrMessage(isAr ? '👑 أنت البطل!' : '👑 Champion!'); playSfx('win'); }
          else if (ns.a > ns.p) { setHrMessage(isAr ? '😞 حظاً أوفر' : '😞 Nächstes Mal'); playSfx('lose'); }
          saveStatsFn(s);
        }
      }
    }, 55);
  }, [hrRolling, hrRound, hrRounds, hrScore, isAr]);

  // ===== Yatzy auto-AI tick =====
  // (already done in playAiTurn) — cleanup on unmount
  useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

  // Labels
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
    small: { ar: 'سلسلة قصيرة', de: 'Kleine Straße' },
    large: { ar: 'سلسلة طويلة', de: 'Große Straße' },
    yatzy: { ar: 'يَتزي!', de: 'Kniffel!' },
    chance: { ar: 'فرصة', de: 'Chance' },
  };
  const lbl = (c: CategoryId) => (isAr ? catLabels[c].ar : catLabels[c].de);

  const rules = mode === 'yatzy'
    ? (isAr
      ? [
        'ارمِ 5 نرود 3 مرات؛ اضغط على أي نرد لتثبيته بين الرميات',
        'بعد آخر رمية اختر خانة لتسجيل النتيجة',
        'القسم العلوي (1-6): اجمع 63+ لمكافأة 35',
        'القسم السفلي: Full House 25 • سلسلة 30/40 • Yatzy 50',
        'الخصم يلعب 13 جولة باستراتيجية ذكية. أعلى مجموع يفوز!',
      ]
      : [
        'Würfle 5 Würfel 3× – tippe einen Würfel zum Halten',
        'Wähle nach dem letzten Wurf eine Kategorie',
        'Oberer Bereich (1-6): 63+ ⇒ Bonus 35',
        'Unten: Full House 25 · Straße 30/40 · Kniffel 50',
        'KI spielt 13 Runden taktisch. Höchste Summe gewinnt!',
      ])
    : (isAr
      ? ['كل جولة يرمي اللاعب والخصم نرداً واحداً', 'صاحب الرقم الأعلى يفوز بالجولة', 'من يجمع جولات أكثر يفوز باللعبة', 'السلسلة تتراكم مع كل فوز']
      : ['Jede Runde würfeln Spieler und Gegner', 'Höhere Zahl gewinnt die Runde', 'Mehr Rundensiege ⇒ Spielsieg', 'Siegesserie zählt mit']);

  const statsArr = [
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed || 0 },
    { label: isAr ? 'انتصارات' : 'Siege', value: stats.gamesWon || 0 },
    { label: isAr ? 'أفضل نتيجة' : 'Bestleistung', value: stats.bestScore || 0 },
    { label: isAr ? 'يَتزي مرمي' : 'Kniffel ges.', value: stats.yatzeesRolled || 0 },
    { label: isAr ? 'نسبة الفوز' : 'Siegquote', value: stats.gamesPlayed ? `${Math.round(((stats.gamesWon || 0) / stats.gamesPlayed) * 100)}%` : '-' },
  ];

  const options = [
    {
      key: 'mode', label: isAr ? 'نمط اللعب' : 'Spielmodus',
      choices: [
        { value: 'yatzy', label: isAr ? 'يَتزي (5 نرود)' : 'Kniffel (5 W.)' },
        { value: 'highroll', label: isAr ? 'رمية كبرى' : 'Highroll' },
      ],
      current: mode, onChange: (v: string) => setMode(v as Mode),
    },
    ...(mode === 'yatzy' ? [{
      key: 'ai', label: isAr ? 'مستوى الخصم' : 'KI-Stärke',
      choices: [
        { value: 'easy', label: isAr ? 'سهل' : 'Leicht' },
        { value: 'hard', label: isAr ? 'محترف' : 'Profi' },
      ],
      current: aiLevel, onChange: (v: string) => setAiLevel(v as 'easy' | 'hard'),
    }] : [{
      key: 'rounds', label: isAr ? 'عدد الجولات' : 'Rundenanzahl',
      choices: [
        { value: '5', label: '5' }, { value: '10', label: '10' }, { value: '15', label: '15' }, { value: '20', label: '20' },
      ],
      current: String(hrRounds), onChange: (v: string) => { setHrRounds(parseInt(v)); resetHighRoll(); },
    }]),
  ];

  // Computed final
  const finalTotal = totalScore(playerCard);
  const aiTotal = totalScore(aiCard);

  return (
    <GameShell title={isAr ? 'النرد' : 'Würfel'} icon={Dices} accentColor="#f59e0b" rules={rules} stats={statsArr} options={options}
      headerRight={
        <button
          onClick={() => { if (mode === 'yatzy') resetYatzy(); else resetHighRoll(); }}
          className="text-amber-400 active:scale-90 transition-transform"
          aria-label={isAr ? 'إعادة' : 'Zurücksetzen'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      }
    >
      {mode === 'yatzy' ? (
        <YatzyView
          isAr={isAr}
          dice={dice}
          held={held}
          rolling={rolling}
          rollsLeft={rollsLeft}
          turn={turn}
          playerCard={playerCard}
          aiCard={aiCard}
          gameOver={gameOver}
          finalTotal={finalTotal}
          aiTotal={aiTotal}
          yatzeeFlash={yatzeeFlash}
          rollDice={rollDice}
          toggleHold={toggleHold}
          pickCategory={pickCategory}
          resetYatzy={resetYatzy}
          lbl={lbl}
        />
      ) : (
        <HighRollView
          isAr={isAr}
          hrPlayer={hrPlayer}
          hrAi={hrAi}
          hrScore={hrScore}
          hrRound={hrRound}
          hrRounds={hrRounds}
          hrRolling={hrRolling}
          hrMessage={hrMessage}
          hrStreak={hrStreak}
          rollHighRoll={rollHighRoll}
          resetHighRoll={resetHighRoll}
        />
      )}
    </GameShell>
  );
}

// ---------- Yatzy view ----------
interface YatzyViewProps {
  isAr: boolean;
  dice: number[];
  held: boolean[];
  rolling: boolean;
  rollsLeft: number;
  turn: Turn;
  playerCard: Scorecard;
  aiCard: Scorecard;
  gameOver: boolean;
  finalTotal: number;
  aiTotal: number;
  yatzeeFlash: boolean;
  rollDice: () => void;
  toggleHold: (i: number) => void;
  pickCategory: (cat: CategoryId) => void;
  resetYatzy: () => void;
  lbl: (cat: CategoryId) => string;
}

function YatzyView(p: YatzyViewProps) {
  const { isAr, dice, held, rolling, rollsLeft, turn, playerCard, aiCard, gameOver, finalTotal, aiTotal, yatzeeFlash, rollDice, toggleHold, pickCategory, resetYatzy, lbl } = p;
  const previewScores = useMemo(() => {
    const map: Partial<Record<CategoryId, number>> = {};
    for (const cat of ALL_CATEGORIES) {
      if (playerCard.scores[cat] !== undefined) continue;
      map[cat] = scoreCategory(cat, dice);
    }
    return map;
  }, [dice, playerCard]);

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

      {/* Header strip */}
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
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={rolling || rollsLeft <= 0 || turn !== 'player' || gameOver}
            onClick={rollDice}
            className="px-6 py-2 rounded-2xl font-black text-amber-950 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            <Dices className="w-4 h-4 inline mr-1.5" />
            {isAr ? 'رمية' : 'Wurf'} {3 - rollsLeft + 1}/3
          </motion.button>
        </div>
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
            <motion.button whileTap={{ scale: 0.95 }} onClick={resetYatzy}
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
            style={{ border: `1px solid ${filled ? 'rgba(255,255,255,0.06)' : `var(--tw-color-${accentColor}-500, #f59e0b)33`}` }}
          >
            <span className={`font-semibold ${filled ? 'text-zinc-400' : `text-${accentColor}-200`}`}>{lbl(cat)}</span>
            <span className="flex items-center gap-1.5">
              {aVal !== undefined && (
                <span className="text-[9px] text-rose-400/70 font-mono">{aVal}</span>
              )}
              <span className={`font-mono font-bold ${filled ? 'text-white' : preview && preview > 0 ? `text-${accentColor}-300` : 'text-zinc-600'}`}>
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

// ---------- High-roll view ----------
interface HighRollViewProps {
  isAr: boolean;
  hrPlayer: number;
  hrAi: number;
  hrScore: { p: number; a: number };
  hrRound: number;
  hrRounds: number;
  hrRolling: boolean;
  hrMessage: string;
  hrStreak: number;
  rollHighRoll: () => void;
  resetHighRoll: () => void;
}
function HighRollView(p: HighRollViewProps) {
  const { isAr, hrPlayer, hrAi, hrScore, hrRound, hrRounds, hrRolling, hrMessage, hrStreak, rollHighRoll, resetHighRoll } = p;
  const finished = hrRound >= hrRounds;
  return (
    <div className="text-center pt-2">
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
        <DiceFace value={hrPlayer} held={false} rolling={hrRolling} color="gold" />
        <DiceFace value={hrAi} held={false} rolling={hrRolling} color="silver" />
      </div>
      <div className="h-6 text-sm text-zinc-300 font-semibold mb-3">{hrMessage}</div>
      {hrStreak >= 2 && !finished && (
        <p className="text-[11px] text-amber-400 font-bold mb-2">🔥 {hrStreak} {isAr ? 'فوز متتالي' : 'in Folge'}</p>
      )}
      {!finished ? (
        <motion.button whileTap={{ scale: 0.93 }} onClick={rollHighRoll} disabled={hrRolling}
          className="px-9 py-3 rounded-2xl font-black text-amber-950 shadow-lg shadow-amber-500/30 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
          <Dices className="w-4 h-4 inline mr-2" />{isAr ? 'ارمِ النرد' : 'Würfeln'}
        </motion.button>
      ) : (
        <motion.button whileTap={{ scale: 0.93 }} onClick={resetHighRoll}
          className="px-9 py-3 rounded-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <RotateCcw className="w-4 h-4 inline mr-2" />{isAr ? 'مباراة جديدة' : 'Neue Partie'}
        </motion.button>
      )}
    </div>
  );
}
