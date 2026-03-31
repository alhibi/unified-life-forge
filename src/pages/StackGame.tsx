import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';
import { Layers, RotateCcw, Trophy } from 'lucide-react';

const CANVAS_W = 320;
const CANVAS_H = 480;
const INITIAL_BLOCK_W = 100;
const BLOCK_H = 24;
const SPEED_BASE = 2;

interface Block { x: number; w: number; color: string }

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.85)',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.55)',
];

export default function StackGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const blocksRef = useRef<Block[]>([]);
  const movingRef = useRef<{ x: number; w: number; dir: number; speed: number }>({ x: 0, w: INITIAL_BLOCK_W, dir: 1, speed: SPEED_BASE });
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw placed blocks
    const blocks = blocksRef.current;
    const offset = Math.max(0, blocks.length * BLOCK_H - CANVAS_H + 100);
    blocks.forEach((b, i) => {
      const y = CANVAS_H - (i + 1) * BLOCK_H + offset;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, y, b.w, BLOCK_H - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(b.x, y, b.w, BLOCK_H - 2);
    });

    // Draw moving block
    const m = movingRef.current;
    const my = CANVAS_H - (blocks.length + 1) * BLOCK_H + offset;
    ctx.fillStyle = COLORS[blocks.length % COLORS.length];
    ctx.fillRect(m.x, my, m.w, BLOCK_H - 2);
  }, []);

  const gameLoop = useCallback(() => {
    const m = movingRef.current;
    m.x += m.dir * m.speed;
    if (m.x + m.w > CANVAS_W) { m.x = CANVAS_W - m.w; m.dir = -1; }
    if (m.x < 0) { m.x = 0; m.dir = 1; }
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  const start = useCallback(() => {
    blocksRef.current = [{ x: (CANVAS_W - INITIAL_BLOCK_W) / 2, w: INITIAL_BLOCK_W, color: COLORS[0] }];
    movingRef.current = { x: 0, w: INITIAL_BLOCK_W, dir: 1, speed: SPEED_BASE };
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setStarted(true);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const place = useCallback(() => {
    if (gameOver || !started) return;
    cancelAnimationFrame(animRef.current);

    const blocks = blocksRef.current;
    const m = movingRef.current;
    const last = blocks[blocks.length - 1];

    const overlapStart = Math.max(m.x, last.x);
    const overlapEnd = Math.min(m.x + m.w, last.x + last.w);
    const overlapW = overlapEnd - overlapStart;

    if (overlapW <= 0) {
      setGameOver(true);
      draw();
      const stats = JSON.parse(localStorage.getItem('stack-stats') || '{}');
      stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
      stats.bestScore = Math.max(stats.bestScore || 0, scoreRef.current);
      localStorage.setItem('stack-stats', JSON.stringify(stats));
      return;
    }

    const newBlock: Block = { x: overlapStart, w: overlapW, color: COLORS[blocks.length % COLORS.length] };
    blocks.push(newBlock);
    scoreRef.current++;
    setScore(scoreRef.current);

    const newSpeed = SPEED_BASE + scoreRef.current * 0.3;
    movingRef.current = { x: 0, w: overlapW, dir: 1, speed: newSpeed };
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, started, draw, gameLoop]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    // Initial draw
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-28 pt-4">
      <div className="px-5">
        <BackButton to="/games" label={isAr ? 'الألعاب' : 'Spiele'} />
        <div className="flex items-center gap-3 mt-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'التكديس' : 'Stapeln'}</h1>
          <span className="ms-auto text-lg font-bold text-primary">{score}</span>
        </div>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={started && !gameOver ? place : start}
            className="rounded-2xl bg-card border border-border/40 cursor-pointer"
            style={{ maxWidth: '100%', touchAction: 'manipulation' }}
          />
        </div>

        {!started && (
          <p className="text-center text-muted-foreground text-sm">{isAr ? 'اضغط للبدء' : 'Tippen zum Starten'}</p>
        )}

        {gameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <p className="text-xl font-bold text-foreground mb-2">{isAr ? `النتيجة: ${score}` : `Ergebnis: ${score}`}</p>
            <button onClick={start} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold mx-auto active:scale-95 transition-transform">
              <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
