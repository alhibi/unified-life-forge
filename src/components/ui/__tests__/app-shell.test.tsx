import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { AppCard, IconButton, PageShell, Section } from '../app-shell';

describe('PageShell Component', () => {
  it('renders children inside the canonical centered column by default', () => {
    render(
      <PageShell data-testid="page-shell-root">
        <span data-testid="child-element">Hello World</span>
      </PageShell>,
    );

    const root = screen.getByTestId('page-shell-root');
    expect(root.className).toContain('page-shell');
    expect(root.className).not.toContain('page-shell-flush');

    // Default centered = true wraps children in page-shell-inner app-stack
    const inner = root.querySelector('.page-shell-inner');
    expect(inner).toBeTruthy();
    expect(inner?.className).toContain('app-stack');

    const child = screen.getByTestId('child-element');
    expect(inner?.contains(child)).toBe(true);
  });

  it('handles flush prop correctly by adding page-shell-flush class', () => {
    render(
      <PageShell data-testid="page-shell-root" flush>
        <span>Content</span>
      </PageShell>,
    );

    const root = screen.getByTestId('page-shell-root');
    expect(root.className).toContain('page-shell');
    expect(root.className).toContain('page-shell-flush');
  });

  it('handles centered = false by not wrapping children in page-shell-inner', () => {
    render(
      <PageShell data-testid="page-shell-root" centered={false}>
        <span data-testid="child-element">Hello World</span>
      </PageShell>,
    );

    const root = screen.getByTestId('page-shell-root');
    expect(root.querySelector('.page-shell-inner')).toBeNull();

    const child = screen.getByTestId('child-element');
    expect(root.contains(child)).toBe(true);
  });

  it('supports passing extra class names and HTML properties', () => {
    render(
      <PageShell data-testid="page-shell-root" className="custom-class" id="custom-id">
        <span>Content</span>
      </PageShell>,
    );

    const root = screen.getByTestId('page-shell-root');
    expect(root.className).toContain('page-shell');
    expect(root.className).toContain('custom-class');
    expect(root.getAttribute('id')).toBe('custom-id');
  });
});

describe('AppCard Component', () => {
  it('renders as a div with the canonical card class by default', () => {
    render(
      <AppCard data-testid="app-card-root">
        <span>Card Content</span>
      </AppCard>,
    );

    const card = screen.getByTestId('app-card-root');
    expect(card.tagName.toLowerCase()).toBe('div');
    expect(card.className).toContain('app-card');
    expect(card.className).not.toContain('app-card-compact');
    expect(card.className).not.toContain('app-card-flat');
    expect(card.className).not.toContain('app-card-pressable');
  });

  it('correctly applies visual modifier props', () => {
    const { rerender } = render(
      <AppCard data-testid="app-card-root" compact flat pressable>
        <span>Card Content</span>
      </AppCard>,
    );

    let card = screen.getByTestId('app-card-root');
    expect(card.className).toContain('app-card');
    expect(card.className).toContain('app-card-compact');
    expect(card.className).toContain('app-card-flat');
    expect(card.className).toContain('app-card-pressable');

    rerender(
      <AppCard data-testid="app-card-root" compact={false} flat={false} pressable={false}>
        <span>Card Content</span>
      </AppCard>,
    );

    card = screen.getByTestId('app-card-root');
    expect(card.className).toContain('app-card');
    expect(card.className).not.toContain('app-card-compact');
    expect(card.className).not.toContain('app-card-flat');
    expect(card.className).not.toContain('app-card-pressable');
  });

  it("renders as a custom element tag via the 'as' prop", () => {
    render(
      <AppCard data-testid="app-card-root" as="button">
        <span>Card Content</span>
      </AppCard>,
    );

    const card = screen.getByTestId('app-card-root');
    expect(card.tagName.toLowerCase()).toBe('button');
    expect(card.className).toContain('app-card');
  });

  it('forwards React refs to the underlying component element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <AppCard ref={ref} data-testid="app-card-root">
        <span>Card Content</span>
      </AppCard>,
    );

    const card = screen.getByTestId('app-card-root');
    expect(ref.current).toBe(card);
  });

  it('merges custom class names and passes standard HTML properties', () => {
    render(
      <AppCard data-testid="app-card-root" className="custom-card-class" id="custom-card-id">
        <span>Content</span>
      </AppCard>,
    );

    const card = screen.getByTestId('app-card-root');
    expect(card.className).toContain('app-card');
    expect(card.className).toContain('custom-card-class');
    expect(card.getAttribute('id')).toBe('custom-card-id');
  });
});

describe('IconButton Component', () => {
  it('renders as a button with default styles and type', () => {
    render(
      <IconButton data-testid="icon-button">
        <span>Icon</span>
      </IconButton>,
    );

    const btn = screen.getByTestId('icon-button');
    expect(btn.tagName.toLowerCase()).toBe('button');
    expect(btn.className).toContain('app-icon-btn');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('forwards React refs and allows custom type', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <IconButton ref={ref} data-testid="icon-button" type="submit">
        <span>Icon</span>
      </IconButton>,
    );

    const btn = screen.getByTestId('icon-button');
    expect(ref.current).toBe(btn);
    expect(btn.getAttribute('type')).toBe('submit');
  });

  it('merges custom className and extra props', () => {
    render(
      <IconButton data-testid="icon-button" className="extra-class" disabled>
        <span>Icon</span>
      </IconButton>,
    );

    const btn = screen.getByTestId('icon-button');
    expect(btn.className).toContain('app-icon-btn');
    expect(btn.className).toContain('extra-class');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });
});

describe('Section Component', () => {
  it('renders as a section element with canonical vertical stack inside', () => {
    render(
      <Section data-testid="section-root">
        <div data-testid="section-child">Child Content</div>
      </Section>,
    );

    const sec = screen.getByTestId('section-root');
    expect(sec.tagName.toLowerCase()).toBe('section');

    // Standard gap wrapper default is app-stack
    const stack = sec.querySelector('.app-stack');
    expect(stack).toBeTruthy();
    expect(stack?.querySelector('[data-testid="section-child"]')).toBeTruthy();
  });

  it('applies a label when specified with class app-section-label', () => {
    render(
      <Section label="My Section Label" data-testid="section-root">
        <div>Content</div>
      </Section>,
    );

    const sec = screen.getByTestId('section-root');
    const labelEl = sec.querySelector('.app-section-label');
    expect(labelEl).toBeTruthy();
    expect(labelEl?.textContent).toBe('My Section Label');
  });

  it('applies app-stack-sm gap when tight is true', () => {
    render(
      <Section tight data-testid="section-root">
        <div>Content</div>
      </Section>,
    );

    const sec = screen.getByTestId('section-root');
    expect(sec.querySelector('.app-stack-sm')).toBeTruthy();
    expect(sec.querySelector('.app-stack')).toBeNull();
  });

  it('merges custom className and passes extra attributes', () => {
    render(
      <Section data-testid="section-root" className="custom-section-class" id="sec-id">
        <div>Content</div>
      </Section>,
    );

    const sec = screen.getByTestId('section-root');
    expect(sec.className).toContain('custom-section-class');
    expect(sec.getAttribute('id')).toBe('sec-id');
  });
});
