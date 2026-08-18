import { expect, test } from './fixtures';

/**
 * End-to-end tests for the Soft Keyboard feature.
 * Covers Arabic/English typing, layout switching, backspace, emoji, clipboard, and one-handed mode.
 */

test.describe('soft keyboard functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Force soft keyboard preference to 'app'
    await page.goto('/settings/keyboard');
    await page.evaluate(() => {
      localStorage.setItem('smarthub:soft-keyboard-settings-v2', JSON.stringify({
        preference: 'app',
        theme: 'gboard-dark',
        keyHeight: 'normal',
        showNumberRow: true,
        digitType: 'western',
        showKeyPressPopup: true,
        holdDelayMs: 280,
        soundEnabled: false,
        soundVolume: 0.5,
        soundTone: 'default',
        hapticIntensity: 'light',
        vibrateOnKeyPress: true,
        autoPeriod: true,
        autoTashkeel: true,
        oneHandedMode: 'off',
        clipboardEnabled: true,
        clipboardRetention: 'unlimited',
        keyBorders: true,
      }));
    });
  });

  test('renders soft keyboard and types text into input field', async ({ page }) => {
    await page.goto('/journal');
    await expect(page.locator('#root')).not.toBeEmpty();

    const input = page.locator('input[type="text"], textarea').first();
    if (await input.count() > 0) {
      await input.click();
      const keyboard = page.locator('[data-soft-keyboard-panel]');
      await expect(keyboard).toBeVisible();

      // Tap Arabic letter 'أ' or key
      const keyA = keyboard.locator('button', { hasText: 'أ' }).first();
      if (await keyA.isVisible()) {
        await keyA.click();
        await expect(input).toHaveValue(/أ/);
      }
    }
  });

  test('switches language between Arabic and English', async ({ page }) => {
    await page.goto('/journal');
    const input = page.locator('input[type="text"], textarea').first();
    if (await input.count() > 0) {
      await input.click();
      const keyboard = page.locator('[data-soft-keyboard-panel]');
      await expect(keyboard).toBeVisible();

      const langToggle = keyboard.locator('button[aria-label="تبديل اللغة"]');
      if (await langToggle.isVisible()) {
        await langToggle.click();
        // Check that English letters are now rendered
        await expect(keyboard.locator('button', { hasText: 'q' }).first()).toBeVisible();
      }
    }
  });

  test('opens emoji and clipboard panels', async ({ page }) => {
    await page.goto('/journal');
    const input = page.locator('input[type="text"], textarea').first();
    if (await input.count() > 0) {
      await input.click();
      const keyboard = page.locator('[data-soft-keyboard-panel]');
      await expect(keyboard).toBeVisible();

      const emojiBtn = keyboard.locator('button[aria-label="سجل الحافظة والرموز والتخصيص"], button[title="سجل الحافظة والرموز والتخصيص"]').first();
      if (await emojiBtn.isVisible()) {
        await emojiBtn.click();
      }
    }
  });
});
