import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorBoundary from './ErrorBoundary';

// A tiny child that throws on demand. We toggle the failure mode so the
// rerender path can be exercised without unmounting React.
function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <p>healthy child</p>;
}

describe('<ErrorBoundary />', () => {
  // React intentionally logs the caught error to console.error in
  // development. Silence it for the duration of these tests so the
  // output stays clean.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );
    // Default Arabic title plus both action buttons should be visible.
    expect(screen.getByText(/حدث خطأ غير متوقع/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /الرئيسية/ })).toBeInTheDocument();
  });

  it('honours the optional fallbackTitle prop', () => {
    render(
      <ErrorBoundary fallbackTitle="Custom oops title">
        <Boom shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom oops title')).toBeInTheDocument();
  });
});
