/**
 * Ref-counted realtime channel registry.
 *
 * supabase-js dedupes `channel(topic)` by topic, but it does NOT let a second
 * caller attach handlers after `subscribe()`, and it has no notion of "the
 * last interested component unmounted". The result across this codebase was
 * two failure modes: a duplicate-handler error when two hooks wanted the same
 * topic (see `typingChannels.ts`, which solved it for the one topic it owns),
 * and orphaned open subscriptions after unmount — the primary cause of
 * realtime connection exhaustion once more than a handful of users are live.
 *
 * This is the generalised version. One subscription per topic, fan-out to N
 * local listeners, and the channel is removed from the socket only when the
 * last holder releases it — after a short grace period, so a route transition
 * that unmounts and immediately remounts the same subscriber reuses the live
 * channel instead of tearing down and renegotiating.
 *
 * Usage from a component: prefer `useSharedChannel`, which releases on
 * unmount for you.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';

/** Grace window before an unreferenced channel is actually removed. */
const RELEASE_GRACE_MS = 4_000;

export type ChannelSetup = (channel: RealtimeChannel) => void;

interface Entry {
  channel: RealtimeChannel;
  refCount: number;
  /** Payload fan-out, keyed by the event name the setup step publishes to. */
  listeners: Map<string, Set<(payload: unknown) => void>>;
  releaseTimer: ReturnType<typeof setTimeout> | null;
}

const registry = new Map<string, Entry>();

export interface ChannelHandle {
  channel: RealtimeChannel;
  /** Subscribe to a named event this topic emits. Returns an unsubscriber. */
  on: (event: string, cb: (payload: unknown) => void) => () => void;
  /** Emit to the local listeners of this topic (used by the setup step). */
  emit: (event: string, payload: unknown) => void;
  release: () => void;
}

function emitTo(entry: Entry, event: string, payload: unknown): void {
  const set = entry.listeners.get(event);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(payload);
    } catch {
      /* one bad subscriber must not starve the rest */
    }
  }
}

/**
 * Acquires the channel for `topic`, creating and subscribing it on first use.
 *
 * `setup` runs exactly once per topic, BEFORE `subscribe()`, and is where the
 * `.on('postgres_changes' | 'broadcast' | 'presence', …)` handlers belong. It
 * receives an `emit` so a single upstream handler can fan out to every local
 * subscriber.
 */
export function acquireChannel(
  topic: string,
  setup: (channel: RealtimeChannel, emit: (event: string, payload: unknown) => void) => void,
): ChannelHandle {
  let entry = registry.get(topic);

  if (!entry) {
    const channel = supabase.channel(topic);
    const created: Entry = { channel, refCount: 0, listeners: new Map(), releaseTimer: null };
    registry.set(topic, created);
    setup(channel, (event, payload) => emitTo(created, event, payload));
    channel.subscribe();
    entry = created;
  } else if (entry.releaseTimer) {
    // Reclaimed inside the grace window — cancel the pending teardown.
    clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
  }

  const e = entry;
  e.refCount++;
  let released = false;

  return {
    channel: e.channel,
    on: (event, cb) => {
      let set = e.listeners.get(event);
      if (!set) {
        set = new Set();
        e.listeners.set(event, set);
      }
      set.add(cb);
      return () => {
        set?.delete(cb);
      };
    },
    emit: (event, payload) => emitTo(e, event, payload),
    release: () => {
      if (released) return;
      released = true;
      e.refCount = Math.max(0, e.refCount - 1);
      if (e.refCount > 0) return;
      e.releaseTimer = setTimeout(() => {
        // Re-check: a new holder may have arrived and cancelled us already.
        if (e.refCount > 0) return;
        registry.delete(topic);
        e.listeners.clear();
        void supabase.removeChannel(e.channel);
      }, RELEASE_GRACE_MS);
    },
  };
}

/** Diagnostics: open topics and how many holders each has. */
export function channelCensus(): Array<{ topic: string; refCount: number; closing: boolean }> {
  return [...registry.entries()].map(([topic, e]) => ({
    topic,
    refCount: e.refCount,
    closing: e.releaseTimer !== null,
  }));
}

/** Test helper — drop every channel without waiting for the grace window. */
export function resetChannelRegistry(): void {
  for (const [, e] of registry) {
    if (e.releaseTimer) clearTimeout(e.releaseTimer);
    void supabase.removeChannel(e.channel);
  }
  registry.clear();
}