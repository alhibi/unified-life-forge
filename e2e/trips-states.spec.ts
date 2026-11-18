import { expect, test } from '@playwright/test';

/**
 * Trips list A/B/C contract (G4), anonymous path.
 *
 * The create drawer is the one place in the atlas that collects input, so its
 * validation and focus behaviour are worth a real browser test: the header
 * action opens a responsive drawer, an empty submit produces a specific inline
 * error (never a toast-only dead end), Escape returns focus to the opener, and
 * the list's empty state offers the same action.
 */
test.describe('travel trips — create drawer contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/travel-atlas/trips');
    await expect(page.getByRole('heading', { name: 'رحلاتي' })).toBeVisible();
  });

  test('empty state has one primary action that opens the drawer', async ({ page }) => {
    const empty = page.locator('text=لا رحلات بعد');
    await expect(empty).toBeVisible();
    await page.getByRole('button', { name: 'رحلة جديدة' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByLabel('العنوان')).toBeVisible();
  });

  test('an empty submit shows a specific inline error and keeps the drawer open', async ({ page }) => {
    await page.getByRole('button', { name: 'رحلة جديدة' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'أنشئ' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('اكتب عنوان الرحلة أولاً');
    await expect(page.getByRole('dialog').getByLabel('العنوان')).toBeVisible();
  });

  test('an out-of-order date range is rejected before any request', async ({ page }) => {
    await page.getByRole('button', { name: 'رحلة جديدة' }).first().click();
    await page.getByRole('dialog').getByLabel('العنوان').fill('رحلة اختبار');
    await page.getByRole('dialog').getByLabel('البداية').fill('2026-05-10');
    await page.getByRole('dialog').getByLabel('النهاية').fill('2026-05-01');
    await page.getByRole('dialog').getByRole('button', { name: 'أنشئ' }).click();
    await expect(page.getByRole('alert')).toContainText('تاريخ النهاية قبل تاريخ البداية');
  });

  test('Escape closes the drawer and returns focus to the header action', async ({ page }) => {
    const opener = page.getByRole('button', { name: 'رحلة جديدة' }).first();
    await opener.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('cancel closes without creating and keeps the list state', async ({ page }) => {
    await page.getByRole('button', { name: 'رحلة جديدة' }).first().click();
    await page.getByRole('dialog').getByLabel('العنوان').fill('لن تُنشأ');
    await page.getByRole('dialog').getByRole('button', { name: 'إلغاء' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('لا رحلات بعد')).toBeVisible();
  });
});
