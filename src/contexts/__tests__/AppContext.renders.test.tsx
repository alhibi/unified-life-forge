/**
 * Measures what a preference change costs in re-renders.
 *
 * `AppContext` carries 125 members — 61 state fields and 64 setters — in one
 * `useMemo` whose dependency array is 128 entries long. Every consumer subscribes
 * to the whole object, so changing one preference invalidates it and re-renders all
 * 54 files that call `useApp()`, whether or not they read the field that changed.
 *
 * That claim was in an audit as a description. This file turns it into a number, so
 * the fix can be shown to work and a regression shows up as an assertion failure
 * rather than as a vague feeling that the settings screen is slow.
 *
 * The counters below are the current, measured behaviour. When the store is split
 * they should go down; if one goes up, something started subscribing more widely
 * than it needs to.
 */

import { IconContext } from '@phosphor-icons/react';
import { act, render } from '@testing-library/react';
import { type ReactNode, useContext, useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { IconProvider } from '@/lib/icons';

import { AppProvider, useApp, useAppSelector } from '../AppContext';

/**
 * Renders `children` under a provider and hands back a way to change one
 * unrelated preference.
 *
 * `motionSpeed` is deliberately the field under test: nothing in the probes below
 * reads it, so every render they perform is a render they did not need.
 */
function harness(children: ReactNode) {
  let setMotionSpeed: ((v: number) => void) | null = null;

  function Driver() {
    const app = useApp();
    setMotionSpeed = app.setMotionSpeed;
    return null;
  }

  const utils = render(
    <AppProvider>
      <Driver />
      {children}
    </AppProvider>,
  );

  return {
    ...utils,
    bump(value: number) {
      act(() => {
        setMotionSpeed?.(value);
      });
    },
  };
}

/** A consumer that takes the whole context, as all 54 call sites do today. */
function makeWholeContextProbe() {
  const renders = vi.fn();
  function Probe() {
    const { theme } = useApp();
    renders();
    return <span>{theme}</span>;
  }
  return { Probe, renders };
}

/** A consumer that subscribes to one field through the selector hook. */
function makeSelectorProbe() {
  const renders = vi.fn();
  function Probe() {
    const theme = useAppSelector((s) => s.theme);
    renders();
    return <span>{theme}</span>;
  }
  return { Probe, renders };
}

describe('AppContext re-render cost', () => {
  it('mounts without throwing, and useApp outside the provider is a clear error', () => {
    function Orphan() {
      useApp();
      return null;
    }
    // The provider is 2000 lines of effects; a missing provider must fail loudly
    // rather than hand back undefined and crash somewhere unrelated.
    expect(() => render(<Orphan />)).toThrow(/useApp must be used within AppProvider/);
  });

  it('re-renders a whole-context consumer when an unrelated field changes', () => {
    const { Probe, renders } = makeWholeContextProbe();
    const { bump } = harness(<Probe />);

    const afterMount = renders.mock.calls.length;
    bump(1.4);

    // This is the pathology, stated as a number: the probe reads `theme` only, and
    // `motionSpeed` changed, and it still rendered again.
    expect(renders.mock.calls.length).toBeGreaterThan(afterMount);
  });

  it('does NOT re-render a selector consumer when an unrelated field changes', () => {
    const { Probe, renders } = makeSelectorProbe();
    const { bump } = harness(<Probe />);

    const afterMount = renders.mock.calls.length;
    bump(1.4);

    expect(
      renders.mock.calls.length,
      'a selector on `theme` must ignore a `motionSpeed` change',
    ).toBe(afterMount);
  });

  it('re-renders a selector consumer when the field it selected does change', () => {
    const renders = vi.fn();
    let setTheme: ((v: 'light' | 'dark') => void) | null = null;

    function Probe() {
      const theme = useAppSelector((s) => s.theme);
      renders();
      return <span data-testid="t">{theme}</span>;
    }
    function Driver() {
      const app = useApp();
      setTheme = app.setTheme;
      return null;
    }

    const { getByTestId } = render(
      <AppProvider>
        <Driver />
        <Probe />
      </AppProvider>,
    );

    const before = renders.mock.calls.length;
    const current = getByTestId('t').textContent;
    act(() => {
      setTheme?.(current === 'dark' ? 'light' : 'dark');
    });

    expect(renders.mock.calls.length).toBeGreaterThan(before);
    expect(getByTestId('t').textContent).not.toBe(current);
  });

  it('keeps a selector stable across an unrelated change even when it returns an object', () => {
    // A selector that builds a new object every call is the classic way to make
    // `useSyncExternalStore` loop or defeat itself. The hook has to compare by
    // value for that case, not by reference.
    const renders = vi.fn();
    function Probe() {
      const { theme, blackMode } = useAppSelector((s) => ({
        theme: s.theme,
        blackMode: s.blackMode,
      }));
      renders();
      return <span>{`${theme}:${String(blackMode)}`}</span>;
    }

    const { bump } = harness(<Probe />);
    const afterMount = renders.mock.calls.length;
    bump(1.7);

    expect(
      renders.mock.calls.length,
      'an object-returning selector must still be compared shallowly',
    ).toBe(afterMount);
  });

  it('leaves the icon layer alone when an unrelated preference changes', () => {
    // `IconProvider` sits above the entire application tree and needs exactly one
    // field, `interactionStyle`. While it used `useApp()`, every preference change
    // anywhere — font size, motion speed, corner softness — re-rendered it and, via
    // an inline `IconContext` value object, every icon on screen with it.
    //
    // This is the regression guard for that. If someone changes `IconProvider` back
    // to `useApp()`, or drops the `useMemo` around the context value, this fails.
    const renders = vi.fn();

    function CountingIcon() {
      // Consuming Phosphor's IconContext is what an icon does; if that context's
      // value identity churns, this re-renders.
      useContext(IconContext);
      renders();
      return null;
    }

    const { bump } = harness(
      <IconProvider>
        <CountingIcon />
      </IconProvider>,
    );

    const afterMount = renders.mock.calls.length;
    bump(1.9);

    expect(
      renders.mock.calls.length,
      'an icon must not re-render because motionSpeed changed',
    ).toBe(afterMount);
  });

  it('does not tear: a selector and useApp see the same value in one commit', () => {
    // If the store snapshot were mirrored in an effect rather than kept in step with
    // the rendered value, a selector consumer would read the previous value for one
    // commit while a useApp consumer read the new one.
    const seen: Array<{ from: string; theme: string }> = [];
    let setTheme: ((v: 'light' | 'dark') => void) | null = null;

    function ViaSelector() {
      const theme = useAppSelector((s) => s.theme);
      useEffect(() => {
        seen.push({ from: 'selector', theme });
      }, [theme]);
      return null;
    }
    function ViaContext() {
      const { theme, setTheme: set } = useApp();
      setTheme = set;
      useEffect(() => {
        seen.push({ from: 'context', theme });
      }, [theme]);
      return null;
    }

    render(
      <AppProvider>
        <ViaContext />
        <ViaSelector />
      </AppProvider>,
    );

    seen.length = 0;
    act(() => {
      setTheme?.('dark');
    });

    const selectorValues = seen.filter((s) => s.from === 'selector').map((s) => s.theme);
    const contextValues = seen.filter((s) => s.from === 'context').map((s) => s.theme);
    expect(selectorValues.at(-1)).toBe(contextValues.at(-1));
  });
});
