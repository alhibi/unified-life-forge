// useChatScroll — manage scroll state of the message list.
//
//   • Detect whether the user is "near the bottom" so we know when to
//     auto-scroll on incoming messages vs. show a "↓ N new" indicator.
//   • Persist last-scroll position per chat so re-entering resumes
//     where the user left off (Telegram parity).
//   • Compute the "first unread" id from the current messages list +
//     the caller's `myLastReadAt`, used as the entry-point anchor on
//     first paint of a chat with new messages.
//
// All callers pass refs to a real DOM element; we never reach into the
// DOM ourselves to keep the hook compatible with whatever container
// element the host component picks.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage } from '../types';

const NEAR_BOTTOM_PX = 120;
const SHOW_BUTTON_PX = 200;

const localKey = (chatId: string) => `ulf.chat.scroll.${chatId}`;

export interface UseChatScrollResult {
  containerRef: React.RefObject<HTMLDivElement>;
  endRef:       React.RefObject<HTMLDivElement>;
  /** Whether the user is near the bottom (auto-scroll on new). */
  isNearBottom: boolean;
  /** Whether to show the "scroll to latest" pill / button. */
  showScrollDown: boolean;
  /** Programmatic scroll (smooth by default). */
  scrollToBottom: (smooth?: boolean) => void;
  /** Hook this on the container's onScroll. */
  onScroll: () => void;
  /** Compute the id of the first unread message for the entry anchor. */
  firstUnreadId: string | null;
  /** Restore from localStorage on mount (call after first paint). */
  restoreScroll: () => void;
}

export function useChatScroll(
  chatId: string | null | undefined,
  messages: ChatMessage[],
  selfUserId: string | undefined,
  myLastReadAt: string | null | undefined,
): UseChatScrollResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef       = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const onScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const distFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
    const near = distFromBottom < NEAR_BOTTOM_PX;
    isNearBottomRef.current = near;
    setIsNearBottom(near);
    setShowScrollDown(distFromBottom > SHOW_BUTTON_PX);

    if (chatId) {
      try {
        if (distFromBottom < 80) localStorage.removeItem(localKey(chatId));
        else                     localStorage.setItem(localKey(chatId), String(c.scrollTop));
      } catch { /* quota */ }
    }
  }, [chatId]);

  const restoreScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c || !chatId) return;
    try {
      const raw = localStorage.getItem(localKey(chatId));
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) c.scrollTop = n;
      } else {
        // Default: anchor at bottom on entry.
        scrollToBottom(false);
      }
    } catch { /* no-op */ }
  }, [chatId, scrollToBottom]);

  // Auto-scroll on incoming messages when we're already at the bottom.
  // (The host component decides whether to emit a "new message" pill instead.)
  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const firstUnreadId = useMemo(() => {
    if (!myLastReadAt || !selfUserId) return null;
    const cutoff = Date.parse(myLastReadAt);
    if (!Number.isFinite(cutoff)) return null;
    for (const m of messages) {
      if (m.senderId === selfUserId) continue;
      if (Date.parse(m.createdAt) > cutoff) return m.id;
    }
    return null;
  }, [messages, myLastReadAt, selfUserId]);

  return {
    containerRef, endRef,
    isNearBottom, showScrollDown,
    scrollToBottom, onScroll,
    firstUnreadId,
    restoreScroll,
  };
}
