import { expect, test } from '@playwright/test';

/**
 * Regression — the chess primary action stays reachable on the two pinned
 * phone sizes.
 *
 * Why this exists: the floating portal dock and the game's fixed control bar
 * both live near the bottom edge. A changed control-bar height or a raised dock
 * silently covered "لعبة جديدة" with no failing test in the suite, so this spec
 * presses exactly the point the user presses and asserts it belongs to the
 * primary button. If the dock ever overlaps it at rest, this fails.
 */

const SIZES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
] as const;

for (const size of SIZES) {
  test(`chess primary action is hit-testable at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/games/chess');
    await page.waitForLoadState('networkidle');

    const primary = page.getByRole('button', { name: /لعبة جديدة/ }).first();
    await expect(primary).toBeVisible();
    await primary.scrollIntoViewIfNeeded();
    await expect(primary).toBeInViewport();

    const box = await primary.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    const point = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };

    // 1) The point under the finger resolves to the primary action itself.
    const hit = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      const button = element?.closest('button');
      if (!button) return null;
      return { text: (button.textContent ?? '').trim(), label: button.getAttribute('aria-label') ?? '' };
    }, point);
    expect(hit).not.toBeNull();
    expect(hit!.text.includes('لعبة جديدة') || hit!.label.includes('لعبة جديدة')).toBe(true);

    // 2) The portal dock must not sit over the primary action's box.
    const dock = page.getByRole('button', { name: 'العودة إلى البوابة' });
    if (await dock.count()) {
      const dockBox = await dock.first().boundingBox();
      if (dockBox) {
        const overlapX = Math.max(0, Math.min(box!.x + box!.width, dockBox.x + dockBox.width) - Math.max(box!.x, dockBox.x));
        const overlapY = Math.max(0, Math.min(box!.y + box!.height, dockBox.y + dockBox.height) - Math.max(box!.y, dockBox.y));
        expect(overlapX * overlapY).toBe(0);
      }
    }
  });
}
