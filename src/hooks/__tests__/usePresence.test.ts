import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';

interface MockChannelType {
  on: (
    event: string,
    filter: Record<string, string> | ((payload: unknown) => void),
    cb?: (payload: unknown) => void,
  ) => MockChannelType;
  subscribe: () => MockChannelType;
  track: (presence: Record<string, unknown>) => void;
  untrack: () => void;
  presenceState: () => Record<string, unknown[]>;
  state: string;
}

// Keep track of presence callbacks registered
let presenceCallbacks: Record<string, (payload?: unknown) => void> = {};

const mockChannel: MockChannelType = {
  on(
    event: string,
    filter: Record<string, string> | ((payload: unknown) => void),
    cb?: (payload: unknown) => void,
  ) {
    const callback = (cb || filter) as (payload?: unknown) => void;
    if (event === 'presence') {
      const subEvent =
        (typeof filter === 'object' && filter !== null ? filter.event : 'sync') || 'sync';
      presenceCallbacks[subEvent] = callback;
    } else if (event === 'postgres_changes') {
      presenceCallbacks['postgres_changes'] = callback;
    }
    return this;
  },
  subscribe() {
    return this;
  },
  track: vi.fn(),
  untrack: vi.fn(),
  presenceState: vi.fn().mockReturnValue({}),
  state: 'joined',
};

// We mock Supabase client and its realtime behavior
vi.mock('@/integrations/supabase/client', () => {
  const client = {
    channel: vi.fn().mockImplementation(() => mockChannel),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: client,
  };
});

interface MockBCListener {
  onmessage: ((ev: MessageEvent) => void) | null;
}

describe('usePresence module tests', () => {
  let originalBroadcastChannel: typeof BroadcastChannel;
  let postMessageMock: any;
  let closeMock: any;
  let bcListeners: MockBCListener[] = [];
  let originalVisibilityState: PropertyDescriptor | undefined;

  beforeEach(() => {
    presenceCallbacks = {};
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();

    originalBroadcastChannel = global.BroadcastChannel;
    postMessageMock = vi.fn();
    closeMock = vi.fn();
    bcListeners = [];

    // Mock BroadcastChannel
    global.BroadcastChannel = class {
      name: string;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      constructor(name: string) {
        this.name = name;
        bcListeners.push(this);
      }
      postMessage(data: unknown) {
        postMessageMock(data);
        // Distribute to other channels with the same name asynchronously
        setTimeout(() => {
          bcListeners.forEach((bc) => {
            if (bc !== this && bc.onmessage) {
              bc.onmessage({ data } as MessageEvent);
            }
          });
        }, 0);
      }
      close() {
        closeMock();
        const idx = bcListeners.indexOf(this);
        if (idx > -1) bcListeners.splice(idx, 1);
      }
    } as unknown as typeof BroadcastChannel;

    originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    } else {
      delete (document as { visibilityState?: string }).visibilityState;
    }
    vi.useRealTimers();
  });

  describe('formatLastSeen', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    });

    // The app is Arabic-only, so `formatLastSeen` no longer takes an
    // `isAr` flag and always returns Arabic copy.
    it('handles null, undefined and invalid dates', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      expect(fls(null)).toEqual({ text: 'غير معروف', isOnline: false });
      expect(fls(undefined)).toEqual({ text: 'غير معروف', isOnline: false });
      expect(fls('invalid-date')).toEqual({ text: 'غير معروف', isOnline: false });
    });

    it('detects online status within threshold', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      const recentDate = new Date('2025-01-01T11:59:30.000Z').toISOString(); // 30s ago
      expect(fls(recentDate)).toEqual({ text: 'متصل الآن', isOnline: true });
    });

    it('formats just now (between 60s and 120s)', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      const justNowDate = new Date('2025-01-01T11:58:10.000Z').toISOString(); // 110s ago
      expect(fls(justNowDate)).toEqual({ text: 'منذ لحظات', isOnline: false });
    });

    it('formats minutes ago', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      const minutesDate = new Date('2025-01-01T11:50:00.000Z').toISOString(); // 10m ago
      expect(fls(minutesDate)).toEqual({
        text: 'آخر ظهور قبل 10 دقيقة',
        isOnline: false,
      });
    });

    it('formats hours ago', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      const hoursDate = new Date('2025-01-01T09:00:00.000Z').toISOString(); // 3h ago
      expect(fls(hoursDate)).toEqual({
        text: 'آخر ظهور قبل 3 ساعة',
        isOnline: false,
      });
    });

    it('formats days ago with a weekday name', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      const daysDate = new Date('2024-12-29T12:00:00.000Z').toISOString(); // 3 days ago (Sunday)
      expect(fls(daysDate).text).toContain('آخر ظهور يوم');
    });

    it('formats older dates absolutely', async () => {
      const { formatLastSeen: fls } = await import('../usePresence');
      const oldDate = new Date('2024-10-15T12:00:00.000Z').toISOString();
      expect(fls(oldDate).text).toContain('آخر ظهور');
    });
  });

  describe('useTick', () => {
    it('updates tick value at specified interval', async () => {
      const { useTick } = await import('../usePresence');
      const { result } = renderHook(() => useTick(1000));
      const initialTime = result.current;

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe(initialTime);

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBeGreaterThan(initialTime);
    });
  });

  describe('useOtherUserPresence', () => {
    it('loads initial status and subscribes to database updates', async () => {
      const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: '2025-01-01T12:00:00.000Z',
        error: null,
      } as any);

      const { useOtherUserPresence } = await import('../usePresence');
      const onUpdate = vi.fn();
      const { unmount } = renderHook(() => useOtherUserPresence('user-123', onUpdate));

      // Allow microtasks and timers to run
      await act(async () => {
        vi.runAllTimers();
      });

      expect(mockRpc).toHaveBeenCalledWith('get_last_seen', { target_user_id: 'user-123' });
      expect(onUpdate).toHaveBeenCalledWith('2025-01-01T12:00:00.000Z');

      expect(supabase.channel).toHaveBeenCalledWith('presence-user-123');

      // Simulate postgres update change
      if (presenceCallbacks['postgres_changes']) {
        act(() => {
          presenceCallbacks['postgres_changes']({
            new: { last_seen: '2025-01-01T13:00:00.000Z' },
          });
        });
        expect(onUpdate).toHaveBeenCalledWith('2025-01-01T13:00:00.000Z');
      }

      unmount();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('useOnlineUserIds and useUserOnline observer hooks', () => {
    it('subscribes to shared presence updates', async () => {
      const { useOnlineUserIds, useUserOnline } = await import('../usePresence');
      const { result: idsResult } = renderHook(() => useOnlineUserIds(true));
      expect(idsResult.current).toBeInstanceOf(Set);

      const { result: onlineResult } = renderHook(() => useUserOnline('user-456'));
      expect(onlineResult.current).toBe(false);

      expect(supabase.channel).toHaveBeenCalledWith('presence:online', expect.any(Object));

      // Mock channel presenceState to return mock users
      const mockChan = mockChannel as unknown as { presenceState: ReturnType<typeof vi.fn> };
      mockChan.presenceState.mockReturnValue({
        'some-key': [{ user_id: 'user-456' }, { user_id: 'user-789' }],
      });

      // Simulate 'sync' presence callback
      if (presenceCallbacks['sync']) {
        act(() => {
          presenceCallbacks['sync']();
        });
      }

      expect(idsResult.current.has('user-456')).toBe(true);
      expect(idsResult.current.has('user-789')).toBe(true);
      expect(onlineResult.current).toBe(true);
    });

    it('handles disabled parameter correctly', async () => {
      const { useOnlineUserIds } = await import('../usePresence');
      const { result } = renderHook(() => useOnlineUserIds(false));
      expect(result.current.size).toBe(0);
      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });

  describe('usePresence hook logic', () => {
    it('runs heartbeat and tracking when userId is provided and becomes active', async () => {
      const mockChan = mockChannel as unknown as { track: ReturnType<typeof vi.fn> };

      const { usePresence } = await import('../usePresence');
      const { unmount } = renderHook(() => usePresence('my-user-id'));

      // Advance to trigger leader election (waits 250ms)
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Verify it claims/announces leadership
      expect(postMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'claim', id: expect.any(String) }),
      );

      // It should have called track since it's elected leader and state is 'joined'
      expect(mockChan.track).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'my-user-id', online_at: expect.any(String) }),
      );

      // Verify heartbeats over interval
      expect(supabase.rpc).toHaveBeenCalledWith('update_last_seen');

      act(() => {
        vi.advanceTimersByTime(25000); // Heartbeat interval is 25s
      });
      expect(supabase.rpc).toHaveBeenCalledWith('update_last_seen');

      unmount();
      expect(closeMock).toHaveBeenCalled();
    });

    it('handles inactivity timeout and pointer activity reset', async () => {
      const mockChan = mockChannel as unknown as {
        track: ReturnType<typeof vi.fn>;
        untrack: ReturnType<typeof vi.fn>;
      };
      const { usePresence } = await import('../usePresence');

      renderHook(() => usePresence('my-user-id'));

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockChan.track).toHaveBeenCalled();
      vi.clearAllMocks();

      // INACTIVITY_TIMEOUT_MS is 60_000ms (60s)
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      // Should have untracked on inactivity
      expect(mockChan.untrack).toHaveBeenCalled();

      // Trigger user activity pointer down event
      vi.clearAllMocks();
      act(() => {
        const event = new Event('pointerdown');
        window.dispatchEvent(event);
      });

      // Should become active again, tracking presence and updating heartbeat
      expect(mockChan.track).toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledWith('update_last_seen');
    });

    it('handles visibility change and grace period', async () => {
      const mockChan = mockChannel as unknown as { untrack: ReturnType<typeof vi.fn> };
      const { usePresence } = await import('../usePresence');

      renderHook(() => usePresence('my-user-id'));

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockChannel.track).toHaveBeenCalled();
      vi.clearAllMocks();

      // Mock visibilityState as hidden
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get() {
          return 'hidden';
        },
      });

      // Dispatch event
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Within grace period (15s), should NOT be untracked yet
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(mockChan.untrack).not.toHaveBeenCalled();

      // Beyond grace period (VISIBILITY_GRACE_MS = 15s)
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(mockChan.untrack).toHaveBeenCalled();
    });
  });
});
