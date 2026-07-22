import React, { Component, type ReactNode } from 'react';
import { RefreshCw, Home } from '@/lib/icons';

export function scrubVerboseDetails(input: string): string {
  if (!input) return '';
  let clean = input;
  // Mask JWT / API keys
  clean = clean.replace(/ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[MASKED_API_KEY]');
  clean = clean.replace(/anon_key=[^&\s]+/gi, 'anon_key=[MASKED]');
  clean = clean.replace(/apikey=[^&\s]+/gi, 'apikey=[MASKED]');
  clean = clean.replace(/sb_[a-zA-Z0-9_]+/gi, '[REDACTED_IDENTIFIER]');
  // Mask DB hostnames / Supabase URLs
  clean = clean.replace(/https:\/\/[a-z0-9-]+\.supabase\.(co|net)/gi, 'https://[REDACTED_DB_HOST].supabase.co');
  return clean;
}

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const scrubbedMsg = scrubVerboseDetails(error.message || '');
    const scrubbedStack = scrubVerboseDetails(info.componentStack || '');
    console.error('ErrorBoundary caught:', scrubbedMsg, scrubbedStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
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
