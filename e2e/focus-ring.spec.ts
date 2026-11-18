import { expect, test } from '@playwright/test';

/**
 * Focus-visible regressions that automated layout checks cannot see.
 *
 * The mihrab tab panel is deliberately focusable (tabIndex=0) so keyboard users
 * can scroll a pane without re-entering the tab strip. It used to render with a
 * duplicate className that silently won over the real one, so the ring never
 * showed (QA-B13). This test walks the real keyboard path.
 */
test('mihrab tabpanel shows a visible focus ring from the keyboard', async ({ page }) => {
  await page.goto('/mihrab');
  await expect(page.getByRole('heading', { name: 'محراب' })).toBeVisible();

  await page.locator('[role="tab"]').first().focus();
  await page.keyboard.press('Tab');

  const panel = page.locator('[role="tabpanel"]').first();
  await expect(panel).toBeFocused();
  const ring = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      className: String(element.className),
    };
  });
  expect(ring.outlineStyle).not.toBe('none');
  expect(ring.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(ring.className).not.toContain('focus-visible:outline-none');
});
