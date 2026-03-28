import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Lightbulb, Clock, Eraser, PenLine } from 'lucide-react';
import { motion } from 'framer-motion';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

function generateSolvedBoard(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  function isValid(b: number[][], r: number, c: number, n: number) {
    for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) return false;
    const sr = Math.floor(r / 3) * 3, sc = Math.floor(c / 3) * 3;
    for (let i = sr; i < sr + 3; i++) for (let j = sc; j < sc + 3; j++) if (b[i][j] === n) return false;
    return true;
  }
  function solve(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (const n of nums) { if (isValid(b, r, c, n)) { b[r][c] = n; if (solve(b)) return true; b[r][c] = 0; } }
        return false;
      }
    }
    return true;
  }
  solve(board);
  return board;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function createPuzzle(difficulty: Difficulty) {
  const solution = generateSolvedBoard();
  const puzzle: Board = solution.map(r => [...r]);
  const removals = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 55;
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  for (let i = 0; i < removals && i < cells.length; i++) {
    puzzle[Math.floor(cells[i] / 9)][cells[i] % 9] = null;
  }
  return { puzzle, solution };
}

export default function SudokuPage() {
  const { t, dir } = useApp();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameData, setGameData] = useState(() => createPuzzle('easy'));
  const [board, setBoard] = useState<Board>(() => gameData.puzzle.map(r => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [notes, setNotes] = useState<Set<string>[][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>()))
  );
  const [noteMode, setNoteMode] = useState(false);

  const original = useMemo(() => {
    const s = new Set<string>();
    gameData.puzzle.forEach((r, ri) => r.forEach((v, ci) => { if (v !== null) s.add(`${ri}-${ci}`); }));
    return s;
  }, [gameData]);

  useEffect(() => {
    if (!isRunning || solved) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved]);

  const newGame = (diff: Difficulty) => {
    setDifficulty(diff);
    const data = createPuzzle(diff);
    setGameData(data);
    setBoard(data.puzzle.map(r => [...r]));
    setSelected(null); setErrors(new Set()); setSolved(false); setTimer(0); setIsRunning(true);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setNoteMode(false);
  };

  const handleCellClick = (r: number, c: number) => { if (!original.has(`${r}-${c}`)) setSelected([r, c]); };

  const handleNumberInput = (num: number) => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    if (noteMode) {
      const nn = notes.map(row => row.map(s => new Set(s)));
      const k = num.toString();
      if (nn[r][c].has(k)) nn[r][c].delete(k); else nn[r][c].add(k);
      setNotes(nn); return;
    }
    const nb = board.map(row => [...row]);
    nb[r][c] = num;
    setBoard(nb);
    const ne = new Set<string>();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++)
      if (nb[i][j] !== null && nb[i][j] !== gameData.solution[i][j]) ne.add(`${i}-${j}`);
    setErrors(ne);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) { setSolved(true); setIsRunning(false); }
  };

  const handleErase = () => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    const nb = board.map(row => [...row]); nb[r][c] = null; setBoard(nb);
    errors.delete(`${r}-${c}`); setErrors(new Set(errors));
  };

  const handleHint = () => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    const nb = board.map(row => [...row]); nb[r][c] = gameData.solution[r][c]; setBoard(nb);
    errors.delete(`${r}-${c}`); setErrors(new Set(errors));
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getHighlight = (r: number, c: number) => {
    if (!selected) return '';
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'ring-2 ring-primary bg-primary/15';
    if (r === sr || c === sc) return 'bg-primary/5';
    if (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)) return 'bg-primary/5';
    if (board[r][c] !== null && board[sr][sc] !== null && board[r][c] === board[sr][sc]) return 'bg-primary/8';
    return '';
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 max-w-sm mx-auto">
        <button onClick={() => navigate('/games')} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className={`w-4 h-4 text-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">{t('games.sudoku')}</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-full tabular-nums">
          <Clock className="w-3.5 h-3.5" />{formatTimer(timer)}
        </div>
      </div>

      {/* Difficulty */}
      <div className="flex gap-2 mb-4 justify-center">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button key={d} onClick={() => newGame(d)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              difficulty === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >{t(`sudoku.${d}`)}</button>
        ))}
      </div>

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/10 text-primary font-bold max-w-sm mx-auto">
          {t('sudoku.solved')}
        </motion.div>
      )}

      {/* Board */}
      <div className="max-w-[340px] mx-auto mb-5">
        <div className="premium-card-intense p-2">
          <div className="grid grid-cols-9">
            {board.map((row, ri) => row.map((cell, ci) => {
              const isOrig = original.has(`${ri}-${ci}`);
              const hasError = errors.has(`${ri}-${ci}`);
              const cellNotes = notes[ri][ci];
              return (
                <button key={`${ri}-${ci}`} onClick={() => handleCellClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center text-[14px] font-semibold relative transition-colors
                    ${ci % 3 === 2 && ci !== 8 ? 'border-e-2 border-e-primary/20' : 'border-e border-e-border/50'}
                    ${ri % 3 === 2 && ri !== 8 ? 'border-b-2 border-b-primary/20' : 'border-b border-b-border/50'}
                    ${isOrig ? 'text-foreground font-bold' : hasError ? 'text-destructive' : 'text-primary'}
                    ${getHighlight(ri, ci)}
                    ${!isOrig && !solved ? 'cursor-pointer' : ''}
                  `}
                >
                  {cell !== null ? cell : cellNotes.size > 0 ? (
                    <div className="grid grid-cols-3 gap-0 text-[5px] text-muted-foreground leading-none w-full h-full p-0.5">
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <span key={n} className="flex items-center justify-center">{cellNotes.has(n.toString()) ? n : ''}</span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-[340px] mx-auto space-y-3">
        <div className="grid grid-cols-9 gap-1.5">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handleNumberInput(n)}
              className="aspect-square rounded-xl bg-secondary text-secondary-foreground font-bold text-base hover:bg-primary hover:text-primary-foreground active:scale-90 transition-all">
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={handleErase} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
            <Eraser className="w-4 h-4" />{t('sudoku.reset')}
          </button>
          <button onClick={() => setNoteMode(!noteMode)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              noteMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          ><PenLine className="w-4 h-4" />Notes</button>
          <button onClick={handleHint} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
            <Lightbulb className="w-4 h-4" />{t('sudoku.hint')}
          </button>
        </div>
        <div className="flex justify-center">
          <button onClick={() => newGame(difficulty)} className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform">
            <RefreshCw className="w-4 h-4" />{t('sudoku.new')}
          </button>
        </div>
      </div>
    </div>
  );
}
