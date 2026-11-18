import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StateView } from '../state-view';

/**
 * The action glyph is semantic, not decoration: an empty-state action such as
 * "حدّد الورد" is not a retry, so only error/offline states may default to the
 * RefreshCcw icon. Pending always renders the spinner and exposes aria-busy.
 */

function actionButton(label: string) {
  return screen.getByRole('button', { name: label });
}

describe('StateView action icon', () => {
  it('defaults retry-shaped states to the RefreshCcw glyph', () => {
    render(
      <StateView
        kind="error"
        title="تعذّر التحميل"
        body="الخدمة لم تستجب."
        action={{ label: 'إعادة المحاولة', onClick: vi.fn() }}
      />,
    );
    const button = actionButton('إعادة المحاولة');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.querySelector('svg.animate-spin')).toBeNull();
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('renders a non-retry action as label-only', () => {
    render(
      <StateView
        kind="empty"
        title="لا ورد بعد"
        body="حدّد قدراً يومياً لتبدأ المتابعة."
        action={{ label: 'حدّد الورد', onClick: vi.fn() }}
      />,
    );
    expect(actionButton('حدّد الورد').querySelector('svg')).toBeNull();
  });

  it('honours an explicit action icon on any state', () => {
    render(
      <StateView
        kind="empty"
        title="لا ورد بعد"
        body="حدّد قدراً يومياً لتبدأ المتابعة."
        action={{
          label: 'حدّد الورد',
          onClick: vi.fn(),
          icon: <svg data-testid="action-icon" />,
        }}
      />,
    );
    const button = actionButton('حدّد الورد');
    expect(within(button).getByTestId('action-icon')).toBeInTheDocument();
  });

  it('keeps the spinner, disables the button and sets aria-busy while pending', () => {
    render(
      <StateView
        kind="error"
        title="تعذّر التحميل"
        body="الخدمة لم تستجب."
        action={{ label: 'إعادة المحاولة', onClick: vi.fn(), pending: true }}
      />,
    );
    const button = actionButton('إعادة المحاولة');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg.animate-spin')).not.toBeNull();
  });
});
