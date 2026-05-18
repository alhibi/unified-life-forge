// Lightweight navigation performance logger.
// Records two timings per route change:
//   - load:  time from navigation start until the lazy chunk + component mounted
//   - paint: time from navigation start until first browser paint after mount
// Results are kept in a ring buffer and exposed on window.__navPerf for inspection.

type NavEntry = {
  path: string;
  load: number;   // ms
  paint: number;  // ms
  at: number;     // epoch ms
};

const MAX = 50;
const entries: NavEntry[] = [];
let pendingPath: string | null = null;
let pendingStart = 0;

declare global {
  interface Window {
    __navPerf?: {
      entries: NavEntry[];
      summary: () => void;
      clear: () => void;
    };
  }
}

export function navStart(path: string) {
  pendingPath = path;
  pendingStart = performance.now();
}

export function navLoaded(path: string): { load: number; finish: (cb?: (paint: number) => void) => void } {
  // Called after the lazy component has mounted (useLayoutEffect inside PageTransition).
  if (pendingPath !== path) {
    // Either the very first render or a stale call — reset baseline.
    pendingPath = path;
    pendingStart = performance.now();
  }
  const load = performance.now() - pendingStart;
  const startedAt = pendingStart;
  return {
    load,
    finish: (cb) => {
      // requestAnimationFrame fires before paint; nested rAF approximates "after paint".
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const paint = performance.now() - startedAt;
          const entry: NavEntry = { path, load, paint, at: Date.now() };
          entries.push(entry);
          if (entries.length > MAX) entries.shift();
          const slow = paint > 350 ? '%c[nav]%c slow ' : '%c[nav]%c ';
          const color = paint > 350 ? 'background:#b91c1c;color:#fff;padding:1px 4px;border-radius:3px' :
                                       'background:#0369a1;color:#fff;padding:1px 4px;border-radius:3px';
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log(slow + path + ' load=' + load.toFixed(0) + 'ms paint=' + paint.toFixed(0) + 'ms',
              color, 'color:inherit');
          }
          cb?.(paint);
        });
      });
    },
  };
}

function summary() {
  if (!import.meta.env.DEV) return;
  if (entries.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[navPerf] no entries yet');
    return;
  }
  const byPath = new Map<string, { n: number; load: number; paint: number; max: number }>();
  for (const e of entries) {
    const k = e.path;
    const cur = byPath.get(k) ?? { n: 0, load: 0, paint: 0, max: 0 };
    cur.n++; cur.load += e.load; cur.paint += e.paint;
    if (e.paint > cur.max) cur.max = e.paint;
    byPath.set(k, cur);
  }
  const rows = Array.from(byPath.entries())
    .map(([path, v]) => ({
      path,
      n: v.n,
      'avg load (ms)': +(v.load / v.n).toFixed(0),
      'avg paint (ms)': +(v.paint / v.n).toFixed(0),
      'worst paint (ms)': +v.max.toFixed(0),
    }))
    .sort((a, b) => b['avg paint (ms)'] - a['avg paint (ms)']);
  // eslint-disable-next-line no-console
  console.table(rows);
}

if (typeof window !== 'undefined') {
  window.__navPerf = {
    entries,
    summary,
    clear: () => { entries.length = 0; },
  };
}
