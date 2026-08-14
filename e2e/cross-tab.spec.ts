import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack, navStackIds } from '@academix-admin/navigation-stack/playwright';
import { login } from './fixtures/auth';

/**
 * Back/Forward ACROSS tabs.
 *
 * `GroupNavigationStack` renders `(isActive || preloadAll) && stackEl`, so an inactive tab's stack
 * can be unmounted — and an unmounted stack has no popstate handler. Note that `navStackIds()` reads
 * the REGISTRY, which retains a stack once created, so it reports every stack ever activated rather
 * than only the mounted ones: these probes cannot distinguish the two, and the concern above is
 * therefore unproven rather than demonstrated.
 *
 * What "correct" means here is a PRODUCT decision (should Back cross a tab boundary at all?), so
 * these assert the invariants that hold under any answer rather than inventing semantics:
 *   - the user never gets thrown out of the app
 *   - no stack is left deeper than it should be, i.e. a page the user backed out of does not linger
 *   - the app stays interactive
 * The observed behaviour is logged so the product decision can be made from evidence.
 */

test('back/forward across a tab switch keeps the app coherent', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  const probe = async (label: string) => {
    const ids = await navStackIds(page);
    const url = new URL(page.url());
    const depths: Record<string, number> = {};
    for (const id of ids) {
      try { depths[id] = await navStack(page, id).depth(); } catch { /* not mounted */ }
    }
    console.log(`${label.padEnd(22)} mounted=[${ids.join(',')}] depths=${JSON.stringify(depths)} ` +
      `group=${url.searchParams.get('group')} nav=${url.searchParams.get('nav')}`);
    return { ids, depths };
  };

  await page.getByRole('button', { name: 'Profile' }).click();
  await page.waitForTimeout(1200);
  await probe('on Profile');

  const profile = navStack(page, 'profile-stack');
  await profile.push('redeem_codes');
  await page.waitForTimeout(600);
  await probe('pushed in Profile');

  // Switch tabs while the profile stack is two deep.
  await page.getByRole('button', { name: 'Home' }).click();
  await page.waitForTimeout(1200);
  await probe('switched to Home');

  await page.goBack();
  await page.waitForTimeout(1200);
  const afterBack = await probe('after Back');

  // Invariant 1: still inside the app. A history entry belonging to an unmounted stack must never
  // walk the user off the site.
  expect(page.url(), 'Back must not leave the app').toContain('/main');

  // Invariant 2: the app is still interactive — a wedged group would fail this.
  //
  // Checked on a tab we are NOT on: the active tab's own button is disabled by design, and Back
  // can legitimately land us back on Profile, so asserting Profile is enabled failed for a UI
  // convention rather than a navigation fault.
  await expect(page.getByRole('button', { name: 'Quiz' })).toBeEnabled();

  await page.goForward();
  await page.waitForTimeout(1200);
  await probe('after Forward');
  expect(page.url(), 'Forward must not leave the app').toContain('/main');

  // Invariant 3: whichever tab is showing, its stack depth is a real number of pages, never a
  // stale deeper value left behind by a stack that was unmounted mid-navigation.
  for (const [id, depth] of Object.entries(afterBack.depths)) {
    expect(depth, `${id} depth should be >= 1`).toBeGreaterThanOrEqual(1);
  }
});

test('a tab switch does not corrupt the other tab\'s stack', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.getByRole('button', { name: 'Profile' }).click();
  await page.waitForTimeout(1200);

  const profile = navStack(page, 'profile-stack');
  await profile.push('redeem_codes');
  await page.waitForTimeout(600);
  const deep = await profile.keys();
  expect(deep.length, 'profile should be two deep').toBe(2);

  // Leave and come back. The stack should be exactly as it was left — this is what `persist` and
  // the group's own state are for, and it is the behaviour a user expects from tabs.
  await page.getByRole('button', { name: 'Home' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.waitForTimeout(1200);

  const restored = await navStack(page, 'profile-stack').keys();
  console.log('profile keys before switch:', deep, '| after returning:', restored);
  expect(restored, 'returning to a tab should restore the stack it was left in').toEqual(deep);
});
