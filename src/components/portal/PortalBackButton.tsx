import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { House } from '@/lib/icons';
import { MOTION } from '@/lib/motion';

/**
 * Floating "return to portal" dock.
 *
 * ── The rule it follows ─────────────────────────────────────────────
 * Navigation chrome must never sit on top of an enabled control at rest.
 * A fixed chip cannot promise that over arbitrary scrolling content, so the
 * dock is deliberately conservative:
 *
 *   1. Immersive surfaces do not get it. Game shells, the full-bleed map
 *      surfaces, the chat thread (whose composer owns the bottom edge) and
 *      the in-app keyboard surface all own their bottom chrome and already
 *      expose a back affordance. Listing them centrally stops every one of
 *      them from re-inventing a local "hide the dock" hack.
 *   2. On every other route it only appears once the page has actually
 *      scrolled past the entry view. The first screen (where the page shows
 *      its own primary action) stays clean, which is also why the strict
 *      route audit no longer finds a floating control on top of a button.
 *   3. It hides while the custom or native keyboard owns the bottom edge —
 *      a home chip floating over keys is noise, and the keyboard already
 *      publishes its height through `--soft-keyboard-height` / `--kb-inset`.
 *   4. When visible it is exactly 44x44 (`.portal-dock` in src/index.css) in
 *      the bottom-start corner, and every scroll container reserves the same
 *      rail through `--ui-dock-inset` (`.pb-page` / `.page-shell`), so the
 *      last row always scrolls clear of it.
 *
 * The component publishes `data-portal-dock="visible|hidden"` on <html> so
 * other floating surfaces (the podcast mini-player stack) can follow the
 * same rail without importing this component.
 */

/** Surfaces that own their bottom edge; the dock would fight their chrome. */
const IMMERSIVE_ROUTES: readonly RegExp[] = [
  /^\/chat(\/|$)/,
  /^\/games\/.+/,
  /^\/travel-atlas(\/|$)/,
  /^\/settings\/keyboard$/,
];

/** Do not reveal the dock until the user has left the entry view. */
const REVEAL_AFTER_PX = 24;

function readKeyboardOpen(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  if (root.getAttribute('data-soft-keyboard-open') === 'true') return true;
  const style = getComputedStyle(root);
  const softKeyboard = Number.parseFloat(style.getPropertyValue('--soft-keyboard-height'));
  const nativeKeyboard = Number.parseFloat(style.getPropertyValue('--kb-inset'));
  return (Number.isFinite(softKeyboard) && softKeyboard > 0) ||
    (Number.isFinite(nativeKeyboard) && nativeKeyboard > 0);
}

export default function PortalBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const immersive = pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/.lovable/oauth') ||
    IMMERSIVE_ROUTES.some((pattern) => pattern.test(pathname));

  const [scrolled, setScrolled] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(readKeyboardOpen);

  // Entry-view reveal. Passive listener; setState bails out while the
  // boolean is unchanged, so the handler is one comparison per frame.
  useEffect(() => {
    if (immersive) return;
    const sync = () => setScrolled(window.scrollY > REVEAL_AFTER_PX);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, [immersive, pathname]);

  // Keyboard tracking: the in-app keyboard flips a <html> attribute, the
  // native one writes a CSS variable on the same element, so one observer
  // covers both without polling.
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const sync = () => setKeyboardOpen(readKeyboardOpen());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-soft-keyboard-open', 'style', 'class'],
    });
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  const visible = !immersive && scrolled && !keyboardOpen;

  // Let peer floating surfaces follow the dock rail.
  useEffect(() => {
    document.documentElement.setAttribute('data-portal-dock', visible ? 'visible' : 'hidden');
    return () => document.documentElement.removeAttribute('data-portal-dock');
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="portal-back"
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={MOTION.spring}
          onClick={() => navigate('/')}
          aria-label="العودة إلى البوابة"
          className="portal-dock flex items-center justify-center rounded-full border border-border bg-background text-foreground"
        >
          <House className="h-5 w-5" aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
