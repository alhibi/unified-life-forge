import { describe, expect, it, vi, beforeEach } from 'vitest';
import { instrumentWebVitals } from '../vitals';

describe('Web Vitals Instrumenter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gracefully handles environment without PerformanceObserver', () => {
    const originalPerformanceObserver = window.PerformanceObserver;
    // Temporarily delete PerformanceObserver
    (window as any).PerformanceObserver = undefined;

    const spyWarn = vi.spyOn(console, 'warn');
    expect(() => instrumentWebVitals()).not.toThrow();
    expect(spyWarn).not.toHaveBeenCalled();

    // Restore original PerformanceObserver
    window.PerformanceObserver = originalPerformanceObserver;
  });

  it('instruments observers when PerformanceObserver is available', () => {
    const observeMock = vi.fn();
    const performanceObserverMock = vi.fn().mockImplementation(() => ({
      observe: observeMock,
    }));

    (window as any).PerformanceObserver = performanceObserverMock;

    instrumentWebVitals();

    expect(performanceObserverMock).toHaveBeenCalled();
    expect(observeMock).toHaveBeenCalled();
  });
});
