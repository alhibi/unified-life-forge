/**
 * Synthesized Web Audio API Key Press Sound Generator.
 *
 * Produces crisp, ultra-low-latency key click sounds without external audio assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioCtxClass();
    } catch {
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* ignore gesture lock */
    });
  }

  return audioCtx;
}

export function playKeyClickSound(type: 'letter' | 'modifier' | 'accent' | 'space' = 'letter', volume = 0.3) {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 1200;
    let duration = 0.015;

    if (type === 'modifier') {
      freq = 900;
      duration = 0.02;
    } else if (type === 'space') {
      freq = 750;
      duration = 0.025;
    } else if (type === 'accent') {
      freq = 1400;
      duration = 0.02;
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + duration);

    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    /* ignore audio context errors */
  }
}
