import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePersistentDraft, usePersistentSection } from '../usePersistentDraft';

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.useRealTimers();
});

describe('usePersistentDraft', () => {
  it('restores a draft written by a previous mount — the accidental-back case', () => {
    vi.useFakeTimers();
    const first = renderHook(() => usePersistentDraft('note'));
    act(() => first.result.current[1]('نصف جملة'));
    act(() => vi.advanceTimersByTime(300));
    first.unmount();

    const second = renderHook(() => usePersistentDraft('note'));
    expect(second.result.current[0]).toBe('نصف جملة');
  });

  it('flushes on unmount even when the debounce has not fired yet', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => usePersistentDraft('flush'));
    act(() => result.current[1]('كتابة سريعة'));
    unmount(); // no timer advance: the write must still land
    expect(sessionStorage.getItem('draft:flush')).toBe('كتابة سريعة');
  });

  it('forgets the draft once it has been saved as real data', () => {
    const { result } = renderHook(() => usePersistentDraft('done'));
    act(() => result.current[1]('محتوى'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('');
    expect(sessionStorage.getItem('draft:done')).toBeNull();
  });
});

describe('usePersistentSection', () => {
  const tabs = ['overview', 'activity'] as const;

  it('remembers the last section across mounts', () => {
    const first = renderHook(() => usePersistentSection('profile', tabs, 'overview'));
    act(() => first.result.current[1]('activity'));
    first.unmount();

    const second = renderHook(() => usePersistentSection('profile', tabs, 'overview'));
    expect(second.result.current[0]).toBe('activity');
  });

  it('falls back when a stored section no longer exists, instead of wedging the screen', () => {
    localStorage.setItem('section:profile', 'a-tab-we-deleted');
    const { result } = renderHook(() => usePersistentSection('profile', tabs, 'overview'));
    expect(result.current[0]).toBe('overview');
  });
});
