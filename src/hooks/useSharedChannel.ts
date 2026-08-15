/**
 * React binding for the ref-counted realtime channel registry.
 *
 * Guarantees the thing the audit found missing in several hooks: the channel
 * is released on unmount, every time, including on a dependency change and on
 * a StrictMode double-mount. The registry's grace window absorbs the latter
 * without renegotiating the socket.
 */

import { useEffect } from 'react';

import type { ChannelSetup } from '@/lib/realtime/channelRegistry';
import { acquireChannel } from '@/lib/realtime/channelRegistry';

export type { ChannelSetup };

/**
 * @param topic  Resource-scoped topic, e.g. `chat:<id>` or `chess:<gameId>`.
 *               Pass `null` to subscribe to nothing (id not resolved yet).
 * @param setup  Runs once per topic across the whole app, before subscribe().
 * @param bind   Runs per holder. Register local listeners here via `on`; the
 *               returned disposer is called on unmount.
 */
export function useSharedChannel(
  topic: string | null,
  setup: (
    channel: Parameters<ChannelSetup>[0],
    emit: (event: string, payload: unknown) => void,
  ) => void,
  bind?: (on: (event: string, cb: (payload: unknown) => void) => () => void) => void | (() => void),
): void {
  useEffect(() => {
    if (!topic) return;
    const handle = acquireChannel(topic, setup);
    const offs: Array<() => void> = [];
    const extra = bind?.((event, cb) => {
      const off = handle.on(event, cb);
      offs.push(off);
      return off;
    });
    return () => {
      if (typeof extra === 'function') extra();
      for (const off of offs) off();
      handle.release();
    };
    // `setup`/`bind` are intentionally excluded: they are inline closures at
    // every call site, so including them would resubscribe on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);
}

export default useSharedChannel;