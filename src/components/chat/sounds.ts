// ─────────────────────────────────────────────────────────────────────────────
// Tiny Web Audio helper for chat feedback sounds.
// Avoids shipping mp3 assets: we synthesize short blips (WhatsApp-ish).
// Respects browser autoplay policy – the AudioContext is resumed on demand
// after the first user gesture, and plays are silently skipped if unavailable.
// ─────────────────────────────────────────────────────────────────────────────

type SoundName = 'send' | 'receive' | 'error' | 'tap';

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { return null; }
  return ctx;
}

/** Allow the UI layer to enable/disable chat sounds globally. */
export function setChatSoundsMuted(v: boolean) { muted = v; }
export function getChatSoundsMuted() { return muted; }

/** Resume audio context on first interaction (autoplay policies). */
export function primeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') { c.resume().catch(() => {}); }
}

function blip(freq: number, duration = 0.08, type: OscillatorType = 'sine', volume = 0.14, startOffset = 0) {
  const c = getCtx();
  if (!c) return;
  try {
    const now = c.currentTime + startOffset;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch { /* no-op */ }
}

export function playChatSound(name: SoundName) {
  if (muted) return;
  switch (name) {
    case 'send':
      // Two-tone ascending chirp ("whoosh up") — Telegram-like
      blip(880, 0.07, 'sine', 0.10);
      blip(1320, 0.09, 'sine', 0.08, 0.04);
      break;
    case 'receive':
      // Descending "pop" — gentle notification
      blip(1200, 0.06, 'sine', 0.09);
      blip(760, 0.10, 'sine', 0.08, 0.04);
      break;
    case 'error':
      blip(220, 0.15, 'triangle', 0.12);
      blip(180, 0.18, 'triangle', 0.10, 0.05);
      break;
    case 'tap':
      blip(1400, 0.03, 'square', 0.05);
      break;
  }
}

/** Light haptic tick on supported devices. */
export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(kind === 'heavy' ? 30 : kind === 'medium' ? 15 : 6);
  } catch { /* no-op */ }
}
