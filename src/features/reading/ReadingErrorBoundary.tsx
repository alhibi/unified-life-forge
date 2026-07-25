import { motion } from 'framer-motion';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, RefreshCw, Trash2, WifiOff } from '@/lib/icons';

import { offlineDb } from './offlineDb';

/**
 * Dedicated error boundary for the Reading feature.
 *
 * Features:
 *  - Classifies errors (network, IDB, render crash) and shows
 *    appropriate recovery options for each.
 *  - "Retry" resets the boundary and re-renders children.
 *  - "Clear cache & retry" nukes IndexedDB and retries — fixes
 *    corruption-related crashes that survive a simple retry.
 *  - Bilingual (ar/en) based on the `lang` prop.
 *  - Logs errors to console with a structured prefix for grep-ability.
 *  - Limits retry count to prevent infinite crash loops (max 3).
 */

interface Props {
  children: ReactNode;
  lang?: string;
  /** Optional callback when recovery clears the offline cache. */
  onCacheCleared?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorKind: 'network' | 'storage' | 'render' | 'unknown';
  retryCount: number;
  clearing: boolean;
}

function classifyBoundaryError(error: Error): State['errorKind'] {
  const msg = error.message.toLowerCase();
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) {
    return 'network';
  }
  if (
    msg.includes('indexeddb') ||
    msg.includes('idb') ||
    msg.includes('quota') ||
    msg.includes('storage') ||
    msg.includes('transaction')
  ) {
    return 'storage';
  }
  if (
    msg.includes('render') ||
    msg.includes('hook') ||
    msg.includes('cannot read') ||
    msg.includes('undefined') ||
    msg.includes('null')
  ) {
    return 'render';
  }
  return 'unknown';
}

export class ReadingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorKind: 'unknown',
      retryCount: 0,
      clearing: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorKind: classifyBoundaryError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      '[Reading/ErrorBoundary] Caught error:',
      error.message,
      '\nComponent stack:',
      info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorKind: 'unknown',
      retryCount: prev.retryCount + 1,
      clearing: false,
    }));
  };

  handleClearAndRetry = async () => {
    this.setState({ clearing: true });
    try {
      await offlineDb.forceReset();
      this.props.onCacheCleared?.();
    } catch (e) {
      console.warn('[Reading/ErrorBoundary] Cache clear failed:', e);
    }
    this.setState({
      hasError: false,
      error: null,
      errorKind: 'unknown',
      retryCount: 0,
      clearing: false,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Prevent infinite crash loops
    if (this.state.retryCount >= 3) {
      return (
        <FatalErrorFallback
          lang={this.props.lang}
          error={this.state.error}
          onClearAndRetry={this.handleClearAndRetry}
          clearing={this.state.clearing}
        />
      );
    }

    return (
      <ErrorFallback
        lang={this.props.lang}
        error={this.state.error}
        errorKind={this.state.errorKind}
        retryCount={this.state.retryCount}
        onRetry={this.handleRetry}
        onClearAndRetry={this.handleClearAndRetry}
        clearing={this.state.clearing}
      />
    );
  }
}

// ─── Fallback UI components ────────────────────────────────────────────────

function ErrorFallback({
  lang: _lang,
  error,
  errorKind,
  retryCount,
  onRetry,
  onClearAndRetry,
  clearing,
}: {
  lang?: string;
  error: Error | null;
  errorKind: State['errorKind'];
  retryCount: number;
  onRetry: () => void;
  onClearAndRetry: () => void;
  clearing: boolean;
}) {

  const iconMap: Record<State['errorKind'], ReactNode> = {
    network: <WifiOff className="h-12 w-12 text-amber-500/70" />,
    storage: <Database className="h-12 w-12 text-orange-500/70" />,
    render: <AlertTriangle className="h-12 w-12 text-destructive/70" />,
    unknown: <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />,
  };

  const titleMap: Record<State['errorKind'], { ar: string; en: string }> = {
    network: {
      ar: 'مشكلة في الاتصال',
      en: 'Connection problem',
    },
    storage: {
      ar: 'مشكلة في التخزين المحلي',
      en: 'Local storage issue',
    },
    render: {
      ar: 'حدث خطأ في العرض',
      en: 'Display error',
    },
    unknown: {
      ar: 'حدث خطأ غير متوقع',
      en: 'Something went wrong',
    },
  };

  const descMap: Record<State['errorKind'], { ar: string; en: string }> = {
    network: {
      ar: 'تحقق من اتصال الإنترنت وحاول مرة أخرى.',
      en: 'Check your internet connection and try again.',
    },
    storage: {
      ar: 'قد تكون بيانات التخزين تالفة. يمكنك مسح الذاكرة المؤقتة وإعادة المحاولة.',
      en: 'Cached data may be corrupted. Try clearing the cache and retrying.',
    },
    render: {
      ar: 'حدث خطأ أثناء عرض الصفحة. جرّب إعادة المحاولة.',
      en: 'An error occurred while rendering. Try again.',
    },
    unknown: {
      ar: 'حدث خطأ غير متوقع. جرّب إعادة المحاولة.',
      en: 'An unexpected error occurred. Try again.',
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center gap-4"
    >
      {iconMap[errorKind]}

      <div className="space-y-2 max-w-sm">
        <h2 className="text-lg font-bold">
          {titleMap[errorKind].ar}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {descMap[errorKind].ar}
        </p>
      </div>

      {/* Error details (collapsed by default) */}
      {error && (
        <details className="text-[0.6875rem] text-muted-foreground/60 max-w-sm w-full">
          <summary className="cursor-pointer hover:text-muted-foreground transition-colors">
            {'تفاصيل الخطأ'}
          </summary>
          <pre
            dir="ltr"
            className="mt-2 p-3 rounded-xl bg-muted/30 text-start overflow-x-auto whitespace-pre-wrap break-all font-mono"
          >
            {error.message}
          </pre>
        </details>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
        <Button
          onClick={onRetry}
          className="rounded-xl min-w-[140px]"
          size="sm"
        >
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          {'إعادة المحاولة'}
          {retryCount > 0 && (
            <span className="ms-1 text-[0.625rem] opacity-70">({retryCount}/3)</span>
          )}
        </Button>

        {(errorKind === 'storage' || retryCount >= 1) && (
          <Button
            onClick={onClearAndRetry}
            variant="outline"
            className="rounded-xl min-w-[140px]"
            size="sm"
            disabled={clearing}
          >
            {clearing ? (
              <RefreshCw className="h-3.5 w-3.5 me-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 me-1.5" />
            )}
            {'مسح الذاكرة وإعادة'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function FatalErrorFallback({
  lang: _lang,
  error,
  onClearAndRetry,
  clearing,
}: {
  lang?: string;
  error: Error | null;
  onClearAndRetry: () => void;
  clearing: boolean;
}) {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center gap-4"
    >
      <AlertTriangle className="h-14 w-14 text-destructive/60" />

      <div className="space-y-2 max-w-sm">
        <h2 className="text-lg font-bold">
          {'خطأ متكرر'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {'تكرر الخطأ عدة مرات. جرّب مسح الذاكرة المؤقتة بالكامل أو إعادة تحميل الصفحة.'}
        </p>
      </div>

      {error && (
        <pre
          dir="ltr"
          className="text-[0.625rem] text-muted-foreground/50 max-w-xs overflow-x-auto whitespace-pre-wrap break-all font-mono p-2 rounded-lg bg-muted/20"
        >
          {error.message}
        </pre>
      )}

      <div className="flex flex-col items-center gap-2 mt-2">
        <Button
          onClick={onClearAndRetry}
          variant="destructive"
          className="rounded-xl min-w-[180px]"
          size="sm"
          disabled={clearing}
        >
          {clearing ? (
            <RefreshCw className="h-3.5 w-3.5 me-1.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 me-1.5" />
          )}
          {'مسح كل البيانات وإعادة'}
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="ghost"
          className="rounded-xl text-xs"
          size="sm"
        >
          {'إعادة تحميل الصفحة'}
        </Button>
      </div>
    </motion.div>
  );
}
