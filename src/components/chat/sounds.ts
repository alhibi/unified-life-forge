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

/**
 * Web Native 2026 haptic patterns. The Vibration API is supported on Android
 * Chrome and Safari 17.4+ (iOS). Unsupported devices silently skip.
 *
 * Vocabulary mirrors iOS UIFeedbackGenerator so we can pick a kind by intent
 * rather than millisecond counts:
 *   - light    → tap on a UI element (toggle, chip, segmented control)
 *   - medium   → confirmation tap (sent message, picked emoji)
 *   - heavy    → emphatic action (delete, long-press lock, big CTA)
 *   - success  → "✓ done" — gentle double tap
 *   - error    → "✗ bad" — sharper double tap
 *   - warning  → "⚠ careful" — three-pulse
 *   - tick     → scroll-snap / picker detent (very short)
 */
export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'tick';

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  light:   6,
  medium:  15,
  heavy:   30,
  tick:    4,
  success: [10, 30, 10],
  error:   [30, 10, 30],
  warning: [15, 40, 15, 40, 15],
};

export function haptic(kind: HapticKind = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch { /* no-op */ }
}
