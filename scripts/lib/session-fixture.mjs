/**
 * Deterministic signed-in session fixture for browser verification.
 *
 * The product's account-backed surfaces need a signed-in user to render at
 * all, but verification must not depend on real credentials or the network.
 * This module installs a synthetic Supabase session into localStorage before
 * first paint and stubs the same project's REST/Auth/Storage endpoints with
 * empty PostgREST-shaped responses, so:
 *
 *   - useAuth() resolves a stable user (username "tester") and clears its
 *     loading gate exactly as it would after a real sign-in;
 *   - every table query resolves successfully with an empty result, so pages
 *     render their real signed-in empty states instead of hanging skeletons;
 *   - no request ever leaves the machine, so screenshots and audits stay
 *     deterministic and comparable.
 *
 * What this fixture CANNOT prove: real authentication (password/token
 * exchange), RLS policies, or populated data from a live backend. It proves
 * the signed-in UI composition and its empty/error states. Say so whenever
 * this evidence is reported.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const FIXED_ISO = '2026-11-01T09:00:00.000Z';
const FIXED_EXPIRY_S = 4102444800; // 2100-01-01, far future: no refresh path

/** Read the project ref from the Supabase client fallback so the fixture
 *  cannot silently drift from the shipped URL. */
export function readProjectRef(root = process.cwd()) {
  const source = fs.readFileSync(path.join(root, 'src/integrations/supabase/client.ts'), 'utf8');
  const match = source.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!match) throw new Error('Could not find the Supabase project URL in the client module');
  return match[1];
}

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function createFixtureSession(projectRef) {
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'tester@smartapp.local',
    email_confirmed_at: FIXED_ISO,
    phone: '',
    confirmed_at: FIXED_ISO,
    last_sign_in_at: FIXED_ISO,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { username: 'tester' },
    identities: [],
    created_at: FIXED_ISO,
    updated_at: FIXED_ISO,
  };
  const session = {
    access_token:
      b64url({ alg: 'HS256', typ: 'JWT' }) +
      '.' +
      b64url({ sub: user.id, role: 'authenticated', exp: FIXED_EXPIRY_S }) +
      '.fixture-signature',
    token_type: 'bearer',
    expires_in: 3600 * 24 * 365,
    expires_at: FIXED_EXPIRY_S,
    refresh_token: 'fixture-refresh-token',
    user,
  };
  return { user, session, storageKey: 'sb-' + projectRef + '-auth-token' };
}

export const FIXTURE_USERNAME = 'tester';

/**
 * Install the session (and the deterministic appearance profile) before first
 * paint. Call before creating the page or immediately after, but always before
 * the first navigation.
 */
export async function installAuthFixture(context, options = {}) {
  const projectRef = options.projectRef ?? readProjectRef(options.root);
  const { session, storageKey } = createFixtureSession(projectRef);
  const theme = options.theme ?? 'expressive';
  const mode = options.mode ?? 'dark';
  await context.addInitScript(
    ({ key, value, themeId, colorMode }) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem('app-theme', colorMode);
        localStorage.setItem('app-color-theme', themeId);
        localStorage.setItem('app-palette-style', 'tonal');
        localStorage.setItem('app-black-mode', 'false');
        localStorage.setItem('app-surface-lift', 'subtle');
        localStorage.setItem('app-ui-density', 'cozy');
        localStorage.setItem('app-content-width', 'standard');
        localStorage.setItem('app-reduced-motion', 'true');
      } catch {
        /* storage blocked */
      }
    },
    { key: storageKey, value: session, themeId: theme, colorMode: mode },
  );
  return { projectRef, session, storageKey };
}

const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * One Playwright route handler that keeps localhost + fonts reachable, stubs
 * the configured Supabase project, and blocks every other origin.
 *
 * PostgREST note: maybeSingle() sends Accept: application/vnd.pgrst.object+json;
 * a body of literal null is what supabase-js turns into a null data value,
 * which is the empty-profile branch. All list queries get an empty array.
 */
export async function installSignedInRoutes(page, projectRef) {
  const host = projectRef + '.supabase.co';
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const origin = url.hostname;
    if (origin === '127.0.0.1' || origin === 'localhost' || origin.includes('fonts.g')) {
      return route.continue();
    }
    if (origin === host) {
      const pathname = url.pathname;
      if (pathname.startsWith('/rest/v1/profiles')) {
        return route.fulfill({ status: 200, headers: JSON_HEADERS, body: 'null' });
      }
      if (pathname.startsWith('/rest/v1/')) {
        return route.fulfill({ status: 200, headers: JSON_HEADERS, body: '[]' });
      }
      if (pathname.startsWith('/auth/v1/user')) {
        const { user } = createFixtureSession(projectRef);
        return route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(user) });
      }
      return route.fulfill({ status: 200, headers: JSON_HEADERS, body: '[]' });
    }
    // Everything else (weather, crypto, rss, ...) is blocked so the state is
    // deterministic; the app already designs for the offline branch.
    return route.abort();
  });
}

/** The anonymous counterpart used by the existing audit/capture scripts. */
export async function installAnonymousRoutes(page) {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    const origin = url.hostname;
    if (origin === '127.0.0.1' || origin === 'localhost' || origin.includes('fonts.g')) {
      return route.continue();
    }
    return route.abort();
  });
}

/** Small DOM probe shared by the capture CLI and tests. */
export async function readSignedInState(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ');
    return {
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      h1Count: document.querySelectorAll('h1').length,
      loginCta: /تسجيل الدخول/.test(text),
      authLoading: /تحقق من الأمان/.test(text),
      hasUsername: /tester/.test(text),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyPreview: text.slice(0, 240),
    };
  });
}
