// Single source of truth for the chat "unread messages" badge.
//
// Before this hook existed, the same 12-line query + 60s polling + realtime
// subscription was duplicated in BottomNav, Chat page, and Index page.
// That meant 3 simultaneous timers and up to 4 active realtime channels on
// the same screen, all converging on the same value.
//
// This hook lifts that work to a *module-level singleton*: one in-flight
// fetch, one polling timer, one realtime channel — no matter how many
// React subtrees consume it. Each consumer simply subscribes to receive
// the latest count.
//
// It also gates all network activity on `isSupabaseConfigured` so a missing
// .env doesn't cause a stream of failed requests in the console.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured,supabase } from '@/integrations/supabase/client';

type Listener = (count: number) => void;

const POLL_INTERVAL_MS = 60_000;
const REALTIME_DEBOUNCE_MS = 800;

// ── module-level singleton state ────────────────────────────────────────
let currentCount = 0;
let watchedUserId: string | null = null;
const listeners = new Set<Listener>();

let pollTimer: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let channel: RealtimeChannel | null = null;
let inFlight: Promise<void> | null = null;

function emit(count: number) {
  currentCount = count;
  for (const l of listeners) l(count);
}

async function fetchNow(userId: string): Promise<void> {
  if (!isSupabaseConfigured) { emit(0); return; }
  // Coalesce concurrent fetches — if one is already running, share its result.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      if (convErr || !convs || convs.length === 0) { emit(0); return; }

      const ids = convs.map(c => c.id);
      const { count, error: msgErr } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .neq('sender_id', userId)
        .eq('read', false);
      if (msgErr) { emit(0); return; }
      emit(count || 0);
    } catch {
      // Network or auth error — keep previous value rather than flicker to 0.
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function scheduleDebouncedRefetch(userId: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { void fetchNow(userId); }, REALTIME_DEBOUNCE_MS);
}

function startWatching(userId: string) {
  if (watchedUserId === userId) return;
  stopWatching();
  watchedUserId = userId;

  // Initial fetch + periodic refresh as a safety net for missed realtime events.
  void fetchNow(userId);
  pollTimer = setInterval(() => { void fetchNow(userId); }, POLL_INTERVAL_MS);

  if (isSupabaseConfigured) {
    channel = supabase
      .channel('unread-messages-singleton')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => scheduleDebouncedRefetch(userId),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => scheduleDebouncedRefetch(userId),
      )
      .subscribe();
  }
}

function stopWatching() {
  watchedUserId = null;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (channel) { supabase.removeChannel(channel); channel = null; }
}

// ── React hook ──────────────────────────────────────────────────────────
export interface UseUnreadMessagesResult {
  unreadCount: number;
  /** Force an immediate refetch (e.g. after the user marks a message read). */
  refresh: () => void;
}

export function useUnreadMessages(): UseUnreadMessagesResult {
  const { user } = useAuth();
  const [count, setCount] = useState(currentCount);

  useEffect(() => {
    listeners.add(setCount);
    // Sync immediately in case the singleton already has a fresh value.
    setCount(currentCount);

    if (user?.id) {
      startWatching(user.id);
    } else {
      // Logged-out: clear the badge but only if we were the one watching.
      if (watchedUserId !== null) stopWatching();
      emit(0);
    }

    return () => {
      listeners.delete(setCount);
      // Last subscriber leaving + signed in → stop the timers/channel until
      // someone consumes the hook again.
      if (listeners.size === 0) stopWatching();
    };
  }, [user?.id]);

  return {
    unreadCount: count,
    refresh: () => { if (watchedUserId) void fetchNow(watchedUserId); },
  };
}
