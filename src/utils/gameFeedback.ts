// Shared sound + haptics for the games section.
// Web Audio API tones (no audio files), with a single mute toggle persisted in
// localStorage and an event so any open game updates in real time.

export type SfxName =
  | 'click'
  | 'tap'
  | 'flip'
  | 'match'
  | 'pickup'
  | 'rotate'
  | 'place'
  | 'reveal'
  | 'flag'
  | 'mine'
  | 'win'
  | 'lose'
  | 'tick'
  | 'wrong'
  | 'hint'
  | 'capture'
  | 'check'
  | 'move'
  | 'castle'
  | 'level'
  | 'streak';

interface ToneStep { freq: number; dur: number; type?: OscillatorType; gain?: number; sweepTo?: number }

const PRESETS: Record<SfxName, ToneStep[]> = {
  click:   [{ freq: 660, dur: 0.04, type: 'square', gain: 0.06 }],
  tap:     [{ freq: 880, dur: 0.05, type: 'triangle', gain: 0.08 }],
  flip:    [{ freq: 520, dur: 0.06, type: 'sine', gain: 0.07 }, { freq: 720, dur: 0.07, type: 'sine', gain: 0.07 }],
  match:   [{ freq: 660, dur: 0.07, type: 'triangle', gain: 0.1 }, { freq: 990, dur: 0.12, type: 'triangle', gain: 0.1 }],
  pickup:  [{ freq: 540, dur: 0.05, type: 'square', gain: 0.07 }, { freq: 760, dur: 0.05, type: 'square', gain: 0.07 }],
  rotate:  [{ freq: 420, dur: 0.04, type: 'square', gain: 0.06 }, { freq: 560, dur: 0.04, type: 'square', gain: 0.06 }],
  place:   [{ freq: 320, dur: 0.07, type: 'sine', gain: 0.09 }],
  reveal:  [{ freq: 720, dur: 0.04, type: 'triangle', gain: 0.07 }],
  flag:    [{ freq: 880, dur: 0.05, type: 'square', gain: 0.06 }, { freq: 660, dur: 0.04, type: 'square', gain: 0.05 }],
  mine:    [{ freq: 180, dur: 0.4, type: 'sawtooth', gain: 0.15, sweepTo: 60 }],
  win:     [
    { freq: 523, dur: 0.12, type: 'triangle', gain: 0.1 },
    { freq: 659, dur: 0.12, type: 'triangle', gain: 0.1 },
    { freq: 784, dur: 0.16, type: 'triangle', gain: 0.11 },
    { freq: 1046, dur: 0.24, type: 'triangle', gain: 0.12 },
  ],
  lose:    [
    { freq: 440, dur: 0.18, type: 'sawtooth', gain: 0.1 },
    { freq: 330, dur: 0.18, type: 'sawtooth', gain: 0.1 },
    { freq: 220, dur: 0.3, type: 'sawtooth', gain: 0.1 },
  ],
  tick:    [{ freq: 1200, dur: 0.025, type: 'square', gain: 0.05 }],
  wrong:   [{ freq: 240, dur: 0.18, type: 'sawtooth', gain: 0.1, sweepTo: 160 }],
  hint:    [{ freq: 980, dur: 0.05, type: 'sine', gain: 0.08 }, { freq: 1320, dur: 0.07, type: 'sine', gain: 0.08 }],
  capture: [{ freq: 320, dur: 0.06, type: 'square', gain: 0.1 }, { freq: 220, dur: 0.1, type: 'sawtooth', gain: 0.1 }],
  check:   [{ freq: 660, dur: 0.07, type: 'square', gain: 0.1 }, { freq: 990, dur: 0.07, type: 'square', gain: 0.1 }, { freq: 660, dur: 0.07, type: 'square', gain: 0.1 }],
  move:    [{ freq: 520, dur: 0.05, type: 'triangle', gain: 0.08 }],
  castle:  [{ freq: 440, dur: 0.06, type: 'square', gain: 0.09 }, { freq: 660, dur: 0.06, type: 'square', gain: 0.09 }],
  level:   [
    { freq: 660, dur: 0.08, type: 'triangle', gain: 0.1 },
    { freq: 880, dur: 0.08, type: 'triangle', gain: 0.1 },
    { freq: 1320, dur: 0.18, type: 'triangle', gain: 0.11 },
  ],
  streak:  [{ freq: 1320, dur: 0.06, type: 'triangle', gain: 0.09 }, { freq: 1760, dur: 0.1, type: 'triangle', gain: 0.09 }],
};

const KEY_MUTE = 'games-mute';
const KEY_VIBRATE = 'games-vibrate';

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended' && unlocked) void ctx.resume().catch(() => undefined);
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    const c = getCtx();
    if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY_MUTE) === '1';
}

export function setMuted(value: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_MUTE, value ? '1' : '0');
  window.dispatchEvent(new CustomEvent('games-mute-change', { detail: value }));
}

export function isHapticsOff(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY_VIBRATE) === '0';
}

export function setHapticsOff(value: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_VIBRATE, value ? '0' : '1');
  window.dispatchEvent(new CustomEvent('games-haptics-change', { detail: value }));
}

export function playSfx(name: SfxName) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const steps = PRESETS[name];
  let t = c.currentTime;
  for (const step of steps) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = step.type ?? 'sine';
    osc.frequency.setValueAtTime(step.freq, t);
    if (step.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, step.sweepTo), t + step.dur);
    }
    const peak = step.gain ?? 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + step.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + step.dur + 0.02);
    t += step.dur * 0.85;
  }
}

export function vibrate(pattern: number | number[]) {
  if (isHapticsOff()) return;
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}
