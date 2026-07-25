import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * This file used to be a one-line re-export of `createLovableConfig()` from
 * `lovable-agent-playwright-config`, a package that appears nowhere in
 * package.json and is not installed. `bunx playwright test` therefore died
 * with ERR_MODULE_NOT_FOUND before collecting a single test, which is why the
 * README could advertise `bun run e2e` for a suite that had never run.
 *
 * The app is served from a production build rather than the dev server: these
 * specs assert on the built artefact (chunk splitting, the generated app-shell
 * service worker, the PWA manifest), and a dev-server-only pass would miss a
 * build-time regression entirely.
 *
 * No Supabase credentials are provided. `src/integrations/supabase/client.ts`
 * falls back to placeholders and the app degrades to local-only mode, so the
 * suite runs identically on a fork with no secrets.
 */

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // Arabic-only RTL app; nothing here depends on the host locale, but pinning
  // it keeps date formatting in assertions stable.
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // A flaky suite that reruns until green teaches nothing. Retries only on CI,
  // where a cold runner can genuinely time out on first paint.
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  forbidOnly: isCI,

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The app is phone-first: the bottom nav was retired for the Portal
      // launcher, ResponsiveDrawer switches between Sheet and Dialog on
      // viewport width, and iOS safe-area insets drive the layout. Desktop-only
      // coverage would miss the surface most users actually see.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    // `--strictPort` makes a port clash a hard failure rather than silently
    // serving on another port that baseURL does not point at.
    command: `bun run build && bunx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
