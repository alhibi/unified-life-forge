import React, { ErrorInfo, ReactNode } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
interface ErrorBoundaryProps { children: ReactNode; fallback?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
export class FitnessErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Fitness Module Error:", error, errorInfo); }
  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <AppCard className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
          <h3 className="text-lead font-medium">عذراً، حدث خطأ في النظام</h3>
          <p className="text-muted-foreground text-meta max-w-[250px]">تعذر تحميل وحدة اللياقة البدنية. يرجى المحاولة مرة أخرى.</p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>إعادة المحاولة</Button>
        </AppCard>
      );
    }
    return this.props.children;
  }
}
