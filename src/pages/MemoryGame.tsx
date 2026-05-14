import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Play, Pause, Eye, Shuffle as ShuffleIcon, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx, vibrate, isMuted, setMuted } from '@/utils/gameFeedback';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// =============================================================================
// Themes
// =============================================================================
interface Theme {
  id: string; ar: string; de: string; icons: string[];
}
const THEMES: Theme[] = [
  { id: 'classic', ar: 'كلاسيكي', de: 'Klassisch',
    icons: ['🍎','🍊','🍋','🍇','🍓','🍒','🥝','🍑','🌸','🌻','🦋','🐱','🐶','🎸','🎨','⚽','🚀','💎','⭐','🌈','🎁','🎯'] },
  { id: 'animals', ar: 'حيوانات', de: 'Tiere',
    icons: ['🐶','🐱','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🦄','🐺','🦒','🐘','🐧','🦝','🐢','🦅','🦓'] },
  { id: 'food', ar: 'طعام', de: 'Essen',
    icons: ['🍕','🍔','🍟','🌭','🥨','🍳','🥞','🧇','🥐','🍙','🍣','🍤','🥟','🍜','🍱','🍩','🍰','🧁','🍫','🍦','🍿','🥙'] },
  { id: 'space',   ar: 'فضاء',   de: 'Weltraum',
    icons: ['🪐','🌟','🌙','☄️','🚀','🛸','👽','🌍','🌌','✨','☀️','⭐','🌠','🛰️','🔭','🌑','🌒','🌓','🌔','🌕','🌖','🌗'] },
  { id: 'sport',   ar: 'رياضة', de: 'Sport',
    icons: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🛹','🏊','🚴','🧗','⛷️','🏂','🏋️','🤺','⛹️','🤾','🤸'] },
  { id: 'flags',   ar: 'أعلام', de: 'Flaggen',
    icons: ['🇸🇦','🇪🇬','🇲🇦','🇯🇴','🇮🇶','🇸🇾','🇹🇷','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇬🇧','🇯🇵','🇰🇷','🇧🇷','🇮🇳','🇨🇳','🇺🇸','🇨🇦','🇲🇽','🇦🇺','🇿🇦'] },
];

const DIFF_PAIRS: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 12, expert: 18 };
const DIFF_COLS: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4, expert: 6 };

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
}
function loadStats(): MemoryStats {
  try {
    const s = JSON.parse(localStorage.getItem('memory-stats') || '{}');
    return {
      gamesPlayed: s.gamesPlayed || 0,
      gamesWon: s.gamesWon || 0,
      bestTime: { easy: null, medium: null, hard: null, expert: null, ...(s.bestTime || {}) },
      bestMoves: { easy: null, medium: null, hard: null, expert: null, ...(s.bestMoves || {}) },
      bestScore: { easy: null, medium: null, hard: null, expert: null, ...(s.bestScore || {}) },
      currentStreak: s.currentStreak || 0,
      bestStreak: s.bestStreak || 0,
      bestChain: s.bestChain || 0,
    };
  } catch {
    return { gamesPlayed: 0, gamesWon: 0,
      bestTime: { easy: null, medium: null, hard: null, expert: null },
      bestMoves: { easy: null, medium: null, hard: null, expert: null },
      bestScore: { easy: null, medium: null, hard: null, expert: null },
      currentStreak: 0, bestStreak: 0, bestChain: 0 };
  }
}
function saveStatsFn(s: MemoryStats) { localStorage.setItem('memory-stats', JSON.stringify(s)); }

interface SavedGame {
  difficulty: Difficulty;
  themeId: string;
  cards: string[];
  flipped: number[];
  matched: number[];
  moves: number;
  timer: number;
  gameStarted: boolean;
  score: number;
  chain: number;
  powerUps: { peek: number; shuffle: number; bomb: number };
}
function saveGame(g: SavedGame) { localStorage.setItem('memory-game-state', JSON.stringify(g)); }
function loadGame(): SavedGame | null {
  try { const s = localStorage.getItem('memory-game-state'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearGame() { localStorage.removeItem('memory-game-state'); }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function createCards(diff: Difficulty, theme: Theme): string[] {
  const pairCount = DIFF_PAIRS[diff];
  const selected = shuffle(theme.icons).slice(0, pairCount);
  return shuffle([...selected, ...selected]);
}

// =============================================================================
// Component
// =============================================================================
export default function MemoryGame() {
  const { dir, language } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const saved = useMemo(() => loadGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [themeId, setThemeId] = useState(saved?.themeId || (localStorage.getItem('memory-theme') || 'classic'));
  const theme = useMemo(() => THEMES.find(t => t.id === themeId) ?? THEMES[0], [themeId]);
  const [cards, setCards] = useState<string[]>(() => saved?.cards || createCards('easy', THEMES[0]));
  const [flipped, setFlipped] = useState<number[]>(saved?.flipped || []);
  const [matched, setMatched] = useState<number[]>(saved?.matched || []);
  const [moves, setMoves] = useState(saved?.moves || 0);
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [score, setScore] = useState(saved?.score || 0);
  const [chain, setChain] = useState(saved?.chain || 0);
  const [bestChainThisGame, setBestChainThisGame] = useState(0);
  const [powerUps, setPowerUps] = useState(saved?.powerUps || { peek: 2, shuffle: 1, bomb: 1 });
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<MemoryStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [solved, setSolved] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [bombArmed, setBombArmed] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => { localStorage.setItem('memory-theme', themeId); }, [themeId]);

  const cols = DIFF_COLS[difficulty];

  // Timer
  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  // Persist game state
  useEffect(() => {
    if (solved) { clearGame(); return; }
    if (gameStarted) {
      saveGame({ difficulty, themeId, cards, flipped, matched, moves, timer, gameStarted, score, chain, powerUps });
    }
  }, [cards, flipped, matched, moves, timer, gameStarted, solved, difficulty, themeId, score, chain, powerUps]);

  // Solved detection
  useEffect(() => {
    if (matched.length === 0 || matched.length !== cards.length) return;
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
    setStats(s); saveStatsFn(s);
    setScore(finalScore);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length]);

  const handleCard = useCallback((index: number) => {
    if (isPaused || checking || solved || flipped.includes(index) || matched.includes(index)) return;
    if (peeking) return;
    if (bombArmed) {
      // Pop two of the same kind: if the tapped card has a matching pair currently visible (flipped), match both
      const target = cards[index];
      const pairIdx = cards.findIndex((c, i) => i !== index && c === target);
      if (pairIdx >= 0 && !matched.includes(pairIdx) && !matched.includes(index)) {
        setMatched(m => [...m, index, pairIdx]);
        playSfx('streak'); vibrate(60);
      }
      setBombArmed(false);
      return;
    }

    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    playSfx('flip'); vibrate(10);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      const sameKind = cards[newFlipped[0]] === cards[newFlipped[1]];
      if (sameKind) {
        setTimeout(() => {
          setMatched(m => [...m, newFlipped[0], newFlipped[1]]);
          setFlipped([]); setChecking(false);
          const newChain = chain + 1;
          setChain(newChain);
          if (newChain > bestChainThisGame) setBestChainThisGame(newChain);
          const gain = 100 + (newChain >= 3 ? newChain * 25 : 0);
          setScore(s => s + gain);
          playSfx(newChain >= 3 ? 'streak' : 'match');
          vibrate(newChain >= 3 ? [40, 30, 40] : 25);
        }, 400);
      } else {
        setTimeout(() => {
          setFlipped([]); setChecking(false); setChain(0);
          playSfx('wrong'); vibrate(50);
        }, 850);
      }
    }
  }, [flipped, matched, checking, isPaused, solved, cards, gameStarted, peeking, bombArmed, chain, bestChainThisGame]);

  const newGame = (diff?: Difficulty, t?: Theme) => {
    clearGame();
    const d = diff ?? difficulty; const th = t ?? theme;
    setDifficulty(d); setThemeId(th.id);
    setCards(createCards(d, th));
    setFlipped([]); setMatched([]); setMoves(0); setTimer(0); setScore(0); setChain(0); setBestChainThisGame(0);
    setIsRunning(false); setGameStarted(false); setIsPaused(false);
    setSolved(false); setChecking(false); setPeeking(false); setBombArmed(false);
    setPowerUps({ peek: 2, shuffle: 1, bomb: 1 });
  };

  const startGame = () => { setGameStarted(true); setIsRunning(true); setIsPaused(false); };
  const togglePause = () => {
    if (!gameStarted) { startGame(); return; }
    setIsPaused(!isPaused);
  };

  const usePeek = () => {
    if (powerUps.peek <= 0 || peeking || !gameStarted || solved) return;
    setPeeking(true);
    setPowerUps(p => ({ ...p, peek: p.peek - 1 }));
    playSfx('hint');
    setTimeout(() => setPeeking(false), 1500);
  };
  const useShuffleU = () => {
    if (powerUps.shuffle <= 0 || !gameStarted || solved) return;
    // Shuffle only unmatched cards
    const idxes = cards.map((_, i) => i).filter(i => !matched.includes(i));
    const vals = idxes.map(i => cards[i]);
    const shuffled = shuffle(vals);
    const newCards = [...cards];
    idxes.forEach((idx, i) => { newCards[idx] = shuffled[i]; });
    setCards(newCards);
    setFlipped([]);
    setPowerUps(p => ({ ...p, shuffle: p.shuffle - 1 }));
    playSfx('rotate');
  };
  const useBomb = () => {
    if (powerUps.bomb <= 0 || !gameStarted || solved) return;
    setPowerUps(p => ({ ...p, bomb: p.bomb - 1 }));
    setBombArmed(true);
    playSfx('place');
  };

  const toggleMuteLocal = () => { setMuted(!muted); setMutedState(!muted); };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const diffLabels: Record<Difficulty, string> = {
    easy:   isAr ? 'سهل' : 'Easy',
    medium: isAr ? 'متوسط' : 'Medium',
    hard:   isAr ? 'صعب' : 'Hard',
    expert: isAr ? 'محترف' : 'Expert',
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[400px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{isAr ? 'أزواج الذاكرة' : 'Memory Pairs'}</h1>
        <div className="flex gap-1">
          <button onClick={toggleMuteLocal} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {muted ? <VolumeX className="w-5 h-5 text-foreground stroke-[1.8]" /> : <Volume2 className="w-5 h-5 text-foreground stroke-[1.8]" />}
          </button>
          <button onClick={togglePause} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {isPaused || !gameStarted ? <Play className="w-5 h-5 text-foreground stroke-[1.8]" /> : <Pause className="w-5 h-5 text-foreground stroke-[1.8]" />}
          </button>
          <button onClick={() => newGame()} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <RefreshCw className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <Trophy className={`w-5 h-5 stroke-[1.8] ${showStats ? 'text-primary' : 'text-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Difficulty + Theme rows */}
      <div className="max-w-[400px] mx-auto mb-3 px-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => newGame(d)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${difficulty === d ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {diffLabels[d]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{moves} {isAr ? 'حركة' : 'Züge'}</span>
            <span className="text-sm text-muted-foreground tabular-nums font-medium">{fmt(timer)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {THEMES.map(th => (
            <button key={th.id} onClick={() => newGame(undefined, th)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${themeId === th.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {isAr ? th.ar : th.de}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-[400px] mx-auto mb-3">
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <StatCard value={stats.gamesWon} label={isAr ? 'فوز' : 'Wins'} />
                <StatCard value={stats.bestStreak} label={isAr ? 'سلسلة' : 'Streak'} />
                <StatCard value={stats.bestChain} label={isAr ? 'كومبو' : 'Combo'} />
              </div>
              {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
                <div key={d} className="flex items-center justify-between px-2 text-[11px]">
                  <span className="text-muted-foreground">{diffLabels[d]}</span>
                  <span className="text-foreground tabular-nums">
                    {stats.bestTime[d] ? fmt(stats.bestTime[d]!) : '—'} · {stats.bestScore[d] ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score & chain HUD */}
      <div className="max-w-[400px] mx-auto flex items-center justify-between mb-2 px-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-foreground tabular-nums font-bold text-base">{score}</span>
          {chain >= 2 && <span className="text-amber-400 font-bold">×{chain} {isAr ? 'كومبو' : 'Combo'}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <PowerUpButton icon={Eye} count={powerUps.peek} onClick={usePeek} color="#06b6d4"
            label={isAr ? 'نظرة' : 'Peek'} disabled={!gameStarted || solved} />
          <PowerUpButton icon={ShuffleIcon} count={powerUps.shuffle} onClick={useShuffleU} color="#a855f7"
            label={isAr ? 'خلط' : 'Mix'} disabled={!gameStarted || solved} />
          <PowerUpButton icon={Sparkles} count={powerUps.bomb} onClick={useBomb} color="#f59e0b"
            label={isAr ? 'قنبلة' : 'Bomb'} disabled={!gameStarted || solved} active={bombArmed} />
        </div>
      </div>

      {/* Board */}
      <div className="max-w-[400px] mx-auto relative">
        <div className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, perspective: '900px' }}>
          {cards.map((icon, i) => {
            const isFlipped = peeking || flipped.includes(i) || matched.includes(i);
            const isMatched = matched.includes(i);
            return (
              <button key={i} onClick={() => handleCard(i)} disabled={!gameStarted && !isPaused ? false : false /* keep enabled to allow first tap */}
                className="relative aspect-square">
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.45 }}
                  style={{ transformStyle: 'preserve-3d' }}>
                  {/* back */}
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center border"
                    style={{
                      backfaceVisibility: 'hidden',
                      background: bombArmed ? 'linear-gradient(135deg, #f59e0b40, #f59e0b18)' : 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))',
                      borderColor: bombArmed ? '#f59e0b66' : 'hsl(var(--primary) / 0.18)',
                    }}>
                    <div className="text-primary/40 text-2xl">?</div>
                  </div>
                  {/* front */}
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center border"
                    style={{
                      transform: 'rotateY(180deg)', backfaceVisibility: 'hidden',
                      background: isMatched ? 'hsl(var(--primary) / 0.18)' : 'hsl(var(--secondary))',
                      borderColor: isMatched ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border))',
                    }}>
                    <span className={`text-${cols >= 6 ? '2xl' : '3xl'}`}>{icon}</span>
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {isPaused && gameStarted && !solved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <button onClick={() => setIsPaused(false)} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black">
                <Play className="w-4 h-4 inline mr-1.5" />{isAr ? 'استئناف' : 'Fortsetzen'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Solved screen */}
      <AnimatePresence>
        {solved && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-[400px] mx-auto mt-5 text-center p-5 rounded-2xl border border-primary/30 bg-primary/5">
            <p className="text-4xl mb-1">🎊</p>
            <p className="text-2xl font-black text-primary mb-1">{isAr ? 'أحسنت!' : 'Geschafft!'}</p>
            <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
              <StatCard value={score} label={isAr ? 'نقطة' : 'Punkte'} />
              <StatCard value={fmt(timer)} label={isAr ? 'الوقت' : 'Zeit'} />
              <StatCard value={`×${bestChainThisGame}`} label={isAr ? 'أعلى كومبو' : 'Combo'} />
            </div>
            <button onClick={() => newGame()} className="px-7 py-2.5 rounded-xl bg-primary text-primary-foreground font-black">
              <RefreshCw className="w-4 h-4 inline mr-1.5" />{isAr ? 'لعبة جديدة' : 'Neues Spiel'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================
function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-background/60">
      <div className="text-lg font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function PowerUpButton({ icon: Icon, count, onClick, color, label, disabled, active }:
  { icon: typeof Eye; count: number; onClick: () => void; color: string; label: string; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled || count <= 0}
      title={`${label} (${count})`}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
      style={{
        background: active ? `${color}30` : `${color}14`,
        border: `1px solid ${active ? color : `${color}40`}`,
        boxShadow: active ? `0 0 12px ${color}80` : undefined,
      }}>
      <Icon className="w-4 h-4" style={{ color }} />
      {count > 0 && (
        <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1 rounded-full"
          style={{ background: color, color: '#fff' }}>{count}</span>
      )}
    </button>
  );
}
