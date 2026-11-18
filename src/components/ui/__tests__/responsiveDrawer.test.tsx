import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import ResponsiveDrawer from '../ResponsiveDrawer';

/**
 * ResponsiveDrawer owns the 768px contract: bottom Drawer below the breakpoint,
 * centered Dialog at and above it. The desktop Dialog is a short-form layer, so
 * it keeps a compact max width; this spec pins the branch and the resize swap
 * so neither silently regresses.
 */

type Listener = () => void;

let listeners = new Set<Listener>();
let originalMatchMedia: typeof window.matchMedia;

function installViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  listeners = new Set();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_event: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_event: string, cb: Listener) => listeners.delete(cb),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function resizeTo(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  act(() => listeners.forEach((cb) => cb()));
}

function renderOpen() {
  render(
    <ResponsiveDrawer
      open
      onOpenChange={() => {}}
      title="اختر نوع النشاط"
      description="وصف قصير."
    >
      <button type="button">محتوى النموذج</button>
    </ResponsiveDrawer>,
  );
}

function surface() {
  return document.querySelector('[data-ui-surface]');
}

describe('ResponsiveDrawer breakpoint', () => {
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });

  it('renders the desktop Dialog at the 768px breakpoint with a compact width', () => {
    installViewport(768);
    renderOpen();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-ui-surface', 'dialog');
    // Short-form desktop layer: the published compact max width, never a one-off.
    expect(dialog.className).toContain('sm:max-w-md');
    // Long sheet content must scroll inside the viewport instead of clipping.
    expect(dialog.className).toContain('max-h-[85dvh]');
    expect(dialog.className).toContain('overflow-y-auto');
  });

  it('renders the mobile Drawer just below the breakpoint', () => {
    installViewport(767);
    renderOpen();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-ui-surface', 'drawer');
  });

  it('swaps one surface for the other on resize without duplicating the layer', async () => {
    installViewport(1024);
    renderOpen();
    expect(surface()).toHaveAttribute('data-ui-surface', 'dialog');

    resizeTo(767);
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveAttribute('data-ui-surface', 'drawer'),
    );
    expect(document.querySelectorAll('[data-ui-surface]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'محتوى النموذج' })).toBeInTheDocument();

    resizeTo(768);
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveAttribute('data-ui-surface', 'dialog'),
    );
    expect(document.querySelectorAll('[data-ui-surface]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'محتوى النموذج' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
  });
});
