// ─────────────────────────────────────────────────────────────────────────────
// Microphone amplitude analyser.
//
// Why this module exists
// ──────────────────────
// While the user is recording a voice note, Telegram and WhatsApp show a
// row of bars dancing in time with the actual voice amplitude. The chat
// composer in this app used to render a static deterministic waveform
// during recording, which felt fake — when the user yells, the bars
// stayed exactly the same, and the muscle-memory expectation of "I see
// my voice" was broken.
//
// We can build the real thing for free out of the same MediaStream
// MediaRecorder is consuming. Web Audio's `AnalyserNode` exposes a tiny
// time-domain buffer that, when sampled at 60 fps and reduced to RMS,
// produces a clean envelope without any extra dependency.
//
// Design decisions
// ────────────────
// • One AnalyserNode per recording session. Cheap to spin up, cheap to
//   tear down. Fully decoupled from the MediaRecorder so we can attach
//   it to the same stream without affecting the recorded bytes.
// • A ring buffer of N most-recent samples (default 40). The composer
//   bar renders one column per slot, so this lines up 1:1 with the visible
//   bars and there is no per-frame array allocation.
// • RMS instead of peak. Peak gives a spiky, noise-floor-influenced
//   waveform; RMS gives the smooth voice-envelope look users associate
//   with messaging apps.
// • Sample rate driven by `requestAnimationFrame`. Not a fixed 60 Hz
//   timer — that would break when the tab is throttled, leaving the
//   recording UI visually frozen even though the audio bytes still flow.
// • Returns a `start()` that yields a `stop()` — opinionated cleanup
//   so callers can't forget to disconnect / close the AudioContext and
//   leak audio pipelines on iOS Safari, which is famous for eating
//   sessions silently.
// ─────────────────────────────────────────────────────────────────────────────

/** Number of amplitude slots we surface to the UI. Matches the bar
 *  count the composer renders so the live waveform always paints the
 *  freshest sample at the right edge. */
export const ANALYSER_BAR_COUNT = 40;

/** How aggressively we ramp bars towards 0 when silence kicks in. A bar
 *  decay of 0.92 means each frame the bar dims by 8% if no new sample
 *  is louder than its current value. Without this, bars latch on to a
 *  loud peak forever. */
const DECAY = 0.92;

/** Floor we render even on dead silence so the bars don't collapse to
 *  zero and look broken. 0.06 ≈ 6% of bar height — visible, but unmistakably "quiet". */
const SILENCE_FLOOR = 0.06;

/** Lift to apply to the loudness envelope so soft speech still moves
 *  bars perceptibly. Without this, normal-speech RMS sits at ~0.1 and
 *  the bars barely budge. 1.6× is the sweet spot between "responsive"
 *  and "clipping all the time". */
const ENVELOPE_GAIN = 1.6;

type AudioContextCtor = typeof AudioContext;
function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

export interface MicAnalyserHandle {
  /** Stop sampling, disconnect the analyser, close the AudioContext. */
  stop: () => void;
  /** Read the current ring buffer (oldest first). Returned array is a
   *  freshly allocated copy — safe to pass to React state without
   *  worrying about future mutations stomping it. */
  getBars: () => number[];
}

export interface MicAnalyserOptions {
  /** Number of bars to maintain. Defaults to {@link ANALYSER_BAR_COUNT}. */
  barCount?: number;
  /**
   * Called every animation frame with the current bars (oldest first).
   * The callback should be cheap — push the array to React state at most
   * a few times per second to avoid tearing through render cycles.
   */
  onSample?: (bars: number[]) => void;
  /**
   * If provided, the analyser will tag each onSample call with a
   * monotonically increasing frame index. Useful for throttling React
   * updates to a fixed multiple (e.g. every 2nd frame ≈ 30 Hz).
   */
  onFrame?: (frameIdx: number, bars: number[]) => void;
}

/**
 * Start an analyser on the given MediaStream. Returns a handle the caller
 * MUST stop when recording ends. Failing to stop leaks the AudioContext
 * (Web Audio holds the mic open even after the stream's tracks are
 * stopped, with audible "phantom" feedback on some hardware).
 *
 * Always succeeds — on browsers without Web Audio support the handle
 * is a no-op shim that produces zeroed bars. Callers don't need a
 * try/catch.
 */
export function startMicAnalyser(
  stream: MediaStream,
  opts: MicAnalyserOptions = {},
): MicAnalyserHandle {
  const Ctor = getAudioContextCtor();
  const barCount = Math.max(8, opts.barCount ?? ANALYSER_BAR_COUNT);
  const buffer = new Float32Array(barCount);

  // No Web Audio? Return a stable shim so the recording flow never
  // throws — the UI just falls back to its decorative animation.
  if (!Ctor) {
    return {
      stop: () => undefined,
      getBars: () => Array.from(buffer),
    };
  }

  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let timeBuffer: Uint8Array | null = null;
  let raf = 0;
  let frame = 0;
  let stopped = false;
  let writeIdx = 0;

  try {
    ctx = new Ctor();
    // Resume immediately; some browsers create suspended contexts.
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    // 256-bin time-domain window @ 48 kHz ≈ 5 ms of audio per frame —
    // way more than enough for a coarse RMS envelope.
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    timeBuffer = new Uint8Array(analyser.fftSize);
  } catch {
    // Setup failed (rare; iOS Safari occasionally errors on
    // createMediaStreamSource if the gesture wasn't fresh enough).
    // Return the shim so callers don't bail out of recording.
    if (ctx) { try { ctx.close(); } catch { /* no-op */ } }
    return {
      stop: () => undefined,
      getBars: () => Array.from(buffer),
    };
  }

  const tick = () => {
    if (stopped || !analyser || !timeBuffer) return;
    analyser.getByteTimeDomainData(timeBuffer);

    // RMS over the time-domain window. Byte values are 0..255 with 128
    // as the silent midpoint, so subtract 128 and normalise to [-1, 1].
    let sum = 0;
    for (let i = 0; i < timeBuffer.length; i++) {
      const v = (timeBuffer[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeBuffer.length);
    const lifted = Math.min(1, rms * ENVELOPE_GAIN);

    // Decay every existing bar slightly so silence doesn't freeze on a
    // peak. Then write the freshest sample at the head, with the floor
    // applied so dead-quiet recordings still show life.
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.max(SILENCE_FLOOR, buffer[i] * DECAY);
    }
    buffer[writeIdx % buffer.length] = Math.max(SILENCE_FLOOR, lifted);
    writeIdx = (writeIdx + 1) % buffer.length;

    const snapshot = Array.from(buffer);
    opts.onSample?.(snapshot);
    opts.onFrame?.(frame, snapshot);
    frame++;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      try { source?.disconnect(); } catch { /* no-op */ }
      try { analyser?.disconnect(); } catch { /* no-op */ }
      if (ctx && ctx.state !== 'closed') {
        // close() returns a promise on some browsers, void on others —
        // we don't care about the outcome.
        try { void ctx.close(); } catch { /* no-op */ }
      }
    },
    getBars: () => Array.from(buffer),
  };
}

/**
 * Build a stable read-aligned ring of bars from a writeIdx and the raw
 * buffer. UIs that render bars from oldest → newest can call this on
 * each animation frame to get a "scrolling" effect.
 *
 * Currently the analyser already emits already-rotated snapshots
 * (writeIdx is private), but this helper exists for callers that
 * cache the raw buffer themselves and want the same rotation logic.
 */
export function rotateBuffer(buf: Float32Array | number[], writeIdx: number): number[] {
  const n = buf.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    out[i] = (buf as Float32Array)[(writeIdx + i) % n];
  }
  return out;
}