/**
 * Extremely light client-side performance observers to track Core Web Vitals
 * (LCP, CLS, INP) securely and log interaction bottlenecks.
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function getRating(name: string, value: number): PerformanceMetric['rating'] {
  if (name === 'CLS') {
    return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  }
  if (name === 'LCP') {
    return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
  }
  if (name === 'INP') {
    return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
  }
  return 'good';
}

export function instrumentWebVitals() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  const logMetric = (name: string, value: number) => {
    const rating = getRating(name, value);
    const color = rating === 'good' ? '#22c55e' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444';
    console.log(
      `%c[Web Vitals] ${name}: ${value.toFixed(3)} (%c${rating}%c)`,
      'color: #9ca3af; font-family: monospace;',
      `color: ${color}; font-weight: bold;`,
      'color: #9ca3af;'
    );
  };

  try {
    // 1. Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      logMetric('LCP', lastEntry.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // 2. Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      logMetric('CLS', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // 3. Interaction to Next Paint (INP)
    const inpObserver = new PerformanceObserver((entryList) => {
      let maxDuration = 0;
      for (const entry of entryList.getEntries()) {
        if (entry.duration > maxDuration) {
          maxDuration = entry.duration;
        }
      }
      logMetric('INP', maxDuration);
    });
    inpObserver.observe({ type: 'first-input', buffered: true });

  } catch (err) {
    console.warn('[Web Vitals Instrument failed]:', err);
  }
}
