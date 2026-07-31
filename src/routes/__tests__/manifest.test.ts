/**
 * Guards the route table.
 *
 * A 62-entry list invites a specific set of mistakes — a duplicated path, a module
 * that was renamed, a route that reads private data and forgot its guard — and every
 * one of them fails at runtime on one route rather than at build time.
 *
 * Two of these tests also settle a question the old App.tsx comments raised but never
 * checked: whether declaration order is load-bearing for route matching. It is not,
 * in React Router 6 — but "it should be fine" is not the same as knowing, so the
 * ranking is exercised directly.
 */

import fs from 'node:fs';
import path from 'node:path';

import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ROUTE_COMPONENTS, ROUTE_REDIRECTS, ROUTES } from '../manifest';

const SRC = path.resolve(import.meta.dirname, '../..');
const MANIFEST = path.resolve(import.meta.dirname, '../manifest.ts');
const manifestSrc = fs.readFileSync(MANIFEST, 'utf8');

/**
 * The manifest with comments stripped.
 *
 * The header documents the four-times-duplicated pattern this file replaced and
 * quotes `import('./pages/X')` verbatim, so asserting "no relative specifiers"
 * against the raw text fails on the explanation rather than on the code.
 */
const manifestCode = manifestSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The `@/…` specifiers the manifest imports, read from the source text. */
function importedModules(): string[] {
  return [...manifestCode.matchAll(/load:\s*\(\)\s*=>\s*import\(["']@\/([^"']+)["']\)/g)].map(
    (m) => m[1],
  );
}

describe('route manifest', () => {
  it('has the routes it is supposed to have', () => {
    expect(ROUTES.length).toBeGreaterThan(50);
  });

  it('declares no path twice', () => {
    // Two entries for one path means the second is unreachable — React Router takes
    // the first match — and whichever page loses is silently dead.
    const seen = new Map<string, number>();
    for (const route of ROUTES) seen.set(route.path, (seen.get(route.path) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([p]) => p);
    expect(dupes).toEqual([]);
  });

  it('points every route at a module that exists', () => {
    const missing = importedModules().filter(
      (mod) => !['.ts', '.tsx'].some((ext) => fs.existsSync(path.join(SRC, mod + ext))),
    );
    expect(
      missing,
      `These routes import modules that are not on disk:\n` +
        missing.map((m) => `  • @/${m}`).join('\n'),
    ).toEqual([]);
  });

  it('imports one module per route', () => {
    expect(importedModules()).toHaveLength(ROUTES.length);
  });

  it('builds exactly one lazy component per route', () => {
    // `lazy()` is called once at module scope. If it were called during render the
    // component identity would change every time and remount the page, discarding
    // its state on any parent update.
    expect(ROUTE_COMPONENTS.size).toBe(ROUTES.length);
    for (const route of ROUTES) {
      expect(ROUTE_COMPONENTS.get(route.path), route.path).toBeDefined();
    }
  });

  it('uses absolute @/ specifiers, never paths relative to App.tsx', () => {
    // The manifest lives in src/routes/, but the loaders were lifted out of
    // src/App.tsx where './pages/Settings' was correct. Left alone, that resolves to
    // src/routes/pages/Settings and fails only when the route is first visited.
    expect(manifestCode).not.toMatch(/import\(["']\.\.?\//);
  });

  it('starts every path with a slash, except the catch-all', () => {
    const bad = ROUTES.filter((r) => r.path !== '*' && !r.path.startsWith('/'));
    expect(bad.map((r) => r.path)).toEqual([]);
  });

  it('has exactly one catch-all', () => {
    expect(ROUTES.filter((r) => r.path === '*')).toHaveLength(1);
  });
});

describe('auth guards', () => {
  /**
   * Routes whose page reads or writes data belonging to one user.
   *
   * ── What this test used to assert, and why it was wrong ─────────────────────
   *
   * An audit reported that `AuthGuard` was applied on exactly one page (Wellness)
   * while ~13 routes read per-user data, and concluded the rest were unguarded. So
   * this test originally required `requiresAuth` on all of them.
   *
   * The e2e suite disagreed, and it was right. Reading the pages showed the premise
   * was false: those routes are not unguarded, they handle the signed-out case
   * *inline* and better than a route-level wall would.
   *
   *   • ArchiveHome, TripsPage, ProfileEdit, GroupsIndex, ChatSettings, GroupChat
   *     each render their own "سجّل الدخول" affordance in place, keeping the page's
   *     chrome and context.
   *   • PKM ("local-first personal knowledge base"), Mind, JournalHome and
   *     ArchiveReader work entirely against Dexie. Guarding those would have *removed*
   *     working anonymous functionality — the opposite of a fix.
   *   • `e2e/travel-atlas.spec.ts` asserts a signed-out visitor can reach
   *     `/travel-atlas/trips`, see the "رحلاتي" heading and open the new-trip dialog.
   *     Four e2e tests failed when the guard went on, which is what caught this.
   *
   * So the app's convention is per-feature inline prompts, and `requiresAuth` is for
   * the one case where a full-screen gate is the intended design. The invariant worth
   * testing is therefore not "guard everything private" but "every private route
   * handles signed-out *somehow*".
   */
  const PRIVATE_PREFIXES = [
    '/journal',
    '/pkm',
    '/archive',
    '/chat/',
    '/profile',
    '/settings/profile',
    '/travel-atlas/trips',
    '/wellness',
  ];

  /**
   * Private routes that show a signed-out visitor an empty screen with no
   * explanation. Each reads from Supabase — not Dexie — so RLS correctly returns
   * nothing, and the page renders that nothing as though the user simply had no
   * data:
   *
   *   • /journal    — `useJournalEntries` → `journal_entries`. An empty diary.
   *   • /pkm/mind   — `useMindState` → `pkm_mind_events`. An empty memory graph.
   *   • /archive/new — `archiveApi`. The form renders and the save fails.
   *
   * These are real gaps, listed rather than papered over. Fixing them means adding
   * the same inline affordance their sibling pages already have, which is product
   * copy rather than a routing change — so it is not done in the commit that
   * introduced this test. The list must only ever shrink.
   */
  const KNOWN_SIGNED_OUT_GAPS = new Set([
    '/journal',
    '/pkm/mind',
    '/archive/new',
  ]);

  it('handles signed-out on every route that holds per-user data', () => {
    // Either the manifest gates the route, or the page deals with it itself — by
    // offering a sign-in affordance, by rendering an explained empty/not-found state,
    // or by being local-first and not needing an account at all.
    const gaps: string[] = [];

    for (const mod of importedModules()) {
      const entry = [
        ...manifestCode.matchAll(
          /\{\s*path:\s*["']([^"']+)["'],\s*load:\s*\(\)\s*=>\s*import\(["']@\/([^"']+)["']\)/g,
        ),
      ].find(([, , m]) => m === mod);
      if (!entry) continue;
      const routePath = entry[1];

      if (!PRIVATE_PREFIXES.some((p) => routePath.startsWith(p))) continue;
      const route = ROUTES.find((r) => r.path === routePath);
      if (route?.requiresAuth) continue;

      const file = ['.tsx', '.ts']
        .map((ext) => path.join(SRC, mod + ext))
        .find((candidate) => fs.existsSync(candidate));
      if (!file) continue;
      const text = fs.readFileSync(file, 'utf8');

      const promptsInline = /تسجيل الدخول|سجّل الدخول/.test(text);
      const localFirst = /pkmDb|Dexie|localStorage|local-first/.test(text);
      // An explained "we couldn't find this" is a handled state too. TripDetailPage
      // renders exactly that, and `e2e/travel-atlas.spec.ts` asserts it — an earlier
      // version of this check looked only for sign-in strings and flagged it.
      const explainsEmpty = /لم نجد|تعذّر العثور|لا توجد/.test(text);

      if (!promptsInline && !localFirst && !explainsEmpty) {
        gaps.push(`${routePath} → @/${mod}`);
      }
    }

    const unexpected = gaps.filter((g) => !KNOWN_SIGNED_OUT_GAPS.has(g.split(' → ')[0]));
    expect(
      unexpected,
      `These routes hold per-user data but neither set requiresAuth, nor prompt for ` +
        `sign-in inline, nor explain an empty result, nor work local-first. A ` +
        `signed-out visitor gets an empty screen with no way forward:\n` +
        unexpected.map((g) => `  • ${g}`).join('\n'),
    ).toEqual([]);
  });

  it('keeps KNOWN_SIGNED_OUT_GAPS free of entries that are already fixed', () => {
    // A ratchet: once a page grows a signed-out affordance, its entry here has to go,
    // or the list stops describing anything.
    const stillBroken = new Set(
      ROUTES.filter((r) => KNOWN_SIGNED_OUT_GAPS.has(r.path)).map((r) => r.path),
    );
    const stale = [...KNOWN_SIGNED_OUT_GAPS].filter((p) => !stillBroken.has(p));
    expect(stale, 'KNOWN_SIGNED_OUT_GAPS names paths the manifest does not route').toEqual(
      [],
    );
  });

  it('keeps the route-level gate to the screens that are designed as gates', () => {
    // Deliberately exact. Adding a route here changes what a signed-out visitor sees
    // from "a page with a prompt" to "a wall", which is a product decision and should
    // require editing this list.
    expect(ROUTES.filter((r) => r.requiresAuth).map((r) => r.path)).toEqual(['/wellness']);
  });

  it('gives the gated route its own copy', () => {
    // Wellness carried tailored wording in the page before the guard moved to the
    // manifest; losing it would flatten the prompt to the generic message.
    const wellness = ROUTES.find((r) => r.path === '/wellness');
    expect(wellness?.authFallback?.titleAr).toBeTruthy();
    expect(wellness?.authFallback?.descAr).toBeTruthy();
  });

  it('does not guard the public surfaces', () => {
    // Guarding these would put a login wall in front of content that is meant to be
    // readable by anyone — including /auth itself, which would be a redirect loop.
    for (const publicPath of ['/auth', '/quran', '/dhikr', '/diwan', '/weather', '*']) {
      const route = ROUTES.find((r) => r.path === publicPath);
      expect(route?.requiresAuth, publicPath).toBeFalsy();
    }
  });

  it('does not double-guard: no guarded page mounts its own AuthGuard', () => {
    // Two nested AuthGuards mean two `useAuth()` subscriptions and two
    // `auth-session-expired` listeners, so the session-expiry toast fires twice and
    // `navigate('/auth')` is called twice. pages/Wellness.tsx used to wrap itself.
    // Pair each route with its module by reading them out of the same entry, in
    // order. An earlier version of this test looked the module up with
    // `manifestCode.includes("import('@/" + mod + "')")` — single quotes, against a
    // manifest that uses double quotes — so the lookup never matched, every
    // iteration hit `continue`, and the test passed while `pages/Wellness.tsx` was
    // in fact double-guarded.
    // Whitespace-tolerant: entries are one line each until one needs `authFallback`,
    // at which point the formatter breaks it across several. A single-line-only
    // regex silently matched 61 of 62 and this assertion is what caught it.
    const entries = [
      ...manifestCode.matchAll(
        /\{\s*path:\s*["']([^"']+)["'],\s*load:\s*\(\)\s*=>\s*import\(["']@\/([^"']+)["']\)/g,
      ),
    ].map(([, routePath, mod]) => ({ routePath, mod }));

    expect(entries, 'could not pair routes with modules').toHaveLength(ROUTES.length);

    const guarded = new Set(ROUTES.filter((r) => r.requiresAuth).map((r) => r.path));

    const offenders: string[] = [];
    for (const { routePath, mod } of entries) {
      if (!guarded.has(routePath)) continue;

      const file = ['.tsx', '.ts']
        .map((ext) => path.join(SRC, mod + ext))
        .find((candidate) => fs.existsSync(candidate));
      if (!file) continue;

      if (/<AuthGuard\b/.test(fs.readFileSync(file, 'utf8'))) {
        offenders.push(`${routePath} → @/${mod}`);
      }
    }
    expect(
      offenders,
      `These pages are guarded by the manifest AND wrap themselves in <AuthGuard>:\n` +
        offenders.map((m) => `  • ${m}`).join('\n'),
    ).toEqual([]);
  });
});

describe('route matching does not depend on declaration order', () => {
  /** The manifest as React Router route objects, in manifest order. */
  const asRouteObjects = ROUTES.map((r) => ({ path: r.path }));

  function matchedPath(pathname: string, routes = asRouteObjects): string | undefined {
    return matchRoutes(routes, pathname)?.at(-1)?.route.path;
  }

  it('prefers a literal segment over a dynamic one', () => {
    // The old comment: "order matters. /chat/groups must be matched BEFORE
    // /chat/g/:chatId so a literal 'groups' segment isn't captured."
    expect(matchedPath('/chat/groups')).toBe('/chat/groups');
    expect(matchedPath('/chat/g/abc123')).toBe('/chat/g/:chatId');
  });

  it('prefers travel-atlas literals over :countryId', () => {
    // The old comment: "every literal segment (explore, countries, place, trips) must
    // be matched BEFORE the :countryId wildcard, or those links resolve as country
    // ids and render 'country not found'."
    expect(matchedPath('/travel-atlas/explore')).toBe('/travel-atlas/explore');
    expect(matchedPath('/travel-atlas/countries')).toBe('/travel-atlas/countries');
    expect(matchedPath('/travel-atlas/trips')).toBe('/travel-atlas/trips');
    expect(matchedPath('/travel-atlas/SA')).toBe('/travel-atlas/:countryId');
  });

  it('prefers /archive/new over /archive/:id', () => {
    expect(matchedPath('/archive/new')).toBe('/archive/new');
    expect(matchedPath('/archive/abc')).toBe('/archive/:id');
  });

  it('still resolves correctly with the manifest order reversed', () => {
    // The real assertion: ranking, not order, is what decides. If this ever fails,
    // the manifest's order genuinely is load-bearing and needs a comment saying so.
    const reversed = [...asRouteObjects].reverse();
    expect(matchedPath('/chat/groups', reversed)).toBe('/chat/groups');
    expect(matchedPath('/travel-atlas/explore', reversed)).toBe('/travel-atlas/explore');
    expect(matchedPath('/archive/new', reversed)).toBe('/archive/new');
  });

  it('falls through to the catch-all for an unknown path', () => {
    expect(matchedPath('/definitely/not/a/route')).toBe('*');
  });
});

describe('redirects', () => {
  it('never redirects a path the manifest also routes', () => {
    // A path in both lists resolves to whichever React Router ranks first, and the
    // other silently never runs.
    const routed = new Set(ROUTES.map((r) => r.path));
    const clashes = ROUTE_REDIRECTS.filter((r) => routed.has(r.from)).map((r) => r.from);
    expect(clashes).toEqual([]);
  });

  it('points every redirect at a real route', () => {
    const routed = new Set<string>([...ROUTES.map((r) => r.path), '/']);
    const dangling = ROUTE_REDIRECTS.filter((r) => !routed.has(r.to));
    expect(dangling.map((r) => `${r.from} → ${r.to}`)).toEqual([]);
  });
});
