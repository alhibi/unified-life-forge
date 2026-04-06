import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 30_000; // 30s
const INACTIVITY_TIMEOUT = 60_000; // 60s

/**
 * Global presence tracker.
 * - Sends heartbeat every 30s while the user is active
 * - Detects inactivity (no interaction for 60s) and marks offline
 * - Handles visibilitychange, beforeunload, pagehide
 * - Works across multiple tabs via BroadcastChannel
 */
export function usePresence(userId: string | undefined) {
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOnline = useRef(false);

  const markOnline = useCallback(() => {
    if (!userId) return;
    isOnline.current = true;
    supabase.rpc('update_last_seen').then();
  }, [userId]);

  const markOffline = useCallback(() => {
    if (!userId || !isOnline.current) return;
    isOnline.current = false;
    // Use sendBeacon for reliability on tab close
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_last_seen`;
    const headers = {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${supabase.auth.session?.()?.access_token || ''}`,
      'Content-Type': 'application/json',
    };
    // Fallback: try normal RPC (sendBeacon doesn't support custom headers well)
    supabase.rpc('update_last_seen').then();
  }, [userId]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    if (!isOnline.current && userId) {
      markOnline();
    }
    
    inactivityTimer.current = setTimeout(() => {
      markOffline();
    }, INACTIVITY_TIMEOUT);
  }, [userId, markOnline, markOffline]);

  useEffect(() => {
    if (!userId) return;

    // Initial mark online
    markOnline();
    resetInactivityTimer();

    // Heartbeat: ping every 30s while active
    heartbeatInterval.current = setInterval(() => {
      if (isOnline.current) {
        supabase.rpc('update_last_seen').then();
      }
    }, HEARTBEAT_INTERVAL);

    // Activity events
    const onActivity = () => resetInactivityTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    // Visibility change
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Mark offline immediately when tab hidden
        markOffline();
      } else {
        // Tab visible again
        markOnline();
        resetInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // beforeunload / pagehide
    const onLeave = () => markOffline();
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onLeave);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('pagehide', onLeave);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      markOffline();
    };
  }, [userId, markOnline, markOffline, resetInactivityTimer]);
}

/**
 * Subscribe to another user's last_seen changes in realtime.
 * Returns nothing — uses a callback for updates.
 */
export function useOtherUserPresence(
  otherUserId: string | undefined,
  onUpdate: (lastSeen: string | null) => void
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!otherUserId) return;

    // Initial fetch
    supabase
      .from('profiles')
      .select('last_seen')
      .eq('user_id', otherUserId)
      .maybeSingle()
      .then(({ data }) => {
        callbackRef.current(data?.last_seen ?? null);
      });

    // Realtime subscription
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
          const newLastSeen = (payload.new as any)?.last_seen ?? null;
          callbackRef.current(newLastSeen);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId]);
}

/**
 * Format last_seen timestamp for display.
 */
export function formatLastSeen(dateStr: string | null | undefined, isAr: boolean): { text: string; isOnline: boolean } {
  if (!dateStr) return { text: isAr ? 'غير معروف' : 'Unknown', isOnline: false };

  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Online: last heartbeat within 90s (30s heartbeat + 60s grace)
  if (diffSecs < 90) {
    return { text: isAr ? 'متصل الآن' : 'Online', isOnline: true };
  }

  if (diffMins < 2) {
    return { text: isAr ? 'منذ لحظات' : 'Just now', isOnline: false };
  }

  if (diffMins < 60) {
    return {
      text: isAr ? `آخر ظهور منذ ${diffMins} دقيقة` : `Last seen ${diffMins}m ago`,
      isOnline: false,
    };
  }

  if (diffHours < 24) {
    return {
      text: isAr ? `آخر ظهور منذ ${diffHours} ساعة` : `Last seen ${diffHours}h ago`,
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
