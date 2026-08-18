import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Keyboard } from '@/lib/icons';

interface Props {
  children: ReactNode;
  onUseSystemKeyboard: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Dedicated Error Boundary for the Soft Keyboard.
 * Prevents any internal keyboard crash from hanging the entire application or locking input.
 * Automatically triggers system keyboard fallback on error.
 */
export class KeyboardErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('SoftKeyboard error caught by boundary:', error, errorInfo);
    // Automatically switch back to system keyboard on internal crash
    try {
      this.props.onUseSystemKeyboard();
    } catch {
      /* ignore */
    }
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="pointer-events-auto flex w-full flex-col items-center justify-center gap-2 border-t border-destructive/30 bg-[hsl(var(--surface-1))]/95 p-4 text-foreground backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center gap-2 text-destructive font-medium text-mini">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            <span>حدث خطأ في لوحة المفاتيح</span>
          </div>
          <p className="text-micro text-muted-foreground">تم التحويل تلقائياً إلى لوحة مفاتيح النظام.</p>
          <button
            type="button"
            onClick={() => this.props.onUseSystemKeyboard()}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-mini font-semibold text-primary-foreground transition-all active:scale-95"
          >
            استخدام لوحة مفاتيح النظام
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
