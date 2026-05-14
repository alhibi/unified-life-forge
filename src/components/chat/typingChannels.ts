import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared `typing:<convId>` channel singleton.
//
// supabase-js dedupes `channel(topic)` by topic name — the second caller in a
// given browser tab gets back the existing channel instance, already
// subscribed. supabase-realtime-js then refuses any further
// `.on('presence', …)` registration with:
//
//   "cannot add `presence` callbacks for realtime:typing:<id> after
//   `subscribe()`."
//
// Two hooks need state from the same `typing:<convId>` topic at the same
// time — the active-conversation tracker and the conversation-list typing
// observer. Funnel both through a single shared channel reference here:
// the first acquire creates the channel, attaches the three presence
// listeners once, and subscribes; subsequent acquires register a JS state
// callback and get fan-out updates without touching `.on()`.
// ─────────────────────────────────────────────────────────────────────────────

export type TypingState = Record<string, Array<Record<string, unknown>>>;

interface TypingEntry {
  channel: RealtimeChannel;
  refCount: number;
  listeners: Set<(state: TypingState) => void>;
  lastState: TypingState;
}

const cache = new Map<string, TypingEntry>();

export interface TypingChannelHandle {
  channel: RealtimeChannel;
  getState: () => TypingState;
  onChange: (cb: (state: TypingState) => void) => () => void;
  release: () => void;
}

export function acquireTypingChannel(
  convId: string,
  presenceKey: string,
): TypingChannelHandle {
  const topic = `typing:${convId}`;
  let entry = cache.get(topic);
  if (!entry) {
    const channel = supabase.channel(topic, {
      config: { presence: { key: presenceKey } },
    });
    const created: TypingEntry = {
      channel,
      refCount: 0,
      listeners: new Set(),
      lastState: {},
    };
    const recompute = () => {
      const state = channel.presenceState() as TypingState;
      created.lastState = state;
      for (const cb of created.listeners) cb(state);
    };
    channel
      .on('presence', { event: 'sync' },  recompute)
      .on('presence', { event: 'join' },  recompute)
      .on('presence', { event: 'leave' }, recompute)
      .subscribe();
    cache.set(topic, created);
    entry = created;
  }
  const cached = entry;
  cached.refCount++;
  let released = false;
  return {
    channel: cached.channel,
    getState: () => cached.lastState,
    onChange: (cb) => {
      cached.listeners.add(cb);
      // Seed immediately so callers can render initial state without
      // waiting for the next sync.
      cb(cached.lastState);
      return () => { cached.listeners.delete(cb); };
    },
    release: () => {
      if (released) return;
      released = true;
      cached.refCount = Math.max(0, cached.refCount - 1);
      if (cached.refCount === 0) {
        try { cached.channel.untrack(); } catch { /* no-op */ }
        supabase.removeChannel(cached.channel);
        cache.delete(topic);
      }
    },
  };
}
