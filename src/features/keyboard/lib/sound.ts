/**
 * Synthesized key-press sounds for the in-app keyboard.
 *
 * No audio assets: every tone is generated on demand through a single shared
 * AudioContext and a single master gain node. Long typing sessions used to
 * create an oscillator + gain pair per keystroke and never disconnect them,
 * which leaked graph nodes on Android WebView; each voice now disconnects
 * itself on `ended`, and the context is suspended whenever the keyboard hides.
 */

import type { SoundTone } from './preference';

export type KeySoundType = 'letter' | 'modifier' | 'accent' | 'space';

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let suspendTimer: number | null = null;
/** Guards against machine-gun retriggering when a key repeats very fast. */
let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 18;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioCtxClass();
      master = audioCtx.createGain();
      master.gain.value = 1;
      master.connect(audioCtx.destination);
    } catch {
      audioCtx = null;
      master = null;
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* still gesture-locked — the next tap will retry */
    });
  }

  return audioCtx;
}

/** Per-tone voicing. Each tone keeps its own timbre, pitch and decay. */
const TONE_PROFILE: Record<
  SoundTone,
  { wave: OscillatorType; base: number; decay: number; drop: number; gain: number; noise: number }
> = {
  // Gboard-like: short, soft, slightly muted.
  default: { wave: 'triangle', base: 1180, decay: 0.016, drop: 0.42, gain: 0.34, noise: 0 },
  // Crisper, higher click.
  click: { wave: 'square', base: 1500, decay: 0.012, drop: 0.3, gain: 0.24, noise: 0.15 },
  // Deeper thock with a touch of noise, like a keyboard switch.
  mechanical: { wave: 'sawtooth', base: 620, decay: 0.03, drop: 0.22, gain: 0.3, noise: 0.35 },
  // Barely there — for quiet rooms.
  soft: { wave: 'sine', base: 880, decay: 0.026, drop: 0.55, gain: 0.2, noise: 0 },
};

/** Pitch offsets so modifiers/space/action keys read as distinct from letters. */
const TYPE_PITCH: Record<KeySoundType, number> = {
  letter: 1,
  modifier: 0.78,
  space: 0.66,
  accent: 1.18,
};

function playNoiseBurst(ctx: AudioContext, out: GainNode, amount: number, level: number, now: number) {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * 0.012));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level * amount, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);
  src.connect(gain);
  gain.connect(out);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
  src.start(now);
  src.stop(now + 0.014);
}

/**
 * Play one keystroke. `volume` is the user's 0..1 preference; the tone profile
 * scales it so no tone is disproportionately loud at the same slider value.
 */
export function playKeyClickSound(
  type: KeySoundType = 'letter',
  volume = 0.3,
  tone: SoundTone = 'default',
) {
  try {
    if (volume <= 0) return;
    const stamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (stamp - lastPlayedAt < MIN_INTERVAL_MS) return;
    lastPlayedAt = stamp;

    const ctx = getAudioContext();
    if (!ctx || !master || ctx.state !== 'running') return;

    const profile = TONE_PROFILE[tone] ?? TONE_PROFILE.default;
    const now = ctx.currentTime;
    const freq = profile.base * (TYPE_PITCH[type] ?? 1);
    const level = Math.min(1, Math.max(0, volume)) * profile.gain;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = profile.wave;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * profile.drop), now + profile.decay);

    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.decay);

    osc.connect(gain);
    gain.connect(master);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(now);
    osc.stop(now + profile.decay + 0.005);

    if (profile.noise > 0) playNoiseBurst(ctx, master, profile.noise, level, now);
  } catch {
    /* audio is a nicety — never let it break typing */
  }
}

/**
 * Park the audio graph when the keyboard closes. Suspending (rather than
 * closing) keeps the next open instant while releasing the audio hardware,
 * which is what drains battery on long sessions.
 */
export function releaseKeyboardAudio(delayMs = 1500) {
  if (!audioCtx) return;
  if (suspendTimer !== null) window.clearTimeout(suspendTimer);
  suspendTimer = window.setTimeout(() => {
    suspendTimer = null;
    audioCtx?.suspend().catch(() => {
      /* already suspended */
    });
  }, delayMs);
}

/** Full teardown, used on sign-out / cache clears. */
export function disposeKeyboardAudio() {
  if (suspendTimer !== null) {
    window.clearTimeout(suspendTimer);
    suspendTimer = null;
  }
  try {
    master?.disconnect();
    void audioCtx?.close();
  } catch {
    /* ignore */
  }
  master = null;
  audioCtx = null;
}
