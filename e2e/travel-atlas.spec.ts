import { expect, test } from './fixtures';

/**
 * Travel Atlas routing and shell.
 *
 * Five lazy routes sit behind one path prefix, and three of them are matched
 * before a `:countryId` wildcard — an ordering mistake there resolves a place
 * link as a country id and silently renders "country not found". These specs
 * pin that ordering, and pin that each surface degrades to a readable state
 * rather than a blank screen when there is no session and no network.
 */

test.describe('travel atlas', () => {
  test('the atlas mounts with its three views', async ({ page }) => {
    await page.goto('/travel-atlas');

    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page).toHaveTitle(/أطلس الرحلات/);
    await expect(page.getByRole('heading', { name: 'أطلس الرحلات', level: 1 })).toBeVisible();

    for (const label of ['الخريطة', 'الأماكن', 'سجلّي']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
    await expect(page.getByText('حدث خطأ غير متوقع')).toHaveCount(0);
  });

  test('switching to the record view renders without a session', async ({ page }) => {
    await page.goto('/travel-atlas');

    await page.getByRole('tab', { name: 'سجلّي' }).click();
    // Signed out means an empty atlas, which must read as an invitation rather
    // than as a broken screen.
    await expect(page.getByText('لا سجل بعد')).toBeVisible();
  });

  test('the places view offers a way in when the atlas is empty', async ({ page }) => {
    await page.goto('/travel-atlas');

    await page.getByRole('tab', { name: 'الأماكن' }).click();
    await expect(page.getByText(/سجّل الدخول ليكون لك أطلس|أضف مكانك الأول/)).toBeVisible();
  });

  test('the trips route mounts and can start a plan', async ({ page }) => {
    await page.goto('/travel-atlas/trips');

    await expect(page.getByRole('heading', { name: 'رحلاتي', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'رحلة جديدة' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('العنوان')).toBeVisible();
  });

  test('a place link is not swallowed by the country wildcard', async ({ page }) => {
    // `/travel-atlas/place/:placeId` must win over `/travel-atlas/:countryId`.
    await page.goto('/travel-atlas/place/00000000-0000-0000-0000-000000000000');

    await expect(page.getByText('لم نجد هذا المكان')).toBeVisible();
    await expect(page.getByText('تعذّر العثور على هذه الدولة')).toHaveCount(0);
  });

  test('an unknown country id resolves to the country not-found state', async ({ page }) => {
    await page.goto('/travel-atlas/00000000-0000-0000-0000-000000000000');

    await expect(page.getByText('تعذّر العثور على هذه الدولة')).toBeVisible();
  });

  test('an unknown trip id resolves to the trip not-found state', async ({ page }) => {
    await page.goto('/travel-atlas/trips/00000000-0000-0000-0000-000000000000');

    await expect(page.getByText('لم نجد هذه الرحلة')).toBeVisible();
  });
});
