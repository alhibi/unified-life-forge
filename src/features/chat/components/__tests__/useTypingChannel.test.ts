import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTypingChannel } from '../internal/useTypingChannel';
import type { Conversation } from '../types';

// Let's mock typingChannels
const mockTrack = vi.fn();
const mockUntrack = vi.fn();

const mockChannel = {
  track: mockTrack,
  untrack: mockUntrack,
};

// Maps convId -> set of listeners
let mockOnChangeListeners = new Map<string, Set<(state: any) => void>>();
const mockRelease = vi.fn();

vi.mock('../typingChannels', () => {
  return {
    acquireTypingChannel: vi.fn().mockImplementation((convId: string, presenceKey: string) => {
      if (!mockOnChangeListeners.has(convId)) {
        mockOnChangeListeners.set(convId, new Set());
      }
      return {
        channel: mockChannel,
        getState: () => ({}),
        onChange: (cb: (state: any) => void) => {
          mockOnChangeListeners.get(convId)!.add(cb);
          return () => {
            mockOnChangeListeners.get(convId)!.delete(cb);
          };
        },
        release: mockRelease,
      };
    }),
  };
});

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
  };
});

describe('useTypingChannel hook tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockOnChangeListeners = new Map();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockUser = 'user-123';
  const mockConversations: Conversation[] = [
    { id: 'conv-1', user1_id: 'user-123', user2_id: 'user-456', updated_at: '2025-01-01' },
    { id: 'conv-2', user1_id: 'user-123', user2_id: 'user-789', updated_at: '2025-01-01' },
  ];

  it('does nothing when open is false or params are incomplete', () => {
    const { result } = renderHook(() =>
      useTypingChannel({
        open: false,
        userId: undefined,
        activeConv: null,
        conversations: [],
      }),
    );

    expect(result.current.typingUser).toBe(false);
    expect(result.current.typingByConv).toEqual({});
  });

  it('handles active conversation typing state presence updates', async () => {
    const activeConv = mockConversations[0];
    const { result } = renderHook(() =>
      useTypingChannel({
        open: true,
        userId: mockUser,
        activeConv,
        conversations: [],
      }),
    );

    expect(result.current.typingUser).toBe(false);

    // Simulate other user typing state update
    const listeners = mockOnChangeListeners.get('conv-1');
    expect(listeners).toBeDefined();
    expect(listeners?.size).toBe(1);

    // Call listener with typing is true for another user
    act(() => {
      listeners?.forEach((cb) =>
        cb({
          'user-456': [{ typing: true }],
        }),
      );
    });

    expect(result.current.typingUser).toBe(true);

    // Call listener with typing is false
    act(() => {
      listeners?.forEach((cb) =>
        cb({
          'user-456': [{ typing: false }],
        }),
      );
    });

    expect(result.current.typingUser).toBe(false);
  });

  it('resets typing user after TYPING_STALE_MS timeout', async () => {
    const activeConv = mockConversations[0];
    const { result } = renderHook(() =>
      useTypingChannel({
        open: true,
        userId: mockUser,
        activeConv,
        conversations: [],
      }),
    );

    const listeners = mockOnChangeListeners.get('conv-1');
    act(() => {
      listeners?.forEach((cb) =>
        cb({
          'user-456': [{ typing: true }],
        }),
      );
    });

    expect(result.current.typingUser).toBe(true);

    // Advance time by 5000ms - should still be typing
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.typingUser).toBe(true);

    // Advance time to 6000ms - should reset
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.typingUser).toBe(false);
  });

  it('tracks typing state for conversations in the visible list', () => {
    const { result } = renderHook(() =>
      useTypingChannel({
        open: true,
        userId: mockUser,
        activeConv: null,
        conversations: mockConversations,
      }),
    );

    expect(result.current.typingByConv).toEqual({});

    // Verify channel is acquired for each conversation in list
    const listeners1 = mockOnChangeListeners.get('conv-1');
    const listeners2 = mockOnChangeListeners.get('conv-2');
    expect(listeners1).toBeDefined();
    expect(listeners2).toBeDefined();

    // Trigger typing update on conv-1
    act(() => {
      listeners1?.forEach((cb) =>
        cb({
          'user-456': [{ typing: true }],
        }),
      );
    });

    expect(result.current.typingByConv).toEqual({
      'conv-1': true,
    });

    // Trigger typing update on conv-2
    act(() => {
      listeners2?.forEach((cb) =>
        cb({
          'user-789': [{ typing: true }],
        }),
      );
    });

    expect(result.current.typingByConv).toEqual({
      'conv-1': true,
      'conv-2': true,
    });

    // Trigger untype on conv-1
    act(() => {
      listeners1?.forEach((cb) =>
        cb({
          'user-456': [{ typing: false }],
        }),
      );
    });

    expect(result.current.typingByConv).toEqual({
      'conv-1': false,
      'conv-2': true,
    });
  });

  it('notifies and stops typing properly with throttling', () => {
    const activeConv = mockConversations[0];
    const { result } = renderHook(() =>
      useTypingChannel({
        open: true,
        userId: mockUser,
        activeConv,
        conversations: [],
      }),
    );

    // Initial call to notifyTyping should track and set timeout
    act(() => {
      result.current.notifyTyping();
    });

    expect(mockTrack).toHaveBeenCalledWith({ typing: true });
    vi.clearAllMocks();

    // Secondary call within 1000ms should be throttled (no second track call)
    act(() => {
      vi.advanceTimersByTime(500);
      result.current.notifyTyping();
    });
    expect(mockTrack).not.toHaveBeenCalled();

    // After 1000ms, subsequent notifyTyping should call track again
    act(() => {
      vi.advanceTimersByTime(600); // Total 1100ms
      result.current.notifyTyping();
    });
    expect(mockTrack).toHaveBeenCalledWith({ typing: true });
    vi.clearAllMocks();

    // Let the 1500ms timeout expire - should automatically untrack
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(mockTrack).toHaveBeenCalledWith({ typing: false });
    vi.clearAllMocks();

    // notifyTyping and then immediate stopTyping
    act(() => {
      result.current.notifyTyping();
    });
    expect(mockTrack).toHaveBeenCalledWith({ typing: true });
    vi.clearAllMocks();

    act(() => {
      result.current.stopTyping();
    });
    expect(mockTrack).toHaveBeenCalledWith({ typing: false });
  });

  it('releases resources on unmount', () => {
    const activeConv = mockConversations[0];
    const { unmount } = renderHook(() =>
      useTypingChannel({
        open: true,
        userId: mockUser,
        activeConv,
        conversations: mockConversations,
      }),
    );

    expect(mockRelease).not.toHaveBeenCalled();

    unmount();

    // active channel + 2 list channels should be released
    expect(mockRelease).toHaveBeenCalledTimes(3);
  });
});
