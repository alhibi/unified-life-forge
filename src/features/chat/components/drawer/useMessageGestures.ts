import React, { useCallback } from 'react';

import { haptic } from '../sounds';
import type { ActionMenuState, Message } from '../types';

const LONG_PRESS_MS = 380;
/** px of movement that still counts as a press rather than a scroll */
const LONG_PRESS_TOLER = 10;
const DOUBLE_TAP_MS = 320;

interface Params {
  selectionMode: boolean;
  /** Whether a user is signed in — double-tap reactions need an author. */
  hasUser: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  setActionMenu: (state: ActionMenuState | null) => void;
  toggleSelect: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
}

export interface MessageGestures {
  /**
   * Opens the action menu anchored to a bubble element. Exposed separately
   * because the native `contextmenu` event uses it directly.
   */
  openActionMenu: (msg: Message, isMine: boolean, bubbleEl: HTMLElement) => void;
  beginLongPress: (
    msg: Message,
    isMine: boolean,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  continueLongPress: (e: React.PointerEvent<HTMLDivElement>) => void;
  endLongPress: (msg: Message, e: React.PointerEvent<HTMLDivElement>) => void;
  /** Aborts a pending press. Wired to onPointerCancel / onPointerLeave. */
  clearLongPress: (pointerId: number) => void;
  handleDoubleTapReact: (msg: Message, e: React.PointerEvent) => void;
}

/**
 * Pointer gestures for a message bubble: long-press (or contextmenu) to open
 * the action menu, tap to toggle selection while in selection mode, and
 * double-tap to toggle a heart reaction.
 *
 * Extracted from ChatDrawer.tsx, which held five interdependent callbacks and
 * three mutable refs inline. Behaviour is unchanged; the timing constants,
 * movement tolerance and per-pointer bookkeeping are the same.
 *
 * Timers and tap timestamps are keyed by pointer id / message id so multi-touch
 * and rapid taps on different bubbles do not collide.
 */
export function useMessageGestures({
  selectionMode,
  hasUser,
  messagesContainerRef,
  setActionMenu,
  toggleSelect,
  toggleReaction,
}: Params): MessageGestures {
  const longPressTimersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const longPressStartRef = React.useRef<
    Map<number, { x: number; y: number; fired: boolean }>
  >(new Map());
  const lastTapRef = React.useRef<Map<string, number>>(new Map());

  // A bare tap never opens the action menu, so users can scroll and read
  // without surprise.
  const openActionMenu = useCallback(
    (msg: Message, isMine: boolean, bubbleEl: HTMLElement) => {
      if (selectionMode) return;
      if (msg.deleted) return;
      const rect = bubbleEl.getBoundingClientRect();
      const containerRect = messagesContainerRef.current?.getBoundingClientRect() || {
        top: 0,
        bottom: window.innerHeight,
        height: window.innerHeight,
      };
      setActionMenu({
        msg,
        isMine,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
        containerRect: {
          top: containerRect.top,
          bottom: containerRect.bottom,
          height: containerRect.height,
        },
      });
      haptic('medium');
    },
    [messagesContainerRef, selectionMode, setActionMenu],
  );

  const clearLongPress = useCallback((pointerId: number) => {
    const t = longPressTimersRef.current.get(pointerId);
    if (t) {
      clearTimeout(t);
      longPressTimersRef.current.delete(pointerId);
    }
    longPressStartRef.current.delete(pointerId);
  }, []);

  const beginLongPress = useCallback(
    (msg: Message, isMine: boolean, e: React.PointerEvent<HTMLDivElement>) => {
      if (selectionMode) return;
      if (msg.deleted) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return; // only left mouse button
      const el = e.currentTarget;
      const startX = e.clientX;
      const startY = e.clientY;
      longPressStartRef.current.set(e.pointerId, { x: startX, y: startY, fired: false });
      const timer = setTimeout(() => {
        const entry = longPressStartRef.current.get(e.pointerId);
        if (!entry) return;
        entry.fired = true;
        openActionMenu(msg, isMine, el);
      }, LONG_PRESS_MS);
      longPressTimersRef.current.set(e.pointerId, timer);
    },
    [selectionMode, openActionMenu],
  );

  const continueLongPress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const entry = longPressStartRef.current.get(e.pointerId);
      if (!entry) return;
      const dx = e.clientX - entry.x;
      const dy = e.clientY - entry.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_TOLER) clearLongPress(e.pointerId);
    },
    [clearLongPress],
  );

  const endLongPress = useCallback(
    (msg: Message, e: React.PointerEvent<HTMLDivElement>) => {
      const entry = longPressStartRef.current.get(e.pointerId);
      const fired = entry?.fired ?? false;
      clearLongPress(e.pointerId);
      // If the user simply tapped in selection mode, toggle the selection.
      if (!fired && selectionMode && !msg.deleted) {
        toggleSelect(msg.id);
      }
    },
    // The original also listed chat.messages.length, which this callback never
    // reads; dropping it removes a re-creation on every incoming message.
    [clearLongPress, selectionMode, toggleSelect],
  );

  // Clean up any in-flight long-press timers on unmount.
  React.useEffect(() => {
    const timers = longPressTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const handleDoubleTapReact = useCallback(
    (msg: Message, e: React.PointerEvent) => {
      if (!hasUser) return;
      if (selectionMode || msg.deleted) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const now = Date.now();
      const last = lastTapRef.current.get(msg.id) || 0;
      if (now - last < DOUBLE_TAP_MS) {
        toggleReaction(msg.id, '❤️');
        haptic('medium');
        lastTapRef.current.delete(msg.id);
      } else {
        lastTapRef.current.set(msg.id, now);
      }
    },
    [hasUser, selectionMode, toggleReaction],
  );

  return {
    openActionMenu,
    beginLongPress,
    continueLongPress,
    endLongPress,
    clearLongPress,
    handleDoubleTapReact,
  };
}
