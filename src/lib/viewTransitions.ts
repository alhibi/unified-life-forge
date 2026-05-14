// ─────────────────────────────────────────────────────────────────────────────
// View Transitions API helpers (Web Native 2026)
//
// Tiny wrapper around `document.startViewTransition` so feature code can call
// `runViewTransition(() => navigate('/foo'))` without worrying about feature
// detection. On browsers that don't support the API (Firefox at the time of
// writing, older Safari) the callback runs synchronously.
//
// Adds:
//   - `runViewTransition`        — generic wrapper
//   - `navigateWithTransition`   — react-router-friendly helper
//   - `useViewTransitionNavigate` — hook that returns a navigate() shim
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

interface DocumentWithViewTransitions extends Document {
  startViewTransition?(callback: () => void | Promise<void>): ViewTransition;
}

/** Whether `document.startViewTransition` is available in this browser. */
export function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as DocumentWithViewTransitions).startViewTransition === 'function'
  );
}

/**
 * Run a DOM-mutating callback inside a view transition when supported, or just
 * invoke it directly otherwise. Returns a Promise that resolves when the
 * transition is over (or when the callback returns if unsupported).
 *
 * Respects `prefers-reduced-motion: reduce` by skipping the transition (the
 * mutation still happens, but no animated cross-fade is shown).
 */
export async function runViewTransition(
  update: () => void | Promise<void>,
): Promise<void> {
  const doc = document as DocumentWithViewTransitions;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || reduced) {
    await update();
    return;
  }

  const transition = doc.startViewTransition(async () => {
    await update();
  });
  try {
    await transition.finished;
  } catch {
    /* user navigated away mid-transition — fine */
  }
}

/**
 * Drop-in replacement for `useNavigate()` that wraps the call in a view
 * transition on supported browsers. Use in handlers where the change is
 * user-initiated and worth animating (route switches, modal-from-card, etc.).
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      void runViewTransition(() => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      });
    },
    [navigate],
  );
}
