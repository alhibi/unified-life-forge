import React, { Component, type ReactNode } from 'react';

import { Home,RefreshCw } from '@/lib/icons';
import { scrubVerboseDetails } from '@/lib/scrub';
import { captureTelemetry } from '@/lib/telemetry';

// Re-exported for the existing call sites that import it from here. The
// implementation moved to lib/scrub.ts so lib/telemetry.ts can use it without
// creating an import cycle back into this component.
export { scrubVerboseDetails };

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  /**
   * Values that, when any of them changes, clear the error and re-render the
   * children.
   *
   * Without this, a boundary that caught once stayed broken: `hasError` only
   * cleared when the user pressed "إعادة المحاولة", so navigating away from a
   * failing route and back again — or fixing the input that caused the throw —
   * still showed the fallback. `RouteErrorBoundary` below passes the router
   * location, which is the reset key that matters for a per-route boundary.
   */
  resetKeys?: readonly unknown[];
  /**
   * Where "الرئيسية" should go. Provided by `RouteErrorBoundary` so the button
   * performs a client-side navigation; omitted for the boundary that sits outside
   * the router, which has no other option than a document load.
   */
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
}

function keysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && keysChanged(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // React render failures do not surface as window 'error' events, so
    // without this they reached nothing but the local console — the single
    // most useful class of error was the least observable.
    captureTelemetry('ReactRenderError', error.message || 'unknown', error.stack, {
      componentStack: info.componentStack ?? '',
    });

    if (import.meta.env.DEV) {
      console.error(
        'ErrorBoundary caught:',
        scrubVerboseDetails(error.message || ''),
        scrubVerboseDetails(info.componentStack || ''),
      );
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    if (this.props.onNavigateHome) {
      // A client-side navigation. The previous unconditional
      // `window.location.href = '/'` threw away the whole JS heap, the React
      // Query cache and the service worker's warm state to recover from a
      // component-level error — a full cold start as the routine repair action.
      this.props.onNavigateHome();
      return;
    }
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {this.props.fallbackTitle || 'حدث خطأ غير متوقع'}
            </h3>
            <p className="text-sm text-muted-foreground">
              يرجى المحاولة مرة أخرى
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium active:scale-95 transition-transform"
            >
              <Home className="w-4 h-4" />
              الرئيسية
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
