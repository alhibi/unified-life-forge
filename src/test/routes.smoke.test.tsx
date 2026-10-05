import { cleanup, render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

/**
 * Route smoke suite — the refactoring safety net.
 *
 * Every route declared in `src/App.tsx` is mounted against the real router,
 * the real providers and the real stores, and asserted to produce *something*
 * rather than an error-boundary fallback.
 *
 * Why this exists
 *   The 2026-10-05 forensic audit found eight routes that died on mount with
 *   nothing guarding them, and no CI running any test at all. Before any of
 *   the six high-blast-radius modules (`AppContext`, `App.tsx`, `lib/icons`,
 *   `lib/utils`, `useAuth`, the Supabase client — each reaching 42-55% of the
 *   codebase) can safely be refactored, there has to be one check that says
 *   "all 82 screens still render". This is that check.
 *
 * Why the route list is parsed from App.tsx instead of hardcoded
 *   A hardcoded list silently stops covering new routes, which is exactly how
 *   a safety net rots into decoration. Deriving it from the source means a new
 *   route is covered the moment it is declared — and a route that is deleted
 *   stops being asserted without anyone editing this file.
 *
 * What this suite deliberately does NOT do
 *   It does not assert on specific copy, layout or data. It answers one
 *   question — "does this screen mount?" — and answers it for every screen.
 *   Richer assertions belong in the feature's own specs.
 */

const APP = path.resolve(__dirname, '..', 'App.tsx');

/** Concrete values for the dynamic segments used across the router. */
const PARAM_FIXTURES: Record<string, string> = {
  categoryId: '1',
  chatId: '00000000-0000-0000-0000-000000000000',
  countryId: 'DE',
  id: '1',
  placeId: '1',
  slug: 'test-slug',
  tripId: '1',
};

function extractRoutes(): string[] {
  const source = fs.readFileSync(APP, 'utf8');
  const found = new Set<string>();

  for (const match of source.matchAll(/path\s*=\s*["'`]([^"'`]+)["'`]/g)) {
    const raw = match[1];
    if (raw === '*') continue; // the catch-all is asserted separately
    found.add(raw);
  }

  return [...found]
    .map((route) =>
      route.replace(/:([A-Za-z0-9_]+)\??/g, (_whole, name: string) => {
        const fixture = PARAM_FIXTURES[name];
        if (!fixture) {
          throw new Error(
            `Route "${route}" uses the dynamic segment ":${name}" which has no fixture. ` +
              `Add one to PARAM_FIXTURES in ${path.basename(__filename)} so the route stays covered.`,
          );
        }
        return fixture;
      }),
    )
    .sort();
}

const ALL_ROUTES = extractRoutes();

/**
 * Sharding hook. Mounting all 82 routes in one jsdom process takes long enough
 * that a constrained machine looks hung rather than slow. `SMOKE_SHARD=2/4`
 * runs the second quarter, letting CI fan the suite out across jobs and a
 * developer sanity-check one slice. Unset — the default, and what CI's
 * `bun run test` does — runs everything, so the net can never shrink by
 * accident.
 */
function shard(routes: string[]): string[] {
  const spec = process.env.SMOKE_SHARD;
  if (!spec) return routes;
  const [indexRaw, countRaw] = spec.split('/');
  const index = Number(indexRaw);
  const count = Number(countRaw);
  if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index < 1 || index > count) {
    throw new Error(`Invalid SMOKE_SHARD="${spec}". Expected "<index>/<count>", 1-based.`);
  }
  return routes.filter((_, i) => i % count === index - 1);
}

const ROUTES = shard(ALL_ROUTES);

/** Copy rendered by `src/components/ErrorBoundary.tsx` when a subtree throws. */
const ERROR_FALLBACK = 'حدث خطأ غير متوقع';

async function mountRoute(route: string) {
  window.history.pushState({}, '', route);
  const { default: App } = await import('@/App');
  const view = render(<App />);
  // Let lazy chunks resolve and first-paint effects settle.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return (view.container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Network isolation — not a convenience, a correctness requirement.
 *
 * The first full run of this suite wedged permanently on `/german-club/*`.
 * The German-club store fires a cloud sync on mount; with the Supabase host
 * unreachable it retried in a loop that starved the event loop so thoroughly
 * that even Vitest's own 30s per-test timeout never fired. The run sat at
 * route 34 of 83 indefinitely.
 *
 * That is a property of the suite, not of the machine. A route smoke net that
 * talks to the real production Supabase project is:
 *   - non-deterministic (it asserts on whatever rows happen to exist),
 *   - unrunnable offline and on forks without secrets,
 *   - capable of writing to production from a test run,
 *   - and, as proven above, able to hang CI rather than fail it.
 *
 * So every outbound request is answered locally with an empty, well-formed
 * PostgREST response. Rejecting instead would be worse: several stores treat a
 * rejection as "retry", which is the loop we are escaping.
 *
 * This bounds the suite to the question it exists to answer — "does this
 * screen mount?" — and makes network reachability irrelevant to the answer.
 */
const realFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Scope matters. An earlier version of this stub answered *every* request
    // with `[]`, which quietly broke the pages that fetch their own static
    // data: `loadWorldDots()` received an empty array instead of a
    // `{ countries: [...] }` document, and `/travel-atlas/countries` failed
    // with a crash the stub had manufactured. A smoke net that invents
    // failures is worse than none, because the next person learns to ignore it.
    //
    // So only the backend is intercepted. Everything else is left to fail the
    // way it fails in a bare jsdom process, which is a condition the app's own
    // loaders already have to handle.
    if (!/supabase\.co|supabase\.in/.test(url)) {
      return realFetch(input, init);
    }

    // Supabase realtime upgrades over WebSocket, not fetch; the client handles
    // a failed socket gracefully, so only HTTP needs answering here.
    return new Response('[]', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // PostgREST sends this for ranged collection reads; its absence makes
        // some callers treat the response as malformed rather than empty.
        'Content-Range': '*/0',
        'X-Smoke-Stub': url,
      },
    });
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

afterEach(() => {
  cleanup();
});

describe('route smoke: every declared route mounts', () => {
  it('found a plausible number of routes to cover', () => {
    // Guards against a regex that silently matches nothing after a refactor of
    // App.tsx — which would turn this whole suite green and worthless.
    expect(ALL_ROUTES.length).toBeGreaterThan(60);
  });

  it.each(ROUTES)('%s does not hit the error boundary', async (route) => {
    const text = await mountRoute(route);
    expect(text, `${route} rendered the global error fallback`).not.toContain(
      ERROR_FALLBACK,
    );
  }, 30_000);
});

describe('route smoke: unknown routes', () => {
  it('renders the NotFound page instead of crashing', async () => {
    const text = await mountRoute('/this-route-does-not-exist-xyz');
    expect(text).not.toContain(ERROR_FALLBACK);
    expect(text.length).toBeGreaterThan(0);
  }, 30_000);
});
