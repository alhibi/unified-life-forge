/**
 * Premium rest timer.
 *
 * Differs from the in-line mini-timer:
 *   • Big, full-width display when active
 *   • Vibration + audio + visual flash on completion
 *   • Tap a preset (60/90/120/180s) or scrub the dial
 *   • Auto-starts when invoked from a finished set
 */

import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

import { Pause, Play, Plus, RotateCcw, Volume2, VolumeX, X } from '@/lib/icons';

export interface RestTimerProps {
  /** Seconds to count down from. */
  defaultSec: number;
  /** Auto-start on mount? */
  autoStart?: boolean;
  /** Notify the parent when the timer hits 0. */
  onComplete?: () => void;
  /** Close button. */
  onClose?: () => void;
  /** Compact variant — single small chip. */
  compact?: boolean;
  lang: 'ar';
}

const PRESETS = [60, 90, 120, 180, 240];

const T = {
  rest: { ar: 'راحة', },
  done: { ar: 'انتهت!', },
  resume: { ar: 'استئناف', },
  pause: { ar: 'إيقاف', },
  reset: { ar: 'إعادة', },
  add: { ar: '+30', },
};

function fmtMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ────────────────── Beep generator (no asset needed) ────────────────── */

function beep(durationMs = 200, freq = 880): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
  } catch { /* ignore */ }
}

function vibrate(pattern: number | number[] = [200, 80, 200]): void {
  if (typeof navigator === 'undefined') return;
  if ('vibrate' in navigator) navigator.vibrate?.(pattern);
}

/* ────────────────── Compact in-line variant ────────────────── */

function CompactTimer({ defaultSec, lang, onComplete }: { defaultSec: number; lang: 'ar'; onComplete?: () => void }) {
  const [secLeft, setSecLeft] = useState(defaultSec);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          vibrate(100);
          beep();
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, onComplete]);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-2 py-1">
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
        aria-label={running ? T.pause[lang] : T.resume[lang]}
      >
        {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
      <span className="text-[0.75rem] font-bold tabular-nums" dir="ltr">
        {fmtMmSs(secLeft)}
      </span>
      <button
        type="button"
        onClick={() => { setSecLeft(defaultSec); setRunning(false); }}
        className="text-muted-foreground"
        aria-label={T.reset[lang]}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ────────────────── Full-screen variant ────────────────── */

export default function RestTimer(props: RestTimerProps) {
  if (props.compact) {
    return <CompactTimer defaultSec={props.defaultSec} lang={props.lang} onComplete={props.onComplete} />;
  }
  return <FullTimer {...props} />;
}

function FullTimer({ defaultSec, autoStart = true, onComplete, onClose, lang }: RestTimerProps) {
  const [target, setTarget] = useState(defaultSec);
  const [secLeft, setSecLeft] = useState(defaultSec);
  const [running, setRunning] = useState(autoStart);
  const [muted, setMuted] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    setTarget(defaultSec);
    setSecLeft(defaultSec);
    finishedRef.current = false;
  }, [defaultSec]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          if (!finishedRef.current) {
            finishedRef.current = true;
            if (!muted) beep(300, 880);
            vibrate([200, 80, 200]);
            onComplete?.();
          }
          setRunning(false);
          return 0;
        }
        // Beep at 3, 2, 1 seconds
        if (s <= 4 && !muted) beep(60, 660);
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, muted, onComplete]);

  const pct = Math.max(0, Math.min(1, secLeft / target));
  const radius = 110;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - pct);
  const isFinished = secLeft === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-sheet bg-black/85 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-sm px-6"
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-0 end-0 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center"
              aria-label="close"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute top-0 start-0 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center"
            aria-label="mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="text-center pt-12">
            <p className="text-white/60 text-[0.75rem] uppercase tracking-[0.2em] font-semibold mb-2">
              {isFinished ? T.done[lang] : T.rest[lang]}
            </p>
            <div className="relative inline-flex items-center justify-center">
              <svg width={260} height={260} className="-rotate-90">
                <circle
                  cx={130} cy={130} r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={10}
                />
                <motion.circle
                  cx={130} cy={130} r={radius}
                  fill="none"
                  stroke={isFinished ? '#10b981' : '#0ea5e9'}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[4.25rem] font-bold tabular-nums text-white leading-none" dir="ltr">
                  {fmtMmSs(secLeft)}
                </div>
                <div className="text-[0.6875rem] text-white/40 mt-2 tabular-nums" dir="ltr">
                  / {fmtMmSs(target)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              onClick={() => { setSecLeft(target); setRunning(false); finishedRef.current = false; }}
              className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95"
              aria-label={T.reset[lang]}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setRunning((r) => !r); finishedRef.current = false; }}
              disabled={isFinished}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 disabled:opacity-40"
              aria-label={running ? T.pause[lang] : T.resume[lang]}
            >
              {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ms-1" />}
            </button>
            <button
              onClick={() => { setSecLeft((s) => s + 30); setTarget((t) => t + 30); finishedRef.current = false; }}
              className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95"
              aria-label={T.add[lang]}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setTarget(p); setSecLeft(p); finishedRef.current = false; }}
                className={`px-3 py-1.5 rounded-full text-[0.6875rem] font-semibold transition-colors ${
                  target === p ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70'
                }`}
              >
                {fmtMmSs(p)}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
