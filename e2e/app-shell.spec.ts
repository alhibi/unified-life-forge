import { expect, test } from './fixtures';

/**
 * The app shell: does the SPA boot at all, in the right direction and language,
 * without throwing. Every assertion here would have caught a white screen.
 */
test.describe('app shell', () => {
  test('home renders with Arabic RTL document attributes', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');

    // The Portal launcher is the home surface; its <h1> is screen-reader only.
    await expect(page.locator('h1')).toContainText('amv.life');
  });

  test('sets a real document title, not the Vite default', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/amv\.life|SmartHub/);
  });

  test('mounts React into #root', async ({ page }) => {
    await page.goto('/');
    // A boot failure leaves #root present but empty, which a title assertion
    // alone would not catch because the title comes from index.html.
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('an unknown route renders the in-app 404, not a server error', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    // vite preview serves index.html for unknown paths so the SPA can route.
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('404');
    await expect(page).toHaveTitle(/غير موجودة/);
  });

  test('renders at a 320px viewport without horizontal overflow', async ({ page }) => {
    // 320px is the narrowest phone the design targets (CONTRIBUTING §9).
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();

    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    // Allow a rounding pixel; anything more is a real layout break.
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
