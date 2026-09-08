/**
 * Signature sound — two tones, off by default, and that is the whole design.
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ Most apps either ship no audio or ship far too much of it. This one ║
 * ║ ships exactly two synthesized tones, tied to the two moments that   ║
 * ║ genuinely deserve acknowledgement, and they are SILENT until the    ║
 * ║ user turns them on in الحركة والأداء. Nothing plays on a route      ║
 * ║ change, a tap, a toast or an error.                                 ║
 * ║                                                                    ║
 * ║   'complete'  a dhikr round closing — a soft copper two-note rise   ║
 * ║               with a long tail, tuned to a perfect fifth so it      ║
 * ║               resolves instead of alerting.                         ║
 * ║   'reveal'    an analysis/result arriving — one clean note, quieter ║
 * ║               and shorter, so it registers without interrupting     ║
 * ║               reading.                                              ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Notes on restraint (all deliberate):
 *   • Peak gain is 0.06 — roughly a third of the chat blips. It should be
 *     barely audible at half volume, never audible over speech.
 *   • A sine with an exponential decay, so there is no click on release.
 *   • The AudioContext is created lazily on the first *enabled* play, so a
 *     user who never enables sound never pays for an audio graph, and
 *     autoplay policy is never tripped (the play always follows a tap).
 *   • Rate-limited to one tone per 400ms: a fast tapper cannot turn a
 *     signature into a stutter.
 */

export type SignatureSound = 'complete' | 'reveal';

export const SIGNATURE_SOUND_KEY = 'app-signature-sound';

let ctx: AudioContext | null = null;
let lastPlayedAt = 0;
const MIN_GAP_MS = 400;

/** Off by default — the user opts in, never out. */
export function isSignatureSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(SIGNATURE_SOUND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSignatureSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SIGNATURE_SOUND_KEY, String(enabled));
  } catch {
    /* a storage failure must not break the switch */
  }
  if (!enabled && ctx) {
    void ctx.close().catch(() => undefined);
    ctx = null;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx && ctx.state !== 'closed') return ctx;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

function tone(
  c: AudioContext,
  freq: number,
  { at = 0, duration = 0.5, peak = 0.06 }: { at?: number; duration?: number; peak?: number } = {},
): void {
  const now = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  // A 30ms attack, then a long exponential tail — no click at either end.
  gain.gain.linearRampToValueAtTime(peak, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export function playSignatureSound(name: SignatureSound): void {
  if (!isSignatureSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;

  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);

  try {
    if (name === 'complete') {
      // C6 → G6: a perfect fifth resolves rather than alerts.
      tone(c, 1046.5, { duration: 0.5, peak: 0.055 });
      tone(c, 1568, { at: 0.09, duration: 0.62, peak: 0.04 });
    } else {
      tone(c, 1318.5, { duration: 0.34, peak: 0.035 });
    }
  } catch {
    /* audio is decoration — never let it surface as an error */
  }
}
