// Unified chat unread-message counter.
//
// This used to be copy-pasted in three places (Index, Chat, BottomNav) with
// subtly different polling intervals and channel names. They all answered
// the same question: "how many messages did the other side send me that I
// haven't read yet?". One source of truth here so realtime + polling stay in
// lockstep.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const POLL_INTERVAL_MS = 60_000;
const REALTIME_DEBOUNCE_MS = 800;

/**
 * Returns the number of unread messages addressed to `user` across all of
 * their conversations. Updates on:
 *   - mount (immediately)
 *   - every 60s (slow safety-net poll)
 *   - any INSERT/UPDATE on the messages table (debounced 800ms)
 *
 * @param user The currently authenticated user, or null/undefined when
 * signed out (returns 0 in that case).
 * @param channelName Optional unique channel name to avoid collisions when
 * multiple components mount the hook concurrently. Defaults to a generic
 * `unread-count` — pass distinct names per call site if you ever need to
 * subscribe more than once on the same page.
 */
export function useUnreadCount(
  user: User | null | undefined,
  channelName: string = 'unread-count',
): number {
  const [count, setCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) { setCount(0); return; }
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    if (!convs || convs.length === 0) { setCount(0); return; }
    const ids = convs.map(c => c.id);
    const { count: c } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', user.id)
      .eq('read', false);
    setCount(c ?? 0);
  }, [user]);

  // Initial fetch + slow poll. The poll is a safety-net for edge cases
  // (realtime drop-out, browser throttling background tabs) — realtime
  // delivers the snappy updates.
  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Realtime: react to INSERT (new message) and UPDATE (read flag flip).
  // Debounced so a burst of inserts doesn't trigger N parallel queries.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchUnread(), REALTIME_DEBOUNCE_MS);
    };
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debounced)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, debounced)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [user, fetchUnread, channelName]);

  return count;
}
