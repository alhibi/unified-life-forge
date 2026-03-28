import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Clock, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'easy' | 'medium' | 'hard';

const ICONS = ['🍎','🍊','🍋','🍇','🍓','🍒','🥝','🍑','🌸','🌻','🦋','🐱','🐶','🎸','🎨','⚽','🚀','💎'];

interface MemoryStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  currentStreak: number;
  bestStreak: number;
}

function loadStats(): MemoryStats {
  const s = localStorage.getItem('memory-stats');
  return s ? JSON.parse(s) : { gamesPlayed: 0, gamesWon: 0, bestTime: { easy: null, medium: null, hard: null }, currentStreak: 0, bestStreak: 0 };
}
function saveStats(s: MemoryStats) { localStorage.setItem('memory-stats', JSON.stringify(s)); }

interface SavedGame {
  difficulty: Difficulty;
  cards: string[];
  flipped: number[];
  matched: number[];
  moves: number;
  timer: number;
  gameStarted: boolean;
}
function saveGame(g: SavedGame) { localStorage.setItem('memory-game-state', JSON.stringify(g)); }
function loadGame(): SavedGame | null {
  const s = localStorage.getItem('memory-game-state');
  return s ? JSON.parse(s) : null;
}
function clearGame() { localStorage.removeItem('memory-game-state'); }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function createCards(diff: Difficulty): string[] {
  const pairCount = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 12;
  const selected = shuffle(ICONS).slice(0, pairCount);
  return shuffle([...selected, ...selected]);
}

export default function MemoryGame() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();
  const saved = useMemo(() => loadGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [cards, setCards] = useState<string[]>(saved?.cards || () => createCards('easy'));
  const [flipped, setFlipped] = useState<number[]>(saved?.flipped || []);
  const [matched, setMatched] = useState<number[]>(saved?.matched || []);
  const [moves, setMoves] = useState(saved?.moves || 0);
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<MemoryStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [solved, setSolved] = useState(false);

  const cols = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 4;

  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  useEffect(() => {
    if (solved) { clearGame(); return; }
    if (gameStarted) {
      saveGame({ difficulty, cards, flipped, matched, moves, timer, gameStarted });
    }
  }, [cards, flipped, matched, moves, timer, gameStarted, solved, difficulty]);

  useEffect(() => {
    if (matched.length > 0 && matched.length === cards.length) {
      setSolved(true);
      setIsRunning(false);
      const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, gamesWon: stats.gamesWon + 1 };
      s.currentStreak++;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
      setStats(s);
      saveStats(s);
    }
  }, [matched]);

  const handleCard = useCallback((index: number) => {
    if (isPaused || checking || solved || flipped.includes(index) || matched.includes(index)) return;
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setTimeout(() => {
          setMatched(m => [...m, newFlipped[0], newFlipped[1]]);
          setFlipped([]);
          setChecking(false);
        }, 400);
      } else {
        setTimeout(() => { setFlipped([]); setChecking(false); }, 800);
      }
    }
  }, [flipped, matched, checking, isPaused, solved, cards, gameStarted]);

  const newGame = (diff: Difficulty) => {
    clearGame();
    setDifficulty(diff);
    setCards(createCards(diff));
    setFlipped([]); setMatched([]); setMoves(0); setTimer(0);
    setIsRunning(false); setGameStarted(false); setIsPaused(false);
    setSolved(false); setChecking(false);
  };

  const startGame = () => { setGameStarted(true); setIsRunning(true); setIsPaused(false); };
  const togglePause = () => {
    if (!gameStarted) { startGame(); return; }
    setIsPaused(!isPaused);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const diffLabels: Record<Difficulty, string> = {
    easy: language === 'ar' ? 'سهل' : 'Easy',
    medium: language === 'ar' ? 'متوسط' : 'Medium',
    hard: language === 'ar' ? 'صعب' : 'Hard',
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[360px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{language === 'ar' ? 'أزواج الذاكرة' : 'Memory Pairs'}</h1>
        <div className="flex gap-1">
          <button onClick={togglePause} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {isPaused || !gameStarted ? <Play className="w-5 h-5 text-foreground stroke-[1.8]" /> : <Pause className="w-5 h-5 text-foreground stroke-[1.8]" />}
          </button>
          <button onClick={() => newGame(difficulty)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <RefreshCw className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <Trophy className={`w-5 h-5 stroke-[1.8] ${showStats ? 'text-primary' : 'text-foreground'}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between max-w-[360px] mx-auto mb-3 px-1">
        <div className="flex gap-1.5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => newGame(d)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${difficulty === d ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >{diffLabels[d]}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{language === 'ar' ? 'محاولات' : 'Moves'}: {moves}</span>
          <span className="text-sm text-muted-foreground tabular-nums font-medium">{fmt(timer)}</span>
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-[360px] mx-auto mb-3">
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl bg-background/60">
                  <div className="text-lg font-bold text-foreground">{stats.gamesWon}</div>
                  <div className="text-[10px] text-muted-foreground">{language === 'ar' ? 'فوز' : 'Wins'}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/60">
                  <div className="text-lg font-bold text-foreground">{stats.bestStreak}</div>
                  <div className="text-[10px] text-muted-foreground">{language === 'ar' ? 'سلسلة' : 'Streak'}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/60">
                  <div className="text-lg font-bold text-foreground">{stats.gamesPlayed}</div>
                  <div className="text-[10px] text-muted-foreground">{language === 'ar' ? 'لعبت' : 'Played'}</div>
                </div>
              </div>
              {(['easy','medium','hard'] as Difficulty[]).map(d => (
                <div key={d} className="flex items-center justify-between px-2 text-[11px]">
                  <span className="text-muted-foreground">{diffLabels[d]}</span>
                  <span className="text-foreground tabular-nums">{language === 'ar' ? 'أفضل' : 'Best'}: {stats.bestTime[d] ? fmt(stats.bestTime[d]!) : '—'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{language === 'ar' ? 'أحسنت!' : 'Well done!'}</span>
          <span className="text-primary/70 text-sm font-medium">{fmt(timer)}</span>
        </motion.div>
      )}

      <div className="max-w-[360px] mx-auto relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !solved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}>
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {!gameStarted ? (language === 'ar' ? 'اضغط للبدء' : 'Tap to start') : (language === 'ar' ? 'اضغط للمتابعة' : 'Tap to continue')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {cards.map((icon, i) => {
            const isFlipped = flipped.includes(i) || matched.includes(i);
            const isMatched = matched.includes(i);
            return (
              <motion.button
                key={i}
                onClick={() => handleCard(i)}
                whileTap={{ scale: 0.95 }}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 select-none
                  ${isMatched ? 'bg-primary/15 border-2 border-primary/30' : isFlipped ? 'bg-secondary border-2 border-primary/40' : 'bg-secondary/70 border-2 border-border/30 hover:border-primary/20'}
                `}
              >
                <motion.span
                  initial={false}
                  animate={{ rotateY: isFlipped ? 0 : 180, opacity: isFlipped ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isFlipped ? icon : ''}
                </motion.span>
                {!isFlipped && <span className="text-muted-foreground/30 text-lg">?</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
