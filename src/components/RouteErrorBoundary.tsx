/**
 * A per-route error boundary that recovers on navigation.
 *
 * `App.tsx` wraps every one of its ~90 routes in `<ErrorBoundary>` by hand. Two
 * problems with that, beyond the repetition:
 *
 *   • **It never reset.** `hasError` cleared only when the user pressed the retry
 *     button, so once a route threw, leaving it and coming back still showed the
 *     fallback — the boundary outlived the condition that tripped it.
 *   • **"الرئيسية" reloaded the document.** `window.location.href = '/'` discarded
 *     the JS heap, the React Query cache and every warm lazy chunk in order to
 *     recover from one component throwing.
 *
 * This component fixes both in one place: it keys the boundary on the router
 * location, so any navigation clears the error, and it hands the boundary a real
 * `navigate` so going home is a client-side transition.
 *
 * It must render *inside* the router (it calls `useLocation`). The single
 * outermost boundary in `App.tsx` sits outside `BrowserRouter` and keeps using
 * `ErrorBoundary` directly, where a document load genuinely is the only recovery.
 */

import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ErrorBoundary from './ErrorBoundary';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

export default function RouteErrorBoundary({ children, fallbackTitle }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      fallbackTitle={fallbackTitle}
      // `key` is deliberately NOT used here. Keying the boundary would remount the
      // whole subtree on every navigation and throw away component state that the
      // persistent-tab shell exists to preserve. `resetKeys` clears the error
      // without touching the tree when there is no error to clear.
      //
      // `location.key` changes on every navigation including same-path pushes,
      // which is what "the user tried something else" means here.
      resetKeys={[location.key]}
      onNavigateHome={() => navigate('/')}
    >
      {children}
    </ErrorBoundary>
  );
}
