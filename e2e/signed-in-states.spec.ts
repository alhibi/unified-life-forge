import { expect, test } from '@playwright/test';

import {
  FIXTURE_USERNAME,
  installAuthFixture,
  installSignedInRoutes,
  readProjectRef,
  readSignedInState,
} from '../scripts/lib/session-fixture.mjs';

/**
 * Signed-in composition guard.
 *
 * The account-backed surfaces are the half of the product the anonymous
 * capture matrix can never render. These specs install the deterministic
 * synthetic session (scripts/lib/session-fixture.mjs): a stable user named
 * "tester" plus empty PostgREST responses, so every page resolves its auth
 * gate and paints its REAL signed-in empty state instead of an auth card.
 *
 * They deliberately do not assert on backend data — that is not what the
 * fixture proves. They assert the composition: one semantic heading, no
 * signed-out CTA, no auth-loading dead-end, no horizontal overflow, and (on
 * the identity surface) the signed-in username.
 *
 * limitations: this is not a real authentication run and does not exercise
 * RLS or populated data. See verification.md §6.
 */
const PROJECT_REF = readProjectRef(process.cwd());

const SIGNED_IN_SURFACES = [
  { path: '/profile', note: 'identity card' },
  { path: '/journal', note: 'journal home' },
  { path: '/archive', note: 'archive home' },
  { path: '/chat', note: 'chat inbox' },
  { path: '/crypto', note: 'watchlist' },
  { path: '/wellness', note: 'wellness dashboard' },
  { path: '/time-ledger', note: 'time ledger' },
  { path: '/pkm', note: 'pkm notes' },
  { path: '/diwan/library/favorites', note: 'favorites' },
  { path: '/podcasts/library', note: 'podcast library' },
];

test.describe('signed-in composition (deterministic fixture)', () => {
  for (const { path, note } of SIGNED_IN_SURFACES) {
    test(path + ' — ' + note + ' renders signed-in, not gated', async ({ context, page }) => {
      await installAuthFixture(context, { projectRef: PROJECT_REF });
      await installSignedInRoutes(page, PROJECT_REF);

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const state = await readSignedInState(page);
      expect(state.loginCta, 'a signed-in surface must not offer "تسجيل الدخول"').toBe(false);
      expect(state.authLoading, 'auth loading must resolve for a signed-in session').toBe(false);
      expect(state.h1Count, 'exactly one semantic heading').toBe(1);
      expect(state.h1, 'the page keeps its identity').toBeTruthy();
      expect(state.overflow, 'no horizontal overflow').toBeLessThanOrEqual(1);
    });
  }

  test('/profile shows the signed-in username from the session', async ({ context, page }) => {
    await installAuthFixture(context, { projectRef: PROJECT_REF });
    await installSignedInRoutes(page, PROJECT_REF);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const state = await readSignedInState(page);
    expect(state.hasUsername, 'the identity surface reflects the session user').toBe(true);
    expect(FIXTURE_USERNAME).toBe('tester');
  });

  test('the same surface stays gated without the fixture', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const state = await readSignedInState(page);
    expect(state.loginCta || state.authLoading, 'anonymous /profile must stay gated').toBe(true);
  });
});
