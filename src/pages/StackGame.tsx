import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';
import { Layers, RotateCcw } from 'lucide-react';

const CANVAS_W = 340;
const CANVAS_H = 500;
const INITIAL_BLOCK_W = 120;
const BLOCK_H = 22;
const SPEED_BASE = 2.2;

interface Block { x: number; w: number }

const NEON_COLORS = [
  '#00fff5', '#ff00e4', '#ffe600', '#00ff88', '#ff6b00', '#8b5cf6',
  '#06b6d4', '#f43f5e', '#84cc16', '#f97316',
];

export default function StackGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [perfectCount, setPerfectCount] = useState(0);
  const blocksRef = useRef<Block[]>([]);
  const movingRef = useRef<{ x: number; w: number; dir: number; speed: number }>({ x: 0, w: INITIAL_BLOCK_W, dir: 1, speed: SPEED_BASE });
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const perfectRef = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const blocks = blocksRef.current;
    const offset = Math.max(0, blocks.length * BLOCK_H - CANVAS_H + 120);

    // Draw glow trail
    blocks.forEach((b, i) => {
      const y = CANVAS_H - (i + 1) * BLOCK_H + offset;
      const color = NEON_COLORS[i % NEON_COLORS.length];

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.fillRect(b.x, y, b.w, BLOCK_H - 3);
      ctx.shadowBlur = 0;

      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(b.x, y, b.w, 3);
    });

    // Moving block
    const m = movingRef.current;
    const my = CANVAS_H - (blocks.length + 1) * BLOCK_H + offset;
    const mColor = NEON_COLORS[blocks.length % NEON_COLORS.length];
    ctx.shadowColor = mColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = mColor;
    ctx.fillRect(m.x, my, m.w, BLOCK_H - 3);
    ctx.shadowBlur = 0;
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
    blocksRef.current = [{ x: (CANVAS_W - INITIAL_BLOCK_W) / 2, w: INITIAL_BLOCK_W }];
    movingRef.current = { x: 0, w: INITIAL_BLOCK_W, dir: 1, speed: SPEED_BASE };
    scoreRef.current = 0;
    perfectRef.current = 0;
    setScore(0);
    setPerfectCount(0);
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
    let overlapW = overlapEnd - overlapStart;

    if (overlapW <= 0) {
      setGameOver(true);
      draw();
      const stats = JSON.parse(localStorage.getItem('stack-stats') || '{}');
      stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
      stats.bestScore = Math.max(stats.bestScore || 0, scoreRef.current);
      localStorage.setItem('stack-stats', JSON.stringify(stats));
      return;
    }

    // Perfect placement bonus
    const isPerfect = Math.abs(m.x - last.x) < 3;
    if (isPerfect) {
      overlapW = last.w; // Keep full width on perfect
      perfectRef.current++;
      setPerfectCount(perfectRef.current);
    }

    blocks.push({ x: overlapStart, w: isPerfect ? last.w : overlapW });
    scoreRef.current++;
    setScore(scoreRef.current);

    const newSpeed = SPEED_BASE + scoreRef.current * 0.35;
    movingRef.current = { x: 0, w: isPerfect ? last.w : overlapW, dir: 1, speed: newSpeed };
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, started, draw, gameLoop]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ background: 'linear-gradient(180deg, #000 0%, #0a001a 50%, #000 100%)' }}>
      <div className="px-5">
        <BackButton to="/games" />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mt-4 mb-4">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
            {isAr ? '📦 التكديس' : '📦 Stapeln'}
          </h1>
          <div className="flex items-center gap-3">
            {perfectCount > 0 && (
              <motion.span key={perfectCount} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-xs text-cyan-400 font-bold">
                ✨ {perfectCount}
              </motion.span>
            )}
            <span className="text-2xl font-black text-white">{score}</span>
          </div>
        </motion.div>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={started && !gameOver ? place : start}
            className="rounded-2xl cursor-pointer border border-white/5"
            style={{ maxWidth: '100%', touchAction: 'manipulation', background: 'rgba(0,0,0,0.5)' }}
          />
        </div>

        {!started && (
          <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="text-center text-cyan-400/60 text-sm">
            {isAr ? 'اضغط للبدء' : 'Tippen zum Starten'}
          </motion.p>
        )}

        {gameOver && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-4">
            <p className="text-3xl font-black text-white mb-1">{score}</p>
            <p className="text-zinc-500 text-sm mb-4">{perfectCount > 0 ? `✨ ${perfectCount} ${isAr ? 'مثالي' : 'Perfekt'}` : ''}</p>
            <motion.button whileTap={{ scale: 0.9 }} onClick={start}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-black mx-auto"
              style={{ background: 'linear-gradient(135deg, #00fff5, #8b5cf6)' }}
            >
              <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
