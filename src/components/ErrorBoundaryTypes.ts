export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}
