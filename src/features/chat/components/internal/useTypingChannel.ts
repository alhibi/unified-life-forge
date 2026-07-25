import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { acquireTypingChannel } from '../typingChannels';
import type { Conversation } from '../types';

interface UseTypingChannelArgs {
  open: boolean;
  userId: string | undefined;
  activeConv: Conversation | null;
  conversations: Conversation[];
}

const MAX_LIST_TYPING_CHANNELS = 40;
const TYPING_STALE_MS = 6000;

/**
 * Owns the "is the other user typing?" realtime presence — both for the
 * active conversation (drives the typing dots) and for the visible portion
 * of the conversation list (drives the "…" indicator on each row).
 *
 * `notifyTyping()` = call while the local user is composing.
 * `stopTyping()`   = call the instant a message is sent, so the peer's dots
 *                    disappear immediately instead of after the 1.5s idle
 *                    debounce.
 */
export function useTypingChannel({ open, userId, activeConv, conversations }: UseTypingChannelArgs) {
  const [typingUser, setTypingUser] = useState(false);
  const [typingByConv, setTypingByConv] = useState<Record<string, boolean>>({});

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingThrottleRef = useRef(0);

  // ── Active-conversation typing ────────────────────────────────────────────
  useEffect(() => {
    if (!activeConv || !userId) return;
    setTypingUser(false);

    const armStale = () => {
      if (typingStaleTimerRef.current) clearTimeout(typingStaleTimerRef.current);
      typingStaleTimerRef.current = setTimeout(() => setTypingUser(false), TYPING_STALE_MS);
    };
    const disarmStale = () => {
      if (typingStaleTimerRef.current) {
        clearTimeout(typingStaleTimerRef.current);
        typingStaleTimerRef.current = null;
      }
    };

    const handle = acquireTypingChannel(activeConv.id, userId);
    typingChannelRef.current = handle.channel;

    const offChange = handle.onChange((state) => {
      const others = Object.entries(state).filter(([k]) => k !== userId);
      const isTyping = others.some(([, presences]) =>
        (presences as Array<Record<string, unknown>>).some(p => p.typing === true),
      );
      setTypingUser(isTyping);
      if (isTyping) armStale(); else disarmStale();
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      disarmStale();
      try { handle.channel.track({ typing: false }); } catch { /* no-op */ }
      try { handle.channel.untrack(); } catch { /* no-op */ }
      typingChannelRef.current = null;
      typingThrottleRef.current = 0;
      offChange();
      handle.release();
    };
  }, [activeConv, userId]);

  // ── Typing-in-conversation-list ──────────────────────────────────────────
  const convIdsForTyping = useMemo(
    () => conversations.slice(0, MAX_LIST_TYPING_CHANNELS).map(c => c.id).sort().join(','),
    [conversations],
  );
  useEffect(() => {
    if (!open || !userId || !convIdsForTyping) return;
    const ids = convIdsForTyping.split(',').filter(Boolean);
    const handles = ids.map(convId => {
      const handle = acquireTypingChannel(convId, userId);
      const off = handle.onChange((state) => {
        const others = Object.entries(state).filter(([k]) => k !== userId);
        const typing = others.some(([, entries]) =>
          (entries as Array<Record<string, unknown>>).some(e => e.typing === true),
        );
        setTypingByConv(prev => {
          if (prev[convId] === typing) return prev;
          return { ...prev, [convId]: typing };
        });
      });
      return { off, handle };
    });
    return () => {
      handles.forEach(({ off, handle }) => { off(); handle.release(); });
      setTypingByConv({});
    };
  }, [open, userId, convIdsForTyping]);

  const notifyTyping = useCallback(() => {
    if (!typingChannelRef.current) return;
    const now = Date.now();
    if (now - typingThrottleRef.current >= 1000) {
      typingThrottleRef.current = now;
      typingChannelRef.current.track({ typing: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ typing: false });
      typingThrottleRef.current = 0;
    }, 1500);
  }, []);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingChannelRef.current?.track({ typing: false });
  }, []);

  return { typingUser, typingByConv, notifyTyping, stopTyping };
}