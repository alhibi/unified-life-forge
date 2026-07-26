import { useSyncExternalStore } from 'react';

import { getMotionRuntimeRevision, subscribeMotionRuntime } from '@/lib/motionRuntime';

/**
 * Re-render whenever the motion runtime applies a change.
 *
 * The runtime mutates the shared `MOTION` token object from inside an effect, so
 * a component that reads `MOTION` during render is one commit behind: React
 * renders with the old values, the effect rewrites them, and nothing tells the
 * component to look again. Effect ordering cannot solve it — React runs child
 * effects before parent ones, so a child cannot wait for the provider's effect.
 *
 * `useSyncExternalStore` is the one mechanism guaranteed to re-render after an
 * external mutation, whoever caused it. Any component that displays live motion
 * values — the diagnostics readout, the live preview — must call this.
 *
 * Components that merely *animate* do not need it: framer-motion reads the token
 * object at the moment a transition starts, so it always gets current values.
 */
export function useMotionRuntimeRevision(): number {
  return useSyncExternalStore(
    subscribeMotionRuntime,
    getMotionRuntimeRevision,
    // Server/prerender snapshot: no runtime has applied anything yet.
    () => 0,
  );
}
