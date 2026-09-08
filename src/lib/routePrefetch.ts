/**
 * Route module prefetch registry.
 *
 * Centralises every lazy-loaded route's import factory so callers
 * (BottomNav, NavLink, swipe gestures, idle prefetcher) can warm the
 * module ahead of an actual navigation.
 *
 * Each loader is wrapped so repeated calls cost nothing — once a
 * module is in flight (or resolved) we return the cached promise. This
 * is the same "prime" pattern React.lazy uses internally; calling it
 * from a pointer-intent handler simply starts the network/parse early.
 *
 * Exact-match paths are matched first; pattern paths (with `:param`)
 * are matched second. We intentionally don't pull in a router matcher
 * here — this is a hot path that runs on every pointerenter and must
 * be O(1) for the common case.
 */

type Loader = () => Promise<unknown>;

const exact = new Map<string, Loader>();
const prefixed = new Map<string, Loader>(); // matched by startsWith

const inflight = new WeakMap<Loader, Promise<unknown>>();

function memo(loader: Loader): Loader {
  return () => {
    const cached = inflight.get(loader);
    if (cached) return cached;
    const p = loader().catch(() => undefined); // never reject — prefetch is best-effort
    inflight.set(loader, p);
    return p;
  };
}

export function registerRoute(path: string, loader: Loader): void {
  const memoed = memo(loader);
  if (path.endsWith('/*') || path.includes(':')) {
    // Strip the dynamic suffix; we prefetch on any path that starts with
    // the static prefix.
    const prefix = path.split(/[/:*]/).slice(0, -1).join('/') || path;
    prefixed.set(prefix, memoed);
  } else {
    exact.set(path, memoed);
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Data warmers.
 *
 * Warming the *module* removes the parse cost but the screen still opens
 * on a skeleton while its first query runs. A warmer lets a feature start
 * that query at the first sign of intent (pointerenter / touchstart), so
 * by the time the route mounts the cache is usually already populated.
 *
 * Contract: a warmer must be idempotent, must never throw, and must be
 * cheap enough to fire on a hover that goes nowhere — read-only cache
 * fills only, never a mutation and never anything that writes UI state.
 * ───────────────────────────────────────────────────────────────────── */

type Warmer = () => void | Promise<unknown>;

const warmers = new Map<string, Warmer>();
const warmedAt = new Map<string, number>();

/** How long a warm stays fresh; a second hover inside this window is free. */
const WARM_TTL_MS = 30_000;

export function registerDataPrefetch(path: string, warmer: Warmer): () => void {
  warmers.set(path, warmer);
  return () => {
    if (warmers.get(path) === warmer) warmers.delete(path);
  };
}

function warmData(path: string): void {
  const warmer = warmers.get(path);
  if (!warmer) return;
  const last = warmedAt.get(path) ?? 0;
  const now = Date.now();
  if (now - last < WARM_TTL_MS) return;
  warmedAt.set(path, now);
  try {
    const result = warmer();
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    /* prefetch is best-effort — a failed warm must never surface */
  }
}

export function prefetchRoute(path: string): void {
  warmData(path);
  const direct = exact.get(path);
  if (direct) { direct(); return; }
  for (const [prefix, loader] of prefixed) {
    if (path.startsWith(prefix)) { loader(); return; }
  }
}

/**
 * Build a small set of DOM handlers that warm `path` on the first
 * sign of user intent: pointerenter (mouse), touchstart (mobile),
 * focus (keyboard). All three are passive — they only kick off the
 * dynamic import; they never preventDefault.
 */
export function intentHandlers(path: string) {
  let primed = false;
  const prime = () => {
    if (primed) return;
    primed = true;
    prefetchRoute(path);
  };
  return {
    onPointerEnter: prime,
    onTouchStart:   prime,
    onFocus:        prime,
  };
}