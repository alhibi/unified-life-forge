import {
  useEffect, useLayoutEffect, useMemo, useRef,
  type ReactNode, type CSSProperties,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// VirtualMessageList
//
// Why a wrapper instead of using `useVirtualizer` directly inside ChatDrawer?
//   ChatDrawer's render loop is dense (4 message types, reactions, replies,
//   forwarded badges, selection mode, voice player wiring, etc.). Pulling
//   that JSX into a generic component would force an unnatural prop fan-out.
//   Instead, we keep the per-row JSX *exactly* where it lives — inside
//   ChatDrawer — and provide a thin wrapper that takes a render-prop
//   `renderRow(msg, idx)` and applies windowing on top.
//
// Activation policy
//   The wrapper opts into virtualization only when `messages.length` exceeds
//   `VIRTUALIZE_THRESHOLD`. For small chats (the vast majority) the cost of
//   absolute positioning + measureElement isn't worth the marginal frame
//   savings, and we keep behaviour identical to the legacy renderer.
//
// Why `measureElement` over fixed sizes?
//   Chat rows are wildly variable: one-line text vs paragraph vs image
//   vs voice waveform vs file card. A fixed `estimateSize` would jitter
//   the scrollbar dramatically. `measureElement` reads the real height
//   after layout and caches it per index, costing one rAF per new row
//   and zero on already-measured rows.
//
// Scroll- support
//   Replies, search hits, and "jump to message" all use a string `id`
//   on a DOM node (`msg-<uuid>`). When a target row is OUTSIDE the
//   currently-rendered window the DOM node doesn't exist, so the
//   classical `getElementById().scrollIntoView()` no-ops. We expose
//   `scrollToMessage(id)` via a ref handle so callers can route through
//   the virtualizer's `scrollToIndex` instead.
//
// Anchor-on-append
//   When `messages` grows by one at the tail (the user just sent or
//   received a row), we follow the bottom only if the user was already
//   near the bottom — same heuristic ChatDrawer already uses outside
//   the virtualizer (`isNearBottomRef`). The wrapper exposes a
//   `stickToBottom()` method the parent can call after a send/receive.
// ─────────────────────────────────────────────────────────────────────────────

/** Below this count we render eagerly without windowing — cheaper than
 *  paying for absolute positioning + measureElement on small chats. */
const VIRTUALIZE_THRESHOLD = 60;

/** Initial size estimate (px) for a not-yet-measured row. Picked at the
 *  middle of the empirical distribution: most rows are 36–80 px (single
 *  line text) but some go to 280+ (image). Choosing 72 keeps initial
 *  scroll positioning closer to truth than the library default of 50. */
const DEFAULT_ROW_HEIGHT = 72;

/** Number of rows to render outside the visible window. Higher values
 *  mask measureElement jitter at the cost of a larger DOM. 8 is enough
 *  to absorb fast-flick scrolling without the user catching the empty
 *  zone, while staying lean on lower-end devices. */
const OVERSCAN = 8;

/** Distance from bottom (px) to consider "near bottom" for auto-follow. */
const NEAR_BOTTOM_PX = 250;

export interface VirtualMessageListHandle {
  /**
   * Scroll the message with the given id into view. No-op if the message
   * isn't in `messages`. Used by reply previews, search jumps, and the
   * "scroll to original" affordance on quoted messages.
   */
  scrollToMessage: (id: string, opts?: { align?: 'start' | 'center' | 'end'; behavior?: 'auto' | 'smooth' }) => void;
  /** Scroll to the very last message. Used after send / receive. */
  scrollToBottom: (opts?: { behavior?: 'auto' | 'smooth' }) => void;
  /** Returns true if the user is currently near the bottom of the chat. */
  isNearBottom: () => boolean;
  /** Get the current scroll position for restoration. */
  getScrollOffset: () => number;
}

interface VirtualMessageListProps {
  /**
   * The full ordered list of messages. Must be reference-stable per
   * logical change (i.e. don't pass a freshly-mapped array on every
   * render) for the virtualizer's caching to work.
   */
  messages: Message[];
  /**
   * The scroll container. Same node ChatDrawer's existing render uses
   * (`messagesContainerRef`). The virtualizer reads scrollTop / clientHeight
   * from this element.
   */
  scrollElementRef: React.RefObject<HTMLElement>;
  /**
   * Render function for a single message row. Returns the entire JSX
   * that ChatDrawer used to render — including day separator, unread
   * divider, bubble, reactions. The wrapper does not interpret it.
   */
  renderRow: (msg: Message, index: number) => ReactNode;
  /** Imperative handle so callers can scroll- / scroll-. */
  handleRef?: React.MutableRefObject<VirtualMessageListHandle | null>;
  /** Override the activation threshold. Useful for tests. */
  threshold?: number;
  /** Callback when user scrolls away from bottom (to show "scroll down" FAB). */
  onScrollAwayFromBottom?: (away: boolean) => void;
  /** Callback when user reaches the top (for loading older messages). */
  onReachTop?: () => void;
}

export function VirtualMessageList({
  messages,
  scrollElementRef,
  renderRow,
  handleRef,
  threshold = VIRTUALIZE_THRESHOLD,
  onScrollAwayFromBottom,
  onReachTop,
}: VirtualMessageListProps) {
  // ── Virtualizer setup ──────────────────────────────────────────────────────
  // We always create the virtualizer (cheap when count is small) so the
  // imperative handle is available regardless of activation. The actual
  // *rendering* path branches on `shouldVirtualize` below.
  const getScrollElement = useMemo(
    () => () => scrollElementRef.current,
    [scrollElementRef],
  );

  // Stable ID-keyed virtualizer. The default `getItemKey` uses the index,
  // which causes height misattribution when rows are inserted mid-list
  // (e.g. an older page being prepended). Keying by message id keeps
  // measurements stable across array shifts.
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement,
    estimateSize: () => DEFAULT_ROW_HEIGHT,
    getItemKey: (index) => messages[index]?.id ?? `idx-${index}`,
    overscan: OVERSCAN,
    measureElement: typeof window !== 'undefined' && 'ResizeObserver' in window
      ? (el) => el?.getBoundingClientRect().height ?? DEFAULT_ROW_HEIGHT
      : undefined,
  });

  const shouldVirtualize = messages.length >= threshold;

  // ── Imperative handle ──────────────────────────────────────────────────────
  // Build a stable mapping id → index so scroll- is O(1).
  const idIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < messages.length; i++) m.set(messages[i].id, i);
    return m;
  }, [messages]);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      scrollToMessage: (id, opts) => {
        const idx = idIndexMap.get(id);
        if (idx == null) return;
        if (shouldVirtualize) {
          virtualizer.scrollToIndex(idx, {
            align: opts?.align ?? 'center',
            behavior: opts?.behavior ?? 'smooth',
          });
        } else {
          const el = document.getElementById(`msg-${id}`);
          if (el) el.scrollIntoView({
            block:    opts?.align === 'start' ? 'start' : opts?.align === 'end' ? 'end' : 'center',
            behavior: opts?.behavior ?? 'smooth',
          });
        }
      },
      scrollToBottom: (opts) => {
        if (messages.length === 0) return;
        if (shouldVirtualize) {
          virtualizer.scrollToIndex(messages.length - 1, {
            align: 'end',
            behavior: opts?.behavior ?? 'smooth',
          });
        } else {
          const el = scrollElementRef.current;
          if (!el) return;
          el.scrollTo({
            top:      el.scrollHeight,
            behavior: opts?.behavior ?? 'smooth',
          });
        }
      },
      isNearBottom: () => {
        const el = scrollElementRef.current;
        if (!el) return true;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        return distFromBottom < NEAR_BOTTOM_PX;
      },
      getScrollOffset: () => {
        const el = scrollElementRef.current;
        return el?.scrollTop ?? 0;
      },
    };
    return () => {
      if (handleRef.current) handleRef.current = null;
    };
  }, [handleRef, idIndexMap, virtualizer, shouldVirtualize, messages.length, scrollElementRef]);

  // ── Bottom-anchor on append ────────────────────────────────────────────────
  // When a new row appends to the end AND the user is already near the
  // bottom, we follow it. Detection is by comparing the previous count.
  const prevCountRef = useRef(messages.length);
  useLayoutEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = messages.length;
    if (!shouldVirtualize) return;
    if (messages.length <= prev) return;       // no new rows / page prepend
    const el = scrollElementRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < NEAR_BOTTOM_PX) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'auto' });
    }
  }, [messages.length, shouldVirtualize, scrollElementRef, virtualizer]);

  // ── Scroll position monitoring ─────────────────────────────────────────────
  // Report scroll-away- and reach-top events to the parent.
  useEffect(() => {
    const el = scrollElementRef.current;
    if (!el) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        onScrollAwayFromBottom?.(distFromBottom > NEAR_BOTTOM_PX);
        // Trigger load-more when scrolled to the top
        if (el.scrollTop < 80 && onReachTop) {
          onReachTop();
        }
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollElementRef, onScrollAwayFromBottom, onReachTop]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!shouldVirtualize) {
    // Eager path: identical to the legacy render. No absolute positioning,
    // no measure overhead. The imperative handle still works (uses
    // getElementById in this branch).
    return (
      <>
        {messages.map((msg, idx) => (
          <div key={msg.id} data-msg-row data-msg-id={msg.id} data-msg-index={idx}>
            {renderRow(msg, idx)}
          </div>
        ))}
      </>
    );
  }

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // The container is `position: relative` and sized to the full virtual
  // height. Each row is absolutely positioned at its measured offset.
  // `data-msg-id` mirrors the legacy `id="msg-<uuid>"` so any code path
  // that still does `document.getElementById('msg-<uuid>')` keeps working
  // when the row is inside the rendered window.
  const containerStyle: CSSProperties = {
    height:   `${totalSize}px`,
    width:    '100%',
    position: 'relative',
  };

  return (
    <div data-virtual-message-list style={containerStyle}>
      {items.map((vi) => {
        const msg = messages[vi.index];
        if (!msg) return null;
        return (
          <div
            key={vi.key}
            data-msg-row
            data-msg-id={msg.id}
            data-msg-index={vi.index}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position:  'absolute',
              top:       0,
              left:      0,
              width:     '100%',
              transform: `translateY(${vi.start}px)`,
            }}
          >
            {renderRow(msg, vi.index)}
          </div>
        );
      })}
    </div>
  );
}
