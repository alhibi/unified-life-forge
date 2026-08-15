/**
 * Managed resources — one teardown contract for timers, listeners and
 * subscriptions.
 *
 * A multi-day session in this app crosses hundreds of screen transitions.
 * Every `setInterval` that outlives its component (the prayer countdown, the
 * presence heartbeat, the chart poller) keeps its closure — and everything
 * that closure captured — alive forever, and every orphaned realtime channel
 * keeps a websocket subscription open. The symptom is not a crash but a slow
 * degrade, which is exactly the class of bug nobody notices in review.
 *
 * `useManaged` hands the effect body a `track` object whose members register
 * their own disposer. Teardown is therefore not something the author has to
 * remember: returning from the effect disposes everything acquired inside it,
 * in reverse order of acquisition.
 *
 *   useManaged((track) => {
 *     track.interval(tick, 1000);
 *     track.on(window, 'resize', onResize);
 *     track.add(() => channel.unsubscribe());
 *   }, [deps]);
 *
 * In DEV a live census is published on `window.__managedResources()` so a
 * heap-profiling session can assert the count returns to baseline after heavy
 * navigation instead of climbing.
 */

import { useEffect } from 'react';

type Disposer = () => void;

export interface ManagedTracker {
  /** Registers an arbitrary disposer. Returns it for convenience. */
  add: (dispose: Disposer) => Disposer;
  /** `setTimeout` that cannot outlive the effect. */
  timeout: (fn: () => void, ms: number) => void;
  /** `setInterval` that cannot outlive the effect. */
  interval: (fn: () => void, ms: number) => void;
  /** `requestAnimationFrame` that cannot outlive the effect. */
  raf: (fn: FrameRequestCallback) => void;
  /** `addEventListener` with the matching remove pre-registered. */
  on: <K extends string>(
    target: EventTarget,
    type: K,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ) => void;
  /** An AbortController aborted on teardown — pass its signal to fetch. */
  signal: () => AbortSignal;
}

let liveCount = 0;
const liveByKind = new Map<string, number>();

function note(kind: string, delta: number): void {
  if (!import.meta.env.DEV) return;
  liveCount += delta;
  liveByKind.set(kind, (liveByKind.get(kind) ?? 0) + delta);
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__managedResources = () => ({
    total: liveCount,
    byKind: Object.fromEntries([...liveByKind].filter(([, n]) => n !== 0)),
  });
}

/**
 * Creates a tracker plus its disposer. Use this outside React (stores, plain
 * modules); components should prefer `useManaged`.
 */
export function createManagedScope(): { track: ManagedTracker; dispose: Disposer } {
  const disposers: Array<{ kind: string; dispose: Disposer }> = [];
  let disposed = false;

  const push = (kind: string, dispose: Disposer): Disposer => {
    if (disposed) {
      // Acquired after teardown (a late promise resolution): dispose at once
      // rather than leaking silently.
      dispose();
      return () => {};
    }
    disposers.push({ kind, dispose });
    note(kind, 1);
    return dispose;
  };

  const track: ManagedTracker = {
    add: (dispose) => push('custom', dispose),
    timeout: (fn, ms) => {
      const id = setTimeout(fn, ms);
      push('timeout', () => clearTimeout(id));
    },
    interval: (fn, ms) => {
      const id = setInterval(fn, ms);
      push('interval', () => clearInterval(id));
    },
    raf: (fn) => {
      const id = requestAnimationFrame(fn);
      push('raf', () => cancelAnimationFrame(id));
    },
    on: (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      push('listener', () => target.removeEventListener(type, handler, options));
    },
    signal: () => {
      const ac = new AbortController();
      push('abort', () => ac.abort());
      return ac.signal;
    },
  };

  return {
    track,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      // Reverse order: a listener registered after a subscription is torn
      // down before it, so nothing fires against a half-disposed scope.
      for (let i = disposers.length - 1; i >= 0; i--) {
        const { kind, dispose } = disposers[i];
        try {
          dispose();
        } catch {
          /* teardown must never throw into React's cleanup phase */
        }
        note(kind, -1);
      }
      disposers.length = 0;
    },
  };
}

/**
 * `useEffect` whose resources are disposed for you.
 *
 * The effect body may also return its own extra cleanup, which runs before
 * the tracked disposers.
 */
export function useManaged(
  effect: (track: ManagedTracker) => void | Disposer,
  deps: React.DependencyList,
): void {
  useEffect(() => {
    const { track, dispose } = createManagedScope();
    const extra = effect(track);
    return () => {
      if (typeof extra === 'function') {
        try {
          extra();
        } catch {
          /* noop */
        }
      }
      dispose();
    };
    // The caller owns the dependency list, exactly like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useManaged;