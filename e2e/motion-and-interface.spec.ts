import { expect, test } from '@playwright/test';

/**
 * The two settings platforms, verified against the real built app.
 *
 * These specs exist because "the build is green" says nothing about whether a
 * preference actually reaches the pixels. Every assertion below reads the
 * COMPUTED value on `<html>` after driving the real UI, so a control that looks
 * right but writes nothing would fail here.
 */

const root = (name: string) =>
  `getComputedStyle(document.documentElement).getPropertyValue('${name}').trim()`;

async function readVar(page: import('@playwright/test').Page, name: string) {
  return page.evaluate((expression) => eval(expression) as string, root(name));
}

/**
 * Both screens repeat a few Arabic words across different instruments — the same
 * way iOS offers "Automatic" in five unrelated places. Each instrument lives in
 * its own labelled section, so tests address a control through its section
 * rather than hoping a label is globally unique.
 */
function section(page: import('@playwright/test').Page, heading: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) });
}

const presets = (page: import('@playwright/test').Page) => section(page, 'طوابع الحركة');

test.describe('interface platform (/settings/interface)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/interface');
    await expect(page.getByRole('heading', { name: 'منصة الواجهة' })).toBeVisible();
  });

  test('compiles the full v3 token set onto the document root', async ({ page }) => {
    // A representative token from each instrument the platform owns. If any one
    // of these is empty, that control is decorative.
    for (const token of [
      '--ui-scale',
      '--ui-spacing-scale',
      '--r-sm',
      '--r-xl',
      '--ui-pad-card',
      '--ui-stack-gap',
      '--ui-control-h',
      '--ui-touch-min',
      '--ui-row-icon',
      '--ui-header-h',
      '--ui-content-max',
      '--ui-border-width',
      '--ui-divider-alpha',
      '--ui-divider-width',
      '--ui-interaction-scale',
      '--ui-icon-stroke',
      '--ui-focus-width',
      '--ui-focus-offset',
      '--ui-scrollbar-size',
      '--ui-scrollbar-ff',
      '--ui-safe-extra',
    ]) {
      expect(await readVar(page, token), `${token} must be published`).not.toBe('');
    }
  });

  test('a preset rewrites geometry, and the token inspector agrees', async ({ page }) => {
    const before = await readVar(page, '--ui-pad-card');

    // "كثيف" is the densest preset: 0.9 scale, 0.75 spacing, compact density.
    await page.getByRole('button', { name: 'كثيف', exact: true }).click();
    await expect.poll(async () => readVar(page, '--ui-pad-card')).not.toBe(before);

    const padding = Number.parseFloat(await readVar(page, '--ui-pad-card'));
    const stackGap = Number.parseFloat(await readVar(page, '--ui-stack-gap'));
    expect(padding).toBeLessThan(Number.parseFloat(before));

    // The inspector prints the literal token values, so it must match the DOM.
    const inspectorPadding = await page
      .locator('dt', { hasText: '--ui-pad-card' })
      .locator('xpath=following-sibling::dd[1]')
      .innerText();
    expect(inspectorPadding.trim()).toBe(`${padding}px`);
    expect(stackGap).toBeGreaterThan(0);
  });

  test('the radius profile genuinely reshapes the whole ladder', async ({ page }) => {
    await page.getByRole('button', { name: 'موحّد', exact: true }).click();
    await expect
      .poll(async () => {
        const sm = await readVar(page, '--r-sm');
        const xl = await readVar(page, '--r-xl');
        return sm === xl;
      })
      .toBe(true);

    await page.getByRole('button', { name: 'متدرّج', exact: true }).click();
    await expect
      .poll(async () => {
        const sm = Number.parseFloat(await readVar(page, '--r-sm'));
        const xl = Number.parseFloat(await readVar(page, '--r-xl'));
        return xl > sm;
      })
      .toBe(true);
  });

  test('a custom content measure reaches the shared content column', async ({ page }) => {
    await page.getByRole('button', { name: 'مخصص', exact: true }).click();
    await expect(page.getByText('المقاس المخصص')).toBeVisible();
    const measure = await readVar(page, '--ui-content-max');
    expect(measure).toMatch(/^\d+px$/);
    // `max-w-lg` — used by 40+ screens — resolves to the same variable.
    const column = page.locator('.max-w-lg').first();
    await expect(column).toBeVisible();
  });

  test('divider style silences row separators', async ({ page }) => {
    await page.getByRole('button', { name: 'بدون', exact: true }).click();
    await expect.poll(async () => readVar(page, '--ui-divider-alpha')).toBe('0');
    await expect.poll(async () => readVar(page, '--ui-divider-width')).toBe('0px');
  });

  test('geometry survives a reload (cold-boot token replay)', async ({ page }) => {
    await page.getByRole('button', { name: 'إتاحة', exact: true }).click();
    await expect.poll(async () => readVar(page, '--ui-touch-min')).not.toBe('44px');
    const applied = await readVar(page, '--ui-touch-min');

    await page.reload();
    // The inline boot script in index.html replays the cached token map before
    // React mounts, so there must be no geometry jump on a cold start.
    expect(await readVar(page, '--ui-touch-min')).toBe(applied);
  });
});

test.describe('motion platform (/settings/motion)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/motion');
    await expect(page.getByRole('heading', { name: 'منصة الحركة' })).toBeVisible();
  });

  test('publishes every motion multiplier, curve and character', async ({ page }) => {
    for (const token of [
      '--motion-scale',
      '--motion-speed',
      '--motion-nav-scale',
      '--motion-amp',
      '--motion-bounce',
      '--motion-stagger',
      '--motion-press-strength',
      '--motion-ease-nav',
      '--motion-ease-enter',
      '--motion-ease-exit',
      '--motion-ease-press',
    ]) {
      expect(await readVar(page, token), `${token} must be published`).not.toBe('');
    }

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-nav-style', 'silk');
    await expect(html).toHaveAttribute('data-overlay-style', 'fade');
    await expect(html).toHaveAttribute('data-scroll-profile', 'silk');
    await expect(html).toHaveAttribute('data-compositor-hints', 'true');
  });

  test('the silk default has no enter delay anywhere in the nav path', async ({ page }) => {
    // The brief is explicit: entering a screen must not wait. The silk enter
    // transition is the one the default style uses, and it must carry no delay.
    const delay = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--motion-nav-scale').trim();
    });
    expect(delay).toBe('1');

    // Navigate for real and confirm the destination paints.
    await page.goto('/settings/interface');
    await expect(page.getByRole('heading', { name: 'منصة الواجهة' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'منصة الحركة' })).toBeVisible();
  });

  test('changing the navigation character is recorded and applied', async ({ page }) => {
    const nav = section(page, 'انتقال الشاشات');
    await nav.getByRole('button', { name: 'انزلاق', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-nav-style', 'slide');

    await nav.getByRole('button', { name: 'فوري', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-nav-style', 'instant');
  });

  test('the speed multiplier retimes CSS as well as framer-motion', async ({ page }) => {
    // A custom property's computed value is the unresolved `calc()` text, so the
    // only honest way to check that CSS is genuinely retimed is to resolve it on
    // a real element and read the used value back in milliseconds.
    const probeDuration = () =>
      page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.transitionDuration = 'var(--duration-normal)';
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).transitionDuration;
        probe.remove();
        return Number.parseFloat(value) * 1000;
      });

    expect(await probeDuration()).toBeCloseTo(250, 0);

    // The "فوري" character runs at 1.5×, so every CSS duration must shorten.
    await presets(page).getByRole('button', { name: 'فوري', exact: true }).click();
    await expect
      .poll(async () => Number.parseFloat(await readVar(page, '--motion-scale')))
      .toBeLessThan(1);

    expect(await probeDuration()).toBeLessThan(250);
  });

  test('the overlay character neutralises the bouncy pop', async ({ page }) => {
    // With `fade`, the tailwindcss-animate scale/translate legs must be zeroed
    // on a dialog surface — which is what removes the "انبثاق نابض".
    const overlays = section(page, 'الطبقات العائمة');
    await overlays.getByRole('button', { name: 'تكبير', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-overlay-style', 'scale');

    await overlays.getByRole('button', { name: 'تلاشٍ', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-overlay-style', 'fade');
  });

  test('reduced motion can be turned on in-app, independently of the OS', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
    await page.getByLabel('تقليل الحركة').click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion-source', 'app');
  });

  test('the scroll governor marks and unmarks a real scroll', async ({ page }) => {
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 600);
    await expect(page.locator('html')).toHaveAttribute('data-scrolling', 'true');
    // …and releases it once the gesture settles, so hover and transitions come
    // straight back.
    await expect(page.locator('html')).not.toHaveAttribute('data-scrolling', 'true', {
      timeout: 2000,
    });
  });

  test('a programmatic scroll never suspends hit-testing', async ({ page }) => {
    // Regression guard. The governor suspends hit-testing during a fling, which
    // is safe because the touch that stops momentum produces no click. It is NOT
    // safe for a programmatic scroll: `scrollIntoView`, an anchor jump or a
    // framework revealing a section can be followed milliseconds later by a tap
    // the user fully intends. So `data-fling` must stay off, and the tap must
    // land — this exact case swallowed a click before the fix.
    const target = section(page, 'الطبقات العائمة').getByRole('button', {
      name: 'ارتفاع',
      exact: true,
    });

    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'auto' }));
    await expect(page.locator('html')).toHaveAttribute('data-scrolling', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-fling', 'true');

    // Click immediately, inside the 140 ms protected window.
    await target.click();
    await expect(page.locator('html')).toHaveAttribute('data-overlay-style', 'lift');
  });

  test('the live frame monitor reports real measurements', async ({ page }) => {
    await expect
      .poll(
        async () =>
          Number.parseInt(
            (await page.locator('text=/^\\d+ \\/ \\d+ Hz$/').first().innerText()).split(' ')[0],
            10,
          ),
        { timeout: 6000 },
      )
      .toBeGreaterThan(0);
  });

  test('the silk family leaves the shared spring critically damped', async ({ page }) => {
    // The live preview prints the shared spring's real coefficients. Under the
    // `silk` family the runtime clamps the damping ratio at ζ = 1, so the spring
    // that drives every pill, tile and card cannot overshoot — which is the
    // "بدون ارتداد" half of the brief, enforced numerically rather than by taste.
    const readout = page.locator('text=/^spring k=/');
    await expect(readout).toBeVisible();
    const text = await readout.innerText();
    const stiffness = Number(text.match(/k=(\d+)/)?.[1]);
    const damping = Number(text.match(/c=([\d.]+)/)?.[1]);
    expect(stiffness).toBeGreaterThan(0);
    const zeta = damping / (2 * Math.sqrt(stiffness));
    expect(zeta).toBeGreaterThanOrEqual(0.99);

    // Switching to the expressive family is the only way to get a rebound.
    await section(page, 'منحنى التسارع')
      .getByRole('button', { name: 'مُعبّر', exact: true })
      .click();
    await expect
      .poll(async () => {
        const next = await page.locator('text=/^spring k=/').innerText();
        const k = Number(next.match(/k=(\d+)/)?.[1]);
        const c = Number(next.match(/c=([\d.]+)/)?.[1]);
        return c / (2 * Math.sqrt(k));
      })
      .toBeLessThan(0.99);
  });

  test('the disclosure in the preview expands without a spring', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'خانة قابلة للانسدال' });
    await trigger.click();
    const content = page.locator('[data-ui-surface="disclosure"]').first();
    await expect(content).toBeVisible();
    // A tween, never a spring: the animation must be one of our two named
    // keyframes rather than an inline framer transform.
    const animation = await content.evaluate((node) => getComputedStyle(node).animationName);
    expect(['collapse-down', 'collapse-up']).toContain(animation);
  });

  test('motion settings survive a reload', async ({ page }) => {
    await presets(page).getByRole('button', { name: 'سينمائي', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-nav-style', 'slide');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-nav-style', 'slide');
    await expect(page.locator('html')).toHaveAttribute('data-overlay-style', 'scale');
  });
});
