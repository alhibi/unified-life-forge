// ─────────────────────────────────────────────────────────────────────────────
// useTypingIndicator — broadcast my typing state on the `chat-typing:<chatId>`
// presence channel and observe other members' state.
//
// Built on top of the shared singleton in `src/components/chat/typingChannels.ts`,
// extended here to use the new `chat-typing:<id>` topic. Reusing the existing
// refcounted singleton keeps the websocket count stable when many list-row
// observers + the active conversation read the same topic.
//
// Throttling: we send a `presence track` at most once per second while typing
// and clear after 6 s of silence — same numbers as Telegram/WhatsApp.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const TRACK_THROTTLE_MS = 1_000;
const STALE_AFTER_MS    = 6_000;

interface PresenceState {
  // Map of presenceKey -> [{ typing?: boolean; user_id?: string; ... }]
  [key: string]: Array<Record<string, unknown>>;
}

/**
 * Acquire (or reuse) the chat-typing channel for a given chatId.
 * Mirrors the refcounted pattern from typingChannels.ts but uses the
 * new `chat-typing:<id>` topic.
 */
interface ChannelEntry {
  channel: RealtimeChannel;
  refCount: number;
  listeners: Set<(state: PresenceState) => void>;
  lastState: PresenceState;
}

const cache = new Map<string, ChannelEntry>();

function acquire(chatId: string, presenceKey: string): {
  channel: RealtimeChannel;
  onChange: (cb: (s: PresenceState) => void) => () => void;
  release: () => void;
} {
  const topic = `chat-typing:${chatId}`;
  let entry = cache.get(topic);
  if (!entry) {
    const channel = supabase.channel(topic, {
      config: { presence: { key: presenceKey } },
    });
    const e: ChannelEntry = {
      channel,
      refCount: 0,
      listeners: new Set(),
      lastState: {},
    };
    const recompute = () => {
      const state = channel.presenceState() as unknown as PresenceState;
      e.lastState = state;
      for (const cb of e.listeners) cb(state);
    };
    channel
      .on('presence', { event: 'sync' },  recompute)
      .on('presence', { event: 'join' },  recompute)
      .on('presence', { event: 'leave' }, recompute)
      .subscribe();
    cache.set(topic, e);
    entry = e;
  }
  const cached = entry;
  cached.refCount++;
  let released = false;

  return {
    channel: cached.channel,
    onChange: (cb) => {
      cached.listeners.add(cb);
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

export interface UseTypingIndicatorResult {
  /** Display-friendly: list of OTHER user_ids currently typing. */
  othersTyping: string[];
  /** Quick boolean: is anyone other than me typing? */
  anyOtherTyping: boolean;
  /** Call this on every keystroke; respects internal throttle. */
  notifyTyping: () => void;
  /** Force-clear (e.g. on send / blur). */
  clearTyping: () => void;
}

export function useTypingIndicator(
  chatId: string | null | undefined,
  selfUserId: string | undefined,
): UseTypingIndicatorResult {
  const [othersTyping, setOthers] = useState<string[]>([]);
  const handleRef     = useRef<ReturnType<typeof acquire> | null>(null);
  const lastTrackRef  = useRef<number>(0);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe / unsubscribe per chatId
  useEffect(() => {
    if (!chatId || !selfUserId) {
      setOthers([]);
      return;
    }
    const handle = acquire(chatId, selfUserId);
    handleRef.current = handle;

    const unsubscribe = handle.onChange((state) => {
      const ids = new Set<string>();
      const now = Date.now();
      for (const entries of Object.values(state)) {
        for (const e of entries) {
          const uid = typeof e.user_id === 'string' ? e.user_id : null;
          const typing = e.typing === true;
          const at = typeof e.at === 'number' ? e.at : 0;
          if (!uid || uid === selfUserId || !typing) continue;
          // Drop stale entries the server might still have if the client
          // tab disconnected mid-typing. STALE_AFTER_MS is the same as the
          // composer's auto-clear window so the two stay in sync.
          if (at > 0 && now - at > STALE_AFTER_MS) continue;
          ids.add(uid);
        }
      }
      setOthers(prev => {
        const next = Array.from(ids);
        if (prev.length === next.length && prev.every((x, i) => x === next[i])) return prev;
        return next;
      });
    });

    return () => {
      unsubscribe();
      try { handle.channel.untrack(); } catch { /* no-op */ }
      handle.release();
      handleRef.current = null;
      if (staleTimerRef.current) { clearTimeout(staleTimerRef.current); staleTimerRef.current = null; }
    };
  }, [chatId, selfUserId]);

  const trackTyping = useCallback((typing: boolean) => {
    const handle = handleRef.current;
    if (!handle || !selfUserId) return;
    handle.channel.track({ user_id: selfUserId, typing, at: Date.now() })
      .catch(() => { /* tolerate transient errors */ });
  }, [selfUserId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTrackRef.current >= TRACK_THROTTLE_MS) {
      lastTrackRef.current = now;
      trackTyping(true);
    }
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      trackTyping(false);
      lastTrackRef.current = 0;
    }, STALE_AFTER_MS);
  }, [trackTyping]);

  const clearTyping = useCallback(() => {
    if (staleTimerRef.current) { clearTimeout(staleTimerRef.current); staleTimerRef.current = null; }
    lastTrackRef.current = 0;
    trackTyping(false);
  }, [trackTyping]);

  return {
    othersTyping,
    anyOtherTyping: othersTyping.length > 0,
    notifyTyping,
    clearTyping,
  };
}
