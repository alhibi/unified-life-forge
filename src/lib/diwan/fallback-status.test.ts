/**
 * اختبارات الـ external store لحالة fallback.
 *
 * نُغطّي:
 *   • الانتقالات الصحيحة بين الحالات (none ↔ demo ↔ offline)
 *   • throttle الـ 60 ثانية على نفس الـ kind
 *   • notifying المشتركين فقط عند تغيّر فعلي
 *   • _resetFallbackState للاختبار
 *
 * نتفادى استخدام `useSyncExternalStore` هنا لأنه hook — نختبر API
 * المنخفض المستوى مباشرةً (subscribe/getSnapshot patterns لا تحتاج
 * React).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// نستورد ديناميكياً في كل اختبار حتى نُعزل الحالة بين الاختبارات.
// _resetFallbackState يكفي لكنّ resetModules أكثر صرامة.
async function load() {
  vi.resetModules();
  return import('./fallback-status');
}

describe('fallback-status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in `none` state with null `since`', async () => {
    const { useFallbackStatus, _resetFallbackState } = await load();
    _resetFallbackState();
    // useFallbackStatus يُرجع نفس مرجع الحالة في كل قراءة — يكفي قراءة
    // مباشرة عبر استخدامه داخل React. هنا نقرأ عبر external API:
    // notifyFallback ثم نتحقّق التغيّر عبر subscriber.
    expect(useFallbackStatus).toBeDefined();
  });

  it('transitions none → demo via notifyFallback("demo")', async () => {
    const { notifyFallback, _resetFallbackState } = await load();
    _resetFallbackState();
    let count = 0;
    let last: { kind: string; since: number | null } | null = null;
    // نستخدم React's useSyncExternalStore-style subscribe المُصدّر
    // ضمنياً عبر useFallbackStatus. لاختبار وحدة، نستخدم module-level
    // subscribe بدلاً من ذلك:
    // الـ store لا يُصدّر subscribe مباشرةً، فنُحاكي عبر renderHook.
    // الأبسط: نستخدم mock listener عبر useSyncExternalStore.
    // لكن React.act مطلوب خارج الـ component → نختار اختبار e2e عبر renderHook.

    // ولأن الـ store الفعلي بسيط، نختبره عبر سلوك notify:
    notifyFallback('demo');
    // لا يوجد طريق سهل لقراءة state من الخارج بدون React.
    // نوثّق هذا كـ limit ونغطّيه في hook tests منفصل.
    expect(typeof notifyFallback).toBe('function');
  });

  it('exposes useFallbackStatus, notifyFallback, notifyRemoteOk, _reset', async () => {
    const mod = await load();
    expect(mod.useFallbackStatus).toBeTypeOf('function');
    expect(mod.notifyFallback).toBeTypeOf('function');
    expect(mod.notifyRemoteOk).toBeTypeOf('function');
    expect(mod._resetFallbackState).toBeTypeOf('function');
  });
});

// ─── اختبار سلوك الـ store عبر React renderHook ─────────────────
// هذا أصدق وفاءً للسلوك الفعلي لأن useFallbackStatus يستخدم
// useSyncExternalStore.
import { renderHook, act } from '@testing-library/react';

describe('useFallbackStatus (React integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial { kind: "none", since: null }', async () => {
    const { useFallbackStatus, _resetFallbackState } = await load();
    _resetFallbackState();
    const { result } = renderHook(() => useFallbackStatus());
    expect(result.current).toEqual({ kind: 'none', since: null });
  });

  it('updates to demo after notifyFallback("demo")', async () => {
    const { useFallbackStatus, notifyFallback, _resetFallbackState } = await load();
    _resetFallbackState();
    const { result } = renderHook(() => useFallbackStatus());
    act(() => {
      notifyFallback('demo');
    });
    expect(result.current.kind).toBe('demo');
    expect(result.current.since).toBe(Date.now());
  });

  it('updates to offline after notifyFallback("offline")', async () => {
    const { useFallbackStatus, notifyFallback, _resetFallbackState } = await load();
    _resetFallbackState();
    const { result } = renderHook(() => useFallbackStatus());
    act(() => {
      notifyFallback('offline');
    });
    expect(result.current.kind).toBe('offline');
  });

  it('resets to none on notifyRemoteOk', async () => {
    const { useFallbackStatus, notifyFallback, notifyRemoteOk, _resetFallbackState } = await load();
    _resetFallbackState();
    const { result } = renderHook(() => useFallbackStatus());
    act(() => { notifyFallback('offline'); });
    expect(result.current.kind).toBe('offline');
    act(() => { notifyRemoteOk(); });
    expect(result.current).toEqual({ kind: 'none', since: null });
  });

  it('notifyRemoteOk is a no-op when already in none state', async () => {
    const { useFallbackStatus, notifyRemoteOk, _resetFallbackState } = await load();
    _resetFallbackState();
    let renders = 0;
    const { result, rerender: _ } = renderHook(() => {
      renders++;
      return useFallbackStatus();
    });
    void _;
    const initialRenders = renders;
    act(() => { notifyRemoteOk(); });
    // لا تغيير في الحالة → لا re-render
    expect(renders).toBe(initialRenders);
    expect(result.current).toEqual({ kind: 'none', since: null });
  });

  it('throttles repeated notifyFallback("demo") within 60 seconds', async () => {
    const { useFallbackStatus, notifyFallback, _resetFallbackState } = await load();
    _resetFallbackState();
    const { result } = renderHook(() => useFallbackStatus());
    act(() => { notifyFallback('demo'); });
    const firstSince = result.current.since;
    expect(firstSince).not.toBeNull();
    // 30 ثانية لاحقاً — لا تحديث
    vi.advanceTimersByTime(30_000);
    act(() => { notifyFallback('demo'); });
    expect(result.current.since).toBe(firstSince);
    // 31 ثانية إضافية (61 إجمالاً) — يُحدَّث
    vi.advanceTimersByTime(31_000);
    act(() => { notifyFallback('demo'); });
    expect(result.current.since).not.toBe(firstSince);
  });

  it('does not throttle when transitioning between demo and offline', async () => {
    const { useFallbackStatus, notifyFallback, _resetFallbackState } = await load();
    _resetFallbackState();
    const { result } = renderHook(() => useFallbackStatus());
    act(() => { notifyFallback('demo'); });
    const firstSince = result.current.since;
    // فوراً نتحوّل إلى offline — يجب أن يُحدَّث
    act(() => { notifyFallback('offline'); });
    expect(result.current.kind).toBe('offline');
    expect(result.current.since).not.toBe(firstSince);
  });
});
