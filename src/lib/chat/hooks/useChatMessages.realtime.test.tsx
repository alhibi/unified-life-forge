import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { type ReactNode,StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Regression guard for "cannot add postgres_changes callbacks after
 * subscribe()": the real client returns the still-registered channel for a
 * reused topic, so every subscription must use its own topic and be removed.
 */
const topics: string[] = [];
const removed: string[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const channel = (topic: string) => {
    topics.push(topic);
    let subscribed = false;
    const ch = {
      topic,
      on() {
        if (subscribed) throw new Error('cannot add postgres_changes callbacks after subscribe()');
        return ch;
      },
      subscribe() {
        subscribed = true;
        return ch;
      },
    };
    return ch;
  };
  return {
    isSupabaseConfigured: true,
    supabase: {
      channel,
      removeChannel: (ch: { topic: string }) => {
        removed.push(ch.topic);
        return Promise.resolve('ok');
      },
    },
  };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'viewer-1' } }) }));
vi.mock('../api', () => ({ fetchMessagesPage: vi.fn(() => new Promise(() => {})) }));
vi.mock('../idbCache', () => ({
  cacheMessages: vi.fn(),
  deleteCachedMessage: vi.fn(),
  readCachedMessages: vi.fn(() => Promise.resolve([])),
  reconcileMessageByClientId: vi.fn(),
}));

import { useChatMessages } from './useChatMessages';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <StrictMode>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </StrictMode>
  );
}

describe('useChatMessages realtime lifecycle', () => {
  it('uses a fresh topic per subscription and removes every one', () => {
    const { rerender, unmount } = renderHook(({ id }) => useChatMessages(id), {
      wrapper,
      initialProps: { id: 'chat-a' as string | null },
    });
    rerender({ id: 'chat-b' });
    unmount();

    expect(topics.length).toBeGreaterThanOrEqual(2); // one per chat, plus any Strict Mode remount
    expect(new Set(topics).size).toBe(topics.length);
    expect(topics.every((t) => t.startsWith('chat:chat-'))).toBe(true);
    expect([...removed].sort()).toEqual([...topics].sort());
  });
});
