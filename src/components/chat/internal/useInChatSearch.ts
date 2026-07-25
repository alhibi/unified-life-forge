import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation, Message } from '../types';

interface UseInChatSearchArgs {
  activeConv: Conversation | null;
  messages: Message[];
}

/**
 * Find-in-conversation search for the 1:1 chat: a cursor over hits inside the
 * *currently open* thread, driven by the `search_chat_messages` RPC (Postgres
 * FTS with Arabic normalisation) with a client-side substring fallback while
 * the RPC is in flight or when it errors.
 *
 * Renamed from `useChatSearch` because `src/lib/chat/hooks/useChatSearch.ts`
 * already owned that name for a different contract — searching ACROSS
 * conversations and returning highlighted snippets. Two hooks with one name
 * and incompatible return shapes is how you end up importing the wrong one.
 */
export function useInChatSearch({ activeConv, messages }: UseInChatSearchArgs) {
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const searchInChat = useCallback(async (query: string) => {
    setChatSearchQuery(query);
    const trimmed = query.trim();
    if (!trimmed) { setSearchResults([]); setSearchIndex(0); return; }
    if (!activeConv) { setSearchResults([]); setSearchIndex(0); return; }

    const q = trimmed.toLowerCase();
    const local = messages.filter(m =>
      !m.deleted && m.message_type === 'text' && m.content.toLowerCase().includes(q),
    );
    setSearchResults(local);
    setSearchIndex(local.length > 0 ? local.length - 1 : 0);

    try {
      const { data, error } = await (supabase.rpc as any)('search_chat_messages', {
        p_query:   trimmed,
        p_chat_id: null,
        p_limit:   200,
      });
      if (error) throw error;

      const hits = ((data ?? []) as unknown) as Array<{
        message_id:      string;
        conversation_id: string;
        chat_id:         string | null;
      }>;
      const byId = new Map<string, Message>();
      for (const m of messages) byId.set(m.id, m);
      const ranked: Message[] = [];
      for (const h of hits) {
        if (h.conversation_id !== activeConv.id) continue;
        const found = byId.get(h.message_id);
        if (!found || found.deleted) continue;
        ranked.push(found);
      }
      ranked.sort((a, b) => a.created_at.localeCompare(b.created_at));

      if (ranked.length > 0) {
        setSearchResults(ranked);
        setSearchIndex(ranked.length - 1);
        const last = ranked[ranked.length - 1];
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${last.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else if (local.length > 0) {
        const last = local[local.length - 1];
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${last.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    } catch (err) {
      console.warn('[chat] search_chat_messages RPC failed', err);
      if (local.length > 0) {
        const last = local[local.length - 1];
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${last.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [activeConv, messages]);

  const navigateSearch = useCallback((direction: 'up' | 'down') => {
    if (searchResults.length === 0) return;
    const newIdx = direction === 'up'
      ? Math.max(0, searchIndex - 1)
      : Math.min(searchResults.length - 1, searchIndex + 1);
    setSearchIndex(newIdx);
    const el = document.getElementById(`msg-${searchResults[newIdx].id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchResults, searchIndex]);

  /** Clear all search state — call when the active conversation changes. */
  const resetSearch = useCallback(() => {
    setShowSearch(false);
    setChatSearchQuery('');
    setSearchResults([]);
    setSearchIndex(0);
  }, []);

  return {
    showSearch, setShowSearch,
    chatSearchQuery,
    searchResults,
    searchIndex,
    searchInChat,
    navigateSearch,
    resetSearch,
  };
}