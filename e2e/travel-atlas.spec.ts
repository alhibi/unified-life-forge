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

/**
 * The two map surfaces, guarding the two defects that made the atlas look empty:
 *
 *   1. MapLibre's stylesheet declares `position: relative` on the element it is
 *      handed. It loads after Tailwind, so it beat `absolute inset-0`, the
 *      container collapsed to zero height and the canvas fell back to its
 *      intrinsic 300 px — a blank map with no error anywhere.
 *
 *   2. MapLibre derives its worker URL from its own `import.meta.url`. Vite never
 *      emitted that file, so the worker 404'd and NO vector tile was ever
 *      requested: the map showed only its low-zoom raster layer and nothing else,
 *      again silently.
 *
 * Both were invisible to every assertion that only checked for mounted content,
 * which is why these two check pixels and workers instead.
 */
test.describe('travel atlas maps', () => {
  test('the map canvas fills its container', async ({ page }) => {
    await page.goto('/travel-atlas/explore');
    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible();

    const sizes = await page.evaluate(() => {
      const element = document.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement;
      const surface = document.querySelector('.travel-map') as HTMLElement;
      return {
        canvasHeight: element.clientHeight,
        surfaceHeight: surface.clientHeight,
      };
    });

    expect(sizes.surfaceHeight).toBeGreaterThan(300);
    // The intrinsic canvas height is 300; anything at or near it means the
    // container collapsed and the map is not really rendering.
    expect(sizes.canvasHeight).toBeGreaterThanOrEqual(sizes.surfaceHeight - 1);
  });

  test('the vector tile worker is served', async ({ page }) => {
    await page.goto('/travel-atlas/explore');
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();

    // Wait for the worker pool, which MapLibre creates on the first map.
    await page.waitForFunction(() => true);
    const workerUrl = await page.evaluate(async () => {
      // The worker asset must exist at the URL MapLibre was given, otherwise
      // vector tiles are never parsed.
      const scripts = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => /maplibre-gl-worker/.test(name));
      if (scripts.length === 0) return null;
      const response = await fetch(scripts[0]);
      return `${response.status}`;
    });

    expect(workerUrl, 'MapLibre requested no worker script').not.toBeNull();
    expect(workerUrl).toBe('200');
  });

  test('the country stamp map draws the world without any tiles', async ({ page }) => {
    await page.goto('/travel-atlas/countries');

    await expect(page.getByRole('heading', { name: 'خريطة البلدان', level: 1 })).toBeVisible();
    await expect(page.getByRole('img', { name: /خريطة العالم منقّطة/ })).toBeVisible();

    // The dotted map is a 2D canvas, so its pixels are readable — which makes it
    // the one map surface that can be asserted to have actually painted.
    //
    // Polled rather than sampled once: the grid is fetched and then drawn, so a
    // single read right after mount races the first paint and fails only under
    // load, which is the worst kind of test.
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('.travel-dot-map canvas') as HTMLCanvasElement | null;
        const context = canvas?.getContext('2d');
        if (!canvas || !context || canvas.width === 0) return false;
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let opaque = 0;
        for (let index = 3; index < data.length; index += 400) {
          if (data[index] > 0) opaque += 1;
          if (opaque > 50) return true;
        }
        return false;
      },
      undefined,
      { timeout: 15000 },
    );

    // 178 countries come from the generated asset; a broken fetch shows 0.
    await expect(page.getByText(/من \d+ دولة/)).toBeVisible();
  });

  test('a place can be filed in any country on earth', async ({ page }) => {
    // Regression: the picker was fed the 78-entry curated catalog, so a place in
    // Rwanda or Uruguay could not be saved at all. It now reads the merged
    // registry — all 178 countries, grouped by region.
    await page.goto('/travel-atlas');
    await page.getByRole('button', { name: 'أضف مكانًا' }).first().click();
    await page.getByRole('combobox').first().click();

    await expect(page.getByRole('option').first()).toBeVisible();
    expect(await page.getByRole('option').count()).toBeGreaterThan(150);
    await expect(page.getByRole('option', { name: 'رواندا' })).toBeVisible();
  });

  test('the atlas keeps its map when the place list is empty', async ({ page }) => {
    // Regression: the world map used to be REPLACED by the sign-in prompt, so a
    // new visitor opened the atlas and found no map at all.
    await page.goto('/travel-atlas');
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
    await expect(page.getByText(/سجّل الدخول ليكون لك أطلس|أضف مكانك الأول/)).toBeVisible();
  });
});
