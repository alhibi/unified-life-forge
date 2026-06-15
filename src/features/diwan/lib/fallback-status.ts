/**
 * Tiny external store for "did our last Diwan call fall back to local data?".
 *
 * نمتلك ثلاث حالات:
 *   • `none`    — Supabase يردّ بنجاح (لا badge)
 *   • `demo`    — Supabase غير مكوّن (متعمَّد، badge هادئ "وضع تجريبي")
 *   • `offline` — Supabase مكوّن لكن فشل الاستدعاء (badge "غير متصل")
 *
 * الفصل بين الحالتين الأخيرتين مهم: في 'demo' البيانات صحيحة لكنها
 * محدودة (محلّية فقط)، في 'offline' البيانات قد تكون قديمة وعلى
 * المستخدم أن يتوقّع نقصاً في النتائج.
 *
 * نستخدم external-store-pattern مع `useSyncExternalStore` بدلاً من
 * Context provider لتجنّب re-renders على شجرة الديوان كلها كل مرة
 * تتغيّر الحالة. الـ hook يشترك بمكوّن واحد (الـ badge) فقط.
 */

import { useSyncExternalStore } from 'react';

export type FallbackKind = 'none' | 'demo' | 'offline';

interface FallbackState {
  kind: FallbackKind;
  /** آخر مرة سقطنا فيها على fallback (epoch ms). null حين kind === 'none'. */
  since: number | null;
}

let state: FallbackState = { kind: 'none', since: null };
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

/** يستدعى من withFallback عند نجاح remote. */
export function notifyRemoteOk(): void {
  if (state.kind === 'none') return;
  state = { kind: 'none', since: null };
  emit();
}

/**
 * يستدعى من withFallback عند السقوط على local. نُحدّث فقط لو الحالة
 * تغيّرت أو مرّت دقيقة على آخر إشعار، حتى لا نُغرق المشتركين.
 */
export function notifyFallback(kind: 'demo' | 'offline'): void {
  const now = Date.now();
  if (state.kind === kind && state.since && now - state.since < 60_000) return;
  state = { kind, since: now };
  emit();
}

/** للاستخدام داخل React. */
export function useFallbackStatus(): FallbackState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state, // SSR لا يهمّ هنا (Vite SPA)
  );
}

/** للاختبار/الـ debug. */
export function _resetFallbackState(): void {
  state = { kind: 'none', since: null };
  emit();
}
