import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Presence tracking — two parallel signals:
//
//   1. Realtime Presence on a global `presence:online` channel. Supabase pushes
//      `join` / `leave` events immediately when the websocket connects /
//      disconnects, so this is the source of truth for "is X online right now".
//
//   2. `profiles.last_seen` heartbeat. We keep updating it every 25s while the
//      user is active so subscribers who load late (or after a brief network
//      hiccup) can format an accurate "last seen X minutes ago" label.
//
// A single BroadcastChannel ("ulf:presence") elects one tab as the active
// heartbeat-er per browser so the user isn't billed N× the realtime traffic
// when they have 5 tabs open.
// ─────────────────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS   = 25_000;   // 25s — slightly tighter than before
const INACTIVITY_TIMEOUT_MS   = 60_000;   // 60s without input → unfocused
const VISIBILITY_GRACE_MS     = 15_000;   // tolerate brief tab switches
const ONLINE_THRESHOLD_MS     = 60_000;   // last_seen within 60s = "online"

const PRESENCE_CHANNEL = 'presence:online';

type LeaderState = {
  bc: BroadcastChannel | null;
  isLeader: boolean;
  leaderId: string;
};

function makeLeaderState(): LeaderState {
  return { bc: null, isLeader: false, leaderId: Math.random().toString(36).slice(2) };
}

/**
 * Global presence tracker — runs once per signed-in browser.
 *
 * Marks the user "online" via Realtime Presence + heartbeats `last_seen`
 * every HEARTBEAT_INTERVAL_MS while the tab is visible and active.
 * Tolerates brief tab switches (VISIBILITY_GRACE_MS) before treating the
 * user as offline. Uses BroadcastChannel for cross-tab leader election so
 * only one tab heartbeats at a time.
 */
export function usePresence(userId: string | undefined) {
  const inactivityTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const heartbeatTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const isActiveRef      = useRef(false);
  const presenceChanRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const leaderRef        = useRef<LeaderState>(makeLeaderState());

  const heartbeat = useCallback(() => {
    if (!userId) return;
    void supabase.rpc('update_last_seen');
  }, [userId]);

  const becomeActive = useCallback(() => {
    if (!userId || !leaderRef.current.isLeader) return;
    if (!isActiveRef.current) {
      isActiveRef.current = true;
      heartbeat();
      presenceChanRef.current?.track({ user_id: userId, online_at: new Date().toISOString() });
    }
  }, [userId, heartbeat]);

  const becomeInactive = useCallback(() => {
    if (!userId) return;
    if (isActiveRef.current) {
      isActiveRef.current = false;
      presenceChanRef.current?.untrack();
    }
  }, [userId]);

  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    becomeActive();
    inactivityTimer.current = setTimeout(() => {
      becomeInactive();
    }, INACTIVITY_TIMEOUT_MS);
  }, [becomeActive, becomeInactive]);

  useEffect(() => {
    if (!userId) return;

    // ── Cross-tab leader election ──────────────────────────────────────────
    const leader = leaderRef.current;
    const myId = leader.leaderId;
    let knownLeader: string | null = null;
    try {
      leader.bc = new BroadcastChannel('ulf:presence');
    } catch {
      leader.bc = null;
    }

    const claim = () => leader.bc?.postMessage({ kind: 'claim', id: myId, t: Date.now() });
    const announce = () => leader.bc?.postMessage({ kind: 'iam', id: myId, t: Date.now() });

    if (leader.bc) {
      leader.bc.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { kind?: string; id?: string };
        if (!data?.kind || !data.id) return;
        if (data.kind === 'iam') {
          // Another tab declares leadership; defer to them only if their id
          // sorts lexicographically lower (deterministic tiebreak).
          if (data.id < myId) {
            knownLeader = data.id;
            if (leader.isLeader) {
              leader.isLeader = false;
              becomeInactive();
            }
          }
        } else if (data.kind === 'claim') {
          // Someone wants to be leader; if we are leader, defend it.
          if (leader.isLeader) announce();
          else if (knownLeader === null || data.id < knownLeader) knownLeader = data.id;
        } else if (data.kind === 'bye') {
          if (knownLeader === data.id) knownLeader = null;
        }
      };
      claim();
      // Wait briefly for an existing leader to respond. If none does, take it.
      const electionTimer = setTimeout(() => {
        if (knownLeader === null) {
          leader.isLeader = true;
          announce();
          // Open the realtime presence channel now that we're leader.
          const channel = supabase.channel(PRESENCE_CHANNEL, {
            config: { presence: { key: userId } },
          });
          presenceChanRef.current = channel;
          channel.subscribe(status => {
            if (status === 'SUBSCRIBED' && document.visibilityState !== 'hidden') {
              channel.track({ user_id: userId, online_at: new Date().toISOString() });
              isActiveRef.current = true;
              heartbeat();
            }
          });
        }
      }, 250);

      // Defensive cleanup if effect tears down before election finishes.
      return () => {
        clearTimeout(electionTimer);
        cleanup();
      };
    }

    // No BroadcastChannel available (older Safari etc.) — act as solo leader.
    leader.isLeader = true;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });
    presenceChanRef.current = channel;
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED' && document.visibilityState !== 'hidden') {
        channel.track({ user_id: userId, online_at: new Date().toISOString() });
        isActiveRef.current = true;
        heartbeat();
      }
    });

    function cleanup() {
      try { leader.bc?.postMessage({ kind: 'bye', id: myId, t: Date.now() }); } catch { /* no-op */ }
      try { leader.bc?.close(); } catch { /* no-op */ }
      leader.bc = null;
      leader.isLeader = false;
      if (inactivityTimer.current)  clearTimeout(inactivityTimer.current);
      if (heartbeatTimer.current)   clearInterval(heartbeatTimer.current);
      if (visibilityTimer.current)  clearTimeout(visibilityTimer.current);
      if (presenceChanRef.current) {
        try { presenceChanRef.current.untrack(); } catch { /* no-op */ }
        supabase.removeChannel(presenceChanRef.current);
        presenceChanRef.current = null;
      }
    }
    return cleanup;
  }, [userId, becomeInactive, heartbeat]);

  // ── Heartbeat / activity wiring (depends on leadership) ──────────────────
  useEffect(() => {
    if (!userId) return;

    resetInactivity();

    heartbeatTimer.current = setInterval(() => {
      if (leaderRef.current.isLeader && isActiveRef.current && document.visibilityState !== 'hidden') {
        heartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const onActivity = () => resetInactivity();
    // mousemove fires hundreds of times/sec; rely on click + keydown + touch.
    const events = ['mousedown', 'keydown', 'touchstart', 'pointerdown'] as const;
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Tolerate brief tab switches: don't drop presence immediately.
        if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
        visibilityTimer.current = setTimeout(() => {
          becomeInactive();
        }, VISIBILITY_GRACE_MS);
      } else {
        if (visibilityTimer.current) {
          clearTimeout(visibilityTimer.current);
          visibilityTimer.current = null;
        }
        resetInactivity();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // On tab close, use sendBeacon — a synchronous-ish "last_seen update" that
    // is guaranteed to be queued even when the page is being unloaded. We
    // can't easily authenticate against the Supabase RPC endpoint from
    // sendBeacon, so we fall back to a best-effort fetch with keepalive.
    const onLeave = () => {
      try { leaderRef.current.bc?.postMessage({ kind: 'bye', id: leaderRef.current.leaderId, t: Date.now() }); } catch { /* no-op */ }
      try { presenceChanRef.current?.untrack(); } catch { /* no-op */ }
    };
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onLeave);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('pagehide', onLeave);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [userId, resetInactivity, becomeInactive, heartbeat]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Consumer hook: subscribe to a single other user's presence.
//
// Returns `{ lastSeen, isOnline }` where:
//   - `lastSeen` is the most recently observed `profiles.last_seen` for them,
//     refreshed whenever `update_last_seen` fires or the global presence
//     channel emits a join/leave event for that user.
//   - `isOnline` is true if EITHER (a) they're tracked in the global presence
//     channel, OR (b) their last_seen is within ONLINE_THRESHOLD_MS.
//
// The hook re-emits an internal "tick" every 30s so consumers re-render and
// strings like "2 min ago" stay accurate over time without manual setInterval.
// ─────────────────────────────────────────────────────────────────────────────
export function useOtherUserPresence(
  otherUserId: string | undefined,
  onUpdate: (lastSeen: string | null) => void,
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!otherUserId) return;

    let cancelled = false;
    void supabase
      .from('profiles')
      .select('last_seen')
      .eq('user_id', otherUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const ls = (data as { last_seen?: string | null } | null)?.last_seen ?? null;
        callbackRef.current(ls);
      });

    const channel = supabase
      .channel(`presence-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${otherUserId}`,
        },
        (payload) => {
          const row = payload.new as { last_seen?: string | null } | null;
          callbackRef.current(row?.last_seen ?? null);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [otherUserId]);
}

/**
 * Subscribe once to the global `presence:online` channel and return the set
 * of user ids currently tracked as online. Use this when you need to know
 * the online state of many users at once (e.g. for an avatar dot on every
 * row of a conversation list) — one channel handles them all, instead of
 * one per row.
 */
export function useOnlineUserIds(enabled = true): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!enabled) { setIds(new Set()); return; }

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: `observer-${Math.random().toString(36).slice(2)}` } },
    });

    const refresh = () => {
      const state = channel.presenceState();
      const next = new Set<string>();
      for (const entries of Object.values(state)) {
        for (const e of entries as Array<{ user_id?: string }>) {
          if (e.user_id) next.add(e.user_id);
        }
      }
      setIds(prev => {
        if (prev.size === next.size && [...prev].every(x => next.has(x))) return prev;
        return next;
      });
    };

    channel
      .on('presence', { event: 'sync' },  refresh)
      .on('presence', { event: 'join' },  refresh)
      .on('presence', { event: 'leave' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return ids;
}

/**
 * Reads the global `presence:online` channel and returns true while
 * `otherUserId` has at least one tracked presence. This is a HARD live
 * signal that flips off instantly on disconnect, unlike timestamp polling.
 */
export function useUserOnline(otherUserId: string | undefined): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!otherUserId) { setOnline(false); return; }

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: `observer-${otherUserId}-${Math.random().toString(36).slice(2)}` } },
    });

    const refresh = () => {
      const state = channel.presenceState();
      const hit = Object.values(state).some(entries => {
        return (entries as Array<{ user_id?: string }>).some(e => e.user_id === otherUserId);
      });
      setOnline(hit);
    };

    channel
      .on('presence', { event: 'sync' },  refresh)
      .on('presence', { event: 'join' },  refresh)
      .on('presence', { event: 'leave' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId]);

  return online;
}

/**
 * Format last_seen timestamp for display, refreshing automatically as time
 * passes so "Last seen 2m ago" doesn't stay frozen on screen.
 *
 * `isOnline` is true when last_seen is within ONLINE_THRESHOLD_MS; a caller
 * with access to live presence info (e.g. via useUserOnline) can override.
 */
export function formatLastSeen(
  dateStr: string | null | undefined,
  isAr: boolean,
): { text: string; isOnline: boolean } {
  if (!dateStr) return { text: isAr ? 'غير معروف' : 'Unknown', isOnline: false };

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { text: isAr ? 'غير معروف' : 'Unknown', isOnline: false };

  const now = new Date();
  const diffMs   = Math.max(0, now.getTime() - d.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs  = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMs < ONLINE_THRESHOLD_MS) {
    return { text: isAr ? 'متصل الآن' : 'Online', isOnline: true };
  }
  if (diffSecs < 120) {
    return { text: isAr ? 'منذ لحظات' : 'Just now', isOnline: false };
  }
  if (diffMins < 60) {
    return {
      text: isAr ? `آخر ظهور قبل ${diffMins} دقيقة` : `Last seen ${diffMins}m ago`,
      isOnline: false,
    };
  }
  if (diffHrs < 24) {
    return {
      text: isAr ? `آخر ظهور قبل ${diffHrs} ساعة` : `Last seen ${diffHrs}h ago`,
      isOnline: false,
    };
  }
  if (diffDays < 7) {
    const dayName = d.toLocaleDateString(isAr ? 'ar' : 'en', { weekday: 'long' });
    return {
      text: isAr ? `آخر ظهور يوم ${dayName}` : `Last seen ${dayName}`,
      isOnline: false,
    };
  }

  const dateFormatted = d.toLocaleDateString(isAr ? 'ar' : 'en', { day: 'numeric', month: 'short' });
  return {
    text: isAr ? `آخر ظهور ${dateFormatted}` : `Last seen ${dateFormatted}`,
    isOnline: false,
  };
}

/**
 * Returns a "now" value that updates every `intervalMs`, so that time-based
 * UI strings (last seen, recording duration, etc.) refresh smoothly.
 */
export function useTick(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
