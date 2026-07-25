import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/features/games/components/GameShell';
import {
  RefreshCw, Play, Pause, Eye, Shuffle as ShuffleIcon, Sparkles, Trophy, Brain,
  Timer as TimerIcon, Calendar, Zap, Award, Flame, Lock,
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';
import { STAGES, AdventureStage, gradeStage, recordStageResult } from '@/features/games/data/memoryAdventure';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type Mode = 'classic' | 'endless' | 'timeattack' | 'daily' | 'versus' | 'adventure';

// =============================================================================
// Themes
// =============================================================================
interface Theme { id: string; ar: string; icons: string[]; }
const THEMES: Theme[] = [
  { id: 'classic', ar: 'كلاسيكي',
    icons: ['🍎','🍊','🍋','🍇','🍓','🍒','🥝','🍑','🌸','🌻','🦋','🐱','🐶','🎸','🎨','⚽','🚀','💎','⭐','🌈','🎁','🎯','🎲','🎮','🔮','💫','🌟','✨','🍀','🎪'] },
  { id: 'animals', ar: 'حيوانات',
    icons: ['🐶','🐱','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🦄','🐺','🦒','🐘','🐧','🦝','🐢','🦅','🦓','🐙','🦋','🦉','🐝','🐞','🦜','🦩','🦦'] },
  { id: 'food', ar: 'طعام',
    icons: ['🍕','🍔','🍟','🌭','🥨','🍳','🥞','🧇','🥐','🍙','🍣','🍤','🥟','🍜','🍱','🍩','🍰','🧁','🍫','🍦','🍿','🥙','🍝','🥘','🍛','🍲','🥗','🌮','🌯','🥪'] },
  { id: 'space', ar: 'فضاء',
    icons: ['🪐','🌟','🌙','☄️','🚀','🛸','👽','🌍','🌌','✨','☀️','⭐','🌠','🛰️','🔭','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌚','🌝','🌞','💫','🌜','🌛','🌎'] },
  { id: 'sport', ar: 'رياضة',
    icons: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🛹','🏊','🚴','🧗','⛷️','🏂','🏋️','🤺','⛹️','🤾','🤸','⛳','🏹','🥋','🥍','🏏','🏑','⛸️','🥌'] },
  { id: 'flags', ar: 'أعلام',
    icons: ['🇸🇦','🇪🇬','🇲🇦','🇯🇴','🇮🇶','🇸🇾','🇹🇷','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇬🇧','🇯🇵','🇰🇷','🇧🇷','🇮🇳','🇨🇳','🇺🇸','🇨🇦','🇲🇽','🇦🇺','🇿🇦','🇸🇪','🇳🇴','🇫🇮','🇩🇰','🇳🇱','🇧🇪','🇨🇭','🇦🇹'] },
];

const DIFF_PAIRS: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 12, expert: 18 };
const DIFF_COLS: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4, expert: 6 };

// =============================================================================
// Achievements
// =============================================================================
interface AchievementDef {
  id: string;
  ar: string;
  icon: string;
  check: (s: MemoryStats) => boolean;
}
const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first',   ar: 'الخطوة الأولى',     icon: '🎯', check: s => s.gamesWon >= 1 },
  { id: 'ten',     ar: 'عشَرة',        icon: '🏅', check: s => s.gamesWon >= 10 },
  { id: 'fifty',   ar: 'الخمسون',        icon: '🥇', check: s => s.gamesWon >= 50 },
  { id: 'streak5', ar: 'سلسلة 5',         icon: '🔥', check: s => s.bestStreak >= 5 },
  { id: 'combo5',  ar: 'كومبو ×5',        icon: '⚡', check: s => s.bestChain >= 5 },
  { id: 'expert',  ar: 'خبير',        icon: '🧠', check: s => (s.bestScore.expert ?? 0) >= 1 },
  { id: 'fast',    ar: 'سريع البرق',           icon: '⚡', check: s => (s.bestTime.medium ?? 999) < 30 },
  { id: 'perf',    ar: 'إتقان',         icon: '💎', check: s => s.flawless >= 1 },
  { id: 'daily7',  ar: '7 أيام يومية',   icon: '📅', check: s => s.dailyStreak >= 7 },
  { id: 'level10', ar: 'المستوى 10',        icon: '👑', check: s => s.level >= 10 },
];

// =============================================================================
// Stats / Save
// =============================================================================
interface MemoryStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  bestMoves: Record<Difficulty, number | null>;
  bestScore: Record<Difficulty, number | null>;
  currentStreak: number;
  bestStreak: number;
  bestChain: number;
  bestEndlessLevel: number;
  bestTimeAttackPairs: number;
  flawless: number;
  totalPairs: number;
  xp: number;
  level: number;
  unlocked: string[];
  lastDailyKey: string | null;
  dailyStreak: number;
  dailyResults: Record<string, { time: number; moves: number; score: number }>;
  versusWins: number;
  versusLosses: number;
}

const DEFAULT_STATS: MemoryStats = {
  gamesPlayed: 0, gamesWon: 0,
  bestTime: { easy: null, medium: null, hard: null, expert: null },
  bestMoves: { easy: null, medium: null, hard: null, expert: null },
  bestScore: { easy: null, medium: null, hard: null, expert: null },
  currentStreak: 0, bestStreak: 0, bestChain: 0,
  bestEndlessLevel: 0, bestTimeAttackPairs: 0,
  flawless: 0, totalPairs: 0,
  xp: 0, level: 1, unlocked: [],
  lastDailyKey: null, dailyStreak: 0, dailyResults: {},
  versusWins: 0, versusLosses: 0,
};

function loadStats(): MemoryStats {
  try {
    const s = JSON.parse(localStorage.getItem('memory-stats') || '{}');
    return {
      ...DEFAULT_STATS, ...s,
      bestTime: { ...DEFAULT_STATS.bestTime, ...(s.bestTime || {}) },
      bestMoves: { ...DEFAULT_STATS.bestMoves, ...(s.bestMoves || {}) },
      bestScore: { ...DEFAULT_STATS.bestScore, ...(s.bestScore || {}) },
      unlocked: Array.isArray(s.unlocked) ? s.unlocked : [],
      dailyResults: s.dailyResults || {},
    };
  } catch { return { ...DEFAULT_STATS }; }
}
import { saveGameProgress, getGameProgress } from '../api';

function saveStatsFn(s: MemoryStats) {
  localStorage.setItem('memory-stats', JSON.stringify(s));
  saveGameProgress('memory', s).catch(console.error);
}

function levelFromXp(xp: number): number {
  // Triangular: lvl 1 needs 100, 2 needs 250, 3 needs 450, ...
  let lvl = 1; let need = 100;
  while (xp >= need) { xp -= need; lvl++; need = 100 * lvl; }
  return lvl;
}
function xpForNextLevel(level: number): number { return 100 * level; }
function xpProgress(stats: MemoryStats): { current: number; need: number; pct: number } {
  let xp = stats.xp; let lvl = 1; let need = 100;
  while (xp >= need) { xp -= need; lvl++; need = 100 * lvl; }
  return { current: xp, need, pct: Math.min(100, (xp / need) * 100) };
}

// =============================================================================
// Helpers
// =============================================================================
function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  const rng = seed != null ? mulberry(seed) : Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mulberry(seed: number) {
  return () => { seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function todayKey(): string { const d = new Date(); return `${d.getUTCFullYear()}-${(d.getUTCMonth()+1).toString().padStart(2,'0')}-${d.getUTCDate().toString().padStart(2,'0')}`; }
function dailySeed(): number { let h = 2166136261 >>> 0; const k = todayKey(); for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function buildDeck(pairCount: number, theme: Theme, seed?: number): string[] {
  const pool = shuffle(theme.icons, seed).slice(0, pairCount);
  return shuffle([...pool, ...pool], seed != null ? seed + 1 : undefined);
}

// =============================================================================
// Component
// =============================================================================
export default function MemoryGame() {
  const { } = useApp();

  // Persistent settings
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('memory-mode') as Mode) || 'classic');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (localStorage.getItem('memory-diff') as Difficulty) || 'easy');
  const [themeId, setThemeId] = useState(() => localStorage.getItem('memory-theme') || 'classic');
  const theme = useMemo(() => THEMES.find(t => t.id === themeId) ?? THEMES[0], [themeId]);

  // -------- Adventure mode wiring --------
  // When ?adventure=N is in the URL, the game switches to campaign mode.
  // The stage's twist, theme, and pair count override regular settings,
  // and on victory we grade stars + persist progress + return to the hub.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adventureStage: AdventureStage | null = useMemo(() => {
    const id = searchParams.get('adventure');
    if (!id) return null;
    return STAGES.find(s => s.id === Number(id)) ?? null;
  }, [searchParams]);
  const [adventureMistakes, setAdventureMistakes] = useState(0);
  const [adventureResult, setAdventureResult] = useState<{ stars: number; time: number } | null>(null);

  // Pull theme + auto-switch to adventure mode when the URL says so.
  useEffect(() => {
    if (!adventureStage) return;
    setMode('adventure');
    setThemeId(adventureStage.themeId);
    setAdventureMistakes(0);
    setAdventureResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adventureStage?.id]);

  useEffect(() => { localStorage.setItem('memory-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('memory-diff', difficulty); }, [difficulty]);
  useEffect(() => { localStorage.setItem('memory-theme', themeId); }, [themeId]);

  // Game state
  const [cards, setCards] = useState<string[]>(() => buildDeck(DIFF_PAIRS.easy, THEMES[0]));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [bestChainThisGame, setBestChainThisGame] = useState(0);
  const [powerUps, setPowerUps] = useState({ peek: 2, shuffle: 1, bomb: 1 });
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [solved, setSolved] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [bombArmed, setBombArmed] = useState(false);
  const [accuracyTracking, setAccuracyTracking] = useState({ totalAttempts: 0, successfulAttempts: 0 });

  // Mode-specific state
  const [endlessLevel, setEndlessLevel] = useState(1);
  const [timeAttackLeft, setTimeAttackLeft] = useState(60);
  const [timeAttackPairs, setTimeAttackPairs] = useState(0);
  const [versusScores, setVersusScores] = useState({ player: 0, ai: 0 });
  const [versusTurn, setVersusTurn] = useState<'player' | 'ai'>('player');
  const [aiMemory, setAiMemory] = useState<Record<number, string>>({});
  const [versusFlash, setVersusFlash] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<MemoryStats>(loadStats);

  useEffect(() => {
    const syncStats = async () => {
      try {
        const cloudStats = await getGameProgress('memory');
        if (cloudStats) {
          localStorage.setItem('memory-stats', JSON.stringify(cloudStats));
          setStats(prev => ({ ...prev, ...cloudStats }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncStats();
  }, []);

  const [achievementToast, setAchievementToast] = useState<AchievementDef | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cols = DIFF_COLS[difficulty];
  const pairCount = DIFF_PAIRS[difficulty];

  // -------------------- Timer --------------------
  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => {
      setTimer(t => t + 1);
      if (mode === 'timeattack') {
        setTimeAttackLeft(s => {
          if (s <= 1) {
            // time's up
            setIsRunning(false);
            setSolved(true);
            const newPairs = matched.length / 2;
            const s2 = loadStats();
            s2.gamesPlayed += 1;
            if (newPairs > s2.bestTimeAttackPairs) s2.bestTimeAttackPairs = newPairs;
            s2.totalPairs += newPairs;
            s2.xp += newPairs * 15;
            s2.level = levelFromXp(s2.xp);
            saveStatsFn(s2); setStats(s2);
            checkAchievements(s2);
            playSfx('lose'); vibrate([60, 60, 200]);
            return 0;
          }
          return s - 1;
        });
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, solved, isPaused, mode]);

  // -------------------- Solve detection (classic / endless / daily / versus) --------------------
  useEffect(() => {
    if (matched.length === 0 || matched.length !== cards.length || solved) return;
    if (mode === 'timeattack') {
      // Time-attack solves: build a new harder board immediately
      const nextPairs = Math.min(theme.icons.length, pairCount + 2);
      setTimeAttackPairs(p => p + nextPairs);
      setCards(buildDeck(nextPairs, theme));
      setFlipped([]); setMatched([]);
      playSfx('streak'); vibrate(40);
      return;
    }
    if (mode === 'endless') {
      // level up: increase pairs, less time, +xp
      const nextLevel = endlessLevel + 1;
      setEndlessLevel(nextLevel);
      const nextPairs = Math.min(theme.icons.length, 4 + nextLevel);
      setCards(buildDeck(nextPairs, theme));
      setFlipped([]); setMatched([]);
      const s = loadStats();
      s.totalPairs += nextPairs;
      s.xp += nextPairs * 8 + (nextLevel * 5);
      s.level = levelFromXp(s.xp);
      if (nextLevel - 1 > s.bestEndlessLevel) s.bestEndlessLevel = nextLevel - 1;
      saveStatsFn(s); setStats(s);
      playSfx('level'); vibrate([20, 40, 20]);
      return;
    }
    if (mode === 'versus') {
      // Decide winner
      finishVersus();
      return;
    }
    if (mode === 'adventure' && adventureStage) {
      finishAdventure();
      return;
    }
    // classic / daily
    finishClassicGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length]);

  // Adventure stages grade by time + mistakes (mistakes counted in handleCard
  // wherever a non-matching pair is flipped). On clear we persist stars and
  // can route the player back to the hub or onto the next stage.
  function finishAdventure() {
    if (!adventureStage) return;
    setSolved(true);
    setIsRunning(false);
    playSfx('win'); vibrate([80, 100, 80, 100, 200]);
    const stars = gradeStage(adventureStage, timer, adventureMistakes);
    recordStageResult(adventureStage.id, stars, timer);
    setAdventureResult({ stars, time: timer });
  }

  function finishClassicGame() {
    setSolved(true);
    setIsRunning(false);
    playSfx('win'); vibrate([80, 100, 80, 100, 200]);
    const finalScore = Math.max(0, score + 2000 - timer * 5 - moves * 8);
    const s = loadStats();
    s.gamesPlayed += 1; s.gamesWon += 1;
    s.currentStreak += 1;
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
    if (s.bestMoves[difficulty] === null || moves < s.bestMoves[difficulty]!) s.bestMoves[difficulty] = moves;
    if (s.bestScore[difficulty] === null || finalScore > s.bestScore[difficulty]!) s.bestScore[difficulty] = finalScore;
    if (bestChainThisGame > s.bestChain) s.bestChain = bestChainThisGame;
    if (powerUps.peek === 2 && powerUps.shuffle === 1 && powerUps.bomb === 1) s.flawless += 1;
    s.totalPairs += pairCount;
    const xpGained = pairCount * 10 + Math.max(0, 100 - timer);
    s.xp += xpGained;
    const oldLevel = s.level;
    s.level = levelFromXp(s.xp);
    if (mode === 'daily') {
      const k = todayKey();
      s.dailyResults[k] = { time: timer, moves, score: finalScore };
      if (s.lastDailyKey) {
        const yest = new Date(); yest.setUTCDate(yest.getUTCDate() - 1);
        const yk = `${yest.getUTCFullYear()}-${(yest.getUTCMonth()+1).toString().padStart(2,'0')}-${yest.getUTCDate().toString().padStart(2,'0')}`;
        if (s.lastDailyKey === yk) s.dailyStreak += 1; else s.dailyStreak = 1;
      } else { s.dailyStreak = 1; }
      s.lastDailyKey = k;
    }
    saveStatsFn(s); setStats(s);
    if (s.level > oldLevel) {
      setTimeout(() => { playSfx('level'); }, 500);
    }
    setScore(finalScore);
    checkAchievements(s);
  }

  function finishVersus() {
    setSolved(true);
    setIsRunning(false);
    const s = loadStats();
    s.gamesPlayed += 1;
    if (versusScores.player > versusScores.ai) {
      s.gamesWon += 1; s.versusWins += 1;
      s.currentStreak += 1;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      s.xp += 80;
      playSfx('win');
    } else {
      s.versusLosses += 1;
      s.currentStreak = 0;
      s.xp += 20;
      playSfx('lose');
    }
    s.level = levelFromXp(s.xp);
    saveStatsFn(s); setStats(s);
    checkAchievements(s);
  }

  function checkAchievements(s: MemoryStats) {
    for (const def of ACHIEVEMENTS) {
      if (!s.unlocked.includes(def.id) && def.check(s)) {
        s.unlocked.push(def.id);
        saveStatsFn(s);
        setAchievementToast(def);
        setTimeout(() => setAchievementToast(null), 3500);
        playSfx('streak');
      }
    }
  }

  // -------------------- AI for Versus --------------------
  const aiPlayTurn = useCallback(() => {
    if (mode !== 'versus' || versusTurn !== 'ai' || solved) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const remaining = cards.map((_, i) => i).filter(i => !matched.includes(i));
    if (remaining.length === 0) return;

    aiTimerRef.current = setTimeout(() => {
      // 1) Pick first card. If AI remembers a pair from memory, use it.
      const pairs: Record<string, number[]> = {};
      Object.entries(aiMemory).forEach(([idx, val]) => {
        if (!matched.includes(parseInt(idx))) {
          (pairs[val] ??= []).push(parseInt(idx));
        }
      });
      const knownPairKeys = Object.keys(pairs).filter(k => pairs[k].length >= 2);
      let firstIdx: number; let secondIdx: number | null = null;
      if (knownPairKeys.length > 0) {
        const key = knownPairKeys[0];
        [firstIdx, secondIdx] = pairs[key].slice(0, 2);
      } else {
        // Choose a random unknown card preferring unseen
        const unseen = remaining.filter(i => !(i in aiMemory));
        firstIdx = (unseen.length ? unseen : remaining)[Math.floor(Math.random() * (unseen.length || remaining.length))];
      }
      // Reveal first
      setFlipped([firstIdx]);
      const firstVal = cards[firstIdx];
      // Update memory
      setAiMemory(m => ({ ...m, [firstIdx]: firstVal }));
      playSfx('flip');

      aiTimerRef.current = setTimeout(() => {
        // Choose second
        if (secondIdx == null || secondIdx === firstIdx) {
          // Try matching from memory now that we know firstVal
          const mate = Object.entries(aiMemory).find(([idx, v]) => v === firstVal && parseInt(idx) !== firstIdx && !matched.includes(parseInt(idx)));
          if (mate) secondIdx = parseInt(mate[0]);
          else {
            const left = remaining.filter(i => i !== firstIdx);
            const unseen = left.filter(i => !(i in aiMemory));
            secondIdx = (unseen.length ? unseen : left)[Math.floor(Math.random() * (unseen.length || left.length))];
          }
        }
        setFlipped([firstIdx, secondIdx]);
        const secondVal = cards[secondIdx];
        setAiMemory(m => ({ ...m, [secondIdx!]: secondVal }));
        playSfx('flip');

        aiTimerRef.current = setTimeout(() => {
          if (firstVal === secondVal) {
            // AI matched
            setMatched(m => [...m, firstIdx, secondIdx!]);
            setVersusScores(s => ({ ...s, ai: s.ai + 1 }));
            setVersusFlash('الخصم وجد زوجاً');
            setTimeout(() => setVersusFlash(null), 800);
            playSfx('match');
            setFlipped([]);
            // AI continues
            aiPlayTurn();
          } else {
            setFlipped([]);
            setVersusTurn('player');
            playSfx('wrong');
          }
        }, 700);
      }, 600);
    }, 700);
  }, [mode, versusTurn, solved, cards, matched, aiMemory]);

  useEffect(() => {
    if (mode === 'versus' && versusTurn === 'ai' && !solved && gameStarted) {
      aiPlayTurn();
    }
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [mode, versusTurn, solved, gameStarted, aiPlayTurn]);

  // -------------------- Card click --------------------
  const handleCard = useCallback((index: number) => {
    if (isPaused || checking || solved || flipped.includes(index) || matched.includes(index)) return;
    if (peeking) return;
    if (mode === 'versus' && versusTurn !== 'player') return;

    if (bombArmed) {
      // bomb: match this card with its pair instantly
      const target = cards[index];
      const pairIdx = cards.findIndex((c, i) => i !== index && c === target && !matched.includes(i));
      if (pairIdx >= 0) {
        setMatched(m => [...m, index, pairIdx]);
        playSfx('streak'); vibrate(60);
      }
      setBombArmed(false);
      return;
    }

    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    if (newFlipped.length === 1) {
      setAccuracyTracking(prev => ({ ...prev, totalAttempts: prev.totalAttempts + 1 }));
    }
    playSfx('flip'); vibrate(10);

    // Update AI memory in versus mode
    if (mode === 'versus') {
      setAiMemory(m => ({ ...m, [index]: cards[index] }));
    }

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      const sameKind = cards[newFlipped[0]] === cards[newFlipped[1]];
      if (sameKind) {
        setTimeout(() => {
          setMatched(m => [...m, newFlipped[0], newFlipped[1]]);
          setFlipped([]); setChecking(false);
          if (mode === 'versus') {
            setVersusScores(s => ({ ...s, player: s.player + 1 }));
            setVersusFlash('أحسنت!');
            setTimeout(() => setVersusFlash(null), 800);
          } else {
            const newChain = chain + 1;
            setChain(newChain);
            setAccuracyTracking(prev => ({ ...prev, successfulAttempts: prev.successfulAttempts + 1 }));
            if (newChain > bestChainThisGame) setBestChainThisGame(newChain);
            const gain = 100 + (newChain >= 3 ? newChain * 25 : 0);
            setScore(s => s + gain);
          }
          playSfx(chain >= 2 ? 'streak' : 'match');
          vibrate(chain >= 2 ? [40, 30, 40] : 25);
        }, 400);
      } else {
        setTimeout(() => {
          setFlipped([]); setChecking(false); setChain(0);
          playSfx('wrong'); vibrate(50);
          // Track mismatches for adventure-stage star rating.
          if (mode === 'adventure') setAdventureMistakes(n => n + 1);
          if (mode === 'versus') {
            setVersusTurn('ai');
          }
        }, 850);
      }
    }
  }, [flipped, matched, checking, isPaused, solved, cards, gameStarted, peeking, bombArmed, chain, bestChainThisGame, mode, versusTurn]);

  // -------------------- New / Reset / Power-ups --------------------
  const newGame = useCallback((diff?: Difficulty, t?: Theme, m?: Mode) => {
    const d = diff ?? difficulty;
    const th = t ?? theme;
    const mm = m ?? mode;
    setDifficulty(d); setThemeId(th.id); setMode(mm);
    let deck: string[];
    const pairs = DIFF_PAIRS[d];
    if (mm === 'daily') deck = buildDeck(DIFF_PAIRS.medium, th, dailySeed());
    else if (mm === 'endless') deck = buildDeck(5, th);
    else if (mm === 'timeattack') deck = buildDeck(4, th);
    else if (mm === 'adventure' && adventureStage) {
      // Adventure stages provide a fixed pair count keyed off the stage,
      // so the briefing screen actually matches the game.
      deck = buildDeck(adventureStage.pairs, th);
    }
    else deck = buildDeck(pairs, th);
    setCards(deck);
    setFlipped([]); setMatched([]); setMoves(0); setTimer(0); setScore(0);
    setChain(0); setBestChainThisGame(0);
    setIsRunning(false); setGameStarted(false); setIsPaused(false);
    setSolved(false); setChecking(false); setPeeking(false); setBombArmed(false);
    setPowerUps({ peek: 2, shuffle: 1, bomb: 1 });
    setEndlessLevel(1); setTimeAttackLeft(60); setTimeAttackPairs(0);
    setVersusScores({ player: 0, ai: 0 }); setVersusTurn('player');
    setAiMemory({});
    setAdventureMistakes(0);
    setAdventureResult(null);
  }, [difficulty, theme, mode, adventureStage]);

  // Re-init when mode changes
  useEffect(() => { newGame();   }, [mode]);

  const startGame = () => { setGameStarted(true); setIsRunning(true); setIsPaused(false); };
  const togglePause = () => { if (!gameStarted) { startGame(); return; } setIsPaused(p => !p); };

  const usePeek = () => {
    if (powerUps.peek <= 0 || peeking || !gameStarted || solved) return;
    setPeeking(true); setPowerUps(p => ({ ...p, peek: p.peek - 1 }));
    playSfx('hint');
    setTimeout(() => setPeeking(false), 1200);
  };
  const useShuffleU = () => {
    if (powerUps.shuffle <= 0 || !gameStarted || solved) return;
    const idxes = cards.map((_, i) => i).filter(i => !matched.includes(i));
    const vals = idxes.map(i => cards[i]);
    const shuffled = shuffle(vals);
    const newCards = [...cards];
    idxes.forEach((idx, i) => { newCards[idx] = shuffled[i]; });
    setCards(newCards); setFlipped([]);
    setPowerUps(p => ({ ...p, shuffle: p.shuffle - 1 }));
    playSfx('rotate');
  };
  const useBomb = () => {
    if (powerUps.bomb <= 0 || !gameStarted || solved) return;
    setPowerUps(p => ({ ...p, bomb: p.bomb - 1 }));
    setBombArmed(true);
    playSfx('place');
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // -------------------- Labels --------------------
  const diffLabels: Record<Difficulty, string> = {
    easy:   'سهل',
    medium: 'متوسط',
    hard:   'صعب',
    expert: 'خبير',
  };
  const modeLabels: Record<Mode, { ar: string; icon: typeof Brain }> = {
    classic:    { ar: 'كلاسيكي',   icon: Brain },
    endless:    { ar: 'بلا نهاية',      icon: Flame },
    timeattack: { ar: 'سباق الوقت', icon: TimerIcon },
    daily:      { ar: 'تحدّي اليوم', icon: Calendar },
    versus:     { ar: 'ضد الذكاء',   icon: Zap },
    adventure:  { ar: 'مغامرة',  icon: Trophy },
  };

  // GameShell options
  const options = [
    {
      key: 'mode', label: 'النمط',
      choices: (Object.keys(modeLabels) as Mode[]).map(m => ({ value: m, label: modeLabels[m].ar })),
      current: mode, onChange: (v: string) => setMode(v as Mode),
    },
    ...(mode === 'classic' || mode === 'versus' ? [{
      key: 'diff', label: 'الصعوبة',
      choices: (['easy','medium','hard','expert'] as Difficulty[]).map(d => ({ value: d, label: diffLabels[d] })),
      current: difficulty, onChange: (v: string) => newGame(v as Difficulty),
    }] : []),
    {
      key: 'theme', label: 'الأيقونات',
      choices: THEMES.map(th => ({ value: th.id, label: th.ar })),
      current: themeId, onChange: (v: string) => newGame(undefined, THEMES.find(t => t.id === v)!),
    },
  ];

  // GameShell rules (mode-specific)
  const rules = useMemo(() => {
    if (true) {
      switch (mode) {
        case 'classic':    return ['اقلب البطاقات لإيجاد كل الأزواج', 'كومبو ×3 وأكثر يمنحك نقاطاً إضافية', 'وقت أقل = نقاط أكثر', 'اربح بدون استخدام أدوات لتحقيق "إتقان"'];
        case 'endless':    return ['كل مستوى يضيف بطاقات أكثر', 'لا توجد نهاية، فقط حدود ذاكرتك', 'كل مستوى يمنح XP', 'حافظ على الكومبو لتسريع التقدم'];
        case 'timeattack': return ['60 ثانية، أكبر عدد ممكن من الأزواج', 'اللوحة تتجدد بأزواج أكثر بعد كل حل', 'سرعة + دقة تساوي نتيجة عالية', 'الوقت لا يتوقف!'];
        case 'daily':      return ['نفس اللغز لكل اللاعبين اليوم', 'لكل يوم تحدّ واحد فقط', 'سلسلة الأيام تمنحك مكافآت ضخمة', 'يتجدد عند منتصف الليل (UTC)'];
        case 'versus':     return ['تتناوب أنت والذكاء على الكشف', 'من يطابق زوجاً يلعب مرة أخرى', 'الذكاء يتذكر البطاقات التي رآها', 'أكثر أزواج = الفوز'];
      }
    } else {
      switch (mode) {
        case 'classic':    return ['Drehe Karten, finde alle Paare', 'Combo ×3+ gibt Bonuspunkte', 'Schneller = mehr Punkte', 'Ohne Power-ups = "Perfekt"'];
        case 'endless':    return ['Jedes Level mehr Karten', 'Kein Ende — nur dein Gedächtnis', 'XP pro Level', 'Combo halten beschleunigt'];
        case 'timeattack': return ['60s, so viele Paare wie möglich', 'Brett wächst nach jedem Solve', 'Speed + Genauigkeit = Top-Score', 'Die Zeit läuft!'];
        case 'daily':      return ['Gleiches Rätsel weltweit pro Tag', 'Eine Challenge pro Tag', 'Tagesserie = große Belohnung', 'Reset 00:00 UTC'];
        case 'versus':     return ['Du und KI wechseln sich ab', 'Treffer = nochmal dran', 'Die KI merkt sich gesehene Karten', 'Wer mehr Paare findet, gewinnt'];
      }
    }
    return [];
  }, [mode]);

  // GameShell stats
  const xp = xpProgress(stats);

  const accuracy = accuracyTracking.totalAttempts > 0 ? Math.round((accuracyTracking.successfulAttempts / accuracyTracking.totalAttempts) * 100) : 0;

  const statsArr = [
    { label: 'المستوى', value: stats.level },
    { label: 'فوز', value: stats.gamesWon },
    { label: 'أفضل سلسلة', value: stats.bestStreak },
    { label: 'أعلى كومبو', value: `×${stats.bestChain}` },
    { label: 'الدقة الحالية', value: `${accuracy}%` },
    { label: 'مستوى Endless', value: stats.bestEndlessLevel },
    { label: 'سباق ذروة', value: stats.bestTimeAttackPairs },
    { label: 'يومية متتالية', value: stats.dailyStreak },
    { label: 'إنجازات', value: `${stats.unlocked.length}/${ACHIEVEMENTS.length}` },
  ];


  // -------------------- Render --------------------
  const dailyDoneToday = mode === 'daily' && !!stats.dailyResults[todayKey()];

  return (
    <GameShell
      title={'أزواج الذاكرة'}
      icon={Brain}
      accentColor="hsl(262, 83%, 58%)"
      rules={rules}
      stats={statsArr}
      options={options}
      headerRight={
        <div className="flex items-center gap-1">
          <button onClick={togglePause} className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-500/15 text-pink-300 active:scale-90 transition-transform">
            {isPaused || !gameStarted ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => newGame()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-500/15 text-pink-300 active:scale-90 transition-transform">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      {/* Level + XP bar */}
      <div className="rounded-2xl border border-pink-500/15 bg-pink-500/5 p-3 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-pink-300" />
            <span className="text-[11px] font-bold text-pink-200">Lv.{stats.level}</span>
            <span className="text-[10px] text-zinc-500">{xp.current}/{xp.need} XP</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Award className="w-3 h-3 text-amber-400" />
            <span>{stats.unlocked.length}/{ACHIEVEMENTS.length}</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div className="h-full rounded-full "
            animate={{ width: `${xp.pct}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Adventure stage banner — shows the active stage's title and twist
          so the player always remembers what rule applies, plus a live
          mistake counter against their star budget. */}
      {mode === 'adventure' && adventureStage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-pink-500/25 bg-pink-500/8 p-2.5 mb-3 max-w-[400px] mx-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">{adventureStage.isBoss ? '👑' : `#${adventureStage.id}`}</span>
              <p className="text-xs font-bold text-pink-200 truncate">
                {adventureStage.ar}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[10px] font-mono ${
                adventureMistakes > adventureStage.starMistakeBudget ? 'text-rose-400' : 'text-pink-300'
              }`}>
                {adventureMistakes}/{adventureStage.starMistakeBudget} {'خطأ'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mode indicator + mode-specific HUD */}
      <ModeHud
        mode={mode}
        endlessLevel={endlessLevel}
        timeAttackLeft={timeAttackLeft}
        timeAttackPairs={timeAttackPairs + matched.length / 2}
        versusScores={versusScores}
        versusTurn={versusTurn}
        timer={timer}
        moves={moves}
        score={score}
        chain={chain}
        fmt={fmt}
        dailyDoneToday={dailyDoneToday}
      />

      {/* Power-ups (not in versus mode for fairness) */}
      {mode !== 'versus' && (
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <PowerUpButton icon={Eye} count={powerUps.peek} onClick={usePeek} color="#06b6d4"
            label={'نظرة'} disabled={!gameStarted || solved} />
          <PowerUpButton icon={ShuffleIcon} count={powerUps.shuffle} onClick={useShuffleU} color="#a855f7"
            label={'خلط'} disabled={!gameStarted || solved} />
          <PowerUpButton icon={Sparkles} count={powerUps.bomb} onClick={useBomb} color="#f59e0b"
            label={'قنبلة'} disabled={!gameStarted || solved} active={bombArmed} />
        </div>
      )}

      {/* Versus flash banner */}
      <AnimatePresence>
        {versusFlash && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center text-pink-200 text-xs font-bold mb-2">{versusFlash}</motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="max-w-[400px] mx-auto relative">
        <div className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, perspective: '900px' }}>
          {cards.map((icon, i) => {
            const isFlipped = peeking || flipped.includes(i) || matched.includes(i);
            const isMatched = matched.includes(i);
            return (
              <button key={i} onClick={() => handleCard(i)} className="relative aspect-square">
                <motion.div className="absolute inset-0"
                  animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.4 }}
                  style={{ transformStyle: 'preserve-3d' }}>
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center border"
                    style={{ backfaceVisibility: 'hidden',
                      background: bombArmed ? '#f59e0b30' : 'rgba(236,72,153,0.18)',
                      borderColor: bombArmed ? '#f59e0b66' : 'rgba(236,72,153,0.25)' }}>
                    <div className="text-pink-300/40 text-2xl">?</div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center border"
                    style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden',
                      background: isMatched ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
                      borderColor: isMatched ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.06)' }}>
                    <span className={cols >= 6 ? 'text-2xl' : 'text-3xl'}>{icon}</span>
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {isPaused && gameStarted && !solved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <button onClick={() => setIsPaused(false)} className="px-6 py-3 rounded-2xl bg-pink-500 text-white font-black">
                <Play className="w-4 h-4 inline mr-1.5" />{'استئناف'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Solved screen */}
      <AnimatePresence>
        {solved && mode === 'adventure' && adventureResult && adventureStage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-[400px] mx-auto mt-5 text-center p-5 rounded-2xl border border-pink-500/30 bg-pink-500/5"
          >
            <p className="text-4xl mb-1">{adventureStage.isBoss ? '👑' : '🎊'}</p>
            <p className="text-xl font-black text-pink-300 mb-2">
              {'نجحت في المحطة!'}
            </p>
            {/* Star reveal */}
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3].map(n => (
                <motion.span
                  key={n}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2 + n * 0.2, type: 'spring', stiffness: 220 }}
                  className="text-3xl"
                >
                  {n <= adventureResult.stars ? '⭐' : '☆'}
                </motion.span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard value={fmt(adventureResult.time)} label={'الوقت'} />
              <StatCard value={adventureMistakes} label={'أخطاء'} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/games/memory/adventure')}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-foreground font-bold text-sm"
              >
                {'الخريطة'}
              </button>
              {adventureStage.id < STAGES.length && (
                <button
                  onClick={() => navigate(`/games/memory?adventure=${adventureStage.id + 1}`)}
                  className="flex-1 py-2.5 rounded-xl font-black text-pink-950 text-sm"
                  style={{ }}
                >
                  {'التالية ←'}
                </button>
              )}
              {adventureStage.id === STAGES.length && (
                <button
                  onClick={() => navigate('/games/memory/adventure')}
                  className="flex-1 py-2.5 rounded-xl font-black text-amber-950 text-sm"
                  style={{ }}
                >
                  {'🏆 إنهاء'}
                </button>
              )}
            </div>
          </motion.div>
        )}
        {solved && mode !== 'adventure' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-[400px] mx-auto mt-5 text-center p-5 rounded-2xl border border-pink-500/30 bg-pink-500/5">
            <p className="text-4xl mb-1">
              {mode === 'versus'
                ? versusScores.player > versusScores.ai ? '🏆' : versusScores.player === versusScores.ai ? '🤝' : '😞'
                : mode === 'timeattack' ? '⏱️' : '🎊'}
            </p>
            <p className="text-2xl font-black text-pink-300 mb-1">
              {mode === 'versus'
                ? versusScores.player > versusScores.ai ? ('فوز!') : versusScores.player === versusScores.ai ? ('تعادل') : ('حظ أوفر')
                : mode === 'timeattack' ? ('انتهى الوقت')
                : ('أحسنت!')}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
              {mode === 'versus' ? (
                <>
                  <StatCard value={versusScores.player} label={'أنت'} />
                  <StatCard value={versusScores.ai} label={'الذكاء'} />
                  <StatCard value={fmt(timer)} label={'الوقت'} />
                </>
              ) : mode === 'timeattack' ? (
                <>
                  <StatCard value={timeAttackPairs + matched.length / 2} label={'أزواج'} />
                  <StatCard value={moves} label={'حركات'} />
                  <StatCard value={`×${bestChainThisGame}`} label={'كومبو'} />
                </>
              ) : (
                <>
                  <StatCard value={score} label={'نقطة'} />
                  <StatCard value={fmt(timer)} label={'الوقت'} />
                  <StatCard value={`×${bestChainThisGame}`} label={'كومبو'} />
                </>
              )}
            </div>
            <button onClick={() => newGame()} className="px-7 py-2.5 rounded-xl bg-pink-500 text-white font-black">
              <RefreshCw className="w-4 h-4 inline mr-1.5" />{'لعبة جديدة'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements list */}
      <div className="max-w-[400px] mx-auto mt-6">
        <p className="text-[11px] font-bold text-zinc-400 mb-2 px-1">
          {'الإنجازات'} · {stats.unlocked.length}/{ACHIEVEMENTS.length}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ACHIEVEMENTS.map(def => {
            const unlocked = stats.unlocked.includes(def.id);
            return (
              <div key={def.id}
                className="aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1 border"
                style={{
                  background: unlocked ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.02)',
                  borderColor: unlocked ? 'rgba(236,72,153,0.35)' : 'rgba(255,255,255,0.05)',
 opacity: unlocked ? 1 : 0.45,
 }}>
 <span className="text-lg leading-none mb-0.5">{unlocked ? def.icon : <Lock className="w-3.5 h-3.5 text-zinc-500" />}</span>
 <span className="text-[10px] font-semibold text-zinc-300 leading-tight line-clamp-2">{def.ar}</span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Achievement toast */}
 <AnimatePresence>
 {achievementToast && (
 <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
 className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-4 py-3 border border-pink-500/40 bg-pink-500/15 backdrop-blur-md flex items-center gap-3">
 <span className="text-2xl">{achievementToast.icon}</span>
 <div>
 <p className="text-[10px] text-pink-200 font-semibold uppercase tracking-wider">{'إنجاز جديد'}</p>
              <p className="text-sm font-black text-white">{achievementToast.ar}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}

// =============================================================================
// Sub-components
// =============================================================================
function ModeHud({
  mode, endlessLevel, timeAttackLeft, timeAttackPairs, versusScores, versusTurn,
  timer, moves, score, chain, fmt, dailyDoneToday,
}: {
  mode: Mode; endlessLevel: number; timeAttackLeft: number; timeAttackPairs: number;
  versusScores: { player: number; ai: number }; versusTurn: 'player' | 'ai';
  timer: number; moves: number; score: number; chain: number;
  fmt: (s: number) => string; dailyDoneToday: boolean;
}) {
  if (mode === 'endless') {
    return (
      <div className="flex items-center justify-between px-1 mb-2 text-xs">
        <span className="text-pink-200 font-bold">{'مستوى'} {endlessLevel}</span>
        <span className="text-zinc-400 tabular-nums">{fmt(timer)}</span>
        <span className="text-zinc-400">{moves} {'حركة'}</span>
        {chain >= 2 && <span className="text-amber-400 font-bold">×{chain}</span>}
      </div>
    );
  }
  if (mode === 'timeattack') {
    const danger = timeAttackLeft <= 10;
    return (
      <div className="flex items-center justify-between px-1 mb-2 text-xs">
        <motion.span animate={danger ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.6, repeat: danger ? Infinity : 0 }}
          className={`font-black tabular-nums ${danger ? 'text-rose-400' : 'text-amber-300'}`}>{timeAttackLeft}s</motion.span>
        <span className="text-pink-200 font-bold">{timeAttackPairs} {'زوج'}</span>
        {chain >= 2 && <span className="text-amber-400 font-bold">×{chain}</span>}
      </div>
    );
  }
  if (mode === 'versus') {
    return (
      <div className="flex items-center justify-between px-3 mb-2 text-xs">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${versusTurn === 'player' ? 'bg-pink-500/20 text-pink-200' : 'bg-white/5 text-zinc-500'}`}>
          <span className="font-black">{'أنت'}</span>
          <span className="font-mono">{versusScores.player}</span>
        </div>
        <span className="text-zinc-400 text-[10px]">{fmt(timer)}</span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${versusTurn === 'ai' ? 'bg-rose-500/20 text-rose-200' : 'bg-white/5 text-zinc-500'}`}>
          <span className="font-mono">{versusScores.ai}</span>
          <span className="font-black">{'الذكاء'}</span>
        </div>
      </div>
    );
  }
  if (mode === 'daily') {
    return (
      <div className="flex items-center justify-between px-1 mb-2 text-xs">
        <span className="text-pink-200 font-bold flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {todayKey()}
        </span>
        <span className="text-zinc-400 tabular-nums">{fmt(timer)}</span>
        <span className="text-zinc-400">{moves} {'حركة'}</span>
        {dailyDoneToday && <span className="text-emerald-400 font-bold text-[10px]">✓</span>}
      </div>
    );
  }
  // classic
  return (
    <div className="flex items-center justify-between px-1 mb-2 text-xs">
      <span className="text-pink-200 font-bold">{score}</span>
      <span className="text-zinc-400 tabular-nums">{fmt(timer)}</span>
      <span className="text-zinc-400">{moves} {'حركة'}</span>
      {chain >= 2 && <span className="text-amber-400 font-bold">×{chain}</span>}
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-white/4 border border-white/5">
      <div className="text-base font-bold text-white tabular-nums">{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  );
}

function PowerUpButton({ icon: Icon, count, onClick, color, label, disabled, active }: {
  icon: typeof Eye; count: number; onClick: () => void; color: string; label: string; disabled?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled || count <= 0} title={`${label} (${count})`}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
      style={{
        background: active ? `${color}30` : `${color}14`,
        border: `1px solid ${active ? color : `${color}40`}`,
      }}>
      <Icon className="w-4 h-4" style={{ color }} />
      {count > 0 && (
        <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1 rounded-full"
          style={{ background: color, color: '#fff' }}>{count}</span>
      )}
    </button>
  );
}
