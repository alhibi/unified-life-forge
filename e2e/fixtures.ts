import { expect, type Page,test as base } from '@playwright/test';

/**
 * Shared fixtures for the E2E suite.
 *
 * Replaces the root `playwright-fixture.ts`, which re-exported from
 * `lovable-agent-playwright-config/fixture` — a package that is not installed
 * and not in package.json, so importing it threw before any test ran.
 *
 * Two things every spec gets for free:
 *
 * 1. **External network is stubbed.** The app calls Aladhan for prayer times,
 *    Open-Meteo for weather, alquran.cloud for tafsir and Google Fonts for
 *    typefaces. Letting those through would make the suite depend on four
 *    third parties being up and on a CI runner having egress, so every
 *    off-origin request is fulfilled locally. Anything not explicitly stubbed
 *    is aborted rather than silently allowed, so a new outbound call shows up
 *    as a visible failure instead of intermittent flake.
 *
 * 2. **Console and page errors fail the test.** Without this a spec can pass
 *    while the app throws on every render. When the error IS the thing being
 *    asserted, opt out at describe or file level — `test.use()` is not valid
 *    inside a test body:
 *
 *        test.describe('...', () => {
 *          test.use({ allowConsoleErrors: true });
 *          test('...', async ({ page }) => { ... });
 *        });
 *
 * Both guarantees are verified rather than assumed: an async uncaught throw and
 * a bare console.error were each confirmed to fail a spec through this fixture,
 * and the describe-level opt-out was confirmed to pass.
 */

interface Fixtures {
  allowConsoleErrors: boolean;
  consoleErrors: string[];
}

/** Console noise that is expected and not a defect. */
const IGNORED_CONSOLE = [
  // client.ts logs one banner explaining what is disabled without Supabase.
  'supabase_not_configured',
  'Supabase',
  // Geolocation is denied in headless Chromium by default.
  'geolocation',
  'Geolocation',
  // Stubbed/aborted third-party requests surface as network errors.
  'net::ERR_FAILED',
  'Failed to fetch',
  'ERR_INTERNET_DISCONNECTED',
  // The 404 route logs the attempted path on purpose.
  '404 Error:',
];

function isIgnored(text: string): boolean {
  return IGNORED_CONSOLE.some((needle) => text.includes(needle));
}

async function stubExternalNetwork(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const origin = `${url.protocol}//${url.host}`;

    // Same-origin: the app itself, served by vite preview. Matched by host
    // rather than a hardcoded port so changing PORT in playwright.config.ts
    // does not silently start aborting the app's own requests.
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      return route.continue();
    }
    void origin;

    // Prayer times. The shape matches what lib/prayerTimes.ts reads; the app
    // also has an `adhan` offline fallback, so a miss here is not fatal.
    if (url.host.includes('aladhan.com')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          status: 'OK',
          data: {
            timings: {
              Fajr: '04:12',
              Sunrise: '05:33',
              Dhuhr: '12:05',
              Asr: '15:30',
              Sunset: '18:37',
              Maghrib: '18:37',
              Isha: '20:07',
              Imsak: '04:02',
              Midnight: '00:05',
            },
            date: {
              readable: '25 Jul 2026',
              hijri: {
                day: '10',
                month: { number: 2, en: 'Safar', ar: 'صفر' },
                year: '1448',
              },
            },
            meta: { timezone: 'Asia/Riyadh' },
          },
        }),
      });
    }

    // Weather.
    if (url.host.includes('open-meteo.com')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          latitude: 24.71,
          longitude: 46.68,
          timezone: 'Asia/Riyadh',
          current: {
            time: '2026-07-25T12:00',
            temperature_2m: 38.4,
            relative_humidity_2m: 12,
            wind_speed_10m: 14.2,
            weather_code: 0,
          },
          hourly: { time: [], temperature_2m: [], weather_code: [] },
          daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], weather_code: [] },
        }),
      });
    }

    // Web fonts: an empty stylesheet is enough, the app has self-hosted
    // fallbacks via @fontsource.
    if (url.host.includes('fonts.googleapis.com')) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    }
    if (url.host.includes('fonts.gstatic.com')) {
      return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    }

    // Everything else off-origin is refused loudly.
    return route.abort();
  });
}

export const test = base.extend<Fixtures>({
  allowConsoleErrors: [false, { option: true }],

  // `auto: true` so every spec is covered without having to name the fixture.
  consoleErrors: [
    async ({ page, allowConsoleErrors }, use) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (!isIgnored(text)) errors.push(`console.error: ${text}`);
      });
      page.on('pageerror', (err) => {
        if (!isIgnored(err.message)) errors.push(`pageerror: ${err.message}`);
      });

      await stubExternalNetwork(page);
      await use(errors);

      if (!allowConsoleErrors && errors.length > 0) {
        throw new Error(
          `The page reported ${errors.length} unexpected error(s):\n` +
            errors.map((e) => `  • ${e}`).join('\n'),
        );
      }
    },
    { auto: true },
  ],
});

export { expect };
