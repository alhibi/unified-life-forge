/**
 * Scroll runtime — what actually makes long lists feel like silk at 60 and
 * 120 Hz.
 *
 * The expensive part of a fling is rarely the scroll itself; the compositor
 * handles that off the main thread. What costs frames is everything the browser
 * is asked to do WHILE the content moves:
 *
 *   • hit-testing every pointer position against the tree under the finger,
 *   • recalculating `:hover` for whatever passes beneath the cursor,
 *   • running the colour transitions that `index.css` puts on every card, row,
 *     link and `[data-state]` element, thousands of which exist in a long list,
 *   • re-rasterising anything whose paint invalidates as a result.
 *
 * While the content is moving, none of that is observable — the user is looking
 * at moving content, not at a hover state. So the governor marks the document
 * and `index.css` suspends exactly that work, then restores it the moment
 * scrolling settles.
 *
 * Two levels, because they carry very different risk
 * ──────────────────────────────────────────────────
 *   `data-scrolling` — set for ANY scroll, however it started. Suspends colour
 *     transitions and decorative animation. Purely visual, so there is nothing
 *     it can break.
 *
 *   `data-fling` — set ONLY while the scroll is being driven by a real finger,
 *     or by the momentum immediately following one. This is the level that
 *     suspends hit-testing, and it is deliberately much harder to enter.
 *
 * Why `data-fling` has to be that strict
 * ──────────────────────────────────────
 * Suspending hit-testing means a pointer event during the window lands on
 * `<html>` instead of the element under it. During a finger fling that is
 * harmless: the touch that stops momentum is a gesture, and browsers already
 * suppress its click. But a PROGRAMMATIC scroll — `scrollIntoView`, an anchor
 * jump, a framework scrolling a newly-revealed section into view — can be
 * followed a few milliseconds later by a genuine tap that the user fully
 * intends. Gating on a recent touch removes that hazard completely: a
 * programmatic scroll never sets `data-fling`, so the tap after it always
 * lands.
 *
 * Correctness guards
 * ──────────────────
 *   • Any `pointerdown` / `touchstart` / `keydown` clears both flags at once.
 *   • Both flags are only ever set while the `silk` or `smooth` profile is
 *     selected. `native` leaves the browser completely untouched.
 *   • Listeners are passive and capture-phase, so they never delay a scroll and
 *     still see nested scroll containers (scroll does not bubble, but the
 *     capture phase reaches the document first).
 *   • Only one listener set is ever installed, no matter how many times this
 *     module is called.
 */

import type { ScrollProfile } from './motionPreferences';
import { applyScrollProfileAttribute } from './motionRuntime';

/** How long after the last scroll event we consider the gesture finished. */
const SCROLL_IDLE_MS = 140;

/**
 * How long after a finger leaves the glass its momentum still counts as
 * finger-driven. Long enough to cover a real fling, short enough that a
 * programmatic scroll a moment later is not mistaken for one.
 */
const TOUCH_MOMENTUM_MS = 900;

let installed = false;
let activeProfile: ScrollProfile = 'silk';
let scrolling = false;
let flinging = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
/** Timestamp of the last touch contact. 0 means "no touch this session". */
let lastTouchAt = 0;
let touchDown = false;

function root(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement;
}

function setFlag(name: 'data-scrolling' | 'data-fling', next: boolean) {
  const element = root();
  if (!element) return;
  try {
    if (next) element.setAttribute(name, 'true');
    else element.removeAttribute(name);
  } catch {
    // A restricted DOM must never break scrolling itself.
  }
}

function setScrolling(next: boolean) {
  if (scrolling !== next) {
    scrolling = next;
    setFlag('data-scrolling', next);
  }
}

function setFlinging(next: boolean) {
  if (flinging !== next) {
    flinging = next;
    setFlag('data-fling', next);
  }
}

function clearIdleTimer() {
  if (idleTimer !== null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function settle() {
  clearIdleTimer();
  setScrolling(false);
  setFlinging(false);
}

/** True when the current scroll is being driven by a finger or its momentum. */
function isFingerDriven(): boolean {
  if (touchDown) return true;
  return lastTouchAt !== 0 && Date.now() - lastTouchAt <= TOUCH_MOMENTUM_MS;
}

function onScroll() {
  // `native` opts out entirely: no attribute, no timer, no work.
  if (activeProfile === 'native') return;
  setScrolling(true);
  setFlinging(isFingerDriven());
  clearIdleTimer();
  idleTimer = setTimeout(settle, SCROLL_IDLE_MS);
}

function onTouchStart() {
  touchDown = true;
  lastTouchAt = Date.now();
  // The touch that lands during momentum must restore interactivity before the
  // browser can dispatch anything from it.
  settle();
}

function onTouchEnd() {
  touchDown = false;
  lastTouchAt = Date.now();
}

/** Any deliberate non-touch input also ends the protected window at once. */
function onInput() {
  if (!scrolling && !flinging) return;
  settle();
}

/**
 * Install the scroll governor. Idempotent — safe to call from boot, from HMR
 * and from a preference change.
 */
export function installScrollRuntime(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
  window.addEventListener('pointerdown', onInput, { passive: true, capture: true });
  window.addEventListener('keydown', onInput, { passive: true, capture: true });
  // A tab going to the background can leave a flag stuck if the idle timer is
  // throttled; clear both on the way back.
  document.addEventListener('visibilitychange', settle);
  window.addEventListener('pagehide', settle);
}

/**
 * Select the scroll character.
 *
 *   silk   — native momentum plus the governor above. The default.
 *   native — the browser's untouched behaviour, no governor.
 *   smooth — the governor plus `scroll-behavior: smooth` for anchor jumps and
 *            programmatic scrolls. Applied through a data attribute so the
 *            explicit `behavior: 'instant'` calls in `ScrollToTop` keep
 *            winning — per-tab scroll restoration must never animate.
 */
export function applyScrollProfile(profile: ScrollProfile): void {
  activeProfile = profile;
  applyScrollProfileAttribute(profile);
  installScrollRuntime();
  if (profile === 'native') settle();
}

export function getScrollProfile(): ScrollProfile {
  return activeProfile;
}

/** Whether the document is currently inside a protected scroll window. */
export function isScrolling(): boolean {
  return scrolling;
}

/** Whether the current scroll is finger-driven, i.e. hit-testing is suspended. */
export function isFlinging(): boolean {
  return flinging;
}
