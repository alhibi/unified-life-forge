import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Lightbulb, CheckCircle, Clock } from 'lucide-react';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

function generateSolvedBoard(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(board: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const sr = Math.floor(row / 3) * 3, sc = Math.floor(col / 3) * 3;
    for (let i = sr; i < sr + 3; i++)
      for (let j = sc; j < sc + 3; j++)
        if (board[i][j] === num) return false;
    return true;
  }

  function solve(board: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const n of nums) {
            if (isValid(board, r, c, n)) {
              board[r][c] = n;
              if (solve(board)) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solve(board);
  return board;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPuzzle(difficulty: Difficulty): { puzzle: Board; solution: number[][] } {
  const solution = generateSolvedBoard();
  const puzzle: Board = solution.map(r => [...r]);
  const removals = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 55;
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  for (let i = 0; i < removals && i < cells.length; i++) {
    const r = Math.floor(cells[i] / 9);
    const c = cells[i] % 9;
    puzzle[r][c] = null;
  }
  return { puzzle, solution };
}

export default function SudokuPage() {
  const { t } = useApp();
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
    setSelected(null);
    setErrors(new Set());
    setSolved(false);
    setTimer(0);
    setIsRunning(true);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setNoteMode(false);
  };

  const handleCellClick = (r: number, c: number) => {
    if (original.has(`${r}-${c}`)) return;
    setSelected([r, c]);
  };

  const handleNumberInput = (num: number) => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;

    if (noteMode) {
      const newNotes = notes.map(row => row.map(s => new Set(s)));
      const key = num.toString();
      if (newNotes[r][c].has(key)) newNotes[r][c].delete(key);
      else newNotes[r][c].add(key);
      setNotes(newNotes);
      return;
    }

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    // Check errors
    const newErrors = new Set<string>();
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (newBoard[i][j] !== null && newBoard[i][j] !== gameData.solution[i][j]) {
          newErrors.add(`${i}-${j}`);
        }
      }
    }
    setErrors(newErrors);

    // Check solved
    if (newErrors.size === 0) {
      const isFull = newBoard.every(row => row.every(cell => cell !== null));
      if (isFull) { setSolved(true); setIsRunning(false); }
    }
  };

  const handleErase = () => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = null;
    setBoard(newBoard);
    errors.delete(`${r}-${c}`);
    setErrors(new Set(errors));
  };

  const handleHint = () => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = gameData.solution[r][c];
    setBoard(newBoard);
    errors.delete(`${r}-${c}`);
    setErrors(new Set(errors));
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getHighlightClass = (r: number, c: number) => {
    if (!selected) return '';
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'ring-2 ring-primary bg-primary/20';
    if (r === sr || c === sc) return 'bg-primary/5';
    if (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)) return 'bg-primary/5';
    if (board[r][c] !== null && board[sr][sc] !== null && board[r][c] === board[sr][sc]) return 'bg-primary/10';
    return '';
  };

  return (
    <div className="min-h-screen bg-background pb-24 px-3 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/games')} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-display font-bold text-foreground flex-1">{t('games.sudoku')}</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4" />
          {formatTimer(timer)}
        </div>
      </div>

      {/* Difficulty */}
      <div className="flex gap-2 mb-4 justify-center">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => newGame(d)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              difficulty === d ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {t(`sudoku.${d}`)}
          </button>
        ))}
      </div>

      {solved && (
        <div className="text-center py-3 mb-3 rounded-xl bg-primary/10 text-primary font-bold animate-scale-in">
          {t('sudoku.solved')}
        </div>
      )}

      {/* Board */}
      <div className="max-w-sm mx-auto mb-4">
        <div className="glass-card-elevated p-2">
          <div className="grid grid-cols-9 gap-0">
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const isOrig = original.has(`${ri}-${ci}`);
                const hasError = errors.has(`${ri}-${ci}`);
                const cellNotes = notes[ri][ci];
                return (
                  <button
                    key={`${ri}-${ci}`}
                    onClick={() => handleCellClick(ri, ci)}
                    className={`
                      aspect-square flex items-center justify-center text-sm font-semibold relative
                      transition-colors duration-100
                      ${ci % 3 === 2 && ci !== 8 ? 'border-e-2 border-e-primary/30' : 'border-e border-e-border'}
                      ${ri % 3 === 2 && ri !== 8 ? 'border-b-2 border-b-primary/30' : 'border-b border-b-border'}
                      ${isOrig ? 'text-foreground font-bold' : hasError ? 'text-destructive' : 'text-primary'}
                      ${getHighlightClass(ri, ci)}
                      ${!isOrig && !solved ? 'cursor-pointer hover:bg-primary/10' : ''}
                    `}
                  >
                    {cell !== null ? (
                      cell
                    ) : cellNotes.size > 0 ? (
                      <div className="grid grid-cols-3 gap-0 text-[6px] text-muted-foreground leading-none w-full h-full p-0.5">
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                          <span key={n} className="flex items-center justify-center">
                            {cellNotes.has(n.toString()) ? n : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Number pad */}
      <div className="max-w-sm mx-auto space-y-2">
        <div className="grid grid-cols-9 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => handleNumberInput(n)}
              className="aspect-square rounded-xl bg-secondary text-secondary-foreground font-bold text-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={handleErase} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80">
            ✕ {t('sudoku.reset')}
          </button>
          <button
            onClick={() => setNoteMode(!noteMode)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              noteMode ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            ✏️ Notes
          </button>
          <button onClick={handleHint} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80">
            <Lightbulb className="w-4 h-4 inline-block me-1" />{t('sudoku.hint')}
          </button>
        </div>
        <div className="flex justify-center">
          <button onClick={() => newGame(difficulty)} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium">
            <RefreshCw className="w-4 h-4 inline-block me-1" />{t('sudoku.new')}
          </button>
        </div>
      </div>
    </div>
  );
}
