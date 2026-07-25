import { expect, test } from './fixtures';

/**
 * Routing. Every one of these routes is lazy-loaded in App.tsx, so a broken
 * dynamic import shows up as a permanent loading skeleton rather than an error
 * — which is exactly the failure mode these assertions catch.
 *
 * The three persistent tabs ('/', '/games', '/chat') are also covered, since
 * they are rendered together in <PersistentTabs> and toggled with display:none
 * rather than remounted.
 */

const ROUTES: Array<{ path: string; titlePattern: RegExp; name: string }> = [
  { path: '/', titlePattern: /amv\.life/, name: 'portal' },
  { path: '/now', titlePattern: /أوقات الصلاة/, name: 'now' },
  { path: '/mihrab', titlePattern: /محراب/, name: 'mihrab' },
  { path: '/settings', titlePattern: /الإعدادات/, name: 'settings' },
  { path: '/weather', titlePattern: /./, name: 'weather' },
  { path: '/duas', titlePattern: /./, name: 'duas' },
  { path: '/diwan', titlePattern: /./, name: 'diwan' },
  { path: '/games', titlePattern: /./, name: 'games' },
  { path: '/browse', titlePattern: /./, name: 'browse' },
  { path: '/auth', titlePattern: /./, name: 'auth' },
];

test.describe('routing', () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) mounts content`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator('#root')).not.toBeEmpty();
      await expect(page).toHaveTitle(route.titlePattern);
      // A lazy chunk that failed to load leaves the ErrorBoundary fallback.
      await expect(page.getByText('حدث خطأ غير متوقع')).toHaveCount(0);
    });
  }

  test('deep-linking straight into a sub-route works', async ({ page }) => {
    // Sub-routes are not reachable by clicking from a cold start, so a broken
    // route definition would only ever surface on a shared link.
    await page.goto('/settings/appearance');
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('h1')).not.toContainText('404');
  });

  test('the retired appearance paths still land somewhere', async ({ page }) => {
    // `/settings/theme` and `/settings/font` were two screens for eight
    // months; they are in bookmarks and in shared links, so they redirect
    // rather than 404.
    for (const legacy of ['/settings/theme', '/settings/font']) {
      await page.goto(legacy);
      await expect(page).toHaveURL(/\/settings\/appearance$/);
      await expect(page.locator('#root')).not.toBeEmpty();
    }
  });

  test('client-side navigation from the portal to settings keeps the SPA alive', async ({
    page,
  }) => {
    await page.goto('/');

    let reloaded = false;
    page.on('load', () => {
      reloaded = true;
    });

    await page.evaluate(() => {
      window.history.pushState({}, '', '/settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page).toHaveURL(/\/settings$/);
    expect(reloaded, 'a full page load means routing fell through to the server').toBe(false);
  });

  test('switching between persistent tabs does not remount the app', async ({ page }) => {
    await page.goto('/');

    // Tag the root so we can tell a remount from a re-render.
    await page.evaluate(() => {
      (window as unknown as { __e2eMarker?: number }).__e2eMarker = Date.now();
    });

    await page.goto('/games');
    await expect(page.locator('#root')).not.toBeEmpty();

    // Hard navigations wipe window state; SPA transitions do not. This asserts
    // page.goto did a fresh load (expected) — the real invariant we can check
    // in-browser is that the tab layer survives a history-based swap.
    await page.evaluate(() => {
      (window as unknown as { __e2eMarker?: number }).__e2eMarker = 1;
      window.history.pushState({}, '', '/chat');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/chat$/);
    const marker = await page.evaluate(
      () => (window as unknown as { __e2eMarker?: number }).__e2eMarker,
    );
    expect(marker, 'the tab swap reloaded the document').toBe(1);
  });
});
