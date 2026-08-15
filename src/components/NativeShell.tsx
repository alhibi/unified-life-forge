import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { dismissKeyboard, hideSplashWhenPainted, isNative, syncStatusBar } from '@/lib/native';

/**
 * NativeShell — the platform-integration layer, mounted once inside the router.
 *
 * Four jobs, each of which is a visible "this is a web view" tell when missing:
 *
 *  1. Android hardware back pops OUR stack (never leaves the app from a
 *     sub-screen). At the root it asks for a second press within 2s before
 *     exiting, the Android convention.
 *  2. The status bar (and, on the web, the `theme-color` meta) follows the
 *     screen's actual background colour and light/dark contrast, re-synced on
 *     every navigation and whenever the theme class changes.
 *  3. The soft keyboard is dismissed on navigation, and its height is
 *     published as `--kb-inset` so composers can sit on top of it without the
 *     OS jump-resizing the whole view.
 *  4. The splash screen hides after the first real painted frame, not on a
 *     timer — no white flash, no dead gap.
 *
 * Everything degrades silently in a plain browser.
 */
export default function NativeShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const exitArmedRef = useRef(0);

  /* ── 1. Splash: hide once painted ─────────────────────────────── */
  useEffect(() => {
    hideSplashWhenPainted();
  }, []);

  /* ── 2. Status bar / theme-color follows the live background ───── */
  useEffect(() => {
    const sync = () => {
      const dark = document.documentElement.classList.contains('dark');
      const bg = getComputedStyle(document.body).backgroundColor;
      syncStatusBar(rgbToHex(bg) ?? (dark ? '#101014' : '#ffffff'), dark);
    };
    // Defer one frame so the incoming screen's tokens are already applied.
    const raf = requestAnimationFrame(sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [location.pathname]);

  /* ── 3. Keyboard: dismiss on navigation, publish its height ────── */
  useEffect(() => {
    dismissKeyboard();
  }, [location.key]);

  useEffect(() => {
    if (!isNative()) return;
    let detach: Array<() => void> = [];
    void import('@capacitor/keyboard')
      .then(async ({ Keyboard }) => {
        const setInset = (px: number) => {
          document.documentElement.style.setProperty('--kb-inset', `${px}px`);
          document.documentElement.dataset.keyboard = px > 0 ? 'open' : 'closed';
        };
        const show = await Keyboard.addListener('keyboardWillShow', (info) => {
          setInset(info.keyboardHeight);
          // Bring the focused field above the keyboard smoothly instead of
          // letting the OS snap-resize the viewport under it.
          const el = document.activeElement as HTMLElement | null;
          if (el && typeof el.scrollIntoView === 'function') {
            requestAnimationFrame(() =>
              el.scrollIntoView({ block: 'center', behavior: 'smooth' }),
            );
          }
        });
        const hide = await Keyboard.addListener('keyboardWillHide', () => setInset(0));
        detach = [() => void show.remove(), () => void hide.remove()];
      })
      .catch(() => undefined);
    return () => detach.forEach((fn) => fn());
  }, []);

  /* ── 4. Android hardware back → pop our stack ──────────────────── */
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    void import('@capacitor/app')
      .then(async ({ App: CapApp }) => {
        const handle = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // A sheet/dialog that wants the back press handles it first.
          const dismissible = document.querySelector<HTMLElement>('[data-back-intercept]');
          if (dismissible) {
            dismissible.click();
            return;
          }
          if (canGoBack && window.history.state?.idx > 0) {
            navigate(-1);
            return;
          }
          const now = Date.now();
          if (now - exitArmedRef.current < 2000) {
            void CapApp.exitApp();
            return;
          }
          exitArmedRef.current = now;
          void import('sonner').then(({ toast }) =>
            toast('اضغط مرة أخرى للخروج', { duration: 1800 }),
          );
        });
        remove = () => void handle.remove();
      })
      .catch(() => undefined);
    return () => remove?.();
  }, [navigate]);

  return null;
}

/** `rgb(a)` → `#rrggbb`. Returns null for anything else (e.g. a gradient). */
function rgbToHex(value: string): string | null {
  const m = value.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (!m) return null;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}