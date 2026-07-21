// @ts-nocheck — schema mismatch: code references tables/RPCs not in current generated types
// ─────────────────────────────────────────────────────────────────────────────
// useChatSearch — server-side full-text search over chat messages.
//
// Drives the search bar inside an active chat (and, in the future, the
// global "search across all conversations" panel). Backed by the
// `search_chat_messages` RPC introduced in the chat-wave-2 FTS migration.
//
// Why a server-side hook?
//   • Until now, in-chat search was client-side: `messages.filter(m =>
//     m.content.includes(q))`. That only matched what was already loaded
//     in memory and was case- and diacritic-naïve, which means an Arabic
//     user typing `الله` would not find `اللّٰه` (extra shadda + dagger
//     alif) even though they are visually identical. The server-side
//     pipeline normalizes both sides through `normalize_arabic` before
//     ranking, so visual matches always win.
//   • Ranking. `ts_rank_cd` returns hits in best-match order rather than
//     creation order, so the first highlight the user sees is the most
//     relevant one. Less scrolling.
//   • Snippets with `<mark>` tags so a future cross-chat panel can show
//     a 1-line preview centred on the matched lexeme without re-scanning
//     content client-side.
//
// Lifecycle
//   The hook is a thin wrapper over `useQuery`. Queries are keyed by
//   (query, chatId) and cached for 30s — short enough that a fresh
//   message arriving via realtime is searchable within a tick of its
//   delivery, long enough that toggling the search bar back and forth
//   doesn't burn an RPC call each time.
//
// Debouncing
//   Most callers should debounce the query string in their input handler
//   (e.g. 200 ms) before passing it here. The hook itself does not
//   debounce so the same input can drive a separate, instant client-side
//   highlight pass while the RPC is in flight.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

/** A single hit returned by the FTS RPC. Mirrors the SQL TABLE result. */
export interface ChatSearchHit {
  /** UUID of the matching message. */
  messageId: string;
  /** UUID of the chat (unified path). NULL for legacy DM-only rows. */
  chatId: string | null;
  /** UUID of the legacy DM conversation. Always populated. */
  conversationId: string;
  /** UUID of the message author. */
  senderId: string;
  /** The message body, exactly as stored. */
  content: string;
  /** `text` / `image` / `voice` / `file` / etc. */
  messageType: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Server-rendered snippet with `<mark>…</mark>` wrapping each match.
   *  At most one fragment, ≤ 24 words. Safe to render only via the
   *  helper `renderSearchSnippet` below — never through dangerouslySet. */
  snippet: string;
  /** ts_rank_cd score. Larger is better. Useful for the "Top results" badge. */
  rank: number;
}

/** Optional scope. NULL/undefined searches every conversation the caller
 *  participates in. */
export interface UseChatSearchOptions {
  /** UUID of the chat to scope the search to. NULL = global. */
  chatId?: string | null;
  /** Max hits to return. Server-clamped to [1, 200]. Defaults to 50. */
  limit?: number;
  /** Set false to keep the hook idle (e.g. while the search bar is closed). */
  enabled?: boolean;
}

export interface UseChatSearchResult {
  hits: ChatSearchHit[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  /** Convenience — true iff a non-empty query was sent and produced no
   *  hits. Lets the UI render an "empty" state without re-checking
   *  `data?.length` plus the query string itself. */
  isEmpty: boolean;
}

/**
 * Run a full-text search against the caller's messages and return ranked,
 * snippet-highlighted hits.
 *
 * Pass an empty / whitespace-only `query` to keep the hook idle — no
 * network call is made and `hits` is the empty array. This is the
 * "untyped" steady state of the search bar.
 */
export function useChatSearch(
  query: string,
  opts: UseChatSearchOptions = {},
): UseChatSearchResult {
  const trimmed = query.trim();
  const enabled = (opts.enabled ?? true) && trimmed.length > 0 && isSupabaseConfigured;
  const chatId  = opts.chatId ?? null;
  const limit   = Math.max(1, Math.min(opts.limit ?? 50, 200));

  const result: UseQueryResult<ChatSearchHit[], Error> = useQuery({
    queryKey: ['chat', 'search', trimmed, chatId, limit],
    enabled,
    // Quite short — the goal is freshness without thrashing the server
    // when the user toggles the search bar in and out.
    staleTime: 30_000,
    gcTime:    5 * 60_000,
    retry: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_chat_messages', {
        p_query:   trimmed,
        p_chat_id: chatId,
        p_limit:   limit,
      });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{
        message_id:      string;
        chat_id:         string | null;
        conversation_id: string;
        sender_id:       string;
        content:         string;
        message_type:    string;
        created_at:      string;
        snippet:         string;
        rank:            number;
      }>;
      return rows.map<ChatSearchHit>((r) => ({
        messageId:      r.message_id,
        chatId:         r.chat_id,
        conversationId: r.conversation_id,
        senderId:       r.sender_id,
        content:        r.content,
        messageType:    r.message_type,
        createdAt:      r.created_at,
        snippet:        r.snippet ?? '',
        rank:           r.rank ?? 0,
      }));
    },
  });

  const hits = useMemo<ChatSearchHit[]>(() => result.data ?? [], [result.data]);

  return {
    hits,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      (result.error as Error) ?? null,
    isEmpty:    enabled && !result.isLoading && hits.length === 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Snippet rendering helper.
//
// The RPC's `snippet` column embeds `<mark>…</mark>` tags. We never render
// it via `dangerouslySetInnerHTML` — instead we parse the simple grammar
// into a list of [text, isMatch] segments and render plain React.
// ─────────────────────────────────────────────────────────────────────────────

export interface SnippetSegment {
  text: string;
  isMatch: boolean;
}

const MARK_OPEN  = '<mark>';
const MARK_CLOSE = '</mark>';

/**
 * Parse a server snippet ("foo <mark>bar</mark> baz") into a list of
 * segments suitable for direct React rendering. Strips any unbalanced
 * markers defensively — even though `ts_headline` always emits balanced
 * pairs, we don't want a parsing bug to turn into an XSS surface.
 */
export function parseSnippet(snippet: string): SnippetSegment[] {
  if (!snippet) return [];
  const out: SnippetSegment[] = [];
  let i = 0;
  while (i < snippet.length) {
    const open = snippet.indexOf(MARK_OPEN, i);
    if (open === -1) {
      const text = snippet.slice(i).replace(/<\/?mark>/gi, '');
      out.push({ text, isMatch: false });
      break;
    }
    if (open > i) {
      const text = snippet.slice(i, open).replace(/<\/?mark>/gi, '');
      out.push({ text, isMatch: false });
    }
    const close = snippet.indexOf(MARK_CLOSE, open + MARK_OPEN.length);
    if (close === -1) {
      // Unbalanced — treat the rest as plain text and bail.
      const text = snippet.slice(open + MARK_OPEN.length).replace(/<\/?mark>/gi, '');
      out.push({ text, isMatch: false });
      break;
    }
    const text = snippet.slice(open + MARK_OPEN.length, close).replace(/<\/?mark>/gi, '');
    out.push({ text, isMatch: true });
    i = close + MARK_CLOSE.length;
  }
  return out;
}

/**
 * Render a server snippet safely into React elements.
 * Treats segment texts as plain text to prevent any HTML injection or XSS.
 * Safe to render — never uses dangerouslySetInnerHTML.
 */
export function renderSearchSnippet(snippet: string): React.ReactNode {
  const segments = parseSnippet(snippet);
  return segments.map((s, idx) => {
    if (s.isMatch) {
      return React.createElement('mark', { key: idx }, s.text);
    }
    return React.createElement('span', { key: idx }, s.text);
  });
}