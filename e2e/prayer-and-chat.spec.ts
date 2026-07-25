import { expect, test } from './fixtures';

/**
 * The two surfaces CONTRIBUTING §8 singles out as needing E2E coverage before
 * a merge: prayer times and chat.
 *
 * Both run without Supabase credentials, so this exercises the local-only /
 * signed-out paths — which is also the state a first-time visitor is in.
 */

test.describe('prayer times', () => {
  test('the Now screen renders prayer names, not an empty shell', async ({ page }) => {
    await page.goto('/now');
    await expect(page.locator('#root')).not.toBeEmpty();

    // Prayer names come from a stubbed Aladhan response, and the app also has
    // an offline `adhan` calculation, so at least one must be on screen
    // regardless of which path won.
    const names = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
    const found = await Promise.all(
      names.map((n) => page.getByText(n, { exact: false }).first().isVisible().catch(() => false)),
    );
    expect(
      found.filter(Boolean).length,
      'no prayer name was rendered on /now',
    ).toBeGreaterThanOrEqual(3);
  });

  test('prayer settings offers Sunni calculation methods', async ({ page }) => {
    await page.goto('/settings/prayer');
    await expect(page.locator('#root')).not.toBeEmpty();
    // Madhab choice drives the Asr calculation; its absence means the page
    // mounted but its data layer did not.
    await expect(page.getByText('الشافعي', { exact: false }).first()).toBeVisible();
  });
});

test.describe('chat', () => {
  test('the chat tab mounts for a signed-out visitor', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByText('حدث خطأ غير متوقع')).toHaveCount(0);
  });

  test('the auth screen renders a username field, not an email field', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('#root')).not.toBeEmpty();

    // useAuth maps usernames onto a synthetic <username>@smartapp.local email.
    // The user must never see an email input; if one appears, the mapping was
    // bypassed.
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('inputs are at least 16px so iOS does not zoom on focus', async ({ page }) => {
    // CONTRIBUTING §3 requires this and it is invisible in unit tests.
    await page.goto('/auth');
    // count() does not auto-wait, so settle on the first input before counting
    // or a slow lazy chunk yields a false "no inputs" pass.
    await expect(page.locator('input').first()).toBeVisible();
    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const size = await inputs.nth(i).evaluate(
        (el) => parseFloat(getComputedStyle(el).fontSize),
      );
      expect(size, `input #${i} renders at ${size}px`).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('settings', () => {
  test('signed out, the account and privacy section is not offered', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('#root')).not.toBeEmpty();

    // AccountPrivacySection returns null without a user or a configured
    // backend. Showing export/delete to a signed-out visitor would be a
    // control that cannot work.
    await expect(page.getByText('حذف الحساب')).toHaveCount(0);
    await expect(page.getByText('تصدير بياناتي')).toHaveCount(0);

    // The sections that do not need an account must still be there. Scoped to
    // the group heading: the label also appears on the theme row inside it.
    await expect(page.getByRole('paragraph').filter({ hasText: 'المظهر' })).toBeVisible();
  });
});
